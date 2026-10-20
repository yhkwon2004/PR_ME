// 분위기: 덱의 가운데 카드에 맞춰 배경이 바뀐다.
// DOM(#ambient)에는 카드 사진을 크게 흐린 빛 · 색 번짐 · 큰 연도 글자를 깔고,
// 3D에는 카드 색으로 지평선 · 바닥 격자 · 역광 · 화면 그레이드를 물들인다.
import * as THREE from 'three';

const DEFAULT = '#5ef2ff';

// getStage: 3D 무대는 필름을 열 때 만들어지므로 매번 물어본다
export function createMood({ getStage, reducedMotion }) {
  const root = document.getElementById('ambient');
  const type = document.getElementById('amb-type');
  if (!root || !type) return { set() {}, clear() {}, update() {} };
  const roots = [root, type];
  const layers = [...root.querySelectorAll('.amb-photo')];
  const years = [...type.querySelectorAll('.amb-year')];
  let front = 0;
  let yearFront = 0;
  let photo = '';
  let year = '';
  let seq = 0;

  const tint = new THREE.Color(DEFAULT);
  const target = new THREE.Color(DEFAULT);
  let amt = 0;
  let amtTarget = 0;
  let pulse = 0;

  // 사진은 미리 받아 둔 뒤 앞뒤 두 장을 맞바꿔 겹쳐 사라지게
  function showPhoto(src) {
    if (src === photo) return;
    photo = src;
    const token = ++seq;
    if (!src) {
      layers.forEach((l) => l.classList.remove('is-on'));
      return;
    }
    const swap = () => {
      if (token !== seq) return;
      const next = layers[1 - front];
      next.style.backgroundImage = `url("${src}")`;
      next.classList.remove('is-on');
      void next.offsetWidth;
      next.classList.add('is-on');
      layers[front].classList.remove('is-on');
      front = 1 - front;
    };
    const im = new Image();
    im.decoding = 'async';
    im.src = src;
    if (im.decode) im.decode().then(swap, swap);
    else im.onload = im.onerror = swap;
  }

  // 큰 연도 글자: 바뀔 때만 아래에서 올라오며 겹쳐 바뀐다
  function showYear(text, dir) {
    if (text === year) return;
    year = text;
    const next = years[1 - yearFront];
    const prev = years[yearFront];
    next.textContent = text;
    // 들어오는 글자는 시작 자리로 순간 이동한 뒤(앞으로 넘기면 아래에서) 가운데로 올라온다
    next.style.transition = 'none';
    next.style.setProperty('--to', dir < 0 ? '-18%' : '18%');
    next.classList.remove('is-on');
    void next.offsetWidth;
    next.style.transition = '';
    next.classList.add('is-on');
    // 나가는 글자는 반대쪽으로
    prev.style.setProperty('--to', dir < 0 ? '18%' : '-18%');
    prev.classList.remove('is-on');
    yearFront = 1 - yearFront;
  }

  return {
    // card: 덱의 가운데 카드 · dir: 넘긴 방향(1 · -1 · 0)
    set(card, dir = 0) {
      if (!card) return this.clear();
      const cs = getComputedStyle(card);
      // 수상 카드는 등급 색(대상은 금빛), 프로젝트 카드는 분야 색
      const color = ((card.classList.contains('a-card') && cs.getPropertyValue('--tc')) || cs.getPropertyValue('--cc') || DEFAULT).trim();
      target.set(color);
      amtTarget = 1;
      if (dir) pulse = 1;
      roots.forEach((r) => {
        r.style.setProperty('--amb', color);
        r.classList.add('is-on');
      });
      const im = card.querySelector('.card-media img:not(.blur-fill)');
      showPhoto(im ? im.currentSrc || im.src : '');
      showYear((card.querySelector('.card-meta')?.textContent.match(/\d{4}/) || [''])[0], dir);
      // 덱 높이에 맞춰 연도 글자를 덱 뒤에 둔다
      const stageEl = card.closest('.deck-stage');
      if (stageEl) {
        const r = stageEl.getBoundingClientRect();
        if (r.height) roots.forEach((x) => x.style.setProperty('--ay', `${Math.round(r.top + r.height * 0.3)}px`));
      }
    },
    clear() {
      amtTarget = 0;
      roots.forEach((r) => r.classList.remove('is-on'));
      showPhoto('');
      year = '';
      years.forEach((y) => y.classList.remove('is-on'));
    },
    update(dt) {
      const stage = getStage();
      if (!stage) return;
      const k = reducedMotion ? 1 : Math.min(1, dt * 2.2);
      amt += (amtTarget - amt) * k;
      tint.lerp(target, k);
      pulse = Math.max(0, pulse - dt * 1.4);
      const u = stage.film.uniforms;
      u.uTint.value.copy(tint);
      u.uTintAmt.value = amt;
      u.uPulse.value = reducedMotion ? 0 : pulse;
      stage.setMood(tint, amt);
    },
  };
}
