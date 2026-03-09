import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
    if (!stores.has(name)) {
        stores.set(name, new Map());
    }
    return stores.get(name)!;
}

interface RateLimitOptions {
    name: string;
    windowMs: number;
    maxRequests: number;
    keyFn?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
    const { name, windowMs, maxRequests, keyFn } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
        const store = getStore(name);
        const key = keyFn ? keyFn(req) : (req.ip || req.socket.remoteAddress || 'unknown');
        const now = Date.now();

        const entry = store.get(key);

        if (!entry || now > entry.resetAt) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }

        if (entry.count >= maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.status(429).json({
                message: '請求過於頻繁，請稍後再試',
                retryAfter,
            });
            return;
        }

        entry.count++;
        next();
    };
}

// 定期清理過期 entries（每 5 分鐘）
setInterval(() => {
    const now = Date.now();
    for (const store of stores.values()) {
        for (const [key, entry] of store) {
            if (now > entry.resetAt) {
                store.delete(key);
            }
        }
    }
}, 5 * 60 * 1000);

// ── 預設配置 ──────────────────────────────────────────

/** 登入端點：同 IP 60 秒內最多 10 次 */
export const loginRateLimit = rateLimit({
    name: 'login',
    windowMs: 60 * 1000,
    maxRequests: 10,
});

/** 密碼變更：同 IP 60 秒內最多 5 次 */
export const passwordRateLimit = rateLimit({
    name: 'password',
    windowMs: 60 * 1000,
    maxRequests: 5,
});

/** Admin API：同 IP 60 秒內最多 30 次 */
export const adminRateLimit = rateLimit({
    name: 'admin',
    windowMs: 60 * 1000,
    maxRequests: 30,
});
