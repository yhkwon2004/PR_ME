#!/usr/bin/env python3
"""발표 자료 PDF용 JPEG 만들기 — 덱의 'PDF 저장'이 이 파일들로 인쇄한다(크롬은 WebP를 PDF에 압축 없이 넣어 파일이 20MB를 넘는다).

  python3 scripts/print_jpegs.py

  <사진>.print.jpg  같은 자리 · 같은 크기의 JPEG(품질 82)
    - 프로젝트마다 대표 사진(작은 것이 있으면 작은 것)
    - 상장 작은 것(.sm.webp, 240px)
    - 덱에 쓰인 프로젝트 사진(src/pages/present.js의 shotOf · picOf('<프로젝트>', '<번호>'), ['<프로젝트>', '<번호>'] 목록,
      { id: '<프로젝트>', shots: ['<번호>', …] }) — 큰 것과 작은 것(.thumb) 모두
    - 증명사진 · 장학증서(content.js의 profile)
덱은 인쇄할 때 사진 이름의 .webp를 .print.jpg로 바꿔 받고, 없으면 원래 WebP로 인쇄한다 — 기록이 바뀌면 다시 돌린다.
"""
import glob
import json
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')


def media(rel):
    return os.path.join(PUBLIC, rel.lstrip('/'))


def targets():
    out = set()
    projects = json.load(open(os.path.join(ROOT, 'src', 'data', 'projects.json'), encoding='utf-8'))
    for p in projects:
        if p.get('hidden') or not p.get('cover'):
            continue
        cover = p['cover']['file'] if isinstance(p['cover'], dict) else p['cover']
        thumb = cover.replace('.webp', '.thumb.webp')
        out.add(thumb if os.path.exists(media(thumb)) else cover)
    out.update(os.path.relpath(f, PUBLIC) for f in glob.glob(os.path.join(PUBLIC, 'media', 'awards', '*.sm.webp')))
    deck = open(os.path.join(ROOT, 'src', 'pages', 'present.js'), encoding='utf-8').read()
    pairs = re.findall(r"(?:shotOf|picOf)\('([\w-]+)', '(\d+)'\)", deck) + re.findall(r"\['([a-z][\w-]+)', '(\d+)'\]", deck)
    for pid, shots in re.findall(r"\{ id: '([\w-]+)', shots: \[([^\]]+)\] \}", deck):
        pairs += [(pid, n) for n in re.findall(r"'(\d+)'", shots)]
    for pid, n in pairs:
        for name in (f'{n}.webp', f'{n}.thumb.webp'):
            if os.path.exists(media(f'media/projects/{pid}/{name}')):
                out.add(f'media/projects/{pid}/{name}')
    content = open(os.path.join(ROOT, 'src', 'content.js'), encoding='utf-8').read()
    photo = re.search(r"photo:\s*\{\s*src:\s*M\('([^']+)'\)", content)
    if photo:
        out.add(f'media/{photo.group(1)}')
    out.update(os.path.relpath(f, PUBLIC) for f in glob.glob(os.path.join(PUBLIC, 'media', 'profile', 'scholarship*.webp')))
    return sorted(out)


def main():
    made = 0
    size = 0
    for rel in targets():
        src = media(rel)
        if not os.path.exists(src):
            print('없음:', rel)
            continue
        dst = src[: -len('.webp')] + '.print.jpg'
        im = Image.open(src).convert('RGB')
        im.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)
        made += 1
        size += os.path.getsize(dst)
    print(f'{made}개 · {size // 1000}KB')


if __name__ == '__main__':
    main()
