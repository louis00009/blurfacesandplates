import json

file_path = r'C:\Users\ZhanboLiu\Downloads\Newcode\mosaic-blur-app\dataset\images\via_project_15Jul2025_12h59m.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    img_metadata = data.get('_via_img_metadata', {})

    annotations = []
    for img_id, img_info in img_metadata.items():
        filename = img_info.get('filename')
        regions = img_info.get('regions', [])
        
        for region in regions:
            shape_attributes = region.get('shape_attributes', {})
            if shape_attributes.get('name') == 'rect':
                x = shape_attributes.get('x')
                y = shape_attributes.get('y')
                width = shape_attributes.get('width')
                height = shape_attributes.get('height')
                annotations.append({
                    'filename': filename,
                    'bbox': [x, y, width, height]
                })
    
    if annotations:
        print("Extracted Annotations:")
        for ann in annotations:
            print(f"  Filename: {ann['filename']}, BBox: {ann['bbox']}")
    else:
        print("No annotations found in the VIA project file.")

except FileNotFoundError:
    print(f"Error: File not found at {file_path}")
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {file_path}. Invalid JSON format.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")