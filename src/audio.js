// Web Audio로 합성한 앰비언트 스코어 — 사용자가 켜기 전에는 아무 소리도 내지 않는다.
export function createAudio() {
  let ctx = null;
  let master = null;
  let on = false;
  let noiseBuf = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // 저음 패드: 디튠된 톱니파 두 개 + 느린 필터 LFO
    const pad = ctx.createGain();
    pad.gain.value = 0.05;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    lp.Q.value = 6;
    [55, 55.35, 82.4].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.5 : 1;
      o.connect(g).connect(lp);
      o.start();
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 140;
    lfo.connect(lfoG).connect(lp.frequency);
    lfo.start();
    lp.connect(pad).connect(master);

    // 고음 반짝임
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 880;
    const sg = ctx.createGain();
    sg.gain.value = 0.004;
    const sl = ctx.createOscillator();
    sl.frequency.value = 0.21;
    const slg = ctx.createGain();
    slg.gain.value = 0.004;
    sl.connect(slg).connect(sg.gain);
    shimmer.connect(sg).connect(master);
    shimmer.start();
    sl.start();

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function set(v) {
    on = v;
    if (on) init();
    if (!ctx) return;
    if (on && ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.4);
  }

  // 장면 전환 휙 소리
  function whoosh(duration = 2.5) {
    if (!on || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    bp.frequency.setValueAtTime(220, t);
    bp.frequency.exponentialRampToValueAtTime(1800, t + duration * 0.5);
    bp.frequency.exponentialRampToValueAtTime(300, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + duration * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + duration + 0.1);
  }

  function blip(freq = 1320) {
    if (!on || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.2);
  }

  return {
    set,
    whoosh,
    blip,
    get on() {
      return on;
    },
  };
}
