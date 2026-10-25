#!/usr/bin/env python3
"""INFU RETRO 피치덱 그래프를 Python(NumPy)으로 계산하고 Matplotlib으로 그려 고정된 SVG로 내보냅니다.

글자까지 모두 윤곽선(path)으로 저장하므로 서체 · 브라우저 · 화면 크기가 달라도 똑같이 보이고, 확대해도 선명합니다.

  pip install numpy matplotlib
  python3 scripts/infutech-charts.py          # 서체: node_modules의 Pretendard, 없으면 PRETENDARD_DIR

  charts/gyro.svg     부록 · 핵심 알고리즘 — 학습 장비의 자이로 신호와 무게 편차, 자이로로 보정한 뒤의 잔차
  charts/filter.svg   7장 · 흔들림 구간 원신호와 칼만필터 출력 (썸네일)

모든 신호는 모의 데이터입니다. 실측 로그(CSV)가 있으면 simulate() 대신 그 값을 넣으면 같은 차트가 나옵니다.
"""
import glob, math, os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(ROOT, 'public', 'infutech') if os.path.isdir(os.path.join(ROOT, 'public', 'infutech')) else ROOT
OUT = os.path.join(DECK, 'charts')

INK, INK2, MUTE, HONEY, ALERT, SAGE, RAW = '#2A1F18', '#5B4B3F', '#8C7C6F', '#AD6229', '#D04E2D', '#4C8744', '#A39282'
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


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, format='svg', transparent=True, metadata={'Date': None, 'Creator': None})
    plt.close(fig)
    print(path, os.path.getsize(path) // 1024, 'KB')


def chart_gyro():
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
    save(chart_filter(), 'filter.svg')
    print(f'  자이로-편차 r={r:.2f}, RMS {a:.2f} → {b:.2f} g')
