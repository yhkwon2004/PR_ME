// 휠 · 스와이프 · 키보드 → 다음/이전(프로젝트 릴 카드, 그다음 장면). 패널 안에서 스크롤할 여지가 있으면 스크롤을 먼저 준다.
function scrollableAncestor(el, dir) {
  while (el && el !== document.body) {
    if (el.scrollHeight > el.clientHeight + 2) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY)) {
        if (dir > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 2) return el;
        if (dir < 0 && el.scrollTop > 2) return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

// 가로로 스크롤 가능한 조상(프로젝트 릴)
function scrollableX(el) {
  while (el && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) return el;
    el = el.parentElement;
  }
  return null;
}

// 당겨 넘기기: 이만큼(px) 위아래로 끌면 놓는 순간 넘어간다 — 빠르게 튕기지 않아도(마우스는 조금 더)
const PULL = 46;
const MOUSE_PULL = 64;
// 짧게 튕기기: 이만큼(px)만 움직였어도 빠르게(px/ms) 튕기고 놓았으면 넘긴다
const FLICK = 22;
const FLICK_V = 0.45;
const html = document.documentElement;

// scroller: 키보드가 먼저 스크롤할 지금 화면(소개 화면 — 낮은 창 · 휴대폰에서는 화면 안에서 스크롤한다). 없으면 키는 바로 넘긴다
// settled: 그 화면이 다 들어섰는지 — 들어서는 중에는 스크롤할 화면이어도 키를 버린다
export function createInput({ next, prev, first, last, isBlocked, onKey, onPull, pullLabel, scroller, settled }) {
  let acc = 0;
  let lockUntil = 0;
  let sceneUntil = 0; // 카드를 넘긴 뒤 이때까지는 카드만(덱 끝에서 연달아 누른 키 · 휠이 다음 장면으로 새지 않게)
  let idleTimer = 0;
  let stepped = false;

  // how: 'swipe'(손가락으로 위아래 — 카드는 건너뛰고 장면) · 'drag'(마우스로 끌기) · 없으면 휠 · 키
  // stepMs: 덱 카드 한 장을 넘긴 뒤의 잠금 — 키는 누를 때마다 한 장(빠르게 여러 번 누르면 그만큼, 누르고 있으면 0.17초마다)
  // held: 키를 누르고 있는 자동 반복 — 카드는 넘기되 장면은 넘기지 않는다
  const fire = (dir, lockMs = 1100, how, stepMs = 560, held = false) => {
    const now = performance.now();
    if (now < lockUntil) return;
    const moved = dir > 0 ? next(how, held || now < sceneUntil) : prev(how, held || now < sceneUntil);
    if (moved === false) return;
    // 릴 카드 한 장 · 소개 화면 하나는 장면 전환보다 짧게 잠근다(덱 카드는 stepMs만큼 — 덱이 그 사이를 이어서 지나간다)
    stepped = moved === 'step' || moved === 'card';
    lockUntil = now + (stepped ? Math.min(lockMs, moved === 'card' ? stepMs : 560) : lockMs);
    if (stepped) sceneUntil = now + Math.min(lockMs, 560);
  };

  addEventListener(
    'wheel',
    (e) => {
      if (isBlocked()) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      // 트랙패드 가로 스크롤은 가로로 넘기는 것(스크롤 영역 · 카드 덱)에 맡긴다
      if (horizontal && (scrollableX(e.target) || e.target.closest?.('.deck-stage'))) return;
      const d = horizontal ? e.deltaX : e.deltaY;
      if (scrollableAncestor(e.target, Math.sign(d))) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lockUntil) {
        acc = 0;
        // 카드를 넘긴 뒤 트랙패드 관성이 이어지는 동안은 잠금을 늘려, 한 번 쓸어 넘기면 한 장만 넘어가게
        if (stepped) lockUntil = Math.max(lockUntil, now + 200);
        return;
      }
      acc += d;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => (acc = 0), 220);
      if (Math.abs(acc) > 55) {
        fire(Math.sign(acc), 1500);
        acc = 0;
      }
    },
    { passive: false }
  );

  let sx = 0;
  let sy = 0;
  let st = 0;
  let startEl = null;
  let couldScroll = { 1: false, '-1': false };
  let ly = 0; // 손가락 속도 재기: 마지막 위치 · 시각 · 속도(px/ms)
  let lt = 0;
  let vy = 0;
  let pull = null; // 지금 끄는 중인 당겨 넘기기 { dir, p, armed, label }
  // 손가락을 댄 곳이 알림 · 크레딧처럼 자기 몫의 끌기가 있는 곳이면 당겨 넘기기를 쓰지 않는다
  const ownsDrag = (el) => !!el?.closest?.('.guide-toast, .credits');
  const endPull = () => {
    if (!pull) return;
    pull = null;
    html.classList.remove('is-pulling');
    onPull?.(null);
  };
  const setPull = (st) => {
    pull = st;
    html.classList.add('is-pulling'); // 덱 · 카메라 돌리기가 이 끌기를 가로채지 않게
    onPull?.(st);
  };
  addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = ly = t.clientY;
      st = lt = performance.now();
      vy = 0;
      startEl = e.target;
      // 손가락을 대는 순간 패널이 더 스크롤될 수 있었는지 기억한다
      couldScroll = { 1: !!scrollableAncestor(startEl, 1), '-1': !!scrollableAncestor(startEl, -1) };
      endPull();
    },
    { passive: true }
  );
  // 위아래로 끄는 동안: 끈 만큼 다음 · 이전 표시가 차오르고 화면이 손가락을 따라온다
  addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1 || isBlocked() || ownsDrag(startEl)) return endPull();
      const t = e.touches[0];
      const now = performance.now();
      // 손가락 속도는 살짝 고르게 — 마지막 한 번의 떨림에 휘둘리지 않게
      vy = vy * 0.4 + ((t.clientY - ly) / Math.max(1, now - lt)) * 0.6;
      ly = t.clientY;
      lt = now;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dy) < 12 || Math.abs(dy) < Math.abs(dx) * 1.2) return endPull();
      const dir = dy < 0 ? 1 : -1;
      // 패널 글을 스크롤하던 손가락(손가락을 댈 때 그쪽으로 더 스크롤할 글이 있었다)은 끝에 닿아도 이 끌기로는 넘기지 않는다 —
      // 넘친 글이 몇십 px뿐이면 한 번 민 손가락이 그 글을 스치듯 지나 바로 다음 화면으로 넘어가, 끝 줄이 멈춰 보이지 않았다.
      // 글 끝에서 다시 민 손가락(다음 끌기)이 넘긴다
      if (couldScroll[dir] || scrollableAncestor(startEl, dir)) return endPull();
      const dist = Math.abs(dy);
      const label = pullLabel?.(dir, 'swipe');
      if (!label) return endPull();
      setPull({ dir, p: (dist - 12) / (PULL - 12), armed: dist >= PULL, label });
    },
    { passive: true }
  );
  addEventListener('touchcancel', endPull, { passive: true });

  // 마우스로 끌어 넘기기: 화면을 잡고 위로 끌어 올리면 다음 장면(아래로 넘기기), 끌어내리면 이전 — 손가락과 같다.
  // 링크 · 버튼 · 위아래 막대 · 알림 · 크레딧 · 페이지에서 시작한 끌기, 스크롤할 내용이 남은 패널은 그대로 둔다
  let md = null;
  // 덱의 카드(링크)에서 시작한 끌기는 받는다 — 그냥 누르면 카드가 열리고, 끌었으면 클릭을 삼킨다
  const noDrag = (el) => !!el?.closest?.('a:not(.r-card), button, input, textarea, select, label, .guide-toast, .credits, .hud-top, .hud-bottom, .index, .lightbox, .page, .sound-hint, .skip');
  // 끈 뒤에 따라오는 클릭(카드 열기 등)은 삼킨다
  const swallowClick = () => {
    const stop = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => removeEventListener('click', stop, true), 0);
  };
  const endMouse = () => {
    const m = md;
    md = null;
    const st = pull;
    // 넘기는 것이 먼저 — 끌려온 화면을 그 자리에서 이어 내보낼 수 있게(그다음 표시를 걷는다)
    if (m && st?.armed && !isBlocked()) fire(st.dir, 900, 'drag');
    endPull();
    if (m?.moved) swallowClick();
  };
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || isBlocked() || noDrag(e.target)) return;
    md = { x: e.clientX, y: e.clientY, el: e.target, moved: false, couldScroll: { 1: !!scrollableAncestor(e.target, 1), '-1': !!scrollableAncestor(e.target, -1) } };
  });
  addEventListener('pointermove', (e) => {
    if (!md || e.pointerType !== 'mouse') return;
    if (!(e.buttons & 1)) return endMouse();
    const dx = e.clientX - md.x;
    const dy = e.clientY - md.y;
    if (Math.hypot(dx, dy) > 6) md.moved = true;
    // 덱을 옆으로 끄는 중이면 덱에 맡긴다
    if (md.el.closest?.('.deck-stage')?.classList.contains('is-dragging')) return endPull();
    if (Math.abs(dy) < 12 || Math.abs(dy) < Math.abs(dx) * 1.2) return endPull();
    const dir = dy < 0 ? 1 : -1;
    if (md.couldScroll[dir]) return endPull();
    const label = pullLabel?.(dir);
    if (!label) return endPull();
    setPull({ dir, p: (Math.abs(dy) - 12) / (MOUSE_PULL - 12), armed: Math.abs(dy) >= MOUSE_PULL, label });
  });
  addEventListener('pointerup', (e) => e.pointerType === 'mouse' && md && endMouse());
  addEventListener('pointercancel', () => md && endMouse());
  addEventListener(
    'touchend',
    (e) => {
      const st0 = pull;
      if (isBlocked()) return endPull();
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = performance.now() - st;
      const go = (dir, lockMs, how) => {
        fire(dir, lockMs, how);
        endPull();
      };
      if (Math.abs(dy) >= Math.abs(dx)) {
        const dir = dy < 0 ? 1 : -1;
        // 세로 스와이프가 패널 스크롤이었다면(끝에 닿았어도) 장면을 넘기지 않는다 — 다음 스와이프가 넘긴다
        if (couldScroll[dir] || scrollableAncestor(startEl, dir)) return endPull();
        // 다 당겨 놓았거나(천천히 끌어도) · 빨리 밀었거나 · 짧아도 빠르게 튕겼으면
        const flick = Math.abs(dy) >= FLICK && performance.now() - lt < 90 && Math.abs(vy) >= FLICK_V && Math.sign(vy) === Math.sign(dy);
        if ((st0?.armed && st0.dir === dir) || (dt <= 700 && Math.abs(dy) >= PULL) || flick) return go(dir, 650, 'swipe');
        return endPull();
      }
      endPull();
      if (dt > 700 || Math.abs(dx) < 55) return;
      // 덱 · 가로 스크롤 영역은 스스로 넘긴다
      if (startEl && (scrollableX(startEl) || startEl.closest?.('.deck-stage'))) return;
      fire(dx < 0 ? 1 : -1, 900);
    },
    { passive: true }
  );

  // 화면 안에서 스크롤하는 소개 화면('아래에 더 있어요 ↓'): ↓ · ↑ · PageDown · PageUp · Space는 휠처럼 가려진 글을 먼저 보여 주고
  // (↓ · ↑는 몇 줄씩, PageDown · PageUp · Space는 아래 흐림 띠를 뺀 한 화면씩), 끝에 닿은 뒤에 새로 누른 키가 화면을 넘긴다.
  // 스크롤로 시작한 누름은 누르고 있어도(자동 반복) 끝에서 멈춘다 — 손가락 스와이프와 같다. ← · →는 늘 바로 넘긴다.
  // 화면을 넘긴 잠금(lockUntil) 동안의 누름은 넘길 때처럼 버린다 — 아직 들어오는 화면을 스크롤하면 그 화면이 끝까지 내려간 채
  // 도착해 머리줄 · 제목이 HUD 밑에 가려졌다(빠르게 ↓ ↓)
  let keyScrolled = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // 부드럽게 스크롤: 그림마다 scrollTop을 직접 옮긴다(scrollBy의 smooth 스크롤은 가끔 움직이지 않고 끝나 키 한 번이 헛돌 때가
  // 있었다 — 측정 중 열두 번에 두 번). 이어 누르면 이어서 더 가고, 그사이 손가락 · 휠이 움직이면 멈춘다
  let tween = null;
  const glide = (el, by) => {
    const max = el.scrollHeight - el.clientHeight;
    const from = el.scrollTop;
    let to = Math.max(0, Math.min(max, (tween?.el === el ? tween.to : from) + by));
    // 끝(위 · 아래)까지 몇 px만 남으면 끝까지 — 글 없는 몇 px 띠만 옮기는 누름은 아무것도 안 바뀐 것처럼 보여 키 한 번이 헛돈다
    if (by > 0 && max - to < 24) to = max;
    if (by < 0 && to < 24) to = 0;
    if (tween) cancelAnimationFrame(tween.raf);
    tween = null;
    if (reduce.matches) return void (el.scrollTop = to);
    const t0 = performance.now();
    const tw = (tween = { el, to, last: from, raf: 0 });
    const frame = (now) => {
      if (tween !== tw || Math.abs(el.scrollTop - tw.last) > 2) return void (tween === tw && (tween = null));
      const p = Math.min(1, (now - t0) / 260);
      el.scrollTop = from + (to - from) * (1 - (1 - p) ** 3);
      tw.last = el.scrollTop;
      if (p < 1) tw.raf = requestAnimationFrame(frame);
      else tween = null;
    };
    tw.raf = requestAnimationFrame(frame);
  };
  const keyScroll = (dir, k, repeat) => {
    if (!repeat) keyScrolled = false;
    if (k === 'ArrowRight' || k === 'ArrowLeft') return false;
    const el = scrollableAncestor(scroller?.(), dir);
    if (!el) return repeat && keyScrolled;
    // 아직 들어서는 화면(장면이 바뀌는 중 · 화면 칸을 누른 직후): 누름을 버린다 — 잠금(lockUntil)이 끝난 뒤에도 줄이 다 나타나기 전이면
    if (settled && !settled()) return true;
    const cs = getComputedStyle(el);
    const view = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    glide(el, dir * (k === 'ArrowDown' || k === 'ArrowUp' ? 80 : Math.max(80, view - 48)));
    keyScrolled = true;
    return true;
  };
  addEventListener('keyup', () => (keyScrolled = false));

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (onKey(e)) return;
    if (isBlocked()) return;
    const k = e.key;
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(k) || (k === ' ' && !e.target.closest('button, a'))) {
      e.preventDefault();
      if (performance.now() < lockUntil) return;
      if (keyScroll(1, k, e.repeat)) return;
      fire(1, 600, undefined, e.repeat ? 170 : 0, e.repeat);
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) {
      e.preventDefault();
      if (performance.now() < lockUntil) return;
      if (keyScroll(-1, k, e.repeat)) return;
      fire(-1, 600, undefined, e.repeat ? 170 : 0, e.repeat);
    } else if (k === 'Home') {
      e.preventDefault();
      first();
    } else if (k === 'End') {
      e.preventDefault();
      last();
    }
  });
}
