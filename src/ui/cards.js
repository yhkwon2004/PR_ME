// 카드 호버 연출: 포인터를 따라 살짝 기울고, 빛이 표면을 훑는다.
// 문서에 리스너 하나만 두고(필름 릴·아카이브·수상 페이지 공통), 마우스처럼 정밀한 포인터에서만 동작한다.
const SEL = '.r-card, .w-card, .aw-card';

export function bindCardFx({ reducedMotion }) {
  if (reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let card = null;
  let raf = 0;
  let last = null;

  const reset = (c) => {
    c.classList.remove('is-tilt');
    c.style.removeProperty('--rx');
    c.style.removeProperty('--ry');
  };
  const apply = () => {
    raf = 0;
    if (!card || !last) return;
    // 드래그로 릴을 넘기는 중에는 기울이지 않는다
    if (card.closest('.is-dragging')) return reset(card);
    const r = card.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (last.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (last.clientY - r.top) / r.height));
    card.classList.add('is-tilt');
    card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    card.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const c = e.target.closest?.(SEL) || null;
      if (c !== card) {
        if (card) reset(card);
        card = c;
      }
      if (!card) return;
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    },
    { passive: true }
  );
  // 포인터는 그대로인데 페이지 · 릴이 스크롤되면 기울었던 카드를 푼다
  document.addEventListener(
    'scroll',
    () => {
      if (!card) return;
      reset(card);
      card = null;
    },
    { capture: true, passive: true }
  );
  // 포인터가 창 밖으로 나가면 기울기를 푼다
  document.addEventListener('mouseout', (e) => {
    if (e.relatedTarget || !card) return;
    reset(card);
    card = null;
  });
}
