// 포트폴리오 콘텐츠 — 출처: 2026 Notion 포트폴리오, yhkwon2004/portfoli 기록 데이터.
// 장면(scene) 순서가 곧 영화의 순서입니다. 3D 연출은 director.js의 SHOTS가 같은 id로 대응합니다.

import projectData from './data/projects.json';
import awardData from './data/awards.json';
import pressData from './data/press.json';

const M = (file) => `/media/${file}`;
// 대상(1등급) — awards.js의 tierOf와 같은 기준
const isGrand = (a) => /대상/.test(a.grade);
// 창업 · 제품개발 장면의 덱 순서: 머리줄의 묶음(돌봄 · 에너지 · 업사이클 · 식품) 순서 그대로
const BUILD_DECK = ['edufarm', 'iot-iv-pole', 'pressure-clicker', 'growth-footrest', 'peltier-cooler', 'moisture-dehumidifier', 'givingplus-filament', 'recap-jbmotors', 'coffee-box', 'baekchul-sikhye'];

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
  // 지금 하는 일 — INFUTECH(2026 공학페스티벌 발표 자료 · 유통사 협약서 · 논문 상장, 본인 제공) 그대로.
  // AIT 2026 Best Paper는 팀원 논문(정익상 · 한우진 · 이완범) — 본인 수상으로 쓰지 않는다. 우수논문상은 공저(권용현 포함).
  now: {
    org: 'INFUTECH · 학생창업기업 인퓨테크',
    role: '대표자 · F/W · PCB 개발 총괄',
    product: 'INFU RETRO',
    title: '링거폴대를 바꾸지 않고 붙이는 스마트 수액 모니터링',
    lead: '간호사 1명이 43.6명을 돌보는 병동에서, 순회 사이의 수액 이상을 무게센서 하나와 경량 AI로 잡아 스테이션에 알립니다.',
    project: 'iot-iv-pole',
    photo: { src: M('projects/iot-iv-pole/07.webp'), thumb: M('projects/iot-iv-pole/07.thumb.webp'), w: 1280, h: 720, alt: 'INFU RETRO 시연 — 폴대 위 모듈 · 스테이션 대시보드 · 환자 앱' },
    facts: [
      { value: '60×35mm', label: '직접 설계한 PCB', sub: 'ESP32 · ADS1232 · 무게센서 하나' },
      { value: '97.3%', label: '경량 CNN 이상 판별', sub: '파라미터 659개 · 모의 데이터' },
      { value: '우수논문상', label: '2026 공동학술발표회', sub: '공저 · 2026.07' },
      { value: '5,000만 원', label: '유통사 구매의향 협약', sub: '㈜에스케이엠엔엠 · 2026.10' },
    ],
    more: ['캡스톤디자인 대상 2025.11', '팀 논문 AIT 2026 Best Paper', '특허 출원 진행 중'],
    team: '팀장 정익상 · 권용현 · 한우진 · 최이지 · 한별 — 지도교수 이완범',
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
    // 제목 앞에 증거부터 — 기록 장면의 수 · /works · /awards와 같은 수(숨긴 기록 제외). 영문 · 숫자만(표지 머리줄은 나누지 않는다)
    kicker: `${projectData.filter((p) => !p.hidden).length} PROJECTS · ${awardData.length} AWARDS`,
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
    // 이력서처럼 세 화면(소개 → 학력 · 기록 → 지금 · INFUTECH) — 스크롤 없이 한 화면씩(src/ui/beats.js).
    // 성장 과정 · 보유 역량 · 미래 계획은 필름에 두지 않는다(따로 떨어진 발표 자료 yhkwon2004/wku_portfolio에서) — 필름은 프로젝트에 집중
    layout: 'beats',
    beats: 'profile',
    hold: 11,
    beatHold: 7, // 화면마다 머무는 초(자동 재생)
    // 화면에는 세 화면(beats.js)이 저마다의 머리줄을 쓴다 — 이 값은 세 화면의 순서를 적어 둔 것
    kicker: 'PROLOGUE — 소개 · 학력 · 지금',
    title: ['제약을 이해하고, 작은 실험으로', '해법을 검증합니다.'],
    titleKo: true,
  },
  // ── 02 프로젝트: 드론 · 모빌리티 → 로봇 · AI → 창업 · 제품개발 — 끝 카드에서 39개 전체로 ──
  {
    id: 'ground',
    chapter: ['02', '프로젝트'],
    ko: '드론 · 모빌리티',
    code: 'MOBILITY',
    label: 'Drone & Mobility',
    layout: 'reel',
    hold: 12,
    category: 'mobility',
    // 머리줄: 'PART n OF m — 덱의 묶음(카드 순서대로)' — 영문은 아래에서 장 안의 순서로 채운다(데스크톱만, 휴대폰은 한국어만)
    // 하늘 = pixhawk-drone · 가상 = airsim-driving · 지상 = baja-ev-formula, av-competition
    part: '하늘 · 가상 · 지상',
    title: ['DRONE &', 'MOBILITY'],
    // 부제: 묶음마다 동사 하나 — skills.js CERTS drone-inst(지도조종자 · 교관) · airsim-driving.metrics[0](약 3회 → 1회 이하, 안정 주행 10회 중 충돌)
    subtitle: '기체를 띄우고, 모델을 학습시키고, 차를 만들어 달리기까지',
    stats: [
      { value: '교관', label: '드론 자격' },
      { value: '1회 이하', label: '가상 주행 10회 중 충돌' },
    ],
    projects: ['pixhawk-drone', 'airsim-driving', 'baja-ev-formula', 'av-competition'],
  },
  {
    id: 'robotics',
    chapter: ['02', '프로젝트'],
    ko: '로봇 · AI',
    code: 'ROBOTICS',
    label: 'Robotics & AI',
    layout: 'reel',
    hold: 11,
    category: 'robotics',
    // 발표처럼 기승전결: 머리줄의 네 글자는 지금 카드의 막(act)에 불이 들어온다(panels.js)
    part: '기 · 승 · 전 · 결',
    title: ['ROBOTICS', '& AI'],
    // 부제의 네 마디가 곧 네 막: 몸과 목소리를 다루고 = 기(해커톤 로봇 · 음성 합성) · 사람을 보고 = 승 · 사건을 정리하고 = 전 · 다시 몸으로 = 결
    subtitle: '몸과 목소리를 다루고, 사람을 보고, 사건을 정리하고, 다시 몸으로',
    // huss-evidence-ai: 2026 HUSS AI 경진대회 우수상 · 전국 2위, 50회 테스트에서 수작업 대비 작성·정리 속도 33.7% 향상
    stats: [
      { value: '전국 2위', label: 'AI 경진대회' },
      { value: '33.7%', label: '정리 속도 향상' },
    ],
    // 덱은 막의 순서 그대로 — 연도가 2023 · 2023 · 2025 · 2026 × 4로 거꾸로 가지 않는다(2026년 안의 달은 막 순서를 따르므로
    // 노트는 '여기서 방향을 틉니다'처럼 시간 순서를 말하지 않는다 — '같은 해에는' · '마지막은')
    projects: ['robot-push-hackathon', 'gan-tts', 'worker-posture-ios', 'ai-pose-guide', 'legal-ai-platform', 'huss-evidence-ai', 'quadruped-robot'],
    // 기승전결(panels.js · site.js deckInfo): 막마다 글자 · 이름 · 한 줄(그 막의 첫 카드에) · 프로젝트,
    // 카드마다 발표 노트(bridges — 말로 하는 글이라 '·' '—'를 쓰지 않는다), 끝 카드의 맺음말(close).
    // 사실은 projects.json · awards.json · press.json 그대로 — 본인 역할은 기록에 적힌 것만
    // (gan-tts 학부연구생 · 개발 환경 · wav 데이터 · 오류 해결, worker-posture-ios 객체 인식, ai-pose-guide 소프트웨어), 역할이 비어 있는 프로젝트는 팀으로 말한다
    arc: {
      acts: [
        { act: '기', name: '몸과 목소리', line: '2023년, 해커톤에선 팀으로 로봇을 만들고, 연구실에선 음성 합성 연구를 도왔습니다.', projects: ['robot-push-hackathon', 'gan-tts'] },
        { act: '승', name: '보는 AI', line: '카메라로 사람을 보고, 작업장에선 위험한 자세를, 촬영 전엔 어울리는 포즈를 찾습니다.', projects: ['worker-posture-ios', 'ai-pose-guide'] },
        { act: '전', name: '정리하는 AI', line: '이번엔 사람이 아니라 기록을 읽습니다. 지어내지도 판단하지도 않고, 사건을 시간순으로 세웁니다.', projects: ['legal-ai-platform', 'huss-evidence-ai'] },
        { act: '결', name: '다시, 몸으로', line: '서보모터로 네 다리를 세웠고, 보행과 관절 제어는 아직 설계 단계입니다.', projects: ['quadruped-robot'] },
      ],
      bridges: {
        'robot-push-hackathon': '시작은 몸입니다. 2023년 해커톤에서 네 명이 기구와 회로, 모터, 조작 앱을 한 대로 묶어, 리프트와 집게로 상대 로봇을 밀어내는 로봇으로 최우수상을 받았습니다.',
        'gan-tts': '같은 해 연구실에서는 목소리를 다뤘습니다. 사투리까지 자연스러운 한국어 음성 합성 연구에 학부연구생으로 참여해 개발 환경과 wav 데이터를 맡았고, 학습 중 난 MeCab 오류의 해결 방법을 찾았습니다.',
        'worker-posture-ios': '여기서부터는 보는 AI입니다. 2025년 4인 팀이 보호구 착용과 작업 자세를 카메라로 확인하는 iOS 앱을 만들었고, 저는 안전모와 안전조끼를 찾는 객체 인식을 맡았습니다.',
        'ai-pose-guide': '다음은 포즈를 권하는 AI입니다. 촬영 직전의 30초, 배경에 어울리는 포즈와 구도를 3D 마네킹으로 미리 보여 주는 PicPose에서 5인 팀의 소프트웨어를 맡아 대상을 받았습니다.',
        'legal-ai-platform': '같은 해에는 사건 기록을 다뤘습니다. 문서와 메모로 흩어진 사건 자료를 시간순으로 세우는 비전문가용 리걸 AI를 기획해, GIST-호남권대학 창업아이디어 경진대회에서 장려상을 받았습니다.',
        'huss-evidence-ai': '이번엔 기획을 넘어 시험까지 했습니다. 4인 팀의 LLM 보조 시스템은 학교폭력 피해 학생의 진술을 지어내지 않고 시간순으로 정리하며 빠진 정보를 짚도록 설계했고, 50회 테스트에서 수작업보다 33.7% 빨랐습니다. HUSS AI 경진대회에서는 전국 2위에 올랐습니다.',
        'quadruped-robot': '마지막은 다시 몸입니다. 서보모터와 출력 부품으로 몸체와 네 다리를 세운 초기 단계이고, 트롯 보행과 관절 PID 제어는 아직 설계 후보입니다.',
      },
      close: '몸에서 시작해 다시 몸으로 돌아왔습니다. 네 다리로 섰고, 남은 것은 걷게 하는 일입니다.',
    },
  },
  {
    // 창업 · 제품개발: 격납고 위 크레인 숏 — 직접 만들어 팔고 · 입점하고 · 기부한 제품들
    id: 'build',
    chapter: ['02', '프로젝트'],
    ko: '창업 · 제품개발',
    code: 'BUILD',
    label: 'Build & Launch',
    layout: 'reel',
    hold: 12,
    category: 'product',
    // 돌봄 = edufarm · iot-iv-pole · pressure-clicker · growth-footrest, 에너지 = peltier-cooler · moisture-dehumidifier,
    // 업사이클 = givingplus-filament · recap-jbmotors · coffee-box, 식품 = baekchul-sikhye
    part: '돌봄 · 에너지 · 업사이클 · 식품',
    title: ['BUILD &', 'LAUNCH'],
    // 상(이 덱의 수상) → 매대(기빙플러스 · 전북현대 입점) → 완판(recap-jbmotors 팝업 1시간) — 모든 제품이 팔렸다는 말은 아니다
    subtitle: '상을 받고, 매대에 오르고, 완판까지',
    // bar: 덱 막대의 한 줄(낮은 데스크톱)에서 읽히는 말 — 큰 수치 + 이름표 순서로 이으면 어색한 것만('6건 대상 (전체 7건 중)' → '대상 7건 중 6건')
    stats: [
      // 대상 일곱 가운데 이 덱의 프로젝트가 받은 수(awards.json에서 센다)
      {
        value: `${awardData.filter((a) => isGrand(a) && BUILD_DECK.includes(a.project)).length}건`,
        label: `대상 (전체 ${awardData.filter(isGrand).length}건 중)`,
        bar: `대상 ${awardData.filter(isGrand).length}건 중 ${awardData.filter((a) => isGrand(a) && BUILD_DECK.includes(a.project)).length}건`,
      },
      // 부제의 끝 '완판까지' — recap-jbmotors.metrics[0] · 보도(2026.04): 팝업 판매 시작 1시간 만에 준비 수량 완판.
      // (기부 금액 630만 원은 보도 · Notion 원문에 없어 장면 머리에는 쓰지 않는다 — 출처가 확인되면 되살린다)
      { value: '1시간', label: '팝업 완판', bar: '1시간 만에 완판' },
    ],
    projects: BUILD_DECK,
  },
  {
    id: 'press',
    chapter: ['03', '보도 · 수상'],
    ko: '언론 보도',
    code: 'PRESS',
    label: 'In the Press',
    layout: 'reel',
    hold: 12,
    press: true,
    // 매체 셋: 원대신문 = 학보 · 원광대학교 = 대학 · 원광대학교 RISE사업단 = 사업단(press.json)
    part: '학보 · 대학 · 사업단',
    title: ['IN THE', 'PRESS'],
    subtitle: '제가 쓰지 않은 기록 — 누르면 기사 원문으로',
    stats: [
      { value: `${pressData.length}건`, label: '공식 보도' },
      // 카드의 '직접 소개' 칩과 같은 말(인터뷰 포함 — press.js isDirect)
      { value: `${pressData.filter((a) => a.relation === '직접 소개' || a.relation === '인터뷰').length}건`, label: '직접 소개된 기사' },
    ],
  },
  {
    id: 'record',
    chapter: ['03', '보도 · 수상'],
    ko: '수상 · 기록',
    code: 'RECORD',
    label: 'The Record',
    layout: 'stage',
    hold: 12,
    // 아래 세 덩어리(수치 · 장학 · 봉사 줄 · 수상 덱)를 차례로
    part: '수상 · 장학 · 봉사',
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
    // 엔딩 크레딧: 여섯 장면(비트) — 한 장씩 가운데에 들어와 잠깐 머문 뒤 넘어간다(약 10초)
    // 이름 → 분야 → 주연(대표 프로젝트 사진 · 받은 상) → 기록(수상 · 대상 · 보도 · 대상 받은 대회) → 함께한 곳(로고) → 감사
    credits: [
      { beat: 'lead', role: 'Written, Directed & Engineered by', name: '권용현', en: 'Yonghyun Kwon' },
      { beat: 'words', role: 'Featuring', words: ['Drone', 'Robot', 'Mobility', 'AI'] },
      { beat: 'cast', role: 'Starring', title: '대표 프로젝트' },
      { beat: 'record', role: 'Awards & Press', title: '대상을 받은 대회' },
      { beat: 'with', role: 'With', title: '함께한 학교 · 기관 · 상을 준 곳' },
      { beat: 'thanks', role: 'Special Thanks', line: '함께 만든 팀원들 · 지도해 주신 교수님들', big: '끝까지 봐 주셔서 감사합니다' },
    ],
    end: ['다음 장면은,', '함께 만들 차례입니다.'],
    endEn: 'The next scene is yours.',
  },
];

// 장면 머리줄 'PART n OF m — 한국어': 영문은 그 장(chapter) 안에서 몇 번째 장면인지(장면 순서가 바뀌어도 맞게) — 휴대폰은 한국어만(main.css .k-en)
scenes.forEach((s) => {
  if (!s.part) return;
  const peers = scenes.filter((x) => x.chapter?.[0] === s.chapter[0]);
  s.kicker = `PART ${peers.indexOf(s) + 1} OF ${peers.length} — ${s.part}`;
});

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
