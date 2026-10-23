// Web Audio로 합성한 앰비언트 스코어 — 맑고 밝게: 높은 음역의 장조 화음 · 한 옥타브 위 반짝임 · 경쾌한 오르골.
// 낮게 깔리는 베이스 드론은 쓰지 않는다. 마스터 앞에서 180Hz 아래를 깎아(24dB/옥타브)
// 전자피아노 · 잔향에서 생길 수 있는 낮은 웅웅거림도 막는다(휴대폰 스피커 · 이어폰 모두 거슬리지 않게).
// 사용자가 시작 버튼을 누르기 전에는 아무 소리도 내지 않는다.

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// C장조의 밝은 네 화음(Cadd9 → G → Fadd9 → C6) — 단조 없이, 패드는 A4~B5(약 440~990Hz) 위에서만
const CHORDS = [
  [72, 74, 76, 79], // C5 D5 E5 G5
  [71, 74, 79, 83], // B4 D5 G5 B5
  [69, 72, 77, 79], // A4 C5 F5 G5
  [72, 76, 79, 81], // C5 E5 G5 A5
];
// 멜로디는 C 펜타토닉(C D E G A) — 네 화음 어디에 얹어도 어울린다
const PENTA = [0, 2, 4, 7, 9];
const melody = (k, octave = 5) => 12 * (octave + 1) + PENTA[((k % 5) + 5) % 5] + 12 * Math.floor(k / 5);

// 잔향 임펄스: 짧은 지연 뒤 2초 동안 사라지는 스테레오 잡음 — 저음이 쌓이지 않게 밝게(로우패스는 아주 살짝만)
function impulse(ctx, seconds = 2, pre = 0.016) {
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
      const a = 0.12 + 0.4 * k; // 뒤로 갈수록 고음이 조금 먼저 사라진다
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
      d[i] = lp * Math.pow(1 - k, 2.8) * 1.6;
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
  let noise = null; // 장면 전환의 바람 소리용 잡음
  let chord = 0;
  let chordTimer = 0;
  const stateListeners = new Set();

  function setChord(i, glide = 3) {
    chord = ((i % CHORDS.length) + CHORDS.length) % CHORDS.length;
    const t = ctx.currentTime;
    pad.forEach((v, k) => {
      const f = hz(CHORDS[chord][k]);
      v.oscs.forEach((o) => o.frequency.setTargetAtTime(f, t, glide));
      v.shimmer?.frequency.setTargetAtTime(f * 2, t, glide);
    });
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

    // 마스터: 180Hz 아래를 두 번 깎고(24dB/옥타브) → 부드러운 컴프레서 → 귀에 거슬리는 고음을 살짝 누른다
    const hp = [0, 1].map(() => {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 180;
      f.Q.value = 0.707;
      return f;
    });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 14;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.015;
    comp.release.value = 0.3;
    const shelf = ctx.createBiquadFilter();
    // 밝게: 5kHz 위를 살짝 올린다(쨍하지 않을 만큼)
    shelf.type = 'highshelf';
    shelf.frequency.value = 5000;
    shelf.gain.value = 1.5;
    master = ctx.createGain();
    master.gain.value = 0;
    hp[0].connect(hp[1]).connect(comp).connect(shelf).connect(master).connect(ctx.destination);
    const out = hp[0]; // 모든 소리는 여기로

    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(out);

    // 잔향: 보내기 전에 320Hz 아래를 깎아 웅웅거리지 않게
    const verbHp = ctx.createBiquadFilter();
    verbHp.type = 'highpass';
    verbHp.frequency.value = 320;
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.3;
    verbHp.connect(verb).connect(verbOut).connect(out);
    verbSend = ctx.createGain();
    verbSend.connect(verbHp);

    // 메아리(점 8분음표쯤): 좌우로 오가며 사라진다 — 되먹임 고리에서 저음 · 고음을 모두 덜어 맑게
    delaySend = ctx.createGain();
    const dl = ctx.createDelay(1);
    const dr = ctx.createDelay(1);
    dl.delayTime.value = 0.42;
    dr.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.24;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 4200;
    const thin = ctx.createBiquadFilter();
    thin.type = 'highpass';
    thin.frequency.value = 300;
    const merger = ctx.createChannelMerger(2);
    delaySend.connect(dl);
    dl.connect(damp).connect(thin).connect(dr);
    dr.connect(fb).connect(dl);
    dl.connect(merger, 0, 0);
    dr.connect(merger, 0, 1);
    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.2;
    merger.connect(delayOut);
    delayOut.connect(out);
    delayOut.connect(verbSend);

    // 패드: 음마다 사인파 둘을 좌우로 살짝 어긋나게 — 둥글고 맑게, 로우패스가 천천히 숨 쉰다
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 3400;
    padFilter.Q.value = 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 700;
    lfo.connect(lfoG).connect(padFilter.frequency);
    lfo.start();
    const padBus = ctx.createGain();
    padBus.gain.value = 0.08;
    padFilter.connect(padBus);
    padBus.connect(bus);
    padBus.connect(verbSend);

    pad = CHORDS[0].map((m, k) => {
      const g = ctx.createGain();
      g.gain.value = 0.26 - k * 0.03;
      // 음마다 다른 빠르기로 아주 느리게 숨 쉬는 음량
      const breath = ctx.createOscillator();
      breath.frequency.value = 0.06 + k * 0.017;
      const bg = ctx.createGain();
      bg.gain.value = 0.06;
      breath.connect(bg).connect(g.gain);
      breath.start();
      const oscs = [-1, 1].map((side) => {
        const o = ctx.createOscillator();
        o.type = side < 0 ? 'sine' : 'triangle';
        o.frequency.value = hz(m);
        o.detune.value = side * 5;
        const og = ctx.createGain();
        og.gain.value = side < 0 ? 1 : 0.45;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (p) {
          p.pan.value = side * 0.45;
          o.connect(og).connect(p).connect(g);
        } else o.connect(og).connect(g);
        o.start();
        return o;
      });
      // 반짝임: 위 두 음은 한 옥타브 위 사인을 아주 작게 — 천천히 일렁인다
      let shimmer = null;
      if (k >= 2) {
        const sh = (shimmer = ctx.createOscillator());
        sh.frequency.value = hz(m) * 2;
        const shg = ctx.createGain();
        shg.gain.value = 0.16;
        const trem = ctx.createOscillator();
        trem.frequency.value = 0.21 + k * 0.07;
        const tg = ctx.createGain();
        tg.gain.value = 0.08;
        trem.connect(tg).connect(shg.gain);
        trem.start();
        sh.connect(shg).connect(g);
        sh.start();
      }
      g.connect(padFilter);
      return { oscs, g, shimmer };
    });

    // 장면 전환의 바람 소리: 1.5초짜리 잡음 한 토막을 미리 만들어 둔다
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // 전자피아노(FM): 변조파를 반송파의 두 배로 — 0Hz 쪽 배음이 생기지 않아 낮게 '쿵' 하지 않는다.
  // 처음엔 밝게, 곧 둥글게 — 맑고 따뜻한 한 음
  function epiano(m, { level = 0.05, when, pan = 0, decay = 2.4, wet = 0.5, echo = 0.22 } = {}) {
    if (!ctx) return;
    const t = when ?? ctx.currentTime;
    const f = hz(m);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(level, t + 0.008);
    out.gain.exponentialRampToValueAtTime(level * 0.32, t + 0.38);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const car = ctx.createOscillator();
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 2;
    const idx = ctx.createGain();
    idx.gain.setValueAtTime(f * 1.05, t);
    idx.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.6);
    mod.connect(idx).connect(car.frequency);
    // 두 옥타브 위 배음을 아주 조금 — 종소리 같은 반짝임
    const bell = ctx.createOscillator();
    bell.frequency.value = f * 4;
    const bellG = ctx.createGain();
    bellG.gain.setValueAtTime(0.08, t);
    bellG.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
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

  // 바람 소리: 높은 대역을 지나가는 잡음 — 대역이 위로 쓸려 올라가며 커졌다 사라진다
  function swish(duration = 1.2, level = 0.02) {
    if (!ctx || !noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(6500, t + duration);
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
    master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, on ? 1.4 : 0.4);
    clearInterval(chordTimer);
    clearInterval(arpTimer);
    // 장면이 오래 머물러도 화음이 천천히 흐른다
    if (on) chordTimer = setInterval(() => setChord(chord + 1, 3.5), 11000);
    // 오르골처럼 지금 화음의 음을 위 음역에서 하나씩 — 작게, 경쾌하게 오르내린다
    if (on) arpTimer = setInterval(arp, 540);
  }

  let arpTimer = 0;
  let arpStep = 0;
  const ARP = [0, 1, 2, 3, 2, 3, 1, -1, 0, 2, 3, 2, -1, 1, 3, -1]; // 화음 음 번호(-1은 쉼) — 오르내리는 두 마디
  function arp() {
    if (!awake()) return;
    const step = arpStep++ % ARP.length;
    const n = ARP[step];
    if (n < 0) return;
    const m = CHORDS[chord][n] + 12;
    epiano(m, { level: 0.017, pan: (n - 1.5) * 0.3, decay: 1.4, wet: 0.32, echo: 0.1 });
    // 두 마디마다 맨 위에서 한 번 반짝
    if (step === 3) epiano(m + 12, { level: 0.009, pan: 0.4, decay: 1.2, wet: 0.5, echo: 0.2 });
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

  // 장면 전환: 바람 소리가 지나가고, 패드가 숨을 들이쉬듯 열렸다 닫히며, 다음 화음을 전자피아노가 펼쳐 친다
  function whoosh(duration = 2.5) {
    if (!awake()) return;
    const t = ctx.currentTime;
    swish(Math.min(1.4, duration * 0.6));
    const fq = padFilter.frequency;
    fq.cancelScheduledValues(t);
    fq.setTargetAtTime(3800, t, duration * 0.18);
    fq.setTargetAtTime(2400, t + duration * 0.55, duration * 0.35);
    setChord(chord + 1, 1.4);
    const c = CHORDS[chord];
    // 새 화음을 아래에서 위로 반짝이듯 훑는다(한 옥타브 위에서)
    [c[0], c[1], c[2], c[3], c[3] + 5].forEach((m, k) =>
      epiano(m + 12, { level: 0.085 - k * 0.01, when: t + duration * 0.4 + k * 0.075, pan: (k - 2) * 0.22, decay: 2.4, wet: 0.5 })
    );
  }

  // 카드 한 장: 넘긴 순서대로 펜타토닉을 오르내리는 한 음
  function pluck(index = 0, dir = 1) {
    if (!awake()) return;
    const k = Math.max(0, index) % 10;
    epiano(melody(k, 5), { level: 0.15, pan: dir > 0 ? 0.2 : -0.2, decay: 2.2, wet: 0.42, echo: 0.26 });
    // 한 옥타브 위를 살짝 늦게 겹쳐 맑게
    epiano(melody(k, 6), { level: 0.035, when: ctx.currentTime + 0.03, pan: dir > 0 ? 0.35 : -0.35, decay: 1.4, wet: 0.5, echo: 0.15 });
  }

  // 클릭 · 호버: 지금 화음과 어울리는 높은 음을 아주 작게
  function blip(freq = 1320) {
    if (!awake()) return;
    const tones = [0, 2, 4, 7, 9].map((s) => 84 + s);
    const near = tones.reduce((a, b) => (Math.abs(hz(b) - freq) < Math.abs(hz(a) - freq) ? b : a));
    epiano(near, { level: 0.04, decay: 1.2, wet: 0.5, echo: 0.12 });
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
