// 프로젝트와 함께한 기관 — 근거: 상장에 인쇄된 수여 기관(awards.json), projects.json의 팀·요약, 2026 Notion 포트폴리오,
// yhkwon2004/portfoli의 기관 목록. 로고는 각 기관 공식 사이트의 원본 파일을 흰색 단색으로만 바꿨다(비율 유지).
// 로고 출처: WKU image.wku.ac.kr · JBNU jbnu.ac.kr · KSAE ksae.org · CCEI ccei.creativekorea.or.kr
// CAMTIC camtic.co.kr · JBFC hyundai-motorsfc.com · GIST gist.ac.kr · JNU jnu.ac.kr · COSS coss.ac.kr.
// 공식 로고 파일이 없거나(엠블럼을 지어내지 않음) 긴 가로형이라 작게 줄이면 읽히지 않는 곳(HUSS · 앵커사업단)은 이름을 활자로 표기한다.
// 표기는 이력·협업 관계를 밝히는 것이며 후원이나 보증을 뜻하지 않는다.

// r: 로고 가로/세로 비율(크기를 면적 기준으로 맞출 때 쓴다)
export const ORGS = {
  wku: { name: '원광대학교', en: 'Wonkwang University', logo: 'wku', r: 3.95, url: 'https://www.wku.ac.kr/' },
  jbnu: { name: '전북대학교', en: 'Jeonbuk National University', logo: 'jbnu', r: 1.07, url: 'https://www.jbnu.ac.kr/' },
  jbfc: { name: '전북현대모터스FC', en: 'Jeonbuk Hyundai Motors FC', logo: 'jbfc', r: 0.97, url: 'https://hyundai-motorsfc.com/' },
  gist: { name: 'GIST', en: 'Gwangju Institute of Science and Technology', logo: 'gist', r: 7.76, url: 'https://www.gist.ac.kr/' },
  huss: { name: 'HUSS 글로벌 K-컬처 사업단', en: 'GLOBAL K-CULTURE · WKU', mark: 'HUSS', url: 'https://globalk-culture.wku.ac.kr/' },
  camtic: { name: '캠틱종합기술원', en: 'CAMTIC', logo: 'camtic', r: 3.82, url: 'http://www.camtic.co.kr/camtic' },
  jnu: { name: '전남대학교', en: 'Chonnam National University', logo: 'jnu', r: 5.0, url: 'https://www.jnu.ac.kr/' },
  coss: { name: 'COSS 첨단분야 혁신융합대학', en: 'COSS', logo: 'coss', r: 4.47, url: 'https://coss.ac.kr/' },
  ksae: { name: '한국자동차공학회', en: 'KSAE', logo: 'ksae', r: 6.33, url: 'https://www.ksae.org/' },
  ccei: { name: '전북창조경제혁신센터', en: 'CCEI Jeonbuk', logo: 'ccei', r: 4.7, url: 'https://ccei.creativekorea.or.kr/jeonbuk/' },
  anchor: { name: '원광대학교 앵커사업단', en: 'WKU ANCHOR PROJECT', mark: '앵커사업단', url: 'https://rise.wku.ac.kr/' },
  // 공식 로고 파일 없음 — 활자 표기
  jst: { name: 'JST 공유대학', en: 'JST SHARED UNIVERSITY', mark: 'JST' },
  jeonbuk: { name: '전북특별자치도', en: 'JEONBUK STATE', mark: '전북특별자치도' },
  gangneung: { name: '강릉시', en: 'GANGNEUNG CITY', mark: '강릉시' },
  jbsmes: { name: '전북지방중소벤처기업청', en: 'JEONBUK SMEs & STARTUPS', mark: '전북중소벤처기업청' },
  givingplus: { name: '기빙플러스', en: 'GIVING PLUS', mark: '기빙플러스' },
  greenumbrella: { name: '초록우산', en: 'CHILDFUND KOREA', mark: '초록우산' },
  nrf: { name: '한국연구재단', en: 'NATIONAL RESEARCH FOUNDATION', mark: 'NRF' },
  motie: { name: '산업통상자원부', en: 'MINISTRY OF TRADE, INDUSTRY & ENERGY', mark: '산업통상자원부' },
  swu: { name: '원광대 SW중심대학사업단', en: 'SW-CENTERED UNIVERSITY', mark: 'SW중심대학' },
  linc: { name: '원광대 LINC 3.0 사업단', en: 'LINC 3.0', mark: 'LINC 3.0' },
  kunsan: { name: '국립군산대학교 창업지원단', en: 'KUNSAN NATIONAL UNIVERSITY', mark: '국립군산대학교' },
  ris: { name: 'RIS 에너지신산업사업단', en: 'JEONBUK RIS · ENERGY', mark: 'RIS' },
};

// 프로젝트별 관계 — 데이터에 근거가 있는 것만
export const PROJECT_ORGS = {
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
    ['ccei', '모두의창업'],
  ],
  'baekchul-sikhye': [['wku', 'LINC 3.0 창의대첩 대상 · 총장상']],
  'baja-ev-formula': [
    ['wku', '기계공학과 자작차 동아리'],
    ['ksae', '자작차 제작'],
  ],
  'rehab-game': [['swu', '우수상 · 사업단장상']],
  'robot-push-hackathon': [['swu', '최우수상 · 사업단장상']],
};

// 기관 벽: 로고가 있는 곳 먼저, 그다음 활자 표기
export const WALL = ['wku', 'jbnu', 'jbfc', 'gist', 'camtic', 'jnu', 'ksae', 'ccei', 'coss', 'huss', 'anchor', 'jst', 'jeonbuk', 'gangneung', 'jbsmes', 'givingplus', 'nrf', 'motie', 'kunsan', 'ris', 'linc', 'swu', 'greenumbrella'];

// 엔딩 크레딧: 학업·수상·협업 근거가 데이터에 있고 작게 줄여도 읽히는 공식 로고만
export const CREDITS = ['wku', 'jbnu', 'jbfc', 'gist', 'camtic', 'jnu', 'ksae', 'ccei'];

export const orgsOf = (id) => (PROJECT_ORGS[id] || []).map(([k, rel]) => ({ ...ORGS[k], id: k, rel }));
