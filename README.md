# 권용현 — PHYSICAL AI · 3D 인터랙티브 포트폴리오

드론 · 로봇 · 모빌리티 · AI를 하나의 3D 세계에 올리고, **스크롤 페이지가 아니라 한 편의 영화처럼**
장면이 이어지는 포트폴리오입니다. 카메라가 세트 사이를 크레인 숏으로 날아다니며 9개의 장면을 원테이크로 잇고,
엔딩 크레딧과 엔드 카드로 마무리합니다.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 정적 빌드 → dist/
npm run preview   # 빌드 결과 미리보기
```

## 장면 구성 (영화 순서)

| # | 장면 | 3D 연출 | 내용 |
|---|---|---|---|
| 00 | **Opening** | 착륙 패드의 스포트라이트 아래 드론이 시동을 걸고 이륙 | PHYSICAL AI 타이틀, 이름, 한 줄 소개 |
| 01 | **Prologue** | 드론이 카메라를 바라보며 호버링 | 철학 · 3대 핵심 역량 · 학력 |
| 02 | **Aerial Autonomy** | 지오펜스 안에서 웨이포인트 6개를 도는 자율비행 미션 | 드론 자격(1종·교관), Pixhawk 자율비행, ROS 경진대회 |
| 03 | **Ground Mobility** | 로버가 트랙을 달리며 **신호등을 인식해 정지**, 360° LiDAR 점군을 실시간 레이캐스트, AirSim 실험 영상 스크린 | CARLA · AirSim · ROS2 · 자작차 |
| 04 | **Embodied Robotics** | **2-링크 IK 트롯 보행**의 4족보행 로봇, IK로 집어 옮기는 6축 로봇팔과 비전 인식 박스 | 4족보행 로봇 · 로봇팔 · 해커톤 · IoT 링거폴대 |
| 05 | **Machine Intelligence** | 펄스가 흐르는 뉴럴 코어 | HUSS AI 전국 2위 · FACTLINE · YOLO/MoveNet · GAN-TTS |
| 06 | **Sense · Think · Act** | 하늘에서 내려다본 전체 세계, 각 세트와 코어를 잇는 데이터 링크 | 피지컬 AI 스택(인지 → 판단 → 제어 → 제작) |
| 07 | **The Record** | 연도별 수상 37건이 한 장씩 쌓이는 3D 막대 | 대표 수상, 활동 타임라인 |
| 08 | **End Credits** | 드론이 처음의 패드로 돌아와 착륙, 크레인 업 | 엔딩 크레딧 → 연락처 · 다시 보기 |

## 프로젝트 상세 페이지

- **필름 장면**은 텍스트를 줄이고 실제 프로젝트 사진 카드(릴)로 구성했습니다. 카드를 누르면 상세 페이지가 열립니다.
- **`/works`** — 전체 프로젝트 아카이브(사진 중심 그리드, 분야 필터: Drone · Mobility · Robotics · AI · IoT/H·W · Product · Software).
- **`/works/<id>`** — 프로젝트 상세: 전면 사진 히어로 → 요약·역할·기간·도구·수상 → 사진과 짝지은 짧은 스토리(문제 → 제작 → 검증 → 결과) → 갤러리(확대 보기) → 영상 → 원문 링크 → 다음 프로젝트.
- 주소가 실제로 바뀌므로 링크 공유·새로고침·뒤로 가기가 동작합니다(Vercel `rewrites`).

### 콘텐츠 갱신

프로젝트 내용과 사진은 노션 포트폴리오와 [yhkwon2004/portfoli](https://github.com/yhkwon2004/portfoli) 기록에서 수집해 근거가 있는 내용만 남겼습니다.

| 파일 | 역할 |
|---|---|
| `src/data/projects.json` | 프로젝트 상세 데이터(제목, 한 줄 소개, 역할, 도구, 수상, 스토리, 이미지 캡션, 링크) |
| `public/media/projects/<id>/` | 프로젝트 사진(WebP 원본 1600px + 썸네일 720px) |
| `scripts/harvest.py` | 노션 서명 URL·로컬 파일 → EXIF 회전 보정, 중복 제거, WebP 변환 |
| `scripts/contact_sheet.py` | 사진 검토용 밀착 인화지 생성 |
| `scripts/build-projects.mjs` | 수집 결과를 `projects.json`으로 정리하고 누락 파일 검사 |

## 조작

- **휠 · 스와이프 · ← →** 다음/이전 장면 — 패널 안에서 스크롤할 내용이 남아 있으면 스크롤이 먼저입니다.
- **AUTO** 영화처럼 자동 재생(기본값). 패널 위에 마우스를 올리면 잠시 멈춥니다. `P` 키로 전환.
- **INDEX** 장면 바로가기(`I`), **SOUND** 합성 앰비언트 사운드(`M`), `Home`/`End`.
- 3D 오브젝트에 마우스를 올리면 정보가 뜨고, **클릭하면 반응**합니다(드론 플립, 로봇 점프, 로봇팔 손 흔들기, 뉴럴 코어 활성화, 로버 비상등).
- 드래그로 카메라를 살짝 돌려볼 수 있습니다.

## 구조

| 경로 | 역할 |
|---|---|
| `src/content.js` | 필름 장면 문구, 장면별 프로젝트 순서, 수상 하이라이트, 연락처 |
| `src/pages/site.js` | `/works` 아카이브 · 상세 페이지 · 라우팅 · 커튼 전환 |
| `src/director.js` | 장면별 카메라 숏, 세트 간 크레인 이동, 배우(드론·로봇)의 연기 |
| `src/core/stage.js` | 렌더러, 블룸 + 필름 패스(색수차 · 전환 줌블러 · 비네팅 · 그레인), 하늘, 격자 바닥 |
| `src/actors/` | 절차적으로 모델링한 드론, 로버 + LiDAR, 4족보행 로봇, 로봇팔, 뉴럴 코어, 수상 막대 |
| `src/ui/` | 장면 패널 연출(GSAP), HUD 타임라인 · 타임코드, 입력, 라이트박스 |
| `public/media/` | 실제 프로젝트 사진과 AirSim 실험 영상 |

모든 3D 모델은 외부 에셋 없이 Three.js 기본 도형으로 만들었습니다. 장면 문구를 바꾸려면 `content.js`만 수정하면 됩니다.

## 접근성 · 성능

- `prefers-reduced-motion`이면 크레인 이동 대신 암전 컷, 자동 재생 꺼짐.
- WebGL이 없으면 정적 배경 위에서 같은 장면 진행과 콘텐츠를 제공합니다.
- 프레임이 떨어지면 해상도 → 블룸 순으로 화질을 자동으로 낮춥니다.
- 키보드만으로 모든 장면 · 링크 · 라이트박스를 조작할 수 있습니다.

## 배포

Vercel에서 Vite 프로젝트로 자동 인식됩니다(`vercel.json` 포함). 저장소를 연결하면 푸시마다 배포됩니다.

## 출처

- 콘텐츠: [2026 Notion 포트폴리오](https://befitting-paper-753.notion.site/2026-1-3f3faf73802f80c7acf6f7c83e9c26e2), [yhkwon2004/portfoli](https://github.com/yhkwon2004/portfoli)의 기록 데이터와 사진
- 라이브러리: Three.js (MIT), GSAP, Vite · 서체: Space Grotesk, JetBrains Mono, Pretendard (OFL)
