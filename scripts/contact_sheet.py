#!/usr/bin/env python3
"""프로젝트 이미지 밀착 인화지(번호 붙은 타일) 생성.

  python3 scripts/contact_sheet.py <project-id> <out.jpg>
"""
import os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pid, outp = sys.argv[1], sys.argv[2]
d = os.path.join(ROOT, 'public', 'media', 'projects', pid)
files = sorted(f for f in os.listdir(d) if f.endswith('.thumb.webp')) if os.path.isdir(d) else []
if not files:
    print('no images')
    sys.exit(0)
cols = 4 if len(files) > 6 else 3 if len(files) > 2 else len(files)
tw, th = 360, 270
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 24)), (20, 20, 24))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(os.path.join(d, f)).convert('RGB')
    im.thumbnail((tw - 8, th - 8))
    x, y = (i % cols) * tw, (i // cols) * (th + 24)
    sheet.paste(im, (x + (tw - im.width) // 2, y + 24 + (th - im.height) // 2))
    dr.rectangle([x, y, x + tw, y + 22], fill=(255, 107, 26))
    dr.text((x + 6, y + 5), f.replace('.thumb.webp', '.webp'), fill=(0, 0, 0))
os.makedirs(os.path.dirname(os.path.abspath(outp)), exist_ok=True)
sheet.save(outp, quality=80)
print(outp, len(files), 'images')
