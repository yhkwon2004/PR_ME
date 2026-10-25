// 성장 · 이력 상세(/growth/detail)의 SWOT 분석과 미래 계획.
// 근거: 2026 Notion 포트폴리오(지원 직무 · 관심 도메인 · 강점 · 협업 방식 · 4족보행 로봇 기획 단계)와
// 이 포트폴리오의 기록(프로젝트 · 수상 · 보도 · 자격 수). 숫자는 모두 기록에서 센다 — 기록이 바뀌면 함께 바뀐다.
// 약점 · 위협 · 계획은 기록을 바탕으로 정리한 자기 분석이므로, 본인이 고쳐 쓰기 쉽게 문장만 이 파일에 둔다.
import { projects, CATEGORIES } from './projects.js';
import { AWARDS } from './awards.js';
import { PRESS } from './press.js';
import { CERTS } from './skills.js';

const yearsOf = (y = '') => String(y).match(/20\d{2}/g) || [];
const multiYear = projects.filter((p) => new Set(yearsOf(p.year)).size > 1);
const robotics = projects.filter((p) => p.category === 'robotics');
const grand = AWARDS.filter((a) => a.tier === 1).length;
const fields = CATEGORIES.filter((c) => projects.some((p) => p.category === c.id)).length;

// 지원 직무 · 관심 도메인 · 한 줄 — Notion '포트폴리오 (2026) | 스마트팩토리/SW 개발'
export const TARGET = {
  role: '스마트팩토리 / SW 개발',
  domains: ['임베디드', 'IoT', '산업 데이터', '자율주행 · 로보틱스'],
  line: '"센서 — 통신 — 데이터 — 대시보드" 흐름을 이해하고, 실제 제품 제작 경험까지 잇는 개발자',
  keywords: ['임베디드', 'IoT', 'ROS 2', '컴퓨터 비전', '데이터', '제품 제작'],
};

// SWOT — 항목마다 근거(프로젝트 id · 숫자)를 단다
export const SWOT = [
  {
    key: 'S',
    title: '강점',
    en: 'Strengths',
    items: [
      {
        h: '제품 제작 경험 + 현장 문제 기반 SW 구현',
        t: 'PCB · 3D 설계 · 펌웨어부터 앱 · 서버까지 직접 만들어, 병동과 구단 매장처럼 실제 현장에서 쓰이는 형태로 완성했습니다.',
        proof: ['iot-iv-pole', 'recap-jbmotors', 'moisture-dehumidifier'],
      },
      {
        h: `${fields}개 분야를 잇는 폭`,
        t: `프로젝트 ${projects.length}개 — 드론 · 모빌리티, 로봇, AI · 데이터, 임베디드 · 하드웨어, 제품 · 창업, 소프트웨어를 오가며 하드웨어와 AI를 한 시스템으로 묶었습니다.`,
        proof: ['pixhawk-drone', 'airsim-driving', 'huss-evidence-ai'],
      },
      {
        h: '결과로 검증된 실행력',
        t: `수상 ${AWARDS.length}건(대상 ${grand}) · 공식 보도 ${PRESS.length}건 · 자격 ${CERTS.length}개 — 대회에서 멈추지 않고 판매 · 입점 · 기부까지 이어 갔습니다.`,
        proof: ['recap-jbmotors', 'givingplus-filament'],
      },
      {
        h: '팀을 이끌고 기록하는 협업',
        t: '순환형 제습장치 팀장, Re:cap 대표, 드론 지도조종자(교관) — 매주 KPT 회고와 문서화로 팀의 개선 사항을 남깁니다.',
        proof: ['moisture-dehumidifier', 'baja-ev-formula'],
      },
    ],
  },
  {
    key: 'W',
    title: '보완할 점',
    en: 'Weaknesses',
    items: [
      {
        h: '짧게 끝난 프로젝트가 많다',
        t: `${projects.length}개 가운데 ${projects.length - multiYear.length}개가 한 해 안에 끝난 대회 · 캠프 중심 과제라, 한 시스템을 오래 운영하며 고도화한 기록은 ${multiYear.length}개입니다.`,
        fix: '2025 — 2026 기업연계 IoT 링거폴대를 매주 회고하며 끝까지 다듬어, 장기 고도화 사례로 만듭니다.',
        proof: ['iot-iv-pole'],
      },
      {
        h: 'Physical AI(로봇) 기록이 아직 적다',
        t: `집중 분야인 로봇은 ${robotics.length}개 — 그중 4족보행 로봇은 적용 목적과 사양을 정하는 기획 단계입니다.`,
        fix: '사용 환경 정의 → 목표 사양 → 하드웨어 비교 → 제어 · 검증 순서로 기록을 쌓습니다(아래 미래 계획).',
        proof: ['quadruped-robot', 'vision-robot-arm'],
      },
    ],
  },
  {
    key: 'O',
    title: '기회',
    en: 'Opportunities',
    items: [
      {
        h: '스마트팩토리 · 산업 IoT',
        t: '센서로 현장을 읽고, 통신으로 모으고, 데이터로 보여 주는 흐름 — 링거폴대 · 제습장치에서 해 온 일이 그대로 닿는 분야입니다.',
        proof: ['iot-iv-pole', 'moisture-dehumidifier'],
      },
      {
        h: 'Physical AI — 화면 밖으로 나온 AI',
        t: 'AI가 로봇 · 차량 · 기기 안으로 들어가는 흐름에서, 하드웨어를 직접 만들 줄 아는 AI 개발자의 쓰임이 커집니다.',
        proof: ['vision-robot-arm', 'av-competition'],
      },
      {
        h: '산학 · 지역 연계',
        t: '기업연계 프로젝트, 앵커사업단 산학연협력 EXPO 전시, 전북 지역 창업 지원 — 현장과 바로 이어지는 통로가 이미 열려 있습니다.',
        proof: ['iot-iv-pole', 'recap-jbmotors'],
      },
    ],
  },
  {
    key: 'T',
    title: '위협',
    en: 'Threats',
    items: [
      {
        h: '빠르게 바뀌는 AI 기술',
        t: '모델과 도구가 빠르게 바뀌어, 넓게 다뤄 온 기술을 최신으로 유지하는 데 꾸준한 시간이 듭니다.',
        fix: '프로젝트마다 쓴 기술을 스킬 지도로 정리해, 어디를 다시 익혀야 할지 한눈에 봅니다.',
      },
      {
        h: '하드웨어의 시간과 비용',
        t: '부품 · 제작 · 시험에 드는 시간과 비용이 커서, 로봇 과제는 일정이 쉽게 밀립니다.',
        fix: '시뮬레이션에서 먼저 검증하고, 저속 · 무부하 시험부터 단계적으로 올립니다.',
      },
      {
        h: '한 분야를 깊게 판 경쟁자',
        t: '폭이 넓은 만큼, 한 분야만 깊게 판 지원자와 나란히 비교될 수 있습니다.',
        fix: '지원 직무(스마트팩토리 / SW)에 맞춘 대표 사례 몇 개를 깊게 보여 줍니다.',
      },
    ],
  },
];

// 대응 전략 — 강점 · 기회를 키우고 약점 · 위협을 줄이는 방향(미래 계획으로 이어진다)
export const STRATEGY = [
  { key: 'SO', h: '강점 × 기회', t: '제품 제작과 현장 SW 경험을 스마트팩토리 · 산업 IoT 직무로 — 센서 — 통신 — 데이터 — 대시보드를 한 사람이 잇습니다.' },
  { key: 'WO', h: '보완 × 기회', t: '기업연계 프로젝트를 장기 과제로 끝까지 고도화해, 짧은 프로젝트가 많다는 약점을 깊이 있는 사례로 바꿉니다.' },
  { key: 'ST', h: '강점 × 위협', t: '작게 만들어 빨리 검증하는 방식 그대로 — 시뮬레이션 → 시제품 → 현장 시험 순서로 하드웨어 리스크를 줄입니다.' },
  { key: 'WT', h: '보완 × 위협', t: '분야를 넓히기보다 Physical AI(로봇) 한 줄기에 기록을 모아, 깊이로 비교되는 자리에서도 보여 줄 것을 만듭니다.' },
];

// 미래 계획 — 지금 · 다음 단계 · 진로 목표(진행 중인 일은 Notion 기록 그대로, 정해지지 않은 사양은 쓰지 않는다)
export const PLAN = [
  {
    key: 'now',
    when: 'NOW · 2026',
    title: '지금 하고 있는 일',
    items: [
      { h: '기업연계 소형 IoT 링거폴대', t: '매주 미팅 뒤 KPT 회고로 개선 사항을 정리하고, 연구 노트를 바탕으로 구현 방향을 빠르게 검증합니다.', proof: 'iot-iv-pole' },
      { h: '4족보행 로봇 — 기획', t: '로봇이 맡을 작업과 운용 공간을 정하고, 보행 안정성 · 적재 조건 · 운용 시간 같은 목표 사양을 세웁니다.', proof: 'quadruped-robot' },
      { h: '비전 기반 로봇팔', t: '비전 인식으로 로봇팔을 제어하는 흐름을 3D 설계와 함께 검토합니다.', proof: 'vision-robot-arm' },
    ],
  },
  {
    key: 'next',
    when: 'NEXT',
    title: '다음 단계',
    items: [
      { h: '4족보행 — 하드웨어 구성', t: '프레임 · 구동부 · 센서 후보를 비교하고, 액추에이터 토크 · 링크 길이 · 배터리 용량을 사양에 맞춥니다.', proof: 'quadruped-robot' },
      { h: '4족보행 — 제어 · 검증', t: '보행 제어 방식과 시험 기준을 세우고, 시뮬레이션 뒤 저속 · 무부하 시험부터 단계적으로 올립니다.', proof: 'quadruped-robot' },
      { h: '현장 데이터까지 한 흐름으로', t: '링거폴대처럼 센서 — 통신 — 데이터 — 대시보드를 끝까지 잇는 과제를 대표 사례로 다듬습니다.', proof: 'iot-iv-pole' },
    ],
  },
  {
    key: 'goal',
    when: 'GOAL',
    title: '진로 목표',
    items: [
      { h: `지원 직무 — ${TARGET.role}`, t: `관심 도메인: ${TARGET.domains.join(' · ')}` },
      { h: '이런 개발자로', t: TARGET.line },
      { h: '일하는 방식은 그대로', t: '현장에서 문제를 찾고, 작게 만들어 빨리 검증하고, 함께 끝까지 갑니다.' },
    ],
  },
];

// 출처 표기(페이지 아래)
export const JOURNEY_SOURCE =
  'SWOT · 미래 계획은 2026 Notion 포트폴리오(지원 직무 · 관심 도메인 · 강점 · 협업 방식 · 4족보행 로봇 기획 단계)와 이 포트폴리오의 기록(프로젝트 · 수상 · 보도 · 자격 수)을 바탕으로 정리했습니다.';
