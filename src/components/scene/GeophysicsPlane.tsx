/**
 * GeophysicsPlane - 地球物理探查剖面圖 3D 渲染
 * @module components/scene/GeophysicsPlane
 * 
 * 將探查圖片以垂直平面形式放置在 3D 空間中
 * 位置由兩個端點座標 (x1,y1,z1) 與 (x2,y2,z2) 決定
 */

import React, { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useUploadStore, GeophysicsFile } from '../../stores/uploadStore';
import { useLayerStore } from '../../stores/layerStore';
import { twd97ToWorld } from '../../utils/coordinates';

interface GeophysicsPlaneItemProps {
    data: GeophysicsFile;
}

/**
 * 單一探查剖面
 */
function GeophysicsPlaneItem({ data }: GeophysicsPlaneItemProps) {
    const texture = useTexture(data.url);

    // 計算平面幾何參數
    const planeParams = useMemo(() => {
        // 判斷是否為 Local 座標 (若座標值小於 100,000，視為相對座標，直接使用)
        // 否則視為 TWD97，需轉換為世界座標
        const isLocal = Math.abs(data.x1) < 100000 && Math.abs(data.y1) < 100000;

        let p1, p2;

        if (isLocal) {
            // Local 座標直接對應 (由上傳資料定義: x=x, y=z(north), z=y(elev))
            // 注意：Three.js 座標系 y 為高程，z 為北距(負值)
            // 這裡假設使用者輸入的是平面 x,y (TWD97 東/北)，z 為高程
            p1 = new THREE.Vector3(data.x1, data.z1, -data.y1);
            p2 = new THREE.Vector3(data.x2, data.z2, -data.y2);
        } else {
            // TWD97 轉換
            const w1 = twd97ToWorld({ x: data.x1, y: data.y1, z: data.z1 });
            const w2 = twd97ToWorld({ x: data.x2, y: data.y2, z: data.z2 });
            p1 = new THREE.Vector3(w1.x, w1.y, w1.z);
            p2 = new THREE.Vector3(w2.x, w2.y, w2.z);
        }

        // 計算水平距離 (寬度)
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const width = Math.sqrt(dx * dx + dz * dz);

        // 計算深度 (高度)
        // 若有指定深度範圍，使用指定值；否則依圖片比例計算
        let height: number;
        if (data.depthTop != null && data.depthBottom != null) {
            height = Math.abs(data.depthBottom - data.depthTop);
        } else {
            // 依圖片比例換算: 假設圖片寬度代表水平距離
            const img = texture.image as HTMLImageElement;
            if (img && img.width && img.height) {
                const aspectRatio = img.height / img.width;
                height = width * aspectRatio;
            } else {
                height = width * 0.5; // 預設比例
            }
        }

        // 中心點位置
        const centerX = (p1.x + p2.x) / 2;
        const centerZ = (p1.z + p2.z) / 2;

        // Y 位置: 從地表 (z1/z2) 往下延伸
        const topY = Math.max(p1.y, p2.y);
        const centerY = topY - height / 2;

        // 計算旋轉角度 (繞 Y 軸)
        const rotation = Math.atan2(dz, dx);

        return {
            position: [centerX, centerY, centerZ] as [number, number, number],
            rotation: [0, -rotation, 0] as [number, number, number],
            size: [width, height] as [number, number],
        };
    }, [data, texture]);

    return (
        <mesh
            position={planeParams.position}
            rotation={planeParams.rotation}
        >
            <planeGeometry args={planeParams.size} />
            <meshBasicMaterial
                map={texture}
                side={THREE.DoubleSide}
                transparent
                depthWrite={false}
            />
        </mesh>
    );
}

/**
 * 地球物理探查剖面群組
 */
export function GeophysicsPlane() {
    const { geophysicsFiles, fetchGeophysicsFiles } = useUploadStore();
    const layers = useLayerStore(s => s.layers);
    const isVisible = layers.geophysics?.visible ?? true;

    // 初始載入
    React.useEffect(() => {
        if (geophysicsFiles.length === 0) {
            fetchGeophysicsFiles();
        }
    }, [fetchGeophysicsFiles, geophysicsFiles.length]);

    if (geophysicsFiles.length === 0) {
        return null;
    }

    return (
        <group name="geophysics-planes" visible={isVisible}>
            {geophysicsFiles.map(gf => (
                <React.Suspense key={gf.id} fallback={null}>
                    <GeophysicsPlaneItem data={gf} />
                </React.Suspense>
            ))}
        </group>
    );
}
