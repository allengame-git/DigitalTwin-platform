import os
import trimesh
import numpy as np

# Define base colors (RGBA) matching the reference image
COLOR_TRUNK = [70, 45, 25, 255]       # Dark brown
COLOR_PINE = [110, 180, 50, 255]      # Bright vibrant green
COLOR_OAK = [65, 125, 45, 255]        # Darker forest green
COLOR_DIAMOND = [140, 220, 60, 255]   # Very bright lime green
COLOR_CUBIC = [80, 150, 50, 255]      # Medium green

out_dir = "/Users/allen/Desktop/LLRWD DigitalTwin Platform/server/uploads"
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

def make_low_poly(mesh, color):
    """
    Crucial step for Low-Poly style:
    Unmerge vertices so each triangle has its own unique vertices.
    This prevents normal interpolation and forces Flat Shading!
    """
    mesh.unmerge_vertices()
    mesh.visual.face_colors = color
    return mesh

def create_trunk(radius=0.1, height=0.6, sections=6):
    trunk = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    R_y_up = trimesh.transformations.rotation_matrix(-np.pi/2, [1, 0, 0])
    trunk.apply_transform(R_y_up)
    trunk.apply_translation([0, height/2, 0])
    return make_low_poly(trunk, COLOR_TRUNK)

def create_tree_pine():
    # Model: 3 stacked cones (6-sided)
    trunk = create_trunk(radius=0.15, height=0.5, sections=6)
    
    meshes = [trunk]
    # Bottom, Middle, Top tiers
    radii = [0.8, 0.6, 0.4]
    heights = [1.0, 0.9, 0.8]
    y_offsets = [0.3, 0.9, 1.5]
    
    for r, h, y in zip(radii, heights, y_offsets):
        cone = trimesh.creation.cone(radius=r, height=h, sections=6)
        R_y_up = trimesh.transformations.rotation_matrix(-np.pi/2, [1, 0, 0])
        cone.apply_transform(R_y_up)
        cone.apply_translation([0, y + h/2, 0])
        meshes.append(make_low_poly(cone, COLOR_PINE))
        
    # Scale up to ~8m tall (currently ~2.3m)
    for m in meshes:
        m.apply_scale(3.5)
        
    scene = trimesh.Scene(meshes)
    out_path = os.path.join(out_dir, "tree_pine.glb")
    scene.export(out_path, file_type='glb')
    print(f"Generated: {out_path}")

def create_tree_oak():
    # Model: Standard icosphere (subdivisions=1), very angular
    trunk = create_trunk(radius=0.18, height=0.8, sections=6)
    
    canopy = trimesh.creation.icosphere(subdivisions=1, radius=1.0)
    # Slightly squash it vertically to match the round trees in the image
    canopy.apply_scale([1.1, 0.95, 1.1])
    canopy.apply_translation([0, 1.5, 0])
    canopy = make_low_poly(canopy, COLOR_OAK)
    
    meshes = [trunk, canopy]
    # Scale up to ~7.5m tall (currently ~2.5m)
    for m in meshes:
        m.apply_scale(3.0)
        
    scene = trimesh.Scene(meshes)
    out_path = os.path.join(out_dir, "tree_oak.glb")
    scene.export(out_path, file_type='glb')
    print(f"Generated: {out_path}")

def create_tree_diamond():
    # Model: Icosahedron (subdivisions=0), stretched vertically
    trunk = create_trunk(radius=0.08, height=0.5, sections=5)
    
    canopy = trimesh.creation.icosphere(subdivisions=0, radius=0.45)
    canopy.apply_scale([0.85, 1.4, 0.85]) # Stretched vertically for diamond look
    canopy.apply_translation([0, 0.9, 0])
    canopy = make_low_poly(canopy, COLOR_DIAMOND)
    
    meshes = [trunk, canopy]
    # Scale up to ~6m tall (currently ~1.5m)
    for m in meshes:
        m.apply_scale(4.0)
        
    scene = trimesh.Scene(meshes)
    out_path = os.path.join(out_dir, "tree_diamond.glb")
    scene.export(out_path, file_type='glb')
    print(f"Generated: {out_path}")

def create_tree_cubic():
    # Model: Cubes (near building on the right)
    trunk = create_trunk(radius=0.15, height=0.7, sections=5)
    
    # We use a box with subdivisions to get a few more faces, then randomize slightly
    # Or simply a basic box, rotated
    canopy = trimesh.creation.box(extents=[1.0, 1.0, 1.0])
    
    R_y = trimesh.transformations.rotation_matrix(np.pi/4, [0, 1, 0])
    canopy.apply_transform(R_y)
    canopy.apply_translation([0, 1.1, 0])
    canopy = make_low_poly(canopy, COLOR_CUBIC)
    
    meshes = [trunk, canopy]
    # Scale up to ~6.5m tall (currently ~2.1m)
    for m in meshes:
        m.apply_scale(3.0)
        
    scene = trimesh.Scene(meshes)
    out_path = os.path.join(out_dir, "tree_cubic.glb")
    scene.export(out_path, file_type='glb')
    print(f"Generated: {out_path}")

def main():
    create_tree_pine()
    create_tree_oak()
    create_tree_diamond()
    create_tree_cubic()

if __name__ == "__main__":
    main()
