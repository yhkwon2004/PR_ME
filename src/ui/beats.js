// 한 장면 안의 여러 화면(비트): 스크롤 없이 영화처럼 한 화면씩 바뀐다 — 휠 · 스와이프 · 방향키 · 아래 칸 · 자동 재생.
// 소개(이력서): 인적 사항(사진) → 학력 · 기록 → 기술 스택
// 성장 · 이력(/growth): 학년 길 → 가치관 → 학년마다 [이야기 → 그 학년의 연도별 이력] — 연도 화면은 파노라마 창이
// 가는 틈에서 열리며 그 해의 사진들이 펼쳐지고, 아래에 항목이 같은 칸에 맞춰 선다
// 상세에 들어가지 않아도 화면에서 바로 읽히도록 — 글은 짧게(항목마다 한 줄), 사진은 누르면 프로젝트, 상장은 누르면 크게
import gsap from 'gsap';
import { profile } from '../content.js';
import { projects, byId, categoryOf } from '../data/projects.js';
import { AWARDS, TIER_KEY, TIER_LABEL } from '../data/awards.js';
import { PRESS } from '../data/press.js';
import { CERTS, STACK } from '../data/skills.js';
import { HISTORY } from '../data/history.js';
import { STAGES, VALUES, PRELUDE, stageOf } from '../data/growth.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const dot = (d = '') => d.replace(/-/g, '.');

// 상장 한 장 → 라이트박스 미디어(상장이 없으면 시상 사진)
const certCaption = (a) => `${a.contest} — ${a.grade}${a.date ? ` (${dot(a.date)})` : ''}`;
function mediaOf(list) {
  const out = [];
  list.forEach((a) => {
    a.filmAt = out.length;
    a.certs.forEach((c) => out.push({ type: 'image', src: c.src, caption: certCaption(a) }));
    if (!a.certs.length && a.photo) out.push({ type: 'image', src: a.photo.src, caption: certCaption(a) });
  });
  return out;
}

// 화면에 바로 보이는 근거: 프로젝트 사진 · 상장 · 기사
const projChip = (p) =>
  `<a class="bt-p" href="${p.path}" data-link data-cat="${esc(p.category)}"><span class="bt-pi">${
    p.cover ? `<img src="${esc(p.cover.thumb)}" alt="" loading="lazy" decoding="async" />` : `<i>${esc(categoryOf(p.category).label)}</i>`
  }</span><b>${esc(p.title)}</b></a>`;
const certChip = (a) => {
  const src = a.certs[0]?.sm || a.photo?.thumb;
  if (!src) return '';
  return `<button type="button" class="bt-c" data-film-cert="${a.filmAt}" data-tier="${TIER_KEY[a.tier]}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" /><i>${esc(a.grade)}</i></button>`;
};
const pressChip = (a) =>
  `<a class="bt-n" href="${esc(a.url)}" target="_blank" rel="noopener"><small>${esc(a.publisher)}${a.date ? ` · ${esc(dot(a.date))}` : ''}</small><b>${esc(a.title)}</b></a>`;

function kicker(i, text) {
  return `<p class="kicker b-a"><span class="kicker-no">SC ${pad(i)}</span><span class="kicker-txt">${esc(text)}</span></p>`;
}

// ── 소개: 실제 이력서처럼 세 화면 — 다음 장면이 성장 과정 · 연도별 이력 ──
function profileBeats(scene, i) {
  const email = profile.links.find((l) => l.url.startsWith('mailto:'));
  const grand = AWARDS.filter((a) => a.tier === 1).length;
  const nums = [
    [projects.length, '프로젝트'],
    [AWARDS.length, '수상', `대상 ${grand}`],
    [CERTS.length, '자격증'],
    [PRESS.length, '공식 보도'],
  ];
  const certs = [...CERTS].sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
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
              <p class="rs-sum b-a">${esc(profile.summary)}</p>
              <dl class="rs-facts b-a">
                <div><dt>출생</dt><dd>${esc(profile.born)}년</dd></div>
                <div><dt>기간</dt><dd>${esc(profile.span)} 대학 시절</dd></div>
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
            <section class="rs-sec rs-wide b-a">
              <h3 class="rs-h">자격증 <span>${CERTS.length}</span></h3>
              <ul class="rs-certs">${certs.map((c) => `<li>${esc(c.name)}${c.year ? `<time>${esc(c.year)}</time>` : ''}</li>`).join('')}</ul>
            </section>
          </div>
        </div>`,
      email: email?.value,
    },
    {
      key: 'stack',
      label: '기술 스택',
      cls: 'bt-stack',
      html: `<div class="bt-top panel-content">
          ${kicker(i, 'SKILLS — 기술 스택')}
          <h2 class="bt-h b-a">다룰 수 있는 언어 · 툴</h2>
        </div>
        <div class="bt-body panel-content">
          <div class="rs-sec rs-stack">${STACK.map(
            (g) => `<div class="rs-row b-a">
              <h3>${esc(g.ko)}<small>${esc(g.en)}</small></h3>
              <ul>${g.items.map((s) => `<li${s.state === 'explore' ? ' class="is-explore"' : ''}>${esc(s.name)}${s.evidence.length ? `<sup title="이 기술을 쓴 프로젝트">${s.evidence.length}</sup>` : ''}</li>`).join('')}</ul>
            </div>`
          ).join('')}</div>
          <p class="rs-note b-a">숫자는 그 기술을 쓴 프로젝트 수 · <a href="/skills" data-link>근거와 함께 전체 보기 →</a></p>
        </div>`,
    },
  ];
}

// ── 연도별 이력: 연도마다 한 화면 — 파노라마 창(그 해의 사진이 항목 수만큼 나란히) + 같은 칸에 맞춘 항목 글 ──
// 칸의 그림: 이어진 프로젝트 사진(이름을 사진 위에) → 없으면 상장(최대 3장) → 기사 사진 → 아무것도 없으면 학년 색 글자판.
// { html, project, certs } — 그림에 쓴 프로젝트 · 상장은 아래 근거 줄에서 뺀다
function heroOf(it) {
  const p = it.projects.find((x) => x.cover);
  if (p) {
    // 같은 해에 같은 프로젝트가 두 번 나오면 항목이 고른 다른 사진(photo)으로
    const im = (it.photo && p.images.find((x) => x.file === it.photo)) || p.cover;
    return {
      project: p,
      html: `<a class="pn-col" href="${p.path}" data-link data-cat="${esc(p.category)}"><img src="${esc(im.thumb)}" alt="" loading="lazy" decoding="async" /><span class="pn-cap">${esc(p.title)}</span></a>`,
    };
  }
  const certs = it.awards.filter((a) => a.certs.length || a.photo).slice(0, 3);
  if (certs.length)
    return {
      certs: true,
      html: `<div class="pn-col is-certs">${certs
        .map(
          (a) =>
            `<button type="button" data-film-cert="${a.filmAt}" data-tier="${TIER_KEY[a.tier]}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기"><img src="${esc(a.certs[0]?.thumb || a.photo.thumb)}" alt="" loading="lazy" decoding="async" /><i>${esc(a.grade)}</i></button>`
        )
        .join('')}</div>`,
    };
  const n = it.press.find((x) => x.image);
  if (n)
    return {
      html: `<a class="pn-col" href="${esc(n.url)}" target="_blank" rel="noopener"><img src="${esc(n.image.thumb)}" alt="" loading="lazy" decoding="async" /><span class="pn-cap">${esc(n.publisher)}</span></a>`,
    };
  return { html: `<div class="pn-col is-type" aria-hidden="true"><b>${esc(it.kind)}</b><small>${esc(it.year)}</small></div>` };
}

// 연도 화면: 큰 연도 · 학년 · 그 해의 수, 아래에 파노라마 창과 항목
function yearBeat(y, i) {
  const awards = [...new Set(y.items.flatMap((it) => it.awards))];
  const media = mediaOf(awards);
  const tiers = [1, 2, 3, 4, 5].map((t) => [t, y.awards.filter((a) => a.tier === t).length]).filter(([, n]) => n);
  const g = stageOf(y.year);
  const cols = y.items.map((it) => {
    const hero = heroOf(it);
    // 근거는 한두 개만(그림에 쓴 것은 빼고) — 글이 길어지지 않게
    const chips = [
      ...it.projects.filter((p) => p !== hero.project).map(projChip),
      ...(hero.certs ? [] : it.awards.map(certChip)),
      ...it.press.map(pressChip),
    ].filter(Boolean);
    return { it, hero, chips };
  });
  return {
    key: y.year,
    label: y.year,
    cls: 'bt-year',
    media,
    html: `<div class="bt-top panel-content">
        ${kicker(i, `HISTORY — ${y.year}${g ? ` · ${g.grade} 연도별 이력` : ''}`)}
      </div>
      <div class="bt-body panel-content">
        <header class="bt-yh b-a">
          <b class="bt-yy">${esc(y.year)}</b>
          <div class="bt-ys">
            ${g ? `<span class="bt-g" data-stage="${esc(g.id)}">${esc(g.grade)} · ${esc(g.title)}</span>` : ''}
            <p class="bt-yn"><span><em>${y.items.length}</em>이력</span><span><em>${y.projects.length}</em>프로젝트</span><span><em>${y.awards.length}</em>수상</span></p>
          </div>
          ${
            y.awards.length
              ? `<p class="bt-more">${tiers.map(([t, n]) => `${TIER_LABEL[t]} ${n}`).join(' · ')}<a href="/awards#y${y.year}" data-link>${y.year}년 상장 ${y.awards.length}건 모두 보기 →</a></p>`
              : ''
          }
        </header>
        <div class="pano" style="--n: ${y.items.length}"${g ? ` data-stage="${esc(g.id)}"` : ''}>
          <div class="pn-win" data-pano>${cols.map((c) => c.hero.html).join('')}</div>
          <ol class="pn-items">${cols
            .map(
              ({ it, chips }) => `<li class="pn-item b-a">
              <p class="pn-k">${esc(it.kind)}</p>
              <h3>${esc(it.title)}</h3>
              ${it.brief ? `<p class="pn-brief" title="${esc(it.note)}">${esc(it.brief)}</p>` : ''}
              ${chips.length ? `<div class="bt-media">${chips.slice(0, 2).join('')}</div>` : ''}
            </li>`
            )
            .join('')}</ol>
        </div>
      </div>`,
  };
}

// ── 성장 · 이력: 학년 길 → 가치관 → 학년마다 [이야기 → 그 학년의 연도 화면] ──
// 학년 카드 · 이야기의 사진은 그 학년의 대표 프로젝트(growth.js featured · cover)
const photoOf = (p) => p?.cover && `<img src="${esc(p.cover.thumb)}" alt="" loading="lazy" decoding="async" />`;
function storyBeat(s, k, i) {
  const pics = s.featuredProjects.filter((p) => p.cover).slice(0, 4);
  return {
    key: s.id,
    label: s.grade,
    cls: 'bt-gstory',
    html: `<div class="bt-top panel-content">
        ${kicker(i, `GROWTH ${pad(k + 1)} — ${s.grade} · ${s.span}`)}
      </div>
      <div class="bt-body panel-content">
        <article class="gw-story" data-stage="${esc(s.id)}">
          <div class="gw-mosaic b-a" style="--m: ${pics.length}">${pics
            .map((p) => `<a class="gw-m" href="${p.path}" data-link data-cat="${esc(p.category)}">${photoOf(p)}<span>${esc(p.title)}</span></a>`)
            .join('')}</div>
          <div class="gw-copy">
            <p class="gw-k b-a"><span class="gw-badge">${esc(s.code)}</span>${esc(s.grade)} · ${esc(s.span)}</p>
            <h2 class="gw-h b-a">${esc(s.title)}</h2>
            <p class="gw-hl b-a">${esc(s.headline)}</p>
            <dl class="gw-nums b-a">
              <div><dt>프로젝트</dt><dd>${s.projects.length}</dd></div>
              <div><dt>수상</dt><dd>${s.awards.length}</dd></div>
              <div><dt>대상</dt><dd>${s.grand}</dd></div>
              <div><dt>자격</dt><dd>${s.certs.length}</dd></div>
            </dl>
            <p class="gw-text b-a">${esc(s.story)}</p>
            <blockquote class="gw-learned b-a"><span>이 시기에 배운 것</span>${esc(s.learned)}</blockquote>
          </div>
        </article>
      </div>`,
  };
}

function growthBeats(scene, i) {
  const total = (k) => STAGES.reduce((n, s) => n + s[k].length, 0);
  const cover = {
    key: 'top',
    label: '성장',
    cls: 'bt-gcover',
    html: `<div class="bt-top panel-content">
        ${kicker(i, `GROWTH — 대학 시절 ${profile.span}`)}
        <h2 class="bt-h b-a">탐색에서 도전으로, 도전에서 집중으로</h2>
      </div>
      <div class="bt-body panel-content">
        <ol class="gw-road">${STAGES.map((s, k) => {
          const p = byId(s.cover) || s.featuredProjects.find((x) => x.cover);
          return `<li class="b-a" data-stage="${esc(s.id)}">
            <button type="button" class="gw-card" data-goto="${esc(s.id)}" aria-label="${esc(s.grade)} ${esc(s.title)} 이야기로">
              <span class="gw-ph">${photoOf(p) || ''}<span class="gw-no">${pad(k + 1)}</span></span>
              <span class="gw-g"><b>${esc(s.grade)}</b><small>${esc(s.span)}</small></span>
              <b class="gw-t">${esc(s.title)}</b>
              <span class="gw-s">${esc(s.short)}</span>
              <span class="gw-n"><span><em>${s.projects.length}</em>프로젝트</span><span><em>${s.awards.length}</em>수상</span>${s.grand ? `<span><em>${s.grand}</em>대상</span>` : ''}</span>
            </button>
          </li>`;
        }).join('')}</ol>
        <p class="bt-more b-a"><b>${esc(PRELUDE.year)}</b>${esc(PRELUDE.text)} · 3년 동안 프로젝트 ${projects.length} · 수상 ${AWARDS.length}</p>
      </div>`,
  };
  const values = {
    key: 'values',
    label: '가치관',
    cls: 'bt-gvalues',
    html: `<div class="bt-top panel-content">
        ${kicker(i, 'VALUES — 가치관')}
        <h2 class="bt-h b-a">이렇게 일합니다</h2>
      </div>
      <div class="bt-body panel-content">
        <ol class="gw-values">${VALUES.map((v) => {
          const proof = v.proof.map(byId).filter(Boolean);
          const lead = proof.find((p) => p.cover);
          return `<li class="b-a">
            ${lead ? `<a class="gw-v-ph" href="${lead.path}" data-link data-cat="${esc(lead.category)}">${photoOf(lead)}<span>${esc(lead.title)}</span></a>` : ''}
            <div class="gw-v-in">
              <p class="gw-v-k"><span>${esc(v.no)}</span>${esc(v.en)}</p>
              <h3>${esc(v.title)}</h3>
              <p class="gw-v-t">${esc(v.text)}</p>
              <ul class="gw-v-proof" aria-label="근거 프로젝트">${proof
                .filter((p) => p !== lead)
                .map((p) => `<li><a href="${p.path}" data-link data-cat="${esc(p.category)}">${esc(p.title)}</a></li>`)
                .join('')}</ul>
            </div>
          </li>`;
        }).join('')}</ol>
      </div>`,
  };
  return [
    cover,
    values,
    ...STAGES.flatMap((s, k) => [storyBeat(s, k, i), ...s.years.map((y) => HISTORY.find((h) => h.year === y)).filter(Boolean).map((y) => yearBeat(y, i))]),
  ];
}

export function renderBeats(scene, i) {
  const beats = scene.beats === 'growth' ? growthBeats(scene, i) : profileBeats(scene, i);
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
