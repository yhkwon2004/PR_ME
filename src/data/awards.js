// 수상 기록과 상장 — awards.json은 상장 이미지를 직접 읽어 대회명·등급·수여자를 옮기고 프로젝트와 맞춘 결과다.
// 상장 원본: yhkwon2004/portfoli의 수상 기록(날짜별 상장 스캔).
import raw from './awards.json';
import { byId } from './projects.js';

const src = (f) => (f.startsWith('/') ? f : `/${f}`);
const thumb = (f) => src(f).replace(/\.webp$/, '.thumb.webp');

// 1 대상 · 2 최우수상 · 3 우수상 · 4 장려상 · 5 그 밖의 수상(순위·입선 등)
export function tierOf(text = '') {
  if (/대상/.test(text)) return 1;
  if (/최우수/.test(text)) return 2;
  if (/우수상/.test(text)) return 3;
  if (/장려/.test(text)) return 4;
  return 5;
}
export const TIER_LABEL = ['', '대상', '최우수상', '우수상', '장려상', '수상'];
export const TIER_KEY = ['', 'grand', 'gold', 'silver', 'bronze', 'merit'];

export const AWARDS = raw
  .map((a) => {
    const project = a.project ? byId(a.project) || null : null;
    const photo = a.photo && project ? project.images.find((im) => im.file === a.photo) || null : null;
    return {
      ...a,
      year: a.date.slice(0, 4),
      tier: tierOf(a.grade),
      certs: (a.certs || []).map((f) => ({ src: src(f), thumb: thumb(f), w: 1132, h: 1600 })),
      project,
      photo,
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date) || a.tier - b.tier);

export const awardsOf = (id) => AWARDS.filter((a) => a.project?.id === id);

// 카드 배지: 프로젝트 수상 문구 중 가장 높은 등급
export function bestOf(p) {
  if (!p.awards.length) return null;
  const tier = Math.min(...p.awards.map(tierOf));
  return { tier, label: TIER_LABEL[tier], key: TIER_KEY[tier], count: p.awards.length };
}

// 필름 속 수상 릴: 프로젝트와 이어진 수상 전부(상장이 없으면 프로젝트 사진), 높은 등급 · 최신 순.
// 같은 날 같은 프로젝트가 받은 같은 등급의 상(예: 도지사상 + 기관장상)은 한 카드에 상장을 겹친다.
export const AWARD_REEL = (() => {
  const merged = new Map();
  AWARDS.filter((a) => a.project).forEach((a) => {
    const k = `${a.project.id}|${a.date}|${a.tier}`;
    const m = merged.get(k);
    if (!m) merged.set(k, { ...a, certs: [...a.certs] });
    else {
      m.certs.push(...a.certs);
      m.issuer = [m.issuer, a.issuer].filter(Boolean).join(' · ');
    }
  });
  return [...merged.values()].sort((a, b) => a.tier - b.tier || b.date.localeCompare(a.date));
})();
