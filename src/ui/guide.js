// 관람 안내 — 처음 온 사람이 길을 잃지 않게.
// 처음 방문 사용법 · 다음 장면 버튼(자동 재생 남은 시간) · 짧은 알림 · 이어 보기 · 인덱스의 연락처와 단축키
const pad = (n) => String(n).padStart(2, '0');
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 사생활 보호 모드 등에서 저장소가 막혀 있어도 안내는 그대로 동작한다
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 저장 못 해도 괜찮다 */
    }
  },
};
const KEY_SEEN = 'kwon:guide-seen';
const KEY_LAST = 'kwon:last-scene';

export function createGuide(scenes, { profile, onNext, onGo, onAuto, onPeek, reducedMotion }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const last = scenes.length - 1;
  const hudBottom = document.getElementById('hud-bottom');

  // ── 다음 장면 버튼: 다음 장면 이름과, 자동 재생이면 넘어가기까지 남은 시간을 고리로 ──
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'next-cue';
  next.hidden = true;
  next.innerHTML = `<span class="nc-ring" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="nc-track" cx="18" cy="18" r="16" /><circle class="nc-fill" cx="18" cy="18" r="16" pathLength="100" /></svg><i>→</i></span><span class="nc-t"><small>다음 장면</small><b></b></span>`;
  hudBottom?.appendChild(next);
  next.addEventListener('click', () => onNext());
  const ncName = next.querySelector('b');
  const ncFill = next.querySelector('.nc-fill');

  // ── 짧은 알림(한 번에 하나) ──
  const toast = document.createElement('div');
  toast.className = 'guide-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  document.body.appendChild(toast);
  let toastT = 0;
  function say(text, { action, onAction, ms = 5200 } = {}) {
    clearTimeout(toastT);
    toast.innerHTML = `<span class="gt-text">${esc(text)}</span>${action ? `<button type="button" class="gt-act">${esc(action)}</button>` : ''}<button type="button" class="gt-x" aria-label="알림 닫기">×</button>`;
    toast.hidden = false;
    toast.classList.remove('is-on');
    void toast.offsetWidth;
    toast.classList.add('is-on');
    document.body.classList.add('has-toast');
    toast.style.setProperty('--ms', `${ms}ms`);
    toast.querySelector('.gt-act')?.addEventListener('click', () => {
      hide();
      onAction?.();
    });
    toast.querySelector('.gt-x').addEventListener('click', hide);
    toastT = setTimeout(hide, ms);
  }
  function hide() {
    clearTimeout(toastT);
    toast.classList.remove('is-on');
    document.body.classList.remove('has-toast');
    toastT = setTimeout(() => (toast.hidden = true), 400);
  }
  // 휴대폰: 알림을 옆이나 아래로 밀어 닫는다
  {
    let t0 = null;
    toast.addEventListener('touchstart', (e) => (t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }), { passive: true });
    toast.addEventListener(
      'touchmove',
      (e) => {
        if (!t0) return;
        const dx = e.touches[0].clientX - t0.x;
        const dy = Math.max(0, e.touches[0].clientY - t0.y);
        toast.style.translate = `${dx}px ${dy}px`;
        toast.style.opacity = String(Math.max(0.2, 1 - Math.hypot(dx, dy) / 160));
      },
      { passive: true }
    );
    toast.addEventListener(
      'touchend',
      (e) => {
        if (!t0) return;
        const dx = e.changedTouches[0].clientX - t0.x;
        const dy = e.changedTouches[0].clientY - t0.y;
        t0 = null;
        toast.style.translate = '';
        toast.style.opacity = '';
        // 알림을 민 손가락이 장면까지 넘기지 않게
        e.stopPropagation();
        if (Math.abs(dx) > 60 || dy > 36) hide();
      },
      { passive: true }
    );
  }

  // ── 끌기 안내: 반투명한 손끝이 화면을 살짝 밀어 보인다(덱은 옆으로, 장면은 위로) ──
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.hidden = true;
  ghost.innerHTML = '<span class="dg-trail"></span><span class="dg-dot"></span><small class="dg-t"></small>';
  document.body.appendChild(ghost);
  let ghostT = 0;
  function showGhost(kind, rect) {
    if (reducedMotion || !rect) return;
    clearTimeout(ghostT);
    ghost.hidden = false;
    ghost.className = `drag-ghost is-${kind}`;
    ghost.style.left = `${rect.left + rect.width / 2}px`;
    ghost.style.top = `${rect.top + rect.height / 2}px`;
    ghost.querySelector('.dg-t').textContent = kind === 'x' ? (touch ? '옆으로 밀어 넘기기' : '끌어서 넘기기') : '살짝 밀어 올리면 다음';
    void ghost.offsetWidth;
    ghost.classList.add('is-on');
    ghostT = setTimeout(hideGhost, 3400);
  }
  function hideGhost() {
    clearTimeout(ghostT);
    ghost.classList.remove('is-on');
    ghostT = setTimeout(() => (ghost.hidden = true), 300);
  }

  // ── 당겨 넘기기: 위아래로 끄는 만큼 다음 · 이전 표시가 차오르고, 다 차면 놓는 순간 넘어간다 ──
  const pull = document.createElement('div');
  pull.className = 'pull-cue';
  pull.setAttribute('aria-hidden', 'true');
  pull.hidden = true;
  pull.innerHTML = `<span class="pl-ring"><svg viewBox="0 0 36 36"><circle class="pl-track" cx="18" cy="18" r="15" /><circle class="pl-fill" cx="18" cy="18" r="15" pathLength="100" /></svg><i>↑</i></span><span class="pl-t"><small></small><b></b></span>`;
  document.body.appendChild(pull);
  const plFill = pull.querySelector('.pl-fill');
  const plArrow = pull.querySelector('.pl-ring i');
  const plSmall = pull.querySelector('.pl-t small');
  const plName = pull.querySelector('.pl-t b');
  const stageEl = document.getElementById('stage');
  let armed = false;
  function setPull(st) {
    if (!st || !st.label) {
      pull.classList.remove('is-on', 'is-armed');
      if (stageEl) {
        stageEl.classList.remove('is-pulling');
        stageEl.style.translate = '';
      }
      armed = false;
      return;
    }
    hideGhost();
    if (!toast.hidden) hide();
    pull.hidden = false;
    pull.dataset.dir = st.dir > 0 ? 'next' : 'prev';
    pull.classList.add('is-on');
    pull.style.setProperty('--p', Math.min(1, st.p).toFixed(3));
    plFill.style.strokeDashoffset = String(100 - Math.min(1, st.p) * 100);
    plArrow.textContent = st.dir > 0 ? '↑' : '↓';
    plName.textContent = st.label;
    plSmall.textContent = st.armed ? '놓으면 이동' : st.dir > 0 ? '조금 더 밀어 올리기' : '조금 더 끌어내리기';
    pull.classList.toggle('is-armed', !!st.armed);
    if (st.armed && !armed) navigator.vibrate?.(8);
    armed = !!st.armed;
    // 화면 전체가 손가락을 따라 살짝 끌려온다(고무줄처럼)
    if (stageEl && !reducedMotion) {
      stageEl.classList.add('is-pulling');
      stageEl.style.translate = `0 ${(-st.dir * Math.min(1.2, st.p) * 18).toFixed(1)}px`;
    }
  }

  // ── 처음 방문: 첫 장면 아래의 짧은 안내를 세 가지 사용법으로 ──
  const hint = document.getElementById('hint');
  const firstVisit = !store.get(KEY_SEEN);
  if (hint && firstVisit) {
    const items = touch
      ? [
          ['↕', '위로 스와이프', '다음 카드 · 장면'],
          ['☝', '카드 탭', '프로젝트 자세히'],
          ['☰', '목록', '장면 · 아카이브'],
        ]
      : [
          ['', '스크롤 · ← →', '다음 카드 · 장면'],
          ['↗', '카드 클릭', '프로젝트 자세히'],
          ['☰', '목차', '장면 · 모아 보기 · 연락처'],
        ];
    hint.classList.add('is-coach');
    hint.innerHTML = items
      .map(
        ([ico, k, v], j) =>
          `<span class="hc-item">${j === 0 && !touch ? '<span class="hint-mouse"><i></i></span>' : `<span class="hc-ico">${ico}</span>`}<span class="hc-t"><b>${esc(k)}</b><small>${esc(v)}</small></span></span>`
      )
      .join('<span class="hc-sep" aria-hidden="true"></span>');
  }

  // ── 인덱스: 아카이브 줄 아래에 연락처와 단축키 ──
  const archive = document.querySelector('.index-archive');
  if (archive && profile) {
    const email = profile.links.find((l) => l.url.startsWith('mailto:'));
    const row = document.createElement('nav');
    row.className = 'index-archive index-contact';
    row.setAttribute('aria-label', '연락처');
    row.innerHTML = `<span>연락처</span>${profile.links
      .map((l) => `<a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}>${esc(l.label.toUpperCase())}</a>`)
      .join('')}${email ? `<button type="button" class="ic-copy" data-copy="${esc(email.value)}">이메일 복사</button>` : ''}`;
    archive.after(row);
    row.querySelector('.ic-copy')?.addEventListener('click', async (e) => {
      const v = e.currentTarget.dataset.copy;
      try {
        await navigator.clipboard.writeText(v);
        say(`이메일 주소를 복사했어요 — ${v}`, { ms: 3200 });
      } catch {
        say(v, { ms: 6000 });
      }
    });
    if (!touch) {
      const keys = document.createElement('p');
      keys.className = 'index-keys';
      keys.innerHTML = [
        ['← →', '넘기기'],
        ['P', '자동 재생'],
        ['M', '소리'],
        ['I', '목록'],
        ['Home · End', '처음 · 끝'],
        ['Esc', '닫기'],
      ]
        .map(([k, v]) => `<span><kbd>${esc(k)}</kbd>${esc(v)}</span>`)
        .join('');
      row.after(keys);
    }
  }

  let current = -1;
  let lastAuto = null; // 매 프레임 같은 값을 다시 쓰지 않게
  let lastRing = -1;
  let deckTold = false;
  let coachTold = false;
  let takeoverTold = false;
  return {
    // 장면이 바뀔 때
    setScene(i, hasDeck) {
      current = i;
      // 좁은 화면은 첫 장면 아래에 자리가 없어, 처음 방문 사용법을 위쪽 알림으로 한 번
      if (i === 0 && firstVisit && !coachTold && matchMedia('(max-width: 820px), (max-height: 500px)').matches) {
        coachTold = true;
        setTimeout(() => current === 0 && say(touch ? '위로 스와이프하면 다음 장면 · 카드를 탭하면 프로젝트 · ☰ 장면 목록' : '스크롤하면 다음 장면 · 카드를 누르면 프로젝트 · ☰ 장면 목록', { ms: 7000 }), reducedMotion ? 500 : 3200);
      }
      document.body.classList.toggle('has-deck', !!hasDeck);
      if (i >= last) next.hidden = true;
      else {
        next.hidden = false;
        ncName.textContent = scenes[i + 1].ko;
        next.setAttribute('aria-label', `다음 장면 — ${pad(i + 1)} ${scenes[i + 1].label}`);
      }
      // 처음 방문 안내는 첫 장면을 떠나면 다 본 것으로
      if (i > 0) store.set(KEY_SEEN, '1');
      // 이어 보기용: 마지막으로 본 장면(처음 · 끝 장면은 저장하지 않는다)
      if (i > 0 && i < last) store.set(KEY_LAST, JSON.stringify({ i, at: Date.now() }));
      if (i === last) store.set(KEY_LAST, '');
      // 처음 만나는 카드 덱: 넘기는 법을 한 번 알려 준다
      if (hasDeck && !deckTold) {
        deckTold = true;
        setTimeout(() => {
          if (current !== i) return;
          document.body.classList.add('deck-cue');
          setTimeout(() => document.body.classList.remove('deck-cue'), 4200);
          // 덱이 살짝 끌려갔다 돌아오는 동안 반투명한 손끝이 같은 방향으로 민다
          const rect = onPeek?.();
          if (rect) showGhost('x', rect);
          say(touch ? '카드를 옆으로 넘기거나 탭하면 프로젝트를 볼 수 있어요' : '카드를 옆으로 넘기거나(← → · 휠) 눌러서 프로젝트를 볼 수 있어요', { ms: 4800 });
        }, reducedMotion ? 400 : 2200);
      }
    },
    // 자동 재생 남은 시간(0~1) — 끄면 고리를 비운다
    setProgress(p, autoOn) {
      if (autoOn !== lastAuto) next.classList.toggle('is-manual', !(lastAuto = autoOn));
      const v = Math.round(100 - Math.min(1, Math.max(0, p)) * 100);
      if (v !== lastRing) ncFill.style.strokeDashoffset = String((lastRing = v));
    },
    // 손으로 넘기기 시작하면 자동 재생을 멈춘 이유를 한 번만 알린다
    takeover() {
      if (takeoverTold) return;
      takeoverTold = true;
      say('직접 넘기는 중이라 자동 재생을 멈췄어요', { action: touch ? '다시 자동 재생' : '다시 자동 재생 (P)', onAction: onAuto, ms: 5600 });
    },
    // 지난번에 멈춘 장면에서 이어 보기(2주 안 · 처음과 끝 장면 제외)
    offerResume() {
      let saved = null;
      try {
        saved = JSON.parse(store.get(KEY_LAST) || 'null');
      } catch {
        saved = null;
      }
      if (!saved || !(saved.i > 1 && saved.i < last) || Date.now() - saved.at > 14 * 864e5) return;
      const s = scenes[saved.i];
      say(`지난번에 '${s.ko}' 장면까지 보셨어요`, { action: '이어 보기', onAction: () => onGo(saved.i), ms: 9000 });
    },
    say,
    // 끌기 안내(kind: 'x' 덱 · 'y' 장면) — rect: 손끝이 움직일 자리
    ghost: showGhost,
    hideGhost,
    // 당겨 넘기기 표시: { dir, p, armed, label } · 끝나면 null
    pull: setPull,
    get firstVisit() {
      return firstVisit;
    },
  };
}
