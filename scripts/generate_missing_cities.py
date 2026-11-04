import os
from PIL import Image, ImageDraw

CITIES_DIR = os.path.join(os.getcwd(), 'assets', 'images', 'cities')
os.makedirs(CITIES_DIR, exist_ok=True)

# Colors matching BookMyShow:
# Unselected: refined charcoal grey #4B5563 / (75, 85, 99)
# Selected: ZonoFit emerald green #1F7A3F / (31, 122, 63)
COLOR_BASE = (75, 85, 99, 255)
COLOR_SEL = (31, 122, 63, 255)

def draw_udaipur(color):
    # 320x320 canvas
    im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = 6  # stroke width at 4x

    # Water ripples at bottom (Lake Pichola)
    d.line([(30, 275), (290, 275)], fill=color, width=w)
    d.arc([(40, 280), (100, 292)], 0, 180, fill=color, width=w)
    d.arc([(130, 280), (190, 292)], 0, 180, fill=color, width=w)
    d.arc([(220, 280), (280, 292)], 0, 180, fill=color, width=w)

    # Main Palace Base Platform
    d.line([(45, 255), (275, 255)], fill=color, width=w)
    d.line([(55, 255), (55, 170)], fill=color, width=w)
    d.line([(265, 255), (265, 170)], fill=color, width=w)

    # Central Grand Palace Tower
    d.rectangle([(110, 120), (210, 255)], outline=color, width=w)

    # Central Grand Archway (Cusped / Multifoil)
    d.line([(135, 255), (135, 205)], fill=color, width=w)
    d.line([(185, 255), (185, 205)], fill=color, width=w)
    d.arc([(135, 175), (185, 225)], 180, 360, fill=color, width=w)

    # Central Grand Dome (Onion / Chhatri)
    d.arc([(110, 60), (210, 140)], 180, 360, fill=color, width=w)
    d.line([(110, 120), (210, 120)], fill=color, width=w)
    # Kalash / Spire
    d.line([(160, 60), (160, 35)], fill=color, width=w)
    d.ellipse([(156, 30), (164, 38)], fill=color)

    # Left Wing & Chhatri
    d.rectangle([(55, 170), (110, 255)], outline=color, width=w)
    d.arc([(55, 130), (110, 180)], 180, 360, fill=color, width=w)
    d.line([(82, 130), (82, 115)], fill=color, width=w)
    # Left Jharokha window
    d.rectangle([(70, 195), (95, 225)], outline=color, width=w-1)

    # Right Wing & Chhatri
    d.rectangle([(210, 170), (265, 255)], outline=color, width=w)
    d.arc([(210, 130), (265, 180)], 180, 360, fill=color, width=w)
    d.line([(237, 130), (237, 115)], fill=color, width=w)
    # Right Jharokha window
    d.rectangle([(225, 195), (250, 225)], outline=color, width=w-1)

    # Ornate parapet brackets
    for x in range(65, 260, 25):
        d.line([(x, 168), (x, 163)], fill=color, width=w-1)

    return im.resize((80, 80), Image.Resampling.LANCZOS)

def draw_jodhpur(color):
    im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = 6

    # Rocky Cliff Base
    d.line([(35, 265), (285, 265)], fill=color, width=w)
    d.line([(35, 265), (75, 220)], fill=color, width=w)
    d.line([(75, 220), (245, 220)], fill=color, width=w)
    d.line([(245, 220), (285, 265)], fill=color, width=w)

    # Massive Fortress Wall
    d.line([(65, 220), (65, 130)], fill=color, width=w)
    d.line([(255, 220), (255, 130)], fill=color, width=w)

    # Fortress Battlements / Ramparts
    for x in range(65, 255, 24):
        d.line([(x, 130), (x+12, 130)], fill=color, width=w)
        d.line([(x+12, 130), (x+12, 142)], fill=color, width=w)
        d.line([(x+12, 142), (x+24, 142)], fill=color, width=w)
        d.line([(x+24, 142), (x+24, 130)], fill=color, width=w)

    # Upper Palace Complex of Mehrangarh
    d.rectangle([(90, 80), (160, 130)], outline=color, width=w)
    d.arc([(90, 50), (160, 95)], 180, 360, fill=color, width=w)
    d.line([(125, 50), (125, 35)], fill=color, width=w)

    d.rectangle([(160, 95), (230, 130)], outline=color, width=w)
    d.arc([(160, 65), (230, 110)], 180, 360, fill=color, width=w)
    d.line([(195, 65), (195, 50)], fill=color, width=w)

    # Ornate Jharokha lattices
    d.rectangle([(105, 100), (120, 120)], outline=color, width=w-2)
    d.rectangle([(130, 100), (145, 120)], outline=color, width=w-2)
    d.rectangle([(175, 108), (190, 125)], outline=color, width=w-2)
    d.rectangle([(200, 108), (215, 125)], outline=color, width=w-2)

    return im.resize((80, 80), Image.Resampling.LANCZOS)

def draw_kota(color):
    im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = 6

    # Chambal River Base
    d.line([(30, 270), (290, 270)], fill=color, width=w)
    d.arc([(50, 275), (110, 287)], 0, 180, fill=color, width=w)
    d.arc([(130, 275), (190, 287)], 0, 180, fill=color, width=w)
    d.arc([(210, 275), (270, 287)], 0, 180, fill=color, width=w)

    # Palace & Seven Wonders Tower
    d.line([(55, 250), (265, 250)], fill=color, width=w)
    d.rectangle([(120, 100), (200, 250)], outline=color, width=w)
    d.arc([(120, 55), (200, 120)], 180, 360, fill=color, width=w)
    d.line([(160, 55), (160, 35)], fill=color, width=w)

    # Arches
    d.arc([(135, 190), (185, 250)], 180, 360, fill=color, width=w)
    d.line([(135, 250), (135, 220)], fill=color, width=w)
    d.line([(185, 250), (185, 220)], fill=color, width=w)

    # Side Towers
    d.rectangle([(65, 150), (110, 250)], outline=color, width=w)
    d.arc([(65, 115), (110, 160)], 180, 360, fill=color, width=w)
    d.rectangle([(210, 150), (255, 250)], outline=color, width=w)
    d.arc([(210, 115), (255, 160)], 180, 360, fill=color, width=w)

    return im.resize((80, 80), Image.Resampling.LANCZOS)

def draw_ajmer(color):
    im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = 6

    # Platform (Ana Sagar Baradari & Dargah Gate)
    d.line([(40, 260), (280, 260)], fill=color, width=w)
    d.rectangle([(60, 130), (260, 260)], outline=color, width=w)

    # 3 Cusped Arches (Baradari)
    for cx in [100, 160, 220]:
        d.arc([(cx-22, 170), (cx+22, 230)], 180, 360, fill=color, width=w)
        d.line([(cx-22, 260), (cx-22, 200)], fill=color, width=w)
        d.line([(cx+22, 260), (cx+22, 200)], fill=color, width=w)

    # Central Grand Dome
    d.arc([(115, 60), (205, 135)], 180, 360, fill=color, width=w)
    d.line([(160, 60), (160, 35)], fill=color, width=w)
    d.ellipse([(156, 30), (164, 38)], fill=color)

    # Side minarets
    d.line([(60, 130), (60, 85)], fill=color, width=w)
    d.arc([(48, 70), (72, 95)], 180, 360, fill=color, width=w)
    d.line([(260, 130), (260, 85)], fill=color, width=w)
    d.arc([(248, 70), (272, 95)], 180, 360, fill=color, width=w)

    return im.resize((80, 80), Image.Resampling.LANCZOS)

def draw_bhilwara(color):
    im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = 6

    # Base
    d.line([(40, 260), (280, 260)], fill=color, width=w)
    # Fort Tower
    d.rectangle([(90, 110), (230, 260)], outline=color, width=w)
    # Arched Entrance
    d.arc([(125, 180), (195, 250)], 180, 360, fill=color, width=w)
    d.line([(125, 260), (125, 215)], fill=color, width=w)
    d.line([(195, 260), (195, 215)], fill=color, width=w)

    # Battlements
    for x in range(90, 230, 28):
        d.line([(x, 110), (x+14, 110)], fill=color, width=w)
        d.line([(x+14, 110), (x+14, 122)], fill=color, width=w)
        d.line([(x+14, 122), (x+28, 122)], fill=color, width=w)

    # Upper Watchtower Dome
    d.arc([(125, 65), (195, 115)], 180, 360, fill=color, width=w)
    d.line([(160, 65), (160, 40)], fill=color, width=w)

    # Textile Shuttle / Loom motif in upper window
    d.ellipse([(140, 135), (180, 165)], outline=color, width=w-2)
    d.line([(135, 150), (185, 150)], fill=color, width=w-2)

    return im.resize((80, 80), Image.Resampling.LANCZOS)

cities = {
    'udaipur': draw_udaipur,
    'jodhpur': draw_jodhpur,
    'kota': draw_kota,
    'ajmer': draw_ajmer,
    'bhilwara': draw_bhilwara,
}

for name, draw_fn in cities.items():
    base = draw_fn(COLOR_BASE)
    base.save(os.path.join(CITIES_DIR, f'{name}.png'), 'PNG')
    
    sel = draw_fn(COLOR_SEL)
    sel.save(os.path.join(CITIES_DIR, f'{name}-selected.png'), 'PNG')

print("Generated custom landmark icons for Udaipur, Jodhpur, Kota, Ajmer, Bhilwara!")
