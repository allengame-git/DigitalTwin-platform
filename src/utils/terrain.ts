/**
 * Terrain Utilities
 * @module utils/terrain
 */

export function generateMockElevation(
    widthSegments: number,
    heightSegments: number,
    maxElevation: number
): Float32Array {
    const count = (widthSegments + 1) * (heightSegments + 1);
    const elevations = new Float32Array(count);

    for (let j = 0; j <= heightSegments; j++) {
        for (let i = 0; i <= widthSegments; i++) {
            const index = j * (widthSegments + 1) + i;
            // 簡單的正弦波組合模擬地形
            const x = i / widthSegments;
            const y = j / heightSegments;
            const elevation =
                Math.sin(x * Math.PI * 2) * Math.cos(y * Math.PI * 3) * maxElevation * 0.5 +
                Math.sin(x * Math.PI * 5 + y * Math.PI * 4) * maxElevation * 0.3 +
                Math.random() * maxElevation * 0.2;
            elevations[index] = Math.max(0, elevation);
        }
    }

    return elevations;
}
