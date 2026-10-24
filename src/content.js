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
  // 학력 — 2026 Notion 포트폴리오의 Education(본인 기록 그대로)
  education: [
    { school: '원광대학교', major: '컴퓨터소프트웨어공학과', period: '2023 – 2029' },
    { school: 'JST 공유대학 (전북대학교)', major: '스마트 모빌리티 SW공학과 · 복수전공', period: '2024 – 2026' },
  ],
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
    // 세 화면(소개 → 학력 · 기록 → 핵심 역량) — 스크롤 없이 한 화면씩(src/ui/beats.js)
    layout: 'beats',
    beats: 'profile',
    hold: 9,
    beatHold: 7, // 화면마다 머무는 초(자동 재생)
    kicker: 'PROLOGUE — WHO BUILDS THE MACHINE',
    title: ['제약을 이해하고, 작은 실험으로', '해법을 검증합니다.'],
    titleKo: true,
    lead: '현장의 제약을 문제로 정의하고, AI·소프트웨어·하드웨어를 연결해 작동하는 해결책으로 만듭니다.',
    // detail: 2026 Notion 포트폴리오의 핵심 역량 문장 그대로 · projects: 그 축을 보여 주는 대표 프로젝트
    pillars: [
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
    ],
  },
  {
    // 연도별 이력(src/data/history.js) — 3D는 드론이 웨이포인트를 따라 나는 하늘 세트
    id: 'history',
    ko: '이력',
    code: 'HISTORY',
    label: 'History',
    // 연도마다 한 화면 — 항목 · 기록 한 줄 · 이어진 프로젝트 사진 · 상장 · 기사가 그 화면에 바로(src/ui/beats.js)
    layout: 'beats',
    beats: 'history',
    hold: 14,
    beatHold: 8,
    kicker: 'HISTORY — 연도별 이력',
  },
  {
    id: 'ground',
    ko: '드론 · 모빌리티',
    code: 'MOBILITY',
    label: 'Drone & Mobility',
    layout: 'reel',
    hold: 13,
    category: 'mobility',
    kicker: 'DRONE & MOBILITY — 드론 · 자율주행 · 차량',
    title: ['DRONE &', 'MOBILITY'],
    subtitle: '하늘과 땅의 자율 이동 — 조종 · 자율비행에서 시뮬레이터 · 실차까지',
    stats: [
      { value: '2018', label: '멀티콥터 1종' },
      { value: '2024', label: '지도조종자(교관)' },
    ],
    projects: ['pixhawk-drone', 'drone-soccer', 'airsim-driving', 'av-competition', 'ros2-nav2', 'baja-ev-formula', 'ev-medical', 'manual-ev'],
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
      { value: projectData.filter((p) => !p.hidden).length, label: '프로젝트' }, // 아카이브(/works)와 같은 수(숨긴 기록 제외)
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
