// Web Audio로 합성한 앰비언트 스코어 — 부드러운 화음 패드 + 잔향, 장면이 바뀔 때 조용히 화음이 넘어간다.
// 사용자가 시작 버튼을 누르기 전에는 아무 소리도 내지 않는다.

// 느린 4화음 진행(Cmaj9 → Am9 → Fmaj7 → G6) — 모두 같은 음계라 어디서 넘어가도 매끄럽다
const CHORDS = [
  [130.81, 196.0, 246.94, 293.66], // C3 G3 B3 D4
  [110.0, 164.81, 246.94, 261.63], // A2 E3 B3 C4
  [87.31, 174.61, 220.0, 329.63], // F2 F3 A3 E4
  [98.0, 146.83, 246.94, 329.63], // G2 D3 B3 E4
];

// 잔향용 임펄스: 2.6초 동안 지수로 사라지는 스테레오 노이즈
function impulse(ctx, seconds = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let dry = null;
  let wet = null;
  let on = false;
  let noiseBuf = null;
  let fxSend = null; // 잔향 버스(효과음도 함께 쓴다)
  let voices = [];
  let chord = 0;
  let chordTimer = 0;

  function setChord(i, glide = 3) {
    chord = ((i % CHORDS.length) + CHORDS.length) % CHORDS.length;
    const t = ctx.currentTime;
    voices.forEach((v, k) => {
      const f = CHORDS[chord][k];
      v.oscs.forEach((o, j) => o.frequency.setTargetAtTime(f * (j ? 1.003 : 0.997), t, glide));
    });
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    // 마스터: 부드러운 컴프레서로 튀는 소리 없이
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    comp.attack.value = 0.05;
    comp.release.value = 0.4;
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp).connect(ctx.destination);

    // 건조한 소리와 잔향을 섞는다
    dry = ctx.createGain();
    dry.gain.value = 0.7;
    dry.connect(master);
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    wet = ctx.createGain();
    wet.gain.value = 0.55;
    verb.connect(wet).connect(master);
    fxSend = ctx.createGain();
    fxSend.connect(verb);

    // 화음 패드: 음마다 사인 + 삼각파를 살짝 어긋나게, 따뜻한 로우패스
    const padBus = ctx.createGain();
    padBus.gain.value = 0.038;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.035;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 260;
    lfo.connect(lfoG).connect(lp.frequency);
    lfo.start();
    padBus.connect(lp);
    lp.connect(dry);
    lp.connect(fxSend);

    voices = CHORDS[0].map((f, k) => {
      const g = ctx.createGain();
      // 위 음일수록 조금 작게, 각 음은 느리게 숨 쉬듯
      g.gain.value = k === 0 ? 0.9 : 0.6 - k * 0.08;
      const breath = ctx.createOscillator();
      breath.frequency.value = 0.05 + k * 0.013;
      const bg = ctx.createGain();
      bg.gain.value = 0.18;
      breath.connect(bg).connect(g.gain);
      breath.start();
      const oscs = ['sine', 'triangle'].map((type, j) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f * (j ? 1.003 : 0.997);
        const og = ctx.createGain();
        og.gain.value = j ? 0.35 : 1;
        o.connect(og).connect(g);
        o.start();
        return o;
      });
      g.connect(padBus);
      return { oscs, g };
    });

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function set(v) {
    on = v;
    if (on) init();
    if (!ctx) return;
    if (on && ctx.state === 'suspended') {
      ctx.resume();
      // 사용자 동작 없이 켜졌다면(상세 페이지에서 뒤로 가기 등) 다음 클릭 · 키 입력에 깨운다
      const wake = () => on && ctx.resume();
      ['pointerdown', 'keydown', 'touchend'].forEach((t) => addEventListener(t, wake, { once: true, capture: true }));
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.62 : 0, ctx.currentTime, on ? 1.2 : 0.4);
    clearInterval(chordTimer);
    // 장면이 오래 머물러도 화음이 천천히 흐른다
    if (on) chordTimer = setInterval(() => setChord(chord + 1, 4), 16000);
  }

  // 장면 전환: 바람 같은 부드러운 스웰 + 다음 화음으로 넘어가며 맑은 벨 하나
  function whoosh(duration = 2.5) {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(260, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + duration * 0.5);
    lp.frequency.exponentialRampToValueAtTime(240, t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.034, t + duration * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(lp).connect(g);
    g.connect(dry);
    g.connect(fxSend);
    src.start(t);
    src.stop(t + duration + 0.1);
    setChord(chord + 1, 1.6);
    bell(CHORDS[chord][2] * 2, 0.026, t + duration * 0.4);
  }

  // 맑은 벨: 사인 두 개(기음 + 옥타브 위 약하게), 짧은 어택과 긴 꼬리
  function bell(freq, level, when) {
    const t = when ?? ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    [1, 2.01].forEach((m, k) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * m;
      const og = ctx.createGain();
      og.gain.value = k ? 0.25 : 1;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.7);
    });
    g.connect(dry);
    g.connect(fxSend);
  }

  // 소리 버튼: 켜져 있는데 브라우저가 재워 두었다면 끄지 않고 깨운다
  function toggle() {
    if (on && ctx && ctx.state !== 'running') {
      ctx.resume();
      return;
    }
    set(!on);
  }

  // 클릭 · 호버: 지금 화음 안의 음으로 아주 작게
  function blip(freq = 1320) {
    if (!on || !ctx) return;
    const tones = CHORDS[chord].map((f) => f * 4);
    const near = tones.reduce((a, b) => (Math.abs(b - freq) < Math.abs(a - freq) ? b : a));
    bell(near, 0.017);
  }

  return {
    set,
    toggle,
    whoosh,
    blip,
    get on() {
      return on;
    },
  };
}
