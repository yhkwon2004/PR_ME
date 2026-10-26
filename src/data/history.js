// 연도별 이력 — 연도와 항목은 본인이 정리한 이력을 그대로 쓴다.
// 항목마다 이어진 프로젝트 · 수상(상장) · 보도를 붙이고, note에는 2026 Notion 포트폴리오에 본인이 적은 기록이나 대학 공식 기사에 나온 사실만 옮긴다.
// photo: 카드의 큰 그림으로 쓸 프로젝트 사진(없으면 그 프로젝트의 대표 사진)
// brief: 필름 화면에 보이는 한 줄(30자 안팎, note를 줄인 것) — 전문은 note
// 근거 기록이 없는 항목은 이름만 둔다(지어내지 않는다). 그 해의 나머지 프로젝트 · 수상은 연도 아래에 자동으로 모인다.
import { projects, byId } from './projects.js';
import { AWARDS } from './awards.js';
import { PRESS } from './press.js';

const aw = (date, word) => AWARDS.find((a) => a.date === date && a.contest.includes(word)) || null;
const yearsOf = (y = '') => (String(y).match(/20\d{2}/g) || []).map(Number);

const RAW = [
  {
    year: '2023',
    items: [
      { id: 'ai-major', kind: '입학', title: '원광대학교 인공지능융합학과 입학', note: '2023년 인공지능융합학과로 입학 — 2024년 컴퓨터소프트웨어공학전공으로 소속 변경', brief: '대학 시절의 시작 — 인공지능융합학과' },
      { id: 'gan-tts', kind: '연구 · 산학', title: '인공지능 연구실 GAN TTS 산학프로젝트', note: '산학 프로젝트 — GAN-TTS 개발 참여(2023.05 ~ 2023.11)', brief: 'GAN-TTS 개발 참여 · 2023.05 – 11', projects: ['gan-tts'] },
      { id: 'chiangmai', kind: '해외 교육 · 발표', title: '치앙마이 SW 해외교육 및 세미나 발표', note: '치앙마이 SW 교육 · 스마트 헬스케어 세미나 발표', brief: 'SW 교육 · 스마트 헬스케어 세미나 발표', projects: ['chiangmai-seminar'] },
      {
        id: 'eniac',
        kind: '동아리',
        title: '컴퓨터 학술동아리 ENIAC',
        note: '객체지향 프로젝트(Raspberry Pi · YOLO 활용), 컴퓨터 학술 동아리 경진대회 2위 — 학술동아리 성과 보고로 진행한 1인 시뮬레이터 프로젝트',
        brief: 'Raspberry Pi · YOLO 프로젝트 · 경진대회 2위',
        projects: ['airsim-driving'],
      },
    ],
  },
  {
    year: '2024',
    items: [
      {
        id: 'car-club',
        kind: '동아리 · 대회',
        title: '자작차 동아리활동 (자율주행대회 & 자작차동아리)',
        note: "기계공학과 자작차 동아리 '메카니즘'에서 BAJA · EV · Formula 차량 제작, 산업부 주관 미래자동차 SW 자율주행 경진대회 참가",
        brief: "'메카니즘' 차량 제작 · 자율주행 경진대회",
        projects: ['baja-ev-formula', 'av-competition'],
        awards: [aw('2024', '미래자동차')],
      },
      {
        id: 'major-change',
        kind: '전공',
        title: '컴퓨터소프트웨어공학전공 소속 변경',
        note: '원광대학교 인공지능융합학과에서 컴퓨터소프트웨어공학전공으로 소속 변경',
        brief: '인공지능융합학과 → 컴퓨터소프트웨어공학전공',
      },
      {
        id: 'double-major',
        kind: '복수전공',
        title: '미래수송기기학부 스마트모빌리티 SW공학 복수전공',
        note: 'JST 공유대학(전북대학교) 스마트 모빌리티 SW공학 복수전공 — 2024년 2학기 시작',
        brief: '2학기부터 JST 공유대학(전북대) 복수전공',
        awards: [aw('2025-02-14', '미래수송기기'), aw('2025-07-04', '두드림')],
      },
      { id: 'startup-club', kind: '창업 동아리', title: '창업 동아리 (늘솔길 활동)', note: "창업 동아리 팀 '늘솔길'", brief: "창업 동아리 팀 '늘솔길'", projects: ['peltier-cooler'] },
    ],
  },
  {
    year: '2025',
    items: [
      {
        id: 'iot-lab',
        kind: '연구실',
        title: '지능형 IOT 연구실',
        note: '사물인터넷 연구실(인퓨테크) — H/W(PCB · 3D 설계) · F/W(통신 알고리즘)',
        brief: '인퓨테크 — PCB · 3D 설계 · 통신 펌웨어',
        projects: ['iot-iv-pole'],
        awards: [aw('2025-11-27', 'WON+UP')],
        press: ['capstone-2025'],
      },
      { id: 'intern', kind: '인턴십', title: '테이블컵 인턴쉽' },
      {
        id: 'gov-awards',
        kind: '수상',
        title: '전북도지사상 2건, 강릉시장상 1건',
        brief: 'Drive-UP 창업캠프 · 지역 문제 해결 · 강릉 캠프',
        awards: [aw('2025-08-07', 'Drive Up'), aw('2025-12-02', '지역 문제'), aw('2025-08-29', '강릉')],
        press: ['driveup-2025', 'gangneung-2025'],
      },
      { id: 'scholar', kind: '장학', title: '국가우수 이공계 장학생 선발', note: '국가우수(이공계) 장학생 — 부총리 겸 과학기술정보통신부 장관 장학증서(제2025-0263호, 2025.10.13)', brief: '국가우수(이공계) 장학생 · 과학기술정보통신부' },
    ],
  },
  {
    year: '2026',
    items: [
      {
        id: 'iot-lab-2026',
        kind: '연구실',
        title: '지능형 IOT 연구실',
        note: '기업연계 프로젝트(소형 IoT 링거폴대) — 매주 미팅 뒤 KPT 회고로 개선 사항 정리',
        brief: '기업연계 소형 IoT 링거폴대 · 매주 KPT 회고',
        projects: ['iot-iv-pole'],
        awards: [aw('2026-08-19', '피우다')],
      },
      {
        id: 'jbmotors',
        kind: '창업 · 입점',
        title: '전북현대 모터스 제품 기업 입점',
        note: 'Re:cap 대표 — 폐키보드 키캡 · 스위치로 만든 업사이클 키링을 전북현대모터스FC에 입점',
        brief: 'Re:cap 대표 — 업사이클 키링 구단 입점',
        projects: ['recap-jbmotors'],
        press: ['recap-store-2026', 'recap-soldout-2026'],
      },
      {
        id: 'expo',
        kind: '전시 · 수상',
        title: 'EXPO 우수사례 전시 및 우수 성과상 수여',
        note: '2026 산학연협력 EXPO(9.30 ~ 10.2, KINTEX) — 앵커사업단 전시관에 폐키보드 업사이클링 키캡 등 6개 성과물 전시, 오프라인 우수성과 전시관 부문 우수성과상',
        brief: '산학연협력 EXPO 전시 · 우수성과상',
        projects: ['recap-jbmotors'],
        press: ['expo-2026'],
        photo: 'media/projects/recap-jbmotors/08.webp',
      },
      { id: 'modoo', kind: '창업', title: '모두의창업 1기 2R진출' },
    ],
  },
];

export const HISTORY = RAW.map((y) => {
  const items = y.items.map((it) => {
    const list = (it.projects || []).map(byId).filter(Boolean);
    const awards = (it.awards || []).filter(Boolean);
    const press = (it.press || []).map((id) => PRESS.find((a) => a.id === id)).filter(Boolean);
    return { ...it, year: y.year, note: it.note || '', brief: it.brief || '', projects: list, awards, press, deep: !!(it.note || list.length || awards.length || press.length) };
  });
  // 그 해의 프로젝트 · 수상(항목에 이미 이어진 것도 포함) — 놓친 기록 없이 그 해에 들어갈 수 있게
  const yp = projects.filter((p) => yearsOf(p.year).includes(+y.year));
  const ya = AWARDS.filter((a) => a.year === y.year);
  return { year: y.year, items, projects: yp, awards: ya };
});
export const HISTORY_YEARS = HISTORY.map((y) => y.year);
export const historyItem = (id) => HISTORY.flatMap((y) => y.items).find((it) => it.id === id);
