// 성장 과정(학년별)과 가치관 — 필름의 '성장 · 이력' 장면(/growth)이 쓴다: 학년 길 → 가치관 → 학년마다 이야기 → 그 학년의 연도별 이력(history.js).
// 학년: 1학년 2023 · 2학년 2024 · 3학년 2025–2026(본인 확인). 프로젝트는 걸친 해(연도별 이력과 같은 기준), 수상 · 자격은 받은 연도로 학년에 넣는다.
// 문장은 history.js · projects.json · awards.json · 자격 기록에 있는 것만 쓴다. cover는 학년 카드의 사진(대표 프로젝트 가운데 하나).
import { projects, byId } from './projects.js';
import { AWARDS } from './awards.js';
import { CERTS } from './skills.js';

const yearsOf = (y = '') => String(y).match(/20\d{2}/g) || [];

export const PRELUDE = { year: '2018', text: '고등학생 때 초경량 무인멀티콥터 조종자격 1종 — 드론에서 시작했습니다' };

const STAGE_DEFS = [
  {
    id: 'explore',
    grade: '1학년',
    years: ['2023'],
    span: '2023',
    code: 'EXPLORE',
    title: '전공 탐색',
    short: '소프트웨어 · AI · 드론을 두루 — 연구실 산학 · 동아리 · 해커톤',
    headline: '넓게 해 보며, 내가 몰입하는 문제를 찾았습니다',
    story:
      '인공지능융합학과로 입학해 Java 수강신청 프로그램으로 소프트웨어 기초를 다지고, 인공지능 연구실 산학 프로젝트로 GAN 기반 음성 합성(TTS) 개발에 참여했습니다. 컴퓨터 학술동아리 ENIAC에서는 Raspberry Pi · YOLO로 객체지향 프로젝트를 만들어 동아리 경진대회 2위를 했고, 치앙마이에서 SW 교육을 받고 스마트 헬스케어 세미나를 발표했습니다. 해커톤에서는 처음으로 3D 설계 · 회로 · 모터 제어 · 앱을 한 로봇으로 묶었습니다.',
    learned: '분야를 가리지 않고 직접 만들어 보면서, 손에 잡히는 결과를 만들 때 가장 몰입한다는 것을 알았습니다.',
    featured: ['gan-tts', 'robot-push-hackathon', 'rehab-game', 'pixhawk-drone'],
    cover: 'robot-push-hackathon',
  },
  {
    id: 'challenge',
    grade: '2학년',
    years: ['2024'],
    span: '2024',
    code: 'CHALLENGE',
    title: '도전',
    short: '전공 밖으로 — 모빌리티 복수전공 · 자작차 · 드론 교관',
    headline: '전공 밖으로 뛰어들어, 끝까지 완주했습니다',
    story:
      "컴퓨터소프트웨어공학전공으로 소속을 옮기고, 2학기부터 JST 공유대학(전북대학교) 스마트 모빌리티 SW공학 복수전공을 시작했습니다. 기계공학과 자작차 동아리 '메카니즘'에서 BAJA · EV · Formula 차량을 CATIA로 설계하고 가공했습니다. 유아용 자동차를 개조해 산업부 자율주행 경진대회에 나갔고, AirSim · CARLA 시뮬레이터로 자율주행을 익혔습니다. 드론은 지도조종자(교관)가 되었고, 창업 동아리 '늘솔길'에 들어갔으며, 팀장을 맡은 순환형 제습장치는 한 해에 상 네 개를 받았습니다.",
    learned: '처음 해 보는 일이어도 끝까지 완성해 보면, 그 결과가 다음 도전의 발판이 된다는 것을 배웠습니다.',
    featured: ['baja-ev-formula', 'av-competition', 'airsim-driving', 'moisture-dehumidifier'],
    cover: 'baja-ev-formula',
  },
  {
    id: 'focus',
    grade: '3학년',
    years: ['2025', '2026'],
    span: '2025 – 2026',
    code: 'FOCUS',
    title: '인턴십 · Physical AI 집중',
    short: '테이블컵 인턴십 · 지능형 IoT 연구실 · 로봇',
    headline: '현장의 문제를, 하드웨어와 AI를 묶어 풉니다',
    story:
      '지능형 IoT 연구실(인퓨테크)에서 링거폴대에 붙이는 IoT 장치의 H/W(PCB · 3D 설계)와 F/W(통신 알고리즘)를 맡아 WON+UP 캡스톤디자인 대상을 받았고, 테이블컵에서 인턴십을 했습니다. Re:cap 대표로 폐키보드 키캡을 업사이클한 키링을 전북현대모터스FC에 입점시켰습니다. 2026년에는 기업연계 프로젝트로 소형 IoT 링거폴대를 매주 KPT 회고로 다듬으며, 4족보행 로봇 · 비전 로봇팔로 센서 · 회로 · AI를 한 몸으로 묶는 Physical AI에 집중하고 있습니다.',
    learned: '기술은 현장의 제약을 풀 때 의미가 있다 — 그래서 소프트웨어에서 멈추지 않고 몸을 가진 시스템까지 만듭니다.',
    featured: ['iot-iv-pole', 'quadruped-robot', 'vision-robot-arm', 'recap-jbmotors', 'huss-evidence-ai', 'givingplus-filament'],
    cover: 'iot-iv-pole',
  },
];

export const STAGES = STAGE_DEFS.map((s) => {
  const projectsIn = projects.filter((p) => yearsOf(p.year).some((y) => s.years.includes(y)));
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

// 그 해가 몇 학년의 어느 단계인지(연도 화면의 학년 표시)
export const stageOf = (y) => STAGES.find((s) => s.years.includes(String(y)));

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
    proof: ['airsim-driving', 'av-competition', 'pixhawk-drone', 'quadruped-robot'],
  },
  {
    no: '03',
    title: '함께, 끝까지 갑니다',
    en: 'Finish together',
    text: '팀장과 대표로 팀을 이끌고, 매주 회고로 다듬으며, 대회에서 멈추지 않고 판매 · 입점 · 기부까지 이어 갑니다.',
    proof: ['recap-jbmotors', 'moisture-dehumidifier', 'givingplus-filament', 'baja-ev-formula'],
  },
];
