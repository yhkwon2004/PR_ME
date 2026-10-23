// 공식 보도 — yhkwon2004/portfoli의 보도 기록(대학 · 사업단 공식 기사)과 기사 사진. 요약은 기사를 옮겨 쓴 것이 아니라 줄여 쓴 것이다.
import raw from './press.json';
import { byId } from './projects.js';

const src = (f) => (f.startsWith('/') ? f : `/${f}`);

// 인터뷰(type: 'interview')는 사진 · 날짜가 없을 수 있다 — 맨 앞에 두고, 카드는 활자 표지로.
// qa: [{ q, a }] — 질문과 답을 채우면 덱 설명 줄과 카드에 그대로 나온다(지어내지 않고 기사에서 옮긴다)
export const PRESS = raw
  .map((a) => ({
    ...a,
    interview: a.type === 'interview',
    qa: a.qa || [],
    year: (a.date || '').slice(0, 4),
    project: a.project ? byId(a.project) || null : null,
    image: a.image ? { ...a.image, src: src(a.image.file), thumb: src(a.image.file).replace(/\.webp$/, '.thumb.webp') } : null,
  }))
  .sort((a, b) => b.interview - a.interview || (b.date || '').localeCompare(a.date || ''));

// 직접 소개(이름 · 팀이 기사에 나온 것 · 인터뷰)와 관련 보도
export const isDirect = (a) => a.relation === '직접 소개' || a.relation === '인터뷰';
export const PRESS_DIRECT = PRESS.filter(isDirect).length;
export const pressOf = (id) => PRESS.filter((a) => a.project?.id === id);
