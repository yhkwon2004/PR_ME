#!/usr/bin/env python3
"""INFU RETRO 피치덱 그래프를 Python으로 계산하고 Plotly(plotly.py)로 그립니다.

그림 파일이 아니라 차트 정의(데이터 · 축 · 범례)를 charts/charts.js로 내보내고, 덱이 Plotly.js로 그 자리에서
그립니다. 그래서 확대해도 선명하고, 마우스를 올리면 그 시점의 값이 보입니다.

  pip install numpy plotly
  python3 scripts/infutech-charts.py

  sim      10장 · 500 mL 수액 모의 신호 5가지 상황 (칼만필터 · 기대 추세 · 이상 점수 · 알림 시각)
  gyro      8장 · 학습 장비의 자이로 신호와 무게 편차, 자이로로 보정한 뒤의 잔차
  filter    7장 · 흔들림 구간 원신호와 칼만필터 출력 (썸네일)

모든 신호는 모의 데이터입니다. 실측 로그(CSV)가 있으면 simulate() 대신 그 값을 넣으면 같은 차트가 나옵니다.
"""
import json, math, os
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(ROOT, 'public', 'infutech') if os.path.isdir(os.path.join(ROOT, 'public', 'infutech')) else ROOT
OUT = os.path.join(DECK, 'charts', 'charts.js')

FONT = '"Pretendard Pitch", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
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


def mmss(sec):
    return f'{sec // 60}:{sec % 60:02d}'


def r2(a, d=2):
    return [round(float(v), d) for v in a]


AX = dict(showgrid=True, gridcolor=GRID, showline=True, linecolor=LINE, zeroline=False, ticks='outside',
          tickcolor=LINE, ticklen=4, fixedrange=True, tickfont=dict(color=MUTE))
CASES = [('normal', 11, '① 정상 투여'), ('shake', 23, '② 이송 중 흔들림'), ('drop', 37, '③ 유속 저하'),
         ('line', 41, '④ 줄 빠짐'), ('air', 53, '⑤ 공기 유입 · 역류')]


def chart_sim():
    fig = make_subplots(rows=2, cols=5, shared_xaxes='columns', shared_yaxes='rows', row_heights=[.7, .3],
                        vertical_spacing=.045, horizontal_spacing=.022)
    m10, m5 = np.arange(0, 3600, 10), np.arange(0, 3600, 5)
    summary, ann = [], []
    for c, (kind, seed, name) in enumerate(CASES, start=1):
        raw, kw, exp, score = simulate(kind, seed)
        hit = np.flatnonzero(score >= 0.6); alert = int(hit[0]) if hit.size else None
        peak = float(score.max()); summary.append((name, peak, alert))
        first = c == 1
        # every 10th sample, plus every sample around the moment the line is pulled so the tension spike shows
        ri = np.union1d(m10, np.arange(1795, 1812)) if kind == 'line' else m10
        fig.add_trace(go.Scatter(x=r2(ri / 60), y=r2(raw[ri], 1), mode='markers', marker=dict(size=3.2, color=RAW, opacity=.5),
                                 name='원신호 (1초 측정)', legendgroup='raw', showlegend=first,
                                 hovertemplate='%{x:.1f}분 · %{y:.1f} g<extra>원신호</extra>'), 1, c)
        fig.add_trace(go.Scatter(x=[0, 60], y=r2([exp[0], exp[-1]], 1), mode='lines', line=dict(color=INK2, width=1.1, dash='dash'),
                                 name='정상 유속 기대 추세', legendgroup='exp', showlegend=first, hoverinfo='skip'), 1, c)
        fig.add_trace(go.Scatter(x=r2(m5 / 60), y=r2(kw[m5], 1), mode='lines', line=dict(color=HONEY, width=2),
                                 name='칼만필터', legendgroup='kal', showlegend=first,
                                 hovertemplate='%{x:.1f}분 · %{y:.1f} g<extra>칼만필터</extra>'), 1, c)
        fig.add_trace(go.Scatter(x=r2(m5 / 60), y=[0.6] * len(m5), mode='lines', line=dict(width=0), showlegend=False, hoverinfo='skip'), 2, c)
        fig.add_trace(go.Scatter(x=r2(m5 / 60), y=r2(np.maximum(score[m5], .6), 3), mode='lines', line=dict(width=0), fill='tonexty',
                                 fillcolor='rgba(208,78,45,.22)', showlegend=False, hoverinfo='skip'), 2, c)
        fig.add_trace(go.Scatter(x=r2(m5 / 60), y=r2(score[m5], 3), mode='lines', line=dict(color=INK, width=1.3),
                                 name='이상 점수', legendgroup='score', showlegend=first,
                                 hovertemplate='%{x:.1f}분 · 점수 %{y:.2f}<extra></extra>'), 2, c)
        fig.add_trace(go.Scatter(x=[None], y=[None], mode='lines', line=dict(color=ALERT, width=1.2, dash='dot'),
                                 name='임계값 0.6', legendgroup='thr', showlegend=first), 2, c)
        fig.add_hline(y=.6, line=dict(color=ALERT, width=1.2, dash='dot'), layer='below', row=2, col=c)
        if kind == 'shake':
            fig.add_vrect(x0=12, x1=22, fillcolor=HONEY, opacity=.08, line_width=0, layer='below', row='all', col=c)
        elif kind != 'normal':
            fig.add_vrect(x0=30, x1=32 if kind == 'air' else 60, fillcolor=ALERT, opacity=.06, line_width=0, layer='below', row='all', col=c)
        xi = '' if c == 1 else str(c)
        if alert is not None:
            fig.add_vline(x=alert / 60, line=dict(color=ALERT, width=1.3), layer='below', row='all', col=c)
            ann.append(dict(x=alert / 60, y=1, xref=f'x{xi}', yref=f'y{xi} domain', text=f'<b>알림 {mmss(alert)}</b>', showarrow=False,
                            xanchor='left', yanchor='top', xshift=4, yshift=-4, font=dict(color=ALERT)))
            verdict, col = f'알림 {mmss(alert)} · 최고 {peak:.2f}', ALERT
        else:
            verdict, col = (('보정 후 정상' if kind == 'shake' else '정상') + f' · 최고 {peak:.2f}'), SAGE
        if kind == 'line':
            ann.append(dict(x=30, y=float(raw[1800]), xref=f'x{xi}', yref=f'y{xi}', text='당겨진 순간 장력', showarrow=True, arrowhead=0,
                            arrowcolor=ALERT, arrowwidth=1, ax=-60, ay=-82, font=dict(color=ALERT, size=11)))
        if kind == 'shake':
            ann.append(dict(x=17, y=0, xref=f'x{xi}', yref=f'y{xi} domain', text='흔들림 구간', showarrow=False, yanchor='bottom', yshift=6,
                            font=dict(color=HONEY, size=11)))
        ann.append(dict(x=0, y=1, xref=f'x{xi} domain', yref=f'y{xi} domain', text=f'<b>{name}</b>', showarrow=False,
                        xanchor='left', yanchor='bottom', yshift=8, font=dict(size=14, color=INK)))
        ann.append(dict(x=1, y=1, xref=f'x{xi} domain', yref=f'y{xi} domain', text=f'<b>{verdict}</b>', showarrow=False,
                        xanchor='right', yanchor='bottom', yshift=8, font=dict(size=12, color=col)))
    fig.update_xaxes(**AX, range=[0, 60], tickvals=[0, 20, 40, 60])
    fig.update_xaxes(title_text='경과 시간 (분)', title_font=dict(size=12, color=INK2), row=2)
    fig.update_yaxes(**AX)
    fig.update_yaxes(range=[150, 548], row=1)
    fig.update_yaxes(range=[0, 1.05], tickvals=[0, .6, 1], row=2)
    fig.update_yaxes(title_text='무게 (g)', title_font=dict(size=12, color=INK2), row=1, col=1)
    fig.update_yaxes(title_text='이상 점수', title_font=dict(size=12, color=INK2), row=2, col=1)
    ann.append(dict(x=1, y=1.075, xref='paper', yref='paper', text='plotly · numpy  |  seed 11 · 23 · 37 · 41 · 53', showarrow=False,
                    xanchor='right', font=dict(size=10, color=MUTE)))
    fig.update_layout(annotations=ann, font=dict(family=FONT, size=12, color=INK), paper_bgcolor='white', plot_bgcolor='white',
                      margin=dict(l=62, r=8, t=58, b=96), hovermode='closest', dragmode=False,
                      hoverlabel=dict(bgcolor='white', bordercolor=LINE, font=dict(family=FONT, color=INK)),
                      legend=dict(orientation='h', x=.5, xanchor='center', y=-.17, yanchor='top', font=dict(size=12, color=INK2),
                                  itemclick=False, itemdoubleclick=False, traceorder='normal'))
    return fig, summary


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
    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, vertical_spacing=.07)
    rows = [(gyro, SAGE, '자이로 (°/s)', '자이로'), (dev, HONEY, '무게 편차 (g)', '무게 편차'), (res, INK, '보정 후 (g)', '보정 후')]
    for i, (y, col, lab, short) in enumerate(rows, start=1):
        fig.add_trace(go.Scatter(x=r2(t), y=r2(y), mode='lines', line=dict(color=col, width=1.6), showlegend=False,
                                 hovertemplate=f'%{{x:.2f}} s · %{{y:.1f}}<extra>{short}</extra>'), i, 1)
        fig.update_yaxes(title_text=lab, title_font=dict(size=11, color=INK2), row=i, col=1)
    lim = float(max(abs(dev).max(), abs(res).max()) * 1.15)
    fig.update_xaxes(**AX, range=[0, 12], dtick=2)
    fig.update_xaxes(title_text='시간 (s) · 20 Hz 샘플링', title_font=dict(size=11, color=INK2), row=3)
    fig.update_yaxes(**AX)
    fig.update_yaxes(range=[-lim, lim], row=2); fig.update_yaxes(range=[-lim, lim], row=3)
    ann = [dict(x=.01, y=1, xref='x2 domain', yref='y2 domain', text=f'<b>r = {r:.2f}</b> (자이로와 상관)', showarrow=False,
                xanchor='left', yanchor='top', font=dict(color=HONEY)),
           dict(x=.01, y=1, xref='x3 domain', yref='y3 domain', text=f'<b>RMS {rms0:.1f} g → {rms1:.1f} g</b>', showarrow=False,
                xanchor='left', yanchor='top', font=dict(color=INK))]
    fig.update_layout(annotations=ann, font=dict(family=FONT, size=11, color=INK), paper_bgcolor='white', plot_bgcolor='white',
                      margin=dict(l=70, r=8, t=6, b=40), hovermode='closest', dragmode=False,
                      hoverlabel=dict(bgcolor='white', bordercolor=LINE, font=dict(family=FONT, color=INK)))
    return fig, (r, rms0, rms1)


def chart_filter():
    raw, kw, *_ = simulate('shake', 23)
    t = np.arange(660, 1380)
    fig = go.Figure([go.Scatter(x=r2(t[::6]), y=r2(raw[t][::6], 1), mode='markers', marker=dict(size=2.4, color=RAW, opacity=.75)),
                     go.Scatter(x=r2(t[::3]), y=r2(kw[t][::3], 1), mode='lines', line=dict(color=HONEY, width=1.8))])
    fig.update_xaxes(visible=False, fixedrange=True); fig.update_yaxes(visible=False, fixedrange=True)
    fig.update_layout(showlegend=False, margin=dict(l=3, r=3, t=3, b=3), paper_bgcolor='white', plot_bgcolor='white', hovermode=False)
    return fig


def spec(fig, base, static=False):
    j = json.loads(fig.to_json())
    j['layout'].pop('template', None)
    return {'base': base, 'static': static, 'data': j['data'], 'layout': j['layout']}


if __name__ == '__main__':
    sim, summary = chart_sim()
    gyro, (r, a, b) = chart_gyro()
    charts = {'sim': spec(sim, 1640), 'gyro': spec(gyro, 560), 'filter': spec(chart_filter(), 112, True)}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* generated by scripts/infutech-charts.py (plotly.py) — do not edit by hand */\n')
        f.write('window.INFU_CHARTS = ' + json.dumps(charts, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(OUT, os.path.getsize(OUT) // 1024, 'KB')
    for name, peak, alert in summary:
        print(f'  {name}: 최고 {peak:.2f}, 알림 {mmss(alert) if alert is not None else "없음"}')
    print(f'  자이로-편차 r={r:.2f}, RMS {a:.2f} → {b:.2f} g')
