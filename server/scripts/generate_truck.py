import os
import trimesh
import numpy as np

def create_wheel(position):
    # Create black tire
    wheel = trimesh.creation.cylinder(radius=0.5, height=0.4)
    # Cylinder is along Z by default, rotate it along X axis
    R = trimesh.transformations.rotation_matrix(np.pi/2, [0, 1, 0])
    wheel.apply_transform(R)
    wheel.apply_translation(position)
    wheel.visual.face_colors = [30, 30, 30, 255] # Black tire
    
    # Create white rim
    rim = trimesh.creation.cylinder(radius=0.25, height=0.42)
    rim.apply_transform(R)
    rim.apply_translation(position)
    rim.visual.face_colors = [255, 255, 255, 255] # White rim
    
    return [wheel, rim]

def generate_truck():
    # Colors
    color_blue = [30, 100, 220, 255]
    color_gray = [150, 150, 150, 255]
    color_dark_gray = [100, 100, 100, 255]
    color_glass = [180, 220, 255, 200]
    color_light = [255, 255, 200, 255]
    color_grille = [40, 40, 40, 255]
    color_door = [25, 90, 200, 255]

    # 1. Cabin (Blue main body)
    cabin = trimesh.creation.box(extents=[2, 2.5, 3])
    cabin.apply_translation([0, 1.75, 4])
    cabin.visual.face_colors = color_blue

    # 2. Cabin Nose
    nose = trimesh.creation.box(extents=[2, 1.5, 2])
    nose.apply_translation([0, 1.25, 6.5])
    nose.visual.face_colors = color_blue
    
    # --- Detail Parts for Cabin ---
    detail_meshes = []
    
    # Windshield (Glass)
    windshield = trimesh.creation.box(extents=[1.8, 0.8, 0.1])
    windshield.apply_translation([0, 2.2, 5.5])
    windshield.visual.face_colors = color_glass
    detail_meshes.append(windshield)
    
    # Side Windows (Glass)
    window_l = trimesh.creation.box(extents=[0.1, 0.8, 1.2])
    window_l.apply_translation([1.01, 2.2, 4.0])
    window_l.visual.face_colors = color_glass
    detail_meshes.append(window_l)
    
    window_r = trimesh.creation.box(extents=[0.1, 0.8, 1.2])
    window_r.apply_translation([-1.01, 2.2, 4.0])
    window_r.visual.face_colors = color_glass
    detail_meshes.append(window_r)
    
    # Doors (Slightly offset and different color to stand out)
    door_l = trimesh.creation.box(extents=[0.05, 1.8, 1.4])
    door_l.apply_translation([1.02, 1.5, 3.9])
    door_l.visual.face_colors = color_door
    detail_meshes.append(door_l)

    door_r = trimesh.creation.box(extents=[0.05, 1.8, 1.4])
    door_r.apply_translation([-1.02, 1.5, 3.9])
    door_r.visual.face_colors = color_door
    detail_meshes.append(door_r)
    
    # Front Grille
    grille = trimesh.creation.box(extents=[1.4, 0.8, 0.1])
    grille.apply_translation([0, 1.2, 7.51])
    grille.visual.face_colors = color_grille
    detail_meshes.append(grille)
    
    # Headlights
    hl_l = trimesh.creation.box(extents=[0.3, 0.2, 0.1])
    hl_l.apply_translation([0.8, 1.0, 7.51])
    hl_l.visual.face_colors = color_light
    detail_meshes.append(hl_l)

    hl_r = trimesh.creation.box(extents=[0.3, 0.2, 0.1])
    hl_r.apply_translation([-0.8, 1.0, 7.51])
    hl_r.visual.face_colors = color_light
    detail_meshes.append(hl_r)

    # 3. Flatbed Trailer (Gray)
    trailer = trimesh.creation.box(extents=[2.4, 0.3, 11])
    trailer.apply_translation([0, 1.15, -3])
    trailer.visual.face_colors = color_gray
    
    # Trailer connection block (Gray)
    connector = trimesh.creation.box(extents=[1, 0.4, 1])
    connector.apply_translation([0, 0.9, 2.7])
    connector.visual.face_colors = color_dark_gray
    
    # Detail parts (Red and Blue) removed to keep the flatbed clear

    # 5. Wheels
    wheel_parts = []
    wheel_positions = [
        # Front axle
        [1.1, 0.5, 6.5], [-1.1, 0.5, 6.5],
        # Drive axles
        [1.1, 0.5, 3.5], [-1.1, 0.5, 3.5],
        [1.1, 0.5, 2.2], [-1.1, 0.5, 2.2],
        # Trailer rear axles
        [1.1, 0.5, -5.5], [-1.1, 0.5, -5.5],
        [1.1, 0.5, -7.0], [-1.1, 0.5, -7.0],
    ]
    
    for pos in wheel_positions:
        wheel_parts.extend(create_wheel(pos))

    # Combine everything into a scene (Removed detail_red, detail_blue, detail_red2, detail_blue2)
    meshes = [cabin, nose, trailer, connector] + detail_meshes + wheel_parts
    scene = trimesh.Scene(meshes)
    
    # Target output path
    out_dir = "/Users/allen/Desktop/LLRWD DigitalTwin Platform/server/uploads"
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    out_path = os.path.join(out_dir, "flatbed_truck.glb")
    
    # Export GLB
    # gltf requires meshes to have visual info. trimesh.Scene export works pretty well.
    scene.export(out_path, file_type='glb')
    
    print(f"GLB model generated successfully: {out_path}")

if __name__ == "__main__":
    generate_truck()
