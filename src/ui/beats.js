// 한 장면 안의 여러 화면(비트): 스크롤 없이 영화처럼 한 화면씩 바뀐다 — 휠 · 스와이프 · 방향키 · 아래 칸 · 자동 재생.
// 필름은 프로젝트에 집중한다: 01 소개(이 두 화면) → 02 프로젝트(대표 8) → 03 성과. 성장 과정 · 보유 역량 · 미래 계획은 발표 자료(/present) 안에서만.
// 소개(이력서): 인적 사항(사진) → 학력 · 기록 — 사진은 크게, 글은 짧게
import gsap from 'gsap';
import { profile } from '../content.js';
import { projects } from '../data/projects.js';
import { AWARDS } from '../data/awards.js';
import { CERTS } from '../data/skills.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
// 장면 표시: 장면 번호 · 장(발표 순서) · 이 화면 — 장은 renderBeats가 그 장면의 것으로 정해 둔다
let chapter = null;
function kicker(i, text) {
  return `<p class="kicker b-a"><span class="kicker-no">SC ${pad(i)}</span>${chapter ? `<span class="kicker-ch">CH ${esc(chapter[0])}<span class="kicker-chn"> · ${esc(chapter[1])}</span></span>` : ''}<span class="kicker-txt">${esc(text)}</span></p>`;
}

// ── 소개: 실제 이력서처럼 두 화면 — 다음 장면부터 대표 프로젝트 ──
function profileBeats(scene, i) {
  const email = profile.links.find((l) => l.url.startsWith('mailto:'));
  const grand = AWARDS.filter((a) => a.tier === 1).length;
  const vol = profile.volunteer;
  const sch = profile.scholarship;
  const nums = [
    [projects.length, '프로젝트'],
    [AWARDS.length, '수상', `대상 ${grand}`],
    [`${vol.hours}h`, '봉사', `${vol.count}건`],
    [CERTS.length, '자격증'],
  ];
  const edu = profile.education || [];
  const now = edu.filter((e) => e.note !== '입학');
  const link = (l) => `<li><a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}><span>${esc(l.label)}</span>${esc(l.value)}</a></li>`;
  return [
    {
      key: 'who',
      label: '소개',
      cls: 'bt-who',
      html: `<div class="bt-top panel-content">
          ${kicker(i, `PROFILE — 대학 시절 포트폴리오 ${profile.span}`)}
        </div>
        <div class="bt-body panel-content">
          <article class="rs-card">
            ${profile.photo ? `<figure class="rs-photo b-a"><img src="${esc(profile.photo.src)}" width="${profile.photo.w}" height="${profile.photo.h}" alt="${esc(profile.name)} 증명사진" decoding="async" /></figure>` : ''}
            <div class="rs-id">
              <p class="rs-role b-a">${esc(profile.role)}</p>
              <h2 class="rs-name b-a">${esc(profile.name)}<span>${esc(profile.en)}</span></h2>
              <p class="rs-motto b-a">${esc(profile.motto)}</p>
              <p class="rs-sch b-a"><b>${esc(sch.title)}</b><span>${esc(sch.date.slice(0, 4))} · 과학기술정보통신부</span></p>
              <dl class="rs-facts b-a">
                ${now.map((e) => `<div><dt>${esc(e.note.includes('복수') ? '복수전공' : '소속')}</dt><dd>${esc(e.school)} ${esc(e.major)}</dd></div>`).join('')}
              </dl>
              <ul class="rs-links b-a">${[email, ...profile.links.filter((l) => l !== email && /GitHub|Notion/.test(l.label))].filter(Boolean).map(link).join('')}<li><a class="is-pdf" href="/resume" data-link><span>PDF</span>이력서 한 장</a></li></ul>
            </div>
          </article>
        </div>`,
    },
    {
      key: 'profile',
      label: '학력 · 기록',
      cls: 'bt-prof',
      html: `<div class="bt-top panel-content">
          ${kicker(i, 'EDUCATION — 학력 · 기록')}
          <h2 class="bt-h b-a">학력과 숫자로 본 기록</h2>
        </div>
        <div class="bt-body panel-content">
          <div class="rs-grid">
            <section class="rs-sec b-a">
              <h3 class="rs-h">학력</h3>
              <ol class="rs-tl">${edu
                .map((e) => `<li><time>${esc(e.period)}</time><b>${esc(e.school)}</b><span>${esc(e.major)}</span><em>${esc(e.note)}</em></li>`)
                .join('')}</ol>
            </section>
            <section class="rs-sec b-a">
              <h3 class="rs-h">기록</h3>
              <dl class="rs-nums">${nums
                .map(([n, l, s]) => `<div><dt>${esc(l)}</dt><dd>${esc(n)}${s ? `<small>${esc(s)}</small>` : ''}</dd></div>`)
                .join('')}</dl>
            </section>
            <section class="rs-sec rs-wide rs-more b-a">
              <img class="rs-sheet" src="${esc(sch.sheet.sm)}" width="240" height="339" alt="${esc(sch.title)} 장학증서" loading="lazy" decoding="async" />
              <p><b>${esc(sch.title)}</b><span>${esc(sch.date)} · ${esc(sch.by)}</span></p>
              <a class="rs-deck" href="/present" data-link>성장 과정 · 보유 역량 · 미래 계획은 발표 자료에서 <i aria-hidden="true">→</i></a>
            </section>
          </div>
        </div>`,
      email: email?.value,
    },
  ];
}

export function renderBeats(scene, i) {
  chapter = scene.chapter || null;
  const beats = profileBeats(scene, i);
  chapter = null;
  return `<div class="beats" data-kind="${esc(scene.beats)}">
    <div class="beat-stage">${beats
      .map(
        (b, k) =>
          `<section class="beat ${b.cls}" data-key="${esc(b.key)}" data-label="${esc(b.label)}"${b.media?.length ? ` data-media='${esc(JSON.stringify(b.media))}'` : ''} aria-label="${esc(b.label)}"${
            k ? ' hidden' : ''
          }>${b.html}</section>`
      )
      .join('')}</div>
    <nav class="beat-nav panel-content" data-r aria-label="${esc(scene.ko)} 화면">${beats
      .map(
        (b, k) =>
          `<button type="button" data-beat="${k}"${k ? '' : ' aria-current="true"'} aria-label="${esc(b.label)}"><span><em>${pad(k + 1)}</em> <b>${esc(b.label)}</b></span><i></i></button>`
      )
      .join('')}</nav>
  </div>`;
}

// 비트 넘김: 나가는 화면은 판째로 넘기는 쪽으로 빠지며 사라지고, 그다음 들어오는 화면의 줄들이 반대쪽에서 차례로 들어온다 —
// 두 화면의 판이 한순간도 겹쳐 보이지 않게(판은 화면째로, 글 · 카드는 줄마다 움직인다)
export function bindBeats(el, reducedMotion, onBeat) {
  const list = [...el.querySelectorAll('.beat')];
  if (!list.length) return null;
  const nav = [...el.querySelectorAll('.beat-nav button')];
  let index = 0;
  const parts = (b) => b.querySelectorAll('.b-a');
  // 파노라마 창(연도 화면): 가는 틈에서 위아래로 똑같이 열리고, 안의 사진이 조금 크게 시작해 제자리로 — 나갈 때는 다시 틈으로 닫힌다.
  // 열림 정도는 CSS 변수 --o(0 틈 · 1 다 열림) 하나로 움직인다(beats.css의 clip-path) — clip-path 글자를 직접 움직이면
  // 브라우저가 inset(47% 0% 47% 0%)을 inset(47% 0%)로 줄여 읽어 숫자 짝이 어긋나, 위는 덜 열리고 아래만 열린 채로 보였다
  const pano = (b) => b.querySelector('[data-pano]');
  const clearPano = (w) => {
    if (!w) return;
    w.style.removeProperty('--o');
    gsap.set(w.querySelectorAll('img'), { clearProps: 'transform' });
  };
  const openPano = (b, delay = 0, tl = null) => {
    const w = pano(b);
    if (!w || reducedMotion) return;
    const imgs = w.querySelectorAll('img');
    gsap.set(w, { '--o': 0 });
    gsap.set(imgs, { scale: 1.12 });
    const t = tl || gsap;
    const at = tl ? delay : undefined;
    const d = tl ? {} : { delay };
    t.to(w, { '--o': 1, duration: 0.9, ease: 'power3.inOut', ...d }, at);
    t.to(imgs, { scale: 1, duration: 1.5, ease: 'power3.out', ...d }, at);
  };
  // 다음 · 이전 화면의 사진은 미리 받아 둔다(숨은 화면의 lazy 사진은 보일 때에야 받기 시작해 빈 칸이 보였다)
  const warm = (k) =>
    [list[k - 1], list[k + 1]].forEach((b) => b?.querySelectorAll('img[loading="lazy"]').forEach((im) => (im.loading = 'eager')));
  // 나간 화면 정리: 지금 화면이 아니면 숨기고 움직임 흔적을 지운다
  const settle = (b) => {
    if (b === list[index]) return;
    b.hidden = true;
    gsap.set([b, ...parts(b)], { clearProps: 'opacity,visibility,transform' });
    clearPano(pano(b));
  };
  const mark = () =>
    nav.forEach((n, k) => {
      n.toggleAttribute('aria-current', k === index);
      n.classList.toggle('is-past', k < index);
    });
  // 화면 하나만 보이고 나머지는 키보드 · 읽기 프로그램에서도 빠진다
  const only = (k) =>
    list.forEach((b, j) => {
      b.hidden = j !== k;
      b.inert = j !== k;
    });
  const ctl = {
    get count() {
      return list.length;
    },
    get index() {
      return index;
    },
    label: (k) => list[k]?.dataset.label || '',
    indexOf: (key) => Math.max(0, list.findIndex((b) => b.dataset.key === String(key))),
    // 장면에 들어설 때: 움직임 없이 그 화면에서(등장 연출은 intro가 장면 타임라인에 얹는다)
    reset(k = 0) {
      gsap.killTweensOf(list.flatMap((b) => [b, ...parts(b)]));
      index = Math.max(0, Math.min(list.length - 1, k));
      only(index);
      list.forEach((b) => {
        gsap.set([b, ...parts(b)], { clearProps: 'opacity,visibility,transform' });
        const w = pano(b);
        if (w) gsap.killTweensOf([w, ...w.querySelectorAll('img')]);
        clearPano(w);
      });
      mark();
      warm(index);
      onBeat?.({ index, prev: index, count: list.length, entry: true });
    },
    intro(tl, at) {
      if (reducedMotion) return;
      const p = parts(list[index]);
      gsap.set(p, { autoAlpha: 0, y: 26 });
      tl.to(p, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, at);
      openPano(list[index], at, tl);
    },
    set(k, { auto = false } = {}) {
      k = Math.max(0, Math.min(list.length - 1, k));
      if (k === index) return false;
      const prev = index;
      const dir = k > prev ? 1 : -1;
      const from = list[prev];
      const to = list[k];
      index = k;
      mark();
      gsap.killTweensOf([from, to, ...parts(from), ...parts(to), pano(from), pano(to)].filter(Boolean));
      warm(k);
      if (reducedMotion) {
        only(k);
      } else {
        // 나가는 화면: 판째로 넘기는 쪽으로 조금 밀리며 사라지고(창은 틈으로 닫히고), 다 사라진 뒤에 숨긴다
        from.inert = true;
        gsap.to(from, { autoAlpha: 0, y: -24 * dir, duration: 0.3, ease: 'power2.in', onComplete: () => settle(from) });
        const fw = pano(from);
        if (fw) gsap.to(fw, { '--o': 0, duration: 0.3, ease: 'power2.in' });
        // 들어오는 화면: 나가는 화면이 거의 사라진 뒤 판이 나타나고, 줄들이 차례로 들어선다
        to.hidden = false;
        to.inert = false;
        gsap.fromTo(to, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power1.out', delay: 0.24 });
        gsap.fromTo(parts(to), { autoAlpha: 0, y: 34 * dir }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, delay: 0.28 });
        openPano(to, 0.26);
      }
      onBeat?.({ index, prev, count: list.length, auto, entry: false });
      return true;
    },
    step(dir) {
      return ctl.set(index + dir);
    },
  };
  nav.forEach((n, k) => n.addEventListener('click', () => ctl.set(k)));
  // 화면 안에서 다른 화면으로(성장 표지의 학년 카드 → 그 학년 이야기)
  el.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) ctl.set(ctl.indexOf(go.dataset.goto));
  });
  return ctl;
}
