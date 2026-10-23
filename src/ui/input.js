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
// 패널 글을 끝까지 스크롤한 손가락이 떼지 않고 더 밀면: 끝에 닿은 자리부터 이만큼 더 밀어야 넘어간다
const HANDOFF = PULL + 18;
const html = document.documentElement;

export function createInput({ next, prev, first, last, isBlocked, onKey, onPull, pullLabel }) {
  let acc = 0;
  let lockUntil = 0;
  let idleTimer = 0;
  let stepped = false;

  // how: 'swipe'(손가락으로 위아래 — 카드는 건너뛰고 장면) · 'drag'(마우스로 끌기) · 없으면 휠 · 키
  const fire = (dir, lockMs = 1100, how) => {
    const now = performance.now();
    if (now < lockUntil) return;
    const moved = dir > 0 ? next(how) : prev(how);
    if (moved === false) return;
    // 릴 카드 한 장은 장면 전환보다 짧게 잠근다
    stepped = moved === 'step';
    lockUntil = now + (stepped ? Math.min(lockMs, 560) : lockMs);
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
  let base = null; // 패널 글을 끝까지 스크롤한 뒤 이어서 미는 손가락: 끝에 닿은 자리
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
      base = null;
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
      let dist = Math.abs(dy);
      let need = PULL;
      if (couldScroll[dir]) {
        // 패널 글을 스크롤하던 손가락: 끝에 닿으면 떼지 않아도 그 자리부터 이어서 당겨 넘긴다
        if (scrollableAncestor(startEl, dir)) return endPull();
        if (base === null) base = t.clientY;
        dist = (base - t.clientY) * dir;
        need = HANDOFF;
        if (dist < 12) return endPull();
      } else if (scrollableAncestor(startEl, dir)) return endPull();
      const label = pullLabel?.(dir, 'swipe');
      if (!label) return endPull();
      setPull({ dir, p: (dist - 12) / (need - 12), armed: dist >= need, label });
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
        // 글을 끝까지 스크롤하고 이어 민 손가락: 끝에서부터 다 밀었을 때만
        if (base !== null) return st0?.armed && st0.dir === dir ? go(dir, 650, 'swipe') : endPull();
        // 세로 스와이프가 패널 스크롤이었다면 장면을 넘기지 않는다
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

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (onKey(e)) return;
    if (isBlocked()) return;
    const k = e.key;
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(k) || (k === ' ' && !e.target.closest('button, a'))) {
      e.preventDefault();
      fire(1, 600);
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) {
      e.preventDefault();
      fire(-1, 600);
    } else if (k === 'Home') {
      e.preventDefault();
      first();
    } else if (k === 'End') {
      e.preventDefault();
      last();
    }
  });
}
