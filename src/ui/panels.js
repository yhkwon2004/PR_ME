import gsap from 'gsap';
import { profile } from '../content.js';
import { byId, projects as ALL_PROJECTS, categoryOf } from '../data/projects.js';
import { AWARDS, AWARD_REEL } from '../data/awards.js';
import { ORGS, WALL, ORG_INDEX } from '../data/orgs.js';
import { projectCard, awardCard, pressCard, orgMark, deckInfo, deckAwardInfo, deckPressInfo, deckAllCard, deckAllInfo } from '../pages/site.js';
import { PRESS } from '../data/press.js';

// 빈 선택자에 대한 GSAP 경고를 피한다
const has = (t) => t && (t.length === undefined || t.length > 0);
const set = (t, v) => has(t) && gsap.set(t, v);

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');

const lines = (arr, cls = '') => arr.map((l) => `<span class="line ${cls}"><span>${esc(l)}</span></span>`).join('');

function kicker(scene, i) {
  return `<p class="kicker" data-r><span class="kicker-no">SC ${pad(i)}</span><span class="kicker-txt">${esc(scene.kicker)}</span></p>`;
}

function stats(list = []) {
  if (!list.length) return '';
  return `<dl class="stats" data-r>${list
    .map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd><b data-count="${esc(s.value)}">${esc(s.value)}</b>${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</dd></div>`)
    .join('')}</dl>`;
}

// 카드 덱: 가운데 무대에 카드가 겹쳐 서고, 아래 막대에 번호 · 진행 눈금 · 넘김 버튼
// cards · infos: 같은 순서의 카드와 설명 — 맨 끝에는 아카이브로 이어지는 '전체 보기' 카드와 설명
function deck(cards, { count, label, noun, all, allLabel, stats = '', infos = [], end }) {
  const n = count + (end ? 1 : 0);
  return `<div class="deck-stage" role="group" aria-roledescription="carousel" aria-label="${esc(label)}">${cards.join('')}${end ? end.card : ''}</div>
        <div class="deck-info"></div>
        ${[...infos, ...(end ? [end.info] : [])].map((h) => `<template class="deck-tpl">${h}</template>`).join('')}
        <div class="deck-bar">
          <span class="deck-label"><b>${pad(count)}</b> ${esc(label)}${stats ? `<span class="reel-stats">${stats}</span>` : ''}</span>
          <span class="deck-nav"${n < 2 ? ' hidden' : ''}>
            <button type="button" class="deck-btn" data-reel="-1" aria-label="이전 ${noun}">←</button>
            <span class="deck-count" aria-hidden="true"><b class="deck-now">01</b><span class="deck-ticks">${'<i></i>'.repeat(count)}${end ? '<i class="is-all"></i>' : ''}</span><span class="deck-total">${pad(count)}</span></span>
            <button type="button" class="deck-btn" data-reel="1" aria-label="다음 ${noun}">→</button>
          </span>
          ${all ? `<a class="reel-all" href="${esc(all)}" data-link>${allLabel} <span aria-hidden="true">↗</span></a>` : ''}
        </div>`;
}
// 덱 끝 카드에 겹쳐 보일 다른 작품 사진: 같은 분야의 남은 작품 먼저, 모자라면 다른 대표작
function moreThumbs(list) {
  const cats = new Set(list.map((p) => p.category));
  const rest = ALL_PROJECTS.filter((p) => p.cover && !list.includes(p));
  return [...rest.filter((p) => cats.has(p.category)), ...rest.filter((p) => !cats.has(p.category))].slice(0, 4).map((p) => p.cover.thumb);
}

// 엔딩 크레딧의 'With': 기관 로고마다 함께 만든 프로젝트를 적는다(로고가 있는 곳 먼저)
function creditWith(role) {
  const rows = WALL.map((k) => {
    const o = ORGS[k];
    const seen = new Set();
    const titles = ORG_INDEX[k].projects
      .map(({ id }) => byId(id))
      .filter((p) => p && !seen.has(p.id) && seen.add(p.id))
      .map((p) => p.title);
    return `<li class="cw${o.logo ? '' : ' is-text'}"><span class="cw-mark">${orgMark(o, { decorative: !!o.lockup })}</span><span class="cw-name">${esc(o.name)}</span>${
      titles.length ? `<span class="cw-proj">${titles.map((t) => `<span class="nw">${esc(t)}</span>`).join('<i> · </i>')}</span>` : ''
    }</li>`;
  }).join('');
  return `<div class="credit credit-with"><span>${esc(role)}</span><ul>${rows}</ul></div>`;
}
// 엔딩 크레딧의 보도: 기사 제목을 신문 지면처럼 — 매체 · 날짜
function creditPress(role) {
  return `<div class="credit credit-press"><span>${esc(role)}</span><ol>${PRESS.map(
    (a) => `<li><small>${esc(a.publisher)} · ${esc(a.date.replace(/-/g, '.'))}</small><b>${esc(a.title)}</b></li>`
  ).join('')}</ol></div>`;
}

function render(scene, i) {
  const L = scene.layout;
  if (L === 'hero') {
    return `<div class="hero">
      <p class="kicker" data-r><span class="kicker-txt">${esc(scene.kicker)}</span></p>
      <h1 class="hero-title" aria-label="${esc(scene.title.join(' '))}">${scene.title
        .map((w, j) => `<span class="line${j === 1 ? ' accent' : ''}"><span>${[...w].map((c) => `<i>${esc(c)}</i>`).join('')}</span></span>`)
        .join('')}</h1>
      <div class="hero-foot">
        <div class="hero-id" data-r>
          <p class="hero-name">${esc(scene.name)}</p>
          <p class="hero-lead">${esc(scene.lead)}</p>
        </div>
        <ul class="hero-tags" data-r>${scene.tags.map((t, j) => `<li><span>${pad(j + 1)}</span>${esc(t)}</li>`).join('')}</ul>
      </div>
    </div>`;
  }
  // 보도: 대학 · 기관 공식 기사를 오려 낸 지면처럼 한 장씩 — 누르면 기사 원문(새 창)
  if (L === 'reel' && scene.press) {
    return `<div class="reel-scene press-scene">
      <div class="reel-head panel-content">
        ${kicker(scene, i)}
        <h2 class="title">${lines(scene.title)}</h2>
        ${scene.subtitle ? `<p class="subtitle" data-r>${esc(scene.subtitle)}</p>` : ''}
        ${scene.stats ? `<ul class="mini-stats" data-r>${scene.stats.map((s) => `<li><b>${esc(s.value)}</b><span>${esc(s.label)}</span></li>`).join('')}</ul>` : ''}
      </div>
      <div class="reel deck press-reel panel-content" data-r>
        ${deck(PRESS.map(pressCard), {
          count: PRESS.length,
          label: 'IN THE PRESS',
          noun: '기사',
          stats: scene.stats ? scene.stats.map((s) => `${esc(s.value)} ${esc(s.label)}`).join(' · ') : '',
          infos: PRESS.map(deckPressInfo),
        })}
      </div>
    </div>`;
  }
  if (L === 'reel') {
    const list = scene.projects.map(byId).filter(Boolean);
    return `<div class="reel-scene">
      <div class="reel-head panel-content">
        ${kicker(scene, i)}
        <h2 class="title">${lines(scene.title)}</h2>
        ${scene.subtitle ? `<p class="subtitle" data-r>${esc(scene.subtitle)}</p>` : ''}
        ${scene.stats ? `<ul class="mini-stats" data-r>${scene.stats.map((s) => `<li><b>${esc(s.value)}</b><span>${esc(s.label)}</span></li>`).join('')}</ul>` : ''}
      </div>
      <div class="reel deck panel-content" data-r>
        ${(() => {
          const cats = [...new Set(list.map((p) => p.category))];
          const href = `/works?c=${cats.join(',')}`;
          const field = cats.map((c) => categoryOf(c).label).join(' · ');
          return deck(
            list.map((p, k) => projectCard(p, k, { cls: 'r-card' })),
            {
              count: list.length,
              label: 'PROJECTS',
              noun: '프로젝트',
              all: href,
              allLabel: 'VIEW ALL',
              stats: scene.stats ? scene.stats.map((s) => `${esc(s.value)} ${esc(s.label)}`).join(' · ') : '',
              infos: list.map(deckInfo),
              end: {
                card: deckAllCard({ href, label: `${field} 전체 보기`, total: ALL_PROJECTS.length, unit: 'PROJECTS', thumbs: moreThumbs(list) }),
                info: deckAllInfo({
                  href,
                  title: `${field} 프로젝트 전체 보기`,
                  line: `이 장면의 ${list.length}개를 포함해 프로젝트 ${ALL_PROJECTS.length}개를 분야별로 볼 수 있습니다.`,
                  cta: `${field} 전체 보기`,
                  ghost: { href: '/works', label: `모든 프로젝트 ${ALL_PROJECTS.length}` },
                }),
              },
            }
          );
        })()}
      </div>
    </div>`;
  }
  if (L === 'loop') {
    // 3D 코어를 가운데 두른 고리 — 펄스가 장면 한 번에 한 바퀴 돌며 SENSE → THINK → ACT → BUILD를 차례로 밝힌다
    const pos = ['tl', 'tr', 'br', 'bl'];
    return `<div class="loop">
      <div class="loop-head panel-content">
        ${kicker(scene, i)}
        <h2 class="title title-loop">${lines(scene.title)}</h2>
        <p class="lead" data-r>${esc(scene.lead)}</p>
      </div>
      <div class="loop-ring" aria-hidden="true" data-r>
        <svg class="lr-svg" viewBox="0 0 200 200">
          <circle class="lr-track" cx="100" cy="100" r="99" pathLength="360" />
          <circle class="lr-ticks" cx="100" cy="100" r="93" pathLength="360" />
          <circle class="lr-inner" cx="100" cy="100" r="70" />
        </svg>
        <span class="lr-orbit"><i class="lr-tail"></i><i class="lr-dot"></i></span>
        <span class="lr-label">PHYSICAL&nbsp;AI · CLOSED&nbsp;LOOP</span>
      </div>
      <ol class="loop-nodes">
        ${scene.loop
          .map(
            (c, j) => `<li class="ln ln-${pos[j]}" style="--k:${j}" data-r>
              <span class="ln-pin" aria-hidden="true"></span>
              <section class="ln-card panel-content">
                <header><span class="ln-no">${pad(j + 1)}</span><h3>${esc(c.key)}</h3><span class="ln-ko">${esc(c.ko)}</span></header>
                <ul>${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              </section>
            </li>`
          )
          .join('')}
      </ol>
      <div class="loop-detail panel-content" aria-hidden="true" data-r>${scene.loop
        .map(
          (c, j) =>
            `<section class="ld" style="--k:${j}"><header><span>${pad(j + 1)}</span><b>${esc(c.key)}</b><small>${esc(c.ko)}</small></header><ul>${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`
        )
        .join('')}</div>
      <ul class="tool-chips panel-content" data-r>${scene.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>`;
  }
  if (L === 'finale') {
    return `<div class="finale">
      <div class="credits" aria-label="엔딩 크레딧">
        <div class="credits-roll">
          <p class="credits-kicker">${esc(scene.kicker)}</p>
          <p class="credits-title">PHYSICAL AI<br /><span>a portfolio film</span></p>
          ${scene.credits
            .map(([r, n], k) =>
              r === '§'
                ? `<p class="credit-sec">${esc(n)}</p>`
                : n === null
                  ? creditWith(r)
                  : n === 'PRESS'
                    ? creditPress(r)
                  : `<div class="credit${k === 0 ? ' credit-lead' : ''}"><span>${esc(r)}</span><b>${n
                      .split(' · ')
                      .map((x, j, all) => `<span class="nw">${esc(x)}${j < all.length - 1 ? ' ·' : ''}</span>`)
                      .join(' ')}</b></div>`
            )
            .join('')}
          <p class="credits-thanks">감사합니다</p>
          <p class="credits-copy">© 2026 ${esc(profile.name)} · ${esc(profile.en)}</p>
        </div>
      </div>
      <button type="button" class="skip" id="skip-credits">SKIP ▸</button>
      <div class="endcard panel-content">
        <p class="endcard-kicker" data-r>THE END — 그리고 다음 장면</p>
        <h2 class="title title-end">${lines(scene.end)}</h2>
        <p class="endcard-en" data-r>${esc(scene.endEn)}</p>
        <ul class="contact" data-r>${profile.links
          .map(
            (l) => `<li><a href="${esc(l.url)}" ${l.url.startsWith('mailto') ? '' : 'target="_blank" rel="noopener"'}><span>${esc(l.label)}</span><b>${esc(l.value)}</b><i aria-hidden="true">↗</i></a></li>`
          )
          .join('')}</ul>
        <dl class="end-stats" data-r>
          <div><dt>Projects</dt><dd>${ALL_PROJECTS.length}</dd></div>
          <div><dt>Awards</dt><dd>${AWARDS.length}</dd></div>
          <div><dt>Press</dt><dd>${PRESS.length}</dd></div>
          <div><dt>With</dt><dd>${WALL.length}</dd></div>
        </dl>
        <div class="endcard-actions" data-r>
          <a class="btn-works" href="/works" data-link>모든 프로젝트 보기 <span aria-hidden="true">↗</span></a>
          <a class="btn-works" href="/awards" data-link>수상 기록 · 상장 <span aria-hidden="true">↗</span></a>
          <button type="button" class="btn-replay" id="btn-replay"><span aria-hidden="true">↺</span> 처음부터 다시 보기</button>
          <span class="sig">${esc(profile.name)} · ${esc(profile.en)} — ${esc(profile.role)}</span>
        </div>
      </div>
    </div>`;
  }
  if (L === 'stage') {
    // 중앙 무대: 제목은 위 가운데, 카드는 아래 가운데 — 가운데 띠는 3D 피사체의 자리
    let head = '';
    if (scene.subtitle) head += `<p class="subtitle" data-r>${esc(scene.subtitle)}</p>`;
    if (scene.lead) head += `<p class="lead" data-r>${esc(scene.lead)}</p>`;
    if (scene.counters)
      head += `<dl class="counters" data-r>${scene.counters
        .map((c) => `<div><dd><b data-count="${c.value}">${c.value}</b></dd><dt>${esc(c.label)}</dt></div>`)
        .join('')}</dl>`;
    if (scene.awardReel) {
      const years = [...new Set(AWARDS.map((a) => a.year))].sort();
      head += `<p class="rec-years" data-r><span>연도별 수상</span>${years
        .map((y) => `<span class="nw"><b>${y}</b> ${AWARDS.filter((a) => a.year === y).length}</span>`)
        .join('')}</p>`;
    }
    let foot = '';
    if (scene.pillars)
      foot += `<div class="pillars">${scene.pillars
        .map((p) => `<article class="pillar" data-r><span class="pillar-no">${esc(p.no)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`)
        .join('')}</div>`;
    if (scene.highlights)
      foot += `<ol class="highlights">${scene.highlights
        .map((h) =>
          h.link && byId(h.link)
            ? `<li data-r><a href="/works/${esc(h.link)}" data-link><span class="hl-year">${esc(h.year)}</span><span class="hl-title">${esc(h.title)} <i aria-hidden="true">↗</i></span><em>${esc(h.grade)}</em></a></li>`
            : `<li data-r><span class="hl-year">${esc(h.year)}</span><span class="hl-title">${esc(h.title)}</span><em>${esc(h.grade)}</em></li>`
        )
        .join('')}</ol>`;
    if (scene.timeline)
      foot += `<ol class="mini-timeline" data-r>${scene.timeline.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol>`;
    // 수상 릴: 프로젝트 사진 위에 상장을 얹은 카드
    const reel = scene.awardReel
      ? `<div class="reel deck aw-reel panel-content" data-r>
        ${deck(AWARD_REEL.map(awardCard), {
          count: AWARD_REEL.length,
          label: 'PROJECT AWARDS',
          noun: '수상',
          all: '/awards',
          allLabel: 'ALL AWARDS',
          infos: AWARD_REEL.map(deckAwardInfo),
          end: {
            card: deckAllCard({
              href: '/awards',
              label: `수상 ${AWARDS.length}건 상장 모두 보기`,
              total: AWARDS.length,
              unit: 'AWARDS',
              thumbs: AWARDS.filter((a) => a.certs.length).slice(0, 4).map((a) => a.certs[0].thumb),
            }),
            info: deckAllInfo({
              href: '/awards',
              title: `수상 ${AWARDS.length}건 — 상장과 프로젝트`,
              line: '대상 · 최우수상부터 장려상까지, 상장 원본과 이어진 프로젝트를 한곳에서 볼 수 있습니다.',
              cta: '수상 아카이브 보기',
              ghost: { href: '/works', label: `프로젝트 ${ALL_PROJECTS.length}` },
            }),
          },
        })}
      </div>`
      : '';
    return `<div class="stage${reel ? ' has-reel' : ''}">
      <div class="stage-head panel-content">
        ${kicker(scene, i)}
        <h2 class="title${scene.titleKo ? ' title-ko' : ''}">${lines(scene.title)}</h2>
        ${head}
      </div>
      ${foot ? `<div class="stage-foot panel-content">${foot}</div>` : ''}
      ${reel}
    </div>`;
  }
  // split-left / split-right
  let body = '';
  if (scene.subtitle) body += `<p class="subtitle" data-r>${esc(scene.subtitle)}</p>`;
  if (scene.lead) body += `<p class="lead" data-r>${esc(scene.lead)}</p>`;
  if (scene.pillars)
    body += `<div class="pillars">${scene.pillars
      .map((p) => `<article class="pillar" data-r><span class="pillar-no">${esc(p.no)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`)
      .join('')}</div>`;
  if (scene.facts) body += `<ul class="facts" data-r>${scene.facts.map(([k, v]) => `<li><span>${esc(k)}</span>${esc(v)}</li>`).join('')}</ul>`;
  body += stats(scene.stats);
  if (scene.counters)
    body += `<dl class="counters" data-r>${scene.counters
      .map((c) => `<div><dd><b data-count="${c.value}">${c.value}</b></dd><dt>${esc(c.label)}</dt></div>`)
      .join('')}</dl>`;
  if (scene.highlights)
    body += `<ol class="highlights">${scene.highlights
      .map((h) =>
        h.link && byId(h.link)
          ? `<li data-r><a href="/works/${esc(h.link)}" data-link><span class="hl-year">${esc(h.year)}</span><span class="hl-title">${esc(h.title)} <i aria-hidden="true">↗</i></span><em>${esc(h.grade)}</em></a></li>`
          : `<li data-r><span class="hl-year">${esc(h.year)}</span><span class="hl-title">${esc(h.title)}</span><em>${esc(h.grade)}</em></li>`
      )
      .join('')}</ol>`;
  if (scene.timeline)
    body += `<ol class="mini-timeline" data-r>${scene.timeline.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol>`;
  return `<div class="split">
    <div class="col panel-content">
      ${kicker(scene, i)}
      <h2 class="title${scene.titleKo ? ' title-ko' : ''}">${lines(scene.title)}</h2>
      ${body}
    </div>
  </div>`;
}

// 덱 자리: 초점 카드(0)는 가운데 앞, 이웃(1 · 2)은 양옆 뒤로 비스듬히, 그 너머(3)는 보이지 않게
const SLOTS = [
  { x: 0, z: 0, r: 0, s: 1, o: 1, d: 0 },
  { x: 0.9, z: -170, r: 38, s: 0.86, o: 1, d: 0.52 },
  { x: 1.56, z: -330, r: 48, s: 0.74, o: 0.6, d: 0.8 },
  { x: 2.05, z: -450, r: 54, s: 0.62, o: 0, d: 1 },
];

// 카드 덱(커버플로): 한 번에 한 장씩 가운데로 — 휠 · 스와이프 · 방향키 · 버튼 · 옆 카드 누르기 · 끌기
function deckReel(el, reducedMotion) {
  const stage = el.querySelector('.deck-stage');
  const cards = [...stage.querySelectorAll('.r-card')];
  if (!cards.length) return null;
  // 초점이 바뀔 때 카드 표면을 훑는 빛
  cards.forEach((c) => c.querySelector('.card-media')?.insertAdjacentHTML('beforeend', '<i class="card-sweep" aria-hidden="true"></i>'));
  let focus = 0;
  let width = 0;

  // f: 가운데에 올 위치(끌기 중에는 소수 — 자리 사이를 이어서 보간한다)
  const slot = (j, f = focus) => {
    const off = j - f;
    const a = Math.min(3, Math.abs(off));
    const i = Math.floor(a);
    const t = a - i;
    const A = SLOTS[i];
    const B = SLOTS[Math.min(3, i + 1)];
    const m = (k) => A[k] + (B[k] - A[k]) * t;
    const sign = Math.sign(off);
    return { x: sign * m('x') * width, z: m('z'), rotationY: sign * m('r'), scale: m('s'), autoAlpha: m('o'), '--dim': m('d'), zIndex: 10 - Math.round(a) };
  };
  const place = (animate) => {
    cards.forEach((c, j) => {
      const { zIndex, ...v } = slot(j);
      // 아직 시작 전인 등장 트윈까지 걷어 내야 늦게 시작해 옛 자리로 되돌리지 않는다
      gsap.killTweensOf(c);
      gsap.set(c, { zIndex, xPercent: -50, transformOrigin: '50% 50%' });
      if (animate && !reducedMotion) gsap.to(c, { ...v, duration: 0.95, ease: 'expo.out' });
      else gsap.set(c, v);
    });
  };
  const land = () => {
    const c = cards[focus];
    cards.forEach((x) => x.classList.remove('is-landing'));
    void c.offsetWidth;
    c.classList.add('is-landing');
  };
  // auto: 자동 재생이 옮긴 것 · animate: 움직임으로 옮길지
  // entry: 장면에 들어설 때 — 이전 방문의 초점과 비교한 방향을 쓰지 않는다
  const set = (k, { animate = true, auto = false, entry = false } = {}) => {
    const prev = focus;
    focus = Math.max(0, Math.min(cards.length - 1, k));
    // 탭 순서에는 가운데 카드 하나만 — 키보드 초점이 덱 안에 있으면 새 가운데 카드로 옮긴다
    const had = cards.includes(document.activeElement);
    cards.forEach((c, j) => {
      c.classList.toggle('is-focus', j === focus);
      c.tabIndex = j === focus ? 0 : -1;
      c.setAttribute('aria-hidden', String(Math.abs(j - focus) > 2));
    });
    if (had && document.activeElement !== cards[focus]) cards[focus].focus({ preventScroll: true });
    // 바닥 빛은 초점 카드의 분야 색
    stage.style.setProperty('--fc', getComputedStyle(cards[focus]).getPropertyValue('--cc') || '');
    place(animate);
    if (animate && focus !== prev) land();
    el.dispatchEvent(new CustomEvent('reelfocus', { detail: { focus, prev, count: cards.length, auto, entry } }));
  };
  const layout = () => {
    width = cards[0].offsetWidth;
    if (width) place(false);
  };

  // 옆 카드를 누르면 그 카드를 가운데로, 가운데 카드를 누르면 상세로
  let dragged = false;
  stage.addEventListener(
    'click',
    (e) => {
      const c = e.target.closest('.r-card');
      if (!c) return;
      // Ctrl · Cmd · Shift 클릭은 브라우저 기본 동작(새 탭 등) 그대로
      if (!dragged && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
      const k = cards.indexOf(c);
      if (dragged || k !== focus) {
        e.preventDefault();
        e.stopPropagation();
        if (!dragged) set(k);
      }
      dragged = false;
    },
    true
  );
  // 키보드로 옆 카드에 닿으면 그 카드를 가운데로
  stage.addEventListener('focusin', (e) => {
    const c = e.target.closest?.('.r-card');
    if (c && c.matches(':focus-visible') && cards.indexOf(c) !== focus) set(cards.indexOf(c));
  });
  // 덱 위의 가로 제스처(트랙패드 가로 스크롤 · 가로 스와이프 · ←/→ 키)는 카드를 넘긴다 — 세로는 장면 넘김에 맡긴다
  let acc = 0;
  let lockUntil = 0;
  let idle = 0;
  stage.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      clearTimeout(idle);
      idle = setTimeout(() => (acc = 0), 200);
      if (now < lockUntil) {
        lockUntil = Math.max(lockUntil, now + 200);
        return;
      }
      acc += e.deltaX;
      if (Math.abs(acc) > 40) {
        set(focus + Math.sign(acc));
        acc = 0;
        lockUntil = now + 450;
      }
    },
    { passive: false }
  );
  // 터치: 손가락을 따라 덱이 함께 움직이고, 놓으면 가까운 카드(빠르게 튕기면 다음 카드)로 붙는다
  let tx = null;
  stage.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      tx = { x: t.clientX, y: t.clientY, f0: focus, lx: t.clientX, lt: performance.now(), v: 0, axis: '' };
    },
    { passive: true }
  );
  // 끌기를 시작한 순간의 카드 기준(그 사이 자동 재생이 넘겨도 손가락 아래 덱이 튀지 않게)
  const dragPos = (dx, f0) => Math.max(-0.35, Math.min(cards.length - 0.65, f0 - dx / Math.max(80, width * 0.9)));
  stage.addEventListener(
    'touchmove',
    (e) => {
      if (!tx || e.touches.length > 1) return;
      const t = e.touches[0];
      const dx = t.clientX - tx.x;
      const dy = t.clientY - tx.y;
      if (!tx.axis && Math.hypot(dx, dy) > 8) tx.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (tx.axis !== 'x' || reducedMotion) return;
      const now = performance.now();
      tx.v = (t.clientX - tx.lx) / Math.max(1, now - tx.lt);
      tx.lx = t.clientX;
      tx.lt = now;
      const f = dragPos(dx, tx.f0);
      cards.forEach((c, j) => {
        const { zIndex, ...v } = slot(j, f);
        gsap.killTweensOf(c);
        gsap.set(c, { ...v, zIndex });
      });
    },
    { passive: true }
  );
  stage.addEventListener(
    'touchend',
    (e) => {
      if (!tx) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - tx.x;
      const dy = t.clientY - tx.y;
      const { axis, v, f0 } = tx;
      tx = null;
      if (axis !== 'x' && !(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy))) return;
      // 놓는 순간의 속도로 한 장 더 넘길지 정한다
      let k = Math.round(dragPos(dx, f0) + Math.max(-0.6, Math.min(0.6, -v * 0.35)));
      if (k === f0 && Math.abs(dx) > 40) k = f0 - Math.sign(dx);
      if (k === focus) place(true);
      else set(k);
    },
    { passive: true }
  );
  stage.addEventListener('touchcancel', () => {
    if (tx?.axis === 'x') place(true);
    tx = null;
  });
  stage.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const k = focus + dir;
    if (!dir || k < 0 || k >= cards.length) return;
    e.preventDefault();
    e.stopPropagation();
    set(k);
  });
  // 마우스로 끌어 넘기기
  stage.addEventListener('dragstart', (e) => e.preventDefault());
  let down = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = { x: e.clientX };
    dragged = false;
  });
  addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    down = null;
    if (Math.abs(dx) < 36) return;
    dragged = true;
    const n = Math.max(1, Math.round(Math.abs(dx) / Math.max(60, width * 0.7)));
    set(focus - Math.sign(dx) * n);
    setTimeout(() => (dragged = false), 0);
  });
  addEventListener('resize', layout);

  set(0, { animate: false });

  return {
    // 휠 · 세로 스와이프 · 방향키로도 한 장씩 넘긴다(수상 덱도 다른 장면처럼 끝까지 넘긴 뒤 다음 장면으로)
    paged: true,
    get card() {
      return cards[focus];
    },
    get count() {
      return cards.length;
    },
    get focus() {
      return focus;
    },
    set,
    layout,
    // 넘길 카드가 남았으면 넘기고 true
    step(dir) {
      const k = focus + dir;
      if (k < 0 || k >= cards.length) return false;
      set(k);
      return true;
    },
    // 장면에 들어설 때: 카드가 오른쪽에서 한 장씩 날아와 제자리에 선다
    intro(tl, at) {
      layout();
      if (reducedMotion) return;
      cards.forEach((c, j) => {
        const { zIndex, ...v } = slot(j);
        if (!v.autoAlpha) return;
        gsap.set(c, { x: v.x + width * 1.6, z: v.z - 260, rotationY: v.rotationY - 38, autoAlpha: 0, '--dim': 1 });
        tl.to(c, { ...v, duration: 1.25, ease: 'expo.out' }, at + Math.abs(j - focus) * 0.09 + (j < focus ? 0.05 : 0));
      });
      tl.call(land, null, at + 0.5);
    },
  };
}

function bindReel(el, reducedMotion, onReelFocus, onCard) {
  const reel = el.querySelector('.deck') ? deckReel(el, reducedMotion) : null;
  el.reel = reel;
  if (!reel) return;
  const nav = el.querySelector('.deck-nav');
  const now = el.querySelector('.deck-now');
  const ticks = [...el.querySelectorAll('.deck-ticks i')];
  const info = el.querySelector('.deck-info');
  const tpls = [...el.querySelectorAll('template.deck-tpl')];
  // 덱 아래 설명: 나가는 줄은 위로 사라지고, 새 줄이 아래에서 한 줄씩 올라온다
  const showInfo = (dir) => {
    const tpl = tpls[reel.focus];
    if (!info || !tpl) return;
    const node = tpl.content.firstElementChild.cloneNode(true);
    const old = [...info.children];
    // 나가는 설명 안의 버튼에 키보드 초점이 있었다면 새 설명의 같은 자리로 옮긴다
    const had = old.find((o) => o.contains(document.activeElement));
    old.forEach((o) => (o.inert = true));
    info.appendChild(node);
    if (had) (node.querySelector('.di-open') || node.querySelector('a'))?.focus({ preventScroll: true });
    old.forEach((o) => {
      if (reducedMotion || !dir) return o.remove();
      gsap.to(o, { autoAlpha: 0, y: dir > 0 ? -12 : 12, duration: 0.26, ease: 'power2.in', onComplete: () => o.remove() });
    });
    if (!reducedMotion && dir) gsap.fromTo(node.children, { autoAlpha: 0, y: dir > 0 ? 16 : -16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05, delay: 0.12 });
  };
  el.querySelectorAll('[data-reel]').forEach((b) => b.addEventListener('click', () => reel.step(+b.dataset.reel)));
  // 번호 · 눈금 · 버튼 상태를 초점에 맞춘다
  const sync = (dir = 0) => {
    const f = reel.focus;
    if (now) {
      now.textContent = reel.card?.classList.contains('deck-all') ? 'ALL' : pad(f + 1);
      if (dir && !reducedMotion) gsap.fromTo(now, { yPercent: dir * 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' });
    }
    ticks.forEach((t, j) => {
      t.classList.toggle('is-on', j === f);
      t.classList.toggle('is-past', j < f);
    });
    if (nav) {
      const prev = nav.querySelector('[data-reel="-1"]');
      const next = nav.querySelector('[data-reel="1"]');
      // 누르던 버튼이 끝에서 꺼지면 초점을 반대쪽 버튼으로 넘겨 잃지 않게
      const active = document.activeElement;
      prev.disabled = f <= 0;
      next.disabled = f >= reel.count - 1;
      if (active === prev && prev.disabled) next.focus({ preventScroll: true });
      if (active === next && next.disabled) prev.focus({ preventScroll: true });
    }
  };
  el.addEventListener('reelfocus', (e) => {
    const dir = e.detail.entry ? 0 : Math.sign(e.detail.focus - e.detail.prev);
    sync(dir);
    if (e.detail.focus !== e.detail.prev || !info.children.length) showInfo(dir);
    if (!e.detail.auto) onReelFocus?.(el, e.detail);
    onCard?.(el, reel.card, dir, reel.focus);
  });
  sync();
  showInfo(0);
}

export function createPanels(root, scenes, { onReplay, reducedMotion, onReelFocus, onCard }) {
  const panels = scenes.map((scene, i) => {
    const el = document.createElement('section');
    el.className = `panel layout-${scene.layout}`;
    el.dataset.scene = scene.id;
    el.setAttribute('aria-label', `${pad(i)} ${scene.label}`);
    el.innerHTML = render(scene, i);
    el.hidden = true;
    el.inert = true;
    root.appendChild(el);
    // 지금 장면의 릴에서 손으로 옮긴 초점만 자동 재생 시계에 알린다
    bindReel(
      el,
      reducedMotion,
      (from, r) => from === panels[current] && onReelFocus?.(r),
      (from, card, dir, focus) => from === panels[current] && onCard?.(card, dir, focus)
    );
    const sheet = el.querySelector('.stage-foot');
    if (sheet) {
      const end = () => sheet.classList.toggle('is-end', sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 4);
      sheet.addEventListener('scroll', end, { passive: true });
      addEventListener('resize', end);
    }
    return el;
  });

  let current = -1;
  let creditsTl = null;
  const D = reducedMotion ? 0.01 : 1;

  function countUp(el) {
    el.querySelectorAll('[data-count]').forEach((b) => {
      const raw = b.dataset.count;
      const target = parseFloat(raw);
      if (!/^[\d.]+$/.test(raw) || Number.isNaN(target)) return;
      const dec = raw.includes('.') ? raw.split('.')[1].length : 0;
      const o = { v: 0 };
      gsap.to(o, {
        v: target,
        duration: 1.6 * D,
        ease: 'power3.out',
        onUpdate: () => (b.textContent = o.v.toFixed(dec)),
        onComplete: () => (b.textContent = raw),
      });
    });
  }

  function hide(i) {
    const el = panels[i];
    if (!el) return;
    el.inert = true;
    gsap.killTweensOf(el);
    gsap.to(el, {
      autoAlpha: 0,
      y: -18,
      filter: 'blur(8px)',
      duration: 0.55 * D,
      ease: 'power2.in',
      onComplete: () => {
        el.hidden = true;
        gsap.set(el, { y: 0, filter: 'none' });
      },
    });
    if (creditsTl && panels[i].dataset.scene === 'finale') {
      creditsTl.kill();
      creditsTl = null;
    }
  }

  function show(i, delay = 0, back = false) {
    const el = panels[i];
    el.hidden = false;
    el.inert = false;
    gsap.killTweensOf(el);
    gsap.set(el, { autoAlpha: 1, y: 0, filter: 'none' });
    const tl = gsap.timeline({ delay: delay * D });
    // 엔딩 카드는 크레딧이 끝난 뒤 따로 등장한다
    const own = (sel) => [...el.querySelectorAll(sel)].filter((n) => !n.closest('.endcard'));
    const titleSpans = own('.title .line > span, .hero-title .line > span');
    const heroChars = own('.hero-title i');
    const reveal = own('[data-r]');
    set(reveal, { autoAlpha: 0, y: 22 });
    if (heroChars.length) {
      set(heroChars, { yPercent: 115, rotate: 6 });
      tl.to(heroChars, { yPercent: 0, rotate: 0, duration: 1.3 * D, ease: 'expo.out', stagger: 0.045 * D }, 0.1);
    } else {
      set(titleSpans, { yPercent: 112 });
      if (has(titleSpans)) tl.to(titleSpans, { yPercent: 0, duration: 1.1 * D, ease: 'expo.out', stagger: 0.09 * D }, 0);
    }
    if (has(reveal)) tl.to(reveal, { autoAlpha: 1, y: 0, duration: 0.8 * D, ease: 'power3.out', stagger: 0.055 * D }, heroChars.length ? 0.6 : 0.25);
    tl.add(() => countUp(el), 0.4);
    if (el.reel) {
      // 넘기는 동안 빈 카드가 보이지 않게 이 장면의 썸네일은 미리 모두 받는다
      el.querySelectorAll('.deck-stage img[loading="lazy"]').forEach((im) => (im.loading = 'eager'));
      // 바로 다음 장면에서 뒤로 돌아왔다면 마지막 카드부터 — 위로 스크롤하면 카드를 거꾸로 넘긴다
      el.reel.set(back && el.reel.paged ? el.reel.count - 1 : 0, { animate: false, entry: true });
      el.reel.intro(tl, 0.3);
    }
    // 루프: 고리가 드러날 때 펄스가 SENSE에서 출발한다
    const loop = el.querySelector('.loop');
    if (loop) {
      loop.classList.remove('is-live');
      fitLoop();
      tl.call(() => loop.classList.add('is-live'), null, 0.25);
    }
    el.querySelectorAll('.col, .stage-foot').forEach((c) => {
      c.scrollTop = 0;
      c.dispatchEvent(new Event('scroll'));
    });
    // 등장 트윈(y 이동)이 끝난 뒤 다시 재야 시트 끝 여부가 정확하다
    tl.call(() => el.querySelectorAll('.stage-foot').forEach((c) => c.dispatchEvent(new Event('scroll'))));

    if (el.dataset.scene === 'finale') runCredits(el, delay);
  }

  function runCredits(el, delay) {
    const roll = el.querySelector('.credits-roll');
    const credits = el.querySelector('.credits');
    const card = el.querySelector('.endcard');
    const skip = el.querySelector('#skip-credits');
    gsap.set(card, { autoAlpha: 0 });
    gsap.set([credits, skip], { autoAlpha: 1 });
    gsap.set(card.querySelectorAll('.title .line > span'), { yPercent: 112 });
    gsap.set(card.querySelectorAll('[data-r]'), { autoAlpha: 0, y: 22 });
    const showCard = () => {
      if (!creditsTl) return;
      creditsTl.kill();
      creditsTl = gsap.timeline();
      creditsTl
        .to([credits, skip], { autoAlpha: 0, duration: 0.6 })
        .set(card, { autoAlpha: 1 })
        .to(card.querySelectorAll('.title .line > span'), { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12 })
        .to(card.querySelectorAll('[data-r]'), { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, '-=0.8');
    };
    creditsTl = gsap.timeline({ delay: delay * D });
    if (reducedMotion) {
      creditsTl.add(showCard, 0.5);
    } else {
      // 크레딧 길이에 맞춰 일정한 속도로 흐른다(초당 약 95px, 16~48초 — 기관 · 보도 목록이 길어 너무 늘어지지 않게)
      const duration = Math.min(48, Math.max(16, (roll.offsetHeight + credits.clientHeight) / 95));
      creditsTl.fromTo(roll, { yPercent: 0, y: () => credits.clientHeight }, { yPercent: -100, y: 0, duration, ease: 'none' }).add(showCard);
    }
    skip.onclick = showCard;
  }

  panels.forEach((el) => el.querySelector('#btn-replay')?.addEventListener('click', onReplay));

  // 장면 넘기기 전에 지금 장면의 프로젝트 릴을 한 장씩 넘긴다 — 넘겼으면 { focus, count }
  function step(dir) {
    const reel = panels[current]?.reel;
    if (!reel || !reel.paged || !reel.step(dir)) return null;
    return { focus: reel.focus, count: reel.count };
  }
  // 자동 재생: 장면 시간에 맞춰 초점이 다음 카드로 흐른다(뒤로는 돌아가지 않음)
  function autoFocus(progress) {
    const reel = panels[current]?.reel;
    if (!reel || reel.count < 2) return;
    const k = Math.min(reel.count - 1, Math.floor(progress * reel.count));
    if (k > reel.focus) reel.set(k, { auto: true });
  }

  // 루프 고리의 중심 — 3D 코어의 화면 위치
  const loopEl = panels.find((p) => p.dataset.scene === 'loop')?.querySelector('.loop');
  // 위 · 아래 마디 카드가 서로 겹치지 않도록 실제 카드 높이를 CSS에 알려 준다
  function fitLoop() {
    if (!loopEl || loopEl.parentElement.hidden) return;
    const h = Math.max(0, ...[...loopEl.querySelectorAll('.ln-card')].map((c) => c.offsetHeight));
    if (h) loopEl.style.setProperty('--ch', `${h}px`);
  }
  addEventListener('resize', fitLoop);
  function setLoopCenter(x, y) {
    if (!loopEl) return;
    loopEl.style.setProperty('--lx', `${x.toFixed(1)}px`);
    loopEl.style.setProperty('--ly', `${y.toFixed(1)}px`);
  }

  return {
    panels,
    step,
    autoFocus,
    setLoopCenter,
    go(i, prev, duration) {
      if (prev >= 0) hide(prev);
      current = i;
      // 다음 장면의 릴 썸네일을 미리 받아 카드가 빈 상자로 날아들지 않게
      panels[i + 1]?.querySelectorAll('.deck-stage img[loading="lazy"]').forEach((im) => (im.loading = 'eager'));
      const delay = prev < 0 ? 0.9 : Math.max(0.5, duration * 0.62);
      show(i, delay, prev === i + 1);
    },
    get current() {
      return panels[current];
    },
  };
}
