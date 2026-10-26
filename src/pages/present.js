// ── 발표 자료(/present) — 표지 → 01 자기소개 → 02 보유 역량 분석 → 03 프로젝트 경험 → 04 미래 계획 → 마치며 ──
// 쪽(data-sec) → 화면(data-grp) → 블록(.jr-b)으로 적는다. ui/pager.js가 넓은 화면에서는 1600×900 무대에 화면 한 장씩(data-layout의 구도대로),
// 휴대폰 · 세로 화면에서는 블록을 화면 크기에 맞춰 나눠 담는다. 문장 · 숫자는 모두 기록(content · data)에서 — 지어내지 않는다.
import { projects, byId, CATEGORIES, categoryOf, FEATURED } from '../data/projects.js';
import { profile, scenes } from '../content.js';
import { AWARDS, awardsOf, TIER_KEY, TIER_LABEL } from '../data/awards.js';
import { HISTORY } from '../data/history.js';
import { PRESS } from '../data/press.js';
import { DOMAIN_SKILLS, CERTS, SKILL_COUNT } from '../data/skills.js';
import { STAGES, VALUES, PRELUDE } from '../data/growth.js';
import { SWOT, STRATEGY, PLAN, TARGET, JOURNEY_SOURCE } from '../data/journey.js';

// 발표 순서(위 탭 · 목차 · 장 표지)
export const PR_SECS = [
  ['about', '자기소개', 'ABOUT ME', '소개'],
  ['ability', '보유 역량 분석', 'COMPETENCY', '역량'],
  ['work', '프로젝트 경험', 'PROJECTS', '프로젝트'],
  ['plan', '미래 계획', 'FUTURE PLAN', '계획'],
];

// 사이트 쪽 도우미(글자 이스케이프 · 사진 · 상장)를 받아 덱을 만든다
export function presentDeck({ esc, pad, img, certSheet, certCaption }) {
  const media = [];
  const grand = AWARDS.filter((a) => a.tier === 1);
  const feat = FEATURED.map(byId).filter(Boolean);
  const coverOf = (id) => byId(id)?.cover || null;
  // 프로젝트의 n번째 사진(파일 이름 01 · 02 …) — 없으면 대표 사진
  const shotOf = (id, n) => {
    const p = byId(id);
    return p?.images.find((im) => im.src.endsWith(`/${n}.webp`))?.src || p?.cover?.src || '';
  };
  // 상세 페이지에 있는 것(사진 n장 · 영상 n편)
  const mediaNote = (p) => [p.images.length && `사진 ${p.images.length}장`, p.videos?.length && `영상 ${p.videos.length}편`].filter(Boolean).join(' · ');
  const fields = CATEGORIES.map((c) => ({ c, n: projects.filter((p) => p.category === c.id).length })).filter((x) => x.n);

  // 화면 하나: layout은 넓은 화면의 구도 — flow='cols'면 좁은 가로 화면에서 두 단, bare는 위 · 아래 표시 없이(표지 · 장 표지)
  const grp = (id, o, inner) =>
    `<div data-grp="${id}" data-title="${esc(o.title || '')}" data-layout="${o.layout || 'stack'}"${o.flow ? ` data-flow="${o.flow}"` : ''}${o.anchor ? ` data-anchor="${o.anchor}"` : ''}${o.stage ? ` data-stage="${o.stage}"` : ''}${o.q ? ` data-q="${o.q}"` : ''}${o.step ? ` data-step="${o.step}"` : ''}${o.bg ? ` data-bg="${esc(o.bg)}"` : ''}${o.bare ? ' data-bare' : ''}>${inner}</div>`;
  const head = (over, h, lead = '') => `<header class="pv-head" data-head>${over ? `<p class="pv-over">${over}</p>` : ''}<h2>${h}</h2>${lead ? `<p class="pv-lead">${lead}</p>` : ''}</header>`;
  // 프로젝트 칩(이름만) — 누르면 그 프로젝트
  const chip = (id) => {
    const p = byId(id);
    return p ? `<a class="pv-chip" href="${p.path}" data-link data-cat="${esc(p.category)}">${esc(p.title)}</a>` : '';
  };
  const chips = (ids) => `<p class="pv-chips">${ids.map(chip).join('')}</p>`;
  // 사진 타일(사진 · 이름 · 연도 · 분야)
  const tile = (p, { href = p.path, go = '', no = '' } = {}) =>
    `<a class="pv-tile" href="${href}"${go ? ` data-jr-go="${go}"` : ' data-link'} data-cat="${esc(p.category)}"><span class="pv-tile-ph">${p.cover ? img(p.cover, { sizes: '(max-width: 700px) 46vw, 320px' }) : `<i>${esc(categoryOf(p.category).label)}</i>`}</span><span class="pv-tile-t">${no ? `<em>${no}</em>` : ''}<b>${esc(p.title)}</b><small>${esc(p.year)} · ${esc(categoryOf(p.category).ko)}</small></span></a>`;
  // 큰 숫자 한 칸
  const num = (n, label, sub = '') => `<div><dd>${n}${sub ? `<small>${sub}</small>` : ''}</dd><dt>${label}</dt></div>`;
  const stats = () =>
    `<dl class="jr-b pv-stats">${num(projects.length, '프로젝트')}${num(AWARDS.length, '수상', `대상 ${grand.length}`)}${num(CERTS.length, '자격')}${num(PRESS.length, '공식 보도')}</dl>`;
  // 가로 막대(한 축 · 값은 막대 끝) + 화면 읽기용 표
  const bars = (title, rows, kind = 'p') => {
    const max = Math.max(...rows.map((r) => r.n));
    return `<figure class="jr-b pv-bars is-${kind}"><figcaption>${title}</figcaption><ol>${rows
      .map((r, k) => `<li style="--i:${k}"><span class="pv-bar-l">${esc(r.label)}</span><span class="pv-bar"><i style="--v:${(r.n / max).toFixed(3)}"></i><b>${r.n}</b></span></li>`)
      .join('')}</ol><table class="sr-only"><caption>${title}</caption>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.n}</td></tr>`).join('')}</table></figure>`;
  };
  const link = (href, text, go = '') => `<a class="pv-more" href="${href}"${go ? ` data-jr-go="${go}"` : href.startsWith('#') ? '' : ' data-link'}>${text}<i aria-hidden="true">→</i></a>`;

  // 장 표지: 큰 번호 · 장 이름 · 이 장에서 볼 화면들
  const chapter = (k, desc, list, bg) => {
    const [id, ko, en] = PR_SECS[k];
    return grp(
      `ch-${id}`,
      { title: ko, layout: 'chapter', anchor: id, bare: true, bg },
      `<div class="jr-b pv-ch">
        <p class="pv-ch-no" aria-hidden="true">${pad(k + 1)}</p>
        <div class="pv-ch-t"><p class="pv-over">CHAPTER ${pad(k + 1)} — ${en}</p><h2>${ko}</h2><p class="pv-ch-d">${desc}</p></div>
        <ol class="pv-ch-list">${list.map((t, i) => `<li><b>${pad(i + 1)}</b>${t}</li>`).join('')}</ol>
      </div>`
    );
  };

  // ── 표지 · 발표 순서 ──
  function intro() {
    const shots = ['baja-ev-formula', 'pixhawk-drone', 'quadruped-robot', 'iot-iv-pole'].map(byId).filter((p) => p?.cover);
    const cover = grp(
      'cover',
      { title: '표지', layout: 'cover', bare: true },
      `<div class="jr-b pv-cover">
        <p class="pv-over">PORTFOLIO ${esc(profile.span)} — ${esc(profile.role)}</p>
        <h1 class="pv-name">${esc(profile.name)}<span>${esc(profile.en)}</span></h1>
        <p class="pv-role">${esc(profile.roleKo)}</p>
        <p class="pv-motto">${esc(profile.motto)}</p>
      </div>
      ${stats()}
      <div class="jr-b pv-mosaic" aria-hidden="true">${shots.map((p) => `<span class="pv-mo">${img(p.cover, { sizes: '(max-width: 700px) 50vw, 520px' })}</span>`).join('')}</div>`
    );
    const desc = {
      about: '소개 · 학력 · 세 학년의 성장 과정 · 가치관',
      ability: '핵심 역량 세 축 · 분야별 기술 · 자격 · SWOT · 대응 전략',
      work: `분야별 프로젝트 · 대표 프로젝트 ${feat.length} · 해마다의 기록 · 수상 · 보도`,
      plan: `지원 직무 · 지금 → 다음 → 진로 목표`,
    };
    const agenda = grp(
      'agenda',
      { title: '발표 순서', layout: 'agenda', anchor: 'contents' },
      head('CONTENTS', '발표 순서') +
        `<nav class="jr-b pv-agenda" aria-label="발표 순서" data-split>${PR_SECS.map(
          ([id, ko, en], k) => `<a href="#${id}" data-jr-go="${id}" data-c="${id}"><b>${pad(k + 1)}</b><span class="pv-ag-t"><strong>${ko}</strong><em>${en}</em></span><small>${desc[id]}</small><i aria-hidden="true">→</i></a>`
        ).join('')}</nav>
        <p class="jr-b pv-keys"><span><kbd>←</kbd><kbd>→</kbd>넘기기</span><span><kbd>1</kbd>—<kbd>4</kbd>장 이동</span><span><kbd>F</kbd>전체 화면</span><span><kbd>B</kbd>화면 가리기</span><span class="pv-keys-t">옆으로 끌거나 위로 밀어도 넘어갑니다</span></p>`
    );
    return cover + agenda;
  }

  // ── 01 자기소개 ──
  function about() {
    const edu = profile.education || [];
    const now = edu.filter((e) => e.note !== '입학');
    const links = profile.links.filter((l) => /Email|GitHub|Notion/.test(l.label));
    const me = grp(
      'me',
      { title: '소개', layout: 'profile', anchor: 'about' },
      `${profile.photo ? `<figure class="jr-b pv-photo"><img src="${esc(profile.photo.src)}" width="${profile.photo.w}" height="${profile.photo.h}" alt="${esc(profile.name)} 증명사진" /></figure>` : ''}
      <div class="jr-b pv-id">
        <p class="pv-over">${esc(profile.role)}</p>
        <h2 class="pv-nm">${esc(profile.name)}<span>${esc(profile.en)}</span></h2>
        <blockquote class="pv-quote">${esc(profile.motto)}</blockquote>
        <p class="pv-text">${esc(profile.summary)}</p>
        <dl class="pv-facts">
          <div><dt>출생</dt><dd>${esc(profile.born)}년</dd></div>
          <div><dt>대학 시절</dt><dd>${esc(profile.span)}</dd></div>
          ${now.map((e) => `<div><dt>${e.note.includes('복수') ? '복수전공' : '소속'}</dt><dd>${esc(e.school)} ${esc(e.major)}</dd></div>`).join('')}
        </dl>
        <ul class="pv-links">${links.map((l) => `<li><a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}><span>${esc(l.label)}</span>${esc(l.value)}</a></li>`).join('')}</ul>
      </div>`
    );
    const record = grp(
      'edu',
      { title: '학력 · 기록', layout: 'edu', anchor: 'education', flow: 'cols' },
      head('EDUCATION &amp; RECORD', '학력과 숫자로 본 기록', '인공지능학과로 입학해 컴퓨터소프트웨어공학과로 옮기고, 스마트 모빌리티 SW공학을 복수전공하고 있습니다.') +
        `<ol class="jr-b pv-edu">${edu.map((e) => `<li><time>${esc(e.period)}</time><b>${esc(e.school)}</b><span>${esc(e.major)}</span><em>${esc(e.note)}</em></li>`).join('')}</ol>
        ${stats().replace('pv-stats', 'pv-stats is-grid')}`
    );
    const yearRows = HISTORY.map((y) => ({ y: y.year, p: y.projects.length, a: y.awards.length }));
    const ymax = Math.max(...yearRows.flatMap((r) => [r.p, r.a]));
    const phases = grp(
      'ov',
      { title: '세 학년, 세 단계', layout: 'phases', anchor: 'overview' },
      head('GROWTH', '세 학년, 세 단계', `<b>${esc(PRELUDE.year)}</b> ${esc(PRELUDE.text)}`) +
        `<ol class="jr-b pv-phases" data-split>${STAGES.map(
          (g, k) => `<li data-stage="${g.id}"><a href="#s-${g.id}" data-jr-go="s-${g.id}"><span class="pv-ph-k"><b>${pad(k + 1)}</b>${esc(g.code)}</span><span class="pv-ph-y">${esc(g.grade)} · ${esc(g.span)}</span><strong>${esc(g.title)}</strong><small>${esc(g.headline)}</small><span class="pv-ph-s">${esc(g.short)}</span><em><span><b>${g.projects.length}</b>프로젝트</span><span><b>${g.awards.length}</b>수상</span>${g.grand ? `<span><b>${g.grand}</b>대상</span>` : ''}</em></a></li>`
        ).join('')}</ol>
        <figure class="jr-b pv-cols-chart" aria-labelledby="pv-yc-t">
          <figcaption id="pv-yc-t">해마다 프로젝트 · 수상<span class="pv-legend"><i class="is-p"></i>프로젝트<i class="is-a"></i>수상</span></figcaption>
          <ol>${yearRows.map((r, k) => `<li style="--i:${k}"><span class="pv-cc"><i class="is-p" style="--v:${(r.p / ymax).toFixed(3)}"><b>${r.p}</b></i><i class="is-a" style="--v:${(r.a / ymax).toFixed(3)}"><b>${r.a}</b></i></span><span class="pv-cc-y">${r.y}</span></li>`).join('')}</ol>
          <table class="sr-only"><caption>해마다 프로젝트 · 수상 수</caption><tr><th>연도</th><th>프로젝트</th><th>수상</th></tr>${yearRows.map((r) => `<tr><td>${r.y}</td><td>${r.p}</td><td>${r.a}</td></tr>`).join('')}</table>
        </figure>`
    );
    const stages = STAGES.map((g, k) =>
      grp(
        `s-${g.id}`,
        { title: `${g.grade} · ${g.title}`, layout: 'phase', anchor: `s-${g.id}`, stage: g.id, flow: 'cols' },
        `<header class="pv-phead" data-head>
          <p class="pv-phead-no" aria-hidden="true">${pad(k + 1)}</p>
          <div><p class="pv-over"><span class="pv-badge">${esc(g.code)}</span>${esc(g.grade)} · ${esc(g.span)}</p><h2>${esc(g.title)}</h2><p class="pv-lead">${esc(g.headline)}</p></div>
          <dl class="pv-mini">${num(g.projects.length, '프로젝트')}${num(g.awards.length, '수상')}${num(g.grand, '대상')}${num(g.certs.length, '자격')}</dl>
        </header>
        <div class="jr-b pv-story" data-split>${g.story.split(/(?<=다\.)\s+/).map((t) => `<p>${esc(t)}</p>`).join('')}</div>
        <blockquote class="jr-b pv-learned"><span>이 시기에 배운 것</span>${esc(g.learned)}</blockquote>
        <div class="jr-b pv-grid4" data-split>${g.featuredProjects.slice(0, 4).map((p) => tile(p)).join('')}</div>`
      )
    );
    const values = grp(
      'values',
      { title: '가치관', layout: 'values', anchor: 'values' },
      head('VALUES', '가치관 — 이렇게 일합니다', '세 학년 동안의 프로젝트에서 되풀이된 일하는 방식입니다.') +
        `<ol class="jr-b pv-three" data-split>${VALUES.map(
          (v) => `<li><p class="pv-three-k"><b>${esc(v.no)}</b>${esc(v.en)}</p><h3>${esc(v.title)}</h3><p class="pv-text">${esc(v.text)}</p>${chips(v.proof.slice(0, 3))}</li>`
        ).join('')}</ol>`
    );
    return (
      chapter(0, esc(profile.roleKo), ['소개', '학력과 기록', '세 학년, 세 단계', '가치관'], shotOf('pixhawk-drone', '01')) +
      me +
      record +
      phases +
      stages.join('') +
      values
    );
  }

  // ── 02 보유 역량 분석 ──
  function ability() {
    const comp = scenes.find((s) => s.id === 'competency') || {};
    const core = grp(
      'core',
      { title: '핵심 역량 세 축', layout: 'pillars', anchor: 'competency' },
      head('CORE COMPETENCY', 'AI · 하드웨어 · 기획을 한 시스템으로', '세 축은 2026 Notion 포트폴리오의 핵심 역량 문장 그대로 — 칩은 그 축을 보여 주는 프로젝트입니다.') +
        `<ol class="jr-b pv-three is-axes" data-split>${(comp.pillars || [])
          .map((p) => `<li><p class="pv-ax-no">${esc(p.no)}</p><h3>${esc(p.title)}</h3><p class="pv-ax-tag">${esc(p.text)}</p><p class="pv-text">${esc(p.detail)}</p>${chips(p.projects)}</li>`)
          .join('')}</ol>`
    );
    const skills = grp(
      'skills',
      { title: '분야별 기술', layout: 'skills', anchor: 'skills', flow: 'cols' },
      head('SKILL MAP', '분야별 기술 — 근거 프로젝트로 셉니다', `숙련도 점수 대신, 그 분야의 기술이 쓰인 프로젝트를 셉니다 · 기술 ${SKILL_COUNT}개`) +
        bars('분야마다 근거 프로젝트 수', DOMAIN_SKILLS.map((d) => ({ label: d.ko, n: d.projects.length }))) +
        `<ol class="jr-b pv-doms" data-split>${DOMAIN_SKILLS.map((d) => {
          const done = d.skills.filter((s) => s.state !== 'explore');
          const explore = d.skills.length - done.length;
          return `<li><h3>${esc(d.ko)}</h3><p>${done.slice(0, 5).map((s) => `<span>${esc(s.name)}${s.evidence.length ? `<sup>${s.evidence.length}</sup>` : ''}</span>`).join('')}${explore ? `<span class="is-explore">탐구 중 ${explore}</span>` : ''}</p></li>`;
        }).join('')}</ol>`
    );
    const certList = [...CERTS].sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
    const certs = grp(
      'certs',
      { title: '자격', layout: 'certs', anchor: 'certs' },
      head('CERTIFICATIONS', `자격 ${CERTS.length}개`, '드론 조종 · 교관 자격에서 시작해 IoT · 3D · 데이터로 넓혀 왔습니다 — 취득 연도 순.') +
        `<ol class="jr-b pv-certs" data-split>${certList
          .map((c) => {
            const d = DOMAIN_SKILLS.find((x) => x.id === c.domain);
            return `<li><time>${c.year ? esc(c.year) : '—'}</time><b>${esc(c.name)}</b>${d ? `<small>${esc(d.ko)}</small>` : ''}</li>`;
          })
          .join('')}</ol>
        <p class="jr-b pv-foot">${link('/skills', '기술마다 근거 프로젝트 전체 보기')}</p>`
    );
    const key = (q) => `swot-${q.key.toLowerCase()}`;
    const mx = grp(
      'swot',
      { title: 'SWOT 한눈에', layout: 'swot', anchor: 'swot' },
      head('SWOT', 'SWOT 분석', '기록으로 본 지금의 나 — 강점과 기회는 키우고, 보완할 점과 위협은 대응 방법과 함께 적었습니다.') +
        `<div class="jr-b pv-mx" data-split>${SWOT.map(
          (q) => `<a class="pv-mq" data-q="${q.key}" href="#${key(q)}" data-jr-go="${key(q)}"><span class="pv-mq-h"><b>${q.key}</b><span><strong>${esc(q.title)}</strong><small>${esc(q.en)}</small></span><em>${q.items.length}</em></span><ul>${q.items.map((it) => `<li>${esc(it.h)}</li>`).join('')}</ul></a>`
        ).join('')}</div>
        <p class="jr-b pv-src">${esc(JOURNEY_SOURCE)}</p>`
    );
    const quads = SWOT.map((q) =>
      grp(
        key(q),
        { title: `${q.key} · ${q.title}`, layout: 'quad', anchor: key(q), q: q.key },
        `<header class="pv-qhead" data-head><b class="pv-ql" aria-hidden="true">${q.key}</b><div><p class="pv-over">SWOT — ${esc(q.en)}</p><h2>${esc(q.title)}</h2><p class="pv-lead">${q.items.length}가지</p></div></header>
        <ol class="jr-b pv-qitems" data-split>${q.items
          .map(
            (it, i) => `<li><b class="pv-qi-no">${pad(i + 1)}</b><div><h3>${esc(it.h)}</h3><p class="pv-text">${esc(it.t)}</p>${it.fix ? `<p class="pv-fix"><span>대응</span>${esc(it.fix)}</p>` : ''}${it.proof?.length ? chips(it.proof) : ''}</div></li>`
          )
          .join('')}</ol>`
      )
    );
    const strat = grp(
      'strategy',
      { title: '대응 전략', layout: 'strategy', anchor: 'strategy' },
      head('STRATEGY', '대응 전략', '강점 · 기회를 키우고 보완할 점 · 위협을 줄이는 네 방향 — 미래 계획으로 이어집니다.') +
        `<ol class="jr-b pv-strat" data-split>${STRATEGY.map((x) => `<li data-q="${x.key[0]}"><p><b>${esc(x.key)}</b>${esc(x.h)}</p><h3>${esc(x.t)}</h3></li>`).join('')}</ol>
        <p class="jr-b pv-foot">${link('#plan', '이 전략을 담은 미래 계획', 'plan')}</p>`
    );
    return (
      chapter(1, '무엇을 잘하고 무엇을 보완할지 — 기록으로 셉니다', ['핵심 역량 세 축', '분야별 기술', `자격 ${CERTS.length}`, 'SWOT 분석', '대응 전략'], shotOf('pixhawk-drone', '03')) +
      core +
      skills +
      certs +
      mx +
      quads.join('') +
      strat
    );
  }

  // ── 03 프로젝트 경험 ──
  const STEP = { PROBLEM: '문제', IDEA: '아이디어', BUILD: '만들기', TEST: '시험', RESULT: '결과', LEARNED: '배운 점', NEXT: '다음' };
  function work() {
    const overview = grp(
      'fields',
      { title: '분야별 프로젝트', layout: 'fields', anchor: 'projects', flow: 'cols' },
      head('PROJECTS', `프로젝트 ${projects.length} — ${fields.length}개 분야`, `그중 대표 프로젝트 ${feat.length}개를 한 화면씩 소개합니다 — 누르면 그 화면으로.`) +
        bars('분야마다 프로젝트 수', fields.map((x) => ({ label: x.c.ko, n: x.n }))) +
        `<div class="jr-b pv-grid8" data-split>${feat.map((p, k) => tile(p, { href: `#p-${p.id}`, go: `p-${p.id}`, no: pad(k + 1) })).join('')}</div>`
    );
    const cases = feat.map((p, k) => {
      const c = categoryOf(p.category);
      const aw = awardsOf(p.id);
      const steps = (p.story || []).filter((s) => s.text);
      const facts = [p.role.length && ['역할', p.role.join(' · ')], p.tools.length && ['도구', p.tools.join(' · ')], aw.length && ['수상', aw.map((a) => `${a.grade} — ${a.contest}`).join(' · ')]].filter(Boolean);
      return grp(
        `p-${p.id}`,
        { title: `${pad(k + 1)} · ${p.title}`, layout: 'case', anchor: `p-${p.id}`, flow: 'cols' },
        `<header class="pv-chead" data-head>
          <p class="pv-over"><span class="pv-badge">${esc(c.label)}</span>${esc(p.year)} · 대표 프로젝트 ${pad(k + 1)} / ${pad(feat.length)}</p>
          <h2>${esc(p.title)}</h2>
          <p class="pv-lead">${esc(p.oneLiner)}</p>
        </header>
        ${p.cover ? `<figure class="jr-b pv-media">${img(p.cover, { sizes: '(max-width: 820px) 100vw, 680px' })}${mediaNote(p) ? `<figcaption>${mediaNote(p)}</figcaption>` : ''}</figure>` : ''}
        ${
          p.metrics.length || facts.length
            ? `<div class="jr-b pv-cside">${p.metrics.length ? `<dl class="pv-met">${p.metrics.slice(0, 2).map((m) => `<div><dd>${esc(m.value)}</dd><dt>${esc(m.label)}</dt></div>`).join('')}</dl>` : ''}${facts.length ? `<dl class="pv-cfacts">${facts.map(([k2, v]) => `<div><dt>${k2}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}</div>`
            : ''
        }
        ${
          steps.length
            ? `<ol class="jr-b pv-steps" data-split data-n="${steps.length}">${steps
                .map((s) => `<li data-kind="${esc(s.label)}"><p class="pv-st-l">${esc(s.label)}<span>${STEP[s.label] || ''}</span></p><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`)
                .join('')}</ol>`
            : `<p class="jr-b pv-text">${esc(p.summary)}</p>`
        }
        <p class="jr-b pv-foot">${link(p.path, `자세히 보기${mediaNote(p) ? ` — ${mediaNote(p)}` : ''}`)}</p>`
      );
    });
    const stageOfYear = (year) => STAGES.find((s) => s.years.includes(year));
    const years = grp(
      'yr',
      { title: `${HISTORY[0].year} — ${HISTORY[HISTORY.length - 1].year} 한눈에`, layout: 'yearsum', anchor: 'years' },
      head('TIMELINE', '해마다 한 일', `이력 ${HISTORY.reduce((n, y) => n + y.items.length, 0)}개 · 프로젝트 ${projects.length} · 수상 ${AWARDS.length} — 해를 누르면 그 해의 기록으로`) +
        `<ol class="jr-b pv-ysum" data-split>${HISTORY.map((y) => {
          const g = stageOfYear(y.year);
          return `<li${g ? ` data-stage="${g.id}"` : ''}><a href="#y${y.year}" data-jr-go="y${y.year}"><span class="pv-ys-y">${y.year}</span>${g ? `<span class="pv-badge">${esc(g.code)}</span>` : ''}<span class="pv-ys-n"><span><b>${y.projects.length}</b>프로젝트</span><span><b>${y.awards.length}</b>수상</span></span><ul>${y.items.map((it) => `<li>${esc(it.title)}</li>`).join('')}</ul></a></li>`;
        }).join('')}</ol>`
    );
    const yearSlides = HISTORY.map((y) => {
      const g = stageOfYear(y.year);
      const tiers = [1, 2, 3, 4, 5].map((t) => [t, y.awards.filter((a) => a.tier === t).length]).filter(([, n]) => n);
      // 왼쪽: 그 해의 이력(갈래 · 이름 · 한 줄 · 이어진 프로젝트)
      const items = y.items
        .map(
          (it, i) => `<li><b class="pv-yi-no">${pad(i + 1)}</b><div><p class="pv-it-k">${esc(it.kind)}</p><h3>${esc(it.title)}</h3>${it.note || it.projects.length ? `<div class="pv-yi-b">${it.note ? `<p class="pv-text">${esc(it.note)}</p>` : ''}${it.projects.length ? chips(it.projects.map((p) => p.id)) : ''}</div>` : ''}</div></li>`
        )
        .join('');
      // 오른쪽: 그 해의 상장 벽(등급 순 · 누르면 크게) + 보도 — 상장이 없으면 그 해의 프로젝트 사진
      const certs = y.awards.filter((a) => a.certs.length || a.photo).sort((a, b) => a.tier - b.tier || a.date.localeCompare(b.date));
      const press = y.items.flatMap((it) => it.press);
      const sheets = certs
        .map((a) => {
          const at = media.length;
          a.certs.forEach((c2) => media.push({ type: 'image', src: c2.src, caption: certCaption(a) }));
          if (!a.certs.length) media.push({ type: 'image', src: a.photo.src, caption: certCaption(a) });
          return `<li data-tier="${TIER_KEY[a.tier]}"><button type="button" data-cert="${at}" data-n="${a.certs.length || 1}" aria-label="${esc(a.grade)} — ${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기" title="${esc(a.grade)} — ${esc(a.contest)}">${certSheet(a, { sizes: '(max-width: 700px) 15vw, 90px' })}${a.tier === 1 ? '<i>대상</i>' : ''}</button></li>`;
        })
        .join('');
      const shots = y.projects.filter((p) => p.cover).slice(0, 4);
      const side = certs.length
        ? `<div class="jr-b pv-yside"><p class="pv-ys-h">상장 · 시상 ${certs.length}<small>누르면 크게</small></p><ul class="pv-ysheets" data-n="${certs.length}">${sheets}</ul>${press.length ? `<p class="pv-ys-h">보도 ${press.length}</p><ul class="pv-it-press">${press.map((a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener"><small>${esc(a.publisher)}${a.date ? ` · ${esc(a.date.replace(/-/g, '.'))}` : ''}</small>${esc(a.title)}</a></li>`).join('')}</ul>` : ''}</div>`
        : `<div class="jr-b pv-yside is-shots"><p class="pv-ys-h">${y.year}년 프로젝트 ${y.projects.length}개 가운데</p><div class="pv-grid4">${shots.map((p) => tile(p)).join('')}</div></div>`;
      return grp(
        `y${y.year}`,
        { title: `${y.year}${g ? ` · ${g.grade} ${g.title}` : ''}`, layout: 'year', anchor: `y${y.year}`, stage: g?.id, flow: 'cols' },
        `<header class="pv-yhead" data-head>
          <b class="pv-yy">${y.year}</b>
          <div>${g ? `<p class="pv-over"><span class="pv-badge">${esc(g.code)}</span>${esc(g.grade)} · ${esc(g.title)}</p>` : ''}
            <p class="pv-yn"><span><b>${y.items.length}</b>이력</span><span><b>${y.projects.length}</b>프로젝트</span><span><b>${y.awards.length}</b>수상</span>${tiers.length ? `<span class="pv-tiers">${tiers.map(([t, n]) => `${TIER_LABEL[t]} ${n}`).join(' · ')}</span>` : ''}</p></div>
          <p class="pv-ya">${y.awards.length ? `<a href="/awards#y${y.year}" data-link>상장 ${y.awards.length}건 →</a>` : ''}</p>
        </header>
        <ol class="jr-b pv-yitems" data-split>${items}</ol>
        ${side}`
      );
    });
    // 성과: 등급별 수상(막대) + 대상 상장 벽 → 공식 보도
    const wall = grand.map((a) => {
      const at = media.length;
      a.certs.forEach((c2) => media.push({ type: 'image', src: c2.src, caption: certCaption(a) }));
      if (!a.certs.length && a.photo) media.push({ type: 'image', src: a.photo.src, caption: certCaption(a) });
      const can = a.certs.length || a.photo;
      return `<li>${can ? `<button type="button" data-cert="${at}" data-n="${a.certs.length || 1}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기">${certSheet(a, { sizes: '(max-width: 700px) 30vw, 170px' })}</button>` : certSheet(a)}<p><b>${esc(a.contest)}</b><small>${esc(a.date.slice(0, 7).replace('-', '.'))}${a.project ? ` · ${esc(a.project.title)}` : ''}</small></p></li>`;
    });
    const tiers = [1, 2, 3, 4, 5].map((t) => ({ label: TIER_LABEL[t], n: AWARDS.filter((a) => a.tier === t).length })).filter((r) => r.n);
    const awards = grp(
      'results',
      { title: '수상', layout: 'awards', anchor: 'results' },
      head('AWARDS', `수상 ${AWARDS.length}건 · 대상 ${grand.length}`, '대회에서 멈추지 않고 판매 · 입점 · 기부 · 전시로 이어 간 기록입니다 — 상장을 누르면 크게.') +
        bars('등급마다 수상 수', tiers, 'a') +
        `<ol class="jr-b pv-wall" data-split>${wall.join('')}</ol>
        <p class="jr-b pv-foot">${link('/awards', `상장 ${AWARDS.length}건 모두 보기`)}</p>`
    );
    const press = grp(
      'press',
      { title: '공식 보도', layout: 'press', anchor: 'press' },
      head('PRESS', `공식 보도 ${PRESS.length}건`, '대학 · 지역 언론에 실린 기사입니다 — 누르면 원문으로.') +
        `<ol class="jr-b pv-press" data-split>${PRESS.map((a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener"><small>${esc(a.publisher)}${a.date ? ` · ${esc(a.date.replace(/-/g, '.'))}` : ''}</small><b>${esc(a.title)}</b><i aria-hidden="true">↗</i></a></li>`).join('')}</ol>`
    );
    return (
      chapter(2, `프로젝트 ${projects.length}개 가운데 대표 ${feat.length}개와 해마다의 기록`, ['분야별 프로젝트', `대표 프로젝트 ${feat.length}`, '해마다 한 일', '수상 · 보도'], shotOf('baja-ev-formula', '03')) +
      overview +
      cases.join('') +
      years +
      yearSlides.join('') +
      awards +
      press
    );
  }

  // ── 04 미래 계획 ──
  function plan() {
    const target = grp(
      'plan',
      { title: '지원 직무와 로드맵', layout: 'target', anchor: 'plan-target', flow: 'cols' },
      `<div class="jr-b pv-target">
        <p class="pv-over">TARGET — 지원 직무</p>
        <h2>${esc(TARGET.role)}</h2>
        <p class="pv-lead">${esc(TARGET.line)}</p>
        <p class="pv-tags">${TARGET.domains.map((d) => `<span>${esc(d)}</span>`).join('')}</p>
        <p class="pv-kw">${TARGET.keywords.map((k) => `<span>#${esc(k)}</span>`).join('')}</p>
      </div>
      <ol class="jr-b pv-road" data-split>${PLAN.map(
        (c, i) => `<li data-step="${c.key}"><a href="#plan-${c.key}" data-jr-go="plan-${c.key}"><p class="pv-when"><b>${pad(i + 1)}</b>${esc(c.when)}</p><strong>${esc(c.title)}</strong><ul>${c.items.map((it) => `<li>${esc(it.h)}</li>`).join('')}</ul></a></li>`
      ).join('')}</ol>
      <p class="jr-b pv-src">${esc(JOURNEY_SOURCE)}</p>`
    );
    const steps = PLAN.map((c, i) =>
      grp(
        `plan-${c.key}`,
        { title: `${c.when} · ${c.title}`, layout: 'step', anchor: `plan-${c.key}`, step: c.key },
        head(`${pad(i + 1)} — ${esc(c.when)}`, esc(c.title)) +
          `<ol class="jr-b pv-pitems" data-split>${c.items
            .map((it, j) => {
              const p = it.proof && byId(it.proof);
              return `<li><p class="pv-pi-no">${pad(j + 1)}</p><h3>${esc(it.h)}</h3><p class="pv-text">${esc(it.t)}</p>${p ? `<a class="pv-pi-p" href="${p.path}" data-link>${p.cover ? `<span>${img(p.cover, { sizes: '120px' })}</span>` : ''}<b>${esc(p.title)}</b><i aria-hidden="true">→</i></a>` : ''}</li>`;
            })
            .join('')}</ol>`
      )
    );
    const thanks = grp(
      'thanks',
      { title: '마치며', layout: 'thanks', anchor: 'thanks', bare: true },
      `<div class="jr-b pv-thanks">
        <p class="pv-over">THANK YOU</p>
        <h2>감사합니다</h2>
        <p class="pv-motto">${esc(profile.motto)}</p>
        <p class="pv-qa">질문과 피드백을 기다립니다</p>
      </div>
      <div class="jr-b pv-contact">
        <ul class="pv-links">${profile.links.map((l) => `<li><a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}><span>${esc(l.label)}</span>${esc(l.value)}</a></li>`).join('')}</ul>
        <figure class="pv-qr"><img src="/qr.svg" width="160" height="160" alt="포트폴리오 주소 QR 코드" /><figcaption><b>kwon-physical-ai.vercel.app</b>휴대폰으로 찍으면 3D 포트폴리오가 열립니다</figcaption></figure>
      </div>
      <p class="jr-b pv-end">${link('/', '3D 포트폴리오 필름')}${link('/resume', '이력서 한 장')}${link('/works', `프로젝트 ${projects.length} 전체`)}</p>`
    );
    return chapter(3, `${esc(TARGET.role)} — 지금, 다음, 그리고 목표`, ['지원 직무와 로드맵', ...PLAN.map((c) => `${esc(c.when.split(' ')[0])} · ${esc(c.title)}`)], shotOf('quadruped-robot', '01')) + target + steps.join('') + thanks;
  }

  const html = `<section data-sec="intro" data-title="PORTFOLIO" data-short="표지">${intro()}</section>
    <section data-sec="about" data-no="01" data-title="자기소개">${about()}</section>
    <section data-sec="ability" data-no="02" data-title="보유 역량 분석" data-short="보유 역량">${ability()}</section>
    <section data-sec="work" data-no="03" data-title="프로젝트 경험">${work()}</section>
    <section data-sec="plan" data-no="04" data-title="미래 계획">${plan()}</section>`;
  return { html, media };
}
