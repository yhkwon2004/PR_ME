// 성장 과정(학년별)과 가치관 — 필름의 '소개' 장면과 /growth 페이지가 함께 쓴다.
// 학년: 1학년 2023 · 2학년 2024 · 3학년 2025–2026(본인 확인). 프로젝트는 시작 연도, 수상 · 자격은 받은 연도로 학년에 넣는다.
// 문장은 projects.json · awards.json · 자격 기록과 필름 연표(2018 멀티콥터 1종 · 2023 LLM 연구실 · 2024 교관 · 자작차 · 복수전공 ·
// 2025 Re:cap 대표 · 전남대 인턴십 우수(1위) · 2026 IoT 연구실 · 4족보행 로봇)에 있는 것만 쓴다.
import { projects, byId } from './projects.js';
import { AWARDS } from './awards.js';
import { CERTS } from './skills.js';

const startYear = (y = '') => String(y).match(/20\d{2}/)?.[0] || '';

export const PRELUDE = { year: '2018', text: '고등학생 때 초경량 무인멀티콥터 조종자격 1종 — 드론에서 시작했습니다' };

const STAGE_DEFS = [
  {
    id: 'explore',
    grade: '1학년',
    years: ['2023'],
    span: '2023',
    code: 'EXPLORE',
    title: '전공 탐색',
    short: '소프트웨어 · AI · 드론을 두루 — 학부연구생 · 해커톤',
    headline: '넓게 해 보며, 내가 몰입하는 문제를 찾았습니다',
    story:
      '컴퓨터소프트웨어공학과에서 Java 수강신청 프로그램과 AWS 챗봇으로 소프트웨어 기초를 다지고, 인공지능학과 연구실 학부연구생으로 GAN 기반 음성 합성(TTS)을 연구했습니다. 치앙마이대학교에서 SW 교육을 받고 스마트 헬스케어 세미나를 발표했고, 해커톤에서는 처음으로 3D 설계 · 회로 · 모터 제어 · 앱을 한 로봇으로 묶었습니다.',
    learned: '분야를 가리지 않고 직접 만들어 보면서, 손에 잡히는 결과를 만들 때 가장 몰입한다는 것을 알았습니다.',
    milestones: [
      { when: '2023.04 – 10', what: '학부연구생 · 인공지능학과 연구실', note: 'GAN-TTS 음성 합성 연구', link: 'gan-tts' },
      { when: '2023', what: '치앙마이대학교 SW 교육 · 세미나 발표', note: '스마트 헬스케어', link: 'chiangmai-seminar' },
      { when: '2023.08', what: '스마트헬스케어 SW비교과 경진 우수상', note: 'VR 재활 리듬 게임', link: 'rehab-game' },
      { when: '2023.12', what: '대학생 해커톤 최우수상', note: '리프팅 · 클램핑 미션 로봇 — 첫 로봇 통합', link: 'robot-push-hackathon' },
      { when: '2023.12', what: 'ROS 자율주행 경진 우수상', note: 'Pixhawk 자율비행 드론', link: 'pixhawk-drone' },
    ],
    featured: ['gan-tts', 'robot-push-hackathon', 'rehab-game', 'pixhawk-drone'],
  },
  {
    id: 'challenge',
    grade: '2학년',
    years: ['2024'],
    span: '2024',
    code: 'CHALLENGE',
    title: '도전',
    short: '낯선 분야로 — 드론 교관 · 자작차 · 모빌리티 복수전공',
    headline: '전공 밖으로 뛰어들어, 끝까지 완주했습니다',
    story:
      '모빌리티 복수전공을 시작하고, 기계공학과 자작차 동아리에서 BAJA · EV · Formula 차량을 CATIA로 설계하고 가공했습니다. 유아용 자동차를 개조해 산업부 자율주행 경진대회에 나갔고, CARLA · ROS2 시뮬레이터로 자율주행을 익혔습니다. 드론은 지도조종자(교관)가 되었고, 팀장을 맡은 순환형 제습장치는 한 해에 상 네 개를 받았습니다.',
    learned: '처음 해 보는 일이어도 끝까지 완성해 보면, 그 결과가 다음 도전의 발판이 된다는 것을 배웠습니다.',
    milestones: [
      { when: '2024', what: '모빌리티 복수전공 시작', note: '소프트웨어 + 모빌리티' },
      { when: '2024', what: '초경량 무인멀티콥터 지도조종자(교관)', note: '조종에서 교육으로' },
      { when: '2024.03 – 12', what: '자작차 BAJA · EV · Formula', note: 'CATIA 프레임 설계 · 가공 · 조립', link: 'baja-ev-formula' },
      { when: '2024.06', what: 'LINC 3.0 창의대첩 대상', note: '발효 백출 식혜 — 데이터로 배합 찾기', link: 'baekchul-sikhye' },
      { when: '2024.12', what: '순환형 제습장치 팀장 · 수상 4', note: 'G-Startup 최우수 · 창의대첩 최우수 외', link: 'moisture-dehumidifier' },
    ],
    featured: ['baja-ev-formula', 'av-competition', 'carla-e2e', 'moisture-dehumidifier'],
  },
  {
    id: 'focus',
    grade: '3학년',
    years: ['2025', '2026'],
    span: '2025 – 2026',
    code: 'FOCUS',
    title: '인턴십 · Physical AI 집중',
    short: '전남대 인턴십 우수(1위) · IoT 연구실 · 로봇',
    headline: '현장의 문제를, 하드웨어와 AI를 묶어 풉니다',
    story:
      '전남대 인턴십에서 우수(1위)를 받고, Re:cap 대표로 창업 팀을 이끌었습니다. 기존 링거폴대에 붙이는 IoT 장치의 회로 · PCB와 3D 설계를 맡아 캡스톤디자인 대상을 받았고, 2026년에는 IoT 연구실 활동과 함께 4족보행 로봇 · 비전 로봇팔 · AirSim 자율주행 프로젝트로 센서 · 회로 · AI를 한 몸으로 묶는 Physical AI에 집중하고 있습니다.',
    learned: '기술은 현장의 제약을 풀 때 의미가 있다 — 그래서 소프트웨어에서 멈추지 않고 몸을 가진 시스템까지 만듭니다.',
    milestones: [
      { when: '2025', what: '전남대 인턴십 우수(1위)', note: '' },
      { when: '2025.08', what: 'Re:cap 대표 · 전북권 Drive Up 창업캠프 대상', note: '2026.04 전북현대 팝업 1시간 완판 · 수익 기부', link: 'recap-jbmotors' },
      { when: '2025.11', what: 'WON+UP 캡스톤디자인 대상', note: '스마트 IoT 링거폴대 — PCB · 3D 설계', link: 'iot-iv-pole' },
      { when: '2026', what: 'IoT 연구실 · 4족보행 로봇 · 비전 로봇팔', note: 'Physical AI', link: 'quadruped-robot' },
      { when: '2026.07', what: 'HUSS AI 경진 전국 2위', note: '학교폭력 증거 전처리 LLM', link: 'huss-evidence-ai' },
    ],
    featured: ['iot-iv-pole', 'quadruped-robot', 'vision-robot-arm', 'airsim-driving', 'recap-jbmotors', 'huss-evidence-ai'],
  },
];

export const STAGES = STAGE_DEFS.map((s) => {
  const projectsIn = projects.filter((p) => s.years.includes(startYear(p.year)));
  const awardsIn = AWARDS.filter((a) => s.years.includes(a.year)).sort((a, b) => a.date.localeCompare(b.date));
  const certsIn = CERTS.filter((c) => s.years.includes(c.year));
  return {
    ...s,
    projects: projectsIn,
    awards: awardsIn,
    grand: awardsIn.filter((a) => a.tier === 1).length,
    certs: certsIn,
    featuredProjects: s.featured.map(byId).filter(Boolean),
  };
});

// 가치관 — 세 가지, 각각 그렇게 일한 프로젝트로 근거를 단다
export const VALUES = [
  {
    no: '01',
    title: '현장에서 문제를 찾습니다',
    en: 'Start from the field',
    text: '책상이 아니라 쓰는 사람 곁에서 문제를 정의합니다 — 병동의 수액, 심부전 환자의 이송, 결식아동의 결제, 학교폭력 피해 학생의 상담 준비.',
    proof: ['iot-iv-pole', 'ev-medical', 'meal-reservation-app', 'huss-evidence-ai'],
  },
  {
    no: '02',
    title: '작게 만들어 빨리 검증합니다',
    en: 'Prototype, then verify',
    text: '제약을 이해하고 작은 실험으로 확인합니다 — 시뮬레이터에서 먼저 주행하고, 60×35mm 보드 한 장으로 회로를 줄이고, 시제품으로 판단합니다.',
    proof: ['carla-e2e', 'av-competition', 'pixhawk-drone', 'quadruped-robot'],
  },
  {
    no: '03',
    title: '함께, 끝까지 갑니다',
    en: 'Finish together',
    text: '팀장과 대표로 팀을 이끌고, 대회에서 멈추지 않고 판매 · 입점 · 기부까지 이어 갑니다.',
    proof: ['recap-jbmotors', 'moisture-dehumidifier', 'givingplus-filament', 'baja-ev-formula'],
  },
];

// 필름 '소개' 장면의 세 칸(기존 pillars 자리)
export const GROWTH_PILLARS = STAGES.map((s) => ({
  no: `${s.grade} · ${s.span}`,
  title: s.title,
  text: s.short,
  meta: `프로젝트 ${s.projects.length} · 수상 ${s.awards.length}${s.grand ? ` (대상 ${s.grand})` : ''}`,
}));
