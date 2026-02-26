#!/usr/bin/env python3
"""
Water Level Processor (地下水位面處理器)
======================================
將 CSV/DAT/TXT (X, Y, WaterLevel) 資料插值為：
1. 高度圖 (Heightmap) - 16-bit PNG 格式

Usage:
    python water_level_processor.py --input data.csv --output-dir ./processed \\
        --source-type well --width 512 --method linear --bounds "minX,maxX,minY,maxY"
"""

import argparse
import json
import os
import sys
import numpy as np
from PIL import Image
from scipy.interpolate import griddata


def progress(pct: float, msg: str = ''):
    print(json.dumps({"progress": pct, "message": msg}), flush=True)


def read_data(input_path):
    """讀取 CSV/DAT/TXT 格式的 X, Y, Z 資料"""
    ext = os.path.splitext(input_path)[1].lower()

    # 嘗試多種分隔符
    data = None
    for sep in [',', '\t', r'\s+', ';']:
        try:
            import pandas as pd
            if sep == r'\s+':
                df = pd.read_csv(input_path, sep=sep, comment='#', engine='python')
            else:
                df = pd.read_csv(input_path, sep=sep, comment='#')

            # 至少要有 3 個數值欄位
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) >= 3:
                data = df
                break
        except Exception:
            continue

    if data is None:
        # Fallback: 嘗試純數值讀取 (無 header)
        try:
            raw = np.loadtxt(input_path, comments='#')
            if raw.ndim == 2 and raw.shape[1] >= 3:
                import pandas as pd
                data = pd.DataFrame(raw[:, :3], columns=['X', 'Y', 'Z'])
        except Exception:
            pass

    if data is None:
        raise ValueError(f'無法解析檔案: {input_path}')

    return data


def identify_columns(df):
    """自動識別 X, Y, 水位欄位"""
    cols_lower = {c: c.lower().strip() for c in df.columns}

    x_col = None
    y_col = None
    z_col = None

    for original, lower in cols_lower.items():
        if lower in ('x', 'easting', 'east', 'lon', 'longitude', 'twd97_x'):
            x_col = original
        elif lower in ('y', 'northing', 'north', 'lat', 'latitude', 'twd97_y'):
            y_col = original
        elif lower in ('z', 'head', 'waterlevel', 'water_level', 'elevation',
                        'level', 'h', 'wl', 'gw_level', 'gwl', 'elev', 'height',
                        'value', 'result'):
            z_col = original

    # Fallback: 用前三個數值欄位
    if x_col is None or y_col is None or z_col is None:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(numeric_cols) >= 3:
            if x_col is None:
                x_col = numeric_cols[0]
            if y_col is None:
                y_col = numeric_cols[1]
            if z_col is None:
                z_col = numeric_cols[2]

    if x_col is None or y_col is None or z_col is None:
        raise ValueError(f'無法識別 X/Y/水位欄位。欄位名: {list(df.columns)}')

    return x_col, y_col, z_col


def process_water_level(input_path, output_dir, source_type='well',
                        target_width=512, method='linear', bounds=None):
    """處理地下水位資料"""
    progress(5, f'讀取檔案: {os.path.basename(input_path)}')

    df = read_data(input_path)
    x_col, y_col, z_col = identify_columns(df)

    progress(15, f'識別欄位: X={x_col}, Y={y_col}, Z={z_col}')

    # 過濾 NaN
    df = df.dropna(subset=[x_col, y_col, z_col])

    points = df[[x_col, y_col]].values.astype(float)
    values = df[z_col].values.astype(float)

    point_count = len(points)
    progress(20, f'有效資料點: {point_count}')

    if point_count < 3:
        raise ValueError(f'資料點數不足 (至少需要 3 點，目前 {point_count} 點)')

    # 決定範圍
    data_min_x, data_max_x = points[:, 0].min(), points[:, 0].max()
    data_min_y, data_max_y = points[:, 1].min(), points[:, 1].max()

    if source_type == 'well' and bounds:
        # 水井模式: 使用使用者指定範圍
        min_x, max_x, min_y, max_y = bounds
        progress(25, f'使用使用者範圍: X=[{min_x:.1f}, {max_x:.1f}], Y=[{min_y:.1f}, {max_y:.1f}]')
    else:
        # 模擬結果: 使用資料涵蓋範圍 (加 5% padding)
        range_x = data_max_x - data_min_x
        range_y = data_max_y - data_min_y
        padding = 0.05
        min_x = data_min_x - range_x * padding
        max_x = data_max_x + range_x * padding
        min_y = data_min_y - range_y * padding
        max_y = data_max_y + range_y * padding
        progress(25, f'使用資料範圍 (+5% padding): X=[{min_x:.1f}, {max_x:.1f}], Y=[{min_y:.1f}, {max_y:.1f}]')

    # 計算長寬比與網格尺寸
    width = max_x - min_x
    height = max_y - min_y

    if width <= 0 or height <= 0:
        raise ValueError(f'範圍無效: width={width}, height={height}')

    ratio = height / width
    target_height = max(int(target_width * ratio), 2)

    grid_x, grid_y = np.mgrid[
        min_x:max_x:complex(target_width),
        min_y:max_y:complex(target_height)
    ]

    # 如果資料點數太少，fallback 到 nearest
    actual_method = method
    if point_count < 4 and method != 'nearest':
        actual_method = 'nearest'
        progress(30, f'資料點數不足 ({point_count})，改用 nearest 插值')

    progress(40, f'使用 {actual_method} 插值至 {target_width}x{target_height} 網格...')

    # 執行插值
    grid_z = griddata(points, values, (grid_x, grid_y), method=actual_method)

    # 填充 NaN (extrapolation 區域) 用 nearest
    if np.any(np.isnan(grid_z)):
        nan_count = np.sum(np.isnan(grid_z))
        progress(50, f'填充 {nan_count} 個外插點 (nearest)')
        grid_z_nearest = griddata(points, values, (grid_x, grid_y), method='nearest')
        grid_z = np.where(np.isnan(grid_z), grid_z_nearest, grid_z)

    # 轉置 + 翻轉 (同 terrain_processor)
    grid_z = grid_z.T
    grid_z = np.flipud(grid_z)

    min_z = float(np.nanmin(grid_z))
    max_z = float(np.nanmax(grid_z))

    progress(60, f'水位範圍: {min_z:.2f}m ~ {max_z:.2f}m')

    # 儲存 16-bit heightmap
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    heightmap_name = f'waterlevel_{base_name}.png'
    heightmap_path = os.path.join(output_dir, heightmap_name)

    save_heightmap(grid_z, heightmap_path)

    progress(90, '處理完成')

    result = {
        'heightmap': heightmap_name,
        'minX': float(min_x),
        'maxX': float(max_x),
        'minY': float(min_y),
        'maxY': float(max_y),
        'minZ': min_z,
        'maxZ': max_z,
        'width': target_width,
        'height': target_height,
        'pointCount': point_count
    }

    return result


def save_heightmap(data, output_path):
    """將浮點數高度資料儲存為 16-bit PNG"""
    z_min = np.nanmin(data)
    z_max = np.nanmax(data)
    z_range = z_max - z_min

    if z_range == 0:
        normalized = np.zeros_like(data, dtype=np.uint16)
    else:
        normalized = ((data - z_min) / z_range * 65535).astype(np.uint16)

    # NaN 填充為 0
    normalized = np.nan_to_num(normalized, nan=0).astype(np.uint16)

    img = Image.fromarray(normalized, mode='I;16')
    img.save(output_path)


def main():
    parser = argparse.ArgumentParser(description='Water Level Processor')
    parser.add_argument('--input', required=True, help='輸入檔案路徑 (CSV/DAT/TXT)')
    parser.add_argument('--output-dir', required=True, help='輸出目錄')
    parser.add_argument('--source-type', default='well', choices=['well', 'simulation'],
                        help='資料來源類型')
    parser.add_argument('--width', type=int, default=512, help='目標網格寬度 (px)')
    parser.add_argument('--method', default='linear', choices=['linear', 'nearest', 'cubic'],
                        help='插值方法')
    parser.add_argument('--bounds', default=None,
                        help='使用者指定範圍 (僅 well 模式): "minX,maxX,minY,maxY"')

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(json.dumps({"error": f"檔案不存在: {args.input}"}))
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    # 解析 bounds
    bounds = None
    if args.bounds:
        try:
            parts = [float(x.strip()) for x in args.bounds.split(',')]
            if len(parts) == 4:
                bounds = parts
            else:
                print(json.dumps({"error": "bounds 格式錯誤，需要 4 個值: minX,maxX,minY,maxY"}))
                sys.exit(1)
        except ValueError:
            print(json.dumps({"error": "bounds 數值解析錯誤"}))
            sys.exit(1)

    try:
        result = process_water_level(
            input_path=args.input,
            output_dir=args.output_dir,
            source_type=args.source_type,
            target_width=args.width,
            method=args.method,
            bounds=bounds
        )

        progress(100, '完成')
        print(json.dumps({"result": result}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
