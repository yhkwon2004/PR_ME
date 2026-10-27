#!/usr/bin/env python3
"""INFU RETRO 피치덱 그래프를 Python(NumPy)으로 계산하고 Matplotlib으로 그려 고정된 SVG로 내보냅니다.

글자까지 모두 윤곽선(path)으로 저장하므로 서체 · 브라우저 · 화면 크기가 달라도 똑같이 보이고, 확대해도 선명합니다.

  pip install numpy matplotlib
  python3 scripts/infutech-charts.py          # 서체: node_modules의 Pretendard, 없으면 PRETENDARD_DIR

  charts/gyro.svg       부록 A2 — 학습 장비의 자이로 신호와 무게 편차, 자이로로 보정한 뒤의 잔차
  charts/gyro-mini.svg  8장 — 같은 신호를 한 칸에: 보정 전 편차와 보정 뒤 편차 (본 발표용으로 글자를 크게)
  charts/filter.svg   7장 · 흔들림 구간 원신호와 칼만필터 출력 (썸네일)
  charts/cnn-pattern.svg  7장 · CNN이 보는 4×4 상태 패턴 — 정상 · 이상 (썸네일)

자료 그래프(덱의 막대 · 점 그래프는 모두 여기서 그린다 — HTML로 그리지 않는다)
  charts/clinic-24h.svg      3장 · 서울 동물병원 100곳 중 24시간 운영 약 8곳
  charts/dispute.svg         4장 · 동물병원 피해구제 접수 건수 2021 ~ 2026.6
  charts/resolve.svg         4장 · 진료기록 유무별 분쟁 해결률 (이름 · 숫자 · 막대 · 건수까지 한 장)
  charts/causes.svg          4장 · 피해구제 신청 사유(128건) — 진료상 과실의 네 갈래, 1위 처치 미흡
  charts/market.svg          17장 · 시장 규모 TAM · SAM · SOM (곳 수와 금액까지 한 장)
  charts/grade.svg           14장 · 동물용 의료기기 등급 사다리 — INFU RETRO 구조는 1등급(신고)
  charts/dispute-split.svg   부록 A10 · 상담 → 신청 → 처리 → 해결 흐름과 진료부 확보 여부별 해결 · 미해결
  charts/causes-all.svg      부록 A10 · 신청 사유 100% 누적 막대 (진료상 과실 75% + 그 외 25%)
  charts/pivc.svg            부록 A11 · 수액 카테터 합병증 발생률 — 연구 3편 (영국 · 미국 · 이탈리아)
  charts/treat-cost.svg      부록 A12 · 최근 2년 치료비 2023 → 2025 조사 (전체 가구 · 치료비를 쓴 가구)
  charts/signals.svg         부록 A11 · 무게 곡선 예시(모의 신호) — 정상 · 막힘 · 빠짐이 기대 추세에서 벗어나는 모습
  charts/petcost.svg         부록 A12 · 1마리 월 양육비 12.1만 원 중 병원비 3.7만 원(그중 치료 1.4만 원)
  charts/revenue.svg         부록 A12 · 병원 1곳(5대) 연 매출 — 1년차 장비 + 구독, 2년차부터 구독
  charts/visit.svg           12장 · 양육가구 최근 1년 동물병원 이용률 2021 → 2025 (출처의 두 해만)
  charts/cagr.svg            12장 · 동물용 인퓨전펌프 시장 CAGR 조사기관별 전망
  charts/rx.svg · rx-large.svg   12장 · 부록 A8 · 동물병원 의료용 마약류 처방량 2022 ~ 2025
  charts/epoch.svg           11장 · CNN 검증 정확도 최근 6 epoch
  charts/cost-vs.svg · cost-stack.svg · entry.svg   15장 · 제작비 비교 · 원가 구조 · 입원장 5대 도입비

그림 크기(인치)는 덱에서 차지하는 자리(1080p 기준 px ÷ 96)에 맞춰, 글자가 덱 본문과 같은 크기로 보이게 한다.
막대는 한 기준선에서 자라고, 값 쪽 끝만 둥글게(기준선 쪽은 각지게) 그린다 — 막대 사이 · 조각 사이는 2px 틈으로 가른다.

모든 신호는 모의 데이터입니다. 실측 로그(CSV)가 있으면 simulate() 대신 그 값을 넣으면 같은 차트가 나옵니다.
"""
import glob, math, os, re
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.ft2font import LoadFlags
from matplotlib.patches import FancyBboxPatch, PathPatch, Polygon
from matplotlib.path import Path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(ROOT, 'public', 'infutech') if os.path.isdir(os.path.join(ROOT, 'public', 'infutech')) else ROOT
OUT = os.path.join(DECK, 'charts')

INK, INK2, MUTE, HONEY, ALERT, SAGE, RAW = '#2A1F18', '#5B4B3F', '#76665A', '#AD6229', '#D04E2D', '#4C8744', '#A39282'
GRID, LINE = '#EFE7DC', '#CDBFAF'


def simulate(kind, seed):
    """1 Hz 무게 → 칼만필터(흔들림 게이팅) → 초기 감소량 기대 추세 → 이상 점수."""
    s = seed & 0xFFFFFFFF
    def rnd():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return s / 4294967296
    def gauss():
        u = 0.0
        while not u:
            u = rnd()
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * rnd())
    N, W0, q0, T = 3600, 520, 290 / 3600, 1800
    w = W0; ph = rnd() * 6; raw = []
    for t in range(N):
        q = q0
        # 유속 저하: 줄이 꺾이거나 막혀 1분에 걸쳐 38%로 줄어듦
        if kind == 'drop' and t >= T: q = q0 * (1 - 0.62 * min(1, (t - T) / 60))
        # 줄 빠짐: 카테터에서 분리된 줄로 수액이 계속 새어 나감 — 정맥압이 없어 오히려 조금 빨라짐
        if kind == 'line' and t >= T: q = q0 * 1.35
        # 공기 유입 · 역류: 2분 동안 혈액이 줄을 타고 거꾸로 올라옴
        if kind == 'air' and T <= t < T + 120: q = -q0 * 0.5
        w -= q
        m = w + gauss() * 1.4
        if kind == 'shake' and 720 <= t < 1320:
            env = math.sin(math.pi * (t - 720) / 600)
            m += env * (24 * math.sin(2 * math.pi * 0.43 * t + ph) + gauss() * 10)
            if rnd() < 0.012: m += (rnd() - 0.5) * 110
        # 줄 빠짐: 당겨지는 순간의 장력이 몇 초간 무게처럼 더해짐
        if kind == 'line' and T <= t < T + 6: m += 34 * math.exp(-(t - T) / 2.2) + gauss() * 6
        raw.append(m)
    # constant-velocity Kalman filter; large innovations are down-weighted unless they persist (a real level change)
    x0, x1, P00, P01, P11, run, sgn = raw[0], -q0, 25.0, 0.0, 1e-4, 0, 0
    Qw, Qv, R0, kw = 0.004, 4e-6, 1.96, []
    for t in range(N):
        x0 += x1; P00 += 2 * P01 + P11 + Qw; P01 += P11; P11 += Qv
        inn = raw[t] - x0; z = abs(inn) / math.sqrt(P00 + R0)
        sg = (inn > 0) - (inn < 0)
        run = run + 1 if z > 2 and sg == sgn else (1 if z > 2 else 0); sgn = sg
        R = R0 * (z / 3) ** 4 if z > 3 and run < 6 else R0
        S = P00 + R; K0 = P00 / S; K1 = P01 / S
        x0 += K0 * inn; x1 += K1 * inn
        P00, P01, P11 = (1 - K0) * P00, (1 - K0) * P01, P11 - K1 * P01
        kw.append(x0)
    tt = np.arange(30, 301); rate, b = np.polyfit(tt, np.array(kw)[30:301], 1)
    exp = b + rate * np.arange(N)
    # anomaly score: stands in for the CNN classifier's response to each situation
    score, e = [], 0.06
    for t in range(N):
        tgt = 0.07
        if kind == 'shake' and 720 <= t < 1320: tgt += 0.27 * math.sin(math.pi * (t - 720) / 600) ** 1.5
        if kind == 'drop' and t >= T + 15: tgt = 0.07 + 0.86 * (1 - math.exp(-(t - T - 15) / 35))
        if kind == 'line' and t >= T + 2: tgt = 0.93   # 장력 스파이크 2~3샘플을 보고 판별
        if kind == 'air' and t >= T: tgt = 0.84 if t < T + 120 else 0.08
        tau = 1.6 if kind in ('line', 'air') and T <= t < T + 120 else 18
        e += (tgt - e) / tau
        score.append(max(0.01, min(0.99, e + gauss() * 0.018)))
    return np.array(raw), np.array(kw), exp, np.array(score)


def use_font():
    dirs = [os.environ.get('PRETENDARD_DIR', ''), os.path.join(ROOT, 'node_modules', 'pretendard', 'dist', 'public', 'static')]
    files = [f for d in dirs if d for f in glob.glob(os.path.join(d, 'Pretendard-*.otf'))]
    if not files:
        raise SystemExit('Pretendard OTF가 없습니다 — npm ci 하거나 PRETENDARD_DIR=<Pretendard-*.otf 폴더>')
    for f in files:
        font_manager.fontManager.addfont(f)
    plt.rcParams.update({
        'font.family': 'Pretendard', 'font.size': 9, 'axes.unicode_minus': False,
        'svg.fonttype': 'path', 'svg.hashsalt': 'infu-retro',  # 글자는 윤곽선으로, 결과는 매번 같게
        'axes.edgecolor': LINE, 'axes.linewidth': .8, 'axes.labelcolor': INK2,
        'xtick.color': LINE, 'ytick.color': LINE, 'xtick.labelcolor': MUTE, 'ytick.labelcolor': MUTE,
        'xtick.major.size': 3, 'ytick.major.size': 3,
    })


def save(fig, name, fills=None, blurs=None):
    """fills: {gid: (x1, y1, x2, y2, [(offset, colour, opacity), ...])} — that patch gets an SVG linear gradient
    (bounding-box units, like CSS); blurs: {gid: σ px} — that patch is blurred into a soft shadow"""
    path = os.path.join(OUT, name)
    fig.savefig(path, format='svg', transparent=True, metadata={'Date': None, 'Creator': None})
    plt.close(fig)
    if fills or blurs:
        svg, defs = open(path, encoding='utf-8').read(), []
        for gid, (x1, y1, x2, y2, stops) in (fills or {}).items():
            defs.append(f'<linearGradient id="{gid}-fill" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
                        + ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
                        + '</linearGradient>')
            svg, n = re.subn(rf'(<g id="{gid}">\s*<path [^>]*?style="fill: )#[0-9a-f]{{6}}', rf'\1url(#{gid}-fill)', svg, count=1)
            assert n == 1, gid
        for gid, sd in (blurs or {}).items():
            defs.append(f'<filter id="{gid}-blur" x="-40%" y="-80%" width="180%" height="260%">'
                        f'<feGaussianBlur stdDeviation="{sd * .75:g}"/></filter>')  # px → pt, the SVG's units
            assert f'<g id="{gid}">' in svg, gid
            svg = svg.replace(f'<g id="{gid}">', f'<g id="{gid}" filter="url(#{gid}-blur)">', 1)
        svg = svg.replace('<defs>', '<defs>\n  ' + '\n  '.join(defs), 1)
        open(path, 'w', encoding='utf-8').write(svg)
    print(path, os.path.getsize(path) // 1024, 'KB')


def gyro_signals():
    # training rig, 12 s at 20 Hz: two pushes on the pole; the load cell's deviation follows the gyro rate
    rng = np.random.default_rng(7)
    t = np.arange(0, 12, 1 / 20)
    env = np.exp(-((t - 3) ** 2) / 1.6) + .7 * np.exp(-((t - 8.2) ** 2) / 1.1)
    gyro = 38 * env * np.sin(2 * np.pi * 1.15 * t) + rng.normal(0, 1.2, t.size)            # deg/s
    lag = 2
    dev = .2 * np.roll(gyro, lag) + .006 * np.gradient(gyro, t) + rng.normal(0, .55, t.size)  # g
    dev[:lag] = rng.normal(0, .55, lag)
    # learn the gyro → deviation relation by least squares on lagged gyro and its derivative
    X = np.column_stack([np.roll(gyro, k) for k in range(4)] + [np.gradient(gyro, t), np.ones_like(t)])
    coef, *_ = np.linalg.lstsq(X[4:], dev[4:], rcond=None)
    res = dev - X @ coef
    r = float(np.corrcoef(np.roll(gyro, lag)[4:], dev[4:])[0, 1])
    rms0, rms1 = float(np.sqrt(np.mean(dev[4:] ** 2))), float(np.sqrt(np.mean(res[4:] ** 2)))
    return t, gyro, dev, res, r, rms0, rms1


def chart_gyro():
    t, gyro, dev, res, r, rms0, rms1 = gyro_signals()
    lim = float(max(abs(dev).max(), abs(res).max()) * 1.15)
    fig, axs = plt.subplots(3, 1, sharex=True, figsize=(7.2, 4.4), gridspec_kw=dict(hspace=.62))
    rows = [(gyro, SAGE, '자이로 각속도 (°/s)', '흔들림 두 번', MUTE),
            (dev, HONEY, '같은 시각 무게 편차 (g)', f'r = {r:.2f} · 자이로와 상관', HONEY),
            (res, INK, '자이로로 보정한 뒤 (g)', f'편차 RMS {rms0:.1f} g → {rms1:.1f} g', INK)]
    for ax, (y, col, left, right, rc) in zip(axs, rows):
        ax.plot(t, y, color=col, lw=1.3, solid_joinstyle='round')
        ax.set_title(left, loc='left', fontsize=9.5, fontweight='semibold', color=INK2, pad=5)
        ax.set_title(right, loc='right', fontsize=9.5, fontweight='bold', color=rc, pad=5)
        ax.grid(axis='y', color=GRID, lw=.8)
        ax.set_axisbelow(True)
        for side in ('top', 'right'):
            ax.spines[side].set_visible(False)
        ax.tick_params(labelsize=8)
    axs[0].set_ylim(-46, 46); axs[0].set_yticks([-40, 0, 40])
    for ax in axs[1:]:
        ax.set_ylim(-lim, lim); ax.set_yticks([-5, 0, 5])
    axs[2].set_xlim(0, 12); axs[2].set_xticks(range(0, 13, 2))
    axs[2].set_xlabel('시간 (s) · 20 Hz 샘플링', fontsize=8.5, color=INK2, labelpad=4)
    fig.subplots_adjust(left=.075, right=.985, top=.93, bottom=.11)
    return fig, (r, rms0, rms1)


def chart_gyro_mini():
    # one panel for the main talk: the deviation the shaking leaves, before and after the learned correction
    t, gyro, dev, res, r, rms0, rms1 = gyro_signals()
    fig, ax = plt.subplots(figsize=(5.6, 2.5))
    ax.plot(t, dev, color=HONEY, lw=1.6, label=f'보정 전 · RMS {rms0:.1f} g')
    ax.plot(t, res, color=INK, lw=1.6, label=f'보정 후 · RMS {rms1:.1f} g')
    ax.set_title('흔들림이 만든 무게 편차 (g)', loc='left', fontsize=11, fontweight='semibold', color=INK2, pad=6)
    ax.set_title(f'자이로와 상관 r = {r:.2f}', loc='right', fontsize=11, fontweight='bold', color=HONEY, pad=6)
    lim = float(max(abs(dev).max(), abs(res).max()) * 1.15)
    ax.set_ylim(-lim, lim * 1.6); ax.set_yticks([-5, 0, 5])  # headroom above the traces for the legend
    ax.set_xlim(0, 12); ax.set_xticks(range(0, 13, 2))
    ax.set_xlabel('시간 (s) · 학습 장비 20 Hz', fontsize=10, color=INK2, labelpad=3)
    ax.grid(axis='y', color=GRID, lw=.8); ax.set_axisbelow(True)
    for side in ('top', 'right'):
        ax.spines[side].set_visible(False)
    ax.tick_params(labelsize=9.5)
    leg = ax.legend(loc='upper right', ncol=2, fontsize=10, frameon=False, handlelength=1.4, columnspacing=1.2, borderaxespad=.1)
    for txt, col in zip(leg.get_texts(), (HONEY, INK)):
        txt.set_color(col)
    fig.subplots_adjust(left=.075, right=.985, top=.86, bottom=.22)
    return fig


BAR_OFF, BAR_DIM = '#E3D8CB', '#D9CBBA'


def px(w, h):
    """figure size for a box of w × h px on the 1080p stage (SVG renders 1 in = 96 px)"""
    return (w / 96, h / 96)


def chart_clinic24h():
    # 100 dots, 8 lit: 24-hour clinics in Seoul (7.95%)
    fig = plt.figure(figsize=px(300, 71))
    ax = fig.add_axes([0, 0, 1, 1])
    k = np.arange(100)
    ax.scatter(k % 20, -(k // 20), s=58, c=[HONEY if i < 8 else '#E6DCCF' for i in k], linewidths=0)
    ax.set_xlim(-.6, 19.6); ax.set_ylim(-4.6, .6); ax.axis('off')
    return fig


def chart_dispute():
    vals = [9, 20, 11, 16, 27, 45]
    labs = ['2021', '2022', '2023', '2024', '2025', '2026\n1~6월']
    return columns(vals, labs, (606, 559), {5}, lambda v: f'{v}', value_px=20, label_px=16.5)


# ---- figures laid out in px like the deck's HTML: text runs on a baseline, rounded boxes, pills ----
PT = .75  # 1 px on the 1080p stage = .75 pt
WEIGHT = {400: 'regular', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extra bold'}


def canvas(w, h):
    """w × h px figure whose data coordinates are px from its top-left corner"""
    fig = plt.figure(figsize=px(w, h))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, w); ax.set_ylim(h, 0); ax.axis('off')
    return fig, ax


def advance(s, size, weight):
    """advance width in px of s set at size px — what the browser lays out, so runs can follow each other"""
    font = font_manager.get_font(font_manager.findfont(font_manager.FontProperties(family='Pretendard', weight=WEIGHT[weight])))
    font.set_size(size, 72)
    return sum(font.load_char(ord(c), flags=LoadFlags.NO_HINTING).linearHoriAdvance / 65536 for c in s)


def say(ax, x, y, runs, ha='left', z=3):
    """one line with its baseline at y: runs of (text, size px, weight, colour[, letter-spacing em, gap em]);
    letter-spacing is set glyph by glyph as CSS does. Returns the line's width."""
    runs = [r + (0, 0)[len(r) - 4:] if len(r) < 6 else r for r in runs]
    width = sum(g * sz + advance(t, sz, w) + tr * sz * len(t) for t, sz, w, _, tr, g in runs)
    x0 = x - width if ha == 'right' else x - width / 2 if ha == 'center' else x
    for t, sz, w, col, tr, g in runs:
        x0 += g * sz
        for piece in (t if tr else [t]):
            ax.text(x0, y, piece, fontsize=sz * PT, fontweight=WEIGHT[w], color=col, ha='left', va='baseline', zorder=z)
            x0 += advance(piece, sz, w) + tr * sz * len(piece)
    return width


def rbox(ax, x, y, w, h, r, z=1, gid=None, **kw):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f'round,pad=0,rounding_size={r}', zorder=z, gid=gid, **kw)
    ax.add_patch(p)
    return p


def shape(x0, y0, x1, y1, tl=0, tr=0, br=0, bl=0):
    """rectangle (px, y down) with its own radius on each corner — bars round only their data end"""
    v = [(x0 + tl, y0), (x1 - tr, y0), (x1, y0), (x1, y0 + tr), (x1, y1 - br), (x1, y1), (x1 - br, y1),
         (x0 + bl, y1), (x0, y1), (x0, y1 - bl), (x0, y0 + tl), (x0, y0), (x0 + tl, y0), (x0 + tl, y0)]
    c = [Path.MOVETO, Path.LINETO, Path.CURVE3, Path.CURVE3, Path.LINETO, Path.CURVE3, Path.CURVE3,
         Path.LINETO, Path.CURVE3, Path.CURVE3, Path.LINETO, Path.CURVE3, Path.CURVE3, Path.CLOSEPOLY]
    return Path(v, c)


def columns(values, labels, size, hl, fmt, value_px=20, label_px=16, bar_px=56, fill=BAR_OFF):
    """vertical bars from one baseline (rounded data end, square on the baseline), the value on each cap and the
    category under it; bars in hl are honey, the others `fill`"""
    W, H = size
    fig, ax = canvas(W, H)
    lines = max(l.count('\n') + 1 for l in labels)
    base = H - 10 - label_px * 1.25 * lines   # the category labels sit under the baseline
    room = base - value_px * 1.9                # the tallest bar leaves room for its value
    band = W / len(values)
    ax.plot([0, W], [base, base], color=LINE, lw=PT, solid_capstyle='butt', zorder=3)
    for k, (v, lab) in enumerate(zip(values, labels)):
        xc, top, on = band * (k + .5), base - room * v / max(values), k in hl
        r = min(6, bar_px / 2)
        ax.add_patch(PathPatch(shape(xc - bar_px / 2, top, xc + bar_px / 2, base, tl=r, tr=r), facecolor=HONEY if on else fill, lw=0, zorder=2))
        say(ax, xc, top - value_px * .45, [(fmt(v), value_px, 700, HONEY if on else INK2)], ha='center')
        for i, line in enumerate(lab.split('\n')):
            say(ax, xc, base + 8 + label_px * (.95 + 1.25 * i), [(line, label_px, 400, MUTE)], ha='center')
    return fig


def hbars(rows, size, label_w=None, value_px=17, label_px=16, bar_px=24):
    """horizontal bars from one left baseline with a rounded data end, one row per
    (label, value, text, colour, label colour, hatch). The label sits left of the bar (label_w px wide)
    or, with label_w=None, on its own line above it so the bars get the full width."""
    W, H = size
    fig, ax = canvas(W, H)
    n, vmax = len(rows), max(r[1] for r in rows)
    x0 = label_w or 0
    room = W - x0 - max(advance(r[2], value_px, 700) for r in rows) - 12
    for k, (lab, v, txt, col, lcol, hatch) in enumerate(rows):
        row = H / n
        weight = 700 if lcol == HONEY else 500
        if label_w:
            cy = row * (k + .5)
            say(ax, x0 - 14, cy + .36 * label_px, [(lab, label_px, weight, lcol)], ha='right')
        else:
            cy = row * k + label_px * 1.3 + bar_px / 2
            say(ax, 0, row * k + label_px * .95, [(lab, label_px, weight, lcol)])
        end = x0 + room * v / vmax
        r = min(6, bar_px / 2)
        ax.add_patch(PathPatch(shape(x0, cy - bar_px / 2, end, cy + bar_px / 2, tr=r, br=r), facecolor=col,
                               edgecolor='#FFFFFF' if hatch else 'none', hatch=hatch, lw=0, zorder=2))
        say(ax, end + 10, cy + .36 * value_px, [(txt, value_px, 700, HONEY if lcol == HONEY else INK)])
    return fig


def pill(ax, right, cy, text, size, col, bg, z):
    """CSS pill: padding .22em .75em, fully rounded, text right edge at right − padding"""
    w = advance(text, size, 800)
    h = size * 1.2 + size * .44
    rbox(ax, right - w - size * 1.5, cy - h / 2, w + size * 1.5, h, h / 2, z=z, color=bg, lw=0)
    say(ax, right - size * .75, cy + size * .37, [(text, size, 800, col)], ha='right', z=z + .1)


def chart_resolve():
    # 진료기록 유무별 분쟁 해결률: 두 칸에 이름 · 해결률 · 막대 · 건수 (4장 오른쪽 카드 폭 575 px)
    W, H, GAP = 575, 211, 32
    cw = (W - GAP) / 2
    fig, ax = canvas(W, H)
    for k, (lab, rate, cases, bar, num) in enumerate([('기록 있음', 30, '80건 중 24건 해결', HONEY, HONEY),
                                                    ('기록 없음', 19.5, '41건 중 8건 해결', '#B8A797', INK2)]):
        x = k * (cw + GAP)
        say(ax, x, 20, [(lab, 20, 600, INK2)])
        say(ax, x, 122, [(f'{rate:g}', 92, 800, num, -.045), ('%', 38.6, 700, num, 0, .06)])
        rbox(ax, x, 166, cw, 16, 8, color='#F2E5D9' if k == 0 else '#F0ECE7', lw=0)  # track: a light step of the bar's hue
        rbox(ax, x, 166, cw * rate / 100, 16, 8, z=2, color=bar, lw=0)
        say(ax, x, 203, [(cases, 16.8, 400, MUTE)])
    return fig


# 한국소비자원 동물병원 소비자피해 분석(2026.9, 2021~2026.6): 피해구제 128건 기준 신청 사유 — 진료상 과실 96건(75%)
CAUSES = [('처치 미흡', 32.0), ('수술 부작용', 26.6), ('진단 과실', 10.2), ('안전사고', 6.2)]


def chart_causes():
    # 4장 오른쪽 카드 아래(폭 575 px): 진료상 과실의 네 갈래 — 1위 처치 미흡만 honey
    rows = [(lab, v, f'{v:.1f}%', HONEY if k == 0 else BAR_DIM, HONEY if k == 0 else INK2, None) for k, (lab, v) in enumerate(CAUSES)]
    return hbars(rows, (575, 124), label_w=104, value_px=16.5, label_px=16, bar_px=15)


def chart_dispute_split():
    # 부록 A10 (529 × 606 px): 위 — 상담에서 해결까지 네 단계, 아래 — 처리 완료 121건을 진료부 확보 여부로 나눈 해결 · 미해결
    W, H = 529, 606
    fig, ax = canvas(W, H)
    steps = [('1,941', '상담'), ('128', '피해구제 신청'), ('121', '처리 완료'), ('32', '분쟁 해결')]
    bw, gap = 112, (W - 4 * 112) / 3
    for k, (num, lab) in enumerate(steps):
        x, last = k * (bw + gap), k == len(steps) - 1
        rbox(ax, x, 0, bw, 84, 12, color='#FBEBDD' if last else '#F4EEE7', lw=0)
        say(ax, x + bw / 2, 42, [(num, 27, 800, HONEY if last else INK)], ha='center')
        say(ax, x + bw / 2, 68, [(lab, 14.5, 600, HONEY if last else MUTE)], ha='center')
        if not last:  # arrow to the next step
            ax.annotate('', xy=(x + bw + gap - 3, 42), xytext=(x + bw + 3, 42),
                        arrowprops=dict(arrowstyle='-|>', color=LINE, lw=1.4, mutation_scale=11, shrinkA=0, shrinkB=0))
    say(ax, 0, 146, [('처리 완료 121건 — 진료부 확보 여부별', 17, 700, INK)])
    for k, (lab, col) in enumerate((('해결', HONEY), ('해결 못 함', '#E6DBCD'))):  # legend
        x = 0 if k == 0 else 74
        rbox(ax, x, 166, 13, 13, 3, color=col, lw=0)
        say(ax, x + 20, 178, [(lab, 14.5, 500, INK2)])
    rows = [('전체', 121, 32), ('진료부 확보', 80, 24), ('진료부 미확보', 41, 8)]
    room = W - advance('해결 26.4%', 17, 700) - 14
    for k, (lab, n, ok) in enumerate(rows):
        top = 218 + k * 130
        say(ax, 0, top + 16, [(lab, 16.5, 700, INK), (f'  {n}건', 15, 500, MUTE)])
        y0, y1 = top + 30, top + 30 + 38
        full, w_ok = room * n / 121, room * ok / 121
        ax.add_patch(PathPatch(shape(0, y0, w_ok - 1, y1), facecolor=HONEY, lw=0))
        ax.add_patch(PathPatch(shape(w_ok + 1, y0, full, y1, tr=6, br=6), facecolor='#E6DBCD', lw=0))
        say(ax, w_ok / 2, (y0 + y1) / 2 + .36 * 15, [(f'{ok}', 15, 700, '#FFFFFF')], ha='center')
        if full - w_ok > 30:
            say(ax, (w_ok + full) / 2, (y0 + y1) / 2 + .36 * 15, [(f'{n - ok}', 15, 600, INK2)], ha='center')
        say(ax, full + 12, (y0 + y1) / 2 + .36 * 17, [(f'해결 {ok / n * 100:.1f}%', 17, 700, HONEY if k else INK)])
    return fig


def chart_causes_all():
    # 부록 A10 (466 × 606 px): 신청 사유 128건을 한 기둥에 — 진료상 과실 네 갈래(75%)와 그 외(25%), 조각 사이 2px 틈
    W, H = 466, 606
    fig, ax = canvas(W, H)
    parts = CAUSES + [('그 외', 25.0)]
    x0, x1, top, bottom, GAP = 150, 262, 8, 598, 2
    span = bottom - top - GAP * (len(parts) - 1)
    y = top
    for k, (lab, v) in enumerate(parts):
        h = span * v / 100
        col = HONEY if k == 0 else ('#EFD3B4' if k < 4 else '#E6DBCD')
        r = 8
        ax.add_patch(PathPatch(shape(x0, y, x1, y + h, tl=r if k == 0 else 0, tr=r if k == 0 else 0,
                                     bl=r if k == len(parts) - 1 else 0, br=r if k == len(parts) - 1 else 0), facecolor=col, lw=0))
        cy = y + h / 2
        say(ax, x1 + 16, cy + .36 * 17, [(lab, 17, 700 if k == 0 else 600, HONEY if k == 0 else INK), (f'  {v:.1f}%', 17, 700, HONEY if k == 0 else INK2)])
        y += h + GAP
    fault = span * .75 + GAP * 3   # bracket: the four kinds of clinical fault
    ax.plot([x0 - 14, x0 - 22, x0 - 22, x0 - 14], [top, top, top + fault, top + fault], color=LINE, lw=1.1 * PT * 1.4, zorder=1)
    say(ax, x0 - 34, top + fault / 2 - 4, [('진료상 과실', 16, 700, INK)], ha='right')
    say(ax, x0 - 34, top + fault / 2 + 20, [('75% · 96건', 16, 700, HONEY)], ha='right')
    return fig


def chart_pivc():
    # 부록 A11 (529 × 606 px): 수액 카테터 합병증 발생률 — 연구 3편, 카테터 기준. 발표에 쓴 영국 다기관 연구만 honey
    W, H = 529, 606
    fig, ax = canvas(W, H)
    studies = [('이탈리아 테라모 대학병원 · 2022', '개 76 · 고양이 40 · 6개월 전향 연구', 46.6, False, []),
               ('영국 19개 기관 다기관 연구 · 2024', '카테터 382개 · 개 325 · 고양이 57', 26.7, True, []),
               ('미국 CSU 대학병원 · 2023', '개 396마리 · 카테터 412개', 19.9, False, [('중환자실', 24.2), ('중간 병동', 13.1)])]
    room = W - advance('46.6%', 20, 800) - 14
    BAR, SUB = 36, 12
    heights = [58 + BAR + len(subs) * (SUB + 12) for *_, subs in studies]
    gap = (H - 6 - sum(heights)) / (len(studies) - 1)   # spread the studies over the card
    y = 4
    for (title, detail, v, main, subs), h in zip(studies, heights):
        say(ax, 0, y + 18, [(title, 17.5, 700, HONEY if main else INK)])
        say(ax, 0, y + 43, [(detail, 15, 500, MUTE)])
        y0 = y + 58
        w = room * v / 46.6
        ax.add_patch(PathPatch(shape(0, y0, w, y0 + BAR, tr=6, br=6), facecolor=HONEY if main else BAR_DIM, lw=0))
        say(ax, w + 12, y0 + BAR / 2 + .36 * 20, [(f'{v:.1f}%', 20, 800, HONEY if main else INK)])
        ys = y0 + BAR
        for lab, sv in subs:   # ward split, thinner bars under the study's bar
            ys += 12
            sw = room * sv / 46.6
            ax.add_patch(PathPatch(shape(0, ys, sw, ys + SUB, tr=4, br=4), facecolor='#E6DBCD', lw=0))
            say(ax, sw + 10, ys + SUB / 2 + .36 * 14.5, [(f'{lab} {sv:.1f}%', 14.5, 600, INK2)])
            ys += SUB
        y += h + gap
    return fig


def chart_signals():
    # 부록 A11 세 번째 카드(457 × 232 px): 기대 추세와의 차이(g), 모의 신호 20분 — 막힘은 덜 줄고, 빠짐은 당김이 튄 뒤 더 빨리 줆
    W, H = 457, 232
    fig, ax = canvas(W, H)
    rows = [('정상', 'normal', 11), ('막힘 · 꺾임', 'drop', 12), ('빠짐 · 줄 끊김', 'line', 13)]
    t0, t1, T = 1500, 2700, 1800
    lab_w, rh = 116, H / 3
    scale = rh * .5 / 45                        # the same g scale in every row: ±45 g fills a row
    xs = lambda t: lab_w + (t - t0) / (t1 - t0) * (W - lab_w - 2)
    for k, (lab, kind, seed) in enumerate(rows):
        raw, kw, exp, score = simulate(kind, seed)
        cy = rh * (k + .5)
        say(ax, 0, cy + .36 * 15.5, [(lab, 15.5, 700 if k else 600, INK if k else INK2)])
        rbox(ax, lab_w, cy - 5 * scale, W - lab_w - 2, 10 * scale, 2, color='#F2EBE2', lw=0)   # ±5 g: within normal
        ax.plot([lab_w, W - 2], [cy, cy], color=LINE, lw=.6, zorder=1)
        if k:
            ax.plot([xs(T), xs(T)], [cy - rh * .46, cy + rh * .46], color=LINE, lw=.9, ls=(0, (2, 2)), zorder=1)
        dev = np.convolve(raw - exp, np.ones(5) / 5, mode='same')   # 5-second moving average of the measured weight
        t = np.arange(t0, t1, 2)
        ax.plot(xs(t), cy - dev[t] * scale, color=HONEY if k else INK2, lw=2 * PT * 1.25, solid_joinstyle='round', zorder=2)
    say(ax, xs(T) + 5, H - 3, [('이상 시작', 12.5, 600, MUTE)])
    return fig


def chart_treat_cost():
    # 부록 A12 (529 × 632 px): 최근 2년 치료비(만 원) — KB 2023 · 2025 조사, 전체 가구 평균과 치료비를 쓴 가구 평균
    W, H = 529, 632
    fig, ax = canvas(W, H)
    for k, (lab, col) in enumerate((('2023 조사', BAR_DIM), ('2025 조사', HONEY))):  # legend
        x = k * 110
        rbox(ax, x, 4, 13, 13, 3, color=col, lw=0)
        say(ax, x + 20, 16, [(lab, 14.5, 500, INK2)])
    groups = [('전체 가구 평균', 57.7, 102.7), ('치료비를 쓴 가구 평균', 78.7, 146.3)]
    base, top, bar, inner = 560, 92, 76, 12
    ax.plot([0, W], [base, base], color=LINE, lw=PT, solid_capstyle='butt', zorder=3)
    for g, (lab, a, b) in enumerate(groups):
        xc = W * (g + .5) / 2
        for j, (v, col) in enumerate(((a, BAR_DIM), (b, HONEY))):
            x = xc - inner / 2 - bar if j == 0 else xc + inner / 2
            yt = base - (base - top) * v / 146.3
            ax.add_patch(PathPatch(shape(x, yt, x + bar, base, tl=6, tr=6), facecolor=col, lw=0, zorder=2))
            say(ax, x + bar / 2, yt - 10, [(f'{v:g}만', 18, 700, HONEY if j else INK2)], ha='center')
        say(ax, xc, base + 30, [(lab, 16, 600, INK2)], ha='center')
        say(ax, xc, base + 54, [(f'{b / a:.1f}배', 15, 700, HONEY)], ha='center')
    return fig


def chart_petcost():
    # 부록 A12 (468 × 112 px): 1마리 월 양육비 12.1만 원 — 병원비 3.7만 원(31%, 그중 사고 · 상해 · 질병 치료 1.4만 원)과 그 외 8.4만 원
    W, H, GAP = 468, 112, 2
    fig, ax = canvas(W, H)
    parts = [(1.4, HONEY, '치료 1.4만'), (2.3, '#EFD3B4', '그 외 병원비 2.3만'), (8.4, '#E6DBCD', '병원비 외 8.4만')]
    total, x, y0, y1 = 12.1, 0, 40, 76
    span = W - GAP * (len(parts) - 1)
    edges = []
    for k, (v, col, lab) in enumerate(parts):
        w = span * v / total
        l, r = (6 if k == 0 else 0), (6 if k == len(parts) - 1 else 0)
        ax.add_patch(PathPatch(shape(x, y0, x + w, y1, tl=l, bl=l, tr=r, br=r), facecolor=col, lw=0))
        edges.append((x, x + w))
        x += w + GAP
    say(ax, 0, 101, [(parts[0][2], 14.5, 700, HONEY)])
    # the treatment slice is narrow: its neighbour's label starts after the first label, not at the slice edge
    say(ax, max(edges[1][0], advance(parts[0][2], 14.5, 700) + 14), 101, [(parts[1][2], 14.5, 600, INK2)])
    say(ax, W, 101, [(parts[2][2], 14.5, 600, INK2)], ha='right')
    hx = edges[1][1]   # bracket over the hospital share
    ax.plot([0, 0, hx, hx], [y0 - 6, y0 - 12, y0 - 12, y0 - 6], color=HONEY, lw=1.2, zorder=1)
    say(ax, 0, y0 - 19, [('병원비 3.7만 원 · 31%', 15.5, 800, HONEY)])
    return fig


def chart_revenue():
    # 부록 A12 (457 × 206 px): 병원 1곳(입원장 5대) 연 매출 — 1년차 장비 125만 + 구독 720만, 2년차부터 구독 720만
    W, H = 457, 206
    fig, ax = canvas(W, H)
    for k, (lab, col) in enumerate((('구독(관리비 포함)', HONEY), ('장비', '#EFD3B4'))):  # legend
        x = 0 if k == 0 else 150
        rbox(ax, x, 2, 13, 13, 3, color=col, lw=0)
        say(ax, x + 20, 14, [(lab, 14.5, 500, INK2)])
    years = [('1년차', 720, 125), ('2년차', 720, 0), ('3년차', 720, 0)]
    base, top, bar = 176, 52, 84
    ax.plot([0, W], [base, base], color=LINE, lw=PT, solid_capstyle='butt', zorder=3)
    scale = (base - top) / 845
    for k, (lab, sub, equip) in enumerate(years):
        xc = W * (k + .5) / 3
        y_sub = base - sub * scale
        ax.add_patch(PathPatch(shape(xc - bar / 2, y_sub, xc + bar / 2, base, tl=0 if equip else 6, tr=0 if equip else 6), facecolor=HONEY, lw=0, zorder=2))
        if equip:
            y_eq = y_sub - 2 - equip * scale
            ax.add_patch(PathPatch(shape(xc - bar / 2, y_eq, xc + bar / 2, y_sub - 2, tl=6, tr=6), facecolor='#EFD3B4', lw=0, zorder=2))
        say(ax, xc, (y_eq if equip else y_sub) - 9, [(f'{sub + equip}만', 17, 700, INK)], ha='center')
        say(ax, xc, base + 22, [(lab, 15, 600, INK2)], ha='center')
    return fig


def chart_market():
    # 17장 시장 규모: TAM · SAM · SOM 상자를 계단처럼 겹치고 왼쪽에 위로 커지는 화살표 (덱의 자리 553 × 763 px)
    W, H = 553, 763
    fig, ax = canvas(W, H)
    top = H * .04
    arrow = [(15, 0), (30, 34), (20, 34), (20, 300), (10, 300), (10, 34), (0, 34)]
    ax.add_patch(Polygon([(8 + x / 30 * 52, top + y / 300 * (H - top)) for x, y in arrow], closed=True, color='#A9723F', lw=0, gid='arrow'))
    tiers = [  # left, top, height; label, value, money; box colour; text colours; pill background; shadow opacity
        (88, 0, 301, 'TAM · 전국 동물병원', '5,312곳', '약 449억 원', '#F2EADF', (INK2, INK, HONEY), (173 / 255, 98 / 255, 41 / 255, .12), 0),
        (136, 284, 247, 'SAM · 호남권', '약 300곳', '약 25억 원', '#EAD9C3', (INK2, INK, HONEY), (173 / 255, 98 / 255, 41 / 255, .12), .08),
        (184, 515, 248, 'SOM · 3년', '50곳 · 250대', '약 4.2억 원', '#B46A2F', ((1, 1, 1, .85), '#FFFFFF', '#FFFFFF'), (1, 1, 1, .2), .18)]
    for k, (x, y, h, lab, val, money, fill, (c_lab, c_val, c_money), bg, shadow) in enumerate(tiers):
        z = 2 + k * 3
        if shadow:  # box-shadow: 0 −.6em 1.6em — cast upward onto the tier behind
            rbox(ax, x, y - 12, W - x, h, 20, z=z - 1, gid=f'sh{k}', color='#5C3E24', alpha=shadow, lw=0)
        rbox(ax, x, y, W - x, h, 20, z=z, gid=f't{k}', facecolor=fill, edgecolor='#E6DBCD' if k == 0 else 'none', lw=PT if k == 0 else 0)
        cy, right = y + h / 2, W - 28
        say(ax, right, cy - 41.8, [(lab, 17.2, 600, c_lab)], ha='right', z=z + .2)
        say(ax, right, cy + 11, [(val, 50, 800, c_val, -.035)], ha='right', z=z + .2)
        pill(ax, right, cy + 41, money, 20.4, c_money, bg, z + .2)
    return fig


def chart_visit():
    # only the two years the source gives: 2021 73.0% and 2025 95.1%
    fig = plt.figure(figsize=px(331, 64))
    ax = fig.add_axes([.02, .02, .96, .96])
    ax.plot([0, 1], [73.0, 95.1], color=HONEY, lw=2.4, solid_capstyle='round', zorder=2)
    ax.scatter([0, 1], [73.0, 95.1], s=[36, 64], color=[BAR_DIM, HONEY], zorder=3, linewidths=0)
    ax.text(.04, 73.0 - 1.5, '2021  73.0%', ha='left', va='top', fontsize=10.5, color=MUTE)
    ax.text(.96, 95.1 + 1.5, '2025  95.1%', ha='right', va='bottom', fontsize=10.5, fontweight='bold', color=HONEY)
    ax.set_xlim(-.03, 1.03); ax.set_ylim(58, 112); ax.axis('off')
    return fig


def chart_cagr():
    # four firms' forecasts in one colour — the point is that all of them grow, not the highest one
    vals = [12.3, 7.4, 7.2, 6.55]
    labs = ['Data\nBridge', 'Grand\nView', 'GM\nInsights', 'MRF']
    return columns(vals, labs, (402, 603), set(), lambda v: f'{v:g}%', value_px=19, label_px=16, fill='#E9BE8C')


RX = [257.6, 299.2, 323.6, 353.0]
def chart_rx(size, large=False):
    labs = ['2022', '2023', '2024', '2025']
    fmt = (lambda v: f'{v:g}') if large else (lambda v: f'{v:g}만')
    return columns(RX, labs, size, {3}, fmt, value_px=20 if large else 16.5, label_px=16.5 if large else 15.5,
                   bar_px=84 if large else 60)


def chart_epoch():
    # validation accuracy of the last six epochs, as dots on a 94–100% scale (not bars on a cut axis)
    acc = [95.66, 99.0, 95.24, 97.29, 97.41, 99.0]
    mean = sum(acc) / len(acc)
    fig, ax = plt.subplots(figsize=px(339, 104))
    x = np.arange(6)
    ax.plot([-.4, 5.3], [mean, mean], color=HONEY, lw=1.1, ls=(0, (3, 2.5)), zorder=1)
    ax.text(5.45, mean, f'평균 {mean:.1f}', ha='left', va='center', fontsize=10, fontweight='bold', color=HONEY)
    ax.plot(x, acc, color=BAR_DIM, lw=1.4, zorder=2)
    ax.scatter(x, acc, s=34, color=HONEY, zorder=3, linewidths=0)
    ax.set_xticks(x, [f'E{e}' for e in range(62, 68)])
    ax.set_yticks([95, 99]); ax.set_ylim(94, 100.2); ax.set_xlim(-.4, 6.6)
    ax.tick_params(axis='both', labelsize=9.5, labelcolor=MUTE, length=0, pad=3)
    for side in ('top', 'right', 'left', 'bottom'):
        ax.spines[side].set_visible(False)
    ax.grid(axis='y', color=GRID, lw=.8); ax.set_axisbelow(True)
    fig.subplots_adjust(left=.07, right=.8, top=.96, bottom=.2)
    return fig


def chart_cost_vs():
    plt.rcParams['hatch.color'] = '#FFFFFF'; plt.rcParams['hatch.linewidth'] = 2
    return hbars([('다중 센서 스마트 폴대 · 제작비', 100, '100만 원+', BAR_DIM, INK2, '//'),
                  ('INFU RETRO · 실질 판매원가', 8, '8만 원', HONEY, HONEY, None)], (787, 84), label_w=236,
                 value_px=17.5, label_px=16.5, bar_px=26)


def chart_cost_stack():
    # 원가 8만 원의 구성: 조각 사이는 2px 틈(카드 바탕), 바깥 두 끝만 둥글게
    W, H, GAP = 787, 48, 2
    fig, ax = canvas(W, H)
    parts = [('제조 3.5만', 35, HONEY, '#FFFFFF'), ('운영 2만', 20, '#EDBB85', INK), ('유통 2.5만', 25, '#EFE5D8', INK2)]
    total, x = sum(p[1] for p in parts), 0
    for k, (lab, w, col, tcol) in enumerate(parts):
        seg = (W - GAP * (len(parts) - 1)) * w / total
        l, r = (6 if k == 0 else 0), (6 if k == len(parts) - 1 else 0)
        ax.add_patch(PathPatch(shape(x, 0, x + seg, H, tl=l, bl=l, tr=r, br=r), facecolor=col, lw=0))
        say(ax, x + seg / 2, H / 2 + .36 * 16, [(lab, 16, 700, tcol)], ha='center')
        x += seg + GAP
    return fig


def chart_entry():
    # labels above the bars so both bars use the card's full width
    return hbars([('펌프 5대', 550, '550만', BAR_DIM, INK2, None),
                  ('INFU RETRO 5대', 125, '125만', HONEY, HONEY, None)], (331, 136), value_px=18, label_px=15.5, bar_px=28)


def chart_cnn_pattern():
    # 7장 썸네일: CNN이 보는 4×4 상태 패턴(최근 16초, 느림 −1 · 정상 0 · 빠름 +1) — 왼쪽 정상, 오른쪽 이상(유속 저하가 이어짐)
    W, H, C, G, SEP = 112, 84, 10, 2, 10
    fig, ax = canvas(W, H)
    normal = [0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0]
    anomaly = [0, 1, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
    tone = {0: '#EFE7DC', 1: '#E9BE8C', -1: HONEY}
    side = 4 * C + 3 * G
    left = (W - 2 * side - SEP) / 2
    for x0, pat in ((left, normal), (left + side + SEP, anomaly)):
        for i, st in enumerate(pat):
            r, c = divmod(i, 4)
            rbox(ax, x0 + c * (C + G), (H - side) / 2 + r * (C + G), C, C, 2, color=tone[st], lw=0)
    return fig


def chart_grade():
    # 14장: 동물용 의료기기 등급 — 위험이 클수록 위(좁게). INFU RETRO 구조는 1등급(신고) (덱의 자리 447 px 폭)
    W, H, RH, GAP = 447, 312, 55, 9
    fig, ax = canvas(W, H)
    y = 4
    for k, (grade, kind, frac) in enumerate([('4등급', '허가', .50), ('3등급', '허가', .65), ('2등급', '허가', .80), ('1등급', '신고', .95)]):
        w, hit = W * frac, k == 3
        x = (W - w) / 2
        if hit:  # box-shadow: 0 .6em 1.4em rgba(173, 98, 41, .28)
            rbox(ax, x, y + 12.6, w, RH, 11.5, z=1, gid='hitsh', color=HONEY, alpha=.28, lw=0)
        rbox(ax, x, y, w, RH, 11.5, z=2, color=HONEY if hit else '#EFE5D8', lw=0)
        say(ax, x + 23, y + RH / 2 + .36 * 21, [(grade, 21, 800 if hit else 700, '#FFFFFF' if hit else INK2)])
        say(ax, x + w - 23, y + RH / 2 + .36 * 18.5, [(kind, 18.5, 800 if hit else 600, '#FFFFFF' if hit else MUTE)], ha='right')
        y += RH + GAP
    say(ax, W / 2, y - GAP + 7.6 + 16.8 * .95, [('INFU RETRO 구조', 16.8, 800, HONEY)], ha='center')
    return fig


def chart_filter():
    raw, kw, *_ = simulate('shake', 23)
    t = np.arange(660, 1380)
    fig = plt.figure(figsize=(2.8, 2.1))
    ax = fig.add_axes([.02, .04, .96, .92])
    ax.scatter(t[::6], raw[t][::6], s=2.2, color=RAW, alpha=.8, linewidths=0)
    ax.plot(t[::3], kw[t][::3], color=HONEY, lw=2)
    ax.set_xlim(t[0], t[-1]); ax.axis('off')
    return fig


if __name__ == '__main__':
    use_font()
    os.makedirs(OUT, exist_ok=True)
    gyro, (r, a, b) = chart_gyro()
    save(gyro, 'gyro.svg')
    save(chart_gyro_mini(), 'gyro-mini.svg')
    save(chart_filter(), 'filter.svg')
    save(chart_clinic24h(), 'clinic-24h.svg')
    save(chart_dispute(), 'dispute.svg')
    save(chart_resolve(), 'resolve.svg')
    save(chart_causes(), 'causes.svg')
    save(chart_dispute_split(), 'dispute-split.svg')
    save(chart_causes_all(), 'causes-all.svg')
    save(chart_pivc(), 'pivc.svg')
    save(chart_treat_cost(), 'treat-cost.svg')
    save(chart_signals(), 'signals.svg')
    save(chart_petcost(), 'petcost.svg')
    save(chart_revenue(), 'revenue.svg')
    save(chart_market(), 'market.svg',
         fills={'arrow': (0, 1, 0, 0, [(0, '#A9723F', .25), (1, '#E3BC8C', 1)]),       # CSS: from the foot, faint → honey
                't2': (.25, .067, .75, .933, [(0, '#C97F40', 1), (1, '#A35A22', 1)])},  # CSS: linear-gradient(150deg)
         blurs={'sh1': 16, 'sh2': 16})                                                  # CSS: 1.6em blur → σ 16 px
    save(chart_visit(), 'visit.svg')
    save(chart_cagr(), 'cagr.svg')
    save(chart_rx((538, 318)), 'rx.svg')
    save(chart_rx((806, 560), large=True), 'rx-large.svg')
    save(chart_epoch(), 'epoch.svg')
    save(chart_cost_vs(), 'cost-vs.svg')
    save(chart_cost_stack(), 'cost-stack.svg')
    save(chart_entry(), 'entry.svg')
    save(chart_cnn_pattern(), 'cnn-pattern.svg')
    save(chart_grade(), 'grade.svg', blurs={'hitsh': 14.7})                     # CSS: 1.4em blur
    print(f'  자이로-편차 r={r:.2f}, RMS {a:.2f} → {b:.2f} g')
