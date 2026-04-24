#!/usr/bin/env python3
"""Generate a branded EvairSIM QR code with logo overlay."""

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
from PIL import Image, ImageDraw
import os

URL = "https://www.evairdigital.com/r"
BRAND_ORANGE = (0xFF, 0x66, 0x00)
WHITE = (0xFF, 0xFF, 0xFF)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
LOGO_PATH = os.path.join(PROJECT_ROOT, "public", "evairsim-logo.png")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "qr")
os.makedirs(OUTPUT_DIR, exist_ok=True)

qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # High EC so logo doesn't break scanning
    box_size=20,
    border=3,
)
qr.add_data(URL)
qr.make(fit=True)

img = qr.make_image(
    image_factory=StyledPilImage,
    color_mask=SolidFillColorMask(
        back_color=WHITE,
        front_color=BRAND_ORANGE,
    ),
).convert("RGBA")

# Overlay logo in center
logo = Image.open(LOGO_PATH).convert("RGBA")
qr_w, qr_h = img.size
logo_max = int(qr_w * 0.22)  # logo takes ~22% of QR width (safe for H-level EC)
logo.thumbnail((logo_max, logo_max), Image.LANCZOS)
logo_w, logo_h = logo.size

# White rounded-rect background behind logo for contrast
pad = 12
bg_size = (logo_w + pad * 2, logo_h + pad * 2)
bg = Image.new("RGBA", bg_size, (0, 0, 0, 0))
draw = ImageDraw.Draw(bg)
draw.rounded_rectangle([(0, 0), (bg_size[0] - 1, bg_size[1] - 1)], radius=16, fill=(255, 255, 255, 255))
bg.paste(logo, (pad, pad), logo)

pos = ((qr_w - bg_size[0]) // 2, (qr_h - bg_size[1]) // 2)
img.paste(bg, pos, bg)

# Save both PNG and high-res version
out_path = os.path.join(OUTPUT_DIR, "evairsim-qr.png")
img.save(out_path, "PNG")
print(f"QR code saved: {out_path}  ({img.size[0]}x{img.size[1]}px)")

# Also save a plain version without logo
img_plain = qr.make_image(
    image_factory=StyledPilImage,
    color_mask=SolidFillColorMask(
        back_color=WHITE,
        front_color=BRAND_ORANGE,
    ),
).convert("RGBA")
out_plain = os.path.join(OUTPUT_DIR, "evairsim-qr-no-logo.png")
img_plain.save(out_plain, "PNG")
print(f"Plain QR saved: {out_plain}  ({img_plain.size[0]}x{img_plain.size[1]}px)")
