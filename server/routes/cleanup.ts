import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
    scanOrphanFiles,
    moveToTrash,
    getTrashStatus,
    purgeExpiredTrash
} from '../services/cleanup';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req: Request, res: Response, next: express.NextFunction) => {
    // auth middleware attaches user to req
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: '無權限執行此操作' });
    }
    next();
};

/**
 * GET /api/cleanup/scan
 * 掃描孤兒檔案（不做任何變更）
 */
router.get('/scan', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const orphanFiles = await scanOrphanFiles();

        // Calculate totals
        const totalSize = orphanFiles.reduce((acc, f) => acc + f.size, 0);

        res.json({
            success: true,
            data: {
                files: orphanFiles,
                totalFiles: orphanFiles.length,
                totalSize
            }
        });
    } catch (error) {
        console.error('Scan orphan files error:', error);
        res.status(500).json({ message: '掃描失敗', error: (error as Error).message });
    }
});

/**
 * POST /api/cleanup/execute
 * 執行清理：掃描孤兒並移到 trash
 */
router.post('/execute', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const orphanFiles = await scanOrphanFiles();
        if (orphanFiles.length === 0) {
            return res.json({
                success: true,
                message: '沒有找到需要清理的檔案',
                movedCount: 0
            });
        }

        const filePaths = orphanFiles.map(f => f.path);
        const movedCount = await moveToTrash(filePaths);

        res.json({
            success: true,
            message: `成功將 ${movedCount} 個檔案移至垃圾桶`,
            movedCount
        });
    } catch (error) {
        console.error('Execute cleanup error:', error);
        res.status(500).json({ message: '清理失敗', error: (error as Error).message });
    }
});

/**
 * GET /api/cleanup/trash
 * 查看 trash 狀態
 */
router.get('/trash', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const status = await getTrashStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Get trash status error:', error);
        res.status(500).json({ message: '讀取垃圾桶狀態失敗', error: (error as Error).message });
    }
});

/**
 * POST /api/cleanup/purge
 * 清除過期的 trash 檔案 (超過 48 小時)
 */
router.post('/purge', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const purgedFolders = await purgeExpiredTrash();

        res.json({
            success: true,
            message: `成功清除 ${purgedFolders.length} 個過期垃圾桶資料夾`,
            purgedFolders
        });
    } catch (error) {
        console.error('Purge trash error:', error);
        res.status(500).json({ message: '清除垃圾桶失敗', error: (error as Error).message });
    }
});

export default router;
