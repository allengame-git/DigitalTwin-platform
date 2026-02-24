#!/usr/bin/env python3
"""
Geology Mesh Builder (Tecplot Only)
====================================
讀取 Tecplot .dat (FETetrahedron) → Marching Cubes 提取封閉 isosurface → 輸出 GLB

Pipeline:
1. 讀取 Header (VARIABLES, Nodes, Elements)
2. 讀取節點 (X, Y, Z, ID) + 四面體連接 (N1 N2 N3 N4)
3. 建構 PyVista UnstructuredGrid (VTK_TETRA)
4. 重採樣到規則網格 → 每個 lithology 建立 binary field → Marching Cubes
5. Taubin 平滑 + Decimate
6. 輸出 GLB（前端用 stencil cap 做剖面填色）

Usage:
    python3 geology_mesh_builder.py \
        --geology tecplot.dat \
        --output model.glb \
        --origin '{"x": 307000, "y": 2790000}' \
        --colors '{"1": [139,69,19], "2": [50,120,50]}' \
        --smooth 20 \
        --decimate 0.3 \
        --mc-resolution 100 \
        --preview
"""

import argparse
import json
import sys
import os
import re
import numpy as np

import pyvista as pv


# ---------- Progress Helper ----------
def progress(pct: float, msg: str = ''):
    """Output progress as JSON to stdout for Node.js to parse."""
    print(json.dumps({'progress': round(pct, 1), 'message': msg}), flush=True)


# =====================================================
# Tecplot FETetrahedron — 直接讀取完整網格
# =====================================================
def read_tecplot_mesh(path: str) -> pv.UnstructuredGrid:
    """
    Parse a Tecplot ASCII .dat file with FETetrahedron zone.
    Returns a PyVista UnstructuredGrid with point_data['lith_id'].
    """
    progress(3, f'Parsing Tecplot: {os.path.basename(path)}')

    # ---- 1. Parse Header ----
    header_lines = []
    with open(path, 'r') as f:
        for _ in range(50):
            line = f.readline()
            if not line:
                break
            header_lines.append(line)

    header = "".join(header_lines)

    # Parse VARIABLES (multi-line support)
    variables = []
    var_section = re.search(r'VARIABLES\s*=\s*(.*?)ZONE', header, re.DOTALL | re.IGNORECASE)
    if var_section:
        variables = [v.strip().strip('"') for v in re.findall(r'"([^"]+)"', var_section.group(1))]

    # Parse Nodes and Elements count
    node_match = re.search(r'Nodes\s*=\s*(\d+)', header, re.IGNORECASE)
    elem_match = re.search(r'Elements\s*=\s*(\d+)', header, re.IGNORECASE)
    if not node_match or not elem_match:
        raise ValueError("Could not find Nodes= or Elements= in Tecplot header")

    n_nodes = int(node_match.group(1))
    n_elems = int(elem_match.group(1))
    progress(5, f'Nodes={n_nodes}, Elements={n_elems}')

    # ---- 2. Find data start line ----
    data_start = 0
    with open(path, 'r') as f:
        for i, line in enumerate(f):
            stripped = line.strip()
            if stripped.startswith('DT=') or stripped.startswith('DT =('):
                data_start = i + 1
                break
            if 'DATAPACKING' in stripped.upper():
                continue

    if data_start == 0:
        with open(path, 'r') as f:
            for i, line in enumerate(f):
                stripped = line.strip()
                if i > 3 and stripped and re.match(r'^[\s]*[-+]?\d', stripped):
                    data_start = i
                    break

    progress(8, f'Data starts at line {data_start}')

    # ---- 3. Read node coordinates + ID ----
    progress(10, f'Reading {n_nodes} nodes...')
    all_data = np.loadtxt(path, skiprows=data_start, max_rows=n_nodes)
    
    n_cols = all_data.shape[1]
    points = all_data[:, :3]  # X, Y, Z
    
    # Find lith_id column
    lith_col = None
    for i, var in enumerate(variables):
        if var.upper() in ('ID', 'LITH', 'MATERIAL'):
            lith_col = i
            break
    
    if lith_col is not None and lith_col < n_cols:
        lith_ids = all_data[:, lith_col].astype(np.int32)
    elif n_cols >= 4:
        lith_ids = all_data[:, 3].astype(np.int32)
    else:
        lith_ids = np.ones(n_nodes, dtype=np.int32)

    progress(30, f'Nodes loaded. Lith IDs: {np.unique(lith_ids).tolist()}')

    # ---- 4. Read tetrahedral connectivity ----
    progress(35, f'Reading {n_elems} tetrahedra...')
    conn_start = data_start + n_nodes
    connectivity = np.loadtxt(path, skiprows=conn_start, max_rows=n_elems, dtype=np.int64)
    connectivity = connectivity - 1  # 1-based → 0-based
    
    progress(55, f'Connectivity loaded: {connectivity.shape}')

    # ---- 5. Build PyVista UnstructuredGrid ----
    progress(58, 'Building UnstructuredGrid...')
    n_cells = len(connectivity)
    cells = np.column_stack([
        np.full(n_cells, 4, dtype=np.int64),
        connectivity
    ]).ravel()
    
    cell_types = np.full(n_cells, 10, dtype=np.uint8)  # VTK_TETRA = 10
    grid = pv.UnstructuredGrid(cells, cell_types, points)
    grid.point_data['lith_id'] = lith_ids
    
    progress(60, f'UnstructuredGrid: {grid.n_points} points, {grid.n_cells} cells')
    return grid


# =====================================================
# Surface Contour Band Extraction (Tecplot-style)
# =====================================================
def extract_contoured_surface(
    grid: pv.UnstructuredGrid,
    decimate_ratio: float = 0.3,
) -> dict:
    """
    Tecplot 風格的 contour 渲染：
    1. extract_surface() → 完整實體外殼 (solid body)
    2. VTK BandedPolyDataContourFilter → 在表面三角形上沿 lith_id
       等值線精確切割，產生 sharp contour color bands
    3. 按 lith_id 分組 → per-lithology surface patches

    結果：每種岩性一個 surface patch，合起來構成完整實體外殼，
         岩性交界處有精確的 smooth boundary。
    """
    import vtk

    progress(40, 'Extracting outer surface (solid body)...')

    surface = grid.extract_surface()
    surface = surface.triangulate()

    progress(45, f'Outer surface: {surface.n_points} verts, {surface.n_cells} faces')

    # 準備 float lith_id 用於 contour
    lith_ids = surface.point_data['lith_id'].astype(np.float64)
    surface.point_data['lith_float'] = lith_ids
    unique_liths = sorted(set(int(x) for x in np.unique(lith_ids)))

    progress(48, f'Contouring {len(unique_liths)} lithologies on surface: {unique_liths}')

    # ---- VTK BandedPolyDataContourFilter ----
    # 在表面 mesh 上，沿著 lith_id 的等值線精確切割三角形
    # 每個被切割後的 sub-triangle 屬於單一 lith_id band
    # 這就是 Tecplot contour 的做法
    banded = vtk.vtkBandedPolyDataContourFilter()
    banded.SetInputData(surface)
    banded.SetInputArrayToProcess(
        0, 0, 0, vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS, 'lith_float'
    )

    # 在每對相鄰 lith_id 之間設定 contour boundary
    # 例如 liths [1,2,3,4,5] → boundaries at 0.5, 1.5, 2.5, 3.5, 4.5, 5.5
    n_values = len(unique_liths) + 1
    banded.GenerateValues(
        n_values,
        float(unique_liths[0]) - 0.5,
        float(unique_liths[-1]) + 0.5
    )
    banded.SetScalarModeToIndex()
    banded.SetClipping(False)
    banded.Update()

    banded_surface = pv.wrap(banded.GetOutput())

    progress(55, f'Banded surface: {banded_surface.n_points} verts, {banded_surface.n_cells} faces')

    # ---- 按 band index 分組 → per-lith patches ----
    band_scalars = banded_surface.cell_data.get('Scalars')
    if band_scalars is None:
        # Fallback: 用 point_data 的 lith_float 做 cell majority vote
        progress(55, 'WARNING: BandedContourFilter no band data, fallback to majority vote')
        banded_surface = banded_surface.cell_data_to_point_data() if 'lith_float' not in banded_surface.point_data else banded_surface
        cell_lith = np.round(banded_surface.point_data.get('lith_float', lith_ids)).astype(int)
        band_scalars = cell_lith

    meshes = {}
    total = len(unique_liths)
    for idx, lith in enumerate(unique_liths):
        pct = 55 + (idx / total) * 20  # 55% ~ 75%

        cell_ids = np.where(band_scalars == idx)[0]
        if len(cell_ids) == 0:
            progress(pct, f'  lith={lith}: no cells, skip')
            continue

        patch = banded_surface.extract_cells(cell_ids)
        patch = patch.extract_surface().triangulate()

        # Decimate large patches
        if decimate_ratio > 0 and patch.n_cells > 80000:
            try:
                target = max(0.1, 1.0 - decimate_ratio)
                before = patch.n_cells
                patch = patch.decimate(target)
                progress(pct, f'  lith={lith}: decimated {before} → {patch.n_cells}')
            except Exception:
                pass

        meshes[lith] = patch
        progress(pct, f'  lith={lith}: {patch.n_points} verts, {patch.n_cells} faces')

    progress(75, f'Surface contour extraction done: {len(meshes)} lithology patches')
    return meshes


# =====================================================
# Volume Texture Export — 3D lith_id for GPU shader cap
# =====================================================
def export_volume_texture(
    grid: pv.UnstructuredGrid,
    output_dir: str,
    origin_twd97: dict,
    spacing_m: float = 10.0,  # 改回 10 公尺一個採樣點 (避免 VRAM 不足)
):
    """
    將 lith_id 資料 resample 到規則 3D 網格 (含動態解析度計算)
    """
    bounds = grid.bounds
    xmin, xmax, ymin, ymax, zmin, zmax = bounds

    dx = xmax - xmin
    dy = ymax - ymin
    dz = zmax - zmin

    # 根據空間長度計算解析度，且確保每個方向至少有 40 點
    # 如果長度太短（例如只有 100m），解析度會被強迫拉高。
    nx = max(40, int(dx / spacing_m))
    ny = max(40, int(dy / spacing_m))
    nz = max(40, int(dz / spacing_m))

    progress(60, f'Building volume texture: dims={nx}x{ny}x{nz} (spacing~{spacing_m}m)')

    pad = spacing_m * 0.5 # 輕微填充避免邊緣裁剪
    regular = pv.ImageData(
        dimensions=(nx + 1, ny + 1, nz + 1),
        spacing=((dx + 2*pad)/nx, (dy + 2*pad)/ny, (dz + 2*pad)/nz),
        origin=(xmin - pad, ymin - pad, zmin - pad),
    )

    # Interpolate lith_id onto regular grid
    try:
        sampled = regular.sample(grid)
        lith_field = sampled.point_data.get('lith_id')
        if lith_field is None and 'lith_id' in sampled.cell_data:
            sampled = sampled.cell_data_to_point_data()
            lith_field = sampled.point_data.get('lith_id')
    except Exception:
        from scipy.spatial import cKDTree
        tree = cKDTree(grid.points)
        _, indices = tree.query(regular.points, k=1)
        lith_field = grid.point_data['lith_id'][indices]

    if lith_field is None:
        progress(65, 'WARNING: No lith_id found for volume texture')
        return None

    # Round to nearest integer lith_id
    volume_data = np.round(lith_field).astype(np.uint8)

    progress(70, f'Volume texture: {nx+1}x{ny+1}x{nz+1} = {len(volume_data)} voxels')

    # Save binary (raw uint8, XYZ order matching ImageData point ordering)
    bin_path = os.path.join(output_dir, 'volume.bin')
    volume_data.tofile(bin_path)

    # Compute world-space bounds (same transform as GLB export)
    ox = origin_twd97.get('x', 0)
    oy = origin_twd97.get('y', 0)

    # Regular grid bounds in original coords
    rx_min = xmin - pad
    rx_max = xmin - pad + (dx + 2*pad)
    ry_min = ymin - pad
    ry_max = ymin - pad + (dy + 2*pad)
    rz_min = zmin - pad
    rz_max = zmin - pad + (dz + 2*pad)

    # Transform to Three.js world coords (same as GLB export):
    # world.x = orig.x - ox
    # world.y = orig.z           (Z → Y)
    # world.z = -(orig.y - oy)   (-Y → Z)
    world_bounds = {
        'minX': float(rx_min - ox),
        'maxX': float(rx_max - ox),
        'minY': float(rz_min),        # orig Z → world Y
        'maxY': float(rz_max),
        'minZ': float(-(ry_max - oy)),  # -orig Y → world Z
        'maxZ': float(-(ry_min - oy)),
    }

    # 獲取唯一岩性 ID 清單
    unique_liths = sorted(np.unique(volume_data).tolist())

    meta = {
        'dims': [nx + 1, ny + 1, nz + 1],
        'boundsWorld': world_bounds,
        'lithIds': [int(x) for x in unique_liths if x != 0],
    }

    meta_path = os.path.join(output_dir, 'volume_meta.json')
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)

    progress(75, f'Volume texture saved: {bin_path} ({os.path.getsize(bin_path)//1024}KB)')
    
    # Return original TWD97 bounds for DB storage
    twd97_bounds = {
        'minX': float(xmin),
        'maxX': float(xmax),
        'minY': float(ymin),
        'maxY': float(ymax),
        'minZ': float(zmin),
        'maxZ': float(zmax),
    }
    return twd97_bounds


# =====================================================
# GLB Export (Per-Lithology Submeshes)
# =====================================================
def export_glb(lith_meshes: dict, output_path: str, origin_twd97: dict):
    """
    Export per-lithology isosurface meshes to a single GLB file.
    Each lithology is a separate submesh named 'lith_{id}'.
    Vertex colors R channel stores lith_id for frontend shader compatibility.
    """
    import trimesh

    progress(80, f'Building GLB ({len(lith_meshes)} lithology submeshes)...')

    scene = trimesh.Scene()
    ox = origin_twd97.get('x', 0)
    oy = origin_twd97.get('y', 0)

    def get_faces(surface):
        try:
            return surface.regular_faces
        except AttributeError:
            return surface.faces.reshape(-1, 4)[:, 1:]

    total_faces = 0
    for lith_id, surface in lith_meshes.items():
        verts = np.array(surface.points, dtype=np.float64)
        faces = get_faces(surface)

        if len(faces) == 0:
            continue

        # Coordinate transform: TWD97 → Three.js world
        world_verts = np.zeros_like(verts)
        world_verts[:, 0] = verts[:, 0] - ox       # X → X
        world_verts[:, 1] = verts[:, 2]             # Z → Y
        world_verts[:, 2] = -(verts[:, 1] - oy)    # -Y → Z

        mesh = trimesh.Trimesh(
            vertices=world_verts,
            faces=faces,
            process=True,
        )

        # Store lith_id in vertex_colors R channel (frontend shader reads this)
        v_colors = np.zeros((len(world_verts), 4), dtype=np.uint8)
        v_colors[:, 0] = np.clip(int(lith_id), 0, 255)
        v_colors[:, 3] = 255  # Full alpha
        mesh.visual.vertex_colors = v_colors

        scene.add_geometry(mesh, node_name=f'lith_{int(lith_id)}')
        total_faces += len(faces)
        progress(85, f'  lith_{int(lith_id)}: {len(faces)} faces')

    progress(95, f'Writing GLB... ({total_faces} total faces)')
    with open(output_path, 'wb') as f:
        f.write(scene.export(file_type='glb'))

    progress(100, 'Done')


# =====================================================
# Main
# =====================================================
def main():
    parser = argparse.ArgumentParser(description='Geology Mesh Builder')
    parser.add_argument('--geology', required=True, help='Path to Tecplot .dat file')
    parser.add_argument('--output', required=True, help='Output GLB path')
    parser.add_argument('--origin', required=True, help='TWD97 origin as JSON')
    parser.add_argument('--colors', default='{}', help='Lith colors as JSON')
    parser.add_argument('--smooth', type=int, default=20, help='Taubin smooth iterations')
    parser.add_argument('--decimate', type=float, default=0.3, help='Decimate ratio')
    parser.add_argument('--volume-resolution', type=int, default=100, help='Volume texture resolution')
    parser.add_argument('--preview', action='store_true', help='Preview')

    args = parser.parse_args()

    if not args.preview:
        os.environ['PYVISTA_OFF_SCREEN'] = 'true'

    origin = json.loads(args.origin)
    colors = json.loads(args.colors)

    progress(0, 'Starting...')

    # 1. Read Tecplot Mesh
    grid = read_tecplot_mesh(args.geology)

    # 2. Surface Contour Band Extraction (Tecplot-style)
    lith_meshes = extract_contoured_surface(
        grid,
        decimate_ratio=args.decimate,
    )

    # 3. Volume Texture — 3D lith_id for GPU shader cap
    output_dir = os.path.dirname(args.output)
    world_bounds = export_volume_texture(
        grid, output_dir, origin,
        spacing_m=10.0,
    )

    # 4. Export GLB (per-lithology submeshes)
    export_glb(lith_meshes, args.output, origin)

    print(json.dumps({
        'status': 'completed',
        'output': args.output,
        'bounds': world_bounds,
        'lithologies': len(lith_meshes),
    }), flush=True)


if __name__ == '__main__':
    import traceback
    try:
        main()
    except Exception as e:
        tb = traceback.format_exc()
        print(json.dumps({
            'status': 'error',
            'error': str(e),
            'traceback': tb,
        }), flush=True)
        sys.exit(1)
