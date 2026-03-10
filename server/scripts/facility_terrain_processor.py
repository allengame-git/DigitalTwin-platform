#!/usr/bin/env python3
"""
facility_terrain_processor.py
CSV (x, y, elevation) -> heightmap PNG + hillshade + satellite texture (JPEG)
"""

import argparse
import json
import sys
import os
import numpy as np
from scipy.interpolate import griddata
from PIL import Image


def log_progress(progress: int, message: str):
    print(json.dumps({"progress": progress, "message": message}), flush=True)


def process_terrain(input_path: str, output_dir: str, satellite_path: str = None):
    log_progress(10, "讀取 CSV 資料...")

    # Try comma delimiter first, then whitespace
    try:
        data = np.genfromtxt(input_path, delimiter=',', skip_header=1)
    except Exception:
        data = np.genfromtxt(input_path, skip_header=1)

    if data.ndim == 1:
        data = data.reshape(1, -1)

    if data.shape[1] < 3:
        raise ValueError("CSV 必須至少包含 x, y, elevation 三欄")

    x = data[:, 0].astype(float)
    y = data[:, 1].astype(float)
    z = data[:, 2].astype(float)

    # Remove NaN rows
    valid = ~(np.isnan(x) | np.isnan(y) | np.isnan(z))
    x, y, z = x[valid], y[valid], z[valid]

    if len(x) < 3:
        raise ValueError("有效資料點不足 3 個，無法進行插值")

    min_x, max_x = float(x.min()), float(x.max())
    min_y, max_y = float(y.min()), float(y.max())
    min_z, max_z = float(z.min()), float(z.max())

    log_progress(30, f"資料範圍: X[{min_x:.1f}, {max_x:.1f}] Y[{min_y:.1f}, {max_y:.1f}] Z[{min_z:.1f}, {max_z:.1f}], 共 {len(x)} 點")

    resolution = 512

    # 若某軸範圍為零（所有點共線），擴展一個小範圍避免退化
    x_range = max_x - min_x
    y_range = max_y - min_y
    if x_range < 1e-6:
        pad = max(y_range * 0.01, 1.0)
        min_x -= pad
        max_x += pad
    if y_range < 1e-6:
        pad = max(x_range * 0.01, 1.0)
        min_y -= pad
        max_y += pad

    xi = np.linspace(min_x, max_x, resolution)
    yi = np.linspace(min_y, max_y, resolution)
    xi_grid, yi_grid = np.meshgrid(xi, yi)

    log_progress(50, "插值處理中...")

    try:
        zi_grid = griddata(
            (x, y), z,
            (xi_grid, yi_grid),
            method='linear',
            fill_value=min_z
        )
        # linear 可能全部 NaN（共線），fallback
        if np.all(np.isnan(zi_grid)):
            raise ValueError("linear interpolation produced all NaN")
    except Exception:
        # Delaunay 失敗（共線等）→ fallback 到 nearest
        zi_grid = griddata(
            (x, y), z,
            (xi_grid, yi_grid),
            method='nearest',
            fill_value=min_z
        )

    log_progress(70, "產生 heightmap...")

    z_range = max_z - min_z
    if z_range < 1e-6:
        z_range = 1.0

    zi_normalized = ((zi_grid - min_z) / z_range * 65535).astype(np.uint16)
    zi_normalized = np.flipud(zi_normalized)  # flip Y axis for image coords

    heightmap_filename = 'heightmap.png'
    img = Image.fromarray(zi_normalized, mode='I;16')
    img.save(os.path.join(output_dir, heightmap_filename))

    log_progress(85, "產生山影圖...")

    # Hillshade as default texture
    zi_float = np.flipud(zi_grid).astype(float)
    dx_m = (max_x - min_x) / resolution if (max_x - min_x) > 0 else 1.0
    dy_m = (max_y - min_y) / resolution if (max_y - min_y) > 0 else 1.0
    grad_y_dir, grad_x_dir = np.gradient(zi_float, dy_m, dx_m)

    azimuth = np.radians(315)
    altitude = np.radians(45)
    slope = np.sqrt(grad_x_dir**2 + grad_y_dir**2)
    aspect = np.arctan2(-grad_x_dir, grad_y_dir)

    hillshade = (
        np.cos(altitude) * np.cos(np.arctan(slope)) +
        np.sin(altitude) * np.sin(np.arctan(slope)) * np.cos(azimuth - aspect)
    )
    hillshade = np.clip(hillshade * 255, 0, 255).astype(np.uint8)

    texture_filename = 'texture.png'
    Image.fromarray(hillshade, mode='L').convert('RGB').save(
        os.path.join(output_dir, texture_filename)
    )

    # Handle satellite image — reproject + resample 對齊 DEM，輸出 JPEG
    satellite_filename = None
    if satellite_path and os.path.exists(satellite_path):
        log_progress(88, "處理衛星影像...")
        satellite_filename = 'satellite.jpg'
        sat_output = os.path.join(output_dir, satellite_filename)

        try:
            import rasterio
            from rasterio.warp import reproject, calculate_default_transform, Resampling

            target_w, target_h = resolution, resolution
            MAX_TEX = 4096
            if target_w > MAX_TEX:
                scale = MAX_TEX / target_w
                target_w = MAX_TEX
                target_h = int(target_h * scale)
            if target_h > MAX_TEX:
                scale = MAX_TEX / target_h
                target_h = MAX_TEX
                target_w = int(target_w * scale)

            dem_crs = rasterio.crs.CRS.from_epsg(3826)  # TWD97

            with rasterio.open(satellite_path) as src:
                dst_transform, _, _ = calculate_default_transform(
                    src.crs, dem_crs,
                    target_w, target_h,
                    left=min_x, bottom=min_y,
                    right=max_x, top=max_y
                )

                band_count = min(src.count, 3)
                log_progress(90, f"Reprojecting {band_count} bands to {target_w}x{target_h}...")

                bands = []
                for i in range(1, band_count + 1):
                    dst_data = np.zeros((target_h, target_w), dtype=np.uint8)
                    src_data = src.read(i)

                    if src_data.dtype != np.uint8:
                        valid = src_data[src_data != src.nodata] if src.nodata is not None else src_data
                        if len(valid) > 0:
                            p2, p98 = np.percentile(valid, [2, 98])
                            if p98 - p2 > 0:
                                src_data = np.clip((src_data - p2) / (p98 - p2) * 255, 0, 255).astype(np.uint8)
                            else:
                                src_data = np.zeros_like(src_data, dtype=np.uint8)
                        else:
                            src_data = np.zeros_like(src_data, dtype=np.uint8)

                    reproject(
                        source=src_data,
                        destination=dst_data,
                        src_transform=src.transform,
                        src_crs=src.crs,
                        dst_transform=dst_transform,
                        dst_crs=dem_crs,
                        resampling=Resampling.bilinear
                    )
                    bands.append(dst_data)

                if band_count == 1:
                    rgb = np.stack([bands[0], bands[0], bands[0]], axis=-1)
                elif band_count == 2:
                    rgb = np.stack([bands[0], bands[1], bands[0]], axis=-1)
                else:
                    rgb = np.stack(bands, axis=-1)

                log_progress(94, "儲存衛星影像紋理 (JPEG)...")
                Image.fromarray(rgb, mode='RGB').save(sat_output, 'JPEG', quality=90)
                log_progress(96, f"衛星影像處理完成: {target_w}x{target_h}")

        except ImportError:
            # rasterio 未安裝 → fallback：若是一般圖片直接轉 JPEG
            log_progress(92, "rasterio 未安裝，嘗試直接轉換...")
            try:
                img_sat = Image.open(satellite_path).convert('RGB')
                img_sat.save(sat_output, 'JPEG', quality=90)
            except Exception as e2:
                log_progress(95, f"衛星影像轉換失敗: {e2}")
                satellite_filename = None

    log_progress(100, "完成")

    result = {
        "status": "completed",
        "meta": {
            "heightmap": heightmap_filename,
            "texture": texture_filename,
            "satellite": satellite_filename,
            "minX": min_x, "maxX": max_x,
            "minY": min_y, "maxY": max_y,
            "minZ": min_z, "maxZ": max_z,
            "width": resolution,
            "height": resolution,
            "pointCount": int(len(x)),
        }
    }
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Facility terrain CSV processor')
    parser.add_argument('--input', required=True, help='Input CSV file path')
    parser.add_argument('--output-dir', required=True, help='Output directory')
    parser.add_argument('--satellite', default=None, help='Optional satellite image path')
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    try:
        process_terrain(args.input, args.output_dir, args.satellite)
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}), flush=True)
        sys.exit(1)
