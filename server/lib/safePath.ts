import path from 'path';

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

/**
 * Resolve a DB-stored URL (e.g. "/uploads/facility/models/xxx/file.glb")
 * to an absolute path. Returns null if the resolved path is outside uploads/.
 */
export function safeResolvePath(url: string): string | null {
    const resolved = path.resolve(__dirname, '..', url);
    if (!resolved.startsWith(UPLOADS_ROOT)) {
        console.warn('[Security] Suspicious file path blocked:', url);
        return null;
    }
    return resolved;
}
