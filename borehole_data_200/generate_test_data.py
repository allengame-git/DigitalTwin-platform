import csv
import random
import os

# Create directory
output_dir = "/Users/allen/Desktop/LLRWD DigitalTwin Platform/borehole_data_200"
os.makedirs(output_dir, exist_ok=True)

# Project Settings
origin_x = 224000
origin_y = 2429000
borehole_count = 200
lithologies = [
    ("SM", "砂質粉土"),
    ("SD", "砂土"),
    ("SF", "回填土"),
    ("GM", "礫石層"),
    ("CL", "低塑性黏土")
]

# 1. Generate boreholes_basic.csv
basic_file = os.path.join(output_dir, "boreholes_basic.csv")
with open(basic_file, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["boreholeNo", "x", "y", "elevation", "totalDepth", "drilledDate", "area", "contractor", "description"])
    
    for i in range(1, borehole_count + 1):
        borehole_no = f"BH-{i:03d}"
        x = origin_x + random.uniform(-500, 500)
        y = origin_y + random.uniform(-500, 500)
        elevation = random.uniform(100, 150)
        total_depth = random.uniform(30, 60)
        drilled_date = "2024-02-10"
        area = "測試區"
        contractor = "模擬鑽探公司"
        description = "自動生成測試資料"
        writer.writerow([borehole_no, round(x, 2), round(y, 2), round(elevation, 1), round(total_depth, 1), drilled_date, area, contractor, description])

# 2. Generate boreholes_layers.csv
layers_file = os.path.join(output_dir, "boreholes_layers.csv")
with open(layers_file, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["boreholeNo", "topDepth", "bottomDepth", "lithologyCode", "description", "lithologyName"])
    
    # Read basic file to get depths
    boreholes = []
    with open(basic_file, "r", encoding="utf-8-sig") as bf:
        reader = csv.DictReader(bf)
        for row in reader:
            boreholes.append((row["boreholeNo"], float(row["totalDepth"])))
            
    for b_no, total_depth in boreholes:
        current_depth = 0.0
        while current_depth < total_depth:
            layer_thickness = random.uniform(3, 10)
            bottom_depth = min(current_depth + layer_thickness, total_depth)
            lith_code, lith_name = random.choice(lithologies)
            description = f"褐灰色{lith_name}夾岩塊"
            writer.writerow([b_no, round(current_depth, 1), round(bottom_depth, 1), lith_code, description, lith_name])
            current_depth = bottom_depth
            if current_depth >= total_depth:
                break

# 3. Generate boreholes_properties.csv
props_file = os.path.join(output_dir, "boreholes_properties.csv")
with open(props_file, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["boreholeNo", "depth", "nValue", "rqd"])
    
    for b_no, total_depth in boreholes:
        depth = 1.5
        while depth < total_depth:
            n_value = random.randint(1, 50)
            rqd = random.randint(0, 100)
            writer.writerow([b_no, round(depth, 1), n_value, rqd])
            depth += 1.5

print("Successfully generated 200 sets of borehole data.")
