// 포트폴리오 콘텐츠 — 출처: 2026 Notion 포트폴리오, yhkwon2004/portfoli 기록 데이터.
// 장면(scene) 순서가 곧 영화의 순서입니다. 3D 연출은 director.js의 SHOTS가 같은 id로 대응합니다.

import projectData from './data/projects.json';
import awardData from './data/awards.json';
import pressData from './data/press.json';
import { GROWTH_PILLARS, VALUES } from './data/growth.js';

const M = (file) => `/media/${file}`;

export const profile = {
  name: '권용현',
  en: 'Yonghyun Kwon',
  role: 'Physical AI Developer',
  roleKo: 'AI·소프트웨어·하드웨어를 연결해 현장 문제를 푸는 개발자',
  motto: '제약을 이해하고, 작은 실험으로 해법을 검증합니다.',
  email: 'yhkwon2004@gmail.com',
  links: [
    { label: 'Email', value: 'yhkwon2004@gmail.com', url: 'mailto:yhkwon2004@gmail.com' },
    { label: 'GitHub', value: 'yhkwon2004', url: 'https://github.com/yhkwon2004' },
    { label: 'Notion', value: '2026 Portfolio', url: 'https://befitting-paper-753.notion.site/2026-1-3f3faf73802f80c7acf6f7c83e9c26e2' },
    { label: 'Instagram', value: '@dydgus_.0802', url: 'https://www.instagram.com/dydgus_.0802/' },
    { label: 'Blog', value: 'naver/procmd', url: 'https://blog.naver.com/procmd' },
  ],
};

export const scenes = [
  {
    id: 'intro',
    ko: '시작', // 화면에 보이는 장면 이름
    code: 'BOOT',
    label: 'Opening',
    layout: 'hero',
    hold: 8,
    kicker: 'PORTFOLIO 2026 — PHYSICAL AI',
    title: ['PHYSICAL', 'AI'],
    name: '권용현 · Yonghyun Kwon',
    lead: profile.roleKo,
    tags: ['Drone', 'Robot', 'Mobility', 'AI'],
  },
  {
    id: 'prologue',
    ko: '소개',
    code: 'PROLOGUE',
    label: 'Prologue',
    layout: 'stage',
    hold: 11,
    kicker: 'PROLOGUE — 성장 과정과 가치관',
    title: ['제약을 이해하고, 작은 실험으로', '해법을 검증합니다.'],
    titleKo: true,
    lead: '1학년엔 넓게 탐색하고, 2학년엔 전공 밖으로 도전했고, 3학년엔 인턴십과 Physical AI에 집중했습니다.',
    // 학년별 세 단계와 가치관 — data/growth.js(자세한 내용은 /growth)
    growth: true,
    pillars: GROWTH_PILLARS,
    values: VALUES,
  },
  {
    id: 'aerial',
    ko: '드론',
    code: 'AERIAL',
    label: 'Aerial Autonomy',
    layout: 'reel',
    hold: 11,
    category: 'drone',
    kicker: 'AERIAL AUTONOMY — 드론',
    title: ['AERIAL', 'AUTONOMY'],
    subtitle: '조종에서 교육, 그리고 자율비행까지',
    stats: [
      { value: '2018', label: '멀티콥터 1종' },
      { value: '2024', label: '지도조종자(교관)' },
    ],
    projects: ['pixhawk-drone', 'drone-soccer'],
  },
  {
    id: 'ground',
    ko: '자율주행 · 차량',
    code: 'GROUND',
    label: 'Ground Mobility',
    layout: 'reel',
    hold: 12,
    category: 'mobility',
    kicker: 'GROUND MOBILITY — 자율주행 · 차량',
    title: ['GROUND', 'MOBILITY'],
    subtitle: '시뮬레이터에서 배우고, 실차에서 검증한다',
    projects: ['airsim-driving', 'carla-e2e', 'av-competition', 'ros2-nav2', 'baja-ev-formula', 'ev-medical', 'manual-ev', 'ai-pedal-blackbox'],
  },
  {
    id: 'robotics',
    ko: '로봇',
    code: 'ROBOTICS',
    label: 'Embodied Robotics',
    layout: 'reel',
    hold: 11,
    category: 'robotics',
    kicker: 'EMBODIED ROBOTICS — 휴머노이드 · 매니퓰레이터 · 4족 · IoT',
    title: ['EMBODIED', 'ROBOTICS'],
    subtitle: '몸을 가진 지능을 설계한다 — 보행 · 조작 로봇에서 센서 · 회로까지',
    projects: ['quadruped-robot', 'vision-robot-arm', 'robot-push-hackathon', 'iot-iv-pole', 'pressure-clicker', 'moisture-dehumidifier', 'peltier-cooler', 'hanok-ess'],
  },
  {
    id: 'intelligence',
    ko: 'AI',
    code: 'AI',
    label: 'Machine Intelligence',
    layout: 'reel',
    hold: 12,
    category: 'ai',
    kicker: 'MACHINE INTELLIGENCE — AI',
    title: ['MACHINE', 'INTELLIGENCE'],
    subtitle: '보고, 이해하고, 정리하는 지능',
    stats: [
      { value: '전국 2위', label: 'HUSS AI 경진대회' },
      { value: '33.7%', label: '작성·정리 속도 향상' },
    ],
    projects: ['huss-evidence-ai', 'ai-pose-guide', 'legal-ai-platform', 'factline', 'worker-posture-ios', 'ai-detector', 'population-viz', 'gan-tts', 'personal-color-bot'],
  },
  {
    id: 'build',
    ko: '창업 · 제품',
    code: 'BUILD',
    label: 'Build & Launch',
    layout: 'reel',
    hold: 12,
    category: 'product',
    kicker: 'BUILD & LAUNCH — 제품 · 창업 · 소프트웨어',
    title: ['BUILD &', 'LAUNCH'],
    subtitle: '아이디어를 제품과 서비스로 — 만들고, 알리고, 운영한다',
    stats: [
      { value: '대상 5', label: '창업 · 아이디어 경진' },
      { value: 'Re:cap', label: '창업 팀 대표' },
    ],
    projects: ['recap-jbmotors', 'givingplus-filament', 'coffee-box', 'baekchul-sikhye', 'edufarm', 'growth-footrest', 'kakao-fin-next', 'climate-dashboard', 'meal-reservation-app', 'farm-app', 'retrofit-game'],
  },
  {
    id: 'press',
    ko: '언론 보도',
    code: 'PRESS',
    label: 'In the Press',
    layout: 'reel',
    hold: 12,
    press: true,
    kicker: 'IN THE PRESS — 공식 보도',
    title: ['IN THE', 'PRESS'],
    subtitle: '학보 인터뷰와 대학 · 사업단 공식 기사 — 누르면 기사 원문으로',
    stats: [
      { value: `${pressData.length}건`, label: '공식 보도' },
      { value: `${pressData.filter((a) => a.relation === '직접 소개' || a.relation === '인터뷰').length}건`, label: '인터뷰 · 직접 소개' },
    ],
  },
  {
    id: 'record',
    ko: '수상 기록',
    code: 'RECORD',
    label: 'The Record',
    layout: 'stage',
    hold: 12,
    kicker: 'THE RECORD — 수상 · 기록',
    title: ['THE', 'RECORD'],
    counters: [
      { value: awardData.length, label: '수상 기록' }, // 수상 아카이브(/awards)와 같은 수
      { value: projectData.length, label: '프로젝트' }, // 아카이브(/works)와 같은 수
      { value: 9, label: '자격증' },
      { value: pressData.length, label: '공식 보도' }, // 보도 장면(press.json)과 같은 수
    ],
    // 프로젝트와 이어진 수상을 상장과 함께 릴로 보여 준다(awards.js의 AWARD_REEL)
    awardReel: true,
  },
  {
    id: 'finale',
    ko: '엔딩 · 연락처',
    code: 'CREDITS',
    label: 'End Credits',
    layout: 'finale',
    hold: 0,
    kicker: 'END CREDITS',
    // 엔딩 크레딧: 네 장면(비트) — 한 장씩 가운데에 들어와 잠깐 머문 뒤 넘어간다(약 12초)
    credits: [
      { beat: 'lead', role: 'Written, Directed & Engineered by', name: '권용현', en: 'Yonghyun Kwon' },
      { beat: 'words', role: 'Featuring', words: ['Drone', 'Robot', 'Mobility', 'AI'] },
      { beat: 'with', role: 'With', title: '함께한 학교 · 기관 · 상을 준 곳' },
      { beat: 'thanks', role: 'Special Thanks', line: '함께 만든 팀원들 · 지도해 주신 교수님들', big: '끝까지 봐 주셔서 감사합니다' },
    ],
    end: ['다음 장면은,', '함께 만들 차례입니다.'],
    endEn: 'The next scene is yours.',
  },
];
