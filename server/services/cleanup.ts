import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

const UPLOADS_ROOT = path.join(__dirname, '../uploads');
const TRASH_ROOT = path.join(__dirname, '../uploads/_trash');

export interface OrphanFile {
    path: string;       // 相對於 uploads 的路徑
    size: number;
    createdAt: Date;
    directory: string;
}

export interface TrashStatus {
    trashFolders: {
        timestamp: string;
        date: Date;
        fileCount: number;
        totalSize: number;
    }[];
    totalFiles: number;
    totalSize: number;
}

/**
 * 取得目錄下所有檔案路徑 (遞迴)
 */
function getAllFilesContext(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        // 跳過 processed 和子目錄中的 processed，或者直接把路徑結合起來判斷
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFilesContext(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

/**
 * 掃描所有孤兒檔案 (只掃描建立時間大於 48 小時的檔案)
 */
export async function scanOrphanFiles(): Promise<OrphanFile[]> {
    const orphanFiles: OrphanFile[] = [];
    const now = new Date();
    // 48 小時前的 deadline
    const deadline = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // 1. Imagery
    const imageryDir = path.join(UPLOADS_ROOT, 'imagery');
    if (fs.existsSync(imageryDir)) {
        const dbImageries = await prisma.imagery.findMany({ select: { filename: true } });
        const validFilenames = new Set(dbImageries.map(img => img.filename));

        const files = fs.readdirSync(imageryDir);
        for (const file of files) {
            const filePath = path.join(imageryDir, file);
            if (!fs.statSync(filePath).isFile()) continue;

            const stat = fs.statSync(filePath);
            if (stat.birthtime > deadline) continue; // 太新的檔案跳過

            // 比對邏輯：檔名或是 thumb-檔名
            const isThumb = file.startsWith('thumb-');
            const baseFilename = isThumb ? file.replace('thumb-', '') : file;

            if (!validFilenames.has(baseFilename)) {
                orphanFiles.push({
                    path: `imagery/${file}`,
                    size: stat.size,
                    createdAt: stat.birthtime,
                    directory: 'imagery'
                });
            }
        }
    }

    // 2. Geophysics
    const geoDir = path.join(UPLOADS_ROOT, 'geophysics');
    if (fs.existsSync(geoDir)) {
        const dbGeophysics = await prisma.geophysics.findMany({ select: { filename: true } });
        const validFilenames = new Set(dbGeophysics.map(g => g.filename));

        const files = fs.readdirSync(geoDir);
        for (const file of files) {
            const filePath = path.join(geoDir, file);
            if (!fs.statSync(filePath).isFile()) continue;

            const stat = fs.statSync(filePath);
            if (stat.birthtime > deadline) continue;

            const isThumb = file.startsWith('thumb-');
            const baseFilename = isThumb ? file.replace('thumb-', '') : file;

            if (!validFilenames.has(baseFilename)) {
                orphanFiles.push({
                    path: `geophysics/${file}`,
                    size: stat.size,
                    createdAt: stat.birthtime,
                    directory: 'geophysics'
                });
            }
        }
    }

    // 3. Geology (CSV/DAT)
    const geologyDir = path.join(UPLOADS_ROOT, 'geology');
    if (fs.existsSync(geologyDir)) {
        const dbModels = await prisma.geologyModel.findMany({ select: { filename: true } });
        const validFilenames = new Set(dbModels.map(m => m.filename));

        const files = fs.readdirSync(geologyDir);
        for (const file of files) {
            const filePath = path.join(geologyDir, file);
            if (!fs.statSync(filePath).isFile()) continue;

            const stat = fs.statSync(filePath);
            if (stat.birthtime > deadline) continue;

            if (!validFilenames.has(file)) {
                orphanFiles.push({
                    path: `geology/${file}`,
                    size: stat.size,
                    createdAt: stat.birthtime,
                    directory: 'geology'
                });
            }
        }
    }

    // 4. Geology Tiles (依 model id 建目錄)
    const tilesDir = path.join(UPLOADS_ROOT, 'geology-tiles');
    if (fs.existsSync(tilesDir)) {
        const dbModels = await prisma.geologyModel.findMany({ select: { id: true } });
        const validModelIds = new Set(dbModels.map(m => m.id));

        const subDirs = fs.readdirSync(tilesDir);
        for (const dirName of subDirs) {
            const dirPath = path.join(tilesDir, dirName);
            if (!fs.statSync(dirPath).isDirectory()) continue;

            if (!validModelIds.has(dirName)) {
                // 這個 model 已經不存在了，把裡面的檔案都當作孤兒
                const allFiles = getAllFilesContext(dirPath);
                for (const filePath of allFiles) {
                    const stat = fs.statSync(filePath);
                    if (stat.birthtime > deadline) continue;

                    const relPath = path.relative(UPLOADS_ROOT, filePath);
                    orphanFiles.push({
                        path: relPath, // e.g. geology-tiles/uuid/model.glb
                        size: stat.size,
                        createdAt: stat.birthtime,
                        directory: `geology-tiles/${dirName}`
                    });
                }
            }
        }
    }

    // 5. Borehole Photos
    const photoDir = path.join(UPLOADS_ROOT, 'borehole-photos');
    if (fs.existsSync(photoDir)) {
        const dbPhotos = await prisma.boreholePhoto.findMany({ select: { url: true } });
        // url is like `/uploads/borehole-photos/xxx.jpg`
        const validFilenames = new Set(dbPhotos.map(p => {
            const parts = p.url.split('/');
            return parts[parts.length - 1]; // get the filename part
        }));

        const files = fs.readdirSync(photoDir);
        for (const file of files) {
            const filePath = path.join(photoDir, file);
            if (!fs.statSync(filePath).isFile()) continue;

            const stat = fs.statSync(filePath);
            if (stat.birthtime > deadline) continue;

            const isThumb = file.startsWith('thumb-');
            const baseFilename = isThumb ? file.replace('thumb-', '') : file;

            if (!validFilenames.has(baseFilename)) {
                orphanFiles.push({
                    path: `borehole-photos/${file}`,
                    size: stat.size,
                    createdAt: stat.birthtime,
                    directory: 'borehole-photos'
                });
            }
        }
    }

    // 6. Terrain (包含 processed)
    const terrainDir = path.join(UPLOADS_ROOT, 'terrain');
    if (fs.existsSync(terrainDir)) {
        const dbTerrains = await prisma.terrain.findMany({
            select: { filename: true, heightmap: true, texture: true }
        });

        const validFiles = new Set<string>();
        for (const t of dbTerrains) {
            validFiles.add(`terrain/${t.filename}`);
            if (t.heightmap) {
                // heightmap: /uploads/terrain/processed/xxx
                const p = t.heightmap.replace('/uploads/', '');
                validFiles.add(p);
            }
            if (t.texture) {
                const p = t.texture.replace('/uploads/', '');
                validFiles.add(p);
            }
        }

        const allTerrainFiles = getAllFilesContext(terrainDir);
        for (const filePath of allTerrainFiles) {
            const stat = fs.statSync(filePath);
            if (stat.birthtime > deadline) continue;

            const relPath = path.relative(UPLOADS_ROOT, filePath); // e.g. terrain/xxx.tif or terrain/processed/xxx.png
            if (!validFiles.has(relPath)) {
                orphanFiles.push({
                    path: relPath,
                    size: stat.size,
                    createdAt: stat.birthtime,
                    directory: 'terrain'
                });
            }
        }
    }

    return orphanFiles;
}

/**
 * 將指定的檔案移動到 _trash/{timestamp}/ 目錄
 */
export async function moveToTrash(files: string[]): Promise<number> {
    if (files.length === 0) return 0;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // e.g. 2026-02-13T09-21-45-123Z
    const runTrashDir = path.join(TRASH_ROOT, timestamp);
    fs.mkdirSync(runTrashDir, { recursive: true });

    let movedCount = 0;
    const manifestLog: any[] = [];

    for (const relPath of files) {
        const sourcePath = path.join(UPLOADS_ROOT, relPath);
        if (!fs.existsSync(sourcePath)) continue;

        const destPath = path.join(runTrashDir, relPath);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const size = fs.statSync(sourcePath).size;

        try {
            fs.renameSync(sourcePath, destPath);
            manifestLog.push({
                originalPath: relPath,
                size,
                movedAt: new Date().toISOString()
            });
            movedCount++;
        } catch (error) {
            console.error(`Failed to move ${sourcePath} to trash:`, error);
        }
    }

    // 寫入 manifest.json
    if (movedCount > 0) {
        fs.writeFileSync(
            path.join(runTrashDir, 'manifest.json'),
            JSON.stringify({ files: manifestLog, total: movedCount, timestamp }, null, 2)
        );
    } else {
        // 如果沒移成功任何東西，把這個空的資料夾刪掉
        fs.rmSync(runTrashDir, { recursive: true, force: true });
    }

    return movedCount;
}

/**
 * 取得 Trash 狀態
 */
export async function getTrashStatus(): Promise<TrashStatus> {
    const status: TrashStatus = {
        trashFolders: [],
        totalFiles: 0,
        totalSize: 0
    };

    if (!fs.existsSync(TRASH_ROOT)) {
        return status;
    }

    const folders = fs.readdirSync(TRASH_ROOT);
    for (const folder of folders) {
        const folderPath = path.join(TRASH_ROOT, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        let fileCount = 0;
        let folderSize = 0;

        const manifestPath = path.join(folderPath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                fileCount = manifest.total || 0;
                folderSize = manifest.files?.reduce((acc: number, f: any) => acc + (f.size || 0), 0) || 0;
            } catch (e) {
                console.warn(`Failed to parse manifest in ${folder}`);
            }
        } else {
            // Fallback: 掃描檔案大小
            const allFiles = getAllFilesContext(folderPath);
            fileCount = allFiles.length;
            folderSize = allFiles.reduce((acc, f) => acc + fs.statSync(f).size, 0);
        }

        // 嘗試解析 timestamp
        // 將 2026-02-13T09-21-45-123Z 還原成合法 ISO 格式
        let parsedDate = new Date();
        try {
            if (folder.includes('T')) {
                const [datePart, timePart] = folder.split('T');
                const timeStr = timePart.replace(/-/g, ':').replace('Z:', 'Z'); // 很粗略的還原
                parsedDate = new Date(`${datePart}T${timeStr}`);
                if (isNaN(parsedDate.getTime())) parsedDate = fs.statSync(folderPath).birthtime;
            } else {
                parsedDate = fs.statSync(folderPath).birthtime;
            }
        } catch (e) {
            parsedDate = fs.statSync(folderPath).birthtime;
        }

        status.trashFolders.push({
            timestamp: folder,
            date: parsedDate,
            fileCount,
            totalSize: folderSize
        });

        status.totalFiles += fileCount;
        status.totalSize += folderSize;
    }

    // 依時間排序，最舊的在前面
    status.trashFolders.sort((a, b) => a.date.getTime() - b.date.getTime());

    return status;
}

/**
 * 徹底清除 Trash 裡面的檔案（不再受 48 小時限制，手動觸發即全清）
 */
export async function purgeExpiredTrash(): Promise<string[]> {
    if (!fs.existsSync(TRASH_ROOT)) return [];

    const purgedFolders: string[] = [];

    const folders = fs.readdirSync(TRASH_ROOT);
    for (const folder of folders) {
        const folderPath = path.join(TRASH_ROOT, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        // 直接刪掉
        fs.rmSync(folderPath, { recursive: true, force: true });
        purgedFolders.push(folder);
        console.log(`[Cleanup] Purged trash folder: ${folder}`);
    }

    return purgedFolders;
}
