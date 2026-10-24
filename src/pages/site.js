import gsap from 'gsap';
import { projects, byId, CATEGORIES, categoryOf, FEATURED, ALIAS } from '../data/projects.js';
import { profile, scenes } from '../content.js';
import { ORGS, WALL, ORG_INDEX, orgsOf, awardOrgs } from '../data/orgs.js';
import { AWARDS, awardsOf, bestOf, TIER_KEY, TIER_LABEL } from '../data/awards.js';
import { HISTORY, HISTORY_YEARS, historyItem } from '../data/history.js';
import { PRESS, pressOf } from '../data/press.js';
import { DOMAIN_SKILLS, SKILLS, CERTS, SKILL_COUNT } from '../data/skills.js';
import { STAGES, VALUES, PRELUDE } from '../data/growth.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const isExternal = (url) => /^https?:\/\//.test(url) || url.startsWith('mailto:');

// 한 줄 알림(복사 · 공유 결과) — 화면 아래 가운데에 잠깐
let flashEl = null;
let flashT = 0;
function flash(text) {
  if (!flashEl) {
    flashEl = document.createElement('p');
    flashEl.className = 'pg-flash';
    flashEl.setAttribute('role', 'status');
    document.body.appendChild(flashEl);
  }
  flashEl.textContent = text;
  flashEl.classList.add('is-on');
  clearTimeout(flashT);
  flashT = setTimeout(() => flashEl.classList.remove('is-on'), 2400);
}
async function copyText(v) {
  try {
    await navigator.clipboard.writeText(v);
    return true;
  } catch {
    // 권한이 없거나 보안 연결이 아니면 예전 방식으로
  }
  const ta = document.createElement('textarea');
  ta.value = v;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
// 링크 공유: 휴대폰은 기기의 공유 창(카카오톡 · 메시지 등), 그 밖에는 주소를 복사한다
async function shareLink({ title, text, url }) {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  flash((await copyText(url)) ? '링크를 복사했어요' : `복사하지 못했어요 — ${url}`);
}

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
  return `<span class="card-award" data-tier="${b.key}">${LAUREL}<b>${esc(b.label)}</b>${b.count > 1 ? `<small>외 ${b.count - 1}</small>` : ''}</span>`;
}

// 프로젝트 타일 — 사진 위에 글을 얹은 시네마 플레이트(필름 릴 · 아카이브 공통)
// 릴 카드 폭(premium.css의 --card-h × 0.78, 가로 휴대폰 × 1.5)에 맞춘 sizes
const REEL_SIZES = '(max-height: 500px) and (orientation: landscape) 190px, (max-width: 820px) 210px, 290px';
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

// 기관 표기: 공식 로고(흰색 단색, 면적을 맞춘 높이) 또는 활자.
// 정부 상징처럼 여러 기관이 함께 쓰는 상징은 기관 이름을 곁에 적는다(lockup)
export function orgMark(o, { decorative = false } = {}) {
  if (o.logo) {
    const h = Math.max(16, Math.min(44, Math.sqrt(2400 / o.r)));
    const im = `<img class="org-logo" src="/media/orgs/${o.logo}.webp" alt="${decorative || o.lockup ? '' : esc(o.name)}" style="--lh:${h.toFixed(1)}" loading="lazy" decoding="async" />`;
    // 이름이 곁에 따로 적히는 자리(decorative)에서는 상징만
    return o.lockup && !decorative ? `<span class="org-lockup" role="img" aria-label="${esc(o.name)}">${im}<b>${esc(o.name)}</b></span>` : im;
  }
  return `<span class="org-word"${decorative ? ' aria-hidden="true"' : ` role="img" aria-label="${esc(o.name)}"`}><b>${esc(o.mark)}</b><small>${esc(o.en)}</small></span>`;
}

// 기관 × 프로젝트: 기관마다 로고 아래에 함께한 프로젝트와 받은 상 수를 붙인다
function withWall() {
  const tile = (k) => {
    const o = ORGS[k];
    const { projects: list, awards } = ORG_INDEX[k];
    const seen = new Set();
    const chips = list
      .filter(({ id }) => byId(id) && !seen.has(id) && seen.add(id))
      .map(({ id, rel }) => {
        const p = byId(id);
        return `<li><a href="${p.path}" data-link data-cat="${esc(p.category)}" title="${esc(rel)}">${esc(p.title)}</a></li>`;
      })
      .join('');
    const mark = o.url ? `<a class="ow-mark" href="${esc(o.url)}" target="_blank" rel="noopener">${orgMark(o)}</a>` : `<span class="ow-mark">${orgMark(o)}</span>`;
    return `<li class="ow${o.logo ? '' : ' is-text'}${chips ? '' : ' is-solo'}">
      ${mark}
      <p class="ow-name">${esc(o.name)}${awards ? `<span class="ow-aw">수상 ${awards}</span>` : ''}</p>
      ${chips ? `<ul class="ow-proj" aria-label="${esc(o.name)}와 함께한 프로젝트">${chips}</ul>` : ''}
    </li>`;
  };
  return `<section class="with-wall reveal" aria-label="함께한 기관과 프로젝트">
    <p class="pg-kicker">WITH — 학교 · 협업 기관 · 상을 준 곳 × 프로젝트</p>
    <h2 class="ww-title">함께한 기관<sup>${pad(WALL.length)}</sup></h2>
    <ul class="wall">${WALL.map(tile).join('')}</ul>
    <p class="wall-note">로고는 기관 원본 파일 또는 상장에 인쇄된 로고를 흰색 단색으로만 바꾼 것입니다. 학업 · 수상 · 협업 이력을 밝히는 표기이며 후원이나 보증을 뜻하지 않습니다.</p>
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

// 상을 준 · 함께 연 기관의 로고(로고가 있는 곳만, 이름은 위 수여자 줄에 있다)
function awardOrgLogos(a) {
  const list = awardOrgs(a).map((k) => ORGS[k]).filter((o) => o.logo);
  return list.length ? `<ul class="aw-orgs" aria-label="수여 · 주최 기관">${list.map((o) => `<li title="${esc(o.name)}">${orgMark(o)}</li>`).join('')}</ul>` : '';
}

// 수상 타일(아카이브): 상장 + 이어진 프로젝트
function awardTile(a) {
  const p = a.project;
  return `<li class="aw-cell" data-g="${TIER_KEY[a.tier]}"${p ? ' data-p' : ''}>
    <article class="aw-card" data-tier="${TIER_KEY[a.tier]}">
      ${a.certs.length || a.photo ? `<button type="button" class="aw-sheet" data-cert="${a.at}" data-n="${a.certs.length || 1}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기">${certSheet(a, { sizes: '(max-width: 599px) 44vw, 240px' })}<span class="card-glare" aria-hidden="true"></span></button>` : `<div class="aw-sheet">${certSheet(a)}</div>`}
      <div class="aw-info">
        <p class="aw-top"><span class="aw-grade">${LAUREL}${esc(a.grade)}</span><time datetime="${esc(a.date)}">${esc(a.date.replace(/-/g, '.'))}</time></p>
        <h3 class="aw-contest">${esc(a.contest)}</h3>
        ${a.issuer || a.prize ? `<p class="aw-issuer">${issuerLine(a)}</p>` : ''}
        ${awardOrgLogos(a)}
        ${
          p
            ? `<a class="aw-proj" href="${p.path}" data-link data-cat="${esc(p.category)}">${p.cover ? `<span class="aw-proj-img">${img(p.cover, { sizes: '64px' })}</span>` : `<span class="aw-proj-img is-type" aria-hidden="true">${esc(categoryOf(p.category).label.slice(0, 2).toUpperCase())}</span>`}<span class="aw-proj-t"><small>PROJECT</small><b>${esc(p.title).replace(/ · /g, '&nbsp;· ')}</b></span><i aria-hidden="true">↗</i></a>`
            : ''
        }
      </div>
    </article>
  </li>`;
}

// ── 필름 카드 덱의 설명 줄(가운데 카드가 바뀔 때마다 덱 아래에서 바뀐다) ──
// 덱 설명 줄의 기관 로고(로고가 있는 곳만, 많아야 셋)
const diOrgs = (list) => {
  const logos = list.filter((o) => o.logo).slice(0, 3);
  return logos.length ? `<span class="di-orgs">${logos.map((o) => `<img src="/media/orgs/${o.logo}.webp" alt="${esc(o.name)}" title="${esc(o.name)}" style="--r:${o.r}" loading="lazy" decoding="async" />`).join('')}</span>` : '';
};
export function deckInfo(p) {
  const c = categoryOf(p.category);
  const b = bestOf(p);
  return `<div class="di">
    <p class="di-meta"><span class="di-cat" data-cat="${esc(p.category)}">${esc(c.label)}</span>${p.year ? `<span>${esc(p.year)}</span>` : ''}${
      b ? `<span class="di-award" data-tier="${b.key}">${LAUREL}${esc(b.label)}${b.count > 1 ? ` 외 ${b.count - 1}건` : ''}</span>` : ''
    }${diOrgs(orgsOf(p.id))}</p>
    <h3 class="di-title">${esc(p.title)}</h3>
    ${p.oneLiner ? `<p class="di-line">${esc(p.oneLiner)}</p>` : ''}
    <p class="di-actions"><a class="di-open" href="${p.path}" data-link data-cat="${esc(p.category)}">프로젝트 보기 <span aria-hidden="true">→</span></a></p>
  </div>`;
}
export function deckAwardInfo(a) {
  const p = a.project;
  const who = (a.issuer || '').split(' · ')[0];
  return `<div class="di" data-tier="${TIER_KEY[a.tier]}">
    <p class="di-meta"><span class="di-grade">${LAUREL}${esc(a.grade)}</span><span>${esc(a.date.replace(/-/g, '.'))}</span>${who ? `<span class="di-issuer">${esc(who)}</span>` : ''}${diOrgs(awardOrgs(a).map((k) => ORGS[k]))}</p>
    <h3 class="di-title">${esc(a.contest)}</h3>
    <p class="di-line">${esc(p.title)}${p.oneLiner ? ` — ${esc(p.oneLiner)}` : ''}</p>
    <p class="di-actions"><a class="di-open" href="${p.path}" data-link data-cat="${esc(p.category)}">수상 프로젝트 보기 <span aria-hidden="true">→</span></a><a class="di-ghost" href="/awards" data-link>상장 전체 보기</a></p>
  </div>`;
}
// 덱의 마지막 카드: 아카이브로 이어지는 '전체 보기' — 다른 작품 사진 네 장을 겹쳐 보여 준다
export function deckAllCard({ href, label, total, unit, thumbs }) {
  return `<a class="r-card deck-all" href="${esc(href)}" data-link aria-label="${esc(label)}">
    <figure class="card-media">
      <span class="all-grid" aria-hidden="true">${thumbs.map((src) => `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" />`).join('')}</span>
      <span class="card-shade" aria-hidden="true"></span>
      <span class="all-copy"><small>전체 보기</small><b>${total}</b><span>${esc(unit)}</span><i aria-hidden="true">↗</i></span>
      <figcaption class="card-cap"><span class="card-meta">모아 보기</span><h3 class="card-title">${esc(label)}</h3></figcaption>
    </figure>
  </a>`;
}
export function deckAllInfo({ href, title, line, cta, ghost }) {
  return `<div class="di di-all">
    <p class="di-meta"><span class="di-cat">모아 보기</span><span>${projects.length} PROJECTS · ${AWARDS.length} AWARDS</span></p>
    <h3 class="di-title">${esc(title)}</h3>
    <p class="di-line">${esc(line)}</p>
    <p class="di-actions"><a class="di-open" href="${esc(href)}" data-link>${esc(cta)} <span aria-hidden="true">→</span></a>${ghost ? `<a class="di-ghost" href="${esc(ghost.href)}" data-link>${esc(ghost.label)}</a>` : ''}</p>
  </div>`;
}

// 보도 날짜(인터뷰처럼 날짜를 모르면 빈칸)
const pressDate = (a) => (a.date ? a.date.replace(/-/g, '.') : '');
const relKey = (a) => (a.relation === '관련 보도' ? 'related' : 'direct');
// 인터뷰의 첫 질문과 답(기사에서 옮겨 적은 것만 — 없으면 요약)
const firstQA = (a) => (a.qa?.length ? a.qa[0] : null);

// 필름 '보도' 장면의 카드: 신문에서 오려 낸 기사처럼 — 제호 · 날짜, 사진, 제목
// 인터뷰는 사진 대신 짙은 잉크 칸에 큰 따옴표와 이름 — 질문과 답이 있으면 첫 질문을 싣는다
export function pressCard(a, k) {
  const cat = a.project?.category || 'product';
  const qa = firstQA(a);
  const visual = a.interview
    ? `<span class="pc-iv"><i class="pc-quote" aria-hidden="true">“</i>${
        qa ? `<span class="pc-iv-q">Q. ${esc(qa.q)}</span>` : `<small>INTERVIEW</small><b>${esc(profile.name)}</b><span>${esc(profile.en)}</span>`
      }</span>`
    : `<span class="pc-photo"><img src="${esc(a.image.thumb)}" srcset="${esc(a.image.thumb)} 720w, ${esc(a.image.src)} ${a.image.w}w" sizes="${REEL_SIZES}" alt="${esc(a.image.alt)}" loading="lazy" decoding="async" /></span>`;
  const label = a.interview ? `${a.publisher} 인터뷰 — ${a.title} (새 창)` : `${a.publisher} 보도 — ${a.title} (새 창)`;
  return `<a class="r-card p-card${a.interview ? ' is-interview' : ''}" href="${esc(a.url)}" target="_blank" rel="noopener" data-cat="${esc(cat)}" data-rel="${relKey(a)}" aria-label="${esc(label)}">
    <figure class="card-media">
      <span class="pc-mast"><b>${esc(a.publisher)}</b><span>${a.interview ? 'INTERVIEW' : 'NEWS'}</span></span>
      <span class="pc-rule" aria-hidden="true"></span>
      ${visual}
      <figcaption class="pc-cap">
        <span class="card-meta">${[pressDate(a) || (a.interview ? '학보 인터뷰' : ''), pad(k + 1)].filter(Boolean).join(' · ')}</span>
        <h3 class="pc-title">${esc(a.title)}</h3>
        <span class="pc-foot"><em>${esc(a.relation)}</em><i aria-hidden="true">${a.interview ? '인터뷰 원문 ↗' : '기사 원문 ↗'}</i></span>
      </figcaption>
      <span class="card-glare" aria-hidden="true"></span>
    </figure>
  </a>`;
}
export function deckPressInfo(a) {
  const p = a.project;
  const qa = firstQA(a);
  return `<div class="di di-press${a.interview ? ' di-interview' : ''}">
    <p class="di-meta"><span class="di-cat">${esc(a.publisher)}</span>${pressDate(a) ? `<span>${esc(pressDate(a))}</span>` : ''}<span class="di-rel" data-rel="${relKey(a)}">${esc(a.relation)}</span></p>
    <h3 class="di-title">${esc(a.title)}</h3>
    ${qa ? `<p class="di-line di-qa"><b>Q. ${esc(qa.q)}</b> ${esc(qa.a)}</p>` : `<p class="di-line">${esc(a.summary)}</p>`}
    <p class="di-actions"><a class="di-open" href="${esc(a.url)}" target="_blank" rel="noopener">${a.interview ? '인터뷰 원문 보기' : '기사 원문 보기'} <span aria-hidden="true">↗</span></a>${p ? `<a class="di-ghost" href="${p.path}" data-link>${esc(p.title)} →</a>` : ''}</p>
  </div>`;
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
    <a href="/about" data-link class="${on === 'about' ? 'is-on' : ''}"${on === 'about' ? ' aria-current="page"' : ''}>프로필</a>
    <a href="/growth" data-link class="${on === 'growth' ? 'is-on' : ''}"${on === 'growth' ? ' aria-current="page"' : ''}>성장<sup>${STAGES.length}</sup></a>
    <a href="/history" data-link class="${on === 'history' ? 'is-on' : ''}"${on === 'history' ? ' aria-current="page"' : ''}>이력</a>
    <a href="/works" data-link class="${on === 'works' ? 'is-on' : ''}"${on === 'works' ? ' aria-current="page"' : ''}>프로젝트<sup>${projects.length}</sup></a>
    <a href="/awards" data-link class="${on === 'awards' ? 'is-on' : ''}"${on === 'awards' ? ' aria-current="page"' : ''}>수상<sup>${AWARDS.length}</sup></a>
    <a href="/skills" data-link class="${on === 'skills' ? 'is-on' : ''}"${on === 'skills' ? ' aria-current="page"' : ''}>스킬<sup>${SKILL_COUNT}</sup></a>
  </nav>`;

const TIER_OF_KEY = Object.fromEntries(TIER_KEY.map((k, t) => [k, t]).filter(([k]) => k));

function awardsPage() {
  const media = awardMedia(AWARDS);
  const years = [...new Set(AWARDS.map((a) => a.year))];
  const count = (t) => AWARDS.filter((a) => a.tier === t).length;
  // 등급별 수치가 곧 보기 필터 — 누르면 그 등급만 남는다
  const sum = (g, n, label) => `<button type="button" data-g="${g}"${g in TIER_OF_KEY ? ` data-tier="${g}"` : ''} aria-pressed="${g === 'all'}"><b>${n}</b><span>${label}</span></button>`;
  return {
    media,
    html: `<div class="pg pg-awards">
    ${bar({ href: '/', label: '메인' })}
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
    <p class="aw-guide">수상 <b>${AWARDS.length}건 전체</b>를 연도별로 보여 드립니다 — 해마다 <b class="g">대상</b>부터 · 상장을 누르면 크게, 프로젝트를 누르면 그 작업으로</p>
    <div class="aw-list" id="aw-list">${years
      .map((y) => {
        // 해마다 높은 등급부터, 같은 등급은 최근 것부터
        const list = AWARDS.filter((a) => a.year === y).sort((a, b) => a.tier - b.tier || b.date.localeCompare(a.date));
        const tiers = [1, 2, 3, 4, 5]
          .map((t) => [t, list.filter((a) => a.tier === t).length])
          .filter(([, n]) => n)
          .map(([t, n]) => `<span data-tier="${TIER_KEY[t]}">${['', '대상', '최우수', '우수', '장려', '기타'][t]} ${n}</span>`)
          .join('');
        return `<section class="aw-year" id="y${y}" data-year="${y}" aria-label="${y}년 수상 ${list.length}건"><h2 class="aw-y"><span>${y}</span><sup>${pad(list.length)}</sup><small class="aw-y-tiers">${tiers}</small></h2><ul class="aw-grid">${list.map(awardTile).join('')}</ul></section>`;
      })
      .join('')}</div>
    ${withWall()}
    ${footer()}
  </div>`,
  };
}

// ── 보유 스킬(/skills): 숙련도 점수 대신 근거 — 기술마다 그 기술을 쓴 프로젝트와 받은 상 ──
// 근거 눈금: 프로젝트 하나에 한 칸(그 프로젝트 분야의 색)
const skTicks = (list) => `<span class="sk-ticks" aria-hidden="true">${list.map((p) => `<i data-cat="${esc(p.category)}"></i>`).join('')}</span>`;
const skDate = (a) => a.date.replace(/-/g, '.');

function skillRow(s) {
  const n = s.evidence.length;
  const explore = s.state === 'explore';
  // 프로젝트 근거가 없으면 무엇이 근거인지(자격 · 수상 · 본인 기록)를 대신 적는다
  const none = explore && !n ? '기록 없음' : s.certs.length ? '자격' : s.direct.length ? '수상' : 'NOTION';
  const label = `${s.name} — ${n ? `프로젝트 ${n}건` : none}${s.awards.length ? `, 수상 ${s.awards.length}` : ''}${s.certs.length ? `, 자격 ${s.certs.length}` : ''}${explore ? ', 탐구 중' : ''}`;
  const ev = [
    ...s.evidence.map(({ project: p, tools }) => {
      const aw = awardsOf(p.id).length;
      const meta = [p.year, categoryOf(p.category).label, ...tools].filter(Boolean).join(' · ');
      return `<li><a href="${p.path}" data-link data-cat="${esc(p.category)}"><span class="sk-ev-t"><b>${esc(p.title)}</b><small>${esc(meta)}</small></span>${aw ? `<span class="sk-ev-aw">${LAUREL}${aw}</span>` : ''}<i aria-hidden="true">↗</i></a></li>`;
    }),
    ...s.direct.map(
      (a) =>
        `<li class="is-award"><a href="/awards" data-link><span class="sk-ev-t"><b>${esc(a.contest)}</b><small>${esc(a.grade)} · ${esc(skDate(a))} · 수상 기록</small></span><span class="sk-ev-aw">${LAUREL}</span><i aria-hidden="true">↗</i></a></li>`
    ),
    ...s.certs.map(
      (c) => `<li class="is-cert"><a href="#sk-certs" data-jump><span class="sk-ev-t"><b>${esc(c.name)}</b><small>자격증${c.year ? ` · ${esc(c.year)}` : ''}</small></span><i aria-hidden="true">↓</i></a></li>`
    ),
  ];
  return `<li class="sk-item${explore ? ' is-explore' : ''}" data-p="${s.evidence.map((e) => e.project.id).join(' ')}">
    <button type="button" class="sk-key" aria-expanded="false" aria-controls="skp-${s.id}" aria-label="${esc(label)}">
      <span class="sk-name"><b>${esc(s.name)}</b><small>${esc(s.en)}</small></span>
      ${skTicks(s.evidence.map((e) => e.project))}
      <span class="sk-flags">${explore ? '<em class="sk-exp">탐구 중</em>' : ''}${s.certs.length ? '<em class="sk-cert-f">자격</em>' : ''}${
        s.awards.length ? `<em class="sk-aw-f">${LAUREL}${s.awards.length}</em>` : ''
      }</span>
      <span class="sk-cnt">${n ? `<b>${n}</b>` : `<b class="is-none">—</b>`}<small>${n ? 'PROJ' : esc(none)}</small></span>
      <span class="sk-plus" aria-hidden="true"></span>
    </button>
    <div class="sk-ev" id="skp-${s.id}" hidden>
      ${s.note ? `<p class="sk-note"><span>${explore ? 'NEXT' : 'NOTION'}</span>${esc(s.note)}</p>` : ''}
      ${ev.length ? `<ul class="sk-evl">${ev.join('')}</ul>` : ''}
    </div>
  </li>`;
}

// ── 프로필: 필름 · 아카이브에 흩어진 기록을 한 장으로 — 모두 기존 기록(프로필 · 소개 장면 · 프로젝트 · 수상 · 자격 · 보도)에서 옮긴다.
//    PDF로 저장(인쇄)하면 A4 이력서 모양으로 바뀐다 ──
const yearsOf = (y = '') => (String(y).match(/20\d{2}/g) || []).map(Number);
const dot = (d = '') => d.replace(/-/g, '.');
function aboutPage() {
  const intro = scenes.find((s) => s.id === 'prologue') || {};
  const email = profile.links.find((l) => l.url.startsWith('mailto:'));
  const links = profile.links.filter((l) => l !== email);
  const years = [...projects.flatMap((p) => yearsOf(p.year)), ...AWARDS.map((a) => +a.year), ...CERTS.map((c) => +c.year), ...HISTORY_YEARS.map(Number)].filter(Boolean);
  const from = Math.min(...years);
  const to = Math.max(...years);
  const grand = AWARDS.filter((a) => a.tier === 1).length;
  const featured = FEATURED.map(byId).filter(Boolean);
  const certs = [...CERTS].sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  const inYear = (y) => ({ p: projects.filter((p) => yearsOf(p.year).includes(+y)).length, a: AWARDS.filter((a) => a.year === String(y)).length });
  const h = (no, title, n, more) =>
    `<h2 class="ab-h"><span class="ab-no">${no}</span>${esc(title)}${n ? `<sup>${pad(n)}</sup>` : ''}${more ? `<a class="ab-more" href="${more.href}" data-link>${esc(more.label)} <span aria-hidden="true">→</span></a>` : ''}</h2>`;
  const linkList = (list) =>
    `<ul class="ab-links">${list
      .map((l) => `<li><a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}><span>${esc(l.label)}</span><b>${esc(l.value)}</b></a></li>`)
      .join('')}</ul>`;
  return `<div class="pg pg-about">
    ${bar({ href: '/', label: '메인' })}
    <section class="works-head ab-head">
      <p class="pg-kicker">RÉSUMÉ — 한 장으로 보는 이력서 · PDF로 저장</p>
      <h1 class="works-title">Résumé<sup>${from}–${to}</sup></h1>
      ${tabs('resume')}
    </section>

    <section class="ab-id" aria-label="소개">
      <div class="ab-who">
        <p class="ab-name"><b>${esc(profile.name)}</b><span>${esc(profile.en)}</span></p>
        <p class="ab-role"><b>${esc(profile.role)}</b> — ${esc(profile.roleKo)}</p>
        ${profile.summary ? `<p class="ab-lead">${esc(profile.summary)}</p>` : ''}
        <p class="ab-motto">“${esc(profile.motto)}”</p>
        ${profile.education?.length ? `<ul class="ab-edu" aria-label="학력">${profile.education.map((e) => `<li><b>${esc(e.school)}</b> ${esc(e.major)}<small>${esc(e.period)}</small></li>`).join('')}</ul>` : ''}
        <p class="ab-print-url">${esc(location.origin.replace(/^https?:\/\//, ''))}${email ? ` · ${esc(email.value)}` : ''}</p>
      </div>
      <div class="ab-act">
        ${email ? `<a class="ab-btn is-main" href="${esc(email.url)}"><span>메일 보내기</span><small>${esc(email.value)}</small></a><button type="button" class="ab-btn" data-copy="${esc(email.value)}"><span>이메일 복사</span></button>` : ''}
        <button type="button" class="ab-btn" data-print><span>PDF로 저장</span><small>A4 이력서</small></button>
        <button type="button" class="ab-btn" data-share><span>링크 공유</span></button>
      </div>
      ${linkList(links)}
    </section>

    <dl class="ab-nums">
      <div><dt>프로젝트</dt><dd>${projects.length}</dd></div>
      <div><dt>수상</dt><dd>${AWARDS.length}<small>대상 ${grand}</small></dd></div>
      <div><dt>자격증</dt><dd>${CERTS.length}</dd></div>
      <div><dt>보도</dt><dd>${PRESS.length}</dd></div>
      <div><dt>활동</dt><dd>${from}<small>— ${to}</small></dd></div>
    </dl>

    ${
      intro.pillars?.length
        ? `<section class="ab-sec reveal">${h('01', '핵심 역량')}<ol class="ab-pillars">${intro.pillars
            .map((p) => `<li><span class="ab-no">${esc(p.no)}</span><b>${esc(p.title)}</b><small>${esc(p.text)}</small></li>`)
            .join('')}</ol></section>`
        : ''
    }

    <section class="ab-sec reveal">${h('02', '걸어온 길', 0, { href: '/history', label: '필름에서 연도별로 보기' })}<ol class="ab-time">${HISTORY.map((y) => {
      const n = inYear(y.year);
      const count = [n.p && `프로젝트 ${n.p}`, n.a && `수상 ${n.a}`].filter(Boolean).join(' · ');
      return `<li><time>${esc(y.year)}</time><ul class="ab-tl">${y.items.map((it) => `<li>${esc(it.title)}</li>`).join('')}</ul>${count ? `<small>${count}</small>` : ''}</li>`;
    }).join('')}</ol></section>

    <section class="ab-sec reveal">
      ${h('03', '대표 프로젝트', featured.length, { href: '/works', label: `전체 ${projects.length}개` })}
      <ul class="ab-proj">${featured
        .map((p) => {
          const best = bestOf(p);
          return `<li data-cat="${esc(p.category)}"><a href="${p.path}" data-link>
            <span class="ab-pk">${esc(categoryOf(p.category).ko)} · ${esc(p.year)}</span>
            <b class="ab-pt">${esc(p.title)}</b>
            <span class="ab-pone">${esc(p.oneLiner)}</span>
            ${p.role.length ? `<span class="ab-prole">${esc(p.role.join(' · '))}</span>` : ''}
            ${best ? `<span class="ab-paw" data-tier="${best.key}">${LAUREL}${esc(best.label)}${best.count > 1 ? ` 외 ${best.count - 1}` : ''}</span>` : ''}
          </a></li>`;
        })
        .join('')}</ul>
    </section>

    <section class="ab-sec reveal">
      ${h('04', '수상', AWARDS.length, { href: '/awards', label: '상장 보기' })}
      <ul class="ab-aw">${AWARDS.map(
        (a) => `<li data-tier="${TIER_KEY[a.tier]}"><time datetime="${esc(a.date)}">${esc(dot(a.date))}</time><b>${esc(a.contest)}</b><span class="ab-g">${esc(a.grade)}</span>${a.issuer ? `<small>${esc(a.issuer)}</small>` : ''}</li>`
      ).join('')}</ul>
    </section>

    <section class="ab-sec ab-two reveal">
      <div>
        ${h('05', '자격증', CERTS.length)}
        <ul class="ab-cert">${certs.map((c) => `<li><time>${c.year ? esc(c.year) : '—'}</time><b>${esc(c.name)}</b></li>`).join('')}</ul>
      </div>
      <div>
        ${h('06', '언론 보도', PRESS.length)}
        <ul class="ab-press">${PRESS.map(
          (a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener"><time>${a.date ? esc(dot(a.date)) : '인터뷰'}</time><b>${esc(a.title)}</b><small>${esc(a.publisher)} · ${esc(a.relation)}</small></a></li>`
        ).join('')}</ul>
      </div>
    </section>

    <section class="ab-sec reveal">
      ${h('07', '기술', SKILL_COUNT, { href: '/skills', label: '근거 보기' })}
      <ul class="ab-skill">${DOMAIN_SKILLS.map((d) => {
        const list = d.skills.filter((s) => s.state !== 'explore' && (s.evidence.length || s.certs.length || s.direct.length)).slice(0, 8);
        return list.length ? `<li data-dom="${d.id}"><b>${esc(d.ko)}</b><span>${list.map((s) => `<i>${esc(s.name)}</i>`).join('')}</span></li>` : '';
      }).join('')}</ul>
    </section>

    <section class="ab-sec ab-contact reveal">
      ${h('08', '연락처')}
      ${linkList(profile.links)}
    </section>
    ${footer()}
  </div>`;
}

function skillsPage() {
  const proven = new Set(SKILLS.flatMap((s) => s.evidence.map((e) => e.project.id)));
  const certs = [...CERTS].sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  const domainOf = (id) => DOMAIN_SKILLS.find((d) => d.id === id);
  const card = (d, k) => {
    const top = d.skills.filter((s) => s.evidence.length).slice(0, 4);
    return `<li class="sk-dcard" data-dom="${d.id}" style="--i:${k}">
      <a href="#sk-${d.id}" data-jump aria-label="${esc(`${d.ko} — 기술 ${d.skills.length}, 근거 프로젝트 ${d.projects.length}, 수상 ${d.awards}${d.certs.length ? `, 자격 ${d.certs.length}` : ''}`)}">
        <span class="sk-dk"><span class="sk-dno">${pad(k + 1)}</span>${esc(d.code)}</span>
        <span class="sk-dname">${esc(d.ko)}</span>
        <span class="sk-den">${esc(d.label)}</span>
        <span class="sk-dnum"><span><b>${d.skills.length}</b>기술</span><span><b>${d.projects.length}</b>프로젝트</span><span><b>${d.awards}</b>수상</span>${d.certs.length ? `<span><b>${d.certs.length}</b>자격</span>` : ''}</span>
        <span class="sk-dtop">${top.map((s) => `<i>${esc(s.name)}</i>`).join('')}</span>
        ${skTicks(d.projects)}
        <span class="sk-dgo" aria-hidden="true">↓</span>
      </a>
    </li>`;
  };
  const section = (d, k) => `<section class="sk-sec reveal" id="sk-${d.id}" data-dom="${d.id}" aria-labelledby="sk-h-${d.id}">
      <div class="sk-side">
        <p class="sk-sec-k"><span>${pad(k + 1)}</span>${esc(d.code)} — ${esc(d.label)}</p>
        <h2 class="sk-sec-h" id="sk-h-${d.id}" tabindex="-1">${esc(d.ko)}<sup>${pad(d.skills.length)}</sup></h2>
        <p class="sk-sec-lead">${esc(d.lead)}</p>
        <p class="sk-sec-n"><span><b>${d.projects.length}</b>프로젝트</span><span><b>${d.awards}</b>수상</span>${d.certs.length ? `<span><b>${d.certs.length}</b>자격</span>` : ''}</p>
        ${
          d.projects.length
            ? `<ul class="sk-proj" aria-label="${esc(d.ko)} 근거 프로젝트">${d.projects
                .map((p) => `<li><a href="${p.path}" data-link data-cat="${esc(p.category)}" data-p="${p.id}"><b>${esc(p.title)}</b><small>${esc(p.year)}</small></a></li>`)
                .join('')}</ul>`
            : ''
        }
      </div>
      <ul class="sk-list">${d.skills.map(skillRow).join('')}</ul>
    </section>`;
  return `<div class="pg pg-skills">
    ${bar({ href: '/', label: '메인' })}
    <section class="works-head sk-head">
      <p class="pg-kicker">SKILL MAP — 프로젝트가 증명하는 기술</p>
      <h1 class="works-title">Skills<sup>${pad(SKILL_COUNT)}</sup></h1>
      ${tabs('skills')}
      <p class="sk-lead">숙련도 점수 대신 근거를 셉니다. 기술마다 그 기술을 쓴 프로젝트와 그 프로젝트가 받은 상을 잇고, 누르면 근거가 열립니다.</p>
      <dl class="sk-sum">
        <div><dt>분야</dt><dd>${DOMAIN_SKILLS.length}</dd></div>
        <div><dt>기술</dt><dd>${SKILL_COUNT}</dd></div>
        <div><dt>근거 프로젝트</dt><dd>${proven.size}</dd></div>
        <div><dt>자격증</dt><dd>${CERTS.length}</dd></div>
      </dl>
    </section>
    <section class="sk-domains" aria-label="분야 한눈에 보기">
      <ol class="sk-dgrid">${DOMAIN_SKILLS.map(card).join('')}</ol>
      <p class="sk-legend" aria-hidden="true"><span><i class="lg-tick"></i>근거 프로젝트 한 칸(분야 색)</span><span class="lg-aw">${LAUREL}그 프로젝트들의 수상</span><span class="lg-cert">자격</span><span class="lg-exp">탐구 중 — 초기 · 검토 단계</span></p>
    </section>
    <div class="sk-matrix">${DOMAIN_SKILLS.map(section).join('')}</div>
    <section class="sk-certs reveal" id="sk-certs" aria-labelledby="sk-h-certs">
      <p class="pg-kicker">CERTIFICATIONS — 자격증</p>
      <h2 class="ww-title" id="sk-h-certs" tabindex="-1">자격증<sup>${pad(CERTS.length)}</sup></h2>
      <ol class="sk-cgrid">${certs
        .map((c) => {
          const d = domainOf(c.domain);
          return `<li class="sk-cert" data-dom="${c.domain}"><span class="sk-cy">${c.year ? esc(c.year) : '—'}</span><b>${esc(c.name)}</b><small>${esc(d.code)} · ${esc(d.ko)}</small></li>`;
        })
        .join('')}</ol>
      <p class="wall-note">근거는 프로젝트 기록(도구 · 역할 · 요약 · 스토리)에 그 기술이 적힌 경우만 셉니다. NOTION 줄과 자격증은 2026 Notion 포트폴리오의 본인 기록이며, 취득 연도가 적혀 있지 않은 자격은 비워 두었습니다.</p>
    </section>
    ${withWall()}
    ${footer()}
  </div>`;
}

// ── 성장 과정(/growth): 1학년 전공 탐색 → 2학년 도전 → 3학년 인턴십 · Physical AI, 그리고 가치관 ──
const grMonth = (d) => d.slice(0, 7).replace('-', '.');
// 이력 항목은 /history의 그 항목으로(→), 덧붙인 기록은 프로젝트로(↗)
function grMilestone(m) {
  const inner = `<time>${esc(m.when)}</time><span class="gr-ms-t">${m.kind ? `<em>${esc(m.kind)}</em>` : ''}<b>${esc(m.what)}</b>${m.note ? `<small>${esc(m.note)}</small>` : ''}</span>`;
  return `<li>${m.href ? `<a href="${m.href}" data-link>${inner}<i aria-hidden="true">${m.href.startsWith('/history') ? '→' : '↗'}</i></a>` : `<div>${inner}</div>`}</li>`;
}
function grCard(p) {
  const aw = awardsOf(p.id).length;
  return `<li><a class="gr-card" href="${p.path}" data-link data-cat="${esc(p.category)}">
    <span class="gr-card-ph">${p.cover ? `<img src="${esc(p.cover.thumb)}" alt="" loading="lazy" decoding="async">` : ''}</span>
    <span class="gr-card-t"><b>${esc(p.title)}</b><small>${esc(p.year)} · ${esc(categoryOf(p.category).ko)}</small></span>
    ${aw ? `<span class="gr-card-aw" aria-label="수상 ${aw}">${LAUREL}${aw}</span>` : ''}
  </a></li>`;
}
const grAward = (a) =>
  `<li data-tier="${TIER_KEY[a.tier]}"><time>${esc(grMonth(a.date))}</time><em>${esc(a.grade)}</em><span>${esc(a.contest)}</span>${
    a.project ? `<a href="${a.project.path}" data-link aria-label="${esc(a.project.title)} 프로젝트">↗</a>` : ''
  }</li>`;
function grStage(s, k) {
  const next = STAGES[k + 1];
  return `<section class="gr-stage reveal" id="gr-${s.id}" data-stage="${s.id}" aria-labelledby="gr-h-${s.id}">
    <div class="gr-side">
      <p class="gr-k"><span class="gr-no">${pad(k + 1)}</span>${esc(s.grade)} · ${esc(s.span)}<em>${esc(s.code)}</em></p>
      <h2 class="gr-h" id="gr-h-${s.id}" tabindex="-1">${esc(s.title)}</h2>
      <p class="gr-headline">${esc(s.headline)}</p>
      <dl class="gr-num">
        <div><dt>프로젝트</dt><dd>${s.projects.length}</dd></div>
        <div><dt>수상</dt><dd>${s.awards.length}</dd></div>
        <div><dt>대상</dt><dd>${s.grand}</dd></div>
        <div><dt>자격</dt><dd>${s.certs.length}</dd></div>
      </dl>
      <blockquote class="gr-learned"><span>이 시기에 배운 것</span>${esc(s.learned)}</blockquote>
    </div>
    <div class="gr-main">
      <p class="gr-story">${esc(s.story)}</p>
      <h3 class="gr-sub">주요 장면<a class="gr-sub-go" href="/history#y${s.years[0]}" data-link>연도별 이력에서 보기 <span aria-hidden="true">→</span></a></h3>
      <ol class="gr-ms">${s.milestones.map(grMilestone).join('')}</ol>
      <h3 class="gr-sub">대표 프로젝트<small>이 시기 프로젝트 ${s.projects.length}건 중</small></h3>
      <ul class="gr-cards">${s.featuredProjects.map(grCard).join('')}</ul>
      <details class="gr-more">
        <summary>이 시기의 모든 기록 — 프로젝트 ${s.projects.length} · 수상 ${s.awards.length}${s.certs.length ? ` · 자격 ${s.certs.length}` : ''}</summary>
        <div class="gr-more-in">
          <ul class="gr-plist" aria-label="${esc(s.grade)} 프로젝트">${s.projects
            .map((p) => `<li><a href="${p.path}" data-link data-cat="${esc(p.category)}"><b>${esc(p.title)}</b><small>${esc(p.year)}</small></a></li>`)
            .join('')}</ul>
          <ul class="gr-alist" aria-label="${esc(s.grade)} 수상">${s.awards.map(grAward).join('')}</ul>
          ${s.certs.length ? `<ul class="gr-clist" aria-label="${esc(s.grade)} 자격">${s.certs.map((c) => `<li><b>${esc(c.name)}</b><small>${esc(c.year)}</small></li>`).join('')}</ul>` : ''}
        </div>
      </details>
    </div>
    ${next ? `<p class="gr-bridge" aria-hidden="true"><span>${esc(next.grade)} · ${esc(next.title)}</span></p>` : ''}
  </section>`;
}
function growthPage() {
  return `<div class="pg pg-growth">
    ${bar({ href: '/', label: '메인' })}
    <section class="works-head gr-head">
      <p class="pg-kicker">GROWTH STORY — 학년별 성장 과정과 가치관</p>
      <h1 class="works-title">Growth<sup>${pad(STAGES.length)}</sup></h1>
      ${tabs('growth')}
      <p class="gr-motto">${esc(profile.motto)}</p>
      <ol class="gr-road">${STAGES.map(
        (s, k) => `<li data-stage="${s.id}"><a href="#gr-${s.id}" data-jump>
          <span class="gr-road-no">${pad(k + 1)}</span>
          <span class="gr-road-g"><b>${esc(s.grade)}</b><small>${esc(s.span)}</small></span>
          <span class="gr-road-t">${esc(s.title)}</span>
          <span class="gr-road-n">프로젝트 ${s.projects.length} · 수상 ${s.awards.length}</span>
        </a></li>`
      ).join('')}</ol>
      <p class="gr-prelude"><b>${esc(PRELUDE.year)}</b>${esc(PRELUDE.text)}</p>
    </section>
    <section class="gr-values reveal" aria-labelledby="gr-h-values">
      <p class="pg-kicker">VALUES — 이렇게 일합니다</p>
      <h2 class="ww-title" id="gr-h-values">가치관<sup>${pad(VALUES.length)}</sup></h2>
      <ol class="gr-vgrid">${VALUES.map(
        (v) => `<li class="gr-value">
          <p class="gr-v-k"><span>${esc(v.no)}</span>${esc(v.en)}</p>
          <h3>${esc(v.title)}</h3>
          <p class="gr-v-t">${esc(v.text)}</p>
          <ul class="gr-v-proof" aria-label="근거 프로젝트">${v.proof
            .map(byId)
            .filter(Boolean)
            .map((p) => `<li><a href="${p.path}" data-link data-cat="${esc(p.category)}">${esc(p.title)}</a></li>`)
            .join('')}</ul>
        </li>`
      ).join('')}</ol>
    </section>
    <div class="gr-stages">${STAGES.map(grStage).join('')}</div>
    <section class="gr-now reveal">
      <p class="pg-kicker">NOW — 지금</p>
      <p class="gr-now-t">탐색에서 도전으로, 도전에서 집중으로 — 프로젝트 ${projects.length}개 · 수상 ${AWARDS.length}건을 지나 지금은 <b>Physical AI</b>에 집중하고 있습니다.</p>
      <div class="gr-now-a"><a class="btn-works" href="/works" data-link>모든 프로젝트 <span aria-hidden="true">↗</span></a><a class="btn-works" href="/skills" data-link>보유 스킬 <span aria-hidden="true">↗</span></a></div>
    </section>
    ${footer()}
  </div>`;
}

function bar(back) {
  return `<header class="pg-bar">
    <a class="pg-back" href="${back.href}" data-link>← ${esc(back.label)}</a>
    <a class="pg-brand" href="/" data-link aria-label="메인 화면으로">KWON</a>
    <button type="button" class="pg-close" data-close aria-label="닫기"><i></i><i></i></button>
    <i class="pg-progress" aria-hidden="true"></i>
  </header>`;
}

// cat: 'all' 또는 'robotics,iot'처럼 쉼표로 이은 분야 목록
const catList = (cat) => (cat === 'all' ? null : cat.split(','));

function worksPage(cat) {
  const on = catList(cat);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, projects.filter((p) => p.category === c.id).length]));
  return `<div class="pg pg-works">
    ${bar({ href: '/', label: '메인' })}
    <section class="works-head">
      <p class="pg-kicker">PROJECT ARCHIVE — 권용현이 만든 것들</p>
      <h1 class="works-title">Works<sup>${pad(projects.length)}</sup></h1>
      ${tabs('works')}
      <nav class="chips" aria-label="분야">
        <button type="button" data-cat="all" class="${cat === 'all' ? 'is-on' : ''}">전체<sup>${projects.length}</sup></button>
        ${CATEGORIES.filter((c) => counts[c.id])
          .map((c) => `<button type="button" data-cat="${c.id}" class="${on?.includes(c.id) ? 'is-on' : ''}">${esc(c.ko)}<sup>${counts[c.id]}</sup></button>`)
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
    ${bar({ href: '/works', label: '프로젝트 목록' })}
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
      <div class="d-acts"><button type="button" class="d-share" data-share><span aria-hidden="true">↗</span> 이 프로젝트 링크 공유</button></div>
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

    ${(() => {
      // 이 프로젝트를 다룬 공식 보도: 기사 사진 · 매체 · 날짜 · 제목
      const list = pressOf(p.id);
      return list.length
        ? `<section class="d-press reveal"><h2 class="d-h">IN THE PRESS<sup>${pad(list.length)}</sup></h2><ul>${list
            .map(
              (a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener"><span class="dp-img"><img src="${esc(a.image.thumb)}" alt="" loading="lazy" decoding="async" /></span><span class="dp-t"><small>${esc(a.publisher)} · ${esc(a.date.replace(/-/g, '.'))} · ${esc(a.relation)}</small><b>${esc(a.title)}</b></span><i aria-hidden="true">↗</i></a></li>`
            )
            .join('')}</ul></section>`
        : '';
    })()}

    ${
      p.links.length
        ? `<section class="d-links reveal"><h2 class="d-h">SOURCE</h2><ul>${p.links
            .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><i aria-hidden="true">↗</i></a></li>`)
            .join('')}</ul></section>`
        : ''
    }

    <nav class="d-next" aria-label="다른 프로젝트">
      <a class="d-prev-link" href="${prev.path}" data-link>← 이전 프로젝트 · ${esc(prev.title)}</a>
      <a class="d-next-card" href="${next.path}" data-link>
        <div class="d-next-media">${next.cover ? media(next.cover, { sizes: '100vw' }) : typeCover(next)}</div>
        <span class="d-next-k">다음 프로젝트 · ${esc(categoryOf(next.category).ko)} →</span>
        <b class="d-next-t">${esc(next.title)}</b>
      </a>
      <p class="d-next-how">카드를 누르거나 <kbd>←</kbd> <kbd>→</kbd> 키로 이전 · 다음 프로젝트</p>
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
  let revealTimer = 0;
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

  // 이력 주소의 자리(#y2025 · #h-<항목>) → 필름 이력 장면의 그 해 화면
  const historyBeat = (hash) => {
    const y = hash.match(/^#y(\d{4})$/);
    if (y) return y[1];
    const h = hash.match(/^#h-([\w-]+)$/);
    return (h && historyItem(h[1])?.year) || null;
  };
  const parse = () => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path.toLowerCase() === '/awards') return { name: 'awards' };
    if (path.toLowerCase() === '/skills') return { name: 'skills' };
    if (path.toLowerCase() === '/growth') return { name: 'growth' };
    // 프로필 · 이력은 필름의 장면(한 화면씩) — /history#y2025는 그 해의 화면, #h-<항목>은 그 항목이 있는 해의 화면으로
    if (path.toLowerCase() === '/about') return { name: 'film', scene: 'prologue' };
    if (path.toLowerCase() === '/history') return { name: 'film', scene: 'history', beat: historyBeat(location.hash) };
    if (path.toLowerCase() === '/resume') return { name: 'resume' };
    const m = path.match(/^\/works(?:\/([\w-]+))?$/);
    if (!m) return { name: 'film' };
    if (m[1]) {
      let id = m[1].toLowerCase();
      // 합쳐진 프로젝트의 예전 주소는 지금 주소로
      if (ALIAS[id] && byId(ALIAS[id])) {
        id = ALIAS[id];
        history.replaceState(history.state, '', `/works/${id}`);
      }
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
    else if (route.name === 'skills') page.innerHTML = skillsPage();
    else if (route.name === 'growth') page.innerHTML = growthPage();
    else if (route.name === 'resume') page.innerHTML = aboutPage();
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
    const name = { awards: 'Awards', skills: 'Skills', resume: 'Résumé', growth: 'Growth' }[route.name] || 'Works';
    document.title = p ? `${p.title} — 권용현 Physical AI Portfolio` : `${name} — 권용현 Physical AI Portfolio`;
    page.focus({ preventScroll: true });
    // 주소에 자리가 있으면(필름의 이력 항목에서 들어온 경우 등) 그 자리로 — 그림이 자리 잡은 뒤에
    // (브라우저가 스스로 #자리로 옮기는 스크롤 · 글꼴이 늦게 와 줄이 바뀌는 것까지 지나간 뒤 한 번 더 맞춘다)
    if (location.hash) {
      requestAnimationFrame(() => requestAnimationFrame(() => jumpHash(false)));
      setTimeout(() => current === route && jumpHash(false), 420);
    }
  }

  function unmount() {
    page.hidden = true;
    page.innerHTML = '';
    observer?.disconnect();
    document.body.classList.remove('page-open');
    document.title = '권용현 — Physical AI Portfolio';
  }

  // 보유 스킬: 기술 펼치기 · 기술 ↔ 근거 프로젝트 강조 · 분야로 건너뛰기
  function bindSkills() {
    const matrix = page.querySelector('.sk-matrix');
    matrix.addEventListener('click', (e) => {
      const b = e.target.closest('.sk-key');
      if (!b) return;
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      b.parentElement.classList.toggle('is-open', open);
      document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
    });
    // 기술에 올리면 그 기술의 프로젝트가, 프로젝트에 올리면 그 프로젝트를 근거로 둔 기술이 밝아진다
    let lit = null;
    const light = (el) => {
      const item = el?.closest('.sk-item');
      const chip = el?.closest('.sk-proj a');
      const key = (item && item.dataset.p) || chip ? item || chip : null;
      if (key === lit) return;
      if (lit) {
        const old = lit.closest('.sk-sec');
        old.classList.remove('is-lit');
        old.querySelectorAll('.is-hit').forEach((x) => x.classList.remove('is-hit'));
      }
      lit = key;
      if (!lit) return;
      const sec = lit.closest('.sk-sec');
      sec.classList.add('is-lit');
      lit.classList.add('is-hit');
      if (item) {
        const ids = item.dataset.p.split(' ');
        sec.querySelectorAll('.sk-proj a').forEach((a) => a.classList.toggle('is-hit', ids.includes(a.dataset.p)));
      } else sec.querySelectorAll('.sk-item').forEach((li) => li.classList.toggle('is-hit', li.dataset.p.split(' ').includes(chip.dataset.p)));
    };
    // 마우스에서만(터치는 누르면 펼친다)
    matrix.addEventListener('pointerover', (e) => e.pointerType === 'mouse' && light(e.target));
    matrix.addEventListener('pointerleave', () => light(null));
    // 포커스는 키보드로 옮겼을 때만(터치로 누른 버튼이 다른 줄을 계속 흐리게 하지 않게)
    matrix.addEventListener('focusin', (e) => e.target.matches(':focus-visible') && light(e.target));
    matrix.addEventListener('focusout', (e) => !matrix.contains(e.relatedTarget) && light(null));
  }

  // 페이지 안의 한 자리로: 등장 전(아래로 밀린) 위치가 아니라 제자리 기준으로, 위 막대 높이만큼 띄운다.
  // 그 자리를 잠깐 밝혀 어디인지 알린다(이력 항목 등)
  function jumpTo(to, smooth = true) {
    if (!to) return;
    // 등장 전이거나 막 등장하는 중인 구획은 움직임 없이 제자리에 세운 뒤 잰다(아래로 밀린 만큼 어긋나지 않게)
    const rv = to.closest('.reveal');
    if (rv) {
      rv.style.transition = 'none';
      rv.classList.add('is-in');
      void rv.offsetWidth;
      rv.style.transition = '';
    }
    const y = to.getBoundingClientRect().top - new DOMMatrix(getComputedStyle(to).transform).m42 + page.scrollTop;
    page.scrollTo({ top: Math.max(0, y - page.querySelector('.pg-bar').offsetHeight - 10), behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
    (to.querySelector('[tabindex="-1"]') || to).focus({ preventScroll: true });
    to.classList.remove('is-hit');
    void to.offsetWidth;
    to.classList.add('is-hit');
  }
  // 주소의 #자리(/history#h-gan-tts · /awards#y2025)로
  const jumpHash = (smooth) => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) jumpTo(page.querySelector(`#${CSS.escape(id)}`), smooth);
  };

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
    page.querySelectorAll('.reveal, .w-item, .aw-cell, .sk-dcard').forEach((el) => observer.observe(el));
    // 상장 크게 보기(수상 아카이브 · 상세의 수상 칸)
    const certs = route.name === 'awards' ? pageMedia : JSON.parse(page.querySelector('.d-awards')?.dataset.media || '[]');
    // 수상 아카이브: 라이트박스도 화면에 보이는 순서(해마다 높은 등급부터)대로, 걸러 보는 중이면 보이는 수상만 넘긴다
    const showCert = (b) => {
      if (route.name !== 'awards') return lightbox.show({ media: certs }, +b.dataset.cert, b);
      const media = [];
      let at = 0;
      page.querySelectorAll('.aw-year .aw-cell:not(.is-out) [data-cert]').forEach((x) => {
        if (x === b) at = media.length;
        media.push(...certs.slice(+x.dataset.cert, +x.dataset.cert + +x.dataset.n));
      });
      lightbox.show({ media }, at, b);
    };
    page.querySelectorAll('[data-cert]').forEach((b) => b.addEventListener('click', () => showCert(b)));

    if (route.name === 'awards') {
      const sum = page.querySelector('.aw-sum');
      sum.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-g]');
        if (!b) return;
        const g = b.getAttribute('aria-pressed') === 'true' && b.dataset.g !== 'all' ? 'all' : b.dataset.g;
        sum.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.g === g)));
        sum.classList.toggle('is-filtered', g !== 'all');
        const keep = (li) => (g === 'all' ? true : g === 'project' ? li.hasAttribute('data-p') : li.dataset.g === g);
        const shown = [];
        page.querySelectorAll('.aw-year').forEach((sec) => {
          const cells = [...sec.querySelectorAll('.aw-cell')];
          cells.forEach((li) => li.classList.toggle('is-out', !keep(li)));
          const vis = cells.filter((li) => !li.classList.contains('is-out'));
          sec.hidden = !vis.length;
          sec.querySelector('.aw-y sup').textContent = pad(vis.length);
          shown.push(...vis);
        });
        // 남은 카드는 CSS 등장 전환을 처음부터 다시 — 앞쪽 몇 장은 차례로
        shown.forEach((li, k) => {
          li.classList.remove('is-in');
          li.style.transitionDelay = reducedMotion ? '' : `${Math.min(k, 10) * 45}ms`;
        });
        void page.offsetHeight;
        shown.forEach((li) => li.classList.add('is-in'));
        clearTimeout(revealTimer);
        revealTimer = setTimeout(() => shown.forEach((li) => (li.style.transitionDelay = '')), 1600);
      });
      // 끝나면 인라인 값을 지워 버튼의 CSS(걸러 볼 때 흐려짐 · 호버 들림)가 다시 듣게
      gsap.fromTo(page.querySelectorAll('.works-title, .pg-tabs a, .aw-sum > button'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'expo.out', delay: 0.2, clearProps: 'opacity,visibility,transform' });
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
    } else if (route.name === 'resume') {
      page.querySelector('[data-print]')?.addEventListener('click', () => print());
      page.querySelectorAll('[data-copy]').forEach((b) =>
        b.addEventListener('click', async () => flash((await copyText(b.dataset.copy)) ? `이메일 주소를 복사했어요 — ${b.dataset.copy}` : '복사하지 못했어요'))
      );
      if (!reducedMotion)
        gsap.fromTo(page.querySelectorAll('.works-title, .pg-tabs a, .ab-who > *, .ab-act > *, .ab-nums > div'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.035, ease: 'expo.out', delay: 0.2, clearProps: 'opacity,visibility,transform' });
    } else if (route.name === 'growth') {
      if (!reducedMotion)
        gsap.fromTo(page.querySelectorAll('.works-title, .pg-tabs a, .gr-motto, .gr-road li'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', delay: 0.2, clearProps: 'opacity,visibility,transform' });
    } else if (route.name === 'skills') {
      bindSkills();
      if (!reducedMotion)
        gsap.fromTo(page.querySelectorAll('.works-title, .pg-tabs a, .sk-lead, .sk-sum > div'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'expo.out', delay: 0.2, clearProps: 'opacity,visibility,transform' });
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
    // 분야 카드 · 자격 줄 · 연도 칩: 페이지 안의 그 구획으로(주소는 그대로)
    page.querySelectorAll('[data-jump]').forEach((a) =>
      a.addEventListener('click', (e) => {
        const to = page.querySelector(a.getAttribute('href'));
        if (!to) return;
        e.preventDefault();
        jumpTo(to);
      })
    );
    // 링크 공유: 프로젝트는 그 프로젝트 주소, 프로필은 프로필 주소
    const p = route.name === 'detail' ? byId(route.id) : null;
    const share = p
      ? { title: `${p.title} — 권용현 Physical AI`, text: p.oneLiner, url: `${location.origin}${p.path}` }
      : { title: `${profile.name} — ${profile.role}`, text: profile.roleKo, url: `${location.origin}${location.pathname}` };
    page.querySelectorAll('[data-share]').forEach((b) => b.addEventListener('click', () => shareLink(share)));
  }

  async function apply(route, { animate = true } = {}) {
    if (lightbox.open) lightbox.close();
    // 없는 프로젝트 주소는 아카이브 주소로 바로잡는다
    if (route.missing) history.replaceState(history.state, '', '/works');
    if (current && route.name === current.name && route.id === current.id && route.cat === current.cat) return;
    const prev = current;
    current = route.name === 'film' ? null : route;
    toTop.classList.remove('is-on');
    if (route.name === 'film') {
      // 필름의 한 장면으로 가는 주소(/about · /history)는 필름 주소(/#prologue)로 바꿔 둔다
      if (route.scene) history.replaceState(history.state, '', `/${location.search}#${route.scene}`);
      if (!prev) return onClose?.(route);
      const back = () => {
        unmount();
        onClose?.(route);
        if (filmOpener?.isConnected) filmOpener.focus({ preventScroll: true });
        filmOpener = null;
      };
      if (animate) await sweep('', back);
      else back();
      return;
    }
    const label = route.name === 'detail' ? byId(route.id).title : route.name === 'resume' ? 'RÉSUMÉ' : route.name.toUpperCase();
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
    if (url.pathname + url.search === location.pathname + location.search) {
      // 같은 페이지 안의 다른 자리(#)
      if (url.hash && current) {
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        jumpHash(true);
      }
      return;
    }
    // depth: 필름에서 몇 단계 들어왔는지(닫기 버튼이 필름으로 바로 돌아가도록)
    const depth = url.pathname === '/' ? 0 : current ? (history.state?.app ? history.state.depth : 1) + 1 : 1;
    // fromFilm: 바로 앞 기록이 필름일 때만 닫기에서 history.back()을 쓴다
    const fromFilm = !current && url.pathname !== '/';
    if (fromFilm) filmOpener = document.activeElement;
    const state = { app: true, depth, fromFilm };
    if (replace) history.replaceState(state, '', url.pathname + url.search + url.hash);
    else history.pushState(state, '', url.pathname + url.search + url.hash);
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

  // 맨 위로 버튼(페이지가 길어 한참 내려왔을 때만)
  const toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', '맨 위로');
  toTop.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(toTop);
  toTop.addEventListener('click', () => {
    page.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    page.focus({ preventScroll: true });
  });

  // 히어로 패럴랙스 · 읽은 만큼 차는 막대 · 맨 위로 버튼(리스너는 하나만)
  page.addEventListener(
    'scroll',
    () => {
      const media0 = page.querySelector('.d-hero-media');
      const y = page.scrollTop;
      const max = page.scrollHeight - page.clientHeight;
      page.querySelector('.pg-progress')?.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : '0');
      toTop.classList.toggle('is-on', !!current && y > innerHeight * 1.2);
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
    initial: (() => {
      // 프로필 · 이력 주소로 바로 들어오면 필름 주소의 그 장면으로(부팅 뒤 그 장면에서 시작)
      const r = parse();
      if (r.name === 'film' && r.scene) history.replaceState(history.state, '', `/${location.search}#${r.scene}`);
      return r;
    })(),
    start(route) {
      if (route.name === 'film') return;
      // 바로 들어온 페이지도 깊이 1로 기록해 두면 그 안에서 이동한 뒤 닫기가 필름으로 간다
      history.replaceState({ app: true, depth: 1, fromFilm: false }, '', location.pathname + location.search + location.hash);
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
      // 프로젝트 페이지: ← → 로 이전 · 다음 프로젝트(라이트박스 · 입력 칸에서는 그대로)
      if (current.name === 'detail' && !lightbox.open && !e.target.closest?.('input, textarea') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        page.querySelector(e.key === 'ArrowRight' ? '.d-next-card' : '.d-prev-link')?.click();
        return true;
      }
      return true; // 페이지가 열려 있으면 필름 단축키를 막는다
    },
  };
}
