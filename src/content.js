// 포트폴리오 콘텐츠 — 출처: 2026 Notion 포트폴리오, yhkwon2004/portfoli 기록 데이터.
// 장면(scene) 순서가 곧 영화의 순서입니다. 3D 연출은 director.js의 SHOTS가 같은 id로 대응합니다.

import projectData from './data/projects.json';
import awardData from './data/awards.json';

const M = (file) => `/media/${file}`;

// 크레딧의 수상 줄: 수상 아카이브(awards.js의 tierOf)와 같은 기준으로 센다
function awardLine() {
  const tier = (g) => (/대상/.test(g) ? 1 : /최우수/.test(g) ? 2 : /우수상/.test(g) ? 3 : /장려/.test(g) ? 4 : 5);
  const n = (t) => awardData.filter((a) => tier(a.grade) === t).length;
  const other = n(5) ? ` · 그 밖의 수상 ${n(5)}` : '';
  return `수상 ${awardData.length}회 — 대상 ${n(1)} · 최우수상 ${n(2)} · 우수상 ${n(3)} · 장려상 ${n(4)}${other}`;
}

export const profile = {
  name: '권용현',
  en: 'Yonghyun Kwon',
  role: 'Physical AI Developer',
  roleKo: 'AI·소프트웨어·하드웨어를 연결해 현장 문제를 푸는 개발자',
  motto: '제약을 이해하고, 작은 실험으로 해법을 검증합니다.',
  email: 'yhkwon2004@gmail.com',
  links: [
    { label: 'Email', value: 'yhkwon2004@gmail.com', url: 'mailto:yhkwon2004@gmail.com' },
    { label: 'GitHub', value: 'yhkwon2004', url: 'https://github.com/yhkwon2004' },
    { label: 'Notion', value: '2026 Portfolio', url: 'https://befitting-paper-753.notion.site/2026-1-3f3faf73802f80c7acf6f7c83e9c26e2' },
    { label: 'Instagram', value: '@starring.moon', url: 'https://www.instagram.com/starring.moon/' },
    { label: 'Blog', value: 'naver/procmd', url: 'https://blog.naver.com/procmd' },
  ],
};

export const scenes = [
  {
    id: 'intro',
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
    code: 'PROLOGUE',
    label: 'Prologue',
    layout: 'stage',
    hold: 9,
    kicker: 'PROLOGUE — WHO BUILDS THE MACHINE',
    title: ['제약을 이해하고, 작은 실험으로', '해법을 검증합니다.'],
    titleKo: true,
    lead: '현장의 제약을 문제로 정의하고, AI·소프트웨어·하드웨어를 연결해 작동하는 해결책으로 만듭니다.',
    pillars: [
      { no: '01', title: 'AI · 알고리즘 · 데이터', text: '비전 · LLM · 시뮬레이션' },
      { no: '02', title: '임베디드 · 제어 · 모빌리티', text: 'PCB · ESP32 · 드론 · 차량 · 로봇' },
      { no: '03', title: '기획 · 제작 · 검증', text: '프로토타입부터 사업화까지' },
    ],
    timeline: [
      ['2018', '무인멀티콥터 1종'],
      ['2023', 'LLM 연구실 · GAN-TTS'],
      ['2024', '드론 교관 · 자작차 · 모빌리티 복수전공'],
      ['2025', 'Re:cap 대표 · 전남대 인턴십 우수(1위)'],
      ['2026', 'IoT 연구실 · 4족보행 로봇'],
    ],
  },
  {
    id: 'aerial',
    code: 'AERIAL',
    label: 'Aerial Autonomy',
    layout: 'reel',
    hold: 11,
    category: 'drone',
    kicker: 'AERIAL AUTONOMY — 드론',
    title: ['AERIAL', 'AUTONOMY'],
    subtitle: '조종에서 교육, 그리고 자율비행까지',
    stats: [
      { value: '2018', label: '멀티콥터 1종' },
      { value: '2024', label: '지도조종자(교관)' },
    ],
    projects: ['pixhawk-drone', 'drone-soccer'],
  },
  {
    id: 'ground',
    code: 'GROUND',
    label: 'Ground Mobility',
    layout: 'reel',
    hold: 12,
    category: 'mobility',
    kicker: 'GROUND MOBILITY — 자율주행 · 차량',
    title: ['GROUND', 'MOBILITY'],
    subtitle: '시뮬레이터에서 배우고, 실차에서 검증한다',
    projects: ['airsim-driving', 'av-competition', 'ros2-nav2', 'baja-ev-formula', 'manual-ev', 'ev-medical'],
  },
  {
    id: 'robotics',
    code: 'ROBOTICS',
    label: 'Embodied Robotics',
    layout: 'reel',
    hold: 11,
    category: 'robotics',
    kicker: 'EMBODIED ROBOTICS — 로봇 · 임베디드',
    title: ['EMBODIED', 'ROBOTICS'],
    subtitle: '몸을 가진 지능을 설계한다',
    projects: ['quadruped-robot', 'robot-push-hackathon', 'iot-iv-pole', 'pressure-clicker'],
  },
  {
    id: 'intelligence',
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
    projects: ['huss-evidence-ai', 'legal-ai-platform', 'factline', 'worker-posture-ios', 'gan-tts', 'ai-detector'],
  },
  {
    id: 'loop',
    code: 'LOOP',
    label: 'Sense · Think · Act',
    layout: 'loop',
    hold: 12,
    kicker: 'THE LOOP — PHYSICAL AI STACK',
    title: ['SENSE.', 'THINK.', 'ACT.'],
    lead: '센서가 읽고, 모델이 판단하고, 기계가 움직이고, 다시 만듭니다 — 드론과 차량에서 닫아 온 이 루프를 이제 로봇으로 넓힙니다.',
    loop: [
      { key: 'SENSE', ko: '인지', items: ['Camera · Vision', 'LiDAR · GPS · IMU', '압력 · 가스 · 온도 센서', 'ADC 수액 감지'] },
      { key: 'THINK', ko: '판단', items: ['YOLO · MoveNet', 'End-to-End Driving', 'Nav2 Path Planning', 'LLM · Generative AI'] },
      { key: 'ACT', ko: '제어', items: ['Pixhawk Flight Control', 'ESP32 · Arduino F/W', 'Servo · Motor', 'Steering · Brake'] },
      { key: 'BUILD', ko: '제작', items: ['Altium PCB', 'Fusion 360 · Inventor · CATIA', '3D Printing', '선반 · 밀링 · 용접'] },
    ],
    tools: ['Python', 'C#', 'Java', 'Swift', 'TypeScript', 'ROS · ROS2', 'Gazebo', 'CARLA', 'AirSim', 'Unreal Engine', 'Linux', 'AWS'],
  },
  {
    id: 'record',
    code: 'RECORD',
    label: 'The Record',
    layout: 'stage',
    hold: 12,
    kicker: 'THE RECORD — 수상 · 기록',
    title: ['THE', 'RECORD'],
    counters: [
      { value: awardData.length, label: '수상 기록' }, // 수상 아카이브(/awards)와 같은 수
      { value: projectData.length, label: '프로젝트' }, // 아카이브(/works)와 같은 수
      { value: 9, label: '자격증' },
      { value: 9, label: '공식 보도' },
    ],
    // 프로젝트와 이어진 수상을 상장과 함께 릴로 보여 준다(awards.js의 AWARD_REEL)
    awardReel: true,
  },
  {
    id: 'finale',
    code: 'CREDITS',
    label: 'End Credits',
    layout: 'finale',
    hold: 0,
    kicker: 'END CREDITS',
    // [역할, 이름] — '§'는 구획 제목, 이름이 null이면 기관 로고 줄
    credits: [
      ['Written, Directed & Engineered by', '권용현 · Yonghyun Kwon'],
      ['§', 'Featuring'],
      ['Aerial', 'Pixhawk 자율비행 드론 · 드론 축구'],
      ['Ground', 'AirSim 딥러닝 자율주행 · CARLA 엔드투엔드 · 자작차 BAJA·EV·Formula'],
      ['Robotics', '4족보행 로봇 · 비전 기반 로봇팔 · 스마트 IoT 링거폴대'],
      ['Intelligence', '학교폭력 증거 전처리 AI · 리걸 AI 정리 플랫폼 · 작업자 자세감지 iOS 앱'],
      ['§', 'Technical Units'],
      ['Flight', 'Pixhawk · Mission Planner · ROS · 멀티콥터 1종 · 드론 교관'],
      ['Driving', 'AirSim · CARLA · ROS2 Nav2 · Gazebo · Unreal Engine'],
      ['Hardware', 'ESP32 · Arduino · Altium PCB · Fusion 360 · 3D Printing'],
      ['Vision & AI', 'YOLO · MoveNet · LLM · GAN-TTS · Swift'],
      ['§', 'The Record'],
      ['Awards', awardLine()],
      ['Certifications & Press', '자격증 9 · 공식 보도 9'],
      ['§', 'Education & Crew'],
      ['Education', '원광대학교 컴퓨터소프트웨어공학과 · JST 공유대학 스마트모빌리티 SW공학과'],
      ['Labs', '인공지능 LLM 연구실 · 지능형 IoT 연구실'],
      ['Crew', '메카니즘 · Re:cap · 인퓨테크 · Re:Switch · HIT · 늘솔길 · 프론티어 · de:caffeine · 고단수'],
      ['Schools · Awarding bodies · Partners', null],
      ['On Location', '익산 · 전주 · 강릉 · 경주 · 치앙마이'],
      ['Special Thanks', '함께 만든 팀원들 · 지도해 주신 교수님들 · 끝까지 봐 주신 당신'],
      ['Built with', 'Three.js · GSAP · Web Audio · Vite — on Vercel'],
    ],
    end: ['다음 장면은,', '함께 만들 차례입니다.'],
    endEn: 'The next scene is yours.',
  },
];
