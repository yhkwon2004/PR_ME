import gsap from 'gsap';
import { projects, byId, CATEGORIES, categoryOf } from '../data/projects.js';
import { profile } from '../content.js';
import { ORGS, WALL, orgsOf } from '../data/orgs.js';
import { AWARDS, awardsOf, bestOf, TIER_KEY } from '../data/awards.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const isExternal = (url) => /^https?:\/\//.test(url) || url.startsWith('mailto:');

function youtubeId(url) {
  try {
    const u = new URL(url);
    const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

// 화면 캡처·문서·도표나 해상도가 낮은 사진은 잘라 쓰지 않고 흐린 배경 위에 전체를 보여 준다
const fitsCover = (im) => (im.kind || 'photo') === 'photo' && (im.w || 0) >= 1200;
function media(im, opts = {}) {
  if (!im) return '';
  if (fitsCover(im) || (opts.allowSmall && (im.kind || 'photo') === 'photo')) return img(im, opts);
  return `<img class="blur-fill" src="${esc(im.thumb)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />${img(im, { ...opts, cls: `${opts.cls || ''} is-contain` })}`;
}

// 이미지가 없는 프로젝트를 위한 활자 표지
function typeCover(p, cls = '') {
  const c = categoryOf(p.category);
  return `<div class="type-cover ${cls}" data-cat="${esc(p.category)}" aria-hidden="true">
    <span class="tc-cat">${esc(c.label)}</span>
    <b>${esc(p.titleEn || p.title)}</b>
    <span class="tc-year">${esc(p.year || '')}</span>
  </div>`;
}

function img(im, { cls = '', eager = false, full = false, sizes = '' } = {}) {
  if (!im) return '';
  const w = im.w || 1600;
  const tw = im.w && im.h ? Math.round(im.w * Math.min(1, 720 / Math.max(im.w, im.h))) : 720;
  const set = `${tw < w ? `${esc(im.thumb)} ${tw}w, ` : ''}${esc(im.src)} ${w}w`;
  return `<img class="${cls}" data-kind="${esc(im.kind || 'photo')}" src="${esc(full ? im.src : im.thumb)}" ${full ? '' : `srcset="${set}" sizes="${sizes || '(max-width: 820px) 100vw, 50vw'}"`} alt="${esc(im.caption)}" width="${im.w || ''}" height="${im.h || ''}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
}

const LAUREL = `<svg class="laurel" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5c-4.2-1.2-7-4.8-7-9 0-1.9.5-3.6 1.3-5.1M12 20.5c4.2-1.2 7-4.8 7-9 0-1.9-.5-3.6-1.3-5.1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5.4 8.6c1.5 0 2.6.9 2.9 2.4-1.5 0-2.6-.9-2.9-2.4zm-.6 3.8c1.5-.3 2.8.4 3.4 1.8-1.5.3-2.8-.4-3.4-1.8zm1.4 3.5c1.4-.5 2.8-.1 3.7 1.1-1.4.5-2.8.1-3.7-1.1zM18.6 8.6c-1.5 0-2.6.9-2.9 2.4 1.5 0 2.6-.9 2.9-2.4zm.6 3.8c-1.5-.3-2.8.4-3.4 1.8 1.5.3 2.8-.4 3.4-1.8zm-1.4 3.5c-1.4-.5-2.8-.1-3.7 1.1 1.4.5 2.8.1 3.7-1.1z" fill="currentColor"/></svg>`;

// 수상 배지: 가장 높은 등급(+ 나머지 수상 수)
function awardBadge(p) {
  const b = bestOf(p);
  if (!b) return '';
  return `<span class="card-award" data-tier="${b.key}">${LAUREL}<b>${esc(b.label)}</b>${b.count > 1 ? `<small>+${b.count - 1}</small>` : ''}</span>`;
}

// 프로젝트 타일 — 사진 위에 글을 얹은 시네마 플레이트(필름 릴 · 아카이브 공통)
// 릴 카드 폭(premium.css의 --card-h × 0.78, 가로 휴대폰 × 1.5)에 맞춘 sizes
const REEL_SIZES = '(max-height: 500px) and (orientation: landscape) 190px, (max-width: 820px) 190px, 250px';
const GRID_SIZES = '(max-width: 599px) 50vw, (max-width: 1180px) 33vw, (min-width: 1600px) 20vw, 25vw';
export function projectCard(p, i, { cls = 'card' } = {}) {
  const c = categoryOf(p.category);
  const label = `${p.title}${p.awards.length ? ` — 수상 ${p.awards.length}건` : ''}`;
  return `<a class="${cls}" href="${p.path}" data-link data-cat="${esc(p.category)}" aria-label="${esc(label)}">
    <figure class="card-media">
      ${p.cover ? media(p.cover, { sizes: cls === 'r-card' ? REEL_SIZES : p.wide ? GRID_SIZES.replace(/(\d+)vw/g, (m, n) => `${n * 2}vw`) : GRID_SIZES, allowSmall: true }) : typeCover(p)}
      <span class="card-shade" aria-hidden="true"></span>
      <span class="card-glare" aria-hidden="true"></span>
      <span class="card-top"><span class="card-no">${pad(i + 1)}</span><span class="card-cat">${esc(c.label)}</span></span>
      ${awardBadge(p)}
      <figcaption class="card-cap">
        ${p.year ? `<span class="card-meta">${esc(p.year)}</span>` : ''}
        <h3 class="card-title">${esc(p.title)}</h3>
        <span class="card-line">${esc(p.oneLiner)}</span>
      </figcaption>
      <span class="card-open" aria-hidden="true">↗</span>
    </figure>
  </a>`;
}

// 기관 표기: 공식 로고(흰색 단색, 면적을 맞춘 높이) 또는 활자
export function orgMark(o, { decorative = false } = {}) {
  if (o.logo) {
    const h = Math.max(16, Math.min(44, Math.sqrt(2400 / o.r)));
    return `<img class="org-logo" src="/media/orgs/${o.logo}.webp" alt="${decorative ? '' : esc(o.name)}" style="--lh:${h.toFixed(1)}" loading="lazy" decoding="async" />`;
  }
  return `<span class="org-word" role="img" aria-label="${esc(o.name)}"><b>${esc(o.mark)}</b><small>${esc(o.en)}</small></span>`;
}

function withWall() {
  return `<section class="with-wall reveal" aria-label="함께한 기관">
    <p class="pg-kicker">WITH — 학교 · 협업 기관 · 상을 준 곳</p>
    <ul class="wall">${WALL.map((k) => ORGS[k])
      .map((o) => `<li title="${esc(o.name)}">${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${orgMark(o)}</a>` : orgMark(o)}</li>`)
      .join('')}</ul>
    <p class="wall-note">학업 · 수상 · 협업 이력을 밝히는 표기이며 후원이나 보증을 뜻하지 않습니다.</p>
  </section>`;
}

const certCaption = (a) => [`${a.grade} — ${a.contest}`, a.issuer, a.date.replace(/-/g, '.')].filter(Boolean).join(' · ');
// 수여자 · 상 이름 — 상 이름이 수여자 직함을 되풀이하면 빼고, 줄이 '·'로 시작하지 않게 조각마다 묶는다
const issuerLine = (a) => {
  const who = (a.issuer || '').split(' · ').filter(Boolean);
  const norm = (x) => x.replace(/\s/g, '');
  const prize = (a.prize || '').split(' · ').filter((x) => x && !who.some((w) => norm(w).endsWith(norm(x).replace(/(상|표창)$/, ''))));
  const parts = [...who, ...prize];
  // 구분점은 앞 조각 끝에 붙여, 줄이 바뀌어도 새 줄이 '·'로 시작하지 않게
  return parts.map((x, k) => `<span class="nw">${esc(x)}${k < parts.length - 1 ? ' ·' : ''}</span>`).join(' ');
};
// 상장(없으면 시상 사진)을 라이트박스 목록으로
function awardMedia(list) {
  const out = [];
  list.forEach((a) => {
    a.at = out.length;
    a.certs.forEach((c) => out.push({ type: 'image', src: c.src, caption: certCaption(a) }));
    if (!a.certs.length && a.photo) out.push({ type: 'image', src: a.photo.src, caption: certCaption(a) });
  });
  return out;
}

// 상장 한 장: 종이처럼 — 여러 장이면 뒤에 겹쳐 보인다
function certSheet(a, { sizes = '220px' } = {}) {
  if (a.certs.length)
    return `<span class="sheet${a.certs.length > 1 ? ' is-stack' : ''}"><img src="${esc(a.certs[0].thumb)}" srcset="${esc(a.certs[0].sm)} 240w, ${esc(a.certs[0].thumb)} 480w, ${esc(a.certs[0].md)} 720w, ${esc(a.certs[0].src)} 1132w" sizes="${sizes}" alt="${esc(a.contest)} 상장" width="1132" height="1600" loading="lazy" decoding="async" /></span>`;
  if (a.photo) return `<span class="sheet is-photo"><img class="ph-bg" src="${esc(a.photo.thumb)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />${img(a.photo, { sizes })}</span>`;
  return `<span class="sheet is-blank" aria-hidden="true">${LAUREL}<b>${esc(a.grade)}</b></span>`;
}

// 수상 타일(아카이브): 상장 + 이어진 프로젝트
function awardTile(a) {
  const p = a.project;
  return `<li class="aw-cell" data-g="${TIER_KEY[a.tier]}"${p ? ' data-p' : ''}>
    <article class="aw-card" data-tier="${TIER_KEY[a.tier]}">
      ${a.certs.length || a.photo ? `<button type="button" class="aw-sheet" data-cert="${a.at}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기">${certSheet(a, { sizes: '(max-width: 599px) 44vw, 240px' })}<span class="card-glare" aria-hidden="true"></span></button>` : `<div class="aw-sheet">${certSheet(a)}</div>`}
      <div class="aw-info">
        <p class="aw-top"><span class="aw-grade">${LAUREL}${esc(a.grade)}</span><time datetime="${esc(a.date)}">${esc(a.date.replace(/-/g, '.'))}</time></p>
        <h3 class="aw-contest">${esc(a.contest)}</h3>
        ${a.issuer || a.prize ? `<p class="aw-issuer">${issuerLine(a)}</p>` : ''}
        ${
          p
            ? `<a class="aw-proj" href="${p.path}" data-link data-cat="${esc(p.category)}">${p.cover ? `<span class="aw-proj-img">${img(p.cover, { sizes: '64px' })}</span>` : `<span class="aw-proj-img is-type" aria-hidden="true">${esc(categoryOf(p.category).label.slice(0, 2).toUpperCase())}</span>`}<span class="aw-proj-t"><small>PROJECT</small><b>${esc(p.title).replace(/ · /g, '&nbsp;· ')}</b></span><i aria-hidden="true">↗</i></a>`
            : ''
        }
      </div>
    </article>
  </li>`;
}

// 필름 '기록' 장면의 수상 카드: 프로젝트 사진 위에 상장
export function awardCard(a) {
  const p = a.project;
  const bg = a.certs.length ? p.cover : a.photo || p.cover;
  return `<a class="r-card a-card" href="${p.path}" data-link data-cat="${esc(p.category)}" data-tier="${TIER_KEY[a.tier]}" aria-label="${esc(`${a.grade} — ${a.contest} · ${p.title}`)}">
    <figure class="card-media">
      ${bg ? img(bg, { cls: 'a-bg', sizes: REEL_SIZES }) : typeCover(p)}
      <span class="card-shade" aria-hidden="true"></span>
      ${a.certs.length ? certSheet(a, { sizes: '90px' }) : ''}
      <span class="card-glare" aria-hidden="true"></span>
      <span class="card-award" data-tier="${TIER_KEY[a.tier]}">${LAUREL}<b>${esc(a.grade)}</b></span>
      <figcaption class="card-cap">
        <span class="card-meta">${esc(a.date.slice(0, 4))}${a.issuer ? ` · ${esc(a.issuer)}` : ''}</span>
        <h3 class="card-title">${esc(a.contest)}</h3>
        <span class="a-proj">${esc(p.title)} <i aria-hidden="true">→</i></span>
      </figcaption>
    </figure>
  </a>`;
}

const tabs = (on) => `<nav class="pg-tabs" aria-label="보기 전환">
    <a href="/works" data-link class="${on === 'works' ? 'is-on' : ''}"${on === 'works' ? ' aria-current="page"' : ''}>Works<sup>${projects.length}</sup></a>
    <a href="/awards" data-link class="${on === 'awards' ? 'is-on' : ''}"${on === 'awards' ? ' aria-current="page"' : ''}>Awards<sup>${AWARDS.length}</sup></a>
  </nav>`;

const TIER_OF_KEY = Object.fromEntries(TIER_KEY.map((k, t) => [k, t]).filter(([k]) => k));

function awardsPage() {
  const media = awardMedia(AWARDS);
  const years = [...new Set(AWARDS.map((a) => a.year))];
  const count = (t) => AWARDS.filter((a) => a.tier === t).length;
  const grand = AWARDS.filter((a) => a.tier === 1);
  // 등급별 수치가 곧 보기 필터 — 누르면 그 등급만 남는다
  const sum = (g, n, label) => `<button type="button" data-g="${g}"${g in TIER_OF_KEY ? ` data-tier="${g}"` : ''} aria-pressed="${g === 'all'}"><b>${n}</b><span>${label}</span></button>`;
  return {
    media,
    html: `<div class="pg pg-awards">
    ${bar({ href: '/', label: 'FILM' })}
    <section class="works-head aw-head">
      <p class="pg-kicker">AWARD ARCHIVE — 상장과 프로젝트</p>
      <h1 class="works-title">Awards<sup>${pad(AWARDS.length)}</sup></h1>
      ${tabs('awards')}
      <div class="aw-sum" role="group" aria-label="등급별로 보기">
        ${sum('all', AWARDS.length, '전체')}
        ${[1, 2, 3, 4, 5].map((t) => sum(TIER_KEY[t], count(t), ['', '대상', '최우수상', '우수상', '장려상', '그 밖의 수상'][t])).join('')}
        ${sum('project', AWARDS.filter((a) => a.project).length, '프로젝트와 연결')}
      </div>
    </section>
    ${
      grand.length
        ? `<section class="aw-feat" aria-label="대상 수상">
      <h2 class="aw-feat-h"><span class="aw-feat-k">GRAND PRIZE</span><b>대상</b><sup>${pad(grand.length)}</sup></h2>
      <ul class="aw-grid aw-feat-row">${grand.map(awardTile).join('')}</ul>
    </section>`
        : ''
    }
    ${years
      .map((y) => {
        const list = AWARDS.filter((a) => a.year === y);
        return `<section class="aw-year" data-year="${y}" aria-label="${y}년 수상"><h2 class="aw-y"><span>${y}</span><sup>${pad(list.length)}</sup></h2><ul class="aw-grid">${list.map(awardTile).join('')}</ul></section>`;
      })
      .join('')}
    ${withWall()}
    ${footer()}
  </div>`,
  };
}

function bar(back) {
  return `<header class="pg-bar">
    <a class="pg-back" href="${back.href}" data-link>← ${esc(back.label)}</a>
    <a class="pg-brand" href="/" data-link aria-label="필름으로">KWON</a>
    <button type="button" class="pg-close" data-close aria-label="닫기"><i></i><i></i></button>
  </header>`;
}

// cat: 'all' 또는 'robotics,iot'처럼 쉼표로 이은 분야 목록
const catList = (cat) => (cat === 'all' ? null : cat.split(','));

function worksPage(cat) {
  const on = catList(cat);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, projects.filter((p) => p.category === c.id).length]));
  return `<div class="pg pg-works">
    ${bar({ href: '/', label: 'FILM' })}
    <section class="works-head">
      <p class="pg-kicker">PROJECT ARCHIVE — 권용현이 만든 것들</p>
      <h1 class="works-title">Works<sup>${pad(projects.length)}</sup></h1>
      ${tabs('works')}
      <nav class="chips" aria-label="분야">
        <button type="button" data-cat="all" class="${cat === 'all' ? 'is-on' : ''}">All<sup>${projects.length}</sup></button>
        ${CATEGORIES.filter((c) => counts[c.id])
          .map((c) => `<button type="button" data-cat="${c.id}" class="${on?.includes(c.id) ? 'is-on' : ''}">${esc(c.label)}<sup>${counts[c.id]}</sup></button>`)
          .join('')}
      </nav>
    </section>
    <ul class="works-grid">
      ${projects
        .map(
          (p, i) => `<li class="w-item${on && !on.includes(p.category) ? ' is-out' : ''}" data-cat="${esc(p.category)}"${p.wide ? ' data-wide' : ''}>
            ${projectCard(p, i, { cls: 'w-card' })}
          </li>`
        )
        .join('')}
    </ul>
    ${withWall()}
    ${footer()}
  </div>`;
}

// 넓은 카드는 줄 안에 자리가 있을 때만 두 칸을 쓴다 — 보이는 순서와 번호가 항상 일치
function layoutGrid(grid) {
  const cols = parseInt(getComputedStyle(grid).getPropertyValue('--cols'), 10) || 4;
  const items = [...grid.children].filter((li) => !li.classList.contains('is-out'));
  const narrow = new Set();
  const pass = () => {
    let col = 0;
    const wides = [];
    items.forEach((li, n) => {
      const span = li.hasAttribute('data-wide') && !narrow.has(li) && col + 2 <= cols ? 2 : 1;
      li.classList.toggle('is-wide', span === 2);
      if (span === 2) wides.push(li);
      col = (col + span) % cols;
      const no = li.querySelector('.card-no');
      if (no) no.textContent = pad(n + 1);
    });
    return { col, wides };
  };
  // 마지막 줄에 카드 한 장만 남으면 뒤쪽의 넓은 카드를 한 칸으로 줄여 다시 배치
  for (let guard = 0; guard < 8; guard++) {
    const { col, wides } = pass();
    if (cols < 3 || col !== 1 || !wides.length) break;
    narrow.add(wides[wides.length - 1]);
  }
  return cols;
}

function footer() {
  return `<footer class="pg-foot">
    <p>${esc(profile.name)} · ${esc(profile.en)} — ${esc(profile.role)}</p>
    <ul>${profile.links.map((l) => `<li><a href="${esc(l.url)}" ${l.url.startsWith('mailto') ? '' : 'target="_blank" rel="noopener"'}>${esc(l.label)}</a></li>`).join('')}</ul>
  </footer>`;
}

// 상세에서 쓰는 사진 목록 — 수상 칸에 상장이 있으면 프로젝트 사진 속 같은 상장 스캔은 뺀다(스토리 · 갤러리 · 라이트박스 공통)
const isCertScan = (im) => im.kind === 'document' && /상장|증명서/.test(im.caption);
function detailImages(p) {
  return awardsOf(p.id).some((a) => a.certs.length) ? p.images.filter((im) => !isCertScan(im)) : p.images;
}

function detailPage(p) {
  const i = projects.indexOf(p);
  const next = projects[(i + 1) % projects.length];
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const c = categoryOf(p.category);
  const awards = awardsOf(p.id);
  const certMedia = awardMedia(awards);
  const orgs = orgsOf(p.id);
  const facts = [
    ['ROLE', p.role.join(' · ')],
    ['TEAM', p.team],
    ['PERIOD', p.period || p.year],
    ['TOOLS', p.tools.join(' · ')],
    ['AWARD', awards.length ? '' : p.awards.join(' / ')],
  ].filter(([, v]) => v);
  const gallery = detailImages(p);
  // 히어로 사진은 스토리에서 다시 쓰지 않고, 갤러리에는 스토리에 없던 사진만 — 같은 사진이 반복되지 않게
  const coverFile = p.cover?.file;
  const story = p.story.map((s) =>
    s.img && ((s.img.file === coverFile && p.story.length > 1) || !gallery.includes(s.img)) ? { ...s, img: null } : s
  );
  const storyImgs = new Set(story.map((s) => s.img?.file).filter(Boolean));
  const rest = gallery.map((im, k) => ({ im, k })).filter(({ im }) => !storyImgs.has(im.file) && im.file !== coverFile);
  const showGallery = rest.length > 0;
  return `<article class="pg pg-detail" data-cat="${esc(p.category)}">
    ${bar({ href: '/works', label: 'WORKS' })}
    <section class="d-hero${p.cover && p.cover.ratio >= 0.9 ? ' is-land' : ''}${p.cover ? '' : ' is-type'}" style="--ar:${(p.cover?.ratio || 1).toFixed(3)}">
      <div class="d-hero-media">${p.cover ? media(p.cover, { eager: true, full: true }) : typeCover(p, 'is-hero')}</div>
      <div class="d-hero-text">
        <p class="d-cat"><span>${esc(c.label)}</span>${p.year ? `<span>${esc(p.year)}</span>` : ''}<span>${pad(i + 1)} / ${pad(projects.length)}</span></p>
        <h1 class="d-title">${esc(p.title)}</h1>
        ${p.titleEn && p.cover ? `<p class="d-en">${esc(p.titleEn)}</p>` : ''}
        ${p.cover ? `<p class="d-one">${esc(p.oneLiner)}</p>` : ''}
      </div>
      <span class="d-scroll" aria-hidden="true">SCROLL</span>
    </section>

    <section class="d-intro reveal">
      <p class="d-summary">${esc(p.summary)}</p>
      ${p.metrics.length ? `<dl class="d-metrics">${p.metrics.map((m) => `<div><dd>${esc(m.value)}</dd><dt>${esc(m.label)}</dt></div>`).join('')}</dl>` : ''}
      ${facts.length ? `<dl class="d-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${
        orgs.length
          ? `<div class="d-with"><p class="d-with-k">WITH</p><ul>${orgs
              .map((o) => `<li${o.logo ? '' : ' class="is-text"'}>${o.logo ? orgMark(o, { decorative: true }) : ''}<span class="d-with-t"><b>${esc(o.name)}</b><small>${esc(o.rel)}</small></span></li>`)
              .join('')}</ul></div>`
          : ''
      }
    </section>

    ${
      awards.length
        ? `<section class="d-awards reveal" data-media='${esc(JSON.stringify(certMedia))}'><h2 class="d-h">AWARDS<sup>${awards.length}</sup></h2><ul class="aw-row">${awards
            .map(
              (a) => `<li class="aw-item" data-tier="${TIER_KEY[a.tier]}">
                ${
                  a.certs.length || a.photo
                    ? `<button type="button" class="aw-sheet" data-cert="${a.at}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기">${
                        // 시상 사진이 이미 위의 대표 사진이면 월계관 표지로 — 같은 사진을 두 번 크게 보이지 않게
                        !a.certs.length && a.photo.file === coverFile ? certSheet({ ...a, photo: null }) : certSheet(a, { sizes: '(max-width: 599px) 44vw, 240px' })
                      }</button>`
                    : `<div class="aw-sheet">${certSheet(a)}</div>`
                }
                <p class="aw-top"><span class="aw-grade">${LAUREL}${esc(a.grade)}</span><time datetime="${esc(a.date)}">${esc(a.date.replace(/-/g, '.'))}</time></p>
                <h3 class="aw-contest">${esc(a.contest)}</h3>
                ${a.issuer || a.prize ? `<p class="aw-issuer">${issuerLine(a)}</p>` : ''}
              </li>`
            )
            .join('')}</ul></section>`
        : ''
    }

    ${
      story.length
        ? `<section class="d-story">${story
            .map(
              (s, k) => `<div class="st-row${s.img ? '' : ' no-img'} reveal">
                ${s.img ? `<button type="button" class="st-media" data-gallery="${gallery.indexOf(s.img)}" aria-label="${esc(s.img.caption)} 크게 보기">${img(s.img, { sizes: `(max-width: 820px) 100vw, ${Math.min(1120, s.img.w || 1120)}px` })}<span class="st-cap">${esc(s.img.caption)}</span></button>` : ''}
                <div class="st-text"><span class="st-label">${pad(k + 1)} — ${esc(s.label)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>
              </div>`
            )
            .join('')}</section>`
        : ''
    }

    ${
      p.videos.length
        ? `<section class="d-videos reveal"><h2 class="d-h">FILM<sup>${p.videos.length}</sup></h2>${p.videos
            .map((v) => {
              const yt = youtubeId(v.url);
              if (yt)
                return `<figure class="vid"><button type="button" class="yt" data-yt="${yt}" aria-label="${esc(v.caption || '영상')} 재생"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy" /><span class="yt-play" aria-hidden="true">▶</span></button><figcaption>${esc(v.caption)}</figcaption></figure>`;
              return `<figure class="vid"><video src="${esc(v.url)}" ${p.cover ? `poster="${esc(p.cover.src)}"` : ''} controls muted playsinline preload="metadata"></video><figcaption>${esc(v.caption)}</figcaption></figure>`;
            })
            .join('')}</section>`
        : ''
    }

    ${
      showGallery
        ? `<section class="d-gallery reveal"><h2 class="d-h">GALLERY<sup>${rest.length}</sup></h2>
          <div class="gal" data-n="${Math.min(rest.length, 3)}">${rest
            .map(
              ({ im, k }) => `<button type="button" class="gal-item" data-gallery="${k}" style="--ar:${Math.min(1.8, Math.max(0.6, im.ratio)).toFixed(3)}" aria-label="${esc(im.caption)} 크게 보기">${img(im, { sizes: '(max-width: 820px) 50vw, 25vw' })}<span class="gal-cap">${esc(im.caption)}</span></button>`
            )
            .join('')}</div></section>`
        : ''
    }

    ${
      p.links.length
        ? `<section class="d-links reveal"><h2 class="d-h">SOURCE</h2><ul>${p.links
            .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><i aria-hidden="true">↗</i></a></li>`)
            .join('')}</ul></section>`
        : ''
    }

    <nav class="d-next" aria-label="다른 프로젝트">
      <a class="d-prev-link" href="${prev.path}" data-link>← ${esc(prev.title)}</a>
      <a class="d-next-card" href="${next.path}" data-link>
        <div class="d-next-media">${next.cover ? media(next.cover, { sizes: '100vw' }) : typeCover(next)}</div>
        <span class="d-next-k">NEXT PROJECT — ${esc(categoryOf(next.category).label)}</span>
        <b class="d-next-t">${esc(next.title)}</b>
      </a>
    </nav>
    ${footer()}
  </article>`;
}

export function createSite({ lightbox, reducedMotion, onOpen, onClose }) {
  const page = document.getElementById('page');
  const curtain = document.getElementById('curtain');
  const curtainLabel = curtain.querySelector('.curtain-label');
  let current = null; // {name, id, cat}
  let filmEntered = false;
  let busy = false;
  let observer = null;
  let gridCols = 0;
  let backPending = false; // history.back()을 보냈고 popstate를 기다리는 중
  let pendingPop = false; // 커튼이 도는 동안 들어온 popstate
  let filmOpener = null; // 필름에서 페이지를 연 요소(닫으면 포커스를 돌려준다)

  // 히어로 글 높이만큼 위쪽 사진의 자리를 비운다(제목이 두 줄이 되어도 겹치지 않게)
  const fitHero = () => {
    const hero = page.querySelector('.d-hero');
    const text = page.querySelector('.d-hero-text');
    if (hero && text) hero.style.setProperty('--ht', `${text.offsetHeight}px`);
  };
  addEventListener('resize', () => {
    fitHero();
    const grid = page.querySelector('.works-grid');
    if (!grid) return;
    const cols = parseInt(getComputedStyle(grid).getPropertyValue('--cols'), 10);
    if (cols !== gridCols) gridCols = layoutGrid(grid);
  });

  const parse = () => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path.toLowerCase() === '/awards') return { name: 'awards' };
    const m = path.match(/^\/works(?:\/([\w-]+))?$/);
    if (!m) return { name: 'film' };
    if (m[1]) {
      const id = m[1].toLowerCase();
      return byId(id) ? { name: 'detail', id } : { name: 'works', cat: 'all', missing: true };
    }
    const cat = new URLSearchParams(location.search).get('c');
    const valid = (cat || '').split(',').filter((c) => CATEGORIES.some((x) => x.id === c));
    return { name: 'works', cat: valid.length ? valid.join(',') : 'all' };
  };

  function sweep(label, between) {
    if (reducedMotion) {
      between();
      return Promise.resolve();
    }
    busy = true;
    curtainLabel.textContent = label || '';
    return new Promise((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            busy = false;
            resolve();
            // 전환 중에 뒤로/앞으로 가기를 눌렀다면 끝난 뒤 현재 주소로 맞춘다
            if (pendingPop) {
              pendingPop = false;
              apply(parse());
            }
          },
        })
        .set(curtain, { visibility: 'visible', yPercent: 100 })
        .to(curtain, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' })
        .fromTo(curtainLabel, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.15')
        .add(between)
        .to(curtainLabel, { autoAlpha: 0, duration: 0.2 }, '+=0.12')
        .to(curtain, { yPercent: -100, duration: 0.6, ease: 'power3.inOut' })
        .set(curtain, { visibility: 'hidden' });
    });
  }

  let pageMedia = [];
  function mount(route) {
    pageMedia = [];
    if (route.name === 'works') page.innerHTML = worksPage(route.cat);
    else if (route.name === 'awards') {
      const a = awardsPage();
      pageMedia = a.media;
      page.innerHTML = a.html;
    } else page.innerHTML = detailPage(byId(route.id));
    page.hidden = false;
    page.scrollTop = 0;
    document.body.classList.add('page-open');
    bind(route);
    const p = route.name === 'detail' ? byId(route.id) : null;
    document.title = p ? `${p.title} — 권용현 Physical AI Portfolio` : `${route.name === 'awards' ? 'Awards' : 'Works'} — 권용현 Physical AI Portfolio`;
    page.focus({ preventScroll: true });
  }

  function unmount() {
    page.hidden = true;
    page.innerHTML = '';
    observer?.disconnect();
    document.body.classList.remove('page-open');
    document.title = '권용현 — Physical AI Portfolio';
  }

  function bind(route) {
    // 이미지 로드 페이드
    page.querySelectorAll('img').forEach((im) => {
      if (im.complete) im.classList.add('is-loaded');
      else im.addEventListener('load', () => im.classList.add('is-loaded'), { once: true });
    });
    // 스크롤 등장
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            observer.unobserve(e.target);
          }
        }),
      { root: page, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    page.querySelectorAll('.reveal, .w-item, .aw-cell').forEach((el) => observer.observe(el));
    // 상장 크게 보기(수상 아카이브 · 상세의 수상 칸)
    const certs = route.name === 'awards' ? pageMedia : JSON.parse(page.querySelector('.d-awards')?.dataset.media || '[]');
    page.querySelectorAll('[data-cert]').forEach((b) => b.addEventListener('click', () => lightbox.show({ media: certs }, +b.dataset.cert, b)));

    if (route.name === 'awards') {
      const sum = page.querySelector('.aw-sum');
      sum.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-g]');
        if (!b) return;
        const g = b.getAttribute('aria-pressed') === 'true' && b.dataset.g !== 'all' ? 'all' : b.dataset.g;
        sum.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.g === g)));
        sum.classList.toggle('is-filtered', g !== 'all');
        const keep = (li) => g === 'all' || (g === 'project' ? li.hasAttribute('data-p') : li.dataset.g === g);
        const shown = [];
        page.querySelectorAll('.aw-year').forEach((sec) => {
          const cells = [...sec.querySelectorAll('.aw-cell')];
          cells.forEach((li) => li.classList.toggle('is-out', !keep(li)));
          const vis = cells.filter((li) => !li.classList.contains('is-out'));
          sec.hidden = !vis.length;
          sec.querySelector('.aw-y sup').textContent = pad(vis.length);
          shown.push(...vis);
        });
        // 대상 띠는 전체 보기에서만
        const feat = page.querySelector('.aw-feat');
        if (feat) feat.hidden = g !== 'all';
        shown.forEach((li) => li.classList.add('is-in'));
        if (!reducedMotion) gsap.fromTo(shown.slice(0, 12), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out', clearProps: 'all' });
      });
      gsap.fromTo(page.querySelectorAll('.works-title, .pg-tabs a, .aw-sum > button'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'expo.out', delay: 0.2 });
    } else if (route.name === 'works') {
      const grid = page.querySelector('.works-grid');
      gridCols = layoutGrid(grid);
      page.querySelector('.chips').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-cat]');
        if (!b) return;
        const cat = b.dataset.cat;
        page.querySelectorAll('.chips button').forEach((x) => x.classList.toggle('is-on', x === b));
        const items = [...page.querySelectorAll('.w-item')];
        items.forEach((li) => li.classList.toggle('is-out', cat !== 'all' && li.dataset.cat !== cat));
        gridCols = layoutGrid(grid);
        history.replaceState(history.state, '', cat === 'all' ? '/works' : `/works?c=${cat}`);
        gsap.fromTo(items.filter((li) => !li.classList.contains('is-out')), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.03, ease: 'power3.out' });
      });
      gsap.fromTo(page.querySelectorAll('.works-title, .pg-tabs a, .chips button'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'expo.out', delay: 0.2 });
    } else {
      const p = byId(route.id);
      const media = detailImages(p).map((im) => ({ type: 'image', src: im.src, caption: im.caption }));
      page.querySelectorAll('[data-gallery]').forEach((b) =>
        b.addEventListener('click', () => lightbox.show({ media }, +b.dataset.gallery, b))
      );
      page.querySelectorAll('[data-yt]').forEach((b) =>
        b.addEventListener('click', () => {
          b.outerHTML = `<iframe class="yt-frame" src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
        })
      );
      const heroMedia = page.querySelectorAll('.d-hero-media > *');
      if (heroMedia.length && !reducedMotion) gsap.fromTo(heroMedia, { scale: 1.12 }, { scale: 1, duration: 2.2, ease: 'expo.out' });
      fitHero();
      document.fonts?.ready.then(fitHero);
      const heroText = page.querySelector('.d-hero-text');
      if (heroText && 'ResizeObserver' in window) new ResizeObserver(fitHero).observe(heroText);
      gsap.fromTo(page.querySelectorAll('.d-hero-text > *'), { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.25 });
    }
    page.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  }

  async function apply(route, { animate = true } = {}) {
    if (lightbox.open) lightbox.close();
    // 없는 프로젝트 주소는 아카이브 주소로 바로잡는다
    if (route.missing) history.replaceState(history.state, '', '/works');
    if (current && route.name === current.name && route.id === current.id && route.cat === current.cat) return;
    const prev = current;
    current = route.name === 'film' ? null : route;
    if (route.name === 'film') {
      if (!prev) return onClose?.();
      const back = () => {
        unmount();
        onClose?.();
        if (filmOpener?.isConnected) filmOpener.focus({ preventScroll: true });
        filmOpener = null;
      };
      if (animate) await sweep('', back);
      else back();
      return;
    }
    const label = route.name === 'detail' ? byId(route.id).title : route.name === 'awards' ? 'AWARDS' : 'WORKS';
    const doMount = () => {
      onOpen?.(route);
      mount(route);
    };
    if (animate) await sweep(label, doMount);
    else doMount();
  }

  function navigate(href, { replace = false } = {}) {
    if (busy) return;
    const url = new URL(href, location.origin);
    if (url.pathname + url.search === location.pathname + location.search) return;
    // depth: 필름에서 몇 단계 들어왔는지(닫기 버튼이 필름으로 바로 돌아가도록)
    const depth = url.pathname === '/' ? 0 : current ? (history.state?.app ? history.state.depth : 1) + 1 : 1;
    // fromFilm: 바로 앞 기록이 필름일 때만 닫기에서 history.back()을 쓴다
    const fromFilm = !current && url.pathname !== '/';
    if (fromFilm) filmOpener = document.activeElement;
    const state = { app: true, depth, fromFilm };
    if (replace) history.replaceState(state, '', url.pathname + url.search);
    else history.pushState(state, '', url.pathname + url.search);
    apply(parse());
  }

  function close() {
    if (busy || backPending) return; // 두 번 눌러 포트폴리오 밖으로 나가지 않게
    // 필름에서 한 단계 들어왔다면 뒤로 가기, 아니면 필름으로 새로 이동
    if (filmEntered && history.state?.fromFilm) {
      backPending = true;
      setTimeout(() => (backPending = false), 1500);
      history.back();
    } else navigate('/');
  }

  // 히어로 패럴랙스(리스너는 하나만)
  page.addEventListener(
    'scroll',
    () => {
      const media0 = page.querySelector('.d-hero-media');
      const y = page.scrollTop;
      const stacked = innerWidth <= 820 && media0?.parentElement.classList.contains('is-land');
      if (media0 && !reducedMotion && !stacked && y < innerHeight * 1.2) media0.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
    },
    { passive: true }
  );

  // 내부 링크 가로채기
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (!href || isExternal(href)) return;
    e.preventDefault();
    navigate(href);
  });
  addEventListener('popstate', () => {
    backPending = false;
    if (busy) {
      pendingPop = true;
      return;
    }
    apply(parse());
  });

  return {
    initial: parse(),
    start(route) {
      if (route.name === 'film') return;
      // 바로 들어온 페이지도 깊이 1로 기록해 두면 그 안에서 이동한 뒤 닫기가 필름으로 간다
      history.replaceState({ app: true, depth: 1, fromFilm: false }, '', location.pathname + location.search);
      apply(route, { animate: false });
    },
    markFilm() {
      filmEntered = true;
    },
    navigate,
    close,
    get open() {
      return !!current;
    },
    get busy() {
      return busy;
    },
    key(e) {
      if (!current) return busy; // 닫히는 커튼 동안에는 필름 단축키를 막는다
      if (e.key === 'Escape') {
        close();
        return true;
      }
      return true; // 페이지가 열려 있으면 필름 단축키를 막는다
    },
  };
}
