// ── 발표 자료(/present) — 2026-1 포트폴리오 경진대회 안내서의 목차 그대로 ──
// 표지 · 목차 → 00 나를 소개합니다 → STEP1 자기이해 → STEP2 직업탐색 → STEP3 진로계획 및 비교과 설계 → STEP4 미래설계 → 마치며
// 목표: ADD 무인 감시정찰 연구원(로보틱스 대학원을 거쳐) — 대표 프로젝트마다 받은 상 · 보도를 붙여 근거를 보인다
// 29장 · 10분 발표 — 글은 짧게, 사진은 크게. 문장 · 숫자는 모두 기록(content · data)에서 가져온다(지어내지 않는다).
// 본인만 아는 CarHub 기록(검사 결과 · 캡처 · 롤모델 · WON+ 계획 · 10년/30년 후)은 deck/carhub.js — 비어 있으면 '입력 예정' 자리로 보인다.
// 발표 자료는 포트폴리오(3D 필름 · 아카이브)와 따로 산다: 내용 deck/present.js · 넘기기 deck/pager.js · 모양 deck/deck.css(밝은 종이) · SWOT · 계획 deck/plan.js
// 쪽(data-sec) → 화면(data-grp) → 블록(.jr-b)으로 적는다. deck/pager.js가 넓은 화면에서는 1600×900 무대에 화면 한 장씩(data-layout의 구도대로),
// 휴대폰 · 세로 화면에서는 블록을 화면 크기에 맞춰 나눠 담는다.
import { projects, byId, categoryOf, FEATURED } from '../data/projects.js';
import { profile } from '../content.js';
import { AWARDS, awardsOf, bestOf, TIER_LABEL } from '../data/awards.js';
import { HISTORY } from '../data/history.js';
import { PRESS, PRESS_DIRECT, pressOf } from '../data/press.js';
import { CERTS, SKILLS, STACK } from '../data/skills.js';
import { STAGES, VALUES, PRELUDE } from '../data/growth.js';
import { SWOT, STRATEGY, PLAN, TARGET } from './plan.js';
import { CARHUB } from './carhub.js';

// 발표 순서(위 탭 · 목차 · 장 표지): id · 이름 · 영문 · 짧은 이름 · 번호
export const PR_SECS = [
  ['about', '나를 소개합니다', 'ABOUT ME', '소개', '00'],
  ['self', '자기이해', 'STEP 1', '자기이해', '01'],
  ['job', '직업탐색', 'STEP 2', '직업탐색', '02'],
  ['path', '진로계획 · 비교과', 'STEP 3', '진로 · 비교과', '03'],
  ['future', '미래설계', 'STEP 4', '미래설계', '04'],
];

// 사이트 쪽 도우미(글자 이스케이프 · 사진 · 상장)를 받아 덱을 만든다
export function presentDeck({ esc, pad, img, certSheet, certCaption }) {
  const media = [];
  const grand = AWARDS.filter((a) => a.tier === 1);
  const feat = FEATURED.map(byId).filter(Boolean);
  const vol = profile.volunteer;
  const volH = `${vol.hours}시간${vol.minutes ? ` ${vol.minutes}분` : ''}`;
  const sch = profile.scholarship;
  // 프로젝트의 n번째 사진(파일 이름 01 · 02 …) — 없으면 대표 사진. shotOf는 주소(장 표지 배경), picOf는 사진(타일 · 큰 사진)
  const picOf = (id, n) => {
    const p = byId(id);
    return p?.images.find((im) => im.src.endsWith(`/${n}.webp`)) || p?.cover || null;
  };
  const shotOf = (id, n) => picOf(id, n)?.src || '';
  const ph = (im, sizes, cls = '') => (im ? `<span class="pv-ph${cls ? ` ${cls}` : ''}">${img(im, { sizes })}</span>` : `<span class="pv-ph is-none${cls ? ` ${cls}` : ''}"></span>`);

  // 화면 하나: layout은 넓은 화면의 구도, bare는 위 · 아래 표시 없이(표지 · 장 표지 · 마치며)
  const grp = (id, o, inner) =>
    `<div data-grp="${id}" data-title="${esc(o.title || '')}" data-layout="${o.layout || 'stack'}"${o.flow ? ` data-flow="${o.flow}"` : ''}${o.anchor ? ` data-anchor="${o.anchor}"` : ''}${o.bg ? ` data-bg="${esc(o.bg)}"` : ''}${o.bare ? ' data-bare' : ''}>${inner}</div>`;
  const head = (over, h, lead = '') => `<header class="pv-head" data-head>${over ? `<p class="pv-over">${over}</p>` : ''}<h2>${h}</h2>${lead ? `<p class="pv-lead">${lead}</p>` : ''}</header>`;
  const chip = (id) => {
    const p = byId(id);
    return p ? `<a class="pv-chip" href="${p.path}" data-link>${esc(p.title)}</a>` : '';
  };
  // 프로젝트가 받은 가장 높은 상 · 공식 보도 수(사진 위 표시)
  const marks = (p) => {
    const b = bestOf(p);
    const pr = pressOf(p.id).length;
    return b || pr ? `<span class="pv-marks">${b ? `<i class="is-${b.key}">${esc(b.label)}${b.count > 1 ? `<small>+${b.count - 1}</small>` : ''}</i>` : ''}${pr ? `<i class="is-press">보도 ${pr}</i>` : ''}</span>` : '';
  };
  // 사진 타일(사진 · 이름 · 연도 · 분야)
  const tile = (p, { no = '', sizes = '(max-width: 700px) 46vw, 340px' } = {}) =>
    `<a class="pv-tile" href="${p.path}" data-link><span class="pv-ph">${p.cover ? img(p.cover, { sizes }) : ''}</span>${marks(p)}<span class="pv-tile-t">${no ? `<em>${no}</em>` : ''}<b>${esc(p.title)}</b><small>${esc(p.year)} · ${esc(categoryOf(p.category).ko)}</small></span></a>`;
  // 큰 숫자 한 칸
  const num = (n, label, sub = '') => `<div><dd>${n}</dd><dt>${label}${sub ? `<small>${sub}</small>` : ''}</dt></div>`;
  // 가로 막대(한 축 · 값은 막대 끝) + 화면 읽기용 표 — v는 막대 끝에 적을 값(없으면 n)
  const bars = (title, rows) => {
    const max = Math.max(...rows.map((r) => r.n));
    return `<figure class="jr-b pv-bars"><figcaption>${title}</figcaption><ol>${rows
      .map((r, k) => `<li style="--i:${k}"><span class="pv-bar-l">${esc(r.label)}</span><span class="pv-bar"><i style="--v:${(r.n / max).toFixed(3)}"></i><b>${r.v || r.n}</b></span></li>`)
      .join('')}</ol><table class="sr-only"><caption>${title}</caption>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.v || r.n}</td></tr>`).join('')}</table></figure>`;
  };
  const link = (href, text, go = '') => `<a class="pv-more" href="${href}"${go ? ` data-jr-go="${go}"` : href.startsWith('#') ? '' : ' data-link'}>${text}<i aria-hidden="true">→</i></a>`;
  // 본인이 채울 자리(deck/carhub.js) — 캡처가 있으면 그 그림, 없으면 무엇을 넣을지 적힌 빈칸
  const slot = (label, hint, must = false) => `<div class="pv-slot${must ? ' is-must' : ''}"><p><b>${must ? '★ 필수 · ' : ''}입력 예정</b>${esc(label)}</p><small>${esc(hint)}</small></div>`;
  const shot = (src, alt, label, hint, must = false) => (src ? `<figure class="pv-shot"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" /></figure>` : slot(label, hint, must));
  const mail = profile.links.find((l) => l.label === 'Email');
  const gh = profile.links.find((l) => l.label === 'GitHub');

  // 장 표지: 왼쪽 큰 번호 · 장 이름 · 이 장에서 볼 화면들, 오른쪽 사진
  const chapter = (k, desc, list, bg) => {
    const [id, ko, en, , no] = PR_SECS[k];
    return grp(
      `ch-${id}`,
      { title: ko, layout: 'chapter', anchor: id, bare: true, bg },
      `<div class="jr-b pv-ch">
        <p class="pv-ch-no" aria-hidden="true">${no}</p>
        <div class="pv-ch-t"><p class="pv-over">${en}</p><h2>${ko}</h2><p class="pv-ch-d">${desc}</p></div>
        <ol class="pv-ch-list">${list.map((t, i) => `<li><b>${pad(i + 1)}</b>${t}</li>`).join('')}</ol>
      </div>`
    );
  };

  // ── 표지 · 목차 ──
  function intro() {
    const shots = [picOf('baja-ev-formula', '01'), picOf('av-competition', '06'), picOf('recap-jbmotors', '01'), picOf('pixhawk-drone', '01'), picOf('quadruped-robot', '01')];
    const cover = grp(
      'cover',
      { title: '표지', layout: 'cover', bare: true },
      `<div class="jr-b pv-cover">
        <p class="pv-over">2026 PORTFOLIO</p>
        <h1 class="pv-name">${esc(profile.name)}<span>${esc(profile.en)}</span></h1>
        <p class="pv-role">${esc(profile.role)}</p>
        <p class="pv-motto">${esc(profile.roleKo)}</p>
        <dl class="pv-goal"><div><dt>목표</dt><dd>${esc(TARGET.short)}</dd></div><div><dt>준비 중</dt><dd>${esc(TARGET.grad)}</dd></div></dl>
        <p class="pv-proof">${[
          [AWARDS.length, '수상'],
          [grand.length, '대상'],
          [PRESS.length, '공식 보도'],
          [projects.length, '프로젝트'],
        ]
          .map(([n, k]) => `<span><b>${n}</b>${k}</span>`)
          .join('')}</p>
      </div>
      <div class="jr-b pv-mosaic" aria-hidden="true">${shots.map((im) => ph(im, '(max-width: 700px) 50vw, 560px', 'pv-mo')).join('')}</div>`
    );
    const desc = {
      about: '나 · 배움의 길 · 걸어온 길',
      self: 'SWOT 분석 · 대응 전략 · CarHub 검사 · 일하는 방식',
      job: 'ADD 무인 감시정찰 연구원 · 요구 역량 분석 · 롤모델',
      path: '비교과 · 대표 프로젝트 · 공식 보도 · 수상 · 자기계발 계획',
      future: '로보틱스 대학원 → ADD · 10년 · 30년 후 · 미래 명함',
    };
    const agenda = grp(
      'agenda',
      { title: '목차', layout: 'agenda', anchor: 'contents' },
      head('CONTENTS', '목차') +
        `<nav class="jr-b pv-agenda" aria-label="목차" data-split>${PR_SECS.map(
          ([id, ko, en, , no]) => `<a href="#${id}" data-jr-go="${id}" data-c="${id}"><b>${no}</b><span class="pv-ag-t"><em>${en}</em><strong>${ko}</strong></span><small>${desc[id]}</small><i aria-hidden="true">→</i></a>`
        ).join('')}</nav>
        <p class="jr-b pv-keys"><span><kbd>←</kbd><kbd>→</kbd>넘기기</span><span><kbd>1</kbd>—<kbd>4</kbd>STEP 이동</span><span><kbd>F</kbd>전체 화면</span><span class="pv-keys-t">옆으로 끌거나 위로 밀어도 넘어갑니다</span></p>`
    );
    return cover + agenda;
  }

  // ── 00 나를 소개합니다 ──
  function about() {
    const me = grp(
      'me',
      { title: '나', layout: 'profile', anchor: 'about-me' },
      `${profile.photo ? `<figure class="jr-b pv-photo"><img src="${esc(profile.photo.src)}" width="${profile.photo.w}" height="${profile.photo.h}" alt="${esc(profile.name)} 증명사진" /></figure>` : ''}
      <div class="jr-b pv-id">
        <p class="pv-over">${esc(profile.role)}</p>
        <h2 class="pv-nm">${esc(profile.name)}<span>${esc(profile.en)} · ${esc(profile.born)}</span></h2>
        <p class="pv-quote">${esc(profile.motto)}</p>
        <p class="pv-award"><b>${esc(sch.title)}</b><span>${esc(sch.date.slice(0, 4))} · 과학기술정보통신부</span></p>
        <dl class="pv-nums">${num(projects.length, '프로젝트')}${num(AWARDS.length, '수상', `대상 ${grand.length}`)}${num(PRESS.length, '공식 보도', `직접 소개 ${PRESS_DIRECT}`)}${num(`${vol.hours}<small>h</small>`, '봉사', `${vol.count}건`)}</dl>
      </div>`
    );
    const edu = profile.education || [];
    const dept = profile.depts || [];
    const at = media.length;
    media.push({ type: 'image', src: sch.sheet.src, caption: `${sch.title} 장학증서 — ${sch.date} · ${sch.by} (생년월일은 가림)` });
    const record = grp(
      'edu',
      { title: '배움의 길', layout: 'edu', anchor: 'education', flow: 'cols' },
      head('EDUCATION &amp; SCHOLARSHIP', '배움의 길') +
        `<ol class="jr-b pv-edu">${edu
          .map(
            (e, i) => `<li><time>${esc(e.period)}</time>${dept[i] ? `<img class="pv-dept" src="${esc(dept[i].src)}" width="${dept[i].w}" height="${dept[i].h}" alt="${esc(dept[i].alt)}" />` : `<span class="pv-dept is-text">${esc(e.school)}</span>`}<p><b>${esc(e.major)}</b><em>${esc(e.note)}</em></p></li>`
          )
          .join('')}</ol>
        <figure class="jr-b pv-scholar">
          <button type="button" data-cert="${at}" data-n="1" aria-label="${esc(sch.title)} 장학증서 크게 보기"><span class="sheet"><img src="${esc(sch.sheet.thumb)}" srcset="${esc(sch.sheet.sm)} 240w, ${esc(sch.sheet.thumb)} 480w, ${esc(sch.sheet.md)} 720w, ${esc(sch.sheet.src)} 1132w" sizes="(max-width: 700px) 40vw, 300px" alt="${esc(sch.title)} 장학증서" width="1132" height="1600" loading="lazy" decoding="async" /></span></button>
          <figcaption><small>SCHOLARSHIP</small><b>${esc(sch.title)}</b><span>${esc(sch.date)} · ${esc(sch.by)}</span></figcaption>
        </figure>`
    );
    const stages = grp(
      'journey',
      { title: '걸어온 길', layout: 'phases', anchor: 'overview s-explore s-challenge s-focus' },
      head('MY JOURNEY', '걸어온 길', `<b>${esc(PRELUDE.year)}</b>${esc(PRELUDE.text)}`) +
        `<ol class="jr-b pv-phases" data-split>${STAGES.map(
          (g) => `<li data-stage="${g.id}">${ph(picOf(g.cover, '01'), '(max-width: 700px) 90vw, 420px')}<p class="pv-ph-k"><b>${esc(g.grade)}</b>${esc(g.span)}<span>${esc(g.code)}</span></p><h3>${esc(g.title)}</h3><p class="pv-text">${esc(g.headline)}</p></li>`
        ).join('')}</ol>`
    );
    return me + record + stages;
  }

  // ── STEP 1 자기이해 ──
  function self() {
    const mx = grp(
      'swot',
      { title: 'SWOT 분석', layout: 'swot', anchor: 'swot competency' },
      head('SWOT ANALYSIS', 'SWOT 분석으로 본 지금의 나') +
        `<div class="jr-b pv-mx" data-split>${SWOT.map(
          (q) => `<section class="pv-mq" data-q="${q.key}"><p class="pv-mq-h"><b>${q.key}</b><span><strong>${esc(q.title)}</strong><small>${esc(q.en)}</small></span></p><ul>${q.items.map((it) => `<li>${esc(it.h)}</li>`).join('')}</ul></section>`
        ).join('')}</div>`
    );
    // 안내서의 네 전략 이름 그대로(SO · ST / WO · WT)
    const NAME = { SO: '강점을 살려 기회를 잡는 전략', ST: '강점을 살려 위기를 극복하는 전략', WO: '약점을 보완하여 기회를 잡는 전략', WT: '약점을 보완하여 위기를 돌파하는 전략' };
    const strat = grp(
      'strategy',
      { title: 'SWOT 대응 전략', layout: 'strategy', anchor: 'strategy' },
      head('STRATEGY', 'SWOT 대응 전략') +
        `<ol class="jr-b pv-strat" data-split>${['SO', 'ST', 'WO', 'WT']
          .map((k) => STRATEGY.find((x) => x.key === k))
          .map((x) => `<li data-q="${x.key[0]}" data-q2="${x.key[1]}"><p class="pv-st-k"><b>${x.key}</b>${NAME[x.key]}</p><h3>${esc(x.t)}</h3></li>`)
          .join('')}</ol>`
    );
    const hub = [
      ['직업흥미', CARHUB.interest],
      ['직업가치관', CARHUB.values],
      ['직업적성', CARHUB.aptitude],
      ['MBTI', CARHUB.mbti],
    ];
    const carhub = grp(
      'carhub',
      { title: 'CarHub 검사', layout: 'carhub', anchor: 'carhub' },
      head('CARHUB', 'CarHub 검사로 본 나') +
        `<dl class="jr-b pv-hub">${hub.map(([k, v]) => `<div${v ? '' : ' class="is-empty"'}><dt>${k}</dt><dd>${v ? esc(v) : '입력 예정'}</dd></div>`).join('')}</dl>
        <div class="jr-b pv-hub-shot">${shot(CARHUB.resultShot, 'CarHub 검사 결과 화면', '검사 결과 화면 캡처', 'CarHub → 검사하기 → 결과 화면')}</div>`
    );
    // 사진은 그 방식의 근거 프로젝트 가운데 다른 화면에 쓰지 않은 한 장
    const VALUE_PICS = [
      ['huss-evidence-ai', '01'],
      ['pixhawk-drone', '03'],
      ['givingplus-filament', '02'],
    ];
    const values = grp(
      'values',
      { title: '일하는 방식', layout: 'values', anchor: 'values' },
      head('HOW I WORK', '이렇게 일합니다') +
        `<ol class="jr-b pv-three" data-split>${VALUES.map((v, i) => {
          const [id, n] = VALUE_PICS[i] || [v.proof[0], '01'];
          const ids = [id, ...v.proof.filter((x) => x !== id)].slice(0, 2);
          return `<li>${ph(picOf(id, n), '(max-width: 700px) 90vw, 420px')}<p class="pv-three-k"><b>${esc(v.no)}</b>${esc(v.en)}</p><h3>${esc(v.title)}</h3><p class="pv-chips">${ids.map(chip).join('')}</p></li>`;
        }).join('')}</ol>`
    );
    return chapter(1, '기록으로 본 나의 강점과 보완할 점', ['SWOT 분석', 'SWOT 대응 전략', 'CarHub 검사', '일하는 방식'], shotOf('av-competition', '07')) + mx + strat + carhub + values;
  }

  // ── STEP 2 직업탐색 ──
  // 무인 감시정찰의 흐름(TARGET.flow)마다 필요한 기술 — 그 기술을 쓴 프로젝트(skills.js의 근거)와 자격을 센다, 사진은 대표 프로젝트 가운데 하나
  const KW = [
    ['임베디드', 0, ['ESP32', 'Altium PCB', 'Circuit', 'Firmware', 'Arduino', 'Sensors']],
    ['컴퓨터 비전', 1, ['YOLO', 'Segmentation', 'Pose Estimation']],
    ['자율주행', 2, ['CARLA', 'AirSim', 'End-to-End Driving', 'LiDAR', 'Steering Logic']],
    ['ROS 2', 2, ['ROS 2', 'Nav2', 'Simulation']],
    ['자율비행', 3, ['Pixhawk', 'Mission Planner', 'Multicopter Piloting', 'Flight Instruction']],
    ['로봇 제어', 3, ['Motor Control', 'Control', 'Mechanism', 'Quadruped', 'Manipulator']],
  ];
  function job() {
    const role = CARHUB.roleModel;
    const target = grp(
      'target',
      { title: '희망 직무', layout: 'target', anchor: 'target plan-target' },
      `<div class="jr-b pv-target">
        <p class="pv-over">희망 직무 · TARGET</p>
        <h2>${esc(TARGET.role)}</h2>
        <p class="pv-org"><a href="${esc(TARGET.url)}" target="_blank" rel="noopener">${esc(TARGET.org)}<i aria-hidden="true">↗</i></a><span>${esc(TARGET.job)}</span></p>
        <ol class="pv-flow" aria-label="${esc(TARGET.flow.join(' — '))}">${TARGET.flow.map((t, i) => `<li><b>${pad(i + 1)}</b>${esc(t)}</li>`).join('')}</ol>
        <p class="pv-lead">${esc(TARGET.line)}</p>
        <ol class="pv-path" aria-label="가는 길">${TARGET.path.map(([k, v]) => `<li><small>${esc(k)}</small><b>${esc(v)}</b></li>`).join('')}</ol>
        <div class="pv-role-m">${role?.name ? `<p><small>ROLE MODEL</small><b>${esc(role.name)}</b>${role.why ? `<span>${esc(role.why)}</span>` : ''}</p>` : slot('롤모델', '닮고 싶은 사람과 그 이유')}</div>
      </div>
      <div class="jr-b pv-target-shot">${shot(CARHUB.jobShot, 'CarHub 희망직업 등록 화면', '희망직업 변경 화면 캡처', 'CarHub 추천직업이 희망직업으로 바뀐 화면', true)}</div>`
    );
    // 사진은 키워드마다 다른 프로젝트로(대표 프로젝트 먼저)
    const used = new Set();
    const rows = KW.map(([kw, at, ens]) => {
      const sk = SKILLS.filter((s) => ens.includes(s.en));
      const ids = new Set(sk.flatMap((s) => s.evidence.map((e) => e.project.id)));
      const certs = new Set(sk.flatMap((s) => s.certs || []));
      const list = projects.filter((p) => ids.has(p.id));
      const pool = [...feat.filter((p) => ids.has(p.id)), ...list].filter((p) => p.cover);
      const best = pool.find((p) => !used.has(p.id)) || pool[0] || list[0];
      if (best) used.add(best.id);
      return { kw, at, n: list.length, c: certs.size, best };
    });
    const match = grp(
      'match',
      { title: '요구 역량 분석', layout: 'match', anchor: 'match skills' },
      head('REQUIRED SKILLS', '요구 역량 ↔ 나의 근거', `무인 정찰의 흐름(${esc(TARGET.flow.join(' → '))})마다, 그 기술을 실제로 쓴 프로젝트를 셉니다`) +
        `<ol class="jr-b pv-match" data-split>${rows
          .map(
            (r) =>
              `<li>${ph(r.best?.cover, '(max-width: 700px) 46vw, 420px')}<span class="pv-mt-f"><b>${pad(r.at + 1)}</b>${esc(TARGET.flow[r.at])}</span><p class="pv-mt"><b>#${esc(r.kw)}</b><span><em>${r.n}</em>프로젝트${r.c ? ` · 자격 ${r.c}` : ''}</span></p>${r.best ? `<a href="${r.best.path}" data-link>${esc(r.best.title)}<i aria-hidden="true">→</i></a>` : ''}</li>`
          )
          .join('')}</ol>`
    );
    return chapter(2, `${esc(TARGET.short)} — 하고 싶은 일과, 그 일에 필요한 역량`, ['희망 직무 · 가는 길 · 롤모델', '요구 역량 분석'], shotOf('av-competition', '08')) + target + match;
  }

  // ── STEP 3 진로계획 및 비교과 설계 ──
  // 대표 사례 셋 — 무인 정찰의 흐름에서 맡는 자리(to: TARGET.flow의 번호)
  const CASES = [
    { id: 'pixhawk-drone', shots: ['01', '02', '05'], to: 3 },
    { id: 'airsim-driving', shots: ['01', '04', '02'], to: 2 },
    { id: 'iot-iv-pole', shots: ['01', '02', '04'], to: 0 },
  ];
  // 공식 보도 슬라이드의 기사 여섯(사진이 있는 기사 가운데 — 대표 프로젝트 · 직접 소개 먼저)
  const NEWS = ['huss-ai-2026', 'capstone-2025', 'recap-soldout-2026', 'driveup-2025', 'innovation-league-2025', 'won-pbl-2026'];
  const STEP = { PROBLEM: '문제', IDEA: '아이디어', BUILD: '만들기', TEST: '시험', RESULT: '결과', LEARNED: '배운 점', NEXT: '다음' };
  function path() {
    const record = grp(
      'record',
      { title: '비교과 이수 내역', layout: 'record', anchor: 'record' },
      head('EXTRACURRICULAR', '비교과 이수 내역') +
        `<div class="jr-b pv-rec-shot">${shot(CARHUB.courseShot, 'CarHub 비교과 이수 내역', '비교과 이수 내역 캡처', 'CarHub 이력관리 → 포트폴리오 → 비교과 이수 내역', true)}</div>
        <dl class="jr-b pv-rec">${num(AWARDS.length, '경진대회 수상', `대상 ${grand.length}`)}${num(projects.length, '프로젝트')}${num(CERTS.length, '자격')}${num(`${vol.hours}<small>h</small>`, '봉사', `${vol.count}건`)}${num(PRESS.length, '공식 보도')}${num('<small>국가우수</small>', '장학', '이공계 · 2025')}</dl>`
    );
    // 학년마다 그 해의 이력(갈래 · 이름) — 인턴십 · 연구실 · 동아리 · 해외 교육 · 창업
    const years = grp(
      'years',
      { title: '학년별 비교과 · 경력', layout: 'years', anchor: 'years y2023 y2024 y2025 y2026 career' },
      head('BY GRADE', '학년별 비교과 · 경력') +
        `<ol class="jr-b pv-years" data-split>${STAGES.map((g) => {
          const items = HISTORY.filter((y) => g.years.includes(y.year)).flatMap((y) => y.items.map((it) => ({ ...it, y: y.year })));
          return `<li data-stage="${g.id}"><p class="pv-yr-h"><b>${esc(g.grade)}</b>${esc(g.span)}<span>${items.length}</span></p><ul>${items.map((it) => `<li><small>${esc(it.kind)}</small>${esc(it.title)}</li>`).join('')}</ul></li>`;
        }).join('')}</ol>`
    );
    const caseIds = CASES.map((c) => c.id);
    const grid = grp(
      'projects',
      { title: `대표 프로젝트 ${feat.length}`, layout: 'grid8', anchor: `projects ${feat.filter((p) => !caseIds.includes(p.id)).map((p) => `p-${p.id}`).join(' ')}` },
      head('PROJECTS', `대표 프로젝트 ${feat.length}`, `프로젝트 ${projects.length}개 가운데 — 사진 위는 그 프로젝트가 받은 상 · 공식 보도, 누르면 자세히`) + `<div class="jr-b pv-grid8" data-split>${feat.map((p, k) => tile(p, { no: pad(k + 1) })).join('')}</div>`
    );
    const cases = CASES.map((c, k) => {
      const p = byId(c.id);
      const aw = awardsOf(p.id).sort((a, b) => a.tier - b.tier);
      const pr = pressOf(p.id);
      const steps = (p.story || []).filter((s) => s.title);
      const [main, ...more] = c.shots.map((n) => picOf(p.id, n));
      return grp(
        `p-${p.id}`,
        { title: p.title, layout: 'case', anchor: `p-${p.id}`, flow: 'cols' },
        `<div class="jr-b pv-cshots">${ph(main, '(max-width: 820px) 100vw, 820px', 'is-main')}${more.map((im) => ph(im, '(max-width: 820px) 50vw, 400px')).join('')}</div>
        <div class="jr-b pv-ctext">
          <p class="pv-over">CASE ${pad(k + 1)} — ${esc(categoryOf(p.category).ko)} · ${esc(p.year)}</p>
          <h2>${esc(p.title)}</h2>
          <p class="pv-lead">${esc(p.oneLiner)}</p>
          ${p.metrics.length ? `<dl class="pv-met">${p.metrics.slice(0, 2).map((m) => `<div><dd>${esc(m.value)}</dd><dt>${esc(m.label)}</dt></div>`).join('')}</dl>` : ''}
          ${steps.length ? `<ol class="pv-steps">${steps.map((s) => `<li><small>${STEP[s.label] || esc(s.label)}</small>${esc(s.title)}</li>`).join('')}</ol>` : ''}
          ${aw.length || pr.length ? `<ul class="pv-c-aw">${aw.slice(0, 2).map((a) => `<li><b>${esc(a.grade)}</b><span>${esc(a.contest)}</span></li>`).join('')}${pr.slice(0, 1).map((a) => `<li class="is-press"><b>보도</b><span>${esc(a.publisher)} · ${esc(a.title)}</span></li>`).join('')}</ul>` : ''}
          ${p.role.length ? `<p class="pv-c-role"><small>역할</small>${esc(p.role.slice(0, 3).join(' · '))}</p>` : ''}
          <div class="pv-c-end"><p class="pv-c-to" aria-label="무인 정찰의 흐름에서 — ${esc(TARGET.flow[c.to])}"><small>무인 정찰로</small>${TARGET.flow.map((f, i) => `<span${i === c.to ? ' class="is-on"' : ''}>${esc(f)}</span>`).join('')}</p>${link(p.path, '자세히 보기')}</div>
        </div>`
      );
    });
    // 수상: 등급별(막대) + 대상 상장 벽
    const wall = grand.map((a) => {
      const at = media.length;
      a.certs.forEach((c2) => media.push({ type: 'image', src: c2.src, caption: certCaption(a) }));
      if (!a.certs.length && a.photo) media.push({ type: 'image', src: a.photo.src, caption: certCaption(a) });
      const can = a.certs.length || a.photo;
      return `<li>${can ? `<button type="button" data-cert="${at}" data-n="${a.certs.length || 1}" aria-label="${esc(a.contest)} ${a.certs.length ? '상장' : '시상 사진'} 크게 보기">${certSheet(a, { sizes: '(max-width: 700px) 30vw, 170px' })}</button>` : certSheet(a)}<p><b>${esc(a.contest)}</b><small>${esc(a.date.slice(0, 7).replace('-', '.'))}</small></p></li>`;
    });
    const tiers = [1, 2, 3, 4, 5].map((t) => ({ label: TIER_LABEL[t], n: AWARDS.filter((a) => a.tier === t).length })).filter((r) => r.n);
    const awards = grp(
      'results',
      { title: '경진대회 · 수상', layout: 'awards', anchor: 'results awards' },
      head('AWARDS', `수상 ${AWARDS.length}건`, `<b>대상 ${grand.length}</b>상장을 누르면 크게 봅니다`) +
        bars('등급마다 수상 수', tiers) +
        `<ol class="jr-b pv-wall" data-split>${wall.join('')}</ol>
        <p class="jr-b pv-foot">${link('/awards', `상장 ${AWARDS.length}건 모두 보기`)}</p>`
    );
    const volunteer = grp(
      'volunteer',
      { title: '봉사', layout: 'volunteer', anchor: 'volunteer' },
      `<div class="jr-b pv-vol">
        <p class="pv-over">VOLUNTEER</p>
        <h2>봉사</h2>
        <p class="pv-vol-n"><b>${vol.hours}</b><small>시간</small>${vol.minutes ? `<b>${vol.minutes}</b><small>분</small>` : ''}</p>
        <p class="pv-vol-c">시간인증형 봉사 <b>${vol.count}</b>건</p>
      </div>` + bars('인증 기관마다 봉사 시간', vol.by.map((x) => ({ label: x.name, n: x.hours * 60 + x.minutes, v: `${x.hours}시간${x.minutes ? ` ${x.minutes}분` : ''}` })))
    );
    // 공식 보도: 기사 사진 여섯 — 기사마다 그 프로젝트와 받은 상
    const news = NEWS.map((f) => PRESS.find((a) => a.image?.file.endsWith(`/${f}.webp`))).filter(Boolean);
    const rest = PRESS.filter((a) => !news.includes(a));
    const press = grp(
      'press',
      { title: '공식 보도', layout: 'press', anchor: 'press' },
      head('PRESS', `공식 보도 ${PRESS.length}건`, `<b>직접 소개 ${PRESS_DIRECT}</b>대학 · 사업단 공식 기사 — 누르면 기사로`) +
        `<ol class="jr-b pv-news" data-split>${news
          .map((a) => {
            const b = a.project && bestOf(a.project);
            return `<li><a href="${esc(a.url)}" target="_blank" rel="noopener"><span class="pv-ph"><img src="${esc(a.image.thumb)}" alt="${esc(a.title)} 기사 사진" loading="lazy" decoding="async" /></span><small>${esc(a.publisher)}${a.date ? ` · ${esc(a.date.slice(0, 7).replace('-', '.'))}` : ''}<em>${esc(a.relation)}</em></small><b>${esc(a.title)}</b>${a.project ? `<span class="pv-news-p">${esc(a.project.title)}${b ? `<i class="is-${b.key}">${esc(b.label)}</i>` : ''}</span>` : ''}</a></li>`;
          })
          .join('')}</ol>
        <p class="jr-b pv-news-more">${rest.map((a) => `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a>`).join('<i aria-hidden="true">·</i>')}</p>`
    );
    // 자격 · 다루는 기술(스킬 지도의 갈래마다)
    const certList = [...CERTS].sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
    const certs = grp(
      'certs',
      { title: '자격 · 기술', layout: 'certs', anchor: 'certs stack' },
      head('CERTIFICATIONS &amp; SKILLS', `자격 ${CERTS.length} · 다루는 기술`) +
        `<ol class="jr-b pv-certs" data-split>${certList.map((c) => `<li${c.domain === 'aerial' ? ' class="is-key"' : ''}><time>${c.year ? esc(c.year) : '—'}</time><b>${esc(c.name)}</b></li>`).join('')}</ol>
        <dl class="jr-b pv-stack">${['robot', 'hw', 'ai', 'lang', 'cad', 'web'].map((id) => STACK.find((g) => g.id === id)).filter(Boolean).map((g) => `<div><dt>${esc(g.ko)}</dt><dd>${g.items.map((it) => esc(it.en)).join('<i> · </i>')}</dd></div>`).join('')}</dl>`
    );
    // 졸업 전까지의 자기계발 계획 — 지금까지(기록) · 졸업 전까지(진행 중인 일 · 본인이 채울 자리)
    const intern = HISTORY.flatMap((y) => y.items).filter((it) => /인턴십|연구실/.test(it.kind));
    const now = PLAN.find((c) => c.key === 'now');
    const next = PLAN.find((c) => c.key === 'next');
    const won = (CARHUB.won || []).filter((w) => w.name);
    const ROWS = [
      ['비교과 (WON+)', 'CarHub 이수 내역', won.length ? won.map((w) => `${esc(w.when)} ${esc(w.name)}`).join(' · ') : '', '학년마다 WON+ 프로그램 1개 이상', true],
      ['자격증', `${CERTS.length}개 — ${esc(certList.filter((c) => c.year).slice(-1)[0]?.name || '')}`, '', '졸업 전 취득할 자격'],
      ['외국어', '', CARHUB.language ? esc(CARHUB.language) : '', '시험 · 목표 점수'],
      ['공모전 · 경진대회', `수상 ${AWARDS.length}건 · 대상 ${grand.length}`, '', '도전할 대회'],
      ['대학원', '', `${esc(TARGET.grad)} 진학 준비`, ''],
      ['인턴십 · 연구실', [...new Set(intern.map((it) => it.title))].map(esc).join(' · '), `${esc(now.items.find((it) => it.proof === 'iot-iv-pole')?.h || '')} — 진행 중`, ''],
      ['프로젝트', `${projects.length}개`, next.items.slice(0, 2).map((it) => esc(it.h)).join(' → '), ''],
      ['봉사', `${volH} · ${vol.count}건`, '', '이어 갈 봉사'],
    ];
    const plan = grp(
      'devplan',
      { title: '자기계발 계획', layout: 'devplan', anchor: 'devplan' },
      head('BEFORE GRADUATION', '졸업 전까지의 자기계발 계획') +
        `<table class="jr-b pv-dev"><thead><tr><th scope="col">분야</th><th scope="col">지금까지</th><th scope="col">졸업 전까지</th></tr></thead><tbody>${ROWS.map(
          ([k, done, todo, hint, must]) => `<tr><th scope="row">${k}</th><td>${done || '<span class="pv-dash">—</span>'}</td><td>${todo || `<span class="pv-fill${must ? ' is-must' : ''}">${must ? '★ ' : ''}입력 예정 · ${hint}</span>`}</td></tr>`
        ).join('')}</tbody></table>`
    );
    return (
      chapter(3, '쌓아 온 비교과 — 상과 보도로 확인된 프로젝트, 졸업까지의 계획', ['비교과 이수 내역', '학년별 비교과 · 경력', `대표 프로젝트 ${feat.length} · 사례 ${CASES.length}`, '공식 보도 · 수상', '봉사 · 자격 · 기술', '자기계발 계획'], shotOf('baja-ev-formula', '01')) +
      record +
      years +
      grid +
      cases.join('') +
      press +
      awards +
      volunteer +
      certs +
      plan
    );
  }

  // ── STEP 4 미래설계 ──
  function future() {
    const WHEN = { now: '단기', next: '중기', goal: '장기' };
    // 단기: 대학원 준비 · 4족보행 기획 · 중기: 로보틱스 석사(자율 · 인식) · 장기: ADD 무인 감시정찰(드론)
    const GOAL_PICS = { now: ['quadruped-robot', '02'], next: ['airsim-driving', '03'], goal: ['pixhawk-drone', '04'] };
    const goals = grp(
      'goals',
      { title: '단기 · 중기 · 장기 목표', layout: 'goals', anchor: 'plan goals plan-now plan-next plan-goal' },
      head('ROADMAP', '단기 · 중기 · 장기 목표') +
        `<ol class="jr-b pv-goals" data-split>${PLAN.map((c) => {
          const [id, n] = GOAL_PICS[c.key];
          return `<li data-step="${c.key}">${ph(picOf(id, n), '(max-width: 700px) 90vw, 420px')}<p class="pv-g-k"><b>${WHEN[c.key]}</b>${esc(c.when)}</p><h3>${esc(c.title)}</h3><ul>${c.items.map((it) => `<li>${esc(it.h)}</li>`).join('')}</ul></li>`;
        }).join('')}</ol>`
    );
    const vision = grp(
      'vision',
      { title: '10년 · 30년 후', layout: 'vision', anchor: 'vision card' },
      `<div class="jr-b pv-vision">
        <p class="pv-over">FUTURE ME</p>
        <h2>10년 · 30년 후의 나</h2>
        <dl>${[
          ['10년 후', CARHUB.vision10],
          ['30년 후', CARHUB.vision30],
        ]
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${v ? esc(v) : slot(`${k} 나의 모습`, '어디에서 · 무엇을 만드는 사람')}</dd></div>`)
          .join('')}</dl>
      </div>
      <figure class="jr-b pv-card" aria-label="미래 명함">
        <div class="pv-card-f">
          <p class="pv-card-r">${esc(profile.role)}</p>
          <p class="pv-card-n">${esc(profile.name)}<span>${esc(profile.en)}</span></p>
          <p class="pv-card-d">${esc(TARGET.short)}</p>
          <ul class="pv-card-c"><li>${esc(mail.value)}</li><li>github.com/${esc(gh.value)}</li></ul>
          <img class="pv-card-q" src="/qr.svg" width="96" height="96" alt="" aria-hidden="true" />
        </div>
        <figcaption>미래 명함</figcaption>
      </figure>`
    );
    const thanks = grp(
      'thanks',
      { title: '마치며', layout: 'thanks', anchor: 'thanks', bare: true },
      `<div class="jr-b pv-thanks">
        <p class="pv-over">THANK YOU</p>
        <h2>감사합니다</h2>
        <p class="pv-motto">${esc(profile.motto)}</p>
      </div>
      <div class="jr-b pv-contact">
        <figure class="pv-qr"><img src="/qr.svg" width="160" height="160" alt="포트폴리오 주소 QR 코드" /><figcaption><b>kwon-physical-ai.vercel.app</b>휴대폰으로 찍으면 포트폴리오가 열립니다</figcaption></figure>
        <ul class="pv-links">${profile.links.slice(0, 3).map((l) => `<li><a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}><span>${esc(l.label)}</span>${esc(l.value)}</a></li>`).join('')}</ul>
      </div>`
    );
    return chapter(4, `로보틱스 대학원을 거쳐 ${esc(TARGET.short)}으로 — 목표와 실행 계획, 그리고 미래의 나`, ['단기 · 중기 · 장기 목표', '10년 · 30년 후 · 미래 명함'], shotOf('quadruped-robot', '01')) + goals + vision + thanks;
  }

  const secs = [
    ['about', about],
    ['self', self],
    ['job', job],
    ['path', path],
    ['future', future],
  ];
  const html =
    `<section data-sec="intro" data-title="PORTFOLIO" data-short="표지">${intro()}</section>` +
    secs
      .map(([id, fn]) => {
        const [, ko, en, short, no] = PR_SECS.find((s) => s[0] === id);
        return `<section data-sec="${id}" data-no="${no}" data-title="${esc(ko)}" data-short="${esc(short)}" data-en="${esc(en)}">${fn()}</section>`;
      })
      .join('');
  return { html, media };
}
