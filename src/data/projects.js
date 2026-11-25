// 프로젝트 상세 데이터. projects.json은 scripts/build-projects.mjs가 노션·기록 수집 결과로 만든다.
// briefs.json은 포트폴리오 요약(문제 · 솔루션 · 팀 · 역할 · 기여 · 문제 해결 기록 · 결과 · 배운 점 · 다음)과 기술 노트(tech — 사용 환경 · 처리 흐름 ·
// 기술 풀이 · 기록) — 사람이 고치는 파일.
// scripts/briefs-from-research.mjs가 조사 결과를 이 파일로 옮기고, 빈 항목은 화면(상세 · 발표 슬라이드)에서 감춘다
import raw from './projects.json';
import BRIEFS from './briefs.json';

// 드론과 모빌리티는 한 분야(하늘과 땅의 자율 이동)로 묶는다
export const CATEGORIES = [
  { id: 'mobility', label: 'Drone · Mobility', ko: '드론 · 모빌리티' },
  { id: 'robotics', label: 'Robotics', ko: '로봇' },
  { id: 'ai', label: 'AI', ko: 'AI · 데이터' },
  { id: 'iot', label: 'IoT · H/W', ko: '임베디드 · 하드웨어' },
  { id: 'product', label: 'Product', ko: '제품 · 창업' },
  { id: 'software', label: 'Software', ko: '소프트웨어' },
];
export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || { id, label: id, ko: id };

const rank = (c) => {
  const i = CATEGORIES.findIndex((x) => x.id === c);
  return i < 0 ? 99 : i;
};
const firstYear = (y = '') => parseInt(String(y).match(/20\d{2}/)?.[0] || '0', 10);
const lastYear = (y = '') => {
  const all = String(y).match(/20\d{2}/g);
  return all ? parseInt(all[all.length - 1], 10) : 0;
};

const src = (f) => (f ? (f.startsWith('/') ? f : `/${f}`) : '');
const thumbOf = (f) => src(f).replace(/\.webp$/, '.thumb.webp');

// 요약 한 건을 다듬는다: 글은 앞뒤 공백을 걷고, 빈 글 · 빈 목록 · 숫자가 아닌 인원은 없는 것으로 — 다 비었으면 null
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strs = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : []);
function cleanBrief(b) {
  if (!b || typeof b !== 'object') return null;
  const t = b.team;
  const size = Math.round(Number(typeof t === 'object' && t ? t.size : typeof t === 'number' ? t : 0));
  const team = { size: size > 0 ? size : 0, text: typeof t === 'string' ? str(t) : str(t?.text) };
  const out = {
    headline: str(b.headline),
    period: str(b.period),
    team: team.size || team.text ? team : null,
    role: strs(b.role),
    problem: str(b.problem),
    solution: str(b.solution),
    contribution: strs(b.contribution),
    results: strs(b.results),
    troubles: (Array.isArray(b.troubles) ? b.troubles : [])
      .map((x) => ({ issue: str(x?.issue), fix: str(x?.fix), outcome: str(x?.outcome) }))
      .filter((x) => x.issue || x.fix),
    learned: str(b.learned),
    next: str(b.next),
  };
  return Object.values(out).some((v) => (Array.isArray(v) ? v.length : v)) ? out : null;
}
// 기술 노트(briefs.json의 tech): 한 줄 요약 · 사용 환경 · 처리 흐름 · 기술 풀이 · 기록 — 빈 항목은 빼고, 다 비었으면 null.
// 풀이의 그림은 프로젝트 사진이면 그 사진 기록(크기 · 썸네일 · 종류)을 그대로 쓰고, 아니면(피치덱 그래프 SVG · 다른 프로젝트 사진)
// 적힌 크기로 — SVG 그래프는 종류 'chart'(밝은 종이 위에 그린다)
function cleanTech(t, images) {
  if (!t || typeof t !== 'object') return null;
  const arr = (v) => (Array.isArray(v) ? v : []);
  const fig = (f) => {
    const s = src(str(f?.src));
    if (!s) return null;
    const im = images.find((x) => x.src === s);
    const caption = str(f.caption) || im?.caption || '';
    if (im) return { ...im, caption };
    const w = Math.round(Number(f.w) || 0);
    const h = Math.round(Number(f.h) || 0);
    const svg = /\.svg$/i.test(s);
    // srcSm(+ wSm · hSm): 휴대폰 폭(680px 이하)에서 대신 쓰는 그림 — 글자를 키운 그래프 같은 것
    const ss = src(str(f.srcSm));
    const ws = Math.round(Number(f.wSm) || 0);
    const hs = Math.round(Number(f.hSm) || 0);
    const sm = ss && ws && hs ? { src: ss, ratio: ws / hs } : null;
    return { file: s.slice(1), src: s, thumb: svg ? s : thumbOf(s), caption, kind: svg ? 'chart' : 'diagram', w, h, ratio: w && h ? w / h : 4 / 3, sm };
  };
  const out = {
    lead: str(t.lead),
    env: arr(t.env).map((x) => ({ k: str(x?.k), v: str(x?.v) })).filter((x) => x.k && x.v),
    pipeline: arr(t.pipeline).map((x) => ({ t: str(x?.t), d: str(x?.d) })).filter((x) => x.t || x.d),
    deep: arr(t.deep)
      .map((x) => ({ h: str(x?.h), p: str(x?.p), list: strs(x?.list), figure: fig(x?.figure) }))
      .filter((x) => x.h || x.p || x.list.length),
    records: arr(t.records).map((x) => ({ when: str(x?.when), what: str(x?.what), result: str(x?.result) })).filter((x) => x.what || x.result),
  };
  return Object.values(out).some((v) => (Array.isArray(v) ? v.length : v)) ? out : null;
}
// 참여 인원 칸에 답이 되지 않는 글('팀 참가' · '동아리 팀 경기' · '팀 프로젝트')은 없는 것으로 — 사람 · 인원 · 팀 이름이 있을 때만 보인다
const GENERIC_TEAM = /^(?:동아리\s*)?팀\s*(?:경기|참가|프로젝트|활동)?$/;
const teamText = (t) => (GENERIC_TEAM.test(str(t).replace(/^동아리 /, '')) ? '' : str(t));
// 발표 슬라이드를 권할 만큼 내용이 있는지: 요약의 문제 · 솔루션 · 기여 · 문제 해결 · 결과 · 배운 점 중 둘 이상(요약이 없으면 스토리 두 꼭지 이상).
// 모자라면 상세 · 필름 덱에서 '슬라이드' 단추를 감춘다(주소로 들어오면 그래도 보인다)
const deckWorthy = (b, story) =>
  b ? [b.problem, b.solution, b.contribution.length, b.troubles.length, b.results.length, b.learned].filter(Boolean).length >= 2 : story.length >= 2;

function normalize(p) {
  const images = (p.images || []).map((im) => ({
    ...im,
    src: src(im.file),
    thumb: thumbOf(im.file),
    ratio: im.w && im.h ? im.w / im.h : 4 / 3,
  }));
  const cover = images.find((im) => im.file === p.cover) || images[0] || null;
  // 요약의 기간 · 역할 · 팀이 있으면 그 값을 쓴다(상세 · 이력서 · 스킬 근거 · 슬라이드 어디서나 같은 값)
  const brief = cleanBrief(BRIEFS[p.id]);
  return {
    ...p,
    titleEn: p.titleEn || '',
    period: brief?.period || p.period || '',
    team: teamText(brief?.team?.text || p.team || ''),
    teamSize: brief?.team?.size || 0,
    role: brief?.role.length ? brief.role : p.role || [],
    brief,
    tech: cleanTech(BRIEFS[p.id]?.tech, images),
    tools: p.tools || [],
    awards: p.awards || [],
    metrics: p.metrics || [],
    videos: p.videos || [],
    links: p.links || [],
    story: (p.story || []).map((s) => ({ ...s, img: images.find((im) => im.file === s.image) || null })),
    images,
    cover,
    path: `/works/${p.id}`,
    slides: deckWorthy(brief, p.story || []),
  };
}

// 합쳐진 프로젝트의 예전 주소 → 지금 주소
export const ALIAS = { 'carla-e2e': 'airsim-driving' };

// 피지컬 AI(드론 · 모빌리티 → 로봇 → AI) 우선, 같은 분야 안에서는 최신순. hidden: 노출하지 않는 기록
export const projects = raw
  .filter((p) => !p.hidden)
  .map(normalize)
  .sort((a, b) => rank(a.category) - rank(b.category) || lastYear(b.year) - lastYear(a.year) || firstYear(b.year) - firstYear(a.year));

// 아카이브에서 두 칸을 차지하는 대표작(가로 사진이 있을 때만)
export const FEATURED = ['pixhawk-drone', 'airsim-driving', 'baja-ev-formula', 'av-competition', 'quadruped-robot', 'iot-iv-pole', 'huss-evidence-ai', 'recap-jbmotors'];
projects.forEach((p) => (p.wide = FEATURED.includes(p.id) && !!p.cover && p.cover.ratio >= 1.2));

export const byId = (id) => projects.find((p) => p.id === id);
export const inCategory = (c) => projects.filter((p) => p.category === c);
