import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

// 複製 lib/prisma.ts 的連線邏輯（seed 獨立執行，不能 import server 模組）
function extractTcpConnectionString(): string {
    const databaseUrl = process.env.DATABASE_URL || '';
    if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
        return databaseUrl;
    }
    try {
        const url = new URL(databaseUrl);
        const apiKey = url.searchParams.get('api_key');
        if (apiKey) {
            const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8'));
            if (decoded.databaseUrl) return decoded.databaseUrl;
        }
    } catch (e) {
        console.error('Failed to extract TCP connection string:', e);
    }
    return databaseUrl;
}

const connectionString = extractTcpConnectionString();
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const initialPassword = 'Admin@2026';
    const hash = await bcrypt.hash(initialPassword, 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@llrwd.tw' },
        update: {},
        create: {
            email: 'admin@llrwd.tw',
            passwordHash: hash,
            name: '系統管理員',
            role: 'admin',
            status: 'active',
            mustChangePassword: true,
        },
    });

    console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
    console.log(`Initial password: ${initialPassword}`);
    console.log('User will be forced to change password on first login.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
