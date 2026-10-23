// 성능 단계 — 저사양 기기에서도 버벅이지 않게.
// 1) 시작할 때 기기(화면 · 메모리 · 코어 · GPU 이름 · 데이터 절약)를 보고 시작 단계를 정하고
// 2) 실제로 그려지는 프레임을 1초마다 재서, 2초 연속 느리면 한 단계 내리고 8초 연속 넉넉하면 시작 단계까지 다시 올린다.
// 단계가 바뀌면 3D(해상도 · 안티에일리어싱 · 블룸 · 먼지 · 3D 프레임 수)와 화면 효과(<html data-q>, q-lite · q-low)가 함께 바뀐다.
// 주소에 ?q=0~4를 붙이면 그 단계로 고정한다(확인용).

// 0 최고 · 1 높음 · 2 보통(휴대폰 기본) · 3 낮음 · 4 최소
export const LEVELS = [
  { name: 'ultra', dpr: 1.75, samples: 4, bloom: 1, dust: 1, fps: 60 },
  { name: 'high', dpr: 1.5, samples: 2, bloom: 0.8, dust: 1, fps: 60 },
  { name: 'medium', dpr: 1.25, samples: 2, bloom: 0.6, dust: 0.6, fps: 60 },
  { name: 'low', dpr: 1, samples: 0, bloom: 0, dust: 0.35, fps: 60 },
  { name: 'min', dpr: 0.8, samples: 0, bloom: 0, dust: 0, fps: 30 },
];
const TOP = LEVELS.length - 1;

// 느린 편으로 알려진 내장 · 보급형 GPU, 소프트웨어 렌더러
const WEAK_GPU = /Intel\(R\) (HD|UHD) Graphics|Intel HD|Mali-(4\d\d|T\d|G3\d|G5[0-2])|Adreno \(TM\) [3-5]\d\d|Adreno [3-5]\d\d|PowerVR|Apple A(8|9|10)\b/i;
const SOFT_GPU = /SwiftShader|llvmpipe|softpipe|Software|Microsoft Basic Render/i;

function gpuName(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  } catch {
    return '';
  }
}

// 시작 단계: 모르는 값(0)은 따지지 않는다
export function detectLevel(gl) {
  const forced = new URLSearchParams(location.search).get('q');
  if (forced !== null && /^[0-4]$/.test(forced)) return { level: +forced, forced: true, gpu: gpuName(gl) };
  const phone = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  const mem = navigator.deviceMemory || 0;
  const cores = navigator.hardwareConcurrency || 0;
  const gpu = gpuName(gl);
  let lv = phone ? 2 : 0;
  if (!phone && ((cores && cores <= 4) || (mem && mem <= 4))) lv = 1;
  if (WEAK_GPU.test(gpu)) lv += 1;
  if ((mem && mem <= 2) || (cores && cores <= 2)) lv += 1;
  if (navigator.connection?.saveData) lv += 1;
  // 아주 큰 화면(4K 등)은 그려야 할 화소가 많다
  if (!phone && screen.width * screen.height * Math.min(2, devicePixelRatio || 1) > 5.5e6) lv += 1;
  if (SOFT_GPU.test(gpu)) lv = TOP;
  return { level: Math.min(TOP, lv), forced: false, gpu };
}

export function createPerf(gl, { onChange } = {}) {
  const found = detectLevel(gl);
  const start = found.level; // 이보다 높이 올리지는 않는다
  let level = start;
  let frames = 0;
  let since = 0; // 지금 재는 구간의 시작 시각
  let lastNow = 0;
  let bad = 0;
  let good = 0;
  let quietUntil = performance.now() + 3000; // 처음 3초(불러오기 · 셰이더 준비)는 재지 않는다
  let lastDown = -1e9;
  let noUp = found.forced;

  const html = document.documentElement;
  function apply() {
    html.dataset.q = String(level);
    html.classList.toggle('q-lite', level >= 2);
    html.classList.toggle('q-low', level >= 3);
    onChange?.(level, LEVELS[level]);
  }
  function setLevel(lv, why) {
    lv = Math.max(0, Math.min(TOP, lv));
    if (lv === level) return;
    const down = lv > level;
    level = lv;
    // 내리고 곧(20초 안) 다시 올렸다가 또 내려야 했다면 더는 올리지 않는다(오르내림 반복 방지)
    if (down) {
      if (performance.now() - lastDown < 20000) noUp = true;
      lastDown = performance.now();
    }
    bad = 0;
    good = 0;
    quietUntil = performance.now() + 2000; // 바뀐 직후(버퍼 재할당)는 재지 않는다
    apply();
    if (new URLSearchParams(location.search).has('perf')) console.info(`[perf] ${down ? '↓' : '↑'} ${LEVELS[level].name} (${why})`);
  }

  apply();

  return {
    get level() {
      return level;
    },
    get settings() {
      return LEVELS[level];
    },
    get gpu() {
      return found.gpu;
    },
    // 프레임마다(rAF 시각) — active: 지금 3D를 실제로 그리는 중(페이지가 덮였거나 숨었으면 false)
    frame(now, active) {
      const gap = now - lastNow;
      lastNow = now;
      // 재지 않는 때: 그리지 않거나, 막 바뀌었거나, 탭 전환처럼 크게 끊겼을 때
      if (!active || found.forced || now < quietUntil || gap > 250) {
        frames = 0;
        since = now;
        return;
      }
      frames++;
      if (now - since < 1000) return;
      const fps = (frames * 1000) / (now - since);
      frames = 0;
      since = now;
      if (fps < 45) {
        good = 0;
        if (++bad >= 2) setLevel(level + 1, `${fps.toFixed(0)}fps`);
      } else {
        bad = 0;
        good = fps >= 57 ? good + 1 : 0;
        if (good >= 8 && level > start && !noUp) setLevel(level - 1, `${fps.toFixed(0)}fps`);
      }
    },
    set: (lv) => setLevel(lv, 'manual'),
  };
}
