#!/usr/bin/env python3
"""Generate a barcode for an ICCID number.
Uses ITF (Interleaved 2 of 5) — compact for numeric-only data, standard for SIM cards.
"""

import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
import os
import sys

ICCID = sys.argv[1] if len(sys.argv) > 1 else '89852240810733410542'

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'public', 'barcodes')
os.makedirs(OUTPUT_DIR, exist_ok=True)

writer = ImageWriter()
writer.set_options({
    'module_width': 0.6,
    'module_height': 10,
    'font_size': 0,
    'text_distance': 0,
    'quiet_zone': 4,
    'dpi': 300,
})

# ITF is much more compact than Code 128 for numeric data
itf = barcode.get('itf', ICCID, writer=writer)
out_path = os.path.join(OUTPUT_DIR, f'iccid-{ICCID}')
filename = itf.save(out_path, {'write_text': False})

bar_img = Image.open(filename)
bar_img = bar_img.crop(bar_img.getbbox())

# Add ICCID text below
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 16)
    font_small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 11)
except:
    font = ImageFont.load_default()
    font_small = font

pad = 12
text_gap = 6
label_h = 16
number_h = 22
canvas_w = bar_img.width + pad * 2
canvas_h = bar_img.height + text_gap + label_h + number_h + pad

new_img = Image.new('RGB', (canvas_w, canvas_h), 'white')
new_img.paste(bar_img, (pad, pad // 2))

draw = ImageDraw.Draw(new_img)

# "ICCID" label
label = 'ICCID'
lbox = draw.textbbox((0, 0), label, font=font_small)
lw = lbox[2] - lbox[0]
draw.text(((canvas_w - lw) / 2, bar_img.height + text_gap), label, fill='#999999', font=font_small)

# Number below
nbox = draw.textbbox((0, 0), ICCID, font=font)
nw = nbox[2] - nbox[0]
draw.text(((canvas_w - nw) / 2, bar_img.height + text_gap + label_h), ICCID, fill='black', font=font)

new_img.save(filename)
print(f'Barcode saved: {filename}  ({new_img.width}x{new_img.height}px)')
print(f'ICCID: {ICCID}')
print(f'Format: ITF (Interleaved 2 of 5)')
