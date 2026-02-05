import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

/**
 * Prisma 7 + prisma dev 連線設定
 * 
 * prisma dev 產生的 DATABASE_URL 使用 HTTP 格式 (prisma+postgres://)，
 * 但 Prisma Client 7.3.0 要求使用直接 TCP 連線。
 * 
 * 解決：從 DATABASE_URL 的 api_key 中解碼出實際的 PostgreSQL TCP 連線字串。
 */

function extractTcpConnectionString(): string {
    const databaseUrl = process.env.DATABASE_URL || '';

    // 如果已經是標準 postgres:// 格式，直接使用
    if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
        return databaseUrl;
    }

    // 解析 prisma+postgres:// 格式中的 api_key
    try {
        const url = new URL(databaseUrl);
        const apiKey = url.searchParams.get('api_key');
        if (apiKey) {
            const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8'));
            if (decoded.databaseUrl) {
                return decoded.databaseUrl;
            }
        }
    } catch (e) {
        console.error('Failed to extract TCP connection string:', e);
    }

    // 回退：使用原 URL
    return databaseUrl;
}

const connectionString = extractTcpConnectionString();
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
