// 발표 자료(/present)의 목표 직무 · SWOT 분석 · 대응 전략 · 단기 · 중기 · 장기 계획 — 덱에서만 쓴다(포트폴리오 필름에는 없다).
// 목표: 국방과학연구소(ADD) 연구직 — 감시정찰 · 항공·무인기(본인이 정한 목표), 길: 로보틱스 대학원(석사, 준비 중) → ADD 연구직 공개채용.
// ADD는 연구개발 분야를 미사일 · 지상무기 · 수중 · 해양무기 · 항공·무인기 · 감시정찰 · 지휘통제 · 정보전 · 국방우주 · 핵심 · 미래기술로 나눠 소개하고,
// 감시정찰은 '실시간 전장감시' 분야로 정찰용 무인기 영상장비(EO/IR · 영상레이다) 등을 개발해 왔다. 연구직 공채는 연구직(석사) · 연구직(박사)으로 나눠 뽑는다.
// 근거: 이 포트폴리오의 기록(프로젝트 · 수상 · 보도 · 자격 수 — 숫자는 기록에서 센다)과 2026 Notion 포트폴리오.
// 약점 · 위협 · 계획은 기록을 바탕으로 정리한 자기 분석이므로, 본인이 고쳐 쓰기 쉽게 문장만 이 파일에 둔다.
import { projects, CATEGORIES } from '../data/projects.js';
import { AWARDS } from '../data/awards.js';
import { PRESS } from '../data/press.js';
import { CERTS } from '../data/skills.js';

const yearsOf = (y = '') => String(y).match(/20\d{2}/g) || [];
const multiYear = projects.filter((p) => new Set(yearsOf(p.year)).size > 1);
const robotics = projects.filter((p) => p.category === 'robotics');
const grand = AWARDS.filter((a) => a.tier === 1).length;
const fields = CATEGORIES.filter((c) => projects.some((p) => p.category === c.id)).length;

// 목표 직무 — 국방과학연구소(ADD) 연구직 · 무인 감시정찰(항공·무인기 · 감시정찰 분야), 가는 길은 로보틱스 대학원
export const TARGET = {
  role: '국방과학연구소(ADD) 무인 감시정찰 연구원',
  short: 'ADD 무인 감시정찰 연구원',
  org: '국방과학연구소 Agency for Defense Development',
  job: '연구직 — 항공·무인기 · 감시정찰 분야',
  url: 'https://www.add.re.kr',
  grad: '로보틱스 대학원(석사)',
  path: [
    ['지금', '원광대 컴퓨터소프트웨어공학 · JST 스마트 모빌리티 SW 복수전공'],
    ['다음', '로보틱스 대학원(석사) — 준비 중'],
    ['목표', 'ADD 연구직(석사) 공개채용 — 무인 감시정찰'],
  ],
  // 무인 정찰의 한 바퀴: 보고(센서) → 알아보고(인식) → 판단하고(자율) → 움직인다(비행 · 주행 제어)
  flow: ['센서 · 탐지', '인식 · AI', '자율 판단', '비행 · 주행 제어'],
  domains: ['항공·무인기', '감시정찰', '자율비행 · 자율주행', '로보틱스 · 컴퓨터 비전'],
  line: '드론 · 자율주행 · 로봇을 직접 만들고 날려 본 경험을, 실시간 전장감시를 위한 무인 정찰 연구로 잇는 연구원',
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
        h: '무인체계 · 감시정찰 수요',
        t: 'ADD는 항공·무인기와 감시정찰을 연구개발 분야로 두고 정찰용 무인기 영상장비를 개발해 왔습니다 — 드론 · 자율주행 · 로봇을 직접 만들어 본 경험이 그대로 닿는 분야입니다.',
        proof: ['pixhawk-drone', 'av-competition'],
      },
      {
        h: 'Physical AI — 화면 밖으로 나온 AI',
        t: 'AI가 로봇 · 차량 · 기기 안으로 들어가는 흐름에서, 하드웨어를 직접 만들 줄 아는 AI 개발자의 쓰임이 커집니다.',
        proof: ['vision-robot-arm', 'av-competition'],
      },
      {
        h: '로보틱스 대학원 · 연구실 경험',
        t: '인공지능 연구실 산학(GAN-TTS)과 지능형 IoT 연구실에서 해 본 연구 · 개발이, 로보틱스 대학원 연구로 이어질 통로입니다.',
        proof: ['gan-tts', 'iot-iv-pole'],
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
        h: '석사 · 박사 중심의 연구직',
        t: 'ADD 연구직은 석사 · 박사로 나눠 뽑아, 학부 경험만으로는 한 분야를 깊게 판 지원자와 나란히 비교됩니다.',
        fix: '로보틱스 대학원에서 무인체계 한 주제를 깊게 연구해 학위와 연구 실적을 갖춥니다.',
      },
    ],
  },
];

// 대응 전략 — 강점 · 기회를 키우고 약점 · 위협을 줄이는 방향(미래 계획으로 이어진다)
export const STRATEGY = [
  { key: 'SO', h: '강점 × 기회', t: '드론 교관 자격 · Pixhawk 자율비행 · 자율주행 경진대회 경험을 무인 감시정찰 연구로 — 직접 만들고 날려 본 연구원이 됩니다.' },
  { key: 'WO', h: '보완 × 기회', t: '짧게 끝난 프로젝트가 많다는 약점을, 로보틱스 대학원에서 한 주제를 오래 파는 연구로 바꿉니다.' },
  { key: 'ST', h: '강점 × 위협', t: '작게 만들어 빨리 검증하는 방식 그대로 — 시뮬레이션(AirSim · Gazebo) → 시제품 → 현장 시험 순서로 무인체계의 위험을 줄입니다.' },
  { key: 'WT', h: '보완 × 위협', t: '분야를 넓히기보다 로보틱스 · 무인체계 한 줄기에 기록을 모아, 석사 · 박사와 비교되는 자리에서도 보여 줄 연구를 만듭니다.' },
];

// 미래 계획 — 지금 · 다음 단계 · 진로 목표(진행 중인 일은 Notion 기록 그대로, 정해지지 않은 사양은 쓰지 않는다)
export const PLAN = [
  {
    key: 'now',
    when: 'NOW · 2026',
    title: '로보틱스 대학원 준비',
    items: [
      { h: '로보틱스 대학원 진학 준비', t: '로봇 · 무인체계를 깊게 연구할 대학원(석사) 진학을 준비합니다.' },
      { h: '4족보행 로봇 — 기획', t: '로봇이 맡을 작업과 운용 공간을 정하고, 보행 안정성 · 적재 조건 · 운용 시간 같은 목표 사양을 세웁니다.', proof: 'quadruped-robot' },
      { h: '기업연계 소형 IoT 링거폴대', t: '매주 미팅 뒤 KPT 회고로 개선 사항을 정리하고, 연구 노트를 바탕으로 구현 방향을 빠르게 검증합니다.', proof: 'iot-iv-pole' },
    ],
  },
  {
    key: 'next',
    when: 'NEXT · 대학원',
    title: '로보틱스 석사 과정',
    items: [
      { h: '4족보행 — 하드웨어 · 제어 · 검증', t: '구동부 · 센서를 사양에 맞추고, 시뮬레이션 뒤 저속 · 무부하 시험부터 단계적으로 올립니다.', proof: 'quadruped-robot' },
      { h: '자율 · 인식 연구', t: '드론 · 자율주행에서 해 본 비전 인식과 경로 계획을 로봇 · 무인체계 연구로 넓힙니다.', proof: 'airsim-driving' },
      { h: '연구 실적 쌓기', t: '한 주제를 오래 파서 석사 학위 논문 · 학회 발표로 남깁니다.' },
    ],
  },
  {
    key: 'goal',
    when: 'GOAL · ADD',
    title: '무인 감시정찰 연구원',
    items: [
      { h: `목표 — ${TARGET.role}`, t: `${TARGET.job} — ADD 연구직(석사) 공개채용` },
      { h: '이런 연구원으로', t: TARGET.line },
      { h: '일하는 방식은 그대로', t: '현장에서 문제를 찾고, 작게 만들어 빨리 검증하고, 함께 끝까지 갑니다.' },
    ],
  },
];

// 출처 표기(페이지 아래)
export const JOURNEY_SOURCE =
  'SWOT · 미래 계획은 본인이 정한 목표(ADD 무인 감시정찰 연구원 · 로보틱스 대학원), 2026 Notion 포트폴리오와 이 포트폴리오의 기록(프로젝트 · 수상 · 보도 · 자격 수)을 바탕으로 정리했습니다.';
