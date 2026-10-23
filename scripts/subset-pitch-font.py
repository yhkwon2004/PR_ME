#!/usr/bin/env python3
"""INFU RETRO 피치덱(public/infutech/index.html)에 쓰인 글자만 담은 Pretendard 서브셋 생성.

덱 문구를 고친 뒤 새 글자가 생기면 다시 실행합니다(없는 글자는 시스템 서체로 보입니다).

  npm ci && pip install fonttools brotli
  python3 scripts/subset-pitch-font.py
"""
import os, string
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = os.path.join(ROOT, 'public', 'infutech', 'index.html')
src = os.path.join(ROOT, 'node_modules', 'pretendard', 'dist', 'public', 'variable', 'PretendardVariable.ttf')
out = os.path.join(ROOT, 'public', 'infutech', 'fonts', 'pretendard-pitch.woff2')

text = open(html, encoding='utf-8').read()
chars = set(text) | set(string.printable) | set('·—–…“”‘’「」→←↔↓↑×−±①②③※%')
chars = {c for c in chars if c.isprintable() and not c.isspace()} | {' ', ' '}

opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']
opts.name_IDs = ['*']
opts.notdef_outline = True
font = subset.load_font(src, opts)
sub = subset.Subsetter(opts)
sub.populate(unicodes=sorted(ord(c) for c in chars))
sub.subset(font)
os.makedirs(os.path.dirname(out), exist_ok=True)
subset.save_font(font, out, opts)
print(out, len(chars), 'glyphs', os.path.getsize(out) // 1024, 'KB')
