// 카드 덱 보기 방식 — 장면마다 다른 무대에서 카드를 넘긴다.
// cover(커버플로) · trophy(트로피 진열) · osd(FPV 고글 화면) · battery(배터리 팩) · belt(컨베이어와 그리퍼) · scan(비전 스캔 더미) · cd(CD 플레이어) · fan(신문 부채)
//
// slot(off, W, H, j, ctx): 가운데에서 off만큼 떨어진 카드 j의 자리 — off는 소수(끌기 · 미리 보기 중에는 자리 사이를 잇는다)
// dress(cards, stage): 카드마다 덧입힐 장식 · chrome: 무대에 얹는 장식(카드 밖)
// layout(stage, W, H): 화면 크기에 맞춘 값 · track(stage, f, W, ctx): 장식을 초점 위치에 맞춘다(소수 f)
// sync(stage, s): 초점이 바뀔 때 숫자 · 상태 · enter(v, W, H, j): 장면에 들어설 때 출발 자리
const pad = (n) => String(n).padStart(2, '0');
const lerp = (a, b, t) => a + (b - a) * t;
const unit = (t) => Math.max(0, Math.min(1, t));
const fade = (a, n) => (a <= n ? 1 : Math.max(0, 1 - (a - n) * 2));

// 카드의 사진(없으면 null)과 연도
const coverOf = (c) => c.querySelector('.card-media > img:not(.blur-fill), .pc-photo img, .all-grid img');
const yearOf = (c) => (c.querySelector('.card-meta')?.textContent || '').match(/\d{4}/)?.[0] || '';
const text = (stage, sel, v) => stage.querySelectorAll(sel).forEach((n) => (n.textContent = v));

// ── 커버플로: 초점 카드는 가운데 앞, 이웃은 양옆 뒤로 비스듬히 ──
const SLOTS = [
  { x: 0, z: 0, r: 0, s: 1, o: 1, d: 0 },
  { x: 0.9, z: -170, r: 38, s: 0.86, o: 1, d: 0.52 },
  { x: 1.56, z: -330, r: 48, s: 0.74, o: 0.6, d: 0.8 },
  { x: 2.05, z: -450, r: 54, s: 0.62, o: 0, d: 1 },
];
const cover = {
  slot(off, W) {
    const a = Math.min(3, Math.abs(off));
    const i = Math.floor(a);
    const t = a - i;
    const A = SLOTS[i];
    const B = SLOTS[Math.min(3, i + 1)];
    const m = (k) => A[k] + (B[k] - A[k]) * t;
    const s = Math.sign(off);
    return { x: s * m('x') * W, z: m('z'), rotationY: s * m('r'), scale: m('s'), autoAlpha: m('o'), '--dim': m('d'), zIndex: 10 - Math.round(a) };
  },
};

// ── 트로피 진열: 커버플로 위로 금빛 조명이 떨어지고, 가운데 상장 아래에 받침이 빛난다(수상) ──
const trophy = {
  ...cover,
  chrome: () => `<div class="dv-chrome trophy" aria-hidden="true"><span class="tr-beam"></span><span class="tr-base"></span></div>`,
  sync(stage, { animate }) {
    if (animate) bump(stage.querySelector('.trophy'), 'is-lit');
  },
};

// ── FPV 고글 화면: 와이드 화면 한 장을 OSD가 둘러싸고, 옆 화면은 기체가 기울듯 비스듬히 지나간다 ──
const osd = {
  chrome: () => `<div class="dv-chrome osd" aria-hidden="true">
      <span class="osd-c tl"></span><span class="osd-c tr"></span><span class="osd-c bl"></span><span class="osd-c br"></span>
      <span class="osd-top"><b class="osd-rec"><i></i>REC</b><span class="osd-tape"><i></i></span><b class="osd-ch">CH 01</b></span>
      <span class="osd-hz"><i></i></span>
      <span class="osd-cross"></span>
      <span class="osd-bot"><span class="osd-bat"><i></i><i></i><i></i><i></i></span><b class="osd-yr"></b><b class="osd-link">FPV · 5.8G</b></span>
    </div>`,
  slot(off, W, H) {
    const a = Math.abs(off);
    const s = Math.sign(off);
    const t = unit(a);
    const r = Math.max(0, a - 1);
    return {
      x: a <= 1 ? off * W * 1.1 : s * (W * 1.1 + r * W * 0.9),
      y: t * H * 0.07,
      z: -t * 90 - r * 40,
      rotationZ: s * t * 5,
      scale: lerp(1, 0.78, t) - r * 0.06,
      autoAlpha: a < 1 ? lerp(1, 0.5, a) : Math.max(0, 0.5 - r * 0.5),
      '--dim': t * 0.6,
      zIndex: 10 - Math.round(a),
    };
  },
  enter: (v, W) => ({ x: v.x + W * 0.5, scale: v.scale * 1.12, autoAlpha: 0, '--dim': 1 }),
  track(stage, f) {
    stage.style.setProperty('--hd', (f * 42).toFixed(2));
  },
  sync(stage, { focus, count, card, animate }) {
    text(stage, '.osd-ch', `CH ${pad(focus + 1)}/${pad(count)}`);
    text(stage, '.osd-yr', card.classList.contains('deck-all') ? 'ARCHIVE' : yearOf(card));
    if (animate) bump(stage.querySelector('.osd'), 'is-bank');
  },
};

// ── 배터리 팩: 가운데 카드는 크게, 나머지는 셀처럼 좁게 줄지어 — 넘길수록 지나온 셀이 충전된다 ──
const battery = {
  chrome: (n) => `<div class="dv-chrome bat" aria-hidden="true">
      <span class="bat-case"><i class="bat-tip"></i></span>
      <span class="bat-read"><b class="bat-bolt">⚡</b><b class="bat-pc">0%</b><span class="bat-bar">${'<i></i>'.repeat(n)}</span><small class="bat-cell"></small></span>
    </div>`,
  dress(cards) {
    cards.forEach((c, j) => c.querySelector('.card-media')?.insertAdjacentHTML('beforeend', `<span class="cell-skin" aria-hidden="true"><i class="cell-cap"></i><b>${pad(j + 1)}</b></span>`));
  },
  layout(stage, W) {
    const narrow = innerWidth < 821;
    const ctx = { cell: Math.max(20, W * (narrow ? 0.15 : 0.16)), gap: Math.max(5, W * 0.028), side: narrow ? 2 : 3 };
    stage.style.setProperty('--cell', `${ctx.cell.toFixed(1)}px`);
    stage.style.setProperty('--gap', `${ctx.gap.toFixed(1)}px`);
    stage.style.setProperty('--side', ctx.side);
    // 셀 겉모습은 카드가 셀 폭으로 좁아진 만큼 짙어진다(끄는 중에도 이어서)
    stage.style.setProperty('--cmax', ((W - ctx.cell) / 2).toFixed(1));
    return ctx;
  },
  slot(off, W, H, j, { cell = 30, gap = 6, side = 3 } = {}) {
    const a = Math.abs(off);
    const s = Math.sign(off);
    const t = unit(a);
    const first = W / 2 + gap + cell / 2;
    return {
      x: a <= 1 ? s * first * a : s * (first + (a - 1) * (cell + gap)),
      scale: lerp(1, 0.93, t),
      '--clip': (W - lerp(W, cell, t)) / 2,
      '--dim': t * 0.5,
      autoAlpha: fade(a, side + 0.15),
      zIndex: 10 - Math.round(a),
    };
  },
  enter: (v, W) => ({ x: v.x + W * 1.3, autoAlpha: 0 }),
  sync(stage, { focus, count, cards, animate }) {
    const pc = Math.round(((focus + 1) / count) * 100);
    text(stage, '.bat-pc', pc >= 100 ? 'FULL' : `${pc}%`);
    text(stage, '.bat-cell', `CELL ${pad(focus + 1)} / ${pad(count)} · ${count}S`);
    stage.querySelectorAll('.bat-bar i').forEach((b, j) => b.classList.toggle('is-on', j <= focus));
    cards.forEach((c, j) => {
      c.classList.toggle('is-charged', j < focus);
      c.classList.toggle('is-empty', j > focus);
    });
    stage.querySelector('.bat')?.classList.toggle('is-full', pc >= 100);
    if (animate) bump(stage.querySelector('.bat'), 'is-charging');
  },
};

// ── 컨베이어와 그리퍼: 카드는 벨트 위에 누워 흘러가고, 가운데 카드는 그리퍼가 집어 세운다 ──
const BELT = 0.86;
const belt = {
  origin: '50% 100%',
  chrome: () => `<div class="dv-chrome belt" aria-hidden="true">
      <span class="belt-band"><i></i></span>
      <span class="grip"><i class="grip-arm"></i><i class="grip-palm"></i><i class="grip-f l"></i><i class="grip-f r"></i><b class="grip-tag"></b></span>
    </div>`,
  slot(off, W, H) {
    const a = Math.abs(off);
    const t = unit(a);
    const L = 1 - t;
    return {
      x: off * W * BELT,
      y: -L * H * 0.05,
      z: L * 30,
      rotationX: t * 66,
      scale: lerp(0.84, 1, L),
      '--dim': t * 0.32 + Math.max(0, a - 1) * 0.12,
      autoAlpha: fade(a, 3),
      zIndex: 10 - Math.round(a),
    };
  },
  enter: (v, W) => ({ x: v.x + W * 2.6, autoAlpha: 0 }),
  track(stage, f, W) {
    stage.style.setProperty('--bx', `${(-f * W * BELT).toFixed(1)}px`);
  },
  sync(stage, { focus, count, animate }) {
    text(stage, '.grip-tag', `PICK ${pad(focus + 1)}/${pad(count)}`);
    if (animate) bump(stage.querySelector('.grip'), 'is-open', 520);
  },
};

// ── 비전 스캔 더미: 카드가 쌓여 있고 맨 위 카드를 인식 상자가 훑는다 — 넘긴 카드는 왼쪽으로 밀려난다 ──
const scan = {
  chrome: () => `<div class="dv-chrome scan" aria-hidden="true"><span class="scan-tag"><i></i><b>VISION · INFERENCE</b><small class="scan-no"></small></span></div>`,
  dress(cards) {
    cards.forEach((c, j) => {
      const y = yearOf(c);
      c.querySelector('.card-media')?.insertAdjacentHTML(
        'beforeend',
        `<span class="scan-fx" aria-hidden="true"><i class="sf-grid"></i><i class="sf-line"></i><span class="sf-box"><b>OBJ ${pad(j + 1)}${y ? ` · ${y}` : ''}</b></span></span>`
      );
    });
  },
  slot(off, W, H, j) {
    const a = Math.abs(off);
    const tilt = (((j * 7) % 5) - 2) * 1.8;
    const t = unit(a);
    if (off >= 0)
      return {
        x: a * W * 0.07,
        y: -a * H * 0.04,
        z: -a * 60,
        rotationZ: tilt * t,
        scale: 1 - a * 0.045,
        '--dim': t * 0.32 + Math.max(0, a - 1) * 0.12,
        autoAlpha: fade(a, 3),
        zIndex: 20 - Math.round(a * 2),
      };
    const r = Math.max(0, a - 1);
    return {
      x: -(t * W * 1.08 + r * W * 0.08),
      y: t * H * 0.05 + r * 4,
      z: -t * 40 - r * 30,
      rotationZ: -(t * 13 + r * 3) + tilt * 0.4,
      scale: 1 - t * 0.12 - r * 0.03,
      '--dim': t * 0.55,
      autoAlpha: a < 1 ? 1 - a * 0.35 : Math.max(0, 0.65 - r * 0.32),
      zIndex: 21 - Math.round(a * 2),
    };
  },
  enter: (v) => ({ y: v.y - 46, rotationZ: v.rotationZ + 8, scale: v.scale * 1.06, autoAlpha: 0 }),
  sync(stage, { focus, count }) {
    text(stage, '.scan-no', `${pad(focus + 1)} / ${pad(count)}`);
  },
};

// ── CD 플레이어: 가운데 케이스에서 디스크가 미끄러져 나와 돌고, 나머지는 선반의 케이스 등처럼 ──
const cd = {
  chrome: () => `<div class="dv-chrome cd" aria-hidden="true">
      <span class="cd-lcd"><span class="cd-eq"><i></i><i></i><i></i><i></i><i></i></span><b class="cd-track"></b><small class="cd-yr"></small></span>
    </div>`,
  dress(cards) {
    cards.forEach((c) => {
      const im = coverOf(c);
      const label = im ? `<img src="${im.getAttribute('src')}" alt="" loading="lazy" decoding="async" />` : `<i class="cd-type">${c.querySelector('.type-cover b')?.textContent || ''}</i>`;
      c.insertAdjacentHTML('afterbegin', `<span class="cd-disc" aria-hidden="true"><span class="cd-spin">${label}<i class="cd-hub"></i></span><i class="cd-sheen"></i></span>`);
      c.querySelector('.card-media')?.insertAdjacentHTML('beforeend', '<span class="cd-case" aria-hidden="true"><i class="cd-hinge"></i></span>');
    });
  },
  slot(off, W) {
    const a = Math.abs(off);
    const s = Math.sign(off);
    const t = unit(a);
    const r = Math.max(0, a - 1);
    const home = -W * 0.2;
    const side = s < 0 ? -W * 0.86 - r * W * 0.12 : W * 0.86 + r * W * 0.12;
    return {
      x: a <= 1 ? lerp(home, s < 0 ? -W * 0.86 : W * 0.86, t) : side,
      z: -t * 30 - r * 4,
      rotationY: s * 74 * t,
      scale: lerp(1, 0.92, t),
      '--dim': t * 0.45,
      autoAlpha: fade(a, 5),
      zIndex: 10 - Math.round(a),
    };
  },
  enter: (v, W) => ({ x: v.x + W * 1.5, rotationY: v.rotationY - 30, autoAlpha: 0 }),
  sync(stage, { focus, count, card }) {
    text(stage, '.cd-track', `TRACK ${pad(focus + 1)} / ${pad(count)}`);
    text(stage, '.cd-yr', card.classList.contains('deck-all') ? 'ALL' : yearOf(card));
  },
};

// ── 신문 부채: 오려 낸 기사를 손에 쥔 부채처럼 펼치고, 가운데 기사는 핀으로 꽂는다 ──
const PIVOT = 2.4; // 부채의 축: 카드 높이의 2.4배 아래
const fan = {
  origin: `50% ${PIVOT * 100}%`,
  chrome: () => `<div class="dv-chrome fan" aria-hidden="true"><span class="fan-pin"><i></i></span></div>`,
  slot(off, W, H) {
    const a = Math.abs(off);
    const t = unit(a);
    const scale = lerp(1.02, 0.94, t);
    return {
      rotationZ: off * 8.5,
      // 축이 멀리 아래에 있어 줄어든 만큼 카드가 내려앉는다 — 그만큼 올려 준다
      y: -(1 - scale) * PIVOT * H - (1 - t) * H * 0.04,
      z: -a * 8,
      scale,
      '--dim': t * 0.38 + Math.max(0, a - 1) * 0.12,
      autoAlpha: fade(a, 2.6),
      zIndex: 10 - Math.round(a),
    };
  },
  enter: (v) => ({ rotationZ: 0, autoAlpha: 0 }),
  sync(stage, { animate }) {
    if (animate) bump(stage.querySelector('.fan'), 'is-pinning');
  },
};

// 클래스를 잠깐 붙였다 뗀다(애니메이션을 다시 틀기 위해)
function bump(el, cls, ms = 0) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  if (ms) setTimeout(() => el.classList.remove(cls), ms);
}

export const VIEWS = { cover, trophy, osd, battery, belt, scan, cd, fan };

// 무대에 얹는 장식(카드 수가 필요한 것은 n)
export const chromeOf = (view, n) => VIEWS[view]?.chrome?.(n) || '';
