import gsap from 'gsap';

const pad = (n) => String(n).padStart(2, '0');

export function createHud(scenes, { onGo, onToggleAuto, onToggleSound, reducedMotion }) {
  const $ = (id) => document.getElementById(id);
  const timeline = $('timeline');
  const indexEl = $('index');
  const indexList = $('index-list');
  const btnIndex = $('btn-index');
  const btnPlay = $('btn-play');
  const btnSound = $('btn-sound');
  const sceneLbl = $('hud-scene');
  const tcLbl = $('hud-tc');
  const card = $('title-card');
  const hint = $('hint');
  const last = scenes.length - 1;

  timeline.innerHTML = scenes
    .map(
      (s, i) => `<li><button type="button" data-i="${i}" aria-label="${pad(i)} ${s.ko} — ${s.label}">
        <span class="tl-no">${pad(i)}</span><span class="tl-name">${s.ko}</span><i class="tl-fill"></i>
      </button></li>`
    )
    .join('');
  indexList.innerHTML = scenes
    .map(
      (s, i) => `<li><button type="button" data-i="${i}"><span class="ix-no">${pad(i)}</span><span class="ix-name">${s.ko}</span><span class="ix-code">${s.label}</span></button></li>`
    )
    .join('');
  const tlButtons = [...timeline.querySelectorAll('button')];
  const fills = tlButtons.map((b) => b.querySelector('.tl-fill'));

  timeline.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) onGo(+b.dataset.i);
  });
  indexList.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    closeIndex();
    onGo(+b.dataset.i);
  });

  let indexOpen = false;
  let lastFocus = null;
  function openIndex() {
    indexOpen = true;
    lastFocus = document.activeElement;
    indexEl.hidden = false;
    btnIndex.setAttribute('aria-expanded', 'true');
    document.body.classList.add('index-open');
    gsap.fromTo(indexEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 });
    gsap.fromTo(indexList.children, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.04, duration: 0.6, ease: 'power3.out' });
    indexList.querySelector('button')?.focus();
  }
  function closeIndex() {
    if (!indexOpen) return;
    indexOpen = false;
    btnIndex.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('index-open');
    gsap.to(indexEl, { autoAlpha: 0, duration: 0.3, onComplete: () => (indexEl.hidden = true) });
    lastFocus?.focus?.();
  }
  btnIndex.addEventListener('click', () => (indexOpen ? closeIndex() : openIndex()));
  indexEl.querySelector('.index-close').addEventListener('click', () => closeIndex());
  indexEl.addEventListener('click', (e) => {
    // 아카이브 링크는 페이지로 넘어가므로 목록을 닫는다(이동은 site.js가 맡는다)
    if (e.target === indexEl || e.target.closest('a[data-link]')) closeIndex();
  });
  btnPlay.addEventListener('click', onToggleAuto);
  btnSound.addEventListener('click', onToggleSound);

  let active = -1;
  function setScene(i, prev, duration) {
    active = i;
    tlButtons.forEach((b, j) => {
      b.classList.toggle('is-active', j === i);
      // 휴대폰: 지금 장면의 칸만 넓혀 이름을 보인다
      b.parentElement.classList.toggle('is-now', j === i);
      b.classList.toggle('is-past', j < i);
      if (j === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      fills[j].style.transform = `scaleX(${j < i ? 1 : 0})`;
    });
    [...indexList.querySelectorAll('button')].forEach((b, j) => b.classList.toggle('is-active', j === i));
    sceneLbl.textContent = `SC ${pad(i)} / ${pad(last)}`;
    document.body.dataset.scene = scenes[i].id;
    if (i > 0) hint.classList.add('is-gone');

    // 장면 사이 타이틀 카드
    if (prev >= 0 && duration > 0.5 && !reducedMotion) {
      card.querySelector('.tc-no').textContent = `${pad(i)} · ${scenes[i].label}`;
      card.querySelector('.tc-name').textContent = scenes[i].ko;
      gsap.killTweensOf(card);
      gsap
        .timeline()
        .fromTo(card, { autoAlpha: 0, letterSpacing: '0.6em' }, { autoAlpha: 1, letterSpacing: '0.32em', duration: duration * 0.35, ease: 'power2.out' }, duration * 0.12)
        .to(card, { autoAlpha: 0, duration: duration * 0.25, ease: 'power2.in' }, duration * 0.55);
    }
    document.body.classList.add('is-moving');
    clearTimeout(setScene.t);
    setScene.t = setTimeout(() => document.body.classList.remove('is-moving'), Math.max(300, duration * 1000 * 0.85));
  }

  let lastP = -1;
  let lastFill = null;
  function setProgress(p) {
    const f = active >= 0 ? fills[active] : null;
    if (!f) return;
    const v = Math.round(Math.min(1, p) * 1000) / 1000;
    if (f === lastFill && v === lastP) return;
    lastFill = f;
    lastP = v;
    f.style.transform = `scaleX(${v})`;
  }

  function setAuto(on) {
    btnPlay.setAttribute('aria-pressed', String(on));
    btnPlay.setAttribute('aria-label', on ? '자동 재생 끄기' : '자동 재생 켜기');
    btnPlay.classList.toggle('is-on', on);
  }
  function setSound(on) {
    btnSound.setAttribute('aria-pressed', String(on));
    btnSound.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
    btnSound.classList.toggle('is-on', on);
  }

  // 24fps 타임코드
  // 타임코드는 화면에 보일 때(데스크톱), 글자가 바뀔 때만 쓴다
  let lastTc = '';
  const tcShown = matchMedia('(min-width: 1181px) and (min-height: 501px)'); // 좁은 화면 · 가로 휴대폰에서는 타임코드를 숨긴다(main.css)
  function setTime(sec) {
    if (!tcShown.matches) return;
    const f = Math.floor((sec % 1) * 24);
    const s = Math.floor(sec) % 60;
    const m = Math.floor(sec / 60) % 60;
    const h = Math.floor(sec / 3600);
    const tc = `TC ${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
    if (tc !== lastTc) tcLbl.textContent = lastTc = tc;
  }

  return {
    setScene,
    setProgress,
    setAuto,
    setSound,
    setTime,
    openIndex,
    closeIndex,
    get indexOpen() {
      return indexOpen;
    },
  };
}

// 커서 링과 3D 오브젝트 툴팁
export function createCursor() {
  const cursor = document.getElementById('cursor');
  const tip = document.getElementById('tooltip');
  const fine = matchMedia('(pointer: fine)').matches;
  if (!fine) cursor.style.display = 'none';
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const cur = { x: pos.x, y: pos.y };
  let label = null;
  let tipX = NaN;
  let tipY = NaN;
  addEventListener('pointermove', (e) => {
    document.body.classList.add('has-pointer');
    pos.x = e.clientX;
    pos.y = e.clientY;
    const interactive = e.target.closest?.('a, button, [data-media]');
    cursor.classList.toggle('is-link', !!interactive);
  });
  addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  return {
    setActor(info) {
      if (info === label) return;
      label = info;
      cursor.classList.toggle('is-actor', !!info);
      tip.classList.toggle('is-on', !!info);
      if (info) {
        tip.querySelector('b').textContent = info.title;
        tip.querySelector('small').textContent = info.sub;
      }
    },
    // 커서가 멈춰 있으면 쓰지 않는다
    tick() {
      const dx = pos.x - cur.x;
      const dy = pos.y - cur.y;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && pos.x === tipX && pos.y === tipY) return;
      cur.x += dx * 0.22;
      cur.y += dy * 0.22;
      if (fine) cursor.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
      if (pos.x !== tipX || pos.y !== tipY) {
        tipX = pos.x;
        tipY = pos.y;
        tip.style.transform = `translate3d(${pos.x + 22}px, ${pos.y + 18}px, 0)`;
      }
    },
  };
}
