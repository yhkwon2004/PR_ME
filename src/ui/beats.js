// 한 장면 안의 여러 화면(비트): 스크롤 없이 영화처럼 한 화면씩 바뀐다 — 휠 · 스와이프 · 방향키 · 아래 칸 · 자동 재생.
// 필름은 프로젝트에 집중한다: 01 소개(이 세 화면) → 02 프로젝트(드론 · 모빌리티 / 로봇 · AI / 창업 · 제품개발) → 03 보도 · 수상.
// 성장 과정 · 보유 역량 · 미래 계획은 따로 떨어진 발표 자료(yhkwon2004/wku_portfolio)에서 다룬다.
import gsap from 'gsap';
import { profile } from '../content.js';
import { projects, byId, FEATURED } from '../data/projects.js';
import { AWARDS, TIER_LABEL } from '../data/awards.js';
import { CERTS, STACK } from '../data/skills.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
// 가운뎃점 · 줄표가 줄 맨 앞에 서지 않게: 앞 낱말과 붙는 공백(NBSP)으로 묶는다 — 줄은 점 뒤에서만 바뀐다
const bind = (s = '') => esc(s).replace(/ ([·—–]) /g, '&nbsp;$1 ');
// 사진 설명: 가운뎃점 · 줄표는 앞 낱말에 붙이고(bind), 대문자 두 낱말 이름(INFU RETRO)과 끝의 짧은 낱말('환자 앱')은 한 덩어리로 —
// 좁은 단에서 '· 환자 앱'으로 시작하는 줄이나 '앱' 하나만 남은 끝 줄이 생겼다
const capOf = (s = '') => bind(s).replace(/\b([A-Z]{2,}) ([A-Z]{2,})\b/g, '$1&nbsp;$2').replace(/ (\S{1,2})$/, '&nbsp;$1');
// 한 낱말처럼 읽는 말(경량 AI)은 그 사이에서 줄이 바뀌지 않게
const tie = (s = '', words = []) => words.reduce((h, w) => h.split(esc(w)).join(esc(w).replace(/ /g, '&nbsp;')), esc(s));
// 장면 표시: 장면 번호 · 장(발표 순서) · 이 화면 — 장은 renderBeats가 그 장면의 것으로 정해 둔다
let chapter = null;
function kicker(i, text) {
  // 영문 꼬리표(PROFILE · EDUCATION · NOW)만 고정폭 글꼴 — 한국어는 본문 글꼴로(글자 사이를 벌리지 않게)
  const [en, ko] = text.split(' — ');
  const txt = ko ? `<span class="kt-en">${esc(en)} —</span> <span class="kt-ko">${bind(ko)}</span>` : bind(text);
  // 오른쪽 끝의 화면 번호(01 / 03)는 renderBeats가 화면 수를 알고 채운다(<!--bt-idx-->)
  return `<p class="kicker b-a"><span class="kicker-no">SC ${pad(i)}</span>${chapter ? `<span class="kicker-ch">CH ${esc(chapter[0])}<span class="kicker-chn"> · ${esc(chapter[1])}</span></span>` : ''}<span class="kicker-txt">${txt}</span><!--bt-idx--></p>`;
}

// ── 소개: 실제 이력서처럼 세 화면 — 다음 장면부터 프로젝트 ──
// 잡지 지면처럼 상자 없이 — 세 단(column) · 가는 선 · 큰 활자(beats.css)
// ① 소개: [큰 증명사진 + 장학] | [이름 · 한 줄 · 소속 · 연락처] | [대표 프로젝트 여덟 · 수상(등급별 수 · 대상 상장 작게)]
// ② 학력 · 기록: 위에 큰 숫자 넷, 아래 [학력] | [다루는 언어 · 스킬(분야마다 한 줄)]
// ③ 지금 · INFUTECH: 기획 기사 펼침면 — 큰 제품 사진 | 소속 · 역할 · 리드 · 성과 넷 · 더 · 팀 — 자세한 기록은 프로젝트 페이지
function profileBeats(scene, i) {
  const email = profile.links.find((l) => l.url.startsWith('mailto:'));
  const grand = AWARDS.filter((a) => a.tier === 1);
  const sheets = grand.filter((a) => a.certs.length); // 상장 사진이 있는 대상만 작게 늘어놓는다
  const vol = profile.volunteer;
  const sch = profile.scholarship;
  const nums = [
    [projects.length, '프로젝트'],
    [AWARDS.length, '수상', `대상 ${grand.length}`],
    [`${vol.hours}h`, '봉사', `${vol.count}건`],
    [CERTS.length, '자격증'],
  ];
  const tiers = [1, 2, 3, 4, 5].map((t) => [TIER_LABEL[t], AWARDS.filter((a) => a.tier === t).length]).filter(([, n]) => n);
  const feat = FEATURED.map(byId).filter(Boolean);
  const edu = profile.education || [];
  const now = profile.now;
  const nowP = now && byId(now.project);
  const cur = edu.filter((e) => e.note !== '입학');
  // 연락처: 이름표 + 값 + 화살표(메일 →, 바깥 주소 ↗) — 읽기 프로그램은 '이름표 값'으로 읽는다
  const link = (l) => {
    const mail = l.url.startsWith('mailto:');
    return `<li><a href="${esc(l.url)}"${mail ? '' : ' target="_blank" rel="noopener"'}><span>${esc(l.label)}</span> <b>${esc(l.value)}</b><i aria-hidden="true">${mail ? '→' : '↗'}</i></a></li>`;
  };
  // 한 줄 다짐: 쉼표 뒤에서만 줄을 바꾼다('작은 / 실험으로'처럼 낱말 사이에서 끊기지 않게)
  const motto = String(profile.motto)
    .split(/,\s+/)
    .map((m, k, a) => `<span>${esc(m)}${k < a.length - 1 ? ',' : ''}</span>`)
    .join(' ');
  // 가운뎃점으로 이은 짧은 묶음(역할 · 소속): 묶음마다 한 덩어리로 — 줄은 묶음 사이에서만
  const groups = (s) =>
    String(s)
      .split(' · ')
      .map((g, k, a) => `<span class="nw">${esc(g)}${k < a.length - 1 ? ' ·' : ''}</span>`)
      .join(' ');
  // 잡지 지면처럼: 상자 없이 장면 위에 바로 — 단(column) 사이의 가는 선 · 작은 번호 · 큰 활자로 위계를 만든다
  const no = (n) => `<i class="rs-no" aria-hidden="true">${pad(n)}</i>`;
  return [
    {
      key: 'who',
      label: '소개',
      cls: 'bt-who',
      html: `<div class="bt-top panel-content">
          ${kicker(i, `PROFILE — 대학 시절 포트폴리오 ${profile.span}`)}
        </div>
        <div class="bt-body panel-content">
          <article class="rs-cover">
            <div class="rs-lead">
              ${profile.photo ? `<figure class="rs-photo b-a"><img src="${esc(profile.photo.src)}" width="${profile.photo.w}" height="${profile.photo.h}" alt="${esc(profile.name)} 증명사진" decoding="async" /></figure>` : ''}
              <p class="rs-sch b-a"><b>${esc(sch.title)}</b><span>${bind(`${sch.date.slice(0, 4)} · 과학기술정보통신부`)}</span></p>
            </div>
            <div class="rs-id">
              <p class="rs-role b-a">${esc(profile.role)}</p>
              <h2 class="rs-name b-a">${esc(profile.name)}<span>${esc(profile.en)}</span></h2>
              <p class="rs-motto b-a">${motto}</p>
              <dl class="rs-facts b-a">
                ${cur.map((e) => `<div><dt>${esc(e.note.includes('복수') ? '복수전공' : '소속')}</dt><dd>${esc(e.school)} <span class="nw">${esc(e.major)}</span></dd></div>`).join('')}
              </dl>
              <ul class="rs-links b-a">${[email, ...profile.links.filter((l) => l !== email && /GitHub|Notion/.test(l.label))].filter(Boolean).map(link).join('')}</ul>
            </div>
            <div class="rs-side">
              <section class="rs-feat b-a" aria-label="대표 프로젝트 ${feat.length}">
                <h3 class="rs-h">${no(1)}대표 프로젝트 <span>${feat.length}</span></h3>
                <ul>${feat
                  // 이름표 · 풀이(title) · 보이는 이름을 같은 글자(가운뎃점 앞 NBSP까지)로 — 글자가 다르면 Chrome이 title을 설명으로 한 번 더 읽는다
                  // 띄어 쓰지 않고 점으로 이은 영문 이름(BAJA·EV·Formula)은 점 뒤에서 줄을 바꿀 수 있게(<wbr> — 글자는 그대로) — 좁은 단에서 한 덩어리로 넘쳐 잘렸다
                  .map((p) => `<li><a href="${p.path}" data-link aria-label="${bind(p.title)}" title="${bind(p.title)}">${p.cover ? `<img src="${esc(p.cover.thumb)}" alt="" loading="lazy" decoding="async" />` : ''}<b>${bind(p.title).replace(/·(?=[^\s&])/g, '·<wbr>')}</b></a></li>`)
                  .join('')}</ul>
              </section>
              <section class="rs-aw b-a" aria-label="수상 ${AWARDS.length}건">
                <h3 class="rs-h">${no(2)}수상 <span>${AWARDS.length}</span></h3>
                <p class="rs-tiers">${tiers.map(([l, n]) => `<span${l === TIER_LABEL[1] ? ' class="is-grand"' : ''}>${esc(l)} <b>${n}</b></span>`).join('')}</p>
                <a class="rs-sheets" href="/awards" data-link aria-label="대상 상장 ${sheets.length}장 — 수상 기록 보기">${sheets
                  // 상장 사진은 장식(alt="") — title을 달면 읽기 프로그램이 이름 없는 그림 여섯 개로 읽는다(묶음 이름은 링크가 가진다)
                  .map((a) => `<img src="${esc(a.certs[0].sm)}" alt="" loading="lazy" decoding="async" />`)
                  .join('')}<i aria-hidden="true">→</i></a>
              </section>
            </div>
          </article>
        </div>`,
    },
    {
      key: 'profile',
      label: '학력 · 기록',
      cls: 'bt-prof',
      html: `<div class="bt-top panel-content">
          ${kicker(i, 'EDUCATION — 학력 · 기록 · 스킬')}
          <h2 class="bt-h b-a">학력과 숫자로 본 기록</h2>
        </div>
        <div class="bt-body panel-content">
          <div class="rs-grid">
            <section class="rs-rec b-a">
              <h3 class="rs-h">${no(1)}기록</h3>
              <dl class="rs-nums">${nums
                .map(([n, l, s]) => `<div><dt>${esc(l)}</dt><dd>${esc(n)}${s ? `<small>${esc(s)}</small>` : ''}</dd></div>`)
                .join('')}</dl>
            </section>
            <section class="rs-edu b-a">
              <h3 class="rs-h">${no(2)}학력</h3>
              <ol class="rs-tl">${edu
                .map((e) => `<li><time>${esc(e.period)}</time><b>${esc(e.school)}</b><span>${esc(e.major)}</span><em>${bind(e.note)}</em></li>`)
                .join('')}</ol>
            </section>
            <section class="rs-skills b-a">
              <h3 class="rs-h">${no(3)}다루는 언어 · 스킬 <a href="/skills" data-link>근거와 함께 보기&nbsp;<span aria-hidden="true">→</span></a></h3>
              <dl>${STACK.map(
                (g) =>
                  `<div><dt>${bind(g.ko)}</dt><dd>${g.items
                    // 기술마다 한 덩어리(inline-block) — 뒤의 가운뎃점과 빈칸(NBSP)도 그 덩어리에 붙여, 줄이 점으로 시작하지 않고
                    // 줄 수를 줄인 자리의 '…'는 '· …'로 기술 사이에서 끝난다(줄은 덩어리 사이에서만 바뀐다)
                    .map((s, k, a) => `<span class="sk">${bind(s.name)}${k < a.length - 1 ? '<i> ·&nbsp;</i>' : ''}</span>`)
                    .join('')}</dd></div>`
              ).join('')}</dl>
            </section>
          </div>
        </div>`,
      email: email?.value,
    },
    // ③ 지금: INFUTECH — 최근 맡은 일과 성과(profile.now). 자세한 기록은 프로젝트 페이지로 — 잡지의 기획 기사 펼침면처럼(왼쪽 큰 사진, 오른쪽 글).
    // 사진 설명(캡션)은 보이는 글과 같으므로 읽기 프로그램에는 사진 링크의 설명(aria-describedby)으로 한 번만 읽힌다
    ...(now
      ? [
          {
            key: 'now',
            label: '지금 · INFUTECH',
            cls: 'bt-now',
            html: `<div class="bt-top panel-content">
          ${kicker(i, `NOW — 지금 만드는 것 · ${now.product}`)}
          <h2 class="bt-h b-a">${esc(now.title)}</h2>
        </div>
        <div class="bt-body panel-content">
          <article class="rs-now">
            ${now.photo ? `<figure class="rs-now-fig b-a"><a class="rs-now-photo" href="${nowP ? nowP.path : '/works'}" data-link aria-label="${esc(`${now.product} 프로젝트 보기`)}" aria-describedby="rs-now-cap"><img src="${esc(now.photo.src)}" width="${now.photo.w}" height="${now.photo.h}" alt="${esc(now.photo.alt)}" loading="lazy" decoding="async" /></a><figcaption id="rs-now-cap" aria-hidden="true">${capOf(now.photo.alt)}</figcaption></figure>` : ''}
            <div class="rs-now-text">
              <div class="rs-now-id b-a">
                <p class="rs-now-org">${(() => {
                  // 'INFUTECH · 학생창업기업 인퓨테크' → 큰 이름(워드마크) + 작은 설명 — 가운뎃점은 읽기 프로그램에만
                  const [mark, ...rest] = String(now.org).split(' · ');
                  return rest.length
                    ? `<b class="rs-now-mark">${esc(mark)}</b><span class="rs-sr"> · </span><span class="rs-now-kind">${esc(rest.join(' · '))}</span>`
                    : `<b class="rs-now-mark">${esc(mark)}</b>`;
                })()}</p>
                <p class="rs-now-role">${groups(now.role)}</p>
              </div>
              <p class="rs-now-lead b-a">${tie(now.lead, ['경량 AI'])}</p>
              <dl class="rs-now-facts b-a">${now.facts
                .map((f, k) => `<div><dt><i class="rs-now-no" aria-hidden="true">${pad(k + 1)}</i>${bind(f.label)}</dt><dd class="rs-now-v">${esc(f.value)}</dd>${f.sub ? `<dd class="rs-now-sub">${groups(f.sub)}</dd>` : ''}</div>`)
                .join('')}</dl>
              <ul class="rs-now-more b-a">${now.more.map((m) => `<li>${bind(m)}</li>`).join('')}</ul>
              <div class="rs-now-foot b-a">
                <p class="rs-now-team">${bind(now.team)}</p>
                ${nowP ? `<a class="rs-now-go" href="${nowP.path}" data-link>프로젝트 기록 보기 <span aria-hidden="true">→</span></a>` : ''}
              </div>
            </div>
          </article>
        </div>`,
          },
        ]
      : []),
  ];
}

export function renderBeats(scene, i) {
  chapter = scene.chapter || null;
  const beats = profileBeats(scene, i);
  chapter = null;
  // 머리줄 오른쪽 끝: 이 화면 번호 / 화면 수(장식 — 읽기 프로그램은 아래 화면 칸으로 안다)
  beats.forEach((b, k) => (b.html = b.html.replace('<!--bt-idx-->', `<span class="kicker-idx" aria-hidden="true">${pad(k + 1)}<i> / </i>${pad(beats.length)}</span>`)));
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

// 비트 넘김: 나가는 화면은 본문이 넘기는 쪽으로 조금 밀리며 사라지고, 그다음 들어오는 화면의 줄들이 반대쪽에서 차례로 들어온다 —
// 두 화면이 한순간도 겹쳐 보이지 않게(나가는 화면은 통째로, 들어오는 글 · 사진은 줄마다 움직인다). 머리줄은 제자리에서 나타나고 사라지기만 —
// 미끄러지는 거리는 위 HUD · 아래 화면 칸과의 틈보다 짧게(beats.css --slide)
export function bindBeats(el, reducedMotion, onBeat) {
  const list = [...el.querySelectorAll('.beat')];
  if (!list.length) return null;
  const nav = [...el.querySelectorAll('.beat-nav button')];
  let index = 0;
  // 화면에 들어서는 줄들(차례대로). 휴대폰의 첫 화면은 장학 줄(.rs-sch)이 DOM에서는 사진 다음(넓은 화면의 왼쪽 단)이지만 화면에서는
  // 이름 아래에 선다(beats.css — .rs-lead가 display: contents) — 들어서는 차례도 보이는 차례대로 이름 다음으로
  const parts = (b) => {
    const p = [...b.querySelectorAll('.b-a')];
    const s = b.querySelector('.rs-sch');
    const n = b.querySelector('.rs-name');
    if (s && n && p.includes(n) && getComputedStyle(s.parentElement).display === 'contents') {
      p.splice(p.indexOf(s), 1);
      p.splice(p.indexOf(n) + 1, 0, s);
    }
    return p;
  };
  const bodyOf = (b) => b.querySelector('.bt-body');
  // 다음 · 이전 화면의 사진은 미리 받아 둔다(숨은 화면의 lazy 사진은 보일 때에야 받기 시작해 빈 칸이 보였다)
  const warm = (k) =>
    [list[k - 1], list[k + 1]].forEach((b) => b?.querySelectorAll('img[loading="lazy"]').forEach((im) => (im.loading = 'eager')));
  // 나간 화면 정리: 지금 화면이 아니면 숨기고 움직임 흔적을 지운다
  const settle = (b) => {
    if (b === list[index]) return;
    b.hidden = true;
    gsap.set([b, bodyOf(b), ...parts(b)].filter(Boolean), { clearProps: 'opacity,visibility,transform' });
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
  // 머리줄 높이 맞추기(beats.css의 --pin): 화면마다 가운데 둘 때의 위 여백(auto)을 재어 가장 작은 값을 모두가 쓴다 —
  // 가장 긴 화면은 제자리, 짧은 화면도 같은 높이에서 시작하고 남는 자리는 아래로. 장면이 보일 때만 잰다(숨은 장면은 높이 0)
  const host = el.querySelector('.beats');
  // 화면 크기는 .beat-stage(장면 크기 그대로 · inset 0)로 지켜본다 — .beats는 안이 모두 absolute라 높이가 늘 0이어서
  // 창 높이만 바뀔 때(창을 줄이거나 주소창 · 개발자 도구가 열릴 때) 알려 주지 않았다
  const stage = el.querySelector('.beat-stage');
  // 넘길 때 글이 미끄러지는 거리(px): beats.css의 --slide — 머리줄을 HUD 바로 아래에, 마지막 줄을 아래 화면 칸 가까이에 둔
  // 휴대폰 · 낮은 창은 짧게(그 틈보다 작게), 넉넉한 화면은 길게. 머리줄(.bt-top)은 세 화면이 같은 높이에 서므로 미끄러지지 않고 나타나기만 한다
  const slide = () => parseFloat(host ? getComputedStyle(host).getPropertyValue('--slide') : '') || 14;
  const lift = (d) => (k, e) => (e.closest('.bt-top') ? 0 : d);
  // 화면의 글자 · 사진 조각(줄마다 하나)을 제자리로: 들어서는 중에 줄마다 준 y 움직임(GSAP)을 빼고, 넘친 부분을 감추는 상자(한 줄로 접은
  // 기술 · 두 줄로 자른 이름) 밖으로 나간 줄은 그 상자에서 자른다. shown: 이미 나타난 줄(visibility: hidden이 아닌 것)만
  const stageEl = document.getElementById('stage');
  const inks = (b, shown = false) => {
    const out = [];
    const z = parseFloat(getComputedStyle(stageEl || b).zoom) || 1;
    const clipOf = new Map();
    const clip = (el) => {
      if (clipOf.has(el)) return clipOf.get(el);
      let c = [-1e9, 1e9];
      if (el && el !== b) {
        const up = clip(el.parentElement);
        c = up;
        if (getComputedStyle(el).overflow !== 'visible') {
          const r = el.getBoundingClientRect();
          c = [Math.max(up[0], r.top), Math.min(up[1], r.bottom)];
        }
      }
      clipOf.set(el, c);
      return c;
    };
    const rg = document.createRange();
    // 나가는 화면은 본문(.bt-body)째로 밀린다 — 그 움직임도 뺀다
    const body = bodyOf(b);
    const by = body ? (parseFloat(gsap.getProperty(body, 'y')) || 0) * z : 0;
    for (const p of parts(b)) {
      if (shown && getComputedStyle(p).visibility === 'hidden') continue;
      const dy = (parseFloat(gsap.getProperty(p, 'y')) || 0) * z + (body?.contains(p) ? by : 0);
      const add = (r, el) => {
        if (r.width < 1 || r.height < 2) return;
        const [ct, cb] = clip(el);
        const t = Math.max(r.top, ct);
        const bot = Math.min(r.bottom, cb);
        if (bot - t >= 2) out.push({ left: r.left, right: r.right, top: t - dy, bottom: bot - dy });
      };
      p.querySelectorAll('img').forEach((im) => add(im.getBoundingClientRect(), im.parentElement));
      const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        if (!t.textContent.trim() || t.parentElement.closest('.rs-sr')) continue;
        rg.selectNodeContents(t);
        for (const r of rg.getClientRects()) add(r, t.parentElement);
      }
    }
    return out;
  };
  // ── 넘침 안전망 ── 높이 · 폭 단계는 띄엄띄엄이라 단계 사이의 좁은 띠(단계 경계 바로 위 몇 px)에서 글 · 사진이 아래 화면 칸 ·
  // '다음 장면' 단추 · 장면 막대에 12px보다 가까이(또는 그 밑으로) 내려가거나, 스크롤하는 단계에서 아래 흐림 띠 밑으로 들어간다.
  // 경계를 또 옮기는 대신 화면마다 재어서 고친다 — 두 걸음:
  //  ① 줄 사이 · 단 사이 · 머리줄 아래 간격(beats.css의 var(--k) 곱 — 글 크기는 그대로)을 1에서 0.5까지 0.1씩 줄여, 다 들어가는 가장 큰
  //     값을 그 화면에 준다(.is-tight · --k). 몇 px 넘친 화면은 0.9 — 0.8로 끝나 눈에 띄지 않고, 스크롤 · '더 있어요'가 뜨지 않는다.
  //  ② 0.5로도 넘치면(크게 넘친 화면) 간격은 그대로 두고, 스크롤하지 않는 배치에서는 그 화면만 스크롤하는 화면으로 바꾼다
  //     (.is-scroll — beats.css: 화면 안에서 위아래로 스크롤 · 아래 흐림 띠 · '아래에 더 있어요'). 스크롤하는 단계는 그 단계 그대로.
  // 다 들어가는 화면은 아무것도 바꾸지 않는다. 판단은 늘 이 표시들을 뗀 제자리 배치(스크롤 없음 · 원래 아래 여백 · --k 1)에서 줄여 가며
  // 하므로 표시가 바꾼 배치에 따라 켜졌다 꺼졌다 하지 않는다
  const CLEAR = 12;
  const KS = [0.9, 0.8, 0.7, 0.6, 0.5];
  const setK = (b, k) => {
    b.classList.toggle('is-tight', k < 1);
    if (k < 1) b.style.setProperty('--k', String(k));
    else b.style.removeProperty('--k');
  };
  // 이 화면이 지금 배치에서 넘치는가: 스크롤하지 않는 배치는 글자 · 사진 끝이 화면 칸 · '다음 장면' 단추 · 장면 막대 12px 안으로,
  // 스크롤하는 단계는 맨 위에서 아래 흐림 띠(안쪽 아래 여백 — 그 위끝이 화면 칸 · '다음 장면' 단추 12px 남짓 위)에 tol px 넘게
  // (tol 4는 more()와 같은 잣대 — 끝 줄의 글자 상자 아래 몇 px는 글자가 없는 자리라 반쯤 지워지지 않는다. 스크롤한 만큼은 되돌려 잰다)
  const over = (b, tol = 4) => {
    const cs = getComputedStyle(b);
    if (cs.overflowY !== 'visible') {
      const limit = b.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) + tol - b.scrollTop;
      return inks(b).some((r) => r.bottom > limit);
    }
    const box = (el) => (el && !el.hidden && getComputedStyle(el).display !== 'none' ? el.getBoundingClientRect() : null);
    // 장면에 들어서는 동안은 아래 화면 칸도 22px 아래(뒤로 돌아오면 위)에서 떠오르는 중이다(panels.js show의 [data-r]) — 그 움직임을 빼고
    // 제자리로 견준다. 빼지 않으면 처음 연 화면(320×836 등)이 칸 아래 22px을 더 있는 것으로 재어 간격을 줄이지 않고, 칸이 올라온 뒤
    // 글이 칸에 6px까지 붙었다(창 크기를 바꾸어야 바로잡혔다)
    const navEl = host.querySelector('.beat-nav');
    const nr = box(navEl);
    const ny = nr ? (parseFloat(gsap.getProperty(navEl, 'y')) || 0) * (parseFloat(getComputedStyle(stageEl || b).zoom) || 1) : 0;
    const nav = nr && { left: nr.left, right: nr.right, top: nr.top - ny, height: nr.height };
    const cue = box(document.querySelector('.next-cue'));
    const rail = [...document.querySelectorAll('#timeline li, #timeline button')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
    // 무대가 들려 있으면(당겨 넘기는 중 · 넘김 안내 시연 — 움직이는 중의 값) 무대 밖의 '다음 장면' 단추 · 장면 막대와는 제자리로 견준다
    const sc = getComputedStyle(stageEl || b);
    const up = (parseFloat(String(sc.translate).split(' ')[1]) || 0) * (parseFloat(sc.zoom) || 1);
    const under = (r, o) => o && o.height > 0 && r.right > o.left && r.left < o.right && r.bottom > o.top - CLEAR;
    const floor = Math.min(innerHeight, ...rail.map((r) => r.top)) - CLEAR;
    return inks(b).some((r) => under(r, nav) || under({ ...r, bottom: r.bottom - up }, cue) || r.bottom - up > floor);
  };
  // ① 다 들어가는 가장 큰 간격(--k). 스크롤하는 단계는 먼저 끝 줄이 흐림 띠 위에서 끝나는 값(tol 0 — 화면 칸 · '다음 장면' 단추와
  //    12px 넘게)을 찾고, 반으로 줄여도 안 되면 띠에 4px까지 들어가는 값(tol 4)으로 — 4px 들어간 채 멈춘 끝 줄이 '다음 장면' 단추와
  //    8px까지 붙었다(899 — 900×600)
  const tighten = (b) => {
    const tols = getComputedStyle(b).overflowY !== 'visible' ? [0, 4] : [4];
    for (const tol of tols) {
      setK(b, 1);
      if (!over(b, tol)) return 1;
      setK(b, KS[KS.length - 1]);
      if (over(b, tol)) continue;
      for (const k of KS) {
        setK(b, k);
        if (!over(b, tol)) return k;
      }
    }
    setK(b, 1);
    return 1;
  };
  // ② 그래도 넘치면 스크롤하는 화면으로(스크롤하지 않는 배치에서만)
  const fit = (b = list[index], top = b?.scrollTop || 0) => {
    if (!host || !b || !b.offsetHeight) return;
    b.classList.remove('is-scroll', 'is-slack');
    const need = getComputedStyle(b).overflowY === 'visible' && over(b);
    b.classList.toggle('is-scroll', need);
    if (need && top) b.scrollTop = top;
  };
  const pin = () => {
    if (!host || !list[index].offsetHeight) return;
    const top = list[index].scrollTop;
    // 잴 동안은 첫 화면의 아래 채우기(beats.css .is-pinned)와 안전망(.is-scroll · --k)을 끈다 — 켜 두면 남는 높이를 본문이 다 가져가
    // 위 여백이 0으로 잡힌다. 숨은 화면도 잠깐 펼쳐(보이지 않게) 잰다
    host.classList.remove('is-pinned');
    host.style.removeProperty('--pin');
    const off = list.map((b) => {
      b.classList.remove('is-scroll', 'is-slack');
      setK(b, 1);
      const o = [b.hidden, b.style.visibility];
      if (o[0]) {
        b.hidden = false;
        b.style.visibility = 'hidden';
      }
      return o;
    });
    const margin = (b) => {
      const t = b.querySelector('.bt-top');
      return t ? parseFloat(getComputedStyle(t).marginTop) || 0 : 0;
    };
    // 머리줄 높이(--pin)는 화면마다의 간격(--k)을 준 배치로 잰다 — 넘치는 화면을 줄이면 그 화면의 위 여백이 생겨 머리줄이 덜 올라간다.
    // 줄인 뒤 --pin이 커지면 다른 화면이 그만큼 내려가므로 다시 본다(--k는 줄기만 하고 --pin은 늘기만 해 두세 번이면 멎는다)
    let ks = list.map(() => 1);
    for (let n = 0; n < 3; n++) {
      host.classList.remove('is-pinned');
      host.style.removeProperty('--pin');
      list.forEach((b, j) => setK(b, ks[j]));
      host.style.setProperty('--pin', `${Math.max(0, Math.min(...list.map(margin)))}px`);
      host.classList.add('is-pinned');
      const next = list.map(tighten);
      const same = next.every((k, j) => k === ks[j]);
      ks = next;
      if (same) break;
    }
    list.forEach((b, j) => {
      if (off[j][0]) {
        b.hidden = true;
        b.style.visibility = off[j][1];
      }
    });
    fit(list[index], top);
    more();
  };
  // 화면 안에서 스크롤하는 낮은 창 · 휴대폰: 아래 흐림 띠 밑에 가려진 글 · 사진이 남았으면 .has-more(beats.css가 아래 화면 칸 옆에
  // '아래에 더 있어요'). 넘친 높이가 아니라 보이는 글자 · 사진의 아래 끝으로 잰다 — 손가락 화면의 44px 누르는 자리나 줄 아래 여백만
  // 넘친 것은 가려진 글이 없다. 흐림 띠는 화면의 안쪽 아래 여백(padding-bottom) 자리에서 시작하고, 끝 줄이 그 띠에 4px 넘게
  // 들어가면 반쯤 지워진 것으로 본다. 아직 나타나지 않은 줄(넘기는 중 — visibility: hidden)은 들어선 뒤에 다시 잰다(set의 onComplete).
  // 맨 위에서 가려진 글자 · 사진이 하나도 없는데 몇 px 넘친 것(누르는 자리 · 줄 아래 여백뿐)은 스크롤하지 않는다(.is-slack —
  // overflow-y: hidden): 그대로 두면 첫 휠 · 스와이프가 그 몇 px만 스크롤하고 화면을 넘기지 않았다(input.js는 스크롤할 여지를 먼저 준다).
  // 이 판단도 들어서는 중의 움직임을 뺀 제자리 · 아직 나타나지 않은 줄까지 넣어 한다
  const more = () => {
    const b = list[index];
    if (!host || !b) return;
    let on = false;
    let slack = false;
    const cs = getComputedStyle(b);
    const over = b.scrollHeight - b.clientHeight;
    if ((cs.overflowY === 'auto' || b.classList.contains('is-slack')) && over > 0) {
      const limit = b.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) + 4;
      if (over - b.scrollTop > 0) on = inks(b, true).some((r) => r.bottom > limit);
      slack = b.scrollTop < 1 && !inks(b).some((r) => r.bottom > limit);
    }
    b.classList.toggle('is-slack', slack);
    host.classList.toggle('has-more', on && !slack);
  };
  // 스크롤마다 한 번(그림 한 장에 한 번)만
  let moreQ = 0;
  list.forEach((b) =>
    b.addEventListener(
      'scroll',
      () => {
        if (b !== list[index] || moreQ) return;
        moreQ = requestAnimationFrame(() => {
          moreQ = 0;
          more();
        });
      },
      { passive: true }
    )
  );
  if (stage && 'ResizeObserver' in window) new ResizeObserver(pin).observe(stage);
  // 사진이 늦게 들어와도(크기는 미리 잡아 두지만 — 글꼴처럼 한 번 더) 다시 잰다: 한 그림에 한 번
  let pinQ = 0;
  el.addEventListener(
    'load',
    (e) => {
      if (e.target.tagName !== 'IMG' || pinQ) return;
      pinQ = requestAnimationFrame(() => {
        pinQ = 0;
        pin();
      });
    },
    true
  );
  document.fonts?.ready.then(pin);
  document.fonts?.addEventListener?.('loadingdone', pin);
  const ctl = {
    get count() {
      return list.length;
    },
    get index() {
      return index;
    },
    // 지금 화면 — 화면 안에서 스크롤하는 단계면 키보드(↓ · PageDown · Space)가 남은 글을 먼저 스크롤한다(input.js)
    get el() {
      return list[index];
    },
    // 다 들어선 화면인지 — 장면 · 화면이 바뀌어 줄이 아직 숨어 있거나 떠오르는 중에는 키보드가 이 화면을 스크롤하지 않는다(input.js).
    // 들어오는 화면을 스크롤하면 끝까지 내려간 채 나타나 머리줄 · 제목이 HUD 밑에 가려졌다(빠르게 ↓ ↓ · 화면 칸을 누르고 바로 ↓)
    get settled() {
      const b = list[index];
      if (!b || getComputedStyle(b).visibility === 'hidden' || gsap.isTweening(b)) return false;
      return parts(b).every((p) => getComputedStyle(p).visibility !== 'hidden' && !gsap.isTweening(p));
    },
    label: (k) => list[k]?.dataset.label || '',
    indexOf: (key) => Math.max(0, list.findIndex((b) => b.dataset.key === String(key))),
    // 장면에 들어설 때: 움직임 없이 그 화면에서(등장 연출은 intro가 장면 타임라인에 얹는다)
    reset(k = 0) {
      gsap.killTweensOf(list.flatMap((b) => [b, bodyOf(b), ...parts(b)].filter(Boolean)));
      index = Math.max(0, Math.min(list.length - 1, k));
      only(index);
      pin();
      list.forEach((b) => gsap.set([b, bodyOf(b), ...parts(b)].filter(Boolean), { clearProps: 'opacity,visibility,transform' }));
      mark();
      warm(index);
      onBeat?.({ index, prev: index, count: list.length, entry: true });
    },
    intro(tl, at) {
      if (reducedMotion) return;
      const p = parts(list[index]);
      gsap.set(p, { autoAlpha: 0, y: lift(Math.min(26, slide())) });
      tl.to(p, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, onComplete: more }, at);
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
      gsap.killTweensOf([from, to, bodyOf(from), bodyOf(to), ...parts(from), ...parts(to)].filter(Boolean));
      warm(k);
      if (reducedMotion) {
        only(k);
      } else {
        const d = slide();
        // 나가는 화면: 사라지면서 본문만 넘기는 쪽으로 조금 밀리고(머리줄은 제자리), 다 사라진 뒤에 숨긴다
        from.inert = true;
        gsap.to(from, { autoAlpha: 0, duration: 0.3, ease: 'power2.in', onComplete: () => settle(from) });
        if (bodyOf(from)) gsap.to(bodyOf(from), { y: -0.7 * d * dir, duration: 0.3, ease: 'power2.in' });
        // 들어오는 화면: 나가는 화면이 거의 사라진 뒤 화면이 나타나고, 줄들이 차례로 들어선다(머리줄은 제자리에서 나타나기만)
        to.hidden = false;
        to.inert = false;
        gsap.set([to, bodyOf(to)].filter(Boolean), { clearProps: 'transform' });
        gsap.fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power1.out', delay: 0.24 });
        gsap.fromTo(parts(to), { autoAlpha: 0, y: lift(d * dir) }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, delay: 0.28, onComplete: more });
      }
      // 들어오는 화면이 이 크기에서 다 들어가는지(안전망) — 나가는 화면은 사라질 때까지 그대로
      fit(to);
      more();
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
