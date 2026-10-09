#!/usr/bin/env python3
"""프로젝트 이미지 수집기.

  python3 scripts/harvest.py <project-id> <src> [<src> ...]

src는 http(s) URL(노션 서명 URL 등) 또는 로컬 파일 경로.
각 이미지를 EXIF 회전 보정 → WebP 원본(긴 변 1600px) + 썸네일(긴 변 720px)로
public/media/projects/<id>/NN.webp, NN.thumb.webp 에 저장한다.
같은 폴더에 이미 비슷한 이미지(dHash 해밍거리 ≤ 6)가 있으면 건너뛴다.
결과를 줄마다 JSON으로 출력한다.
"""
import io, json, os, sys, urllib.request
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def dhash(im, size=8):
    g = im.convert('L').resize((size + 1, size), Image.LANCZOS)
    px = list(g.tobytes())
    bits = 0
    for r in range(size):
        for c in range(size):
            bits = (bits << 1) | (1 if px[r * (size + 1) + c] > px[r * (size + 1) + c + 1] else 0)
    return bits

def load(src):
    if src.startswith('http://') or src.startswith('https://'):
        req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        return Image.open(io.BytesIO(data))
    return Image.open(src)

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    pid = sys.argv[1]
    out = os.path.join(ROOT, 'public', 'media', 'projects', pid)
    os.makedirs(out, exist_ok=True)
    existing = []
    for f in sorted(os.listdir(out)):
        if f.endswith('.webp') and not f.endswith('.thumb.webp'):
            try:
                existing.append((f, dhash(Image.open(os.path.join(out, f)))))
            except Exception:
                pass
    n = max([int(f.split('.')[0]) for f, _ in existing if f.split('.')[0].isdigit()] + [0])
    for src in sys.argv[2:]:
        rec = {'src': src[:120], 'file': None, 'thumb': None, 'w': 0, 'h': 0, 'dup_of': None, 'error': None}
        try:
            im = ImageOps.exif_transpose(load(src))
            if im.mode not in ('RGB', 'RGBA'):
                im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
            if im.mode == 'RGBA':
                bg = Image.new('RGB', im.size, (10, 12, 16))
                bg.paste(im, mask=im.split()[3])
                im = bg
            h = dhash(im)
            dup = next((f for f, eh in existing if bin(eh ^ h).count('1') <= 6), None)
            if dup:
                rec['dup_of'] = f'media/projects/{pid}/{dup}'
            else:
                n += 1
                name = f'{n:02d}'
                full = im.copy()
                full.thumbnail((1600, 1600), Image.LANCZOS)
                full.save(os.path.join(out, f'{name}.webp'), 'WEBP', quality=80, method=6)
                th = im.copy()
                th.thumbnail((720, 720), Image.LANCZOS)
                th.save(os.path.join(out, f'{name}.thumb.webp'), 'WEBP', quality=72, method=6)
                existing.append((f'{name}.webp', h))
                rec.update(file=f'media/projects/{pid}/{name}.webp', thumb=f'media/projects/{pid}/{name}.thumb.webp', w=full.width, h=full.height)
        except Exception as e:
            rec['error'] = f'{type(e).__name__}: {e}'
        print(json.dumps(rec, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
