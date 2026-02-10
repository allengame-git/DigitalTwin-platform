const fs = require('fs');
const path = require('path');

// 設定專案中心點 (根據 NextSteps.md)
const centerX = 224500;
const centerY = 2429500;
const range = 500; // 500m 範圍

const types = ['斷層', '層面', '葉理', '節理面', '劈理'];
const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function generateRow(index) {
    const x = (centerX + (Math.random() - 0.5) * range * 2).toFixed(2);
    const y = (centerY + (Math.random() - 0.5) * range * 2).toFixed(2);
    const z = (Math.random() * 200 - 50).toFixed(2); // -50m to 150m
    const strike = (Math.random() * 360).toFixed(1);
    const dip = (Math.random() * 90).toFixed(1);
    const dipDirection = directions[Math.floor(Math.random() * directions.length)];
    const type = types[Math.floor(Math.random() * types.length)];

    return `${x},${y},${z},${strike},${dip},${dipDirection},${type}-${index}`;
}

const header = 'x,y,z,strike,dip,dipDirection,description';
const rows = [header];

for (let i = 1; i <= 100; i++) {
    rows.push(generateRow(i));
}

const csvContent = rows.join('\n');
const filePath = path.join(__dirname, 'attitudes_mock_v2_100.csv');

fs.writeFileSync(filePath, csvContent);
console.log(`Successfully generated 100 attitude records to ${filePath}`);
