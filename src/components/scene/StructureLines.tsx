/**
 * StructureLines Component
 * @module components/scene/StructureLines
 * 
 * 斷層線渲染元件
 * Task: T041
 */

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useLayerStore } from '../../stores/layerStore';
import { twd97ToWorld } from '../../utils/coordinates';

// Mock 斷層線資料 (待 API 整合)
const MOCK_FAULT_LINES = [
    {
        id: 'fault-1',
        name: '主斷層 A',
        coordinates: [
            { x: 250000, y: 2600000, z: 0 },
            { x: 250500, y: 2600200, z: -50 },
            { x: 251000, y: 2600400, z: -100 },
            { x: 251500, y: 2600600, z: -150 },
        ],
    },
    {
        id: 'fault-2',
        name: '次要斷層 B',
        coordinates: [
            { x: 249500, y: 2600500, z: 0 },
            { x: 250000, y: 2600300, z: -30 },
            { x: 250500, y: 2600100, z: -60 },
        ],
    },
];

interface FaultLineData {
    id: string;
    name: string;
    coordinates: { x: number; y: number; z: number }[];
}

interface StructureLinesProps {
    faultLines?: FaultLineData[];
}

export function StructureLines({ faultLines = MOCK_FAULT_LINES }: StructureLinesProps) {
    const { layers } = useLayerStore();
    const faultsLayer = layers.faults;

    // 轉換座標為 Three.js 世界座標
    const convertedLines = useMemo(() => {
        return faultLines.map((fault) => ({
            ...fault,
            points: fault.coordinates.map((coord) => {
                const worldPos = twd97ToWorld(coord);
                return [worldPos.x, worldPos.z, worldPos.y] as [number, number, number];
            }),
        }));
    }, [faultLines]);

    if (!faultsLayer.visible) return null;

    return (
        <group>
            {convertedLines.map((fault) => (
                <Line
                    key={fault.id}
                    points={fault.points}
                    color="#ff4444"
                    lineWidth={3}
                    opacity={faultsLayer.opacity}
                    transparent={faultsLayer.opacity < 1}
                    dashed={false}
                />
            ))}
        </group>
    );
}

export default StructureLines;
