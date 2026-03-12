/**
 * Migration: 為所有 viewer 使用者自動指派全部專案 + 全部模組
 * 確保 reviewer→viewer 遷移零斷線
 *
 * Run: cd server && npx ts-node prisma/seed-viewer-migration.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
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
const ALL_MODULES = ['geology', 'facility', 'engineering', 'simulation'];

async function main() {
    const viewers = await prisma.user.findMany({ where: { role: 'viewer' } });
    const projects = await prisma.project.findMany();

    console.log(`Found ${viewers.length} viewer(s), ${projects.length} project(s)`);

    for (const viewer of viewers) {
        for (const project of projects) {
            const userProject = await prisma.userProject.upsert({
                where: {
                    userId_projectId: {
                        userId: viewer.id,
                        projectId: project.id,
                    },
                },
                create: {
                    userId: viewer.id,
                    projectId: project.id,
                    createdBy: 'migration',
                },
                update: {},
            });

            for (const moduleKey of ALL_MODULES) {
                await prisma.userProjectModule.upsert({
                    where: {
                        userProjectId_moduleKey: {
                            userProjectId: userProject.id,
                            moduleKey,
                        },
                    },
                    create: {
                        userProjectId: userProject.id,
                        moduleKey,
                    },
                    update: {},
                });
            }
        }
        console.log(`  Done: ${viewer.name} (${viewer.email}): ${projects.length} projects x ${ALL_MODULES.length} modules`);
    }

    console.log('Migration complete.');
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
