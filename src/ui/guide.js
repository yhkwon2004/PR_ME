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
  // 가운뎃점 · 줄표 · 화살표가 줄 맨 앞에 서지 않게 앞 낱말과 NBSP로 묶는다(site.js의 sep()와 같게) — 알림 글은 고르게 줄을 나누므로
  // ('이메일 주소를 복사했어요 — 주소'가 '— 주소'로 시작하는 줄이 됐다)
  const bindSep = (s) => esc(s).replace(/ ([·—–→]) /g, '&nbsp;$1 ');
  function say(text, { action, onAction, ms = 5200 } = {}) {
    clearTimeout(toastT);
    toast.innerHTML = `<span class="gt-text">${bindSep(text)}</span>${action ? `<button type="button" class="gt-act">${esc(action)}</button>` : ''}<button type="button" class="gt-x" aria-label="알림 닫기">×</button>`;
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
  // 휴대폰: 알림을 옆이나 위아래로 밀어 닫는다(덱 장면에서는 위쪽에 떠서 위로 튕겨 닫는다)
  {
    let t0 = null;
    toast.addEventListener('touchstart', (e) => (t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }), { passive: true });
    toast.addEventListener(
      'touchmove',
      (e) => {
        if (!t0) return;
        const dx = e.touches[0].clientX - t0.x;
        const dy = e.touches[0].clientY - t0.y;
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
        if (Math.abs(dx) > 60 || Math.abs(dy) > 36) hide();
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
  function showGhost(kind, rect, text) {
    if (reducedMotion || !rect) return;
    clearTimeout(ghostT);
    ghost.hidden = false;
    ghost.className = `drag-ghost is-${kind}`;
    ghost.style.left = `${rect.left + rect.width / 2}px`;
    // 카드 위에서는 아래쪽 그늘에(사진의 주인공 · '전체 보기' 글과 겹치지 않게) — 높이가 없는 자리(소개 화면)는 그 자리에
    ghost.style.top = `${rect.top + rect.height * (rect.height ? 0.84 : 0.5)}px`;
    ghost.querySelector('.dg-t').textContent = text || (kind === 'x' ? (touch ? '옆으로 밀어 넘기기' : '끌어서 넘기기') : touch ? '위로 밀어 다음 장면' : '스크롤 · 끌어 올려 다음 장면');
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
    if (!st.demo) {
      // 손으로 끄는 진짜 끌기가 시작되면 넘김 안내 시연은 멈춘다(시연이 끝나며 표시를 걷어 버리지 않게)
      if (demoRaf) {
        cancelAnimationFrame(demoRaf);
        demoRaf = 0;
      }
      hideGhost();
      if (!toast.hidden) hide();
    }
    pull.hidden = false;
    // axis 'x': 덱 끝에서 옆으로 더 민다(다음 장면은 오른쪽 끝 · 이전 장면은 왼쪽 끝에 표시) — 화면 전체를 끌지는 않는다
    const x = st.axis === 'x';
    pull.dataset.dir = st.dir > 0 ? 'next' : 'prev';
    pull.dataset.axis = x ? 'x' : 'y';
    pull.classList.add('is-on');
    pull.style.setProperty('--p', Math.min(1, st.p).toFixed(3));
    plFill.style.strokeDashoffset = String(100 - Math.min(1, st.p) * 100);
    plArrow.textContent = x ? (st.dir > 0 ? '←' : '→') : st.dir > 0 ? '↑' : '↓';
    plName.textContent = st.label;
    plSmall.textContent = st.demo ? '아래로 넘기면' : st.armed ? '놓으면 이동' : x ? '조금 더 밀기' : st.dir > 0 ? '조금 더 밀어 올리기' : '조금 더 끌어내리기';
    pull.classList.toggle('is-armed', !!st.armed);
    if (st.armed && !armed) navigator.vibrate?.(8);
    armed = !!st.armed;
    // 화면 전체가 손가락을 따라 끌려온다 — 처음엔 손가락만큼, 더 끌수록 덜(고무줄처럼) · 옆으로 미는 덱 끝은 덱만 고무줄
    // 시연(st.demo)은 st.room(무대를 끌어 올려도 되는 만큼 — 소개 화면의 머리줄 위 빈자리)까지만. 손가락으로 끄는 진짜 끌기는 그대로
    if (stageEl && !reducedMotion && !x) {
      let lift = 32 * Math.tanh(Math.max(0, st.p) * 0.9);
      if (st.demo && st.room != null) lift = Math.min(lift, st.room);
      stageEl.classList.add('is-pulling');
      stageEl.style.translate = `0 ${(-st.dir * lift).toFixed(1)}px`;
    }
  }
  // 끌어서 넘어가는 순간: 끌려 와 있던 거리를 돌려주고 화면은 제자리로(움직임 없이) — 나가는 패널이 그 자리에서 이어 빠진다
  function commitPull() {
    if (!stageEl?.classList.contains('is-pulling')) return 0;
    const y = parseFloat(String(stageEl.style.translate).split(' ')[1]) || 0;
    stageEl.style.transition = 'none';
    stageEl.style.translate = '';
    stageEl.classList.remove('is-pulling');
    void stageEl.offsetWidth;
    stageEl.style.transition = '';
    return y;
  }

  // ── 장면 넘김 안내: 카드 안내처럼 반투명한 손끝이 아래에서 위로 밀어 올리고(두 번),
  //    그 손끝을 따라 화면 전체가 살짝 끌려 올라갔다 돌아온다 — 아래 표시에 다음 장면 이름이 비친다 ──
  let demoRaf = 0;
  // room: 시연이 무대를 끌어 올려도 되는 만큼(px) — 없으면 제한 없이
  function sceneHint(label, rect, room) {
    if (reducedMotion || !label) return false;
    cancelAnimationFrame(demoRaf);
    // rect가 false면 손끝을 둘 빈자리가 없다(글이 아래 칸 가까이까지 찬 화면) — 시연(끌어 올림 · 아래 표시)만
    if (rect !== false) showGhost('y', rect || { left: innerWidth / 2, top: innerHeight * 0.6, width: 0, height: 0 });
    const t0 = performance.now();
    const CYCLE = 1500; // 손끝 애니메이션(ghost-y) 한 번과 같은 길이
    const ease = (x) => x * x * (3 - 2 * x);
    const step = (now) => {
      const t = (now - t0) / CYCLE;
      if (t >= 2) {
        demoRaf = 0;
        return setPull(null);
      }
      const u = t % 1;
      // 누르고(0~18%) → 끌어 올리고(18~62%) → 놓으면 제자리로(62~90%)
      const p = u < 0.18 ? 0 : u < 0.62 ? ease((u - 0.18) / 0.44) * 0.8 : u < 0.9 ? 0.8 * (1 - ease((u - 0.62) / 0.28)) : 0;
      setPull({ dir: 1, p, armed: false, label, demo: true, room });
      demoRaf = requestAnimationFrame(step);
    };
    demoRaf = requestAnimationFrame(step);
    return true;
  }
  function stopHint() {
    if (!demoRaf) return;
    cancelAnimationFrame(demoRaf);
    demoRaf = 0;
    setPull(null);
    hideGhost();
  }

  // ── 처음 방문: 첫 장면 아래의 짧은 안내를 세 가지 사용법으로 ──
  const hint = document.getElementById('hint');
  const firstVisit = !store.get(KEY_SEEN);
  // 지난 방문에서 멈춘 장면 — 이번 방문의 장면이 덮어쓰기 전에 한 번 읽어 둔다
  const savedLast = store.get(KEY_LAST);
  if (hint && firstVisit) {
    const items = touch
      ? [
          ['↕', '위로 스와이프', '다음 장면'],
          ['↔', '카드는 옆으로', '탭하면 자세히'],
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
      .join('')}${email ? `<button type="button" class="ic-copy" data-copy="${esc(email.value)}" aria-live="polite">이메일 복사</button>` : ''}`;
    archive.after(row);
    // 복사했다는 알림은 단추 자리에서 — 아래 알림(.guide-toast)은 열린 목차 밑에 깔려 흐리게 비치며 목차 글과 겹쳤다.
    // 단추 글이 잠깐 '복사했어요 ✓'로 바뀐다(aria-live로 읽기 프로그램에도). 클립보드 API가 막힌 브라우저는 숨은 글 칸을 골라
    // 복사 명령으로 한 번 더 — 그것도 막혔을 때만 단추가 주소를 보여 준다(누르면 주소가 통째로 골라진다). 주소는 단추보다 넓어 휴대폰에서는 연락처 줄이
    // 한 줄 늘어나므로, 몇 초 뒤 저절로 되돌아가 목록이 다시 튀어 오르지 않게 다른 곳을 누를 때까지 그대로 둔다
    const copyBtn = row.querySelector('.ic-copy');
    let copyT = 0;
    const away = (e) => !copyBtn.contains(e.target) && reset();
    const reset = () => {
      clearTimeout(copyT);
      removeEventListener('pointerdown', away, true);
      copyBtn.textContent = '이메일 복사';
      copyBtn.classList.remove('is-done', 'is-addr');
    };
    const legacyCopy = (v) => {
      const ta = document.createElement('textarea');
      ta.value = v;
      ta.readOnly = true;
      ta.setAttribute('aria-hidden', 'true');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
      row.append(ta);
      ta.select();
      ta.setSelectionRange(0, v.length);
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {}
      ta.remove();
      copyBtn.focus({ preventScroll: true });
      return ok;
    };
    copyBtn?.addEventListener('click', async () => {
      // 주소를 보여 주는 중이면 다시 복사하지 않고 주소를 고른다(다시 복사하면 글을 바꿔 쓰며 고른 것이 풀렸다) — Ctrl+C · ⌘C로 복사
      if (copyBtn.classList.contains('is-addr')) return void getSelection()?.selectAllChildren(copyBtn);
      const v = copyBtn.dataset.copy;
      reset();
      let ok = false;
      try {
        await navigator.clipboard.writeText(v);
        ok = true;
      } catch {
        ok = legacyCopy(v);
      }
      if (ok) {
        copyBtn.textContent = '복사했어요 ✓';
        copyBtn.classList.add('is-done');
        copyT = setTimeout(reset, 2400);
        return;
      }
      copyBtn.textContent = v;
      copyBtn.classList.add('is-done', 'is-addr');
      addEventListener('pointerdown', away, true);
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
    setScene(i, hasDeck, land = 0) {
      current = i;
      // 좁은 화면은 첫 장면 아래에 자리가 없어, 처음 방문 사용법을 위쪽 알림으로 한 번
      if (i === 0 && firstVisit && !coachTold && matchMedia('(max-width: 820px), (orientation: portrait) and (max-width: 1100px), (max-height: 500px)').matches) {
        coachTold = true;
        setTimeout(() => current === 0 && say(touch ? '위로 밀면 다음 장면 · 카드는 옆으로, 끝에서 한 번 더 · ☰ 목록' : '스크롤하면 다음 장면 · 카드를 누르면 프로젝트 · ☰ 장면 목록', { ms: 7000 }), reducedMotion ? 500 : 3200);
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
        // 덱이 날아와 자리에 선 뒤에(land: 장면이 바뀐 때부터 가운데 카드가 닿을 때까지의 초) — 날아드는 도중에 끌어 보이면 카드가 멈추지 못한다
        setTimeout(() => {
          if (current !== i) return;
          document.body.classList.add('deck-cue');
          setTimeout(() => document.body.classList.remove('deck-cue'), 4200);
          // 덱이 살짝 끌려갔다 돌아오는 동안 반투명한 손끝이 같은 방향으로 민다 — 덱이 아직 날아드는 중이라 거절하면(느린 기기) 조금 뒤 다시
          const tryPeek = (left) => {
            if (current !== i) return;
            const rect = onPeek?.();
            if (rect) showGhost('x', rect);
            else if (left > 0) setTimeout(() => tryPeek(left - 1), 250);
          };
          tryPeek(6);
          say(touch ? '옆으로 넘기고 탭하면 자세히 · 끝에서 한 번 더 밀면 다음 장면' : '카드를 옆으로 넘기거나(← → · 휠) 눌러서 프로젝트를 볼 수 있어요', { ms: 4800 });
        }, reducedMotion ? 400 : Math.max(2200, land * 1000 + 300));
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
    // 표지에 아직 머물러 있을 때만 — 이미 장면을 골랐으면(표지 목차 · 키 · 목차) 이번 방문을 '지난번'이라 하지 않는다
    offerResume() {
      if (current !== 0) return;
      let saved = null;
      try {
        saved = JSON.parse(savedLast || 'null');
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
    // 장면 넘김 안내(label: '다음 장면 · 로봇') — 손으로 무엇이든 하면 멈춘다
    sceneHint,
    stopHint,
    hideGhost,
    // 당겨 넘기기 표시: { dir, p, armed, label } · 끝나면 null
    pull: setPull,
    commitPull,
    // 알림이 떠 있는 중(같은 아래쪽에 뜨는 장면 넘김 안내는 알림이 걷힌 뒤에)
    get talking() {
      return !toast.hidden;
    },
    get firstVisit() {
      return firstVisit;
    },
  };
}
