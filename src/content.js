// 포트폴리오 콘텐츠 — 출처: 2026 Notion 포트폴리오, yhkwon2004/portfoli 기록 데이터.
// 장면(scene) 순서가 곧 영화의 순서입니다. 3D 연출은 director.js의 SHOTS가 같은 id로 대응합니다.

import projectData from './data/projects.json';
import awardData from './data/awards.json';
import pressData from './data/press.json';

const M = (file) => `/media/${file}`;

export const profile = {
  name: '권용현',
  en: 'Yonghyun Kwon',
  role: 'Physical AI Developer',
  roleKo: 'AI·소프트웨어·하드웨어를 연결해 현장 문제를 푸는 개발자',
  motto: '제약을 이해하고, 작은 실험으로 해법을 검증합니다.',
  summary: '현장의 제약을 문제로 정의하고, AI·소프트웨어·하드웨어를 연결해 작동하는 해결책으로 만듭니다.', // 한 줄 소개 — 필름 소개 첫 화면 · 이력서(/resume)
  born: 2004,
  // 증명사진(본인 제공) — 4:5
  photo: { src: M('profile/kwon.webp'), thumb: M('profile/kwon.thumb.webp'), w: 960, h: 1200 },
  // 이 포트폴리오가 담는 기간 — 대학 시절
  span: '2023 – 2026',
  // 학력 — 본인이 알려 준 순서 그대로(입학 → 소속 변경 → 복수전공)
  education: [
    { period: '2023', school: '원광대학교', major: '인공지능융합학과', note: '입학' },
    { period: '2024', school: '원광대학교', major: '컴퓨터소프트웨어공학전공', note: '소속 변경 · 재학' },
    { period: '2024 2학기 –', school: 'JST 공유대학 (전북대학교)', major: '스마트 모빌리티 SW공학', note: '복수전공' },
  ],
  // 학과 이름표(본인 제공)
  depts: [
    { src: M('profile/dept-ai.png'), w: 289, h: 101, alt: '원광대학교 인공지능융합학과' },
    { src: M('profile/dept-cse.png'), w: 375, h: 98, alt: '원광대학교 컴퓨터소프트웨어공학전공' },
  ],
  // 장학 — 장학증서(본인 제공, 생년월일은 가려서 올림)
  scholarship: {
    title: '국가우수(이공계) 장학생',
    by: '부총리 겸 과학기술정보통신부 장관',
    no: '제2025-0263호',
    date: '2025.10.13',
    school: '원광대학교(본교) 학부',
    sheet: { src: M('profile/scholarship.webp'), md: M('profile/scholarship.md.webp'), thumb: M('profile/scholarship.thumb.webp'), sm: M('profile/scholarship.sm.webp'), w: 1132, h: 1600 },
  },
  // 봉사 — 시간인증형 봉사시간 조회 화면(본인 제공) 그대로
  volunteer: {
    hours: 626,
    minutes: 30,
    count: 196,
    by: [
      { name: '청소년활동정보서비스', hours: 389, minutes: 0 },
      { name: '1365 자원봉사포털', hours: 229, minutes: 30 },
      { name: '사회복지 자원봉사인증관리', hours: 8, minutes: 0 },
    ],
  },
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
    // 표지 아래 발표 순서: 장(chapter)마다 첫 장면으로 바로 간다(panels.js)
    agenda: true,
  },
  {
    id: 'prologue',
    ko: '소개',
    code: 'PROLOGUE',
    label: 'About Me',
    chapter: ['01', '소개'],
    // 이력서처럼 두 화면(소개 → 학력 · 기록) — 스크롤 없이 한 화면씩(src/ui/beats.js).
    // 성장 과정 · 보유 역량 · 미래 계획은 필름에 두지 않고 발표 자료(/present) 안에서만 보인다 — 필름은 프로젝트에 집중
    layout: 'beats',
    beats: 'profile',
    hold: 11,
    beatHold: 7, // 화면마다 머무는 초(자동 재생)
    kicker: 'PROLOGUE — WHO BUILDS THE MACHINE',
    title: ['제약을 이해하고, 작은 실험으로', '해법을 검증합니다.'],
    titleKo: true,
  },
  // ── 02 프로젝트: 대표 프로젝트 여덟(data/projects.js의 FEATURED)만 — 세 세트에 나눠 한 장씩 크게, 끝 카드에서 39개 전체로 ──
  {
    id: 'ground',
    chapter: ['02', '프로젝트'],
    ko: '드론 · 모빌리티',
    code: 'MOBILITY',
    label: 'Drone & Mobility',
    layout: 'reel',
    hold: 12,
    category: 'mobility',
    kicker: 'DRONE & MOBILITY — 드론 · 자율주행 · 차량',
    title: ['DRONE &', 'MOBILITY'],
    subtitle: '하늘과 땅의 자율 이동 — 자율비행 드론에서 시뮬레이터 · 실차까지',
    stats: [
      { value: '2018', label: '멀티콥터 1종' },
      { value: '2024', label: '지도조종자(교관)' },
    ],
    projects: ['pixhawk-drone', 'airsim-driving', 'baja-ev-formula', 'av-competition'],
  },
  {
    id: 'robotics',
    chapter: ['02', '프로젝트'],
    ko: '로봇 · IoT',
    code: 'ROBOTICS',
    label: 'Robotics & IoT',
    layout: 'reel',
    hold: 10,
    category: 'robotics',
    kicker: 'ROBOTICS & IoT — 4족보행 · 현장 IoT',
    title: ['ROBOTICS', '& IoT'],
    subtitle: '몸을 가진 지능 — 4족보행 로봇에서 병동의 링거폴대에 붙는 IoT 기기까지',
    stats: [
      { value: '60×35mm', label: '자체 설계 PCB' },
      { value: '대상', label: '캡스톤디자인' },
    ],
    projects: ['quadruped-robot', 'iot-iv-pole'],
  },
  {
    id: 'intelligence',
    chapter: ['02', '프로젝트'],
    ko: 'AI · 제품',
    code: 'IMPACT',
    label: 'Intelligence & Impact',
    layout: 'reel',
    hold: 10,
    category: 'ai',
    kicker: 'INTELLIGENCE & IMPACT — AI · 제품 · 창업',
    title: ['INTELLIGENCE', '& IMPACT'],
    subtitle: '보고 이해하는 AI에서, 팔리고 기부되는 제품까지',
    stats: [
      { value: '33.7%', label: '작성·정리 속도 향상' },
      { value: '630만원', label: '판매 수익 전액 기부' },
    ],
    projects: ['huss-evidence-ai', 'recap-jbmotors'],
  },
  {
    id: 'record',
    chapter: ['03', '성과'],
    ko: '수상 · 기록',
    code: 'RECORD',
    label: 'The Record',
    layout: 'stage',
    hold: 12,
    kicker: 'THE RECORD — 수상 · 장학 · 봉사',
    title: ['THE', 'RECORD'],
    counters: [
      { value: awardData.length, label: '수상 기록' }, // 수상 아카이브(/awards)와 같은 수
      { value: projectData.filter((p) => !p.hidden).length, label: '프로젝트' }, // 아카이브(/works)와 같은 수(숨긴 기록 제외)
      { value: profile.volunteer.hours, label: '봉사 시간' }, // 시간인증형 봉사(profile.volunteer)
      { value: pressData.length, label: '공식 보도' },
    ],
    // 국가우수(이공계) 장학생 — 장학증서 그대로(profile.scholarship)
    honor: true,
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
    // 엔딩 크레딧: 네 장면(비트) — 한 장씩 가운데에 들어와 잠깐 머문 뒤 넘어간다(약 6초)
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

// 핵심 역량 세 축 — 2026 Notion 포트폴리오의 핵심 역량 문장 그대로(이력서 /resume) · projects: 그 축을 보여 주는 대표 프로젝트
export const PILLARS = [
  {
    no: '01',
    title: 'AI · 알고리즘 · 데이터',
    text: '비전 · LLM · 시뮬레이션',
    detail: '컴퓨터 비전, 생성형 AI·LLM, 시계열 분석과 시뮬레이션을 활용해 데이터를 실제 문제 해결 흐름으로 연결합니다.',
    projects: ['huss-evidence-ai', 'ai-pose-guide'],
  },
  {
    no: '02',
    title: '임베디드 · 제어 · 모빌리티',
    text: 'PCB · ESP32 · 드론 · 차량 · 로봇',
    detail: 'PCB와 3D 설계, ESP32 기반 IoT, 로봇·차량·드론 프로젝트를 통해 하드웨어와 소프트웨어의 통합을 경험했습니다.',
    projects: ['iot-iv-pole', 'pixhawk-drone'],
  },
  {
    no: '03',
    title: '기획 · 제작 · 검증',
    text: '프로토타입부터 사업화까지',
    detail: '사용자와 현장의 요구를 정리하고, 프로토타입 제작부터 테스트·개선, 협업과 사업화까지 이어가는 과정을 중요하게 생각합니다.',
    projects: ['recap-jbmotors', 'givingplus-filament'],
  },
];
