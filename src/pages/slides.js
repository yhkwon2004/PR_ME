// ── 프로젝트 발표 슬라이드(/works/<id>/slides) ──
// 프로젝트 기록으로 바로 발표할 수 있는 웹 슬라이드를 만든다: 표지 → 문제 → 솔루션 → 과정 → 팀 · 역할 · 기여 → 문제 해결 기록 →
// 결과 → 배운 점 · 링크. 요약(briefs.json)이 있으면 그것으로, 없으면 스토리(라벨 · 제목 · 글 · 사진)와 수치 · 수상으로 짠다.
// 데이터가 없는 슬라이드는 만들지 않는다 — 지어낸 문구는 넣지 않는다(제목 · 라벨만 고정 문구).
// 넓은 가로 화면: 1600×900 무대 한 장을 화면에 맞춰 키우고 줄인다(구도 고정). 세로 화면 · 좁은 화면: 슬라이드를 세로로 이어
// 한 화면에 한 장씩 스크롤(scroll-snap). 넘기기: ← → PageUp PageDown Space Home End · 휠 · 밀기 · 버튼, F 전체 화면, Esc 나가기.
// 인쇄(PDF로 저장): 무대 그대로 한 장에 한 쪽(1600×900). 주소의 #3은 세 번째 슬라이드.
// 이 모듈과 slides.css는 슬라이드 주소에서만 받는다(site.js가 import()로 — 필름 첫 화면의 짐을 늘리지 않게)
import '../styles/slides.css';
import { profile } from '../content.js';
import { projects, categoryOf } from '../data/projects.js';
import { awardsOf, TIER_KEY } from '../data/awards.js';
import { esc, pad, sep, hy, caps, koCls, LAUREL, isCertScan, teamHtml } from './site.js';

const W0 = 1600;
const H0 = 900;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 스토리 라벨 → 한국어 이름(눈썹 줄)
const KO = {
  PROBLEM: '문제',
  IDEA: '아이디어',
  BUILD: '제작',
  TEST: '시험',
  VERIFY: '검증',
  RESULT: '결과',
  LEARNED: '배운 점',
  FIELD: '현장',
  RESEARCH: '조사',
  AI: 'AI',
  SYSTEM: '시스템',
  PAPER: '논문',
  NEXT: '다음',
  MARKET: '시장',
  APP: '앱',
  BOOTH: '부스',
  BUSINESS: '사업',
  GUIDE: '가이드',
  COMPOSITION: '구성',
};
// 과정 슬라이드에 모으는 스토리(문제 · 결과 · 배운 점 · 다음은 따로)
const PROCESS = ['FIELD', 'RESEARCH', 'IDEA', 'BUILD', 'TEST', 'VERIFY', 'AI', 'SYSTEM', 'APP', 'BOOTH', 'GUIDE', 'COMPOSITION', 'BUSINESS'];

// 사진 한 장: 그림 비율 그대로의 칸(--ar)에 — 자르지 않는다. 과정 카드 · 표지처럼 칸이 정해진 곳에서만 CSS가 잘라 채운다
// (도면 · 문서 · 화면은 그때도 통째로)
function pic(im, { sizes = '50vw', eager = false } = {}) {
  if (!im) return '';
  const w = im.w || 1600;
  const tw = im.w && im.h ? Math.round(im.w * Math.min(1, 720 / Math.max(im.w, im.h))) : 720;
  const set = `${tw < w ? `${esc(im.thumb)} ${tw}w, ` : ''}${esc(im.src)} ${w}w`;
  const ar = clamp(im.ratio || 4 / 3, 0.5, 2.6).toFixed(3);
  return `<span class="sl-pic" data-kind="${esc(im.kind || 'photo')}" style="--ar:${ar}"><img src="${esc(im.thumb)}" srcset="${set}" sizes="${sizes}" alt="${esc(im.caption || '')}" width="${im.w || ''}" height="${im.h || ''}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></span>`;
}
const fig = (im, opts) => (im ? `<figure class="sl-fig">${pic(im, opts)}${im.caption ? `<figcaption>${sep(im.caption)}</figcaption>` : ''}</figure>` : '');
// 눈썹 줄: 번호(고정폭) · 한국어 이름(본문 글꼴) · 영문 꼬리표(고정폭)
// 한국어 이름이 여럿('배운 점 · 다음 · 더 보기')이면 이름 안에서는 줄이 바뀌지 않고 점 뒤에서만(좁은 화면은 영문 꼬리표를 접는다 — slides.css)
const eye = (no, ko, en) =>
  `<p class="sl-eye"><b>${pad(no)}</b><span class="sl-eye-ko">${ko
    .split(' · ')
    .map((t) => `<span class="nw">${esc(t)}</span>`)
    .join('&nbsp;· ')}</span>${en ? `<em>${esc(en)}</em>` : ''}</p>`;
const list = (items, cls = '') => `<ul class="sl-list ${cls}">${items.map((t) => `<li>${caps(sep(t))}</li>`).join('')}</ul>`;
// 결과 목록에서 위 큰 수치와 같은 말은 뺀다(수치 값이 그대로 든 줄 — '기대' · '예상'이 붙은 줄은 남긴다)
const notInMetrics = (metrics) => {
  const vals = metrics.map((m) => String(m.value).replace(/^[−+-]/, '').replace(/\s/g, '')).filter((v) => /\d/.test(v));
  return (t) => /기대|예상/.test(t) || !vals.some((v) => t.replace(/\s/g, '').includes(v));
};
const hostOf = (url) => {
  try {
    const u = new URL(url, location.origin);
    return u.origin === location.origin ? `${u.host}${u.pathname.replace(/\/$/, '')}` : u.host.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// 슬라이드 목록: { kind, ko, en, html } — 표지를 뺀 슬라이드에 01부터 번호
function plan(p) {
  const b = p.brief || null;
  const awards = awardsOf(p.id);
  const best = [...awards].sort((x, y) => x.tier - y.tier || y.date.localeCompare(x.date))[0] || null;
  const story = p.story;
  const find = (...labels) => labels.map((l) => story.find((s) => s.label === l)).find(Boolean) || null;
  const used = new Set();
  const take = (im) => {
    if (!im || used.has(im.file) || isCertScan(im)) return null;
    used.add(im.file);
    return im;
  };
  const pickImg = (...labels) => {
    for (const l of labels) for (const s of story) if (s.label === l && s.img && !used.has(s.img.file) && !isCertScan(s.img)) return take(s.img);
    return null;
  };
  // 아직 쓰지 않은 스토리 사진(상장 스캔 제외) — labels가 있으면 그 라벨에서만
  const spare = (labels = null) => story.filter((s) => s.img && !used.has(s.img.file) && !isCertScan(s.img) && (!labels || labels.includes(s.label)));
  const out = [];
  const push = (kind, ko, en, html) => out.push({ kind, ko, en, html });

  // 기여가 없고 역할도 한 줄 이하면 팀 장을 따로 만들지 않고 표지에 적는다 — 팀 글만 있을 때, 또는 인원 수가 있어도 팀 글이 짧을 때
  // ('4인 팀 Palette: …' — 큰 숫자 한 줄뿐인 빈 장 대신 표지의 '팀' 칸에 이름까지). 긴 구성(소속 · 대학 연합)은 팀 장에 그대로
  const contribution0 = b?.contribution || [];
  const soloTeam = !!p.team && !contribution0.length && p.role.length <= 1 && (!p.teamSize || p.team.length <= 40);
  // 표지 '팀' 칸: 팀 글에 인원 수가 없으면 앞에 붙인다
  const teamWithSize = () => (p.teamSize && !new RegExp(`(?<!\\d)${p.teamSize}\\s*(?:인|명)`).test(p.team) ? `<b class="sl-num">${p.teamSize}</b>명&nbsp;· ` : '') + teamHtml(p.team);
  // ── 표지 ──
  const cat = categoryOf(p.category);
  const no = projects.indexOf(p) + 1;
  const cover = take(p.cover);
  const lead = b?.headline || p.oneLiner;
  const coverMeta = [
    best
      ? ['수상', `<span class="sl-grade" data-tier="${TIER_KEY[best.tier]}">${LAUREL}${esc(best.grade)}</span> ${hy(esc(best.contest))}${awards.length > 1 ? ` <small>외&nbsp;${awards.length - 1}건</small>` : ''}`]
      : p.awards.length
        ? ['수상', sep(p.awards[0])]
        : null,
    soloTeam ? ['팀', teamWithSize()] : p.teamSize ? ['팀', `<b class="sl-num">${p.teamSize}</b>명`] : p.team && p.team.length <= 24 ? ['팀', teamHtml(p.team)] : null,
    p.role.length ? ['내 역할', `${sep(p.role[0])}${p.role.length > 1 ? ` <small>외&nbsp;${p.role.length - 1}</small>` : ''}`] : null,
  ].filter(Boolean);
  push(
    'cover',
    '표지',
    '',
    `<div class="sl-cover${cover ? '' : ' no-img'}">
      ${cover ? `<div class="sl-cover-media">${pic(cover, { sizes: '(orientation: portrait) 100vw, 64vw', eager: true })}</div>` : `<div class="sl-cover-type" aria-hidden="true"><b>${esc(p.titleEn || p.title)}</b></div>`}
      <div class="sl-cover-text">
        <p class="sl-kick"><span>PROJECT ${pad(no)}</span><span class="${koCls(cat.label).trim()}">${esc(cat.label)}</span>${p.period || p.year ? `<span>${sep(p.period || p.year)}</span>` : ''}</p>
        <h1 class="sl-title">${sep(p.title)}</h1>
        ${p.titleEn ? `<p class="sl-title-en">${esc(p.titleEn)}</p>` : ''}
        ${lead ? `<p class="sl-lead">${caps(hy(sep(lead)))}</p>` : ''}
        ${coverMeta.length ? `<dl class="sl-cover-meta">${coverMeta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
      </div>
    </div>`
  );

  // 글 + 사진 한 장(사진이 없으면 글만 넓게)
  const split = ({ heading, text, img, rev = false, extra = '' }) =>
    `<div class="sl-split${img ? '' : ' no-img'}${rev ? ' is-rev' : ''}">
      <div class="sl-text">
        ${heading ? `<h2 class="sl-h">${caps(sep(heading))}</h2>` : ''}
        ${text ? `<p class="sl-p${heading ? '' : ' is-statement'}">${caps(sep(text))}</p>` : ''}
        ${extra}
      </div>
      ${img ? fig(img, { sizes: '(orientation: portrait) 100vw, 46vw' }) : ''}
    </div>`;
  const toolsHtml = p.tools.length ? `<div class="sl-tools"><h3 class="sl-k">도구</h3><ul>${p.tools.map((t) => `<li class="${koCls(t).trim()}">${esc(t)}</li>`).join('')}</ul></div>` : '';

  // 과정: 아직 쓰지 않은 스토리 사진(최대 6장씩)
  const processSlides = (labels) => {
    const items = story.filter((s) => labels.includes(s.label) && s.img && !used.has(s.img.file) && !isCertScan(s.img));
    for (let k = 0; k < items.length; k += 6) {
      const part = items.slice(k, k + 6);
      // 한 장만 남으면 과정 슬라이드를 만들지 않는다(상세 페이지의 스토리 · 갤러리에 있다)
      if (part.length < 2) break;
      part.forEach((s) => used.add(s.img.file));
      const many = part.length > 3;
      push(
        'process',
        '과정',
        'PROCESS',
        `<ol class="sl-steps n-${part.length}">${part
          .map(
            (s) => `<li class="sl-step"><div class="sl-step-media">${pic(s.img, { sizes: `(orientation: portrait) 100vw, ${many ? 28 : 32}vw` })}</div><p class="sl-step-k"><span>${esc(s.label)}</span>${KO[s.label] && KO[s.label] !== s.label ? `<span class="sl-step-ko">${esc(KO[s.label])}</span>` : ''}</p><h3>${caps(sep(s.title))}</h3>${many ? '' : `<p class="sl-step-t">${caps(sep(s.text))}</p>`}</li>`
          )
          .join('')}</ol>`
      );
    }
  };

  // 팀 · 역할 · 기여
  const teamSlide = (contribution = []) => {
    // 역할 한 줄뿐이면(표지에 이미 있다) 따로 한 장을 만들지 않는다 — 팀 글뿐이어도(soloTeam) 표지에
    if (!p.teamSize && !p.team && !contribution.length && p.role.length <= 1) return;
    if (soloTeam) return;
    const cols = [
      p.teamSize || p.team
        ? `<div class="sl-col"><h3 class="sl-k">${p.teamSize ? '참여 인원' : '팀'}</h3>${p.teamSize ? `<p class="sl-big"><b>${p.teamSize}</b><span>명</span></p>` : ''}${p.team ? `<p class="sl-small${p.teamSize ? '' : ' is-lead'}">${caps(teamHtml(p.team))}</p>` : ''}</div>`
        : '',
      p.role.length ? `<div class="sl-col"><h3 class="sl-k">내 역할</h3>${list(p.role)}</div>` : '',
      contribution.length ? `<div class="sl-col is-wide"><h3 class="sl-k">기여</h3>${list(contribution, 'is-num')}</div>` : '',
    ].filter(Boolean);
    if (cols.length) push('team', '팀 · 역할 · 기여', 'TEAM · ROLE', `<div class="sl-team n-${cols.length}">${cols.join('')}</div>`);
  };

  // 결과: 큰 수치 · 결과 목록(없으면 결과 스토리) · 대표 상장
  // 돌려주는 값: 결과 장을 만들지 않고 마지막 장으로 넘길 결과 목록(짧은 목록인데 곁들일 사진이 없을 때)
  const resultSlide = (results0) => {
    const rs = find('RESULT');
    const metrics = p.metrics.slice(0, 4);
    const results = results0.filter(notInMetrics(metrics));
    const award = best && (best.certs[0] || best.photo) ? best : awards.find((a) => a.certs[0] || a.photo) || null;
    const awardImg = award?.certs[0]
      ? `<span class="sl-sheet"><img src="${esc(award.certs[0].md)}" srcset="${esc(award.certs[0].thumb)} 480w, ${esc(award.certs[0].md)} 720w, ${esc(award.certs[0].src)} 1132w" sizes="(orientation: portrait) 50vw, 18vw" alt="${esc(award.contest)} 상장" width="1132" height="1600" loading="lazy" decoding="async" /></span>`
      : award?.photo && !used.has(award.photo.file)
        ? `<span class="sl-sheet is-photo">${pic(take(award.photo), { sizes: '(orientation: portrait) 100vw, 30vw' })}</span>`
        : '';
    // 수치 · 수상 없이 결과 스토리뿐이면 다른 스토리 슬라이드처럼 글 | 사진으로
    if (!metrics.length && !results.length && !award && !p.awards.length) {
      if (rs) push('result', '결과', 'RESULTS', split({ heading: rs.title, text: rs.text, img: take(rs.img) }));
      return;
    }
    const body = results.length ? list(results, 'is-check') : rs ? `${rs.title ? `<h3 class="sl-h3">${caps(sep(rs.title))}</h3>` : ''}<p class="sl-p">${caps(sep(rs.text))}</p>` : '';
    const awardHtml = award || best ? (() => {
      const a = award || best;
      return `<figure class="sl-award${awardImg ? '' : ' no-img'}">${awardImg}<figcaption><span class="sl-grade" data-tier="${TIER_KEY[a.tier]}">${LAUREL}${esc(a.grade)}</span><b>${hy(esc(a.contest))}</b><time datetime="${esc(a.date)}">${esc(a.date.replace(/-/g, '.'))}</time></figcaption></figure>`;
    })() : '';
    if (!metrics.length && !body && !awardHtml && !p.awards.length) return;
    const textAwards = !awards.length && p.awards.length && !results.length ? list(p.awards, 'is-check') : '';
    // 수치 · 상 없이 결과 세 줄 이하: 큰 글자 목록 | 아직 쓰지 않은 사진(결과 스토리의 사진부터). 사진도 없으면 마지막 장에 합친다
    if (!metrics.length && !awardHtml && !textAwards && results.length && results.length <= 3) {
      const im = rs?.img && !used.has(rs.img.file) && !isCertScan(rs.img) ? rs.img : spare()[0]?.img;
      if (!im) return results;
      push('result', '결과', 'RESULTS', split({ img: take(im), extra: list(results, 'is-check is-lg') }));
      return;
    }
    push(
      'result',
      '결과',
      'RESULTS',
      `${metrics.length ? `<dl class="sl-metrics n-${metrics.length}">${metrics.map((m) => `<div><dd>${esc(m.value)}</dd><dt>${sep(m.label)}</dt></div>`).join('')}</dl>` : ''}
      <div class="sl-res${awardHtml ? '' : ' no-award'}">
        <div class="sl-res-text">${body}${textAwards}</div>
        ${awardHtml}
      </div>`
    );
  };

  // 배운 점 · 다음 · 링크(늘 마지막 — 프로젝트 페이지 주소와 연락처)
  const closeSlide = (learned, carried = []) => {
    const nx = b?.next ? { title: '', text: b.next } : find('NEXT');
    const links = [{ label: '프로젝트 페이지', url: p.path }, ...p.links];
    const mail = profile.links.find((l) => l.url.startsWith('mailto:'));
    // 눈썹 줄: 있는 것만(배운 점 · 다음 · 더 보기)
    const parts = [carried.length && ['결과', 'RESULTS'], learned && ['배운 점', 'LEARNED'], nx && ['다음', 'NEXT'], ['더 보기', 'LINKS']].filter(Boolean);
    push(
      'close',
      parts.map((x) => x[0]).join(' · '),
      parts.map((x) => x[1]).join(' · '),
      `<div class="sl-close${carried.length ? ' has-res' : ''}">
        ${
          carried.length
            ? `<div class="sl-close-main"><div class="sl-close-res"><h3 class="sl-k">결과</h3>${list(carried, 'is-check')}</div>${learned ? `<blockquote class="sl-quote is-sub"><p>${caps(sep(learned))}</p></blockquote>` : ''}</div>`
            : learned
            ? `<blockquote class="sl-quote"><p>${caps(sep(learned))}</p></blockquote>`
            : // 배운 점이 없으면 프로젝트 이름으로 맺는다
              `<div class="sl-end"><p class="sl-end-k">${esc(cat.label)}${p.period || p.year ? `&nbsp;· ${sep(p.period || p.year)}` : ''}</p><h2 class="sl-end-t">${sep(p.title)}</h2>${lead ? `<p class="sl-end-l">${caps(hy(sep(lead)))}</p>` : ''}</div>`
        }
        <div class="sl-close-side">
          ${nx ? `<div class="sl-next"><h3 class="sl-k">다음</h3><p>${nx.title ? `<b>${caps(sep(nx.title))}</b> ` : ''}${caps(sep(nx.text))}</p></div>` : ''}
          <div class="sl-links"><h3 class="sl-k">더 보기</h3><ul>${links
            .map((l) => {
              const ext = /^https?:/.test(l.url);
              return `<li><a href="${esc(l.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}><span>${sep(l.label)}</span><small>${esc(hostOf(l.url))}</small></a></li>`;
            })
            .join('')}</ul></div>
        </div>
      </div>
      <p class="sl-sign"><b>${esc(profile.name)}</b><span>${sep(`${profile.en} · ${profile.role}`)}</span>${mail ? `<a href="${esc(mail.url)}">${esc(mail.value)}</a>` : ''}</p>`
    );
  };

  if (b) {
    // 요약이 있으면: 문제 → 솔루션 → 과정 → 팀 · 역할 · 기여 → 문제 해결 기록 → 결과 → 배운 점
    const ps = find('PROBLEM');
    const problem = b.problem || ps?.text || '';
    if (problem) push('problem', '문제', 'PROBLEM', split({ heading: ps?.title || '', text: problem, img: pickImg('PROBLEM', 'FIELD', 'RESEARCH') }));
    const is = find('IDEA', 'BUILD');
    const solution = b.solution || is?.text || '';
    const solHead = is && is.title !== b.headline ? is.title : '';
    // 솔루션 사진: 아이디어 · 제작 · 시스템 · 앱 사진, 없으면 과정 사진 한 장(과정 장이 두 장 묶음을 잃지 않을 때만 — 남는 사진이 2장이면 과정 장에 둔다)
    const solImg = () => {
      const im = pickImg('IDEA', 'BUILD', 'SYSTEM', 'APP');
      if (im) return im;
      const rest = spare(PROCESS);
      return rest.length && rest.length !== 2 ? take(rest[0].img) : null;
    };
    if (solution) push('solution', '솔루션', 'SOLUTION', split({ heading: solHead, text: solution, img: solImg(), rev: true, extra: toolsHtml }));
    processSlides(PROCESS);
    teamSlide(b.contribution);
    for (let k = 0; k < b.troubles.length; k += 3) {
      const part = b.troubles.slice(k, k + 3);
      push(
        'trouble',
        '문제 해결 기록',
        'TROUBLESHOOTING',
        `<ol class="sl-trbl n-${part.length}">${part
          .map(
            (t, j) => `<li><span class="sl-tno">${pad(k + j + 1)}</span>${[
              ['문제', t.issue, ''],
              ['해결', t.fix, ''],
              ['결과', t.outcome, ' is-out'],
            ]
              .filter(([, v]) => v)
              .map(([kk, v, c]) => `<div class="sl-tcell${c}"><h3 class="sl-k">${kk}</h3><p>${caps(sep(v))}</p></div>`)
              .join('')}</li>`
          )
          .join('')}</ol>`
      );
    }
    const carried = resultSlide(b.results) || [];
    closeSlide(b.learned || find('LEARNED')?.text || '', carried);
  } else {
    // 요약이 없으면: 스토리 한 꼭지가 한 장(문제 · 아이디어 · 제작 · 시험 …) → 팀 · 역할 → 결과 → 배운 점
    const told = story.filter((s) => !['RESULT', 'LEARNED', 'NEXT'].includes(s.label));
    // 도구는 제작 꼭지에(없으면 아이디어 · 문제가 아닌 첫 꼭지에) 한 번
    const toolAt = [told.findIndex((s) => s.label === 'BUILD'), told.findIndex((s) => s.label === 'IDEA'), told.findIndex((s) => s.label !== 'PROBLEM')].find((k) => k >= 0) ?? -1;
    told.forEach((s, k) => push('story', KO[s.label] || s.label, s.label, split({ heading: s.title, text: s.text, img: take(s.img), rev: k % 2 === 1, extra: k === toolAt ? toolsHtml : '' })));
    teamSlide([]);
    resultSlide([]);
    closeSlide(find('LEARNED')?.text || '');
  }
  return out;
}

export function slidesPage(p) {
  const c = categoryOf(p.category);
  const list = plan(p);
  const N = list.length;
  let n = 0;
  const slides = list
    .map((s, k) => {
      if (s.kind !== 'cover') n++;
      return `<section class="sl" data-kind="${s.kind}" role="group" aria-roledescription="슬라이드" aria-label="${k + 1} / ${N} — ${esc(s.ko)}">
        <div class="sl-stage">
          <div class="sl-in">
            ${s.kind === 'cover' ? '' : eye(n, s.ko, s.en)}
            <div class="sl-body">${s.html}</div>
          </div>
          <footer class="sl-foot" aria-hidden="true"><span><b>${esc(profile.name)}</b> Physical AI Portfolio</span><span class="sl-foot-t">${sep(p.title)}</span><span class="sl-foot-n">${pad(k + 1)} / ${pad(N)}</span></footer>
        </div>
      </section>`;
    })
    .join('');
  return `<div class="pg pg-slides" data-cat="${esc(p.category)}" data-id="${esc(p.id)}">
    <div class="sl-view" aria-label="${esc(p.title)} 발표 슬라이드 ${N}장">${slides}</div>
    <header class="sl-top">
      <a class="sl-back" href="${p.path}" data-exit><span aria-hidden="true">←</span> 프로젝트 페이지</a>
      <p class="sl-name"><span class="${koCls(c.label).trim()}">${esc(c.label)}</span><b>${sep(p.title)}</b></p>
      <p class="sl-count" aria-live="polite"><b>01</b> / ${pad(N)}</p>
    </header>
    <nav class="sl-ctrl" aria-label="슬라이드 넘기기">
      <button type="button" class="sl-btn" data-prev aria-label="이전 슬라이드"><span aria-hidden="true">←</span></button>
      <button type="button" class="sl-btn" data-next aria-label="다음 슬라이드"><span aria-hidden="true">→</span></button>
      <button type="button" class="sl-btn is-text" data-full aria-pressed="false" title="전체 화면 (F)">전체 화면</button>
      <button type="button" class="sl-btn is-text" data-print title="PDF로 저장 — 한 장에 한 쪽">PDF</button>
    </nav>
    <p class="sl-keys" aria-hidden="true"><kbd>←</kbd> <kbd>→</kbd> 넘기기&nbsp;· <kbd>F</kbd> 전체 화면&nbsp;· <kbd>Esc</kbd> 나가기</p>
    <i class="sl-prog" aria-hidden="true"><i></i></i>
  </div>`;
}

// 슬라이드 넘김 · 화면 맞춤 · 인쇄 — 돌려주는 key(e)는 site.js가 키를 넘긴다
export function createDeck(root, { reducedMotion = false, onExit } = {}) {
  const view = root.querySelector('.sl-view');
  const slides = [...root.querySelectorAll('.sl')];
  const N = slides.length;
  const countEl = root.querySelector('.sl-count b');
  const fullBtn = root.querySelector('[data-full]');
  // 세로 화면 · 좁은 화면 · 낮은 가로 화면(눕힌 휴대폰 — 무대를 0.43배로 줄이면 글자가 8px 아래로 내려간다)은 글이 다시 흐르는 세로 넘김
  const mq = matchMedia('(orientation: portrait), (max-width: 559px), (max-height: 500px) and (orientation: landscape)');
  const fine = matchMedia('(pointer: fine)').matches; // 마우스: 조작 막대가 더 빨리 걷힌다
  const canFull = !!document.fullscreenEnabled;
  let flow = mq.matches; // 세로로 이어 스크롤
  let index = 0;
  let alive = true;
  let warmOn = false; // 첫 장을 그린 뒤 켠다(warm)
  const offs = [];
  const on = (t, ev, fn, o) => {
    t.addEventListener(ev, fn, o);
    offs.push(() => t.removeEventListener(ev, fn, o));
  };

  const fromHash = () => {
    const n = parseInt(location.hash.slice(1), 10);
    return Number.isFinite(n) ? clamp(n - 1, 0, N - 1) : 0;
  };
  index = fromHash();

  // 무대 크기: 1600×900을 화면에 맞춘다
  function scale() {
    const s = Math.min(innerWidth / W0, innerHeight / H0);
    root.style.setProperty('--s', s.toFixed(4));
  }
  // 넘치는 슬라이드만 글자를 조금씩 줄인다(무대 크기는 늘 같으니 한 번 재면 된다 — 세로 화면에서도 인쇄를 위해 무대로 잰다)
  function fit() {
    const was = root.classList.contains('is-flow');
    root.classList.remove('is-flow');
    slides.forEach((sl) => {
      const st = sl.querySelector('.sl-stage');
      // 본문 칸과 표지 글 칸 — 어느 쪽이든 넘치면
      const boxes = [sl.querySelector('.sl-body'), ...sl.querySelectorAll('.sl-cover-text')];
      const over = () => boxes.some((b) => b.scrollHeight > b.clientHeight + 2);
      st.style.removeProperty('--k');
      let k = 1;
      for (let i = 0; i < 6 && over(); i++) {
        k = +(k - 0.06).toFixed(2);
        st.style.setProperty('--k', k);
      }
    });
    root.classList.toggle('is-flow', was);
  }
  function setMode() {
    flow = mq.matches;
    root.classList.toggle('is-flow', flow);
    scale();
    paint();
    if (flow) slides[index].scrollIntoView({ block: 'start' });
  }

  function hash() {
    const url = `${location.pathname}${location.search}${index ? `#${index + 1}` : ''}`;
    if (url !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', url);
  }
  function count() {
    countEl.textContent = pad(index + 1);
    root.style.setProperty('--p', ((index + 1) / N).toFixed(4));
    root.querySelector('[data-prev]').disabled = index === 0;
    root.querySelector('[data-next]').disabled = index === N - 1;
  }
  function paint() {
    slides.forEach((sl, k) => {
      const hide = !flow && k !== index;
      sl.classList.toggle('is-on', k === index);
      sl.classList.toggle('is-past', k < index);
      sl.inert = hide;
      sl.setAttribute('aria-hidden', String(hide));
    });
    count();
    warm();
  }
  // 앞뒤 한 장의 사진은 미리 받아 둔다(넘길 때 비지 않게) — 나머지는 그 장에 가까워질 때 · 인쇄할 때(휴대폰에서 한꺼번에 받지 않게)
  function warm() {
    if (!warmOn) return;
    for (const k of [index - 1, index + 1]) slides[k]?.querySelectorAll('img[loading="lazy"]').forEach((im) => (im.loading = 'eager'));
  }
  function go(i, { smooth = true } = {}) {
    i = clamp(i, 0, N - 1);
    if (i === index && !flow) return;
    index = i;
    if (flow) {
      flowLock = performance.now() + 900;
      slides[i].scrollIntoView({ block: 'start', behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
    }
    paint();
    hash();
  }
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  // 세로 화면: 스크롤로 보고 있는 슬라이드를 따라 번호 · 주소를 맞춘다(키로 넘기는 동안은 기다린다)
  let flowLock = 0;
  const io = new IntersectionObserver(
    (entries) => {
      if (!flow || performance.now() < flowLock) return;
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!vis) return;
      const k = slides.indexOf(vis.target);
      if (k >= 0 && k !== index) {
        index = k;
        paint();
        hash();
      }
    },
    { root: view, threshold: [0.55] }
  );
  slides.forEach((sl) => io.observe(sl));

  // 전체 화면
  function toggleFull() {
    if (!canFull) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  const onFull = () => {
    fullBtn.setAttribute('aria-pressed', String(!!document.fullscreenElement));
    fullBtn.textContent = document.fullscreenElement ? '전체 화면 끝' : '전체 화면';
    root.classList.toggle('is-full', !!document.fullscreenElement);
  };
  if (!canFull) fullBtn.hidden = true;
  on(document, 'fullscreenchange', onFull);

  // 인쇄 · PDF: 사진을 모두 받은 뒤 인쇄 창을 연다(Ctrl+P도 그 순간 받을 수 있는 것은 받는다)
  const imgs = () => [...root.querySelectorAll('.sl img')];
  const loadAll = () => {
    imgs().forEach((im) => {
      im.loading = 'eager';
      im.classList.add('is-loaded');
    });
    return Promise.race([
      Promise.all(
        imgs().map((im) =>
          im.complete
            ? 0
            : new Promise((r) => {
                im.addEventListener('load', r, { once: true });
                im.addEventListener('error', r, { once: true });
              })
        )
      ),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  };
  async function printDeck() {
    await loadAll();
    await document.fonts?.ready;
    print();
  }
  on(window, 'beforeprint', () => loadAll());

  // 휠 한 번에 한 장(트랙패드 관성이 이어지는 동안은 잠근다)
  let acc = 0;
  let lockUntil = 0;
  let accT = 0;
  on(
    root,
    'wheel',
    (e) => {
      if (flow) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lockUntil) {
        lockUntil = Math.max(lockUntil, now + 140);
        return;
      }
      acc += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      clearTimeout(accT);
      accT = setTimeout(() => (acc = 0), 220);
      if (Math.abs(acc) > 40) {
        acc > 0 ? next() : prev();
        acc = 0;
        lockUntil = now + 600;
      }
    },
    { passive: false }
  );

  // 밀어 넘기기(손가락 · 펜): 옆으로 40px 넘게
  let sx = 0;
  let sy = 0;
  let st = 0;
  on(view, 'pointerdown', (e) => {
    if (flow || e.pointerType === 'mouse') return;
    sx = e.clientX;
    sy = e.clientY;
    st = performance.now();
  });
  on(view, 'pointerup', (e) => {
    if (flow || e.pointerType === 'mouse' || !st) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    st = 0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) dx < 0 ? next() : prev();
  });
  on(view, 'pointercancel', () => (st = 0));

  // 조작 막대: 손을 쉬면 걷힌다(발표 화면 · 낮은 가로 휴대폰에서 슬라이드를 가리지 않게) — 마우스를 움직이거나 화면을 누르면 다시
  let idleT = 0;
  const wake = () => {
    root.classList.remove('is-idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => !root.matches(':focus-within') && root.classList.add('is-idle'), fine ? 2600 : 3200);
  };
  on(root, 'pointermove', (e) => e.pointerType === 'mouse' && wake());
  on(root, 'pointerdown', wake);
  on(root, 'focusin', wake);
  wake();

  on(root.querySelector('[data-prev]'), 'click', prev);
  on(root.querySelector('[data-next]'), 'click', next);
  on(fullBtn, 'click', toggleFull);
  on(root.querySelector('[data-print]'), 'click', printDeck);
  // '← 프로젝트 페이지' · 마지막 장의 '프로젝트 페이지' 링크: 늘 그 프로젝트 페이지로(onExit('page')) — Esc는 site.js가 onExit('esc')로
  on(root.querySelector('[data-exit]'), 'click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onExit?.('page');
  });
  root.querySelectorAll(`.sl a[href="${root.querySelector('[data-exit]').getAttribute('href')}"]`).forEach((a) =>
    on(a, 'click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      onExit?.('page');
    })
  );
  on(mq, 'change', setMode);
  on(window, 'resize', scale);
  // 주소창에서 #5로 고치면 그 장으로(잘못된 #는 지금 장의 주소로 바로잡는다 — replaceState는 hashchange를 내지 않는다)
  on(window, 'hashchange', () => {
    go(fromHash(), { smooth: false });
    hash();
  });

  // 숫자 + Enter로 그 장으로
  let typed = '';
  let typedT = 0;
  let lastKey = 0;
  function key(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return false;
    if (e.target.closest?.('input, textarea, select')) return false;
    const k = e.key;
    // 단추 · 링크에 포커스가 있으면 Space · Enter는 그 단추를 누른다(이전 단추에서 Space가 다음 장으로 가지 않게)
    if ((k === ' ' || k === 'Enter') && e.target.closest?.('button, a')) {
      typed = '';
      return false;
    }
    const now = performance.now();
    const step = (fn) => {
      e.preventDefault();
      if (e.repeat && now - lastKey < 180) return true;
      lastKey = now;
      fn();
      return true;
    };
    if (/^[0-9]$/.test(k)) {
      typed = (typed + k).slice(-3);
      clearTimeout(typedT);
      typedT = setTimeout(() => (typed = ''), 1500);
      return true;
    }
    if (k === 'Enter' && typed) {
      e.preventDefault();
      go(parseInt(typed, 10) - 1);
      typed = '';
      return true;
    }
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) return step(next);
    if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace' || (k === ' ' && e.shiftKey)) return step(prev);
    if (k === 'Home') return step(() => go(0));
    if (k === 'End') return step(() => go(N - 1));
    if (k === 'f' || k === 'F') {
      e.preventDefault();
      toggleFull();
      return true;
    }
    return false;
  }

  // 처음: 무대 맞춤 → 글꼴이 오면 넘침 재기 → 그 장으로
  root.classList.toggle('is-flow', flow);
  if (reducedMotion) root.classList.add('is-still');
  scale();
  fit();
  document.fonts?.ready.then(() => alive && fit());
  paint();
  if (flow && index) requestAnimationFrame(() => slides[index].scrollIntoView({ block: 'start' }));
  // 들어선 뒤에야 넘김 움직임을 켠다(첫 장이 미끄러져 들어오지 않게)
  requestAnimationFrame(() => requestAnimationFrame(() => alive && root.classList.add('is-ready')));
  // 첫 장을 그린 뒤부터 앞뒤 장의 사진을 미리 받는다(warm)
  const warmT = setTimeout(() => {
    warmOn = true;
    warm();
  }, 1200);

  return {
    key,
    go,
    get index() {
      return index;
    },
    get count() {
      return N;
    },
    destroy() {
      alive = false;
      clearTimeout(idleT);
      clearTimeout(warmT);
      clearTimeout(accT);
      clearTimeout(typedT);
      io.disconnect();
      offs.forEach((f) => f());
      if (document.fullscreenElement) document.exitFullscreen?.();
    },
  };
}
