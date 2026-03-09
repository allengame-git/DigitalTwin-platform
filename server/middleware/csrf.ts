import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * 設置 CSRF token cookie（登入成功後呼叫）
 */
export function setCsrfToken(res: Response): string {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,  // 前端需讀取
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24h
    });
    return token;
}

/**
 * 驗證 CSRF token（用於 mutating requests）
 * Double Submit Cookie pattern: 比對 cookie 中的 token 與 header 中的 token
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
    // 只檢查 mutating methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        res.status(403).json({ message: 'CSRF token 驗證失敗' });
        return;
    }

    next();
}
