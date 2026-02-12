#!/usr/bin/env python3
"""
Terrain Grid Processor (地形網格處理器)
=====================================
將 GeoTIFF 或 CSV (X, Y, Z) DEM 資料轉換為：
1. 高度圖 (Heightmap) - 16-bit PNG 格式
2. 元數據 (Metadata) - 邊界範圍、最大最小高程
3. 紋理圖 (Texture) - 山影圖 (Hillshade, 選項)

使用方式:
    python3 terrain_processor.py --input raw_dem.tif --output-dir ./processed --width 2048
    python3 terrain_processor.py --input points.csv --output-dir ./processed --width 2048 --method linear
"""

import argparse
import json
import os
import sys
import numpy as np
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from PIL import Image
import pandas as pd
from scipy.interpolate import griddata

def progress(pct: float, msg: str = ''):
    print(json.dumps({'progress': round(pct, 1), 'message': msg}), flush=True)

def process_geotiff(input_path, target_width=2048):
    progress(10, f'讀取 GeoTIFF: {os.path.basename(input_path)}')
    
    with rasterio.open(input_path) as src:
        # 計算目標尺寸，保持長寬比
        ratio = src.height / src.width
        target_height = int(target_width * ratio)
        
        # 讀取並重新採樣 (Resample)
        progress(20, f'重新採樣至 {target_width}x{target_height}...')
        data = src.read(
            1,
            out_shape=(target_height, target_width),
            resampling=Resampling.bilinear
        )
        
        # Mask nodata
        if src.nodata is not None:
            data = np.where(data == src.nodata, np.nan, data)
            
        bounds = src.bounds
        return data, {
            'minX': bounds.left,
            'maxX': bounds.right,
            'minY': bounds.bottom,
            'maxY': bounds.top
        }

def process_csv(input_path, target_width=2048, method='linear'):
    progress(10, f'讀取 CSV: {os.path.basename(input_path)}')
    
    # 讀取 CSV (預期包含 X, Y, Z 欄位)
    df = pd.read_csv(input_path)
    
    # 嘗試自動識別欄位名稱 (不分大小寫)
    cols = [c.lower() for c in df.columns]
    
    x_idx = next((i for i, c in enumerate(cols) if 'x' in c or 'easting' in c), 0)
    y_idx = next((i for i, c in enumerate(cols) if 'y' in c or 'northing' in c), 1)
    z_idx = next((i for i, c in enumerate(cols) if 'z' in c or 'elevation' in c or 'height' in c), 2)
    
    x_col = df.columns[x_idx]
    y_col = df.columns[y_idx]
    z_col = df.columns[z_idx]
    
    progress(15, f'識別欄位: X={x_col}, Y={y_col}, Z={z_col}')
    
    points = df[[x_col, y_col]].values
    values = df[z_col].values
    
    min_x, max_x = points[:, 0].min(), points[:, 0].max()
    min_y, max_y = points[:, 1].min(), points[:, 1].max()
    
    # 計算長寬比與網格尺寸
    width = max_x - min_x
    height = max_y - min_y
    ratio = height / width
    
    target_height = int(target_width * ratio)
    
    grid_x, grid_y = np.mgrid[
        min_x:max_x:complex(target_width),
        min_y:max_y:complex(target_height)
    ]
    
    progress(30, f'將 {len(points)} 個點插值至 {target_width}x{target_height} 網格...')
    
    # 執行插值 (Interpolation)
    grid_z = griddata(points, values, (grid_x, grid_y), method=method)
    
    # 翻轉 Y 軸 (影像座標系 vs 地圖座標系)
    # 地圖: Y 向上增加, 影像: Y 向下增加 (0,0 在左上角)
    # np.mgrid 產生的 Y 是遞增的，griddata 輸出的順序與 meshgrid 一致。
    # 我們需要轉置 (Transpose) 以符合 (height, width) 的影像形狀
    grid_z = grid_z.T
    
    # 上下翻轉，因為影像原點在左上，而地圖 min_y 在下方
    grid_z = np.flipud(grid_z)
    
    return grid_z, {
        'minX': min_x,
        'maxX': max_x,
        'minY': min_y, # bottom
        'maxY': max_y  # top
    }

def save_heightmap(data, output_path):
    progress(60, '生成高度圖 (Heightmap)...')
    
    # 填補無效值 (NaN)
    valid_mask = ~np.isnan(data)
    if not valid_mask.any():
        raise ValueError("未發現有效的高程數據")
        
    min_z = np.nanmin(data)
    max_z = np.nanmax(data)
    
    # Simple IDW or Nearest fill for NaNs (simple implementation: fill with min or meam)
    # For now, fill with min_z to avoid spikes
    data = np.nan_to_num(data, nan=min_z)
    
    # Normalize to 0-65535 (16-bit)
    if max_z > min_z:
        normalized = ((data - min_z) / (max_z - min_z) * 65535).astype(np.uint16)
    else:
        normalized = np.zeros_like(data, dtype=np.uint16)
        
    img = Image.fromarray(normalized, mode='I;16')
    img.save(output_path)
    
    return min_z, max_z, img.width, img.height

def generate_hillshade(data, output_path, az=315, alt=45):
    progress(80, 'Generating hillshade texture...')
    
    # Simple hillshade algorithm
    # Gradient
    grad_y, grad_x = np.gradient(data)
    slope = np.pi/2. - np.arctan(np.sqrt(grad_x*grad_x + grad_y*grad_y))
    aspect = np.arctan2(-grad_x, grad_y)
    
    az_rad = az * np.pi / 180.
    alt_rad = alt * np.pi / 180.
    
    shaded = np.sin(alt_rad) * np.sin(slope) + \
             np.cos(alt_rad) * np.cos(slope) * \
             np.cos(az_rad - aspect)
             
    shaded = (255 * (shaded + 1) / 2).astype(np.uint8)
    
    img = Image.fromarray(shaded, mode='L')
    img.save(output_path)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--width', type=int, default=2048)
    parser.add_argument('--method', default='linear', choices=['linear', 'nearest', 'cubic'])
    
    args = parser.parse_args()
    
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
        
    ext = os.path.splitext(args.input)[1].lower()
    
    try:
        if ext in ['.tif', '.tiff']:
            data, bounds = process_geotiff(args.input, args.width)
        elif ext == '.csv':
            data, bounds = process_csv(args.input, args.width, args.method)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
            
        # Save Heightmap
        heightmap_name = f"heightmap_{os.path.basename(args.input)}.png"
        heightmap_path = os.path.join(args.output_dir, heightmap_name)
        min_z, max_z, w, h = save_heightmap(data, heightmap_path)
        
        # Save Hillshade Texture
        texture_name = f"texture_{os.path.basename(args.input)}.png"
        texture_path = os.path.join(args.output_dir, texture_name)
        generate_hillshade(data, texture_path)
        
        result = {
            'status': 'completed',
            'meta': {
                **bounds,
                'minZ': float(min_z),
                'maxZ': float(max_z),
                'width': w,
                'height': h,
                'heightmap': heightmap_name,
                'texture': texture_name
            }
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        import traceback
        print(json.dumps({
            'status': 'error',
            'error': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
