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

export function createInput({ next, prev, first, last, isBlocked, onKey }) {
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
      // 트랙패드 가로 스크롤은 릴을 넘긴다
      if (horizontal && scrollableX(e.target)) return;
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
    },
    { passive: true }
  );
  addEventListener(
    'touchend',
    (e) => {
      if (isBlocked()) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = performance.now() - st;
      if (dt > 700) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const dist = horizontal ? dx : dy;
      if (Math.abs(dist) < 55) return;
      const dir = dist < 0 ? 1 : -1;
      // 세로 스와이프가 패널 스크롤이었다면 장면을 넘기지 않는다
      if (!horizontal && (couldScroll[dir] || scrollableAncestor(startEl, dir))) return;
      if (horizontal && startEl && scrollableX(startEl)) return;
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
