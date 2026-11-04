import os
from PIL import Image, ImageDraw

CITIES_DIR = os.path.join(os.getcwd(), 'assets', 'images', 'cities')
os.makedirs(CITIES_DIR, exist_ok=True)

def make_transparent_and_clean(img_path, out_path, selected=False):
    im = Image.open(img_path).convert('RGBA')
    # Resize to fit 80x80 if larger
    if im.size != (80, 80):
        im.thumbnail((76, 76), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (80, 80), (0, 0, 0, 0))
        offset = ((80 - im.width) // 2, (80 - im.height) // 2)
        canvas.paste(im, offset)
        im = canvas

    datas = im.getdata()
    new_data = []
    for item in datas:
        # Check if white/near-white background
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    im.putdata(new_data)
    im.save(out_path, 'PNG')

# 1. Clean existing BMS icons to transparent RGBA
existing = ['mumbai', 'ncr', 'bang', 'hyd', 'ahd', 'chd', 'chen', 'pune', 'kolk', 'koch', 'jaip']
for name in existing:
    base = os.path.join(CITIES_DIR, f'{name}.png')
    sel = os.path.join(CITIES_DIR, f'{name}-selected.png')
    if os.path.exists(base):
        make_transparent_and_clean(base, base)
    if os.path.exists(sel):
        make_transparent_and_clean(sel, sel, selected=True)

print("Cleaned existing BMS icons.")
