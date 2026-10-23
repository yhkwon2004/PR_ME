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
const html = document.documentElement;

export function createInput({ next, prev, first, last, isBlocked, onKey, onPull, pullLabel }) {
  let acc = 0;
  let lockUntil = 0;
  let idleTimer = 0;
  let stepped = false;

  const fire = (dir, lockMs = 1100) => {
    const now = performance.now();
    if (now < lockUntil) return;
    const moved = dir > 0 ? next() : prev();
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
      sy = t.clientY;
      st = performance.now();
      startEl = e.target;
      // 손가락을 대는 순간 패널이 더 스크롤될 수 있었는지 기억한다
      couldScroll = { 1: !!scrollableAncestor(startEl, 1), '-1': !!scrollableAncestor(startEl, -1) };
      endPull();
    },
    { passive: true }
  );
  // 위아래로 끄는 동안: 끈 만큼 다음 · 이전 표시가 차오른다
  addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1 || isBlocked() || ownsDrag(startEl)) return endPull();
      const t = e.touches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dy) < 12 || Math.abs(dy) < Math.abs(dx) * 1.2) return endPull();
      const dir = dy < 0 ? 1 : -1;
      // 패널을 스크롤하던 손가락이면 표시하지 않는다
      if (couldScroll[dir] || scrollableAncestor(startEl, dir)) return endPull();
      const label = pullLabel?.(dir);
      if (!label) return endPull();
      const p = (Math.abs(dy) - 12) / (PULL - 12);
      setPull({ dir, p, armed: Math.abs(dy) >= PULL, label });
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
    endPull();
    if (!m) return;
    if (m.moved) swallowClick();
    if (st?.armed && !isBlocked()) fire(st.dir, 900);
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
      const armed = pull?.armed;
      endPull();
      if (isBlocked()) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = performance.now() - st;
      // 다 당겨 놓았으면 천천히 끌었어도 넘긴다
      if (dt > 700 && !armed) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const dist = horizontal ? dx : dy;
      if (Math.abs(dist) < (horizontal ? 55 : PULL)) return;
      const dir = dist < 0 ? 1 : -1;
      // 세로 스와이프가 패널 스크롤이었다면 장면을 넘기지 않는다
      if (!horizontal && (couldScroll[dir] || scrollableAncestor(startEl, dir))) return;
      if (horizontal && startEl && (scrollableX(startEl) || startEl.closest?.('.deck-stage'))) return;
      fire(dir, 900);
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
