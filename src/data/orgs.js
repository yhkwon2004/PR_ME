// 프로젝트와 함께한 기관 — 근거: 상장에 인쇄된 수여 기관(awards.json), projects.json의 팀·요약, 2026 Notion 포트폴리오,
// yhkwon2004/portfoli의 기관 목록. 로고는 각 기관 공식 사이트의 원본 파일을 흰색 단색으로만 바꿨다(비율 유지).
// 로고 출처: WKU image.wku.ac.kr · JBNU jbnu.ac.kr · KSAE ksae.org · CCEI ccei.creativekorea.or.kr
// CAMTIC camtic.co.kr · JBFC hyundai-motorsfc.com · GIST gist.ac.kr · JNU jnu.ac.kr · COSS coss.ac.kr.
// 앵커사업단은 yhkwon2004/portfoli의 원본 로고 파일, 그 밖의 로고(HUSS · GICON · 한국연구재단 · 전북특별자치도 · 기빙플러스 ·
// 국립군산대 · 정부 상징)는 상장에 인쇄된 로고·워터마크를 그대로 따 흰색 단색으로 바꾼 것이다(scratchpad 추출 도구, 모양을 새로 그리지 않음).
// 정부 상징(태극)은 중앙행정기관이 함께 쓰는 공식 상징이라 기관 이름을 곁에 적는다(lockup).
// 원본 파일도 상장 인쇄도 없는 곳은 엠블럼을 지어내지 않고 이름을 활자로 표기한다.
// 표기는 이력·협업 관계를 밝히는 것이며 후원이나 보증을 뜻하지 않는다.

import awardData from './awards.json';

// r: 로고 가로/세로 비율(크기를 면적 기준으로 맞출 때 쓴다)
export const ORGS = {
  wku: { name: '원광대학교', en: 'Wonkwang University', logo: 'wku', r: 3.95, url: 'https://www.wku.ac.kr/' },
  jbnu: { name: '전북대학교', en: 'Jeonbuk National University', logo: 'jbnu', r: 1.07, url: 'https://www.jbnu.ac.kr/' },
  jbfc: { name: '전북현대모터스FC', en: 'Jeonbuk Hyundai Motors FC', logo: 'jbfc', r: 0.97, url: 'https://hyundai-motorsfc.com/' },
  gist: { name: 'GIST', en: 'Gwangju Institute of Science and Technology', logo: 'gist', r: 7.76, url: 'https://www.gist.ac.kr/' },
  huss: { name: 'HUSS 인문사회 융합인재양성사업', en: 'HUSS', logo: 'huss', r: 1.2, url: 'https://globalk-culture.wku.ac.kr/' },
  camtic: { name: '캠틱종합기술원', en: 'CAMTIC', logo: 'camtic', r: 3.82, url: 'http://www.camtic.co.kr/camtic' },
  jnu: { name: '전남대학교', en: 'Chonnam National University', logo: 'jnu', r: 5.0, url: 'https://www.jnu.ac.kr/' },
  coss: { name: 'COSS 첨단분야 혁신융합대학', en: 'COSS', logo: 'coss', r: 4.47, url: 'https://coss.ac.kr/' },
  ksae: { name: '한국자동차공학회', en: 'KSAE', logo: 'ksae', r: 6.33, url: 'https://www.ksae.org/' },
  ccei: { name: '전북창조경제혁신센터', en: 'CCEI Jeonbuk', logo: 'ccei', r: 4.7, url: 'https://ccei.creativekorea.or.kr/jeonbuk/' },
  anchor: { name: '원광대학교 앵커사업단', en: 'WKU ANCHOR PROJECT', logo: 'anchor', r: 3.33, url: 'https://rise.wku.ac.kr/' },
  nrf: { name: '한국연구재단', en: 'NATIONAL RESEARCH FOUNDATION', logo: 'nrf', r: 1.35, url: 'https://www.nrf.re.kr/' },
  gicon: { name: '광주정보문화산업진흥원', en: 'GICON', logo: 'gicon', r: 1.93, url: 'https://www.gicon.or.kr/' },
  jeonbuk: { name: '전북특별자치도', en: 'JEONBUK STATE', logo: 'jeonbuk', r: 3.53, url: 'https://www.jeonbuk.go.kr/' },
  givingplus: { name: '기빙플러스', en: 'GIVING PLUS', logo: 'givingplus', r: 3.23 },
  kunsan: { name: '국립군산대학교', en: 'KUNSAN NATIONAL UNIVERSITY', logo: 'kunsan', r: 0.99, url: 'https://www.kunsan.ac.kr/' },
  jbsmes: { name: '전북지방중소벤처기업청', en: 'JEONBUK SMEs & STARTUPS', logo: 'gov', r: 1.03, lockup: true },
  motie: { name: '산업통상자원부', en: 'MINISTRY OF TRADE, INDUSTRY & ENERGY', logo: 'gov', r: 1.03, lockup: true },
  // 공식 로고 파일 없음 — 활자 표기
  jst: { name: 'JST 공유대학', en: 'JST SHARED UNIVERSITY', mark: 'JST' },
  gangneung: { name: '강릉시', en: 'GANGNEUNG CITY', mark: '강릉시' },
  greenumbrella: { name: '초록우산', en: 'CHILDFUND KOREA', mark: '초록우산' },
  swu: { name: '원광대 SW중심대학사업단', en: 'SW-CENTERED UNIVERSITY', mark: 'SW중심대학' },
  linc: { name: '원광대 LINC 3.0 사업단', en: 'LINC 3.0', mark: 'LINC 3.0' },
  ris: { name: 'RIS 에너지신산업사업단', en: 'JEONBUK RIS · ENERGY', mark: 'RIS' },
  wkurise: { name: '원광대학교 RISE사업단', en: 'WKU RISE', mark: 'RISE' },
  jbrise: { name: '전북특별자치도 RISE센터', en: 'JEONBUK RISE CENTER', mark: 'RISE센터' },
  jbtp: { name: '전북테크노파크', en: 'JEONBUK TECHNOPARK', mark: '전북테크노파크' },
  kiat: { name: '한국산업기술진흥원', en: 'KIAT', mark: 'KIAT' },
  jjlinc: { name: '전주대학교 LINC 3.0 사업단', en: 'JEONJU UNIV. LINC 3.0', mark: '전주대 LINC 3.0' },
  gnip: { name: '경남지식재산센터', en: 'GYEONGNAM IP CENTER', mark: '경남지식재산센터' },
  yesan: { name: '예산군도시재생지원센터', en: 'YESAN URBAN REGENERATION', mark: '예산군도시재생' },
};

// 프로젝트별 관계(직접 적은 것) — 데이터에 근거가 있는 것만. 수상으로 이어진 관계는 아래에서 상장으로 채운다
const MANUAL = {
  'recap-jbmotors': [
    ['jbfc', '협업 · 구단 입점 · 대상 시상'],
    ['jeonbuk', '대상 · 도지사 표창'],
    ['anchor', '키캡 키링 제작 지원'],
    ['greenumbrella', '판매 수익 전액 기부'],
  ],
  'givingplus-filament': [
    ['givingplus', '굿즈 입점 · 대상 시상'],
    ['jeonbuk', '대상 · 도지사상'],
  ],
  'coffee-box': [
    ['gangneung', '대상 · 시장 표창'],
    ['jbsmes', '최우수상 · 청장상'],
    ['nrf', '장려상 · 이사장상'],
  ],
  'moisture-dehumidifier': [
    ['kunsan', 'G-Startup 최우수상'],
    ['ris', 'G-Startup 에너지위너상'],
    ['givingplus', '지역문제 해결 우수상'],
    ['linc', '창의대첩 최우수상'],
  ],
  'kakao-fin-next': [['camtic', '최우수상 · 원장상']],
  'pixhawk-drone': [['camtic', 'ROS 경진대회 우수상 · 원장상']],
  'huss-evidence-ai': [
    ['huss', 'HUSS 융합캠프 AI 경진대회'],
    ['nrf', '우수상 · 이사장상'],
  ],
  'legal-ai-platform': [['gist', '창업아이디어 경진대회 장려상']],
  'av-competition': [['motie', '주관 자율주행 경진대회']],
  'climate-dashboard': [['jst', 'Do-Dream 해커톤 최우수상 · 학장상']],
  'ev-medical': [
    ['jbnu', '우수상 2회 · 공학교육혁신센터 · RIS 사업단'],
    ['jst', '미래수송기기 해커톤'],
  ],
  'growth-footrest': [['jnu', '우수상 · 산학협력단장상']],
  // Energy Up! 상장에 인쇄된 공동 주관: 전북대 RISE 사업단 · JST공유대학 · 에너지신산업 혁신융합대학(COSS)
  'hanok-ess': [
    ['jbnu', 'Energy Up! 공동 주관 · 우수상'],
    ['jst', 'Energy Up! 공동 주관'],
    ['coss', 'Energy Up! 공동 주관(에너지신산업)'],
  ],
  'peltier-cooler': [['ris', '장려상 · 사업단장상']],
  'iot-iv-pole': [
    ['wku', '캡스톤디자인 대상 · 총장상'],
    ['gicon', '글로벌 피우다 장려상 · 원장상'],
    ['ccei', '모두의창업'],
  ],
  'ai-pose-guide': [
    ['wku', '공학혁신인재 아이디어 캠프 대상 · 총장상'],
    ['wkurise', '아이디어 캠프 주최'],
  ],
  edufarm: [['nrf', '기술창업 메이커톤 대상 · 이사장상']],
  'baekchul-sikhye': [['wku', 'LINC 3.0 창의대첩 대상 · 총장상']],
  'baja-ev-formula': [
    ['wku', '기계공학과 자작차 동아리'],
    ['ksae', '자작차 제작'],
  ],
  'rehab-game': [['swu', '우수상 · 사업단장상']],
  'robot-push-hackathon': [['swu', '최우수상 · 사업단장상']],
};

// 상장 수여자 → 기관(상장에 인쇄된 이름 그대로 대응). 대회명에만 나오는 공동 주최는 awards.json의 orgs에 적는다
const ISSUER = [
  [/한국연구재단/, 'nrf'],
  [/광주정보문화산업진흥원/, 'gicon'],
  [/HUSS/, 'huss'],
  [/SW중심대학/, 'swu'],
  [/원광대학교 LINC|LINC 3\.0 창의대첩/, 'linc'],
  [/전주대학교 LINC/, 'jjlinc'],
  [/원광대학교 (총장|교무처장|교육혁신원장|미래인재개발처장)/, 'wku'],
  [/전북특별자치도지사/, 'jeonbuk'],
  [/전북특별자치도 RISE/, 'jbrise'],
  [/기빙플러스/, 'givingplus'],
  [/캠틱/, 'camtic'],
  [/중소벤처기업청/, 'jbsmes'],
  [/강릉시/, 'gangneung'],
  [/전북현대모터스/, 'jbfc'],
  [/JST/, 'jst'],
  [/RIS 에너지신산업/, 'ris'],
  [/전북대학교/, 'jbnu'],
  [/국립군산대학교/, 'kunsan'],
  [/전남대학교/, 'jnu'],
  [/전북테크노파크/, 'jbtp'],
  [/경남지식재산센터/, 'gnip'],
  [/예산군/, 'yesan'],
  [/GIST/, 'gist'],
  [/산업통상자원부/, 'motie'],
];

// 한 상에 이어진 기관(수여자 먼저, 공동 주최 뒤)
export function awardOrgs(a) {
  const text = `${a.issuer || ''} ${a.contest || ''}`;
  const keys = ISSUER.filter(([re]) => re.test(text)).map(([, k]) => k);
  return [...new Set([...keys, ...(a.orgs || [])])].filter((k) => ORGS[k]);
}

const shortGrade = (a) => a.grade.replace(/\s/g, '');

// 프로젝트별 관계: 직접 적은 관계 + 그 프로젝트가 받은 상의 수여 기관
export const PROJECT_ORGS = (() => {
  const out = Object.fromEntries(Object.entries(MANUAL).map(([id, list]) => [id, [...list]]));
  awardData.forEach((a) => {
    if (!a.project) return;
    const list = (out[a.project] ||= []);
    awardOrgs(a).forEach((k) => {
      if (!list.some(([x]) => x === k)) list.push([k, `${a.contest.replace(/^20\d\d(학년도)?\s*/, '').slice(0, 26)} ${shortGrade(a)}`]);
    });
  });
  return out;
})();

// 기관별로 이어진 프로젝트와 상(크레딧 · 기관 벽에서 로고 아래에 프로젝트를 붙인다)
export const ORG_INDEX = (() => {
  const idx = Object.fromEntries(Object.keys(ORGS).map((k) => [k, { projects: [], awards: 0 }]));
  Object.entries(PROJECT_ORGS).forEach(([id, list]) => list.forEach(([k, rel]) => idx[k]?.projects.push({ id, rel })));
  awardData.forEach((a) => awardOrgs(a).forEach((k) => idx[k] && idx[k].awards++));
  return idx;
})();

// 기관 벽: 로고가 있는 곳 먼저(이어진 프로젝트 · 상이 많은 순), 그다음 활자 표기
const weight = (k) => ORG_INDEX[k].projects.length * 2 + ORG_INDEX[k].awards;
export const WALL = Object.keys(ORGS).sort((a, b) => !!ORGS[b].logo - !!ORGS[a].logo || weight(b) - weight(a));

// 엔딩 크레딧: 로고가 있는 기관 전부
export const CREDITS = WALL.filter((k) => ORGS[k].logo);

export const orgsOf = (id) => (PROJECT_ORGS[id] || []).map(([k, rel]) => ({ ...ORGS[k], id: k, rel }));
