/**
 * Error Logger Middleware
 * 
 * Backend error logging middleware for Express.
 * @see specs/4-user-roles-system/spec.md FR-18
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

interface LoggedError {
    timestamp: string;
    method: string;
    path: string;
    statusCode: number;
    message: string;
    stack?: string;
    userId?: string;
    userEmail?: string;
    requestId?: string;
}

// In-memory error log (in production, use a proper logging service)
const errorLog: LoggedError[] = [];
const MAX_LOG_SIZE = 1000;

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Request ID middleware - attaches unique ID to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    req.headers['x-request-id'] = req.headers['x-request-id'] || generateRequestId();
    res.setHeader('x-request-id', req.headers['x-request-id']);
    next();
}

/**
 * Request logging middleware - logs all requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    // Log request start
    console.log(`[${requestId}] ${req.method} ${req.path} - Started`);

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
        console.log(
            `[${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms) [${level}]`
        );
    });

    next();
}

/**
 * Error logging middleware - catches and logs errors
 */
export const errorLogger: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const requestId = req.headers['x-request-id'] as string;
    const user = (req as any).user;

    const logEntry: LoggedError = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: 500,
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        userId: user?.userId,
        userEmail: user?.email,
        requestId,
    };

    // Add to in-memory log
    errorLog.push(logEntry);
    if (errorLog.length > MAX_LOG_SIZE) {
        errorLog.shift();
    }

    // Log to console
    console.error(`[ERROR] [${requestId}] ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    // Pass to next error handler
    next(err);
};

/**
 * Get recent error logs (for admin endpoints)
 */
export function getRecentErrors(limit: number = 50): LoggedError[] {
    return errorLog.slice(-limit);
}

/**
 * Clear error log (for testing)
 */
export function clearErrorLog(): void {
    errorLog.length = 0;
}

export default errorLogger;
