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
  const PHONE = '(max-width: 820px), (orientation: portrait) and (max-width: 1100px)';

  function render() {
    const m = list[i];
    media.innerHTML = '';
    box.classList.remove('is-zoom');
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
    // 설명은 글자로만 넣는다(마크업으로 해석하지 않음). '(재)광주정보문화산업진흥원장' · '㈜에스케이엠엔엠'처럼 앞에 붙은 법인 표시와
    // 하이픈으로 이은 영문 낱말(IDEA-GO-ROUND)은 떨어지지 않게(WORD JOINER), 줄은 '·' · '—' · '→'로 시작하지 않게(앞 칸을 NBSP로 —
    // site.js sep()과 같게)
    const no = document.createElement('span');
    no.textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    const text = m.caption
      .replace(/(\([재주사]\)|㈜)(?=\S)/g, '$1⁠')
      .replace(/([A-Za-z0-9])-(?=[A-Za-z0-9])/g, '$1-⁠')
      .replace(/ ([·—–→]) /g, ' $1 ');
    cap.replaceChildren(no, document.createTextNode(text));
    if (m.type !== 'video' && matchMedia(PHONE).matches) {
      const hint = document.createElement('small');
      hint.className = 'lb-hint';
      hint.textContent = '그림을 누르면 크게 보입니다';
      cap.append(hint);
    }
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
    box.classList.remove('is-zoom');
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
  // 휴대폰: 그림을 누르면 크게(2.4배) — 발표 자료 · 도면 글자를 손가락으로 밀며 읽는다. 다시 누르면 원래대로.
  // 누른 자리가 손가락 아래에 그대로 남도록 스크롤을 맞춘다
  media.addEventListener('click', (e) => {
    const im = e.target;
    if (im.tagName !== 'IMG' || !matchMedia(PHONE).matches) return;
    const r = im.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const on = box.classList.toggle('is-zoom');
    if (!on) return;
    const mr = media.getBoundingClientRect();
    media.scrollLeft = fx * im.offsetWidth - (e.clientX - mr.left);
    media.scrollTop = fy * im.offsetHeight - (e.clientY - mr.top);
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
      if (box.classList.contains('is-zoom')) return; // 크게 본 동안의 밀기는 넘기기가 아니라 읽기
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
