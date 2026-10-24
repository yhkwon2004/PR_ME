import gsap from 'gsap';
import { profile } from '../content.js';
import { byId, projects as ALL_PROJECTS, categoryOf } from '../data/projects.js';
import { AWARDS, AWARD_REEL } from '../data/awards.js';
import { ORGS, WALL } from '../data/orgs.js';
import { projectCard, awardCard, pressCard, orgMark, deckInfo, deckAwardInfo, deckPressInfo, deckAllCard, deckAllInfo } from '../pages/site.js';
import { PRESS } from '../data/press.js';
import { renderBeats, bindBeats } from './beats.js';

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

// 엔딩 크레딧의 한 비트: 가운데에 들어와 머무는 한 화면 — .cb-a는 비트가 켜질 때 --i 순서로 들어온다
function creditBeat(c, kicker) {
  const a = (j) => `class="cb-a" style="--i:${j}"`;
  if (c.beat === 'lead')
    return `<section class="cb cb-lead">
      <p ${a(0)}><span class="cb-role">${esc(kicker)} — ${esc(c.role)}</span></p>
      <h3 class="cb-name" aria-label="${esc(c.name)}">${[...c.name].map((ch, j) => `<i ${a(j + 1)}>${esc(ch)}</i>`).join('')}</h3>
      <p class="cb-en" ${a(5)}>${esc(c.en)} · ${esc(profile.role)}</p>
    </section>`;
  if (c.beat === 'words')
    return `<section class="cb cb-words">
      <p ${a(0)}><span class="cb-role">${esc(c.role)}</span></p>
      <ul>${c.words.map((w, j) => `<li ${a(j + 1)}>${esc(w)}</li>`).join('')}</ul>
    </section>`;
  if (c.beat === 'with')
    return `<section class="cb cb-with">
      <p ${a(0)}><span class="cb-role">${esc(c.role)}</span> <span class="cb-title">${esc(c.title)} <b>${WALL.length}</b></span></p>
      <ul class="cb-logos">${WALL.map((k, j) => `<li ${a(1 + Math.floor(j / 2))}>${orgMark(ORGS[k])}</li>`).join('')}</ul>
    </section>`;
  return `<section class="cb cb-thanks">
      <p ${a(0)}><span class="cb-role">${esc(c.role)}</span></p>
      <p class="cb-line" ${a(1)}>${esc(c.line)}</p>
      <p class="cb-big" ${a(2)}>${esc(c.big)}</p>
      <p class="cb-copy" ${a(3)}>© 2026 ${esc(profile.name)} · ${esc(profile.en)} — Three.js · GSAP · Web Audio</p>
    </section>`;
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
  // 한 장면 안의 여러 화면(소개 · 이력) — 스크롤 없이 한 화면씩
  if (L === 'beats') return renderBeats(scene, i);
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
          label: '보도 · 인터뷰',
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
              label: '프로젝트',
              noun: '프로젝트',
              all: href,
              allLabel: '전체 보기',
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
        <div class="credits-roll">${scene.credits.map((c) => creditBeat(c, scene.kicker)).join('')}</div>
      </div>
      <div class="credits-rail" aria-hidden="true"><i></i></div>
      <p class="credits-hint" aria-hidden="true">스크롤 · 드래그로 넘겨 보기</p>
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
          <a class="btn-works" href="/resume" data-link>이력서 · PDF <span aria-hidden="true">↗</span></a>
          <a class="btn-works" href="/growth" data-link>성장 과정 · 가치관 <span aria-hidden="true">↗</span></a>
          <a class="btn-works" href="/works" data-link>모든 프로젝트 보기 <span aria-hidden="true">↗</span></a>
          <a class="btn-works" href="/awards" data-link>수상 기록 · 상장 <span aria-hidden="true">↗</span></a>
          <a class="btn-works" href="/skills" data-link>보유 스킬 <span aria-hidden="true">↗</span></a>
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
          label: '대표 수상 · 대상',
          noun: '수상',
          all: '/awards',
          allLabel: '수상 전체 보기',
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
              line: `여기서는 대표 상장(대상 ${AWARD_REEL.length}건)만 — 최우수상부터 장려상까지 나머지 상장과 이어진 프로젝트는 아카이브에서 볼 수 있습니다.`,
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
// 임계 감쇠 스프링(목표를 쫓되 넘치지 않는다) — 프레임이 들쭉날쭉해도 같은 움직임
const SMOOTH = 0.15; // 초: 작을수록 빠르게 붙는다
function damp(cur, target, vel, dt) {
  const w = 2 / SMOOTH;
  const x = w * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const c = cur - target;
  const t = (vel + w * c) * dt;
  return [target + (c + t) * e, (vel - w * t) * e];
}
const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
// 손을 놓는 순간의 속도(px/ms): 마지막 0.1초 동안 움직인 거리로 — 한두 번의 떨림 · 몰려 들어온 이벤트에 휘둘리지 않게
function velocity() {
  const pts = [];
  return {
    reset(x, t) {
      pts.length = 0;
      pts.push([x, t]);
    },
    add(x, t) {
      pts.push([x, t]);
      while (pts.length > 2 && t - pts[0][1] > 100) pts.shift();
    },
    // 손가락이 멈춘 채로 떼면 0
    get(now) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (!b || now - b[1] > 80 || b[1] - a[1] < 1) return 0;
      return (b[0] - a[0]) / (b[1] - a[1]);
    },
  };
}
const INTRO = 1.25; // 등장 한 장의 길이(초)

// 카드 덱(커버플로): 한 번에 한 장씩 가운데로 — 휠 · 스와이프 · 방향키 · 버튼 · 옆 카드 누르기 · 끌기.
// 덱 전체가 하나의 위치(pos, 소수)로 움직인다 — 넘김 · 끌기 · 자동 재생 · 등장 · 끌기 안내가 모두 같은 길로 그려져
// 여러 장을 건너뛰어도 자리 사이를 이어서 지나가고, 손을 놓은 속도 그대로 이어서 붙는다.
// 그리기는 한 프레임에 한 번, 바뀐 값만 쓴다(움직임이 멈추면 쉰다)
function deckReel(el, reducedMotion) {
  const stage = el.querySelector('.deck-stage');
  const cards = [...stage.querySelectorAll('.r-card')];
  if (!cards.length) return null;
  // 초점이 바뀔 때 카드 표면을 훑는 빛 · 물러난 카드를 어둡게 하는 막(불투명도만 바꿔 다시 칠하지 않는다)
  cards.forEach((c) => c.querySelector('.card-media')?.insertAdjacentHTML('beforeend', '<i class="card-dim" aria-hidden="true"></i><i class="card-sweep" aria-hidden="true"></i>'));
  const dims = cards.map((c) => c.querySelector('.card-dim'));
  const last = cards.map(() => ({ tf: '', o: -1, d: -1, z: 0, vis: '' }));
  const n = cards.length;
  let focus = 0;
  let pos = 0; // 지금 가운데에 있는 위치(소수)
  let vel = 0; // 초당 카드 수
  let held = false; // 손가락 · 마우스 · 가로 휠이 덱을 잡고 있다
  let width = 0;
  let peek = 0; // 끌기 안내로 잠깐 더해지는 위치
  let peekTl = null;
  const intro = { t: -1, at: 0 }; // 등장 시계(초) — 음수면 등장 끝

  // 카드 j의 자리: 덱 위치 f 기준, 등장 중이면 오른쪽 뒤에서 날아드는 만큼 더한다
  function draw(f) {
    for (let j = 0; j < n; j++) {
      const off = j - f;
      const a = Math.min(3, Math.abs(off));
      const i = Math.floor(a);
      const t = a - i;
      const A = SLOTS[i];
      const B = SLOTS[Math.min(3, i + 1)];
      const sg = Math.sign(off);
      let x = sg * (A.x + (B.x - A.x) * t) * width;
      let z = A.z + (B.z - A.z) * t;
      let r = sg * (A.r + (B.r - A.r) * t);
      const sc = A.s + (B.s - A.s) * t;
      let o = A.o + (B.o - A.o) * t;
      let d = A.d + (B.d - A.d) * t;
      if (intro.t >= 0) {
        const delay = intro.at + Math.abs(j - focus) * 0.09 + (j < focus ? 0.05 : 0);
        const u = 1 - expoOut(Math.max(0, Math.min(1, (intro.t - delay) / INTRO)));
        x += u * width * 1.6;
        z -= u * 260;
        r -= u * 38;
        o *= 1 - u;
        d = Math.max(d, u);
      }
      const L = last[j];
      const c = cards[j];
      const vis = o < 0.004 ? 'hidden' : '';
      if (vis !== L.vis) c.style.visibility = L.vis = vis;
      if (vis) continue;
      const tf = `translate3d(${(x - width / 2).toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${r.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      if (tf !== L.tf) c.style.transform = L.tf = tf;
      if (Math.abs(o - L.o) > 0.003) c.style.opacity = L.o = +o.toFixed(3);
      if (dims[j] && Math.abs(d - L.d) > 0.004) dims[j].style.opacity = L.d = +d.toFixed(3);
      const zi = 10 - Math.round(a);
      if (zi !== L.z) c.style.zIndex = L.z = zi;
    }
  }

  // 프레임마다: 잡고 있지 않으면 스프링이 초점으로 데려간다
  let running = false;
  const tick = (time, deltaMs) => {
    // 느린 기기에서도 같은 빠르기로(스프링은 큰 걸음에도 안정적)
    const dt = Math.min(0.12, deltaMs / 1000);
    if (!held) [pos, vel] = damp(pos, focus, vel, dt);
    const settled = !held && Math.abs(pos - focus) < 0.0005 && Math.abs(vel) < 0.002;
    if (settled) {
      pos = focus;
      vel = 0;
    }
    draw(pos + peek);
    if (settled && intro.t < 0 && !peekTl) {
      gsap.ticker.remove(tick);
      running = false;
    }
  };
  const wake = () => {
    if (running || reducedMotion) return;
    running = true;
    gsap.ticker.add(tick);
  };
  // 움직임 없이 바로 그 자리에(동작 줄이기 · 창 크기 변경)
  const snap = () => {
    pos = focus;
    vel = 0;
    draw(pos + peek);
  };
  const stopPeek = () => {
    if (!peekTl) return;
    peekTl.kill();
    peekTl = null;
    // 안내로 끌려가 있던 만큼은 위치에 넘겨 스프링이 이어서 데려온다(튀지 않게)
    pos += peek;
    peek = 0;
    stage.classList.remove('is-dragging');
  };
  const land = () => {
    const c = cards[focus];
    cards.forEach((x) => x.classList.remove('is-landing'));
    void c.offsetWidth;
    c.classList.add('is-landing');
  };
  // auto: 자동 재생이 옮긴 것 · animate: 움직임으로 옮길지 · v: 손을 놓은 속도(초당 카드 수)
  // entry: 장면에 들어설 때 — 이전 방문의 초점과 비교한 방향을 쓰지 않는다
  // drag: 끄는 중에 가운데가 바뀌었다(착지 연출은 손을 놓을 때)
  const set = (k, { animate = true, auto = false, entry = false, drag = false, v } = {}) => {
    stopPeek();
    const prev = focus;
    focus = Math.max(0, Math.min(n - 1, k));
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
    if (v !== undefined) vel = v;
    if (!animate || reducedMotion) snap();
    else wake();
    if (animate && !drag && focus !== prev) land();
    el.dispatchEvent(new CustomEvent('reelfocus', { detail: { focus, prev, count: n, auto, entry, drag } }));
  };
  const layout = () => {
    width = cards[0].offsetWidth;
    if (!width) return;
    cards.forEach((c, j) => (last[j].tf = '')); // 폭이 바뀌면 다시 쓴다
    if (running) draw(pos + peek);
    else snap();
  };

  // 끌기: 끌기가 시작된 순간의 위치 기준(그 사이 자동 재생이 넘겨도 손 아래 덱이 튀지 않게).
  // 한 장 거리는 가운데 카드가 손가락 밑에 붙어 다니도록 원근으로 줄어드는 만큼 짧게, 끝에서는 고무줄처럼 점점 덜 끌린다
  const span = () => Math.max(80, width * 0.84);
  const RUB = 0.6; // 끝에서 더 끌려 나가는 최대(카드 수)
  const rubber = (o) => RUB * Math.tanh((o * 0.4) / RUB);
  const unrubber = (d) => (RUB / 0.4) * Math.atanh(Math.max(-0.995, Math.min(0.995, d / RUB)));
  const dragPos = (dx, f0) => {
    const f = f0 - dx / span();
    if (f < 0) return rubber(f);
    if (f > n - 1) return n - 1 + rubber(f - (n - 1));
    return f;
  };
  // 지금 보이는 위치를 끌기의 기준으로(끝에서 고무줄로 끌려 나가 있던 덱을 잡아도 튀지 않게)
  const grab = () => (pos < 0 ? unrubber(pos) : pos > n - 1 ? n - 1 + unrubber(pos - (n - 1)) : pos);
  // 끄는 동안: 가운데에 가장 가까운 카드가 바로 초점이 된다(번호 · 설명 · 분위기 · 소리가 손가락을 따라) — 반을 조금 넘어가면 바뀐다
  const follow = (tick) => {
    const k = Math.max(0, Math.min(n - 1, Math.round(pos)));
    if (k === focus || Math.abs(pos - focus) < 0.56) return;
    set(k, { drag: true });
    if (tick) navigator.vibrate?.(4);
  };
  // 놓을 때: 놓은 속도만큼 더 미끄러진 자리의 가장 가까운 카드로(세게 튕기면 두 장까지) — 짧게 끌어도 한 장은 넘긴다
  // k0: 끌기를 시작할 때의 카드 · reach: 속도로 더 갈 수 있는 최대(카드 수 — 휠은 관성 이벤트가 이미 거리에 들어 있어 짧게)
  const release = (dx, k0, vPx, reach = 1.6) => {
    held = false;
    stage.classList.remove('is-dragging');
    const v = -vPx * (1000 / span()); // 초당 카드 수
    let k = Math.round(pos + Math.max(-reach, Math.min(reach, v * 0.14)));
    if (k === k0 && Math.abs(dx) > 40) k = k0 - Math.sign(dx);
    k = Math.max(0, Math.min(n - 1, k));
    // 스프링이 목표를 지나쳐 되돌아오지 않을 만큼만 속도를 넘긴다
    const room = k - pos;
    const v1 = Math.sign(v) === Math.sign(room) ? Math.sign(v) * Math.min(Math.abs(v), Math.abs(room) * 11) : v;
    if (k === focus) {
      vel = v1;
      wake();
      if (focus !== k0) land(); // 끄는 동안 이미 바뀐 카드가 자리에 닿는다
    } else set(k, { v: v1 });
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
  // 트랙패드 가로 스크롤: 덱이 손가락을 따라 미끄러지다가, 멈추면 가까운 카드에 붙는다 — 세로는 장면 넘김에 맡긴다
  let wheelT = 0;
  let wheel = null;
  stage.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      stopPeek();
      if (reducedMotion) {
        if (!wheel) {
          wheel = true;
          set(focus + Math.sign(e.deltaX));
        }
        clearTimeout(wheelT);
        wheelT = setTimeout(() => (wheel = null), 260);
        return;
      }
      const now = performance.now();
      if (!wheel) wheel = { f0: grab(), k0: focus, dx: 0, lt: now, v: 0 };
      const px = e.deltaX * (e.deltaMode === 1 ? 32 : 1);
      wheel.dx -= px;
      wheel.v = -px / Math.max(8, now - wheel.lt);
      wheel.lt = now;
      held = true;
      stage.classList.add('is-dragging');
      pos = dragPos(wheel.dx * 0.8, wheel.f0);
      follow(false);
      wake();
      clearTimeout(wheelT);
      wheelT = setTimeout(() => {
        const w = wheel;
        wheel = null;
        release(w.dx, w.k0, w.v * 0.5, 0.7);
      }, 130);
    },
    { passive: false }
  );
  // 터치: 손가락을 따라 덱이 함께 움직이고, 놓으면 그 속도 그대로 가까운 카드(빠르게 튕기면 다음 카드)로 붙는다.
  // 움직이던 덱에 손가락이 닿으면 그 자리에서 붙잡는다 — 연달아 튕겨 넘길 때 앞의 움직임에서 이어서
  let tx = null;
  const tv = velocity();
  stage.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      stopPeek();
      if (!reducedMotion && (Math.abs(vel) > 0.05 || Math.abs(pos - focus) > 0.01)) {
        held = true;
        vel = 0;
      }
      tx = { x: t.clientX, y: t.clientY, f0: pos, k0: focus, axis: '' };
      tv.reset(t.clientX, performance.now());
    },
    { passive: true }
  );
  stage.addEventListener(
    'touchmove',
    (e) => {
      if (!tx || e.touches.length > 1) return;
      const t = e.touches[0];
      const now = performance.now();
      tv.add(t.clientX, now);
      const dx = t.clientX - tx.x;
      const dy = t.clientY - tx.y;
      if (!tx.axis && Math.hypot(dx, dy) > 8) {
        tx.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (tx.axis === 'x' && !reducedMotion) {
          held = true;
          vel = 0;
          stage.classList.add('is-dragging');
          // 끌기가 시작된 이 자리부터 손가락과 1:1로(처음 8px만큼 덱이 튀어 따라붙지 않게)
          tx.x = t.clientX;
          tx.f0 = grab();
          tx.k0 = focus;
        }
      }
      if (tx.axis !== 'x' || reducedMotion) return;
      pos = dragPos(t.clientX - tx.x, tx.f0);
      follow(true);
      wake();
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
      const { axis, k0 } = tx;
      const v = tv.get(performance.now());
      tx = null;
      if (axis !== 'x' && !(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy))) {
        if (held) release(0, focus, 0);
        return;
      }
      if (reducedMotion) {
        held = false;
        set(focus - Math.sign(dx));
        return;
      }
      release(dx, k0, v);
    },
    { passive: true }
  );
  stage.addEventListener('touchcancel', () => {
    tx = null;
    if (held) release(0, focus, 0);
  });
  stage.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const k = focus + dir;
    if (!dir || k < 0 || k >= n) return;
    e.preventDefault();
    e.stopPropagation();
    set(k);
  });
  // 마우스로 끌기: 터치처럼 덱이 포인터를 따라 움직인다
  stage.addEventListener('dragstart', (e) => e.preventDefault());
  let md = null;
  const mv = velocity();
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stopPeek();
    md = { x: e.clientX, y: e.clientY, k0: focus, f0: pos, on: false };
    mv.reset(e.clientX, performance.now());
    dragged = false;
  });
  addEventListener('pointermove', (e) => {
    if (!md || e.pointerType !== 'mouse') return;
    const dx = e.clientX - md.x;
    mv.add(e.clientX, performance.now());
    // 가로로 뚜렷이 끌 때만 덱을 잡는다 — 세로 끌기(장면 넘김)가 먼저 시작됐으면 놓아준다
    if (!md.on && (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - md.y) || document.documentElement.classList.contains('is-pulling'))) return;
    if (!md.on) {
      md.on = true;
      held = true;
      vel = 0;
      stage.classList.add('is-dragging');
      // 잡은 자리부터 포인터와 1:1로
      md.x = e.clientX;
      md.f0 = grab();
      md.k0 = focus;
      // 창 밖에서 놓아도 끝을 받는다(끄는 동안만 — 그냥 누르기는 카드 링크로 가게)
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* 붙잡지 못해도 끌기는 된다 */
      }
    }
    if (!reducedMotion) {
      pos = dragPos(e.clientX - md.x, md.f0);
      follow(false);
      wake();
    }
  });
  addEventListener('pointercancel', () => {
    if (!md) return;
    md = null;
    if (held) release(0, focus, 0);
  });
  addEventListener('pointerup', (e) => {
    if (!md) return;
    const { x, on, k0 } = md;
    md = null;
    if (!on) return;
    const dx = e.clientX - x;
    if (Math.abs(dx) < 30 && focus === k0) return release(0, focus, 0);
    dragged = true;
    if (reducedMotion) {
      held = false;
      set(focus - Math.sign(dx));
    } else release(dx, k0, mv.get(performance.now()));
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
      return n;
    },
    get focus() {
      return focus;
    },
    set,
    layout,
    // 넘길 카드가 남았으면 넘기고 true
    step(dir) {
      const k = focus + dir;
      if (k < 0 || k >= n) return false;
      set(k);
      return true;
    },
    // 장면에 들어설 때: 카드가 오른쪽 뒤에서 한 장씩 날아와 제자리에 선다(장면 타임라인의 at초부터)
    intro(tl, at) {
      layout();
      if (reducedMotion) return;
      gsap.killTweensOf(intro);
      intro.t = 0;
      intro.at = 0;
      draw(pos + peek);
      const total = (n - 1) * 0.09 + 0.05 + INTRO;
      tl.fromTo(intro, { t: 0 }, { t: total, duration: total, ease: 'none', onStart: wake, onComplete: () => ((intro.t = -1), wake()) }, at);
      tl.call(land, null, at + 0.5);
    },
    // 끌어 넘길 수 있다는 걸 보여 준다: 덱이 다음 카드 쪽으로 살짝 끌려갔다 제자리로 돌아온다
    peek(amount = 0.34) {
      if (reducedMotion || tx || md || held || n < 2 || !width) return 0;
      stopPeek();
      const dir = focus >= n - 1 ? -1 : 1;
      const p = { v: 0 };
      stage.classList.add('is-dragging');
      peekTl = gsap
        .timeline({ onComplete: () => ((peekTl = null), (peek = 0), stage.classList.remove('is-dragging'), wake()) })
        .to(p, { v: dir * amount, duration: 0.75, ease: 'power2.inOut', onUpdate: () => (peek = p.v) })
        .to(p, { v: 0, duration: 0.9, ease: 'back.out(2.2)', onUpdate: () => (peek = p.v) }, '+=0.12');
      wake();
      return dir;
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

export function createPanels(root, scenes, { onReplay, reducedMotion, onReelFocus, onCard, onBeat }) {
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
    // 소개 · 이력: 한 장면 안의 화면(비트) — 손으로 옮긴 화면만 자동 재생 시계에 알린다
    el.beats = el.querySelector('.beats') ? bindBeats(el, reducedMotion, (d) => el === panels[current] && onBeat?.(d)) : null;
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

  // dir: 넘어가는 방향(다음이면 위로, 이전이면 아래로 빠진다) · from: 손가락에 끌려 와 있던 자리(px)에서 이어서
  function hide(i, dir = 1, from = 0) {
    const el = panels[i];
    if (!el) return;
    el.inert = true;
    gsap.killTweensOf(el);
    if (from) gsap.set(el, { y: from });
    // 흐림 필터는 화면 전체를 매 프레임 다시 그려 저사양에서 무겁다 — 보통 이하 단계에서는 투명도 · 위치만
    const lite = document.documentElement.classList.contains('q-lite');
    gsap.to(el, {
      autoAlpha: 0,
      y: from - (from ? 30 : 18) * dir,
      ...(lite ? {} : { filter: 'blur(8px)' }),
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

  // back: 다음 장면에서 거꾸로 돌아왔다(위에서 내려온다) · first: 덱은 첫 카드부터(휴대폰에서 위아래로 밀어 장면을 넘겼을 때)
  // beat: 이 화면(비트)부터(주소 · 목차에서 연도로 들어온 경우)
  function show(i, delay = 0, back = false, first = false, beat = null) {
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
    set(reveal, { autoAlpha: 0, y: back ? -22 : 22 });
    if (heroChars.length) {
      set(heroChars, { yPercent: 115, rotate: 6 });
      tl.to(heroChars, { yPercent: 0, rotate: 0, duration: 1.3 * D, ease: 'expo.out', stagger: 0.045 * D }, 0.1);
    } else {
      set(titleSpans, { yPercent: 112 });
      if (has(titleSpans)) tl.to(titleSpans, { yPercent: 0, duration: 1.1 * D, ease: 'expo.out', stagger: 0.09 * D }, 0);
    }
    if (has(reveal)) tl.to(reveal, { autoAlpha: 1, y: 0, duration: 0.8 * D, ease: 'power3.out', stagger: 0.055 * D }, heroChars.length ? 0.6 : 0.25);
    tl.add(() => countUp(el), 0.4);
    if (el.beats) {
      // 뒤로 돌아왔다면 마지막 화면부터 — 위로 스크롤하면 화면을 거꾸로 넘긴다.
      // 화면은 휴대폰에서도 위아래로 넘기므로(덱과 달리) 밀어서 돌아와도 마지막 화면부터
      el.beats.reset(beat != null ? el.beats.indexOf(beat) : back ? el.beats.count - 1 : 0);
      el.beats.intro(tl, 0.25);
    }
    if (el.reel) {
      // 넘기는 동안 빈 카드가 보이지 않게 이 장면의 썸네일은 미리 모두 받는다
      el.querySelectorAll('.deck-stage img[loading="lazy"]').forEach((im) => (im.loading = 'eager'));
      // 바로 다음 장면에서 뒤로 돌아왔다면 마지막 카드부터 — 위로 스크롤하면 카드를 거꾸로 넘긴다
      el.reel.set(back && !first && el.reel.paged ? el.reel.count - 1 : 0, { animate: false, entry: true });
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

  // 엔딩 크레딧: 네 비트가 차례로 — 비트마다 가운데로 빠르게 들어와(글자 · 로고가 순서대로 켜지고) 잠깐 머문 뒤 넘어간다.
  // 휠 · 손가락으로 앞뒤로 넘겨 볼 수 있고(손을 떼면 2초 뒤 다시), 방향키 · 크레딧 밖 휠은 한 비트씩
  let creditsCtl = null;
  // 비트마다 머무는 초 · 비트 사이를 넘어가는 초(약 6초에 네 비트)
  const HOLD = { 'cb-lead': 1.05, 'cb-words': 1.1, 'cb-with': 1.3, 'cb-thanks': 1.15 };
  const MOVE = 0.45;
  function runCredits(el, delay) {
    const roll = el.querySelector('.credits-roll');
    const credits = el.querySelector('.credits');
    const card = el.querySelector('.endcard');
    const skip = el.querySelector('#skip-credits');
    const thumb = el.querySelector('.credits-rail i');
    const hint = el.querySelector('.credits-hint');
    const beats = [...roll.querySelectorAll('.cb')];
    gsap.set(card, { autoAlpha: 0 });
    gsap.set([credits, skip, el.querySelector('.credits-rail')].filter(Boolean), { autoAlpha: 1 });
    gsap.set(card.querySelectorAll('.title .line > span'), { yPercent: 112 });
    gsap.set(card.querySelectorAll('[data-r]'), { autoAlpha: 0, y: 22 });
    if (hint) gsap.set(hint, { autoAlpha: 1 });
    beats.forEach((b) => b.classList.remove('is-on'));
    const st = { p: 0 }; // 0: 첫 비트가 아래에서 막 들어올 때 · 1: 마지막 비트가 위로 다 지나갔을 때
    let shown = false;
    let resumeT = 0;
    let active = -1;
    let marks = []; // 비트마다 가운데에 오는 p
    const travel = () => roll.offsetHeight + credits.clientHeight;
    // 비트 한 장 = 크레딧 창 높이(한 번에 하나씩) — 창 크기가 바뀌면 다시 잰다
    const fit = () => {
      if (!credits.clientHeight) return; // 장면이 숨어 있으면 재지 않는다
      roll.style.setProperty('--ch', `${credits.clientHeight}px`);
      const T = travel();
      marks = beats.map((b) => (credits.clientHeight / 2 + b.offsetTop + b.offsetHeight / 2) / T);
    };
    const apply = () => {
      gsap.set(roll, { yPercent: 0, y: credits.clientHeight - st.p * travel() });
      if (thumb) thumb.style.setProperty('--p', st.p.toFixed(4));
      // 가운데에 가까이 온 비트를 켠다(반 칸 안)
      const half = marks.length > 1 ? (marks[1] - marks[0]) / 2 : 0.5;
      let k = -1;
      marks.forEach((m, j) => Math.abs(st.p - m) < half * 0.9 && (k = j));
      if (k !== active) {
        active = k;
        beats.forEach((b, j) => b.classList.toggle('is-on', j === k));
      }
    };
    const showCard = () => {
      if (!creditsTl) return;
      clearTimeout(resumeT);
      shown = true;
      creditsTl.kill();
      creditsTl = gsap.timeline();
      const rail = el.querySelector('.credits-rail');
      creditsTl
        .to([credits, skip, rail, hint].filter(Boolean), { autoAlpha: 0, duration: 0.5 })
        .set(card, { autoAlpha: 1 })
        .to(card.querySelectorAll('.title .line > span'), { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12 })
        .to(card.querySelectorAll('[data-r]'), { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, '-=0.8');
    };
    // 지금 자리에서: 남은 비트마다 들어와 머물고, 마지막 비트 뒤 엔드 카드로
    const flow = (wait = 0) => {
      if (!creditsTl) return;
      creditsTl.kill();
      creditsTl = gsap.timeline({ delay: wait });
      marks.forEach((m, k) => {
        if (m <= st.p + 0.002) return;
        creditsTl.to(st, { p: m, duration: MOVE, ease: 'power3.inOut', onUpdate: apply }).to({}, { duration: HOLD[beats[k].classList[1]] || 1.1 });
      });
      creditsTl.to(st, { p: 1, duration: MOVE * 0.8, ease: 'power2.in', onUpdate: apply }).add(showCard);
    };
    // 손으로 넘기는 동안은 흐름을 멈추고, 손을 떼면 잠시 뒤 다시 흐른다
    const hold = () => {
      if (creditsTl) creditsTl.kill();
      creditsTl = gsap.timeline();
      clearTimeout(resumeT);
      resumeT = setTimeout(() => !shown && flow(), 2200);
      if (hint) gsap.to(hint, { autoAlpha: 0, duration: 0.4 });
    };
    const seek = (p, smooth = false) => {
      hold();
      const to = Math.max(0, Math.min(1, p));
      if (smooth && !reducedMotion) creditsTl.to(st, { p: to, duration: 0.6, ease: 'power3.inOut', onUpdate: apply });
      else {
        st.p = to;
        apply();
      }
      if (to >= 1) {
        clearTimeout(resumeT);
        creditsTl.add(showCard, smooth ? 0.5 : 0);
      }
    };
    // 엔드 카드에서 뒤로: 마지막 비트로 돌아간다
    const reopen = () => {
      shown = false;
      const rail = el.querySelector('.credits-rail');
      gsap.killTweensOf([credits, skip, card, rail]);
      gsap.to(card, { autoAlpha: 0, duration: 0.4 });
      gsap.to([credits, skip, rail].filter(Boolean), { autoAlpha: 1, duration: 0.5, delay: 0.2 });
      st.p = marks[marks.length - 1] ?? 0.9;
      apply();
      hold();
    };
    creditsCtl = {
      el,
      fit: () => credits.clientHeight && (fit(), apply()),
      // 방향키 · PageUp/Down · 크레딧 밖의 휠: 한 비트씩. 처음에서 위로 가면 이전 장면으로(null)
      step(dir) {
        if (!creditsTl) return null;
        if (shown) {
          if (dir > 0) return null;
          reopen();
          return 'credits';
        }
        if (dir < 0 && st.p <= 0.001) return null;
        const to = dir > 0 ? (marks.find((m) => m > st.p + 0.01) ?? 1) : ([...marks].reverse().find((m) => m < st.p - 0.01) ?? 0);
        seek(to, true);
        return 'credits';
      },
      // 크레딧 위의 휠 · 손가락: 픽셀만큼 바로
      nudge(px) {
        if (!creditsTl || shown) return false;
        if (px < 0 && st.p <= 0.001) return false;
        seek(st.p + px / travel());
        return true;
      },
    };
    skip.onclick = showCard;
    fit();
    apply();
    creditsTl = gsap.timeline({ delay: delay * D });
    if (reducedMotion) creditsTl.add(showCard, 0.5);
    else flow(delay * D);
  }
  addEventListener('resize', () => creditsCtl?.fit());

  // 크레딧 위에서의 휠 · 손가락은 장면 넘김 대신 크레딧을 움직인다
  {
    const fin = panels.find((p) => p.dataset.scene === 'finale');
    const area = fin?.querySelector('.credits');
    if (area) {
      area.addEventListener(
        'wheel',
        (e) => {
          if (!creditsCtl || creditsCtl.el !== fin) return;
          const px = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY * (e.deltaMode === 1 ? 32 : 1) : 0;
          if (!px || !creditsCtl.nudge(px)) return;
          e.preventDefault();
          e.stopPropagation();
        },
        { passive: false }
      );
      let ty = null;
      area.addEventListener('touchstart', (e) => (ty = e.touches[0].clientY), { passive: true });
      area.addEventListener(
        'touchmove',
        (e) => {
          if (ty === null || !creditsCtl) return;
          const y = e.touches[0].clientY;
          if (creditsCtl.nudge((ty - y) * 1.4)) ty = y;
        },
        { passive: true }
      );
      // 크레딧을 끌었다면 손을 뗄 때 장면이 넘어가지 않게
      area.addEventListener(
        'touchend',
        (e) => {
          if (ty === null) return;
          ty = null;
          e.stopPropagation();
        },
        { passive: true }
      );
    }
  }

  panels.forEach((el) => el.querySelector('#btn-replay')?.addEventListener('click', onReplay));

  // 장면 넘기기 전에 지금 장면의 프로젝트 릴을 한 장씩 넘긴다 — 넘겼으면 { focus, count }
  function step(dir) {
    const beats = panels[current]?.beats;
    if (beats) return beats.step(dir) ? { beat: beats.index } : null;
    if (creditsCtl && panels[current] === creditsCtl.el) {
      const r = creditsCtl.step(dir);
      if (r) return { credits: true };
    }
    const reel = panels[current]?.reel;
    if (!reel || !reel.paged || !reel.step(dir)) return null;
    return { focus: reel.focus, count: reel.count };
  }
  // 자동 재생: 장면 시간에 맞춰 초점이 다음 카드로 흐른다(뒤로는 돌아가지 않음)
  function autoFocus(progress) {
    const beats = panels[current]?.beats;
    if (beats) {
      const k = Math.min(beats.count - 1, Math.floor(progress * beats.count));
      if (k > beats.index) beats.set(k, { auto: true });
      return;
    }
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
    // 지금 장면의 덱을 살짝 끌어 보인다(끌기 안내) — 움직였으면 방향
    peek: () => panels[current]?.reel?.peek() || 0,
    setLoopCenter,
    // quick: 손으로 끌어 넘겼다(다음 장면을 더 빨리 들인다) · from: 끌려 와 있던 자리 · first: 덱은 첫 카드부터
    go(i, prev, duration, { quick = false, from = 0, first = false, beat = null } = {}) {
      if (prev >= 0) hide(prev, i > prev ? 1 : -1, from);
      current = i;
      // 다음 장면의 릴 썸네일을 미리 받아 카드가 빈 상자로 날아들지 않게
      panels[i + 1]?.querySelectorAll('.deck-stage img[loading="lazy"]').forEach((im) => (im.loading = 'eager'));
      const delay = prev < 0 ? 0.9 : quick ? Math.max(0.35, duration * 0.4) : Math.max(0.5, duration * 0.62);
      show(i, delay, prev === i + 1, first, beat);
    },
    get current() {
      return panels[current];
    },
  };
}
