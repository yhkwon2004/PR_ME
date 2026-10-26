// 경진대회 안내서(2026-1 포트폴리오 경진대회)가 요구하는 CarHub(원광대 진로 포털) 기록 — 본인만 알 수 있는 내용이라 비워 두었다.
// 값을 채우면 발표 자료(/present)의 그 자리에 바로 나온다. 비어 있으면 '입력 예정' 자리로 보인다(지어내지 않는다).
// 캡처 이미지는 public/media/carhub/ 에 넣고 경로를 적는다 — 예: '/media/carhub/job.webp'
// ★는 안내서에서 반드시 넣으라고 한 자료
export const CARHUB = {
  // STEP1 자기이해 — CarHub 검사 결과(고1~4 중 3개 이상 실시)
  interest: '', // 직업흥미 — 예: '탐구형(I) · 실재형(R)'
  values: '', // 직업가치관
  aptitude: '', // 직업적성
  mbti: '', // MBTI
  resultShot: '', // 검사 결과 화면 캡처
  // STEP2 직업탐색
  jobShot: '', // ★ 추천직업이 희망직업으로 바뀐 화면 캡처
  roleModel: null, // 롤모델 — { name: '', why: '' }
  // STEP3 진로계획 및 비교과 설계
  courseShot: '', // ★ 비교과 이수 내역 캡처(이력관리 → 포트폴리오 → 비교과 이수 내역)
  won: [], // ★ 졸업 전 WON+ 비교과 프로그램 — 학년마다 하나 이상: { when: '4학년 1학기', name: '' }
  language: '', // 외국어 계획
  // STEP4 미래설계
  vision10: '', // 10년 후 나의 모습
  vision30: '', // 30년 후 나의 모습
};
