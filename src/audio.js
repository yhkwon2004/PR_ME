// Web Audio로 합성한 앰비언트 스코어 — 밝고 가벼운 장조 패드 · 오르골 같은 아르페지오 · 맑은 전자피아노 · 짧은 잔향.
// 낮게 깔리는 어두운 드론 대신, 위쪽 음역의 부드러운 소리로 밝게 띄운다.
// 사용자가 시작 버튼을 누르기 전에는 아무 소리도 내지 않는다.

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// C장조의 밝은 네 화음(Cadd9 → G → Fmaj7 → C/E) — 단조 없이, 위 네 음은 한 옥타브 올려 가볍게
const CHORDS = [
  { bass: 48, pad: [64, 67, 72, 74] }, // C3 · E4 G4 C5 D5
  { bass: 43, pad: [62, 67, 71, 74] }, // G2 · D4 G4 B4 D5
  { bass: 41, pad: [64, 69, 72, 76] }, // F2 · E4 A4 C5 E5
  { bass: 40, pad: [64, 67, 72, 76] }, // E2 · E4 G4 C5 E5
];
// 멜로디는 C 펜타토닉(C D E G A) — 네 화음 어디에 얹어도 어울린다
const PENTA = [0, 2, 4, 7, 9];
const melody = (k, octave = 5) => 12 * (octave + 1) + PENTA[((k % 5) + 5) % 5] + 12 * Math.floor(k / 5);

// 잔향 임펄스: 짧은 지연 뒤 3.4초 동안 사라지는 스테레오 잡음 — 뒤로 갈수록 고음이 먼저 줄어 어두워진다
function impulse(ctx, seconds = 2.2, pre = 0.018) {
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
      const a = 0.35 + 0.6 * k; // 시간이 갈수록 강해지는 로우패스
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
      d[i] = lp * Math.pow(1 - k, 2.4) * 2.2;
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
  let padFilter = null;
  let pad = [];
  let bass = null;
  let chord = 0;
  let chordTimer = 0;
  const stateListeners = new Set();

  function setChord(i, glide = 3) {
    chord = ((i % CHORDS.length) + CHORDS.length) % CHORDS.length;
    const t = ctx.currentTime;
    const c = CHORDS[chord];
    pad.forEach((v, k) => v.oscs.forEach((o) => o.frequency.setTargetAtTime(hz(c.pad[k]), t, glide)));
    bass.oscs.forEach((o, j) => o.frequency.setTargetAtTime(hz(c.bass) * (j ? 2 : 1), t, glide * 0.8));
  }

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

    // 마스터: 부드러운 컴프레서 → 귀에 거슬리는 고음을 살짝 누른다
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.02;
    comp.release.value = 0.35;
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 6000;
    shelf.gain.value = -4;
    master = ctx.createGain();
    master.gain.value = 0;
    comp.connect(shelf).connect(master).connect(ctx.destination);

    bus = ctx.createGain();
    bus.gain.value = 1.1;
    bus.connect(comp);

    // 잔향
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.42;
    verb.connect(verbOut).connect(comp);
    verbSend = ctx.createGain();
    verbSend.connect(verb);

    // 메아리(점 8분음표쯤): 좌우로 오가며 어둡게 사라진다
    delaySend = ctx.createGain();
    const dl = ctx.createDelay(1);
    const dr = ctx.createDelay(1);
    dl.delayTime.value = 0.42;
    dr.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.26;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 3600;
    const merger = ctx.createChannelMerger(2);
    delaySend.connect(dl);
    dl.connect(damp).connect(dr);
    dr.connect(fb).connect(dl);
    dl.connect(merger, 0, 0);
    dr.connect(merger, 0, 1);
    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.24;
    merger.connect(delayOut);
    delayOut.connect(comp);
    delayOut.connect(verbSend);

    // 패드: 음마다 삼각파 둘을 좌우로 살짝 어긋나게 → 밝게 열린 로우패스가 천천히 숨 쉰다
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 2600;
    padFilter.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 500;
    lfo.connect(lfoG).connect(padFilter.frequency);
    lfo.start();
    const padBus = ctx.createGain();
    padBus.gain.value = 0.11;
    padFilter.connect(padBus);
    padBus.connect(bus);
    padBus.connect(verbSend);

    pad = CHORDS[0].pad.map((m, k) => {
      const g = ctx.createGain();
      g.gain.value = 0.26 - k * 0.025;
      // 음마다 다른 빠르기로 아주 느리게 숨 쉬는 음량
      const breath = ctx.createOscillator();
      breath.frequency.value = 0.06 + k * 0.017;
      const bg = ctx.createGain();
      bg.gain.value = 0.05;
      breath.connect(bg).connect(g.gain);
      breath.start();
      const oscs = [-1, 1].map((side) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = hz(m);
        o.detune.value = side * 4;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (p) {
          p.pan.value = side * 0.45;
          o.connect(p).connect(g);
        } else o.connect(g);
        o.start();
        return o;
      });
      g.connect(padFilter);
      return { oscs, g };
    });

    // 베이스: 사인 + 한 옥타브 위 삼각파를 조금
    const bassG = ctx.createGain();
    bassG.gain.value = 0.028;
    const bassLp = ctx.createBiquadFilter();
    bassLp.type = 'lowpass';
    bassLp.frequency.value = 320;
    bassG.connect(bassLp).connect(bus);
    bass = {
      oscs: ['sine', 'triangle'].map((type, j) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz(CHORDS[0].bass) * (j ? 2 : 1);
        const og = ctx.createGain();
        og.gain.value = j ? 0.18 : 1;
        o.connect(og).connect(bassG);
        o.start();
        return o;
      }),
    };
  }

  // 전자피아노(FM): 같은 높이의 변조파가 처음엔 밝게, 곧 둥글게 — 맑고 따뜻한 한 음
  function epiano(m, { level = 0.05, when, pan = 0, decay = 2.6, wet = 0.5, echo = 0.25 } = {}) {
    if (!ctx) return;
    const t = when ?? ctx.currentTime;
    const f = hz(m);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(level, t + 0.006);
    out.gain.exponentialRampToValueAtTime(level * 0.35, t + 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const car = ctx.createOscillator();
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f;
    const idx = ctx.createGain();
    idx.gain.setValueAtTime(f * 1.4, t);
    idx.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.9);
    mod.connect(idx).connect(car.frequency);
    // 옥타브 위 배음을 아주 조금 — 종소리 같은 반짝임
    const bell = ctx.createOscillator();
    bell.frequency.value = f * 4;
    const bellG = ctx.createGain();
    bellG.gain.setValueAtTime(0.06, t);
    bellG.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    bell.connect(bellG).connect(out);
    car.connect(out);
    let node = out;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      out.connect(p);
      node = p;
    }
    const dry = ctx.createGain();
    dry.gain.value = 1 - wet * 0.4;
    node.connect(dry).connect(bus);
    const wv = ctx.createGain();
    wv.gain.value = wet;
    node.connect(wv).connect(verbSend);
    if (echo) {
      const ev = ctx.createGain();
      ev.gain.value = echo;
      node.connect(ev).connect(delaySend);
    }
    [car, mod, bell].forEach((o) => {
      o.start(t);
      o.stop(t + decay + 0.1);
    });
  }

  function set(v) {
    on = v;
    if (on) init();
    if (!ctx) return;
    if (on && ctx.state === 'suspended' && ctx.resume) {
      ctx.resume();
      // 사용자 동작 없이 켜졌다면(상세 페이지에서 뒤로 가기 등) 다음 클릭 · 키 입력에 깨운다
      // SOUND 버튼 · 안내를 누른 경우는 그 버튼이 직접 처리한다(깨우기와 토글이 한 번에 겹쳐 꺼지지 않게)
      const wake = (e) => {
        if (e.target?.closest?.('#btn-sound, #sound-hint')) return;
        ['pointerdown', 'keydown', 'touchend'].forEach((t) => removeEventListener(t, wake, true));
        if (on) ctx.resume();
      };
      ['pointerdown', 'keydown', 'touchend'].forEach((t) => addEventListener(t, wake, true));
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, on ? 1.4 : 0.4);
    clearInterval(chordTimer);
    clearInterval(arpTimer);
    // 장면이 오래 머물러도 화음이 천천히 흐른다
    if (on) chordTimer = setInterval(() => setChord(chord + 1, 4.5), 15000);
    // 오르골처럼 지금 화음의 음을 위 음역에서 하나씩 — 아주 작게, 가끔 쉬어 간다
    if (on) arpTimer = setInterval(arp, 620);
  }

  let arpTimer = 0;
  let arpStep = 0;
  const ARP = [0, 2, 1, 3, 2, 1, -1, 3]; // 화음 음 번호(-1은 쉼)
  function arp() {
    if (!awake()) return;
    const n = ARP[arpStep++ % ARP.length];
    if (n < 0) return;
    const m = CHORDS[chord].pad[n] + 12;
    epiano(m, { level: 0.03, pan: (n - 1.5) * 0.3, decay: 1.8, wet: 0.35, echo: 0.12 });
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

  // 장면 전환: 패드가 숨을 들이쉬듯 열렸다 닫히고, 다음 화음을 전자피아노가 천천히 펼쳐 친다
  // 브라우저가 재워 둔 동안에는 음을 쌓지 않는다(깨어날 때 한꺼번에 울리지 않게)
  const awake = () => on && ctx && ctx.state === 'running';

  function whoosh(duration = 2.5) {
    if (!awake()) return;
    const t = ctx.currentTime;
    const fq = padFilter.frequency;
    fq.cancelScheduledValues(t);
    fq.setTargetAtTime(4200, t, duration * 0.18);
    fq.setTargetAtTime(2600, t + duration * 0.55, duration * 0.35);
    setChord(chord + 1, 1.4);
    const c = CHORDS[chord];
    // 화음의 맨 아래 · 가운데 · 위 음을 한 옥타브 위에서 차례로
    [c.pad[0], c.pad[2], c.pad[3]].forEach((m, k) =>
      epiano(m, { level: 0.15 - k * 0.02, when: t + duration * 0.42 + k * 0.11, pan: (k - 1) * 0.35, decay: 3.2, wet: 0.6 })
    );
  }

  // 카드 한 장: 넘긴 순서대로 펜타토닉을 오르내리는 한 음
  function pluck(index = 0, dir = 1) {
    if (!awake()) return;
    const k = Math.max(0, index) % 10;
    epiano(melody(k, 5), { level: 0.2, pan: dir > 0 ? 0.2 : -0.2, decay: 2.4, wet: 0.45, echo: 0.3 });
  }

  // 클릭 · 호버: 지금 화음과 어울리는 높은 음을 아주 작게
  function blip(freq = 1320) {
    if (!awake()) return;
    const tones = [0, 2, 4, 7, 9].map((s) => 84 + s);
    const near = tones.reduce((a, b) => (Math.abs(hz(b) - freq) < Math.abs(hz(a) - freq) ? b : a));
    epiano(near, { level: 0.05, decay: 1.4, wet: 0.55, echo: 0.15 });
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
