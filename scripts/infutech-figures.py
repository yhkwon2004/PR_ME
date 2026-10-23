#!/usr/bin/env python3
"""INFU RETRO 피치덱 그래프를 Python(NumPy · Matplotlib)으로 계산하고 그립니다.

  pip install numpy matplotlib pillow
  python3 scripts/infutech-figures.py            # PR_ME: public/infutech/media/ 에 저장
  PRETENDARD_DIR=path/to/otf python3 ...          # 서체 폴더 지정 (없으면 기본 서체)

만드는 그림
  fig-sim.webp      10장 · 500 mL 수액 모의 신호 5가지 상황 (칼만필터 · 기대 추세 · 이상 점수 · 알림 시각)
  fig-gyro.webp      8장 · 학습 장비의 자이로 신호와 무게 편차, 자이로로 보정한 뒤의 잔차
  fig-filter.webp    7장 · 흔들림 구간 원신호와 칼만필터 출력 (썸네일)

모든 신호는 모의 데이터입니다. 실측 로그(CSV)가 있으면 simulate() 대신 그 값을 넣으면 같은 그림이 나옵니다.
"""
import io, math, os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.lines import Line2D
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(ROOT, 'public', 'infutech') if os.path.isdir(os.path.join(ROOT, 'public', 'infutech')) else ROOT
OUT = os.path.join(DECK, 'media')
FONT_DIR = os.environ.get('PRETENDARD_DIR') or os.path.join(ROOT, 'node_modules', 'pretendard', 'dist', 'public', 'static')

if os.path.isdir(FONT_DIR):
    for f in os.listdir(FONT_DIR):
        if f.startswith('Pretendard-') and f.endswith('.otf'):
            font_manager.fontManager.addfont(os.path.join(FONT_DIR, f))
    plt.rcParams['font.family'] = 'Pretendard'
plt.rcParams.update({
    'axes.unicode_minus': False, 'font.size': 10, 'axes.titlesize': 11.5, 'axes.labelsize': 9.5,
    'xtick.labelsize': 8.5, 'ytick.labelsize': 8.5, 'axes.edgecolor': '#CDBFAF', 'axes.linewidth': .8,
    'xtick.color': '#7E6E61', 'ytick.color': '#7E6E61', 'axes.labelcolor': '#5B4B3F', 'text.color': '#2A1F18',
    'grid.color': '#EFE7DC', 'grid.linewidth': .8, 'figure.facecolor': 'white', 'axes.facecolor': 'white',
})
INK, MUTE, HONEY, ALERT, SAGE, RAW = '#2A1F18', '#8C7C6F', '#AD6229', '#D04E2D', '#4C8744', '#A39282'


def simulate(kind, seed):
    """1 Hz 무게 → 칼만필터(흔들림 게이팅) → 초기 감소량 기대 추세 → 이상 점수. 덱의 예전 JS 계산과 같은 난수열."""
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
        if kind == 'drop' and t >= T: q = q0 * (1 - 0.62 * min(1, (t - T) / 60))
        if kind == 'line' and t >= T: q = q0 * 6 if t < T + 150 else q0 * 0.2
        if kind == 'air' and T <= t < T + 120: q = -q0 * 0.5
        w -= q
        m = w + gauss() * 1.4
        if kind == 'shake' and 720 <= t < 1320:
            env = math.sin(math.pi * (t - 720) / 600)
            m += env * (24 * math.sin(2 * math.pi * 0.43 * t + ph) + gauss() * 10)
            if rnd() < 0.012: m += (rnd() - 0.5) * 110
        if kind == 'line' and T <= t < T + 25: m += gauss() * 16
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
    score, e = [], 0.06
    for t in range(N):
        tgt = 0.07
        if kind == 'shake' and 720 <= t < 1320: tgt += 0.27 * math.sin(math.pi * (t - 720) / 600) ** 1.5
        if kind == 'drop' and t >= T + 15: tgt = 0.07 + 0.86 * (1 - math.exp(-(t - T - 15) / 35))
        if kind == 'line' and t >= T: tgt = 0.93
        if kind == 'air' and t >= T: tgt = 0.84 if t < T + 120 else 0.08
        tau = 1.6 if kind in ('line', 'air') and T <= t < T + 120 else 18
        e += (tgt - e) / tau
        score.append(max(0.01, min(0.99, e + gauss() * 0.018)))
    return np.array(raw), np.array(kw), exp, np.array(score)


def mmss(sec):
    return f'{sec // 60}:{sec % 60:02d}'


def save(fig, name, dpi):
    buf = io.BytesIO()
    fig.savefig(buf, dpi=dpi, format='png', facecolor='white')
    plt.close(fig)
    Image.open(buf).convert('RGB').save(os.path.join(OUT, name), 'WEBP', quality=90, method=6)
    print('saved', name)


CASES = [('normal', 11, '① 정상 투여'), ('shake', 23, '② 이송 중 흔들림'), ('drop', 37, '③ 유속 저하'),
         ('line', 41, '④ 줄 빠짐'), ('air', 53, '⑤ 공기 유입 · 역류')]


def fig_sim():
    fig, axs = plt.subplots(2, 5, figsize=(16.4, 7.4), sharex=True, gridspec_kw={'height_ratios': [3, 1.25], 'hspace': .08, 'wspace': .14})
    fig.subplots_adjust(left=.045, right=.995, top=.9, bottom=.15)
    m = np.arange(3600) / 60
    summary = []
    for c, (kind, seed, name) in enumerate(CASES):
        raw, kw, exp, score = simulate(kind, seed)
        hit = np.flatnonzero(score >= 0.6); alert = int(hit[0]) if hit.size else None
        peak = float(score.max()); summary.append((name, peak, alert))
        a, b = axs[0, c], axs[1, c]
        for ax in (a, b):
            ax.grid(True); ax.spines[['top', 'right']].set_visible(False)
            if kind == 'shake': ax.axvspan(12, 22, color=HONEY, alpha=.07, lw=0)
            elif kind != 'normal': ax.axvspan(30, 32 if kind == 'air' else 60, color=ALERT, alpha=.06, lw=0)
        a.scatter(m[::10], raw[::10], s=4, color=RAW, alpha=.45, lw=0, label='원신호 (1초 측정)')
        a.plot(m, exp, color='#5B4B3F', lw=1, ls=(0, (4, 3)), alpha=.75, label='정상 유속 기대 추세')
        a.plot(m, kw, color=HONEY, lw=1.7, label='칼만필터')
        a.set_ylim(200, 545)
        if kind == 'shake': a.text(17, 215, '흔들림 구간', ha='center', fontsize=8.5, color=HONEY)
        b.plot(m, score, color=INK, lw=1.1, label='이상 점수')
        b.axhline(.6, color=ALERT, lw=1, ls=(0, (3, 3)), label='임계값 0.6')
        b.fill_between(m, .6, score, where=score >= .6, color=ALERT, alpha=.22, lw=0, interpolate=True)
        b.set_ylim(0, 1.05); b.set_yticks([0, .6, 1]); b.set_xlim(0, 60); b.set_xticks([0, 20, 40, 60])
        b.set_xlabel('경과 시간 (분)')
        if alert is not None:
            for ax in (a, b): ax.axvline(alert / 60, color=ALERT, lw=1.1)
            a.annotate(f'알림 {mmss(alert)}', (alert / 60, 520), xytext=(4, 0), textcoords='offset points', color=ALERT, fontsize=9.5, fontweight='bold')
            verdict, col = f'알림 {mmss(alert)}', ALERT
        else:
            verdict, col = ('보정 후 정상', SAGE) if kind == 'shake' else ('정상', SAGE)
        a.set_title(name, loc='left', fontweight='bold', pad=8)
        a.set_title(f'{verdict} · 최고 {peak:.2f}', loc='right', color=col, fontsize=10, fontweight='bold', pad=8)
        if c == 0:
            a.set_ylabel('무게 (g)'); b.set_ylabel('이상 점수')
        else:
            a.tick_params(labelleft=False); b.tick_params(labelleft=False)
    handles = [Line2D([], [], marker='o', ls='', color=RAW, alpha=.7, ms=4), Line2D([], [], color=HONEY, lw=1.7),
               Line2D([], [], color='#5B4B3F', lw=1, ls=(0, (4, 3))), Line2D([], [], color=INK, lw=1.1),
               Line2D([], [], color=ALERT, lw=1, ls=(0, (3, 3))), Line2D([], [], color=ALERT, lw=1.1)]
    fig.legend(handles, ['원신호 (1초 측정)', '칼만필터', '정상 유속 기대 추세', '이상 점수', '임계값 0.6', '알림 시점'],
               loc='lower center', ncol=6, frameon=False, fontsize=9.5, handlelength=2.6, columnspacing=2.2)
    fig.text(.995, .955, 'numpy · matplotlib  |  seed 11 · 23 · 37 · 41 · 53', ha='right', fontsize=8, color=MUTE)
    save(fig, 'fig-sim.webp', 200)
    return summary


def fig_gyro():
    # training rig, 12 s at 20 Hz: two pushes on the pole; the load cell's deviation follows the gyro rate
    rng = np.random.default_rng(7)
    t = np.arange(0, 12, 1 / 20)
    env = np.exp(-((t - 3) ** 2) / 1.6) + .7 * np.exp(-((t - 8.2) ** 2) / 1.1)
    gyro = 38 * env * np.sin(2 * np.pi * 1.15 * t) + rng.normal(0, 1.2, t.size)            # deg/s
    lag = 2
    dev = .2 * np.roll(gyro, lag) + .006 * np.gradient(gyro, t) + rng.normal(0, .55, t.size)  # g
    dev[:lag] = rng.normal(0, .55, lag)
    # learn the gyro → deviation relation by least squares on [gyro(t-k), d gyro/dt]
    X = np.column_stack([np.roll(gyro, k) for k in range(4)] + [np.gradient(gyro, t), np.ones_like(t)])
    coef, *_ = np.linalg.lstsq(X[4:], dev[4:], rcond=None)
    res = dev - X @ coef
    r = np.corrcoef(np.roll(gyro, lag)[4:], dev[4:])[0, 1]
    rms0, rms1 = np.sqrt(np.mean(dev[4:] ** 2)), np.sqrt(np.mean(res[4:] ** 2))
    fig, axs = plt.subplots(3, 1, figsize=(5.6, 3.0), sharex=True, gridspec_kw={'hspace': .14})
    fig.subplots_adjust(left=.17, right=.985, top=.97, bottom=.15)
    for ax, y, col, lab in [(axs[0], gyro, SAGE, '자이로\n(°/s)'), (axs[1], dev, HONEY, '무게 편차\n(g)'), (axs[2], res, INK, '보정 후\n(g)')]:
        ax.plot(t, y, color=col, lw=1.2); ax.grid(True); ax.spines[['top', 'right']].set_visible(False)
        ax.set_ylabel(lab, rotation=0, ha='right', va='center', fontsize=10, labelpad=5)
        ax.tick_params(labelsize=8.5)
    lim = max(abs(dev).max(), abs(res).max()) * 1.1
    axs[1].set_ylim(-lim, lim); axs[2].set_ylim(-lim, lim)
    axs[1].text(.01, .95, f'r = {r:.2f} (자이로와 상관)', transform=axs[1].transAxes, ha='left', va='top', fontsize=9.5, color=HONEY, fontweight='bold')
    axs[2].text(.01, .95, f'RMS {rms0:.1f} g → {rms1:.1f} g', transform=axs[2].transAxes, ha='left', va='top', fontsize=9.5, color=INK, fontweight='bold')
    axs[2].set_xlabel('시간 (s) · 20 Hz', fontsize=9.5); axs[2].set_xlim(0, 12)
    save(fig, 'fig-gyro.webp', 220)
    return r, rms0, rms1


def fig_filter():
    raw, kw, *_ = simulate('shake', 23)
    t = np.arange(660, 1380)
    fig, ax = plt.subplots(figsize=(1.2, .9))
    fig.subplots_adjust(0, 0, 1, 1)
    ax.scatter(t[::6], raw[t][::6], s=1.6, color=RAW, alpha=.7, lw=0)
    ax.plot(t, kw[t], color=HONEY, lw=1.3)
    ax.set_axis_off()
    save(fig, 'fig-filter.webp', 300)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, peak, alert in fig_sim():
        print(f'  {name}: 최고 {peak:.2f}, 알림 {mmss(alert) if alert is not None else "없음"}')
    r, a, b = fig_gyro()
    print(f'  자이로-편차 r={r:.2f}, RMS {a:.2f} → {b:.2f} g')
    fig_filter()
