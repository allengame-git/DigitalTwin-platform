/**
 * Isosurface Generator Service
 * @module server/services/isosurface-generator
 * 
 * 將 Voxel 點雲轉換為平滑的 Isosurface Mesh (GLB 格式)
 * 使用 Marching Cubes 演算法
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Document, NodeIO } from '@gltf-transform/core';

// 岩性顏色對照表
const LITHOLOGY_COLORS: Record<number, [number, number, number]> = {
    1: [139 / 255, 69 / 255, 19 / 255],    // CL 黏土 #8b4513
    2: [194 / 255, 178 / 255, 128 / 255],  // SM 砂質粉土 #c2b280
    3: [160 / 255, 82 / 255, 45 / 255],    // GP 礫石 #a0522d
    4: [244 / 255, 164 / 255, 96 / 255],   // SD 砂岩 #f4a460
    5: [112 / 255, 128 / 255, 144 / 255],  // SH 頁岩 #708090
    6: [210 / 255, 180 / 255, 140 / 255],  // ML 粉土 #d2b48c
    7: [222 / 255, 184 / 255, 135 / 255],  // SC 黏質砂土 #deb887
    8: [188 / 255, 143 / 255, 143 / 255],  // GW 級配良好礫石 #bc8f8f
    9: [245 / 255, 222 / 255, 179 / 255],  // SW 級配良好砂 #f5deb3
    10: [90 / 255, 62 / 255, 27 / 255],    // BR 基岩 #5a3e1b
};

const DEFAULT_COLOR: [number, number, number] = [0.5, 0.5, 0.5];

// TWD97 座標原點結構
export interface Vector2 {
    x: number;
    y: number;
}
const SCALE_FACTOR = 1.0; // 1:1 比例

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

export interface IsosurfaceResult {
    meshUrl: string;
    bounds: ConversionBounds;
    layerCount: number;
    pointCount: number;
}

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

/**
 * 解析 CSV 檔案
 */
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
 * 按 lithId 分組
 */
function groupByLithology(points: VoxelPoint[]): Map<number, VoxelPoint[]> {
    const groups = new Map<number, VoxelPoint[]>();
    for (const p of points) {
        if (!groups.has(p.lithId)) {
            groups.set(p.lithId, []);
        }
        groups.get(p.lithId)!.push(p);
    }
    return groups;
}

/**
 * 建立 3D 密度網格 (用於 Marching Cubes)
 */
function buildDensityGrid(
    points: VoxelPoint[],
    bounds: ConversionBounds,
    cellSize: number
): { grid: Float32Array; dims: [number, number, number]; origin: [number, number, number] } {
    const nx = Math.ceil((bounds.maxX - bounds.minX) / cellSize) + 2;
    const ny = Math.ceil((bounds.maxY - bounds.minY) / cellSize) + 2;
    const nz = Math.ceil((bounds.maxZ - bounds.minZ) / cellSize) + 2;

    const grid = new Float32Array(nx * ny * nz).fill(0);

    // 填充密度
    for (const p of points) {
        const ix = Math.floor((p.x - bounds.minX) / cellSize) + 1;
        const iy = Math.floor((p.y - bounds.minY) / cellSize) + 1;
        const iz = Math.floor((p.z - bounds.minZ) / cellSize) + 1;

        if (ix >= 0 && ix < nx && iy >= 0 && iy < ny && iz >= 0 && iz < nz) {
            const idx = ix + iy * nx + iz * nx * ny;
            grid[idx] = 1.0;
        }
    }

    return {
        grid,
        dims: [nx, ny, nz],
        origin: [bounds.minX - cellSize, bounds.minY - cellSize, bounds.minZ - cellSize],
    };
}

/**
 * 簡化版 Marching Cubes 實作
 * 生成包圍 voxel 群組的表面網格
 */
function marchingCubes(
    grid: Float32Array,
    dims: [number, number, number],
    origin: [number, number, number],
    cellSize: number,
    twd97Origin: Vector2,
    isoValue: number = 0.5
): { positions: number[]; indices: number[] } {
    const [nx, ny, nz] = dims;
    const positions: number[] = [];
    const indices: number[] = [];

    // 邊查找表 (標準 Marching Cubes)
    const edgeTable = getMarchingCubesEdgeTable();
    const triTable = getMarchingCubesTriTable();

    const getGridValue = (x: number, y: number, z: number): number => {
        if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) return 0;
        return grid[x + y * nx + z * nx * ny];
    };

    const vertexCache = new Map<string, number>();

    const getVertex = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number => {
        const key = `${Math.min(x1, x2)},${Math.min(y1, y2)},${Math.min(z1, z2)}-${Math.max(x1, x2)},${Math.max(y1, y2)},${Math.max(z1, z2)}`;
        if (vertexCache.has(key)) return vertexCache.get(key)!;

        const v1 = getGridValue(x1, y1, z1);
        const v2 = getGridValue(x2, y2, z2);
        const t = (isoValue - v1) / (v2 - v1 + 0.0001);

        const px = origin[0] + (x1 + t * (x2 - x1)) * cellSize;
        const py = origin[1] + (y1 + t * (y2 - y1)) * cellSize;
        const pz = origin[2] + (z1 + t * (z2 - z1)) * cellSize;

        // 轉換 TWD97 座標到場景座標
        // X: 東距偏移
        // Y: 高程 (z in CSV)
        // Z: 北距偏移 (負值因為 Three.js 慣例)
        const worldX = (px - twd97Origin.x) * SCALE_FACTOR;
        const worldY = pz * SCALE_FACTOR; // CSV 的 z (高程) 映射到 Three.js Y 軸
        const worldZ = -(py - twd97Origin.y) * SCALE_FACTOR; // 北距映射到 -Z

        const idx = positions.length / 3;
        positions.push(worldX, worldY, worldZ);
        vertexCache.set(key, idx);
        return idx;
    };

    for (let z = 0; z < nz - 1; z++) {
        for (let y = 0; y < ny - 1; y++) {
            for (let x = 0; x < nx - 1; x++) {
                // 計算 cube index
                let cubeIndex = 0;
                if (getGridValue(x, y, z) > isoValue) cubeIndex |= 1;
                if (getGridValue(x + 1, y, z) > isoValue) cubeIndex |= 2;
                if (getGridValue(x + 1, y + 1, z) > isoValue) cubeIndex |= 4;
                if (getGridValue(x, y + 1, z) > isoValue) cubeIndex |= 8;
                if (getGridValue(x, y, z + 1) > isoValue) cubeIndex |= 16;
                if (getGridValue(x + 1, y, z + 1) > isoValue) cubeIndex |= 32;
                if (getGridValue(x + 1, y + 1, z + 1) > isoValue) cubeIndex |= 64;
                if (getGridValue(x, y + 1, z + 1) > isoValue) cubeIndex |= 128;

                if (edgeTable[cubeIndex] === 0) continue;

                // 取得邊上的頂點
                const vertList: number[] = new Array(12).fill(-1);
                if (edgeTable[cubeIndex] & 1) vertList[0] = getVertex(x, y, z, x + 1, y, z);
                if (edgeTable[cubeIndex] & 2) vertList[1] = getVertex(x + 1, y, z, x + 1, y + 1, z);
                if (edgeTable[cubeIndex] & 4) vertList[2] = getVertex(x + 1, y + 1, z, x, y + 1, z);
                if (edgeTable[cubeIndex] & 8) vertList[3] = getVertex(x, y + 1, z, x, y, z);
                if (edgeTable[cubeIndex] & 16) vertList[4] = getVertex(x, y, z + 1, x + 1, y, z + 1);
                if (edgeTable[cubeIndex] & 32) vertList[5] = getVertex(x + 1, y, z + 1, x + 1, y + 1, z + 1);
                if (edgeTable[cubeIndex] & 64) vertList[6] = getVertex(x + 1, y + 1, z + 1, x, y + 1, z + 1);
                if (edgeTable[cubeIndex] & 128) vertList[7] = getVertex(x, y + 1, z + 1, x, y, z + 1);
                if (edgeTable[cubeIndex] & 256) vertList[8] = getVertex(x, y, z, x, y, z + 1);
                if (edgeTable[cubeIndex] & 512) vertList[9] = getVertex(x + 1, y, z, x + 1, y, z + 1);
                if (edgeTable[cubeIndex] & 1024) vertList[10] = getVertex(x + 1, y + 1, z, x + 1, y + 1, z + 1);
                if (edgeTable[cubeIndex] & 2048) vertList[11] = getVertex(x, y + 1, z, x, y + 1, z + 1);

                // 產生三角形
                for (let i = 0; triTable[cubeIndex][i] !== -1; i += 3) {
                    indices.push(
                        vertList[triTable[cubeIndex][i]],
                        vertList[triTable[cubeIndex][i + 1]],
                        vertList[triTable[cubeIndex][i + 2]]
                    );
                }
            }
        }
    }

    return { positions, indices };
}

/**
 * 計算頂點法線
 */
function computeNormals(positions: number[], indices: number[]): Float32Array {
    const normals = new Float32Array(positions.length).fill(0);
    const vertexCount = positions.length / 3;

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i + 1] * 3;
        const i2 = indices[i + 2] * 3;

        const v0 = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
        const v1 = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
        const v2 = [positions[i2], positions[i2 + 1], positions[i2 + 2]];

        const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        const n = [
            e1[1] * e2[2] - e1[2] * e2[1],
            e1[2] * e2[0] - e1[0] * e2[2],
            e1[0] * e2[1] - e1[1] * e2[0],
        ];

        for (const idx of [i0, i1, i2]) {
            normals[idx] += n[0];
            normals[idx + 1] += n[1];
            normals[idx + 2] += n[2];
        }
    }

    // 正規化
    for (let i = 0; i < vertexCount; i++) {
        const idx = i * 3;
        const len = Math.sqrt(normals[idx] ** 2 + normals[idx + 1] ** 2 + normals[idx + 2] ** 2);
        if (len > 0) {
            normals[idx] /= len;
            normals[idx + 1] /= len;
            normals[idx + 2] /= len;
        }
    }

    return normals;
}

/**
 * 主要轉換函數
 */
export async function generateIsosurface(
    csvPath: string,
    outputDir: string,
    cellSize: number = 20,
    origin: Vector2,
    onProgress?: (percent: number) => void
): Promise<IsosurfaceResult> {
    console.log(`🔄 Starting isosurface generation: ${csvPath}`);

    // 確保輸出目錄存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 解析 CSV
    onProgress?.(5);
    const points = parseVoxelCsv(csvPath);
    onProgress?.(15);

    if (points.length === 0) {
        throw new Error('CSV 檔案中沒有有效的點資料');
    }

    console.log(`📊 Parsed ${points.length} points`);

    // 計算邊界
    const bounds = calculateBounds(points);
    console.log(`📐 Bounds: X[${bounds.minX}, ${bounds.maxX}], Y[${bounds.minY}, ${bounds.maxY}], Z[${bounds.minZ}, ${bounds.maxZ}]`);
    console.log(`📍 Using Project Origin: (${origin.x}, ${origin.y})`);

    // 按岩性分組
    onProgress?.(20);
    const groups = groupByLithology(points);
    console.log(`🪨 Found ${groups.size} lithology groups`);

    // 建立 GLTF 文件
    const doc = new Document();
    const buffer = doc.createBuffer();
    const scene = doc.createScene();

    let processedGroups = 0;
    const totalGroups = groups.size;

    for (const [lithId, groupPoints] of groups) {
        console.log(`  Processing lith_id=${lithId} (${groupPoints.length} points)`);

        // 建立密度網格
        const { grid, dims, origin: groupOrigin } = buildDensityGrid(groupPoints, bounds, cellSize);

        // 執行 Marching Cubes
        const { positions, indices } = marchingCubes(grid, dims, groupOrigin, cellSize, origin);

        if (positions.length === 0 || indices.length === 0) {
            console.log(`    Skipped (no surface generated)`);
            processedGroups++;
            continue;
        }

        // 計算法線
        const normals = computeNormals(positions, indices);

        // 建立 GLTF 材質
        const color = LITHOLOGY_COLORS[lithId] || DEFAULT_COLOR;
        const material = doc.createMaterial(`lith_${lithId}`)
            .setBaseColorFactor([color[0], color[1], color[2], 1.0])
            .setRoughnessFactor(0.7)
            .setMetallicFactor(0.1)
            .setDoubleSided(true);

        // 建立 mesh
        const positionAccessor = doc.createAccessor()
            .setArray(new Float32Array(positions))
            .setType('VEC3')
            .setBuffer(buffer);

        const normalAccessor = doc.createAccessor()
            .setArray(new Float32Array(Array.from(normals)))
            .setType('VEC3')
            .setBuffer(buffer);

        const indexAccessor = doc.createAccessor()
            .setArray(new Uint32Array(indices))
            .setType('SCALAR')
            .setBuffer(buffer);

        const primitive = doc.createPrimitive()
            .setAttribute('POSITION', positionAccessor)
            .setAttribute('NORMAL', normalAccessor)
            .setIndices(indexAccessor)
            .setMaterial(material);

        const mesh = doc.createMesh(`mesh_lith_${lithId}`)
            .addPrimitive(primitive);

        const node = doc.createNode(`node_lith_${lithId}`)
            .setMesh(mesh);

        scene.addChild(node);

        processedGroups++;
        onProgress?.(20 + Math.round((processedGroups / totalGroups) * 70));
        console.log(`    Generated ${positions.length / 3} vertices, ${indices.length / 3} triangles`);
    }

    // 輸出 GLB
    onProgress?.(95);
    const io = new NodeIO();
    const glbPath = path.join(outputDir, 'model.glb');
    await io.write(glbPath, doc);
    onProgress?.(100);

    console.log(`✅ Generated GLB: ${glbPath}`);

    return {
        meshUrl: `/uploads/geology-tiles/${path.basename(outputDir)}/model.glb`,
        bounds,
        layerCount: groups.size,
        pointCount: points.length,
    };
}

// Marching Cubes 邊表
function getMarchingCubesEdgeTable(): number[] {
    return [
        0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
        0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
        0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
        0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
        0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
        0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
        0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
        0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
        0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
        0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
        0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
        0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
        0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
        0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
        0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
        0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
        0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
        0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
        0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
        0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
        0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
        0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
        0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
        0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
        0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
        0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
        0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
        0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
        0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
        0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
        0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
        0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
    ];
}

// Marching Cubes 三角形表 (256 cases)
function getMarchingCubesTriTable(): number[][] {
    // 完整的 256 個 case 三角形索引表
    // 每個 case 最多 5 個三角形 (15 個索引), -1 表示結束
    return [
        [-1],
        [0, 8, 3, -1],
        [0, 1, 9, -1],
        [1, 8, 3, 9, 8, 1, -1],
        [1, 2, 10, -1],
        [0, 8, 3, 1, 2, 10, -1],
        [9, 2, 10, 0, 2, 9, -1],
        [2, 8, 3, 2, 10, 8, 10, 9, 8, -1],
        [3, 11, 2, -1],
        [0, 11, 2, 8, 11, 0, -1],
        [1, 9, 0, 2, 3, 11, -1],
        [1, 11, 2, 1, 9, 11, 9, 8, 11, -1],
        [3, 10, 1, 11, 10, 3, -1],
        [0, 10, 1, 0, 8, 10, 8, 11, 10, -1],
        [3, 9, 0, 3, 11, 9, 11, 10, 9, -1],
        [9, 8, 10, 10, 8, 11, -1],
        [4, 7, 8, -1],
        [4, 3, 0, 7, 3, 4, -1],
        [0, 1, 9, 8, 4, 7, -1],
        [4, 1, 9, 4, 7, 1, 7, 3, 1, -1],
        [1, 2, 10, 8, 4, 7, -1],
        [3, 4, 7, 3, 0, 4, 1, 2, 10, -1],
        [9, 2, 10, 9, 0, 2, 8, 4, 7, -1],
        [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1],
        [8, 4, 7, 3, 11, 2, -1],
        [11, 4, 7, 11, 2, 4, 2, 0, 4, -1],
        [9, 0, 1, 8, 4, 7, 2, 3, 11, -1],
        [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1],
        [3, 10, 1, 3, 11, 10, 7, 8, 4, -1],
        [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1],
        [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1],
        [4, 7, 11, 4, 11, 9, 9, 11, 10, -1],
        [9, 5, 4, -1],
        [9, 5, 4, 0, 8, 3, -1],
        [0, 5, 4, 1, 5, 0, -1],
        [8, 5, 4, 8, 3, 5, 3, 1, 5, -1],
        [1, 2, 10, 9, 5, 4, -1],
        [3, 0, 8, 1, 2, 10, 4, 9, 5, -1],
        [5, 2, 10, 5, 4, 2, 4, 0, 2, -1],
        [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1],
        [9, 5, 4, 2, 3, 11, -1],
        [0, 11, 2, 0, 8, 11, 4, 9, 5, -1],
        [0, 5, 4, 0, 1, 5, 2, 3, 11, -1],
        [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1],
        [10, 3, 11, 10, 1, 3, 9, 5, 4, -1],
        [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1],
        [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1],
        [5, 4, 8, 5, 8, 10, 10, 8, 11, -1],
        [9, 7, 8, 5, 7, 9, -1],
        [9, 3, 0, 9, 5, 3, 5, 7, 3, -1],
        [0, 7, 8, 0, 1, 7, 1, 5, 7, -1],
        [1, 5, 3, 3, 5, 7, -1],
        [9, 7, 8, 9, 5, 7, 10, 1, 2, -1],
        [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1],
        [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1],
        [2, 10, 5, 2, 5, 3, 3, 5, 7, -1],
        [7, 9, 5, 7, 8, 9, 3, 11, 2, -1],
        [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1],
        [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1],
        [11, 2, 1, 11, 1, 7, 7, 1, 5, -1],
        [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1],
        [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
        [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
        [11, 10, 5, 7, 11, 5, -1],
        [10, 6, 5, -1],
        [0, 8, 3, 5, 10, 6, -1],
        [9, 0, 1, 5, 10, 6, -1],
        [1, 8, 3, 1, 9, 8, 5, 10, 6, -1],
        [1, 6, 5, 2, 6, 1, -1],
        [1, 6, 5, 1, 2, 6, 3, 0, 8, -1],
        [9, 6, 5, 9, 0, 6, 0, 2, 6, -1],
        [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1],
        [2, 3, 11, 10, 6, 5, -1],
        [11, 0, 8, 11, 2, 0, 10, 6, 5, -1],
        [0, 1, 9, 2, 3, 11, 5, 10, 6, -1],
        [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1],
        [6, 3, 11, 6, 5, 3, 5, 1, 3, -1],
        [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1],
        [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1],
        [6, 5, 9, 6, 9, 11, 11, 9, 8, -1],
        [5, 10, 6, 4, 7, 8, -1],
        [4, 3, 0, 4, 7, 3, 6, 5, 10, -1],
        [1, 9, 0, 5, 10, 6, 8, 4, 7, -1],
        [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1],
        [6, 1, 2, 6, 5, 1, 4, 7, 8, -1],
        [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1],
        [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1],
        [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
        [3, 11, 2, 7, 8, 4, 10, 6, 5, -1],
        [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1],
        [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1],
        [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
        [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1],
        [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
        [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
        [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1],
        [10, 4, 9, 6, 4, 10, -1],
        [4, 10, 6, 4, 9, 10, 0, 8, 3, -1],
        [10, 0, 1, 10, 6, 0, 6, 4, 0, -1],
        [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1],
        [1, 4, 9, 1, 2, 4, 2, 6, 4, -1],
        [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1],
        [0, 2, 4, 4, 2, 6, -1],
        [8, 3, 2, 8, 2, 4, 4, 2, 6, -1],
        [10, 4, 9, 10, 6, 4, 11, 2, 3, -1],
        [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1],
        [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1],
        [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
        [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1],
        [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
        [3, 11, 6, 3, 6, 0, 0, 6, 4, -1],
        [6, 4, 8, 11, 6, 8, -1],
        [7, 10, 6, 7, 8, 10, 8, 9, 10, -1],
        [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1],
        [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1],
        [10, 6, 7, 10, 7, 1, 1, 7, 3, -1],
        [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1],
        [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
        [7, 8, 0, 7, 0, 6, 6, 0, 2, -1],
        [7, 3, 2, 6, 7, 2, -1],
        [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1],
        [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
        [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
        [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1],
        [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
        [0, 9, 1, 11, 6, 7, -1],
        [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1],
        [7, 11, 6, -1],
        [7, 6, 11, -1],
        [3, 0, 8, 11, 7, 6, -1],
        [0, 1, 9, 11, 7, 6, -1],
        [8, 1, 9, 8, 3, 1, 11, 7, 6, -1],
        [10, 1, 2, 6, 11, 7, -1],
        [1, 2, 10, 3, 0, 8, 6, 11, 7, -1],
        [2, 9, 0, 2, 10, 9, 6, 11, 7, -1],
        [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1],
        [7, 2, 3, 6, 2, 7, -1],
        [7, 0, 8, 7, 6, 0, 6, 2, 0, -1],
        [2, 7, 6, 2, 3, 7, 0, 1, 9, -1],
        [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1],
        [10, 7, 6, 10, 1, 7, 1, 3, 7, -1],
        [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1],
        [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1],
        [7, 6, 10, 7, 10, 8, 8, 10, 9, -1],
        [6, 8, 4, 11, 8, 6, -1],
        [3, 6, 11, 3, 0, 6, 0, 4, 6, -1],
        [8, 6, 11, 8, 4, 6, 9, 0, 1, -1],
        [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1],
        [6, 8, 4, 6, 11, 8, 2, 10, 1, -1],
        [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1],
        [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1],
        [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
        [8, 2, 3, 8, 4, 2, 4, 6, 2, -1],
        [0, 4, 2, 4, 6, 2, -1],
        [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1],
        [1, 9, 4, 1, 4, 2, 2, 4, 6, -1],
        [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1],
        [10, 1, 0, 10, 0, 6, 6, 0, 4, -1],
        [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
        [10, 9, 4, 6, 10, 4, -1],
        [4, 9, 5, 7, 6, 11, -1],
        [0, 8, 3, 4, 9, 5, 11, 7, 6, -1],
        [5, 0, 1, 5, 4, 0, 7, 6, 11, -1],
        [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1],
        [9, 5, 4, 10, 1, 2, 7, 6, 11, -1],
        [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1],
        [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1],
        [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
        [7, 2, 3, 7, 6, 2, 5, 4, 9, -1],
        [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1],
        [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1],
        [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
        [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1],
        [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
        [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
        [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1],
        [6, 9, 5, 6, 11, 9, 11, 8, 9, -1],
        [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1],
        [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1],
        [6, 11, 3, 6, 3, 5, 5, 3, 1, -1],
        [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1],
        [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
        [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
        [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1],
        [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1],
        [9, 5, 6, 9, 6, 0, 0, 6, 2, -1],
        [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
        [1, 5, 6, 2, 1, 6, -1],
        [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
        [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1],
        [0, 3, 8, 5, 6, 10, -1],
        [10, 5, 6, -1],
        [11, 5, 10, 7, 5, 11, -1],
        [11, 5, 10, 11, 7, 5, 8, 3, 0, -1],
        [5, 11, 7, 5, 10, 11, 1, 9, 0, -1],
        [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1],
        [11, 1, 2, 11, 7, 1, 7, 5, 1, -1],
        [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1],
        [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1],
        [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
        [2, 5, 10, 2, 3, 5, 3, 7, 5, -1],
        [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1],
        [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1],
        [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
        [1, 3, 5, 3, 7, 5, -1],
        [0, 8, 7, 0, 7, 1, 1, 7, 5, -1],
        [9, 0, 3, 9, 3, 5, 5, 3, 7, -1],
        [9, 8, 7, 5, 9, 7, -1],
        [5, 8, 4, 5, 10, 8, 10, 11, 8, -1],
        [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1],
        [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1],
        [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
        [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1],
        [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
        [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
        [9, 4, 5, 2, 11, 3, -1],
        [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1],
        [5, 10, 2, 5, 2, 4, 4, 2, 0, -1],
        [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
        [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1],
        [8, 4, 5, 8, 5, 3, 3, 5, 1, -1],
        [0, 4, 5, 1, 0, 5, -1],
        [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1],
        [9, 4, 5, -1],
        [4, 11, 7, 4, 9, 11, 9, 10, 11, -1],
        [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1],
        [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1],
        [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
        [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1],
        [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
        [11, 7, 4, 11, 4, 2, 2, 4, 0, -1],
        [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1],
        [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1],
        [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
        [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
        [1, 10, 2, 8, 7, 4, -1],
        [4, 9, 1, 4, 1, 7, 7, 1, 3, -1],
        [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1],
        [4, 0, 3, 7, 4, 3, -1],
        [4, 8, 7, -1],
        [9, 10, 8, 10, 11, 8, -1],
        [3, 0, 9, 3, 9, 11, 11, 9, 10, -1],
        [0, 1, 10, 0, 10, 8, 8, 10, 11, -1],
        [3, 1, 10, 11, 3, 10, -1],
        [1, 2, 11, 1, 11, 9, 9, 11, 8, -1],
        [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1],
        [0, 2, 11, 8, 0, 11, -1],
        [3, 2, 11, -1],
        [2, 3, 8, 2, 8, 10, 10, 8, 9, -1],
        [9, 10, 2, 0, 9, 2, -1],
        [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1],
        [1, 10, 2, -1],
        [1, 3, 8, 9, 1, 8, -1],
        [0, 9, 1, -1],
        [0, 3, 8, -1],
        [-1]
    ];
}
