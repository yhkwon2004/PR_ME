import gsap from 'gsap';

export function createLightbox() {
  const box = document.getElementById('lightbox');
  const media = box.querySelector('.lb-media');
  const cap = box.querySelector('figcaption');
  const btnClose = box.querySelector('.lb-close');
  const btnPrev = box.querySelector('.lb-prev');
  const btnNext = box.querySelector('.lb-next');
  let list = [];
  let i = 0;
  let opener = null;
  let open = false;

  function render() {
    const m = list[i];
    media.innerHTML = '';
    if (m.type === 'video') {
      const v = document.createElement('video');
      v.src = m.src;
      v.poster = m.poster || '';
      v.controls = true;
      v.autoplay = true;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      media.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = m.src;
      img.alt = m.caption;
      media.appendChild(img);
    }
    // 설명은 글자로만 넣는다(마크업으로 해석하지 않음)
    const no = document.createElement('span');
    no.textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    cap.replaceChildren(no, document.createTextNode(m.caption));
    btnPrev.hidden = btnNext.hidden = list.length < 2;
    gsap.fromTo(media, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
  }

  function show(scene, index, el) {
    list = scene.media;
    i = index;
    opener = el;
    open = true;
    box.hidden = false;
    document.body.classList.add('lightbox-open');
    // 보이게 한 뒤에 포커스를 옮긴다(visibility:hidden 상태에서는 포커스가 들어가지 않는다)
    gsap.set(box, { visibility: 'visible' });
    gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    render();
    btnClose.focus();
  }
  function close() {
    if (!open) return;
    open = false;
    document.body.classList.remove('lightbox-open');
    gsap.to(box, {
      autoAlpha: 0,
      duration: 0.25,
      onComplete: () => {
        box.hidden = true;
        media.innerHTML = '';
      },
    });
    opener?.focus?.();
  }
  const step = (d) => {
    i = (i + d + list.length) % list.length;
    render();
  };
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => step(-1));
  btnNext.addEventListener('click', () => step(1));
  box.addEventListener('click', (e) => {
    if (e.target === box) close();
  });
  // 터치: 좌우로 밀어서 이전/다음
  let sx = 0;
  let sy = 0;
  box.addEventListener(
    'touchstart',
    (e) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    },
    { passive: true }
  );
  box.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (list.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
    },
    { passive: true }
  );

  return {
    show,
    close,
    get open() {
      return open;
    },
    key(e) {
      if (!open) return false;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') {
        // 포커스를 대화상자 안에 가둔다
        const f = [...box.querySelectorAll('button:not([hidden]), video')];
        const idx = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
        return true;
      } else return true;
      e.preventDefault();
      return true;
    },
  };
}
