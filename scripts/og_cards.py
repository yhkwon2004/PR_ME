#!/usr/bin/env python3
"""링크 미리보기 이미지(1200x630) 만들기 — 카카오톡 · 링크드인 · 슬랙 등에 주소를 붙였을 때 뜨는 카드.

  python3 scripts/og_cards.py

  public/og/<프로젝트 id>.jpg  프로젝트마다: 대표 사진 + 분야 · 연도 · 제목 · 한 줄 소개 · 수상
  public/og/about.jpg · growth.jpg(발표 자료) · history.jpg · works.jpg · awards.jpg · skills.jpg  모아 보기 페이지
  public/icons/apple-touch-icon.png · icon-192.png · icon-512.png  홈 화면 아이콘(favicon.svg와 같은 그림)
모든 글은 src/data/*.json과 src/content.js에 이미 있는 기록에서 가져온다. 프로젝트 기록이 바뀌면 다시 돌린다.
"""
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'og')
FONTS = os.path.join(ROOT, 'node_modules', 'pretendard', 'dist', 'public', 'static')
SITE = 'kwon-physical-ai.vercel.app'
W, H = 1200, 630
BG = (5, 7, 12)
FG = (238, 242, 247)
FG2 = (196, 204, 216)
MUTED = (141, 151, 167)
CYAN = (94, 242, 255)
ORANGE = (255, 107, 26)
ICON_BG, ICON_CYAN, ICON_ORANGE = BG, CYAN, ORANGE

# 분야 색 · 이름(src/styles/pages.css · src/data/projects.js와 같게)
CATS = {
    'mobility': ((127, 168, 255), 'DRONE · MOBILITY', '드론 · 모빌리티'),
    'robotics': ((255, 107, 26), 'ROBOTICS', '로봇'),
    'ai': ((196, 139, 255), 'AI', 'AI · 데이터'),
    'iot': ((61, 255, 154), 'IOT', '임베디드 · 하드웨어'),
    'product': ((255, 207, 90), 'PRODUCT', '제품 · 창업'),
    'software': ((159, 179, 200), 'SOFTWARE', '소프트웨어'),
}
TIERS = [('대상', (244, 207, 115)), ('최우수', (226, 232, 240)), ('우수상', (203, 213, 225)), ('장려', (230, 160, 110))]


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, f'Pretendard-{weight}.otf'), size)


def load(name):
    with open(os.path.join(ROOT, 'src', 'data', name), encoding='utf-8') as f:
        return json.load(f)


def wrap(draw, text, fnt, width, max_lines):
    """띄어쓰기 단위로 줄을 나누고(넘치는 낱말은 글자 단위), 넘치면 마지막 줄을 …로 줄인다."""
    words = text.split(' ')
    lines, cur = [], ''
    for w in words:
        test = f'{cur} {w}'.strip()
        if draw.textlength(test, font=fnt) <= width:
            cur = test
            continue
        if cur:
            lines.append(cur)
        cur = w
        while draw.textlength(cur, font=fnt) > width:
            k = len(cur)
            while k > 1 and draw.textlength(cur[:k], font=fnt) > width:
                k -= 1
            lines.append(cur[:k])
            cur = cur[k:]
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and draw.textlength(last + '…', font=fnt) > width:
            last = last[:-1]
        lines[-1] = last.rstrip() + '…'
    return lines


def fit_title(draw, text, width, max_lines=3, sizes=(66, 60, 54, 48, 44, 40)):
    for s in sizes:
        f = font('Bold', s)
        lines = wrap(draw, text, f, width, 99)
        if len(lines) <= max_lines:
            return f, lines
    f = font('Bold', sizes[-1])
    return f, wrap(draw, text, f, width, max_lines)


def cover_photo(path, w, h):
    im = Image.open(path).convert('RGB')
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def fade_left(photo, fade):
    """사진 왼쪽 가장자리를 배경색으로 녹인다."""
    mask = Image.new('L', photo.size, 255)
    d = ImageDraw.Draw(mask)
    for x in range(fade):
        d.line([(x, 0), (x, photo.height)], fill=round(255 * (x / fade) ** 1.6))
    base = Image.new('RGB', photo.size, BG)
    return Image.composite(photo, base, mask)


def darken(photo, k):
    return Image.blend(photo, Image.new('RGB', photo.size, BG), k)


def brand(draw, x, y):
    f = font('Bold', 22)
    tw = draw.textlength('KWON', font=f)
    draw.rectangle([x, y, x + tw + 20, y + 38], outline=FG, width=2)
    draw.text((x + 10, y + 6), 'KWON', font=f, fill=FG)
    draw.text((x + tw + 36, y + 9), 'PHYSICAL AI PORTFOLIO', font=font('Medium', 17), fill=MUTED)


def tier_of(text):
    for k, (word, col) in enumerate(TIERS):
        if word in text:
            return k, word if word != '최우수' else '최우수상', col
    return 9, '수상', FG2


def best_award(p):
    if not p.get('awards'):
        return None
    best = min((tier_of(a) for a in p['awards']), key=lambda t: t[0])
    return best[1], best[2], len(p['awards'])


def pill(draw, x, y, text, col, fnt):
    tw = draw.textlength(text, font=fnt)
    draw.rounded_rectangle([x, y, x + tw + 32, y + 42], radius=21, outline=col, width=2)
    draw.text((x + 16, y + 8), text, font=fnt, fill=col)
    return x + tw + 32


def project_card(p, out):
    col, code, ko = CATS.get(p['category'], (CYAN, p['category'].upper(), p['category']))
    img = Image.new('RGB', (W, H), BG)
    PW = 520  # 오른쪽 사진 폭
    cover = p.get('cover')
    path = os.path.join(ROOT, 'public', cover) if cover else None
    if path and os.path.exists(path):
        photo = darken(cover_photo(path, PW + 120, H), 0.08)
        img.paste(fade_left(photo, 200), (W - PW - 120, 0))
    else:
        # 사진이 없는 프로젝트: 분야 이름을 크게 깐 활자 표지
        d0 = ImageDraw.Draw(img)
        big = font('Black', 150)
        d0.text((W - PW + 10, H - 210), code.split(' ')[0], font=big, fill=tuple(round(c * 0.22 + b * 0.78) for c, b in zip(col, BG)))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 8, H], fill=col)
    brand(d, 64, 56)
    TX, TW = 64, 600
    y = 150
    # 분야(영문 · 한글 — 한글 이름에 영문이 들어 있으면 한글만) · 연도
    label = ko if (code in ko or '·' in code) else f'{code}  ·  {ko}'
    lf = font('SemiBold', 22)
    d.text((TX, y), label, font=lf, fill=col)
    year = p.get('year') or ''
    if year:
        d.text((TX + d.textlength(label, font=lf) + 24, y), year, font=font('Medium', 22), fill=MUTED)
    y += 50
    tf, lines = fit_title(d, p['title'], TW)
    for ln in lines:
        d.text((TX, y), ln, font=tf, fill=FG)
        y += round(tf.size * 1.18)
    y += 14
    one = p.get('oneLiner') or ''
    if one:
        of = font('Regular', 27)
        for ln in wrap(d, one, of, TW, 2):
            d.text((TX, y), ln, font=of, fill=FG2)
            y += 40
    aw = best_award(p)
    if aw:
        label, acol, n = aw
        pill(d, TX, H - 128, f'수상 · {label}' + (f' 외 {n - 1}' if n > 1 else ''), acol, font('SemiBold', 21))
    d.text((TX, H - 64), f'{SITE}/works/{p["id"]}', font=font('Medium', 19), fill=CYAN)
    img.save(out, 'JPEG', quality=80, optimize=True, progressive=True)


def collage(img, files, box, cols, gap=10):
    """여러 대표 사진을 격자로(오른쪽 영역)."""
    x0, y0, x1, y1 = box
    rows = (len(files) + cols - 1) // cols
    cw = (x1 - x0 - gap * (cols - 1)) // cols
    ch = (y1 - y0 - gap * (rows - 1)) // rows
    for k, f in enumerate(files):
        ph = darken(cover_photo(os.path.join(ROOT, 'public', f), cw, ch), 0.12)
        m = Image.new('L', (cw, ch), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, cw - 1, ch - 1], radius=14, fill=255)
        img.paste(ph, (x0 + (k % cols) * (cw + gap), y0 + (k // cols) * (ch + gap)), m)


def section_card(out, kicker, title, sub, stats, files, path):
    img = Image.new('RGB', (W, H), BG)
    collage(img, files, (700, 44, W - 44, H - 44), 2)
    # 사진 격자 왼쪽을 배경으로 녹인다
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for x in range(160):
        od.line([(690 + x, 0), (690 + x, H)], fill=BG + (round(255 * (1 - x / 160) ** 1.4),))
    img.paste(ov, (0, 0), ov)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 8, H], fill=CYAN)
    brand(d, 64, 56)
    d.text((64, 150), kicker, font=font('SemiBold', 22), fill=CYAN)
    # 한 줄에 들어가면 한 줄로, 아니면 두 줄
    tf, lines = fit_title(d, title, 600, 1, sizes=(72, 66, 60))
    if len(lines) > 1 or lines[0].endswith('…'):
        tf, lines = fit_title(d, title, 600, 2, sizes=(72, 64, 56))
    y = 196
    for ln in lines:
        d.text((64, y), ln, font=tf, fill=FG)
        y += round(tf.size * 1.15)
    y += 10
    for ln in wrap(d, sub, font('Regular', 26), 600, 2):
        d.text((64, y), ln, font=font('Regular', 26), fill=FG2)
        y += 38
    x = 64
    for n, label in stats:
        nf, lf = font('Bold', 40), font('Medium', 18)
        w = max(d.textlength(n, font=nf), d.textlength(label, font=lf)) + 36
        d.rounded_rectangle([x, H - 176, x + w, H - 92], radius=14, outline=(60, 66, 78), width=2)
        d.text((x + 18, H - 170), n, font=nf, fill=FG)
        d.text((x + 18, H - 120), label, font=lf, fill=MUTED)
        x += w + 10
    d.text((64, H - 64), f'{SITE}{path}', font=font('Medium', 19), fill=CYAN)
    img.save(out, 'JPEG', quality=80, optimize=True, progressive=True)


def app_icons():
    """favicon.svg(64x64)와 같은 그림을 PNG로 — 홈 화면 · 북마크 아이콘. 네 배로 그린 뒤 줄여 가장자리를 부드럽게."""
    d_out = os.path.join(ROOT, 'public', 'icons')
    os.makedirs(d_out, exist_ok=True)
    for name, size in (('apple-touch-icon', 180), ('icon-192', 192), ('icon-512', 512)):
        k = size * 4 / 64
        im = Image.new('RGB', (size * 4, size * 4), ICON_BG)  # 모서리는 기기가 둥글게 깎는다
        d = ImageDraw.Draw(im)
        sw = round(3 * k)
        for cx, cy in ((16, 16), (48, 16), (16, 48), (48, 48)):
            d.ellipse([(cx - 8) * k, (cy - 8) * k, (cx + 8) * k, (cy + 8) * k], outline=ICON_CYAN, width=sw)
        d.line([(22 * k, 22 * k), (42 * k, 42 * k)], fill=ICON_CYAN, width=sw)
        d.line([(42 * k, 22 * k), (22 * k, 42 * k)], fill=ICON_CYAN, width=sw)
        d.rounded_rectangle([26 * k, 26 * k, 38 * k, 38 * k], radius=2 * k, fill=ICON_ORANGE)
        im.resize((size, size), Image.LANCZOS).save(os.path.join(d_out, f'{name}.png'), optimize=True)


def main():
    app_icons()
    os.makedirs(OUT, exist_ok=True)
    projects = [p for p in load('projects.json') if not p.get('hidden')]
    for name in os.listdir(OUT):  # 합쳐지거나 숨긴 프로젝트의 지난 카드는 지운다
        if name[:-4] not in {p['id'] for p in projects} | {'about', 'works', 'awards', 'skills', 'history', 'growth'}:
            os.remove(os.path.join(OUT, name))
    awards = load('awards.json')
    press = load('press.json')
    for p in projects:
        project_card(p, os.path.join(OUT, f'{p["id"]}.jpg'))
    with open(os.path.join(ROOT, 'src', 'data', 'skills.js'), encoding='utf-8') as f:
        skills_src = f.read()
    n_skills = len(re.findall(r"^\s*\{ d: '", skills_src, re.M))
    n_domains = len(re.findall(r"^\s*\{ id: '[a-z]+', code: '", skills_src, re.M))
    n_certs = len(re.findall(r"^\s*\{ id: '[\w-]+', name: '", skills_src, re.M))
    grand = sum(1 for a in awards if '대상' in a['grade'])
    featured = ['pixhawk-drone', 'airsim-driving', 'baja-ev-formula', 'quadruped-robot', 'iot-iv-pole', 'huss-evidence-ai', 'recap-jbmotors', 'av-competition']
    by_id = {p['id']: p for p in projects}
    covers = [by_id[i]['cover'] for i in featured if i in by_id and by_id[i].get('cover')]
    awarded = [p['cover'] for p in projects if p.get('cover') and any('대상' in a for a in p.get('awards', []))]
    section_card(os.path.join(OUT, 'about.jpg'), 'PROFILE — 한눈에 보는 권용현', '권용현 · Yonghyun Kwon',
                 'Physical AI Developer — AI·소프트웨어·하드웨어를 연결해 현장 문제를 푸는 개발자',
                 [(str(len(projects)), '프로젝트'), (str(len(awards)), '수상'), (str(n_certs), '자격증'), (str(len(press)), '보도')], covers[:4], '/about')
    # 성장 과정: 학년마다 대표 프로젝트 한두 개의 사진(1학년 해커톤 로봇 → 2학년 자작차 → 3학년 링거폴대 · 4족보행)
    grown = [by_id[i]['cover'] for i in ['robot-push-hackathon', 'baja-ev-formula', 'iot-iv-pole', 'quadruped-robot'] if i in by_id and by_id[i].get('cover')]
    # 발표 자료(/present · /growth): 경진대회 안내서의 목차 그대로 — 학년마다 대표 프로젝트 사진
    section_card(os.path.join(OUT, 'growth.jpg'), 'PRESENTATION — 10분 포트폴리오 발표', '발표 자료 · 28장',
                 '나를 소개합니다 → STEP 1 자기이해 → STEP 2 직업탐색 → STEP 3 진로계획 · 비교과 → STEP 4 미래설계',
                 [('28', '장'), ('10', '분'), (str(len(awards)), '수상')], grown, '/present')
    section_card(os.path.join(OUT, 'history.jpg'), 'BY GRADE — 학년별 비교과 · 경력', 'History · 2023 — 2026',
                 '연구실 · 인턴십 · 동아리 · 전공 · 창업 · 수상 — 학년마다 한 일',
                 [('4', '연도'), (str(len(projects)), '프로젝트'), (str(len(awards)), '수상')], covers[:4], '/history')
    section_card(os.path.join(OUT, 'works.jpg'), 'PROJECT ARCHIVE — 권용현이 만든 것들', f'Works · 프로젝트 {len(projects)}',
                 '드론 · 모빌리티 · 로봇 · AI · 임베디드 · 창업 — 분야별로 모아 보는 프로젝트 아카이브',
                 [(str(len(projects)), '프로젝트'), (str(len(CATS)), '분야')], covers[:6], '/works')
    section_card(os.path.join(OUT, 'awards.jpg'), 'AWARDS — 수상 기록 · 상장', f'Awards · 수상 {len(awards)}',
                 '연도별 수상 기록과 상장 — 대회 · 등급 · 수여 기관',
                 [(str(len(awards)), '수상'), (str(grand), '대상')], awarded[:4], '/awards')
    section_card(os.path.join(OUT, 'skills.jpg'), 'SKILL MAP — 프로젝트가 증명하는 기술', f'Skills · 기술 {n_skills}',
                 '숙련도 점수 대신 근거를 셉니다 — 기술마다 그 기술을 쓴 프로젝트와 수상을 잇습니다',
                 [(str(n_skills), '기술'), (str(n_domains), '분야'), (str(n_certs), '자격증')], covers[2:6], '/skills')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'{len(os.listdir(OUT))} cards, {total // 1024} KB → {OUT}')


if __name__ == '__main__':
    main()
