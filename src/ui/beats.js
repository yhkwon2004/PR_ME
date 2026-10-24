// 한 장면 안의 여러 화면(비트): 스크롤 없이 영화처럼 한 화면씩 바뀐다 — 휠 · 스와이프 · 방향키 · 아래 칸 · 자동 재생.
// 소개(프로필): 소개 → 학력 · 기록 → 핵심 역량 → 가치관 → 학년별 성장 / 이력: 연도마다 한 화면(학년 · 항목 · 기록 한 줄 · 이어진 프로젝트 · 상장 · 기사)
// 상세에 들어가지 않아도 화면에서 바로 읽히도록 — 사진은 누르면 프로젝트, 상장은 누르면 크게(필름의 라이트박스)
import gsap from 'gsap';
import { profile } from '../content.js';
import { projects, byId, categoryOf } from '../data/projects.js';
import { AWARDS, TIER_KEY, TIER_LABEL } from '../data/awards.js';
import { PRESS } from '../data/press.js';
import { CERTS } from '../data/skills.js';
import { HISTORY } from '../data/history.js';
import { STAGES, VALUES, PRELUDE, stageOf } from '../data/growth.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const dot = (d = '') => d.replace(/-/g, '.');
const lines = (arr) => arr.map((l) => `<span class="line"><span>${esc(l)}</span></span>`).join('');
const yearsOf = (y = '') => (String(y).match(/20\d{2}/g) || []).map(Number);

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

// ── 소개(프로필): 다섯 화면 — 성장 과정이 마지막이라 바로 연도별 이력(1학년 2023)으로 이어진다 ──
function profileBeats(scene, i) {
  const email = profile.links.find((l) => l.url.startsWith('mailto:'));
  const years = [...projects.flatMap((p) => yearsOf(p.year)), ...AWARDS.map((a) => +a.year), ...CERTS.map((c) => +c.year)].filter(Boolean);
  const grand = AWARDS.filter((a) => a.tier === 1).length;
  const nums = [
    [projects.length, '프로젝트'],
    [AWARDS.length, '수상', `대상 ${grand}`],
    [CERTS.length, '자격증'],
    [PRESS.length, '공식 보도'],
    [`${Math.min(...years)}`, '활동', `— ${Math.max(...years)}`],
  ];
  const certs = [...CERTS].sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  return [
    {
      key: 'who',
      label: '소개',
      cls: 'bt-who',
      html: `<div class="bt-top panel-content">
          ${kicker(i, scene.kicker)}
          <h2 class="title title-ko b-a">${lines(scene.title)}</h2>
        </div>
        <div class="bt-body panel-content">
          <p class="bt-name b-a"><b>${esc(profile.name)}</b><span>${esc(profile.en)}</span></p>
          <p class="bt-role b-a"><b>${esc(profile.role)}</b> — ${esc(profile.roleKo)}</p>
          <p class="bt-lead b-a">${esc(scene.lead)}</p>
        </div>`,
    },
    {
      key: 'profile',
      label: '학력 · 기록',
      cls: 'bt-prof',
      html: `<div class="bt-top panel-content">
          ${kicker(i, 'PROFILE — 학력 · 기록')}
          <h2 class="bt-h b-a">${esc(profile.name)} <span>${esc(profile.en)}</span></h2>
        </div>
        <div class="bt-body panel-content">
          <div class="bt-cols">
            <div class="bt-col">
              <p class="bt-sub b-a">학력</p>
              <ul class="bt-edu">${(profile.education || [])
                .map((e) => `<li class="b-a"><b>${esc(e.school)}</b><span>${esc(e.major)}</span><small>${esc(e.period)}</small></li>`)
                .join('')}</ul>
              <p class="bt-sub b-a">자격 ${CERTS.length}</p>
              <ul class="bt-certs b-a">${certs.map((c) => `<li>${esc(c.name)}${c.year ? `<small>${esc(c.year)}</small>` : ''}</li>`).join('')}</ul>
            </div>
            <dl class="bt-nums">${nums
              .map(([n, l, s]) => `<div class="b-a"><dt>${esc(l)}</dt><dd>${esc(n)}${s ? `<small>${esc(s)}</small>` : ''}</dd></div>`)
              .join('')}</dl>
          </div>
          <ul class="bt-links b-a">${profile.links
            .map((l) => `<li><a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}><span>${esc(l.label)}</span>${esc(l.value)}</a></li>`)
            .join('')}<li><a class="is-pdf" href="/resume" data-link><span>PDF</span>이력서 한 장</a></li></ul>
        </div>`,
      email: email?.value,
    },
    {
      key: 'core',
      label: '핵심 역량',
      cls: 'bt-core',
      html: `<div class="bt-top panel-content">
          ${kicker(i, 'CORE — 핵심 역량')}
          <h2 class="bt-h b-a">세 가지 축으로 일합니다</h2>
        </div>
        <div class="bt-body panel-content">
          <ol class="bt-pillars">${scene.pillars
            .map(
              (p) => `<li class="b-a">
              <span class="bt-no">${esc(p.no)}</span>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.detail || p.text)}</p>
              ${p.projects?.length ? `<div class="bt-media">${p.projects.map(byId).filter(Boolean).map(projChip).join('')}</div>` : ''}
            </li>`
            )
            .join('')}</ol>
        </div>`,
    },
    {
      key: 'values',
      label: '가치관',
      cls: 'bt-core bt-values',
      html: `<div class="bt-top panel-content">
          ${kicker(i, 'VALUES — 가치관')}
          <h2 class="bt-h b-a">이렇게 일합니다</h2>
        </div>
        <div class="bt-body panel-content">
          <ol class="bt-pillars">${VALUES.map(
            (v) => `<li class="b-a">
              <span class="bt-no">${esc(v.no)} · ${esc(v.en)}</span>
              <h3>${esc(v.title)}</h3>
              <p>${esc(v.text)}</p>
              <div class="bt-media">${v.proof.map(byId).filter(Boolean).slice(0, 2).map(projChip).join('')}</div>
            </li>`
          ).join('')}</ol>
        </div>`,
    },
    {
      key: 'growth',
      label: '성장 과정',
      cls: 'bt-core bt-growth',
      html: `<div class="bt-top panel-content">
          ${kicker(i, 'GROWTH — 학년별 성장 과정')}
          <h2 class="bt-h b-a">탐색에서 도전으로, 도전에서 집중으로</h2>
        </div>
        <div class="bt-body panel-content">
          <ol class="bt-pillars">${STAGES.map(
            (g) => `<li class="b-a" data-stage="${esc(g.id)}">
              <span class="bt-no">${esc(g.grade)} · ${esc(g.span)}<em>${esc(g.code)}</em></span>
              <h3>${esc(g.title)}</h3>
              <p class="bt-hl">${esc(g.headline)}</p>
              <p>${esc(g.learned)}</p>
              <small class="bt-meta">프로젝트 ${g.projects.length} · 수상 ${g.awards.length}${g.grand ? ` (대상 ${g.grand})` : ''}${g.certs.length ? ` · 자격 ${g.certs.length}` : ''}</small>
              <div class="bt-media">${g.featuredProjects.slice(0, 2).map(projChip).join('')}</div>
            </li>`
          ).join('')}</ol>
          <p class="bt-more b-a"><b>${esc(PRELUDE.year)}</b> ${esc(PRELUDE.text)} <a href="/growth" data-link>성장 과정 자세히 →</a></p>
        </div>`,
    },
  ];
}

// ── 이력: 연도마다 한 화면 — 위에 큰 연도 · 학년 · 그 해의 수, 아래에 항목 카드(큰 사진 + 기록 전문 + 근거) ──
// 카드의 큰 그림: 이어진 프로젝트 사진(제목을 사진 위에) → 없으면 상장(최대 3장) → 기사 사진. 아무것도 없으면 글만.
// { html, project, certs } — 큰 그림에 쓴 프로젝트 · 상장은 아래 근거 줄에서 뺀다
function heroOf(it) {
  const p = it.projects.find((x) => x.cover);
  if (p)
    return {
      project: p,
      html: `<a class="bt-ph" href="${p.path}" data-link data-cat="${esc(p.category)}"><img src="${esc(p.cover.thumb)}" alt="" loading="lazy" decoding="async" /><span class="bt-cap">${esc(p.title)}</span></a>`,
    };
  const certs = it.awards.filter((a) => a.certs.length || a.photo).slice(0, 3);
  if (certs.length)
    return {
      certs: true,
      html: `<div class="bt-ph is-certs">${certs
        .map(
          (a) =>
            `<button type="button" data-film-cert="${a.filmAt}" data-tier="${TIER_KEY[a.tier]}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기"><img src="${esc(a.certs[0]?.thumb || a.photo.thumb)}" alt="" loading="lazy" decoding="async" /><i>${esc(a.grade)}</i></button>`
        )
        .join('')}</div>`,
    };
  const n = it.press.find((x) => x.image);
  if (n)
    return {
      html: `<a class="bt-ph" href="${esc(n.url)}" target="_blank" rel="noopener"><img src="${esc(n.image.thumb)}" alt="" loading="lazy" decoding="async" /><span class="bt-cap">${esc(n.publisher)} — ${esc(n.title)}</span></a>`,
    };
  return { html: '' };
}

function historyBeats(scene, i) {
  return HISTORY.map((y, k) => {
    const awards = [...new Set(y.items.flatMap((it) => it.awards))];
    const media = mediaOf(awards);
    const tiers = [1, 2, 3, 4, 5].map((t) => [t, y.awards.filter((a) => a.tier === t).length]).filter(([, n]) => n);
    const g = stageOf(y.year);
    const item = (it) => {
      const hero = heroOf(it);
      const chips = [
        ...it.projects.filter((p) => p !== hero.project).map(projChip),
        ...(hero.certs ? [] : it.awards.map(certChip)),
        ...it.press.map(pressChip),
      ].filter(Boolean);
      return `<li class="bt-item b-a${hero.html ? ' has-ph' : ''}${it.deep ? '' : ' is-plain'}">
          ${hero.html}
          <div class="bt-tx">
            <p class="bt-k">${esc(it.kind)}</p>
            <h3>${esc(it.title)}</h3>
            ${it.note ? `<p class="bt-note">${esc(it.note)}</p>` : ''}
            ${chips.length ? `<div class="bt-media">${chips.join('')}</div>` : ''}
          </div>
        </li>`;
    };
    return {
      key: y.year,
      label: y.year,
      cls: 'bt-year',
      media,
      html: `<div class="bt-top panel-content">
          ${kicker(i, `${scene.kicker} · ${pad(k + 1)}/${pad(HISTORY.length)}`)}
        </div>
        <div class="bt-body panel-content">
          <header class="bt-yh b-a">
            <b class="bt-yy">${esc(y.year)}</b>
            <div class="bt-ys">
              ${g ? `<a class="bt-g" href="/growth#gr-${esc(g.id)}" data-link data-stage="${esc(g.id)}">${esc(g.grade)} · ${esc(g.title)}</a>` : ''}
              <p class="bt-yn"><span><em>${y.items.length}</em>이력</span><span><em>${y.projects.length}</em>프로젝트</span><span><em>${y.awards.length}</em>수상</span></p>
            </div>
            ${
              y.awards.length
                ? `<p class="bt-more">${tiers.map(([t, n]) => `${TIER_LABEL[t]} ${n}`).join(' · ')}<a href="/awards#y${y.year}" data-link>${y.year}년 상장 ${y.awards.length}건 모두 보기 →</a></p>`
                : ''
            }
          </header>
          <ol class="bt-items" data-n="${y.items.length}">${y.items.map(item).join('')}</ol>
        </div>`,
    };
  });
}

export function renderBeats(scene, i) {
  const beats = scene.beats === 'history' ? historyBeats(scene, i) : profileBeats(scene, i);
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
          `<button type="button" data-beat="${k}"${k ? '' : ' aria-current="true"'} aria-label="${esc(b.label)}"><span>${scene.beats === 'history' ? '' : `<em>${pad(k + 1)}</em> `}<b>${esc(b.label)}</b></span><i></i></button>`
      )
      .join('')}</nav>
  </div>`;
}

// 비트 넘김: 나가는 화면은 넘기는 쪽으로 빠지고, 들어오는 화면의 줄들이 반대쪽에서 차례로 들어온다
export function bindBeats(el, reducedMotion, onBeat) {
  const list = [...el.querySelectorAll('.beat')];
  if (!list.length) return null;
  const nav = [...el.querySelectorAll('.beat-nav button')];
  let index = 0;
  const parts = (b) => b.querySelectorAll('.b-a');
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
      list.forEach((b) => gsap.set([b, ...parts(b)], { clearProps: 'opacity,visibility,transform' }));
      mark();
      onBeat?.({ index, prev: index, count: list.length, entry: true });
    },
    intro(tl, at) {
      if (reducedMotion) return;
      const p = parts(list[index]);
      gsap.set(p, { autoAlpha: 0, y: 26 });
      tl.to(p, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, at);
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
      gsap.killTweensOf([from, to, ...parts(from), ...parts(to)]);
      if (reducedMotion) {
        only(k);
      } else {
        // 나가는 화면: 줄들이 넘기는 쪽으로 빠르게 빠진다
        gsap.to(parts(from), {
          autoAlpha: 0,
          y: -28 * dir,
          duration: 0.32,
          ease: 'power2.in',
          stagger: 0.015,
          onComplete: () => {
            if (index === k) {
              from.hidden = true;
              gsap.set(parts(from), { clearProps: 'opacity,visibility,transform' });
            }
          },
        });
        from.inert = true;
        to.hidden = false;
        to.inert = false;
        gsap.fromTo(parts(to), { autoAlpha: 0, y: 38 * dir }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, delay: 0.22 });
      }
      onBeat?.({ index, prev, count: list.length, auto, entry: false });
      return true;
    },
    step(dir) {
      return ctl.set(index + dir);
    },
  };
  nav.forEach((n, k) => n.addEventListener('click', () => ctl.set(k)));
  return ctl;
}
