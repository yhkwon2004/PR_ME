// 보유 스킬 — 숙련도 점수를 매기지 않고 근거를 센다.
// 기술마다 그 기술이 적힌 프로젝트(projects.json의 도구 · 역할 · 요약 · 스토리)와, 그 프로젝트들이 받은 상을 잇는다.
// 프로젝트로 묶이지 않은 상(awards.json)은 yhkwon2004/portfoli의 수상 설명에 그 기술이 적힌 것만 직접 잇는다.
// note: 2026 Notion 포트폴리오의 Skills 표에 본인이 적은 설명. 자격증: 같은 포트폴리오의 Certifications(이름 · 취득 연도 그대로).
import { projects } from './projects.js';
import { AWARDS, awardsOf } from './awards.js';

// 분야 — 필름의 장면 순서(하늘 → 땅 → 로봇 → 지능 → 제작 → 출시)를 따른다
export const DOMAINS = [
  { id: 'aerial', code: 'AERIAL', label: 'Drone & Flight', ko: '드론 · 비행', cat: 'mobility', lead: '조종에서 교육, 그리고 자율비행까지' },
  { id: 'ground', code: 'GROUND', label: 'Autonomous Driving', ko: '자율주행 · 모빌리티', cat: 'mobility', lead: '시뮬레이터에서 배우고, 실차에서 검증한다' },
  { id: 'robotics', code: 'ROBOTICS', label: 'Robotics', ko: '로봇 · 제어', cat: 'robotics', lead: '기구 · 모터 · 제어 — 매니퓰레이터와 보행 로봇으로 넓히는 중' },
  { id: 'ai', code: 'INTELLIGENCE', label: 'AI · Vision · LLM', ko: 'AI · 비전 · 데이터', cat: 'ai', lead: '보고, 이해하고, 정리하는 지능' },
  { id: 'embedded', code: 'EMBEDDED', label: 'Embedded · PCB · IoT', ko: '임베디드 · 회로 · IoT', cat: 'iot', lead: '센서에서 보드, 펌웨어, 앱까지 한 흐름으로' },
  { id: 'fab', code: 'FABRICATION', label: 'CAD · Fabrication', ko: '3D 설계 · 제작', cat: 'robotics', lead: '도면에서 출력 · 가공 · 조립까지 직접' },
  { id: 'software', code: 'SOFTWARE', label: 'Software & Cloud', ko: '웹 · 앱 · 서버', cat: 'software', lead: '웹 · 앱 · 데이터베이스 · 클라우드로 서비스를 만든다' },
  { id: 'product', code: 'PRODUCT', label: 'Product · Startup', ko: '기획 · 창업', cat: 'product', lead: '아이디어를 제품과 서비스로 — 만들고, 알리고, 운영한다' },
];

// 자격증 — 2026 Notion 포트폴리오 Certifications(연도가 적혀 있지 않은 것은 비워 둔다)
export const CERTS = [
  { id: 'drone-1', name: '초경량 무인 멀티콥터 조종자격 1종', year: '2018', domain: 'aerial' },
  { id: 'ecommerce', name: '글로벌 이커머스 전문가 자격', year: '2023', domain: 'product' },
  { id: 'drone-inst', name: '초경량 무인멀티콥터 지도조종자(교관)', year: '2024', domain: 'aerial' },
  { id: 'itq', name: '컴퓨터활용능력 1급', year: '2024', domain: 'product' },
  { id: 'aipot', name: 'AI-POT 2급', year: '2025', domain: 'ai' },
  { id: '3dp', name: '3D Printer User (Inventor 3D)', year: '2025', domain: 'fab' },
  { id: 'acct', name: '회계관리 2급', year: '2026', domain: 'product' },
  { id: 'adsp', name: 'ADsP 데이터분석준전문가', year: '', domain: 'ai' },
  { id: 'sqld', name: 'SQLD', year: '', domain: 'software' },
];

// 수상 기록에서 대회 이름으로 찾는다(프로젝트로 묶이지 않은 상)
const award = (word) => AWARDS.find((a) => a.contest.includes(word));

// 기술 목록
// re: 프로젝트 기록에서 찾을 표현 · not: 표현은 맞지만 그 기술이 아닌 프로젝트
// awards: 프로젝트 밖의 상(대회 이름 일부) · certs: 이어지는 자격증 · state: 'explore'면 탐구 중(초기 단계 · 검토 단계)
const RAW = [
  // ── 드론 · 비행 ──
  { d: 'aerial', name: '멀티콥터 조종', en: 'Multicopter Piloting', re: /멀티콥터|기체 조종|기체 조작/, certs: ['drone-1'] },
  { d: 'aerial', name: '드론 교육 · 교관', en: 'Flight Instruction', re: null, certs: ['drone-inst'], note: '초경량 무인 멀티콥터 지도조종자 — 교육 교관 활동(2024 ~ 2025)' },
  { d: 'aerial', name: 'Pixhawk 비행제어', en: 'Pixhawk', re: /Pixhawk/ },
  { d: 'aerial', name: 'Mission Planner 경로 계획', en: 'Mission Planner', re: /Mission Planner/ },
  { d: 'aerial', name: '드론 촬영 · 영상', en: 'Aerial Filming', re: null, awards: ['영상공모전'], note: '드론 촬영 기법과 영상 편집으로 학교 홍보 영상을 제작' },

  // ── 자율주행 · 모빌리티 ──
  { d: 'ground', name: 'ROS · ROS2', en: 'ROS 2', re: /ROS ?2|\bROS\b/, note: 'Gazebo · RViz 활용 자율주행 시뮬레이터 제작 및 알고리즘 구현' },
  { d: 'ground', name: 'Nav2 웨이포인트 주행', en: 'Nav2', re: /Nav2/ },
  { d: 'ground', name: 'Gazebo · RViz', en: 'Simulation', re: /Gazebo|RViz/ },
  { d: 'ground', name: 'CARLA', en: 'CARLA', re: /CARLA/ },
  { d: 'ground', name: 'AirSim', en: 'AirSim', re: /AirSim/ },
  { d: 'ground', name: 'End-to-End 주행 학습', en: 'End-to-End Driving', re: /End-to-End|엔드투엔드|딥러닝 자율주행|딥러닝을 학습/ },
  { d: 'ground', name: 'LiDAR 매핑', en: 'LiDAR', re: /LiDAR/ },
  { d: 'ground', name: '조향 · 주행 로직', en: 'Steering Logic', re: /조향/, awards: ['Adventure Design'] },
  { d: 'ground', name: '차량 제작 · 개조', en: 'Vehicle Build', re: /BAJA|탑승|차량 플랫폼으로 개조|유아용 자동차를 분해/, awards: ['에듀카트'] },
  { d: 'ground', name: 'Unreal Engine', en: 'Unreal', re: /Unreal|언리얼/ },
  { d: 'ground', name: 'PID · Pure Pursuit 제어', en: 'Control', re: /PID 제어|Pure Pursuit/, not: ['quadruped-robot'] },

  // ── 로봇 · 제어 ──
  { d: 'robotics', name: '서보 · 모터 제어', en: 'Motor Control', re: /서보모터|모터 제어|모터·전원|모터와/ },
  { d: 'robotics', name: '리프팅 · 클램핑 기구', en: 'Mechanism', re: /리프팅|클램핑/ },
  { d: 'robotics', name: '조작 인터페이스 (앱)', en: 'Control App', re: /앱 기반 조작|조작 앱/ },
  { d: 'robotics', name: '4족 보행', en: 'Quadruped', re: /4족/, state: 'explore' },
  { d: 'robotics', name: '로봇팔 · 매니퓰레이터', en: 'Manipulator', re: /로봇팔/, state: 'explore' },
  { d: 'robotics', name: '휴머노이드', en: 'Humanoid', re: null, state: 'explore', note: '다음 탐구 분야 — 아직 기록된 프로젝트는 없습니다' },

  // ── AI · 비전 · 데이터 ──
  { d: 'ai', name: 'Python', en: 'Python', re: /Python|pymysql/, note: '인공지능 · 객체탐지 · 자율주행 소프트웨어 제작' },
  { d: 'ai', name: 'YOLO 객체 탐지', en: 'YOLO', re: /YOLO/ },
  { d: 'ai', name: '포즈 · 관절 추정', en: 'Pose Estimation', re: /MoveNet|키포인트/ },
  { d: 'ai', name: '인스턴스 세그멘테이션', en: 'Segmentation', re: /Segmentation|세그멘테이션/ },
  { d: 'ai', name: '딥러닝 (Keras · PyTorch)', en: 'Deep Learning', re: /Keras|PyTorch|TensorFlow|딥러닝|전이 학습/ },
  { d: 'ai', name: 'LLM · 자연어 처리', en: 'LLM · NLP', re: /LLM|NLP|형태소|AI SDK/ },
  { d: 'ai', name: '음성 합성 (GAN-TTS)', en: 'TTS', re: /TTS/ },
  { d: 'ai', name: '이미지 포렌식', en: 'Image Forensics', re: /PRNU|ELA·DCT|\bELA\b/ },
  { d: 'ai', name: '머신러닝 (RandomForest)', en: 'Machine Learning', re: /RandomForest|SGDClassifier/ },
  { d: 'ai', name: '온디바이스 AI (Core ML)', en: 'Core ML', re: /Core ML/ },
  { d: 'ai', name: '데이터 분석 · 시각화', en: 'Data Analysis', re: /기술통계|상관관계|Pandas|Plotly|시각화/, not: ['ros2-nav2'], certs: ['adsp'] },
  { d: 'ai', name: '공공데이터 활용', en: 'Public Data', re: /공공데이터|KOSIS/ },

  // ── 임베디드 · 회로 · IoT ──
  { d: 'embedded', name: 'ESP32', en: 'ESP32', re: /ESP32/ },
  { d: 'embedded', name: 'Arduino', en: 'Arduino', re: /Arduino|아두이노/, awards: ['에듀카트'] },
  { d: 'embedded', name: 'PCB 설계 (Altium)', en: 'Altium PCB', re: /Altium|PCB/, note: 'MCU를 활용한 회로 설계와 센서를 활용한 SW/HW 연계' },
  { d: 'embedded', name: '회로 설계 · 배선', en: 'Circuit', re: /회로/ },
  { d: 'embedded', name: '센서 · ADC', en: 'Sensors', re: /센서|ADC/, awards: ['2023 호남제주권 제품 제작'] },
  { d: 'embedded', name: '펌웨어 · 디버깅', en: 'Firmware', re: /펌웨어/ },
  { d: 'embedded', name: 'IoT 서비스 (MQTT)', en: 'IoT', re: /MQTT|IoT/ },
  { d: 'embedded', name: '열전 · 발열 소자', en: 'Peltier · PTC', re: /펠티어|PTC/ },
  { d: 'embedded', name: 'C / C++', en: 'C / C++', re: null, note: 'ESP32 등 보드 제어 · 영상처리 · 모터제어 · 알고리즘' },

  // ── 3D 설계 · 제작 ──
  { d: 'fab', name: '3D CAD 설계', en: '3D CAD', re: /3D 설계|3D CAD|3D로 모델링|모델링하고|CAD 도면|CAD 설계/ },
  { d: 'fab', name: '3D 프린팅', en: '3D Printing', re: /3D ?프린/, not: ['givingplus-filament'], certs: ['3dp'] },
  { d: 'fab', name: 'Fusion 360', en: 'Fusion 360', re: /Fusion 360/ },
  { d: 'fab', name: 'Inventor', en: 'Inventor', re: /Inventor/, certs: ['3dp'] },
  { d: 'fab', name: 'CATIA', en: 'CATIA', re: /CATIA/ },
  { d: 'fab', name: '하우징 설계', en: 'Housing', re: /하우징/ },
  { d: 'fab', name: '기계 가공 · 용접', en: 'Machining', re: /선반|밀링|용접/ },
  { d: 'fab', name: '소재 재가공 (필라멘트)', en: 'Material', re: /필라멘트로 가공|분쇄·건조/ },

  // ── 웹 · 앱 · 서버 ──
  { d: 'software', name: 'TypeScript', en: 'TypeScript', re: /TypeScript/, note: '앱 개발 · 백엔드 · 프론트 · 데이터베이스 · API 연동' },
  { d: 'software', name: 'Next.js · React', en: 'Next.js', re: /Next\.js|React/ },
  { d: 'software', name: 'Supabase · PostgreSQL', en: 'Supabase', re: /Supabase|PostgreSQL|Prisma/ },
  { d: 'software', name: 'SQL 데이터베이스', en: 'SQL', re: /SQLite|MariaDB|PostgreSQL/, certs: ['sqld'] },
  { d: 'software', name: 'FastAPI · 서버', en: 'FastAPI', re: /FastAPI|소켓 서버/ },
  { d: 'software', name: 'Java', en: 'Java', re: /\bJava\b(?!Script)/ },
  { d: 'software', name: 'C# · Unity', en: 'C# · Unity', re: /C#|Unity/, note: 'VR 기기 활용 프로그램 · Unity FPS 게임 제작' },
  { d: 'software', name: 'Swift (iOS)', en: 'Swift', re: /Swift\b/ },
  { d: 'software', name: 'Android · Flutter', en: 'Mobile App', re: /Android|안드로이드|Flutter/ },
  { d: 'software', name: 'Streamlit 대시보드', en: 'Streamlit', re: /Streamlit/ },
  { d: 'software', name: '크롤링 · ETL', en: 'Crawling', re: /크롤링|Selenium|BeautifulSoup/ },
  { d: 'software', name: 'AWS · 챗봇', en: 'AWS', re: /AWS|Slack Bot/ },
  { d: 'software', name: 'Linux · GPU 환경', en: 'Linux', re: /Linux|WSL|CUDA/ },
  { d: 'software', name: 'Git · GitHub 협업', en: 'Git', re: /GitHub/ },

  // ── 기획 · 창업 ──
  { d: 'product', name: '현장 조사 · 인터뷰', en: 'User Research', re: /인터뷰|현장 조사|설문/ },
  { d: 'product', name: '시제품 제작', en: 'Prototyping', re: /시제품/ },
  { d: 'product', name: '업사이클 사업화', en: 'Upcycling', re: /업사이클|폐키보드|폐플라스틱/ },
  { d: 'product', name: '팀 리드 · 협업 조율', en: 'Team Lead', re: /팀장|모임을 직접 주선/ },
  { d: 'product', name: '사업 모델 설계', en: 'Business Model', re: /B2B|B2C|크라우드펀딩/, awards: ['PSST', '실전 SW창업', '내 돈예산', '기업분석'] },
  { d: 'product', name: 'UI/UX · Figma', en: 'UI/UX', re: /UI\/UX/, note: 'UI/UX 디자인 · 프로토타입 · 웹사이트 디자인 · 협업 프로젝트 관리' },
  { d: 'product', name: '이커머스 · 시장 분석', en: 'E-commerce', re: null, certs: ['ecommerce'], awards: ['실전 SW창업'] },
  { d: 'product', name: '회계 관리', en: 'Accounting', re: /회계/, certs: ['acct'] },
  { d: 'product', name: '발표 · 글쓰기', en: 'Communication', re: /세미나 발표/, awards: ['모의면접', '나의 성장 이야기', '학습공모전', '홀림'] },
  { d: 'product', name: 'Excel · PowerPoint · Notion', en: 'Office', re: null, certs: ['itq'], awards: ['Triangle+'], note: '데이터 분석 · 시각화 · 매크로(VBA) 기초 · 프레젠테이션 · 문서화' },
];

// 프로젝트에서 찾을 글: 도구 · 역할 · 한 줄 · 요약 · 스토리
const textOf = (p) => [p.tools.join(' · '), p.role.join(' · '), p.oneLiner, p.summary, ...p.story.map((s) => `${s.title} ${s.text}`)].join('\n');
const TEXT = new Map(projects.map((p) => [p.id, textOf(p)]));

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');

export const SKILLS = RAW.map((s) => {
  // re가 없으면 프로젝트 근거 없이 자격증 · 수상 · 본인 기록만
  const list = s.re ? projects.filter((p) => !s.not?.includes(p.id) && s.re.test(TEXT.get(p.id))) : [];
  // 도구 칸에 그대로 적힌 이름(근거 줄에 함께 보인다)
  const evidence = list.map((p) => ({ project: p, tools: p.tools.filter((t) => s.re.test(t)) }));
  const direct = (s.awards || []).map(award).filter(Boolean);
  const awards = [...new Set([...list.flatMap((p) => awardsOf(p.id)), ...direct])];
  return {
    id: slug(`${s.d}-${s.en}`),
    domain: s.d,
    name: s.name,
    en: s.en,
    note: s.note || '',
    state: s.state || '',
    certs: (s.certs || []).map((c) => CERTS.find((x) => x.id === c)).filter(Boolean),
    evidence,
    direct,
    awards,
  };
});

// 분야별 묶음: 근거가 많은 기술부터(같으면 수상 수), 탐구 중인 기술은 끝에
const weight = (s) => s.evidence.length * 10 + s.awards.length + s.certs.length * 5;
export const DOMAIN_SKILLS = DOMAINS.map((d) => {
  const skills = SKILLS.filter((s) => s.domain === d.id).sort((a, b) => (a.state === 'explore') - (b.state === 'explore') || weight(b) - weight(a));
  const ids = new Set(skills.flatMap((s) => s.evidence.map((e) => e.project.id)));
  // 프로젝트는 아카이브 순서(분야 → 최신) 그대로
  const list = projects.filter((p) => ids.has(p.id));
  const awards = new Set(skills.flatMap((s) => s.awards));
  const certs = CERTS.filter((c) => c.domain === d.id);
  return { ...d, skills, projects: list, awards: awards.size, certs };
});

// 이력서용 기술 스택 — 다룰 수 있는 언어 · 툴을 분야별 한 줄로(이름은 위 기술 목록 그대로, 근거 수는 SKILLS에서 센다)
const STACK_DEFS = [
  { id: 'lang', ko: '언어', en: 'Languages', of: ['Python', 'C / C++', 'Java', 'TypeScript', 'C# · Unity', 'Swift', 'SQL'] },
  { id: 'ai', ko: 'AI · 데이터', en: 'AI · Data', of: ['Deep Learning', 'YOLO', 'LLM · NLP', 'Pose Estimation', 'Segmentation', 'Data Analysis'] },
  { id: 'hw', ko: '임베디드 · 회로', en: 'Embedded', of: ['ESP32', 'Arduino', 'Altium PCB', 'Sensors', 'Firmware', 'IoT'] },
  { id: 'robot', ko: '로봇 · 자율주행 · 드론', en: 'Robotics', of: ['ROS 2', 'Nav2', 'Simulation', 'CARLA', 'AirSim', 'Pixhawk', 'Mission Planner'] },
  { id: 'web', ko: '웹 · 앱 · 서버', en: 'Web · App', of: ['Next.js', 'Supabase', 'FastAPI', 'Mobile App', 'Streamlit', 'AWS', 'Linux', 'Git'] },
  { id: 'cad', ko: '설계 · 제작 툴', en: 'CAD · Tools', of: ['Fusion 360', 'Inventor', 'CATIA', '3D Printing', 'UI/UX', 'Office'] },
];
export const STACK = STACK_DEFS.map((g) => ({ ...g, items: g.of.map((en) => SKILLS.find((s) => s.en === en)).filter(Boolean) }));

export const skillsOf = (id) => SKILLS.filter((s) => s.evidence.some((e) => e.project.id === id));
export const SKILL_COUNT = SKILLS.length;
// 근거 프로젝트가 하나라도 있는 기술 수
export const PROVEN_COUNT = SKILLS.filter((s) => s.evidence.length).length;
