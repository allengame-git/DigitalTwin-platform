import path from 'path';

const SERVER_ROOT = path.resolve(__dirname, '..');
const UPLOADS_ROOT = path.resolve(SERVER_ROOT, 'uploads');

/**
 * Resolve a DB-stored URL (e.g. "/uploads/facility/models/xxx/file.glb")
 * to an absolute path. Returns null if the resolved path is outside uploads/.
 *
 * DB 中的 URL 以 `/uploads/...` 開頭（前導 `/`），
 * 必須先 strip 前導 `/` 再 resolve，否則 path.resolve 會把它當絕對路徑。
 */
export function safeResolvePath(url: string): string | null {
    if (!url) return null;
    // Strip leading '/' so path.resolve treats it as relative
    const relative = url.replace(/^\/+/, '');
    const resolved = path.resolve(SERVER_ROOT, relative);
    if (!resolved.startsWith(UPLOADS_ROOT)) {
        console.warn('[Security] Suspicious file path blocked:', url, '->', resolved);
        return null;
    }
    return resolved;
}
