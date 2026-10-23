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

export function createGuide(scenes, { profile, onNext, onGo, onAuto, reducedMotion }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const last = scenes.length - 1;
  const hudBottom = document.getElementById('hud-bottom');

  // ── 다음 장면 버튼: 다음 장면 이름과, 자동 재생이면 넘어가기까지 남은 시간을 고리로 ──
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'next-cue';
  next.hidden = true;
  next.innerHTML = `<span class="nc-ring" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="nc-track" cx="18" cy="18" r="16" /><circle class="nc-fill" cx="18" cy="18" r="16" pathLength="100" /></svg><i>→</i></span><span class="nc-t"><small>NEXT</small><b></b></span>`;
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
    toastT = setTimeout(() => (toast.hidden = true), 400);
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
          ['☰', 'INDEX', '장면 · 아카이브 · 연락처'],
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
    row.innerHTML = `<span>CONTACT</span>${profile.links
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
        ncName.textContent = `${pad(i + 1)} ${scenes[i + 1].code}`;
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
          say(touch ? '카드를 옆으로 넘기거나 탭하면 프로젝트를 볼 수 있어요' : '카드를 옆으로 넘기거나(← → · 휠) 눌러서 프로젝트를 볼 수 있어요', { ms: 4800 });
        }, reducedMotion ? 400 : 2200);
      }
    },
    // 자동 재생 남은 시간(0~1) — 끄면 고리를 비운다
    setProgress(p, autoOn) {
      next.classList.toggle('is-manual', !autoOn);
      ncFill.style.strokeDashoffset = String(100 - Math.min(1, Math.max(0, p)) * 100);
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
      say(`지난번에 SC ${pad(saved.i)} · ${s.label}까지 보셨어요`, { action: '이어 보기', onAction: () => onGo(saved.i), ms: 9000 });
    },
    say,
    get firstVisit() {
      return firstVisit;
    },
  };
}
