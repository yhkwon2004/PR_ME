// 프로젝트 상세 데이터. projects.json은 scripts/build-projects.mjs가 노션·기록 수집 결과로 만든다.
import raw from './projects.json';

export const CATEGORIES = [
  { id: 'drone', label: 'Drone', ko: '드론' },
  { id: 'mobility', label: 'Mobility', ko: '모빌리티' },
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

function normalize(p) {
  const images = (p.images || []).map((im) => ({
    ...im,
    src: src(im.file),
    thumb: thumbOf(im.file),
    ratio: im.w && im.h ? im.w / im.h : 4 / 3,
  }));
  const cover = images.find((im) => im.file === p.cover) || images[0] || null;
  return {
    ...p,
    titleEn: p.titleEn || '',
    period: p.period || '',
    team: p.team || '',
    role: p.role || [],
    tools: p.tools || [],
    awards: p.awards || [],
    metrics: p.metrics || [],
    videos: p.videos || [],
    links: p.links || [],
    story: (p.story || []).map((s) => ({ ...s, img: images.find((im) => im.file === s.image) || null })),
    images,
    cover,
    path: `/works/${p.id}`,
  };
}

// 피지컬 AI(드론 → 모빌리티 → 로봇 → AI) 우선, 같은 분야 안에서는 최신순
export const projects = raw
  .map(normalize)
  .sort((a, b) => rank(a.category) - rank(b.category) || lastYear(b.year) - lastYear(a.year) || firstYear(b.year) - firstYear(a.year));

// 아카이브에서 두 칸을 차지하는 대표작(가로 사진이 있을 때만)
const FEATURED = ['pixhawk-drone', 'airsim-driving', 'baja-ev-formula', 'av-competition', 'quadruped-robot', 'iot-iv-pole', 'huss-evidence-ai', 'recap-jbmotors'];
projects.forEach((p) => (p.wide = FEATURED.includes(p.id) && !!p.cover && p.cover.ratio >= 1.2));

export const byId = (id) => projects.find((p) => p.id === id);
export const inCategory = (c) => projects.filter((p) => p.category === c);
