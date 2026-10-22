// 공식 보도 — yhkwon2004/portfoli의 보도 기록(대학 · 사업단 공식 기사)과 기사 사진. 요약은 기사를 옮겨 쓴 것이 아니라 줄여 쓴 것이다.
import raw from './press.json';
import { byId } from './projects.js';

const src = (f) => (f.startsWith('/') ? f : `/${f}`);

export const PRESS = raw
  .map((a) => ({
    ...a,
    year: a.date.slice(0, 4),
    project: a.project ? byId(a.project) || null : null,
    image: { ...a.image, src: src(a.image.file), thumb: src(a.image.file).replace(/\.webp$/, '.thumb.webp') },
  }))
  .sort((a, b) => b.date.localeCompare(a.date));

// 직접 소개(이름 · 팀이 기사에 나온 것)와 관련 보도
export const PRESS_DIRECT = PRESS.filter((a) => a.relation === '직접 소개').length;
export const pressOf = (id) => PRESS.filter((a) => a.project?.id === id);
