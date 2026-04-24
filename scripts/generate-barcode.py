#!/usr/bin/env python3
"""Generate a compact, bordered barcode for an ICCID number."""

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
    'module_width': 0.25,
    'module_height': 1.5,
    'font_size': 0,
    'text_distance': 0,
    'quiet_zone': 1,
    'dpi': 200,
})

code128 = barcode.get('code128', ICCID, writer=writer)
tmp_path = os.path.join(OUTPUT_DIR, f'_tmp_{ICCID}')
tmp_file = code128.save(tmp_path, {'write_text': False})
bar_img = Image.open(tmp_file).convert('RGB')
bar_img = bar_img.crop(bar_img.getbbox())

try:
    label_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 9)
    num_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 8)
except:
    label_font = ImageFont.load_default()
    num_font = label_font

# Measure text
tmp_draw = ImageDraw.Draw(bar_img)
label = 'ICCID'
lbox = tmp_draw.textbbox((0, 0), label, font=label_font)
nbox = tmp_draw.textbbox((0, 0), ICCID, font=num_font)
label_h = lbox[3] - lbox[1]
num_h = nbox[3] - nbox[1]

pad_x = 6
pad_top = 4
gap_label_bar = 2
gap_bar_num = 2
pad_bottom = 4
border = 2

inner_w = max(bar_img.width, nbox[2] - nbox[0]) + pad_x * 2
inner_h = pad_top + label_h + gap_label_bar + bar_img.height + gap_bar_num + num_h + pad_bottom
canvas_w = inner_w + border * 2
canvas_h = inner_h + border * 2

canvas = Image.new('RGB', (canvas_w, canvas_h), 'white')
draw = ImageDraw.Draw(canvas)

# Outer border
draw.rounded_rectangle(
    [(0, 0), (canvas_w - 1, canvas_h - 1)],
    radius=6, outline='#CCCCCC', width=border
)

# "ICCID" label centered
lw = lbox[2] - lbox[0]
draw.text(((canvas_w - lw) / 2, border + pad_top), label, fill='#444444', font=label_font)

# Barcode centered
bar_x = (canvas_w - bar_img.width) // 2
bar_y = border + pad_top + label_h + gap_label_bar
canvas.paste(bar_img, (bar_x, bar_y))

# Number centered
nw = nbox[2] - nbox[0]
draw.text(((canvas_w - nw) / 2, bar_y + bar_img.height + gap_bar_num), ICCID, fill='#222222', font=num_font)

out_path = os.path.join(OUTPUT_DIR, f'iccid-{ICCID}.png')
canvas.save(out_path)
print(f'Barcode saved: {out_path}  ({canvas_w}x{canvas_h}px)')
print(f'ICCID: {ICCID}')

# Clean up temp
os.remove(tmp_file)
