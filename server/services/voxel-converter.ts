/**
 * Voxel to 3D Tiles Converter Service
 * @module server/services/voxel-converter
 * 
 * 將 Voxel CSV 資料轉換為 3D Tiles 格式
 * 
 * 輸入格式 (CSV):
 * x,y,z,lith_id
 * 250000,2600000,100,1
 * ...
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// 岩性顏色對照表 (與前端 lithologyConfig.ts 同步)
const LITHOLOGY_COLORS: Record<number, { r: number; g: number; b: number }> = {
    1: { r: 139, g: 69, b: 19 },   // CL 黏土 #8b4513
    2: { r: 194, g: 178, b: 128 }, // SM 砂質粉土 #c2b280
    3: { r: 160, g: 82, b: 45 },   // GP 礫石 #a0522d
    4: { r: 244, g: 164, b: 96 },  // SD 砂岩 #f4a460
    5: { r: 112, g: 128, b: 144 }, // SH 頁岩 #708090
    6: { r: 210, g: 180, b: 140 }, // ML 粉土 #d2b48c
    7: { r: 222, g: 184, b: 135 }, // SC 黏質砂土 #deb887
    8: { r: 188, g: 143, b: 143 }, // GW 級配良好礫石 #bc8f8f
    9: { r: 245, g: 222, b: 179 }, // SW 級配良好砂 #f5deb3
    10: { r: 90, g: 62, b: 27 },   // BR 基岩 #5a3e1b
};

const DEFAULT_COLOR = { r: 136, g: 136, b: 136 }; // 預設灰色

export interface VoxelPoint {
    x: number;
    y: number;
    z: number;
    lithId: number;
}

export interface ConversionBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
}

export interface ConversionResult {
    bounds: ConversionBounds;
    pointCount: number;
    tilesetPath: string;
}

/**
 * 解析 Voxel CSV 檔案
 */
interface CsvRow {
    x?: string;
    X?: string;
    y?: string;
    Y?: string;
    z?: string;
    Z?: string;
    elevation?: string;
    Elevation?: string;
    lith_id?: string;
    lithId?: string;
    LITH_ID?: string;
}

function parseVoxelCsv(csvPath: string): VoxelPoint[] {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as CsvRow[];

    const points: VoxelPoint[] = [];
    for (const row of records) {
        const x = parseFloat(row.x || row.X || '');
        const y = parseFloat(row.y || row.Y || '');
        const z = parseFloat(row.z || row.Z || row.elevation || row.Elevation || '');
        const lithId = parseInt(row.lith_id || row.lithId || row.LITH_ID || '1', 10);

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            points.push({ x, y, z, lithId });
        }
    }

    return points;
}

/**
 * 計算邊界
 */
function calculateBounds(points: VoxelPoint[]): ConversionBounds {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const p of points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * 生成簡化的 3D Tiles (Point Cloud pnts 格式)
 * 
 * 這是一個簡化實作，生成 pnts 格式的 point cloud tiles
 * 對於大型資料集，可考慮使用 py3dtiles 或 cesium-native
 */
async function generatePointCloudTiles(
    points: VoxelPoint[],
    bounds: ConversionBounds,
    outputDir: string,
    onProgress?: (percent: number) => void
): Promise<string> {
    // 確保輸出目錄存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 計算中心點 (用於 tileset.json)
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;

    // 生成 pnts binary 檔案
    const pntsPath = path.join(outputDir, 'content.pnts');
    await generatePntsFile(points, bounds, pntsPath, (percent) => {
        // pnts 生成佔 30% 到 90%
        if (onProgress) onProgress(Math.round(30 + (percent * 0.6)));
    });

    // 計算 bounding volume
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    const rangeZ = bounds.maxZ - bounds.minZ;
    const radius = Math.sqrt(rangeX * rangeX + rangeY * rangeY + rangeZ * rangeZ) / 2;

    // 生成 tileset.json
    const tileset = {
        asset: {
            version: '1.0',
            gltfUpAxis: 'Z',
        },
        geometricError: radius,
        root: {
            boundingVolume: {
                sphere: [centerX, centerY, centerZ, radius],
            },
            geometricError: radius / 2,
            refine: 'ADD',
            content: {
                uri: 'content.pnts',
            },
        },
    };

    const tilesetPath = path.join(outputDir, 'tileset.json');
    fs.writeFileSync(tilesetPath, JSON.stringify(tileset, null, 2));

    return tilesetPath;
}

/**
 * 生成 pnts (Point Cloud) 二進位檔案
 * 
 * pnts 格式規格: https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/PointCloud
 */
async function generatePntsFile(
    points: VoxelPoint[],
    bounds: ConversionBounds,
    outputPath: string,
    onProgress?: (percent: number) => void
): Promise<void> {
    const pointCount = points.length;

    // Feature Table JSON
    const featureTableJson: Record<string, unknown> = {
        POINTS_LENGTH: pointCount,
        POSITION: { byteOffset: 0 },
        RGB: { byteOffset: pointCount * 12 }, // 每點 3 floats = 12 bytes
    };

    const featureTableJsonStr = JSON.stringify(featureTableJson);
    // 需要 8-byte 對齊
    const featureTableJsonPadded = featureTableJsonStr.padEnd(
        Math.ceil(featureTableJsonStr.length / 8) * 8,
        ' '
    );

    // Feature Table Binary: positions (3 floats per point) + RGB (3 bytes per point)
    const positionBytes = pointCount * 3 * 4; // 3 floats * 4 bytes
    const colorBytes = pointCount * 3;        // 3 bytes (RGB)
    const colorBytesPadded = Math.ceil(colorBytes / 8) * 8; // 8-byte align

    const featureTableBinary = Buffer.alloc(positionBytes + colorBytesPadded);

    // 計算相對座標 (相對於中心點以減少精度損失)
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;

    // 寫入位置
    const tenth = Math.max(1, Math.floor(pointCount / 10));
    for (let i = 0; i < pointCount; i++) {
        const p = points[i];
        featureTableBinary.writeFloatLE(p.x - centerX, i * 12);
        featureTableBinary.writeFloatLE(p.y - centerY, i * 12 + 4);
        featureTableBinary.writeFloatLE(p.z - centerZ, i * 12 + 8);

        if (i % tenth === 0 && onProgress) {
            onProgress(Math.round((i / pointCount) * 50)); // 前半段 0-50%
        }
    }

    // 寫入顏色
    for (let i = 0; i < pointCount; i++) {
        const p = points[i];
        const color = LITHOLOGY_COLORS[p.lithId] || DEFAULT_COLOR;
        const colorOffset = positionBytes + i * 3;
        featureTableBinary.writeUInt8(color.r, colorOffset);
        featureTableBinary.writeUInt8(color.g, colorOffset + 1);
        featureTableBinary.writeUInt8(color.b, colorOffset + 2);

        if (i % tenth === 0 && onProgress) {
            onProgress(Math.round(50 + (i / pointCount) * 50)); // 後半段 50-100%
        }
    }

    // 更新 Feature Table JSON 中的 RTC_CENTER (相對座標中心)
    const updatedFeatureTableJson = {
        ...featureTableJson,
        RTC_CENTER: [centerX, centerY, centerZ],
    };
    const updatedJsonStr = JSON.stringify(updatedFeatureTableJson);
    const updatedJsonPadded = updatedJsonStr.padEnd(
        Math.ceil(updatedJsonStr.length / 8) * 8,
        ' '
    );

    // 計算各部分長度
    const headerLength = 28; // pnts header 固定 28 bytes
    const featureTableJsonLength = Buffer.byteLength(updatedJsonPadded);
    const featureTableBinaryLength = featureTableBinary.length;
    const batchTableJsonLength = 0;
    const batchTableBinaryLength = 0;

    const totalLength = headerLength + featureTableJsonLength + featureTableBinaryLength;

    // 建立最終 buffer
    const pntsBuffer = Buffer.alloc(totalLength);
    let offset = 0;

    // Magic "pnts"
    pntsBuffer.write('pnts', offset, 4, 'ascii');
    offset += 4;

    // Version
    pntsBuffer.writeUInt32LE(1, offset);
    offset += 4;

    // Byte length
    pntsBuffer.writeUInt32LE(totalLength, offset);
    offset += 4;

    // Feature table JSON byte length
    pntsBuffer.writeUInt32LE(featureTableJsonLength, offset);
    offset += 4;

    // Feature table binary byte length
    pntsBuffer.writeUInt32LE(featureTableBinaryLength, offset);
    offset += 4;

    // Batch table JSON byte length
    pntsBuffer.writeUInt32LE(batchTableJsonLength, offset);
    offset += 4;

    // Batch table binary byte length
    pntsBuffer.writeUInt32LE(batchTableBinaryLength, offset);
    offset += 4;

    // Feature table JSON
    pntsBuffer.write(updatedJsonPadded, offset, 'utf-8');
    offset += featureTableJsonLength;

    // Feature table binary
    featureTableBinary.copy(pntsBuffer, offset);

    // 寫入檔案
    fs.writeFileSync(outputPath, pntsBuffer);
}

/**
 * 主要轉換函數
 */
export async function convertVoxelToTiles(
    csvPath: string,
    outputDir: string,
    onProgress?: (percent: number) => void
): Promise<ConversionResult> {
    console.log(`🔄 Starting voxel conversion: ${csvPath}`);

    // 解析 CSV
    if (onProgress) onProgress(5);
    const points = parseVoxelCsv(csvPath);
    if (onProgress) onProgress(20);

    if (points.length === 0) {
        throw new Error('CSV 檔案中沒有有效的點資料');
    }

    console.log(`📊 Parsed ${points.length} points`);

    // 計算邊界
    if (onProgress) onProgress(25);
    const bounds = calculateBounds(points);
    if (onProgress) onProgress(30);
    console.log(`📐 Bounds: X[${bounds.minX}, ${bounds.maxX}], Y[${bounds.minY}, ${bounds.maxY}], Z[${bounds.minZ}, ${bounds.maxZ}]`);

    // 生成 3D Tiles
    const tilesetPath = await generatePointCloudTiles(points, bounds, outputDir, onProgress);
    if (onProgress) onProgress(100);
    console.log(`✅ Generated tileset: ${tilesetPath}`);

    return {
        bounds,
        pointCount: points.length,
        tilesetPath,
    };
}
