/**
 * 模組遷移腳本 — 為所有專案建立 Module 記錄，並遷移現有資料的 moduleId
 *
 * 用法: cd server && npx ts-node prisma/migrate-to-modules.ts
 *
 * 冪等安全：重複執行不會產生重複 Module 或覆蓋已設定的 moduleId。
 */

import prisma from '../lib/prisma';

const MODULE_DEFS = [
    { type: 'geology', name: '地質資料', sortOrder: 0 },
    { type: 'facility', name: '設施導覽', sortOrder: 1 },
    { type: 'engineering', name: '工程設計', sortOrder: 2 },
    { type: 'simulation', name: '模擬分析', sortOrder: 3 },
] as const;

// geology module 擁有的資料表
const GEOLOGY_TABLES = [
    'borehole',
    'geologyModel',
    'faultPlane',
    'attitude',
    'terrain',
    'waterLevel',
    'imagery',
    'geophysics',
    'projectLithology',
] as const;

// facility module 擁有的資料表
const FACILITY_TABLES = [
    'facilityScene',
] as const;

type GeologyTable = typeof GEOLOGY_TABLES[number];
type FacilityTable = typeof FACILITY_TABLES[number];

async function main() {
    console.log('=== Module Migration Start ===\n');

    // Step 1: 取得所有專案
    const projects = await prisma.project.findMany({ select: { id: true, name: true } });
    console.log(`找到 ${projects.length} 個專案\n`);

    if (projects.length === 0) {
        console.log('沒有專案，跳過遷移。');
        return;
    }

    // Step 2: 為每個專案建立 4 個 Module
    for (const project of projects) {
        console.log(`--- 專案: ${project.name} (${project.id}) ---`);

        for (const def of MODULE_DEFS) {
            const existing = await prisma.module.findFirst({
                where: { projectId: project.id, type: def.type },
            });

            if (existing) {
                console.log(`  [skip] ${def.type} 模組已存在 (${existing.id})`);
                continue;
            }

            const created = await prisma.module.create({
                data: {
                    projectId: project.id,
                    type: def.type,
                    name: def.name,
                    sortOrder: def.sortOrder,
                },
            });
            console.log(`  [created] ${def.type} 模組 → ${created.id}`);
        }
    }

    // Step 3: 遷移資料 — 設定 moduleId（僅處理 moduleId = null 的記錄）
    console.log('\n=== 遷移資料 moduleId ===\n');

    for (const project of projects) {
        // 取得該專案的所有 Module（以 type 為 key）
        const modules = await prisma.module.findMany({
            where: { projectId: project.id },
        });
        const moduleByType = new Map(modules.map(m => [m.type, m.id]));

        const geologyModuleId = moduleByType.get('geology');
        const facilityModuleId = moduleByType.get('facility');

        if (!geologyModuleId && !facilityModuleId) {
            console.log(`專案 ${project.name}: 無對應模組，跳過`);
            continue;
        }

        console.log(`專案: ${project.name}`);

        // Geology tables
        if (geologyModuleId) {
            for (const table of GEOLOGY_TABLES) {
                const count = await updateModuleId(table, project.id, geologyModuleId);
                if (count > 0) {
                    console.log(`  [geology] ${table}: ${count} 筆更新`);
                }
            }
        }

        // Facility tables
        if (facilityModuleId) {
            for (const table of FACILITY_TABLES) {
                const count = await updateModuleId(table, project.id, facilityModuleId);
                if (count > 0) {
                    console.log(`  [facility] ${table}: ${count} 筆更新`);
                }
            }
        }
    }

    // Step 4: 遷移 UserProjectModule — moduleKey → moduleId
    console.log('\n=== 遷移 UserProjectModule ===\n');

    const pendingAccess = await prisma.userProjectModule.findMany({
        where: { moduleId: null, moduleKey: { not: null } },
        include: { userProject: { select: { projectId: true } } },
    });

    console.log(`找到 ${pendingAccess.length} 筆待遷移的 UserProjectModule`);

    let accessUpdated = 0;
    let accessSkipped = 0;

    for (const record of pendingAccess) {
        const projectId = record.userProject.projectId;
        const moduleKey = record.moduleKey!;

        // moduleKey 可能是 type 本身（geology, facility, ...）
        const targetModule = await prisma.module.findFirst({
            where: { projectId, type: moduleKey },
        });

        if (targetModule) {
            await prisma.userProjectModule.update({
                where: { id: record.id },
                data: { moduleId: targetModule.id },
            });
            accessUpdated++;
        } else {
            console.log(`  [warn] 找不到 Module: project=${projectId}, moduleKey=${moduleKey}`);
            accessSkipped++;
        }
    }

    console.log(`  更新: ${accessUpdated}, 跳過: ${accessSkipped}`);

    console.log('\n=== Migration Complete ===');
}

/**
 * 對指定 Prisma model 更新 moduleId（僅 moduleId = null 且 projectId 匹配的記錄）
 * 回傳更新筆數。
 */
async function updateModuleId(
    table: GeologyTable | FacilityTable,
    projectId: string,
    moduleId: string,
): Promise<number> {
    // 使用 Prisma 的 updateMany — 型別安全地透過 delegate 呼叫
    // 所有目標 table 都有 projectId + moduleId 欄位
    const delegate = (prisma as any)[table] as {
        updateMany: (args: {
            where: { projectId: string; moduleId: null };
            data: { moduleId: string };
        }) => Promise<{ count: number }>;
    };

    const result = await delegate.updateMany({
        where: { projectId, moduleId: null },
        data: { moduleId },
    });

    return result.count;
}

main()
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await (prisma as any).$disconnect?.();
    });
