import os
import trimesh
import numpy as np
import math

try:
    import shapely.geometry as sg
except ImportError:
    os.system("pip3 install shapely")
    import shapely.geometry as sg

def create_radiation_symbol(radius=0.15, thickness=0.02):
    meshes = []
    # Center dot
    dot = trimesh.creation.cylinder(radius=radius * 0.2, height=thickness)
    meshes.append(dot)
    
    # 3 Leaves
    angle_span = math.radians(60)
    segments = 12
    
    inner_r = radius * 0.3
    outer_r = radius
    
    for i in range(3):
        # 0, 120, 240 degrees. We offset by -90 so the first points down.
        base_angle = math.radians(i * 120 - 90)
        
        verts_2d = []
        for j in range(segments + 1):
            a = base_angle - angle_span/2 + angle_span * j / segments
            verts_2d.append((inner_r * math.cos(a), inner_r * math.sin(a)))
        for j in range(segments, -1, -1):
            a = base_angle - angle_span/2 + angle_span * j / segments
            verts_2d.append((outer_r * math.cos(a), outer_r * math.sin(a)))
            
        poly = sg.Polygon(verts_2d)
        leaf = trimesh.creation.extrude_polygon(poly, height=thickness)
        leaf.apply_translation([0, 0, -thickness/2])
        meshes.append(leaf)
        
    symbol = trimesh.util.concatenate(meshes)
    symbol.visual.face_colors = [120, 20, 40, 255] # Maroon / Dark Red
    return symbol

def create_drum(position):
    radius = 0.3 # 0.6m diameter
    height = 0.9 # 0.9m height
    color_yellow = [240, 180, 10, 255]
    color_gray = [100, 100, 100, 255]
    
    # Main body
    body = trimesh.creation.cylinder(radius=radius, height=height)
    body.visual.face_colors = color_yellow
    
    # Ribs (2 horizontal rings)
    rib1 = trimesh.creation.cylinder(radius=radius + 0.015, height=0.04)
    rib1.apply_translation([0, 0, height/6])
    rib1.visual.face_colors = color_yellow
    
    rib2 = trimesh.creation.cylinder(radius=radius + 0.015, height=0.04)
    rib2.apply_translation([0, 0, -height/6])
    rib2.visual.face_colors = color_yellow
    
    # Top and bottom rims
    rim_top = trimesh.creation.cylinder(radius=radius + 0.02, height=0.03)
    rim_top.apply_translation([0, 0, height/2])
    rim_top.visual.face_colors = color_yellow
    
    rim_bottom = trimesh.creation.cylinder(radius=radius + 0.02, height=0.03)
    rim_bottom.apply_translation([0, 0, -height/2])
    rim_bottom.visual.face_colors = color_yellow
    
    # Cap lock ring detail (gray detail near top rim)
    # The lock ring is tangent to the top rim.
    a = np.radians(-45)
    lock_ring = trimesh.creation.cylinder(radius=0.03, height=0.1)
    # Cylinder default along Z. Rotate around X by 90 to lay flat (along Y).
    R_flat = trimesh.transformations.rotation_matrix(np.pi/2, [1, 0, 0])
    lock_ring.apply_transform(R_flat)
    # Rotate around Z by angle 'a' to tangent
    R_tangent = trimesh.transformations.rotation_matrix(a, [0, 0, 1])
    lock_ring.apply_transform(R_tangent)
    # Translate to position
    lock_ring.apply_translation([radius * np.cos(a), radius * np.sin(a), height/2 + 0.01])
    lock_ring.visual.face_colors = color_gray
    
    # Radiation symbol
    symbol = create_radiation_symbol(radius=0.15, thickness=0.01)
    
    # Rotate +Z to point to -Y (front of drum)
    R_sym = trimesh.transformations.rotation_matrix(np.pi/2, [1, 0, 0])
    symbol.apply_transform(R_sym)
    
    # Place on front surface
    symbol.apply_translation([0, -radius - 0.005, 0])
    
    # Combine parts
    drum_parts = [body, rib1, rib2, rim_top, rim_bottom, lock_ring, symbol]
    
    # Transform to Y-up
    R_y_up = trimesh.transformations.rotation_matrix(-np.pi/2, [1, 0, 0])
    for mesh in drum_parts:
        mesh.apply_transform(R_y_up)
        # Move up so bottom is at y=0 instead of y=-height/2
        mesh.apply_translation([0, height/2, 0])
        # Apply group position
        mesh.apply_translation(position)
        
    return drum_parts

def main():
    spacing_x = 0.65 # slightly larger than 0.6m diameter
    spacing_z = 0.65
    
    # 2x2 arrangement centered (Y is up, so lay them out on XZ plane)
    positions = [
        [-spacing_x/2, 0, -spacing_z/2],
        [spacing_x/2,  0, -spacing_z/2],
        [-spacing_x/2, 0,  spacing_z/2],
        [spacing_x/2,  0,  spacing_z/2],
    ]
    
    all_meshes = []
    for pos in positions:
        all_meshes.extend(create_drum(pos))
        
    scene = trimesh.Scene(all_meshes)
    
    out_dir = "/Users/allen/Desktop/LLRWD DigitalTwin Platform/server/uploads"
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    out_path = os.path.join(out_dir, "radioactive_drums.glb")
    scene.export(out_path, file_type='glb')
    print(f"GLB generated: {out_path}")

if __name__ == "__main__":
    main()
