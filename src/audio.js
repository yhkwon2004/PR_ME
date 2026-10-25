// Web Audio로 합성한 효과음만 — 배경 음악은 없다. 장면이 바뀔 때 높은 대역을 스치는 바람 소리와 위로 반짝이는 종소리,
// 카드를 넘길 때 맑은 한 음, 누를 때 작은 종소리. 모두 밝은 음역(가장 낮은 음도 C5 근처)이고,
// 마스터 앞에서 220Hz 아래를 깎아(24dB/옥타브) 낮게 웅웅거리는 소리가 나지 않는다.
// 사용자가 시작 버튼을 누르기 전에는 아무 소리도 내지 않는다.

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

const LEVEL = 1.2; // 전체 음량
// 장면이 바뀔 때마다 돌아가며 쓰는 밝은 장조 화음(종소리로 아래에서 위로 훑는다)
const CHORDS = [
  [72, 76, 79, 86], // C5 E5 G5 D6 — Cadd9
  [71, 74, 79, 83], // B4 D5 G5 B5 — G
  [72, 77, 81, 84], // C5 F5 A5 C6 — F
  [74, 79, 83, 86], // D5 G5 B5 D6 — G
];
// 카드 넘김 · 버튼: C장조 펜타토닉(C D E G A)
const PENTA = [0, 2, 4, 7, 9];
const melody = (k, octave = 6) => 12 * (octave + 1) + PENTA[((k % 5) + 5) % 5] + 12 * Math.floor(k / 5);

// 잔향 임펄스: 짧고 밝게(1.6초) — 앞쪽 반사 뒤 고르게 사라진다
function impulse(ctx, seconds = 1.6, pre = 0.012) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      if (t < pre) continue;
      const k = (t - pre) / (seconds - pre);
      const a = 0.05 + 0.3 * k;
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
      d[i] = lp * Math.pow(1 - k, 3) * 1.4;
    }
  }
  return buf;
}

// makeContext: 시험용으로 다른 오디오 컨텍스트(OfflineAudioContext 등)를 넣을 수 있다
export function createAudio({ makeContext } = {}) {
  let ctx = null;
  let master = null;
  let on = false;
  let bus = null; // 건조한 소리
  let verbSend = null;
  let delaySend = null;
  let noise = null; // 장면 전환 바람 소리용 잡음
  let chord = 0; // 장면 전환 종소리가 쓰는 화음 번호
  const stateListeners = new Set();

  function init() {
    if (ctx) return;
    if (makeContext) ctx = makeContext();
    else {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    // 브라우저가 소리를 재우거나 깨울 때 알린다(소리 켜기 안내)
    ctx.onstatechange = () => stateListeners.forEach((f) => f(ctx.state));

    // 마스터: 220Hz 아래를 두 번 깎고(24dB/옥타브) → 부드러운 컴프레서 → 6kHz 위를 살짝 올려 반짝이게
    const hp = [0, 1].map(() => {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 220;
      f.Q.value = 0.707;
      return f;
    });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 6000;
    shelf.gain.value = 2.5;
    master = ctx.createGain();
    master.gain.value = 0;
    hp[0].connect(hp[1]).connect(comp).connect(shelf).connect(master).connect(ctx.destination);
    const out = hp[0]; // 모든 소리는 여기로

    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(out);

    // 잔향: 보내기 전에 400Hz 아래를 깎아 맑게
    const verbHp = ctx.createBiquadFilter();
    verbHp.type = 'highpass';
    verbHp.frequency.value = 400;
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.26;
    verbHp.connect(verb).connect(verbOut).connect(out);
    verbSend = ctx.createGain();
    verbSend.connect(verbHp);

    // 메아리: 좌우로 오가며 사라진다 — 되먹임 고리에서 저음 · 고음을 덜어 맑게
    delaySend = ctx.createGain();
    const dl = ctx.createDelay(1);
    const dr = ctx.createDelay(1);
    dl.delayTime.value = 0.42;
    dr.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.22;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 6000;
    const thin = ctx.createBiquadFilter();
    thin.type = 'highpass';
    thin.frequency.value = 500;
    const merger = ctx.createChannelMerger(2);
    delaySend.connect(dl);
    dl.connect(damp).connect(thin).connect(dr);
    dr.connect(fb).connect(dl);
    dl.connect(merger, 0, 0);
    dr.connect(merger, 0, 1);
    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.18;
    merger.connect(delayOut);
    delayOut.connect(out);

    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // 공통: 한 음을 좌우 · 잔향 · 메아리로 보낸다
  function route(node, { pan = 0, wet = 0.3, echo = 0 }) {
    let n = node;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node.connect(p);
      n = p;
    }
    n.connect(bus);
    if (wet) {
      const w = ctx.createGain();
      w.gain.value = wet;
      n.connect(w).connect(verbSend);
    }
    if (echo) {
      const e = ctx.createGain();
      e.gain.value = echo;
      n.connect(e).connect(delaySend);
    }
  }

  // 플럭: 삼각파 + 얇은 사각파를 밝게 열었다 빠르게 닫는다 — 기타 줄 퉁기듯 짧고 맑게
  function pluckTone(m, { when, level = 0.03, pan = 0, decay = 0.42, wet = 0.22, echo = 0.12 } = {}) {
    const t = when ?? ctx.currentTime;
    const f = hz(m);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(level, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(9000, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + decay * 0.7);
    const a = ctx.createOscillator();
    a.type = 'triangle';
    a.frequency.value = f;
    const b = ctx.createOscillator();
    b.type = 'square';
    b.frequency.value = f;
    b.detune.value = 6;
    const bg = ctx.createGain();
    bg.gain.value = 0.22;
    a.connect(lp);
    b.connect(bg).connect(lp);
    lp.connect(out);
    route(out, { pan, wet, echo });
    [a, b].forEach((o) => {
      o.start(t);
      o.stop(t + decay + 0.05);
    });
  }

  // 글로켄슈필: 사인 기음 + 금속성 배음(2.76배 · 5.4배)이 먼저 사라진다 — 높고 반짝이는 종소리
  function glock(m, { when, level = 0.05, pan = 0, decay = 1.6, wet = 0.4, echo = 0.2 } = {}) {
    const t = when ?? ctx.currentTime;
    const f = hz(m);
    const out = ctx.createGain();
    out.gain.value = 1;
    const parts = [
      [1, level, decay],
      [2.76, level * 0.32, decay * 0.35],
      [5.4, level * 0.12, decay * 0.18],
    ];
    const oscs = parts.map(([ratio, lv, dc]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(lv, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dc);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dc + 0.05);
      return o;
    });
    route(out, { pan, wet, echo });
    return oscs;
  }

  // 바람 소리: 높은 대역을 지나가는 잡음 — 대역이 위로 쓸려 올라가며 커졌다 사라진다
  function swish(duration = 1.2, level = 0.02) {
    if (!ctx || !noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(2200, t);
    bp.frequency.exponentialRampToValueAtTime(8000, t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + duration * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(bp).connect(g);
    let node = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(-0.5, t);
      p.pan.linearRampToValueAtTime(0.5, t + duration);
      g.connect(p);
      node = p;
    }
    node.connect(bus);
    node.connect(verbSend);
    src.start(t);
    src.stop(t + Math.min(duration, 1.5));
  }

  function set(v) {
    on = v;
    if (on) init();
    if (!ctx) return;
    if (on && ctx.state === 'suspended' && ctx.resume) {
      ctx.resume();
      // 사용자 동작 없이 켜졌다면(상세 페이지에서 뒤로 가기 등) 다음 클릭 · 키 입력에 깨운다
      // 소리 버튼 · 안내를 누른 경우는 그 버튼이 직접 처리한다(깨우기와 토글이 한 번에 겹쳐 꺼지지 않게)
      const wake = (e) => {
        if (e.target?.closest?.('#btn-sound, #sound-hint')) return;
        ['pointerdown', 'keydown', 'touchend'].forEach((t) => removeEventListener(t, wake, true));
        if (on) ctx.resume();
      };
      ['pointerdown', 'keydown', 'touchend'].forEach((t) => addEventListener(t, wake, true));
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? LEVEL : 0, ctx.currentTime, on ? 0.2 : 0.3);
  }

  // 로딩 중 사용자가 화면을 누르면 그 순간에 오디오를 깨워 둔다(자동 진입 때 바로 소리가 나도록)
  function unlock() {
    init();
    if (ctx && ctx.state !== 'running' && ctx.resume) ctx.resume();
  }

  // 소리 버튼: 켜져 있는데 브라우저가 재워 두었다면 끄지 않고 깨운다
  function toggle() {
    if (on && ctx && ctx.state !== 'running') {
      ctx.resume();
      return;
    }
    set(!on);
  }

  // 브라우저가 재워 둔 동안에는 음을 쌓지 않는다(깨어날 때 한꺼번에 울리지 않게)
  const awake = () => on && ctx && ctx.state === 'running';

  // 장면 전환: 바람 소리가 위로 쓸려 가고, 지금 화음을 글로켄슈필이 아래에서 위로 반짝이듯 훑는다
  function whoosh(duration = 2.5) {
    if (!awake()) return;
    const t = ctx.currentTime;
    swish(Math.min(1.4, duration * 0.6));
    chord = (chord + 1) % CHORDS.length; // 장면마다 다음 화음으로
    const c = CHORDS[chord];
    [c[0], c[1], c[2], c[3], c[3] + 5].forEach((m, k) =>
      glock(m + 12, { when: t + duration * 0.35 + k * 0.07, level: 0.05 - k * 0.006, pan: (k - 2) * 0.22, decay: 1.4, wet: 0.45, echo: 0.2 })
    );
  }

  // 카드 한 장: 넘긴 순서대로 펜타토닉을 오르내리는 맑은 한 음(+ 한 옥타브 위를 살짝)
  function pluck(index = 0, dir = 1) {
    if (!awake()) return;
    const k = Math.max(0, index) % 10;
    glock(melody(k, 5) + 12, { level: 0.09, pan: dir > 0 ? 0.2 : -0.2, decay: 1.6, wet: 0.4, echo: 0.24 });
    pluckTone(melody(k, 5), { when: ctx.currentTime + 0.02, level: 0.04, pan: dir > 0 ? 0.35 : -0.35, decay: 0.6 });
  }

  // 클릭 · 호버: 지금 화음과 어울리는 높은 음을 아주 작게
  function blip(freq = 1320) {
    if (!awake()) return;
    const tones = [0, 2, 4, 7, 9].map((s) => 84 + s);
    const near = tones.reduce((a, b) => (Math.abs(hz(b) - freq) < Math.abs(hz(a) - freq) ? b : a));
    glock(near, { level: 0.03, decay: 0.9, wet: 0.45, echo: 0.1 });
  }

  return {
    set,
    toggle,
    unlock,
    // 실제로 소리가 나고 있는지(켜져 있고 브라우저가 깨워 둔 상태)
    get running() {
      return on && !!ctx && ctx.state === 'running';
    },
    onState(f) {
      stateListeners.add(f);
    },
    whoosh,
    pluck,
    blip,
    get on() {
      return on;
    },
    // 시험용(오프라인 렌더)
    get context() {
      return ctx;
    },
  };
}
