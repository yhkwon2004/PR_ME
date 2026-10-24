// Web Audio로 합성한 배경 음악 — 밝고 경쾌하게: 108BPM 장조 네 마디(C → G → F → G)를 높은 음역에서.
// 맑은 플럭이 8분음표로 화음을 오르내리고, 글로켄슈필 멜로디가 노래하며, 하이햇 · 셰이커 · 핑거스냅이 가볍게 박을 짚는다.
// 베이스 · 킥 · 낮게 깔리는 드론은 쓰지 않는다 — 가장 낮은 음도 B4(약 494Hz)이고, 마스터 앞에서 220Hz 아래를 깎아(24dB/옥타브)
// 잔향에서 생길 수 있는 웅웅거림까지 막는다(휴대폰 스피커 · 이어폰 모두 가볍게 들리게).
// 음은 미리보기 스케줄러(25ms마다 0.15초 앞을 예약)로 박자에 정확히 맞춘다.
// 사용자가 시작 버튼을 누르기 전에는 아무 소리도 내지 않는다.

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

const LEVEL = 1.4; // 전체 음량(예전 앰비언트와 비슷하게 들리도록)
const BPM = 108;
const EIGHTH = 60 / BPM / 2; // 8분음표(약 0.28초)
const BAR = EIGHTH * 8;
// 네 마디 화음(한 마디에 하나) — 장조만, B4~D6 사이에 펼친 밝은 자리바꿈
const CHORDS = [
  [72, 76, 79, 86], // C5 E5 G5 D6 — Cadd9
  [71, 74, 79, 83], // B4 D5 G5 B5 — G
  [72, 77, 81, 84], // C5 F5 A5 C6 — F
  [74, 79, 83, 86], // D5 G5 B5 D6 — G
];
// 플럭(8분음표): 화음 음 번호를 한 옥타브 위에서 — 마디마다 모양을 조금씩 바꿔 오르내린다
const ARPS = [
  [0, 1, 2, 3, 2, 1, 2, 3],
  [0, 2, 1, 3, 2, 3, 1, 2],
  [0, 1, 2, 3, 3, 2, 1, 2],
  [3, 2, 1, 2, 0, 1, 2, 3],
];
// 글로켄슈필 멜로디(여덟 마디, 마디마다 8칸 · null은 쉼) — C장조 펜타토닉을 높은 음역에서
const _ = null;
const MELODY = [
  [88, _, 91, _, 93, _, 91, _], // E6 G6 A6 G6
  [86, _, _, _, 91, _, _, _], // D6 G6
  [84, _, 86, _, 88, _, 89, 88], // C6 D6 E6 F6 E6
  [86, _, _, _, _, _, 83, 86], // D6 … B5 D6
  [88, _, 91, _, 96, _, 93, _], // E6 G6 C7 A6
  [91, _, _, _, 88, _, 86, _], // G6 E6 D6
  [89, _, 88, _, 86, _, 84, _], // F6 E6 D6 C6
  [86, _, 88, _, 91, _, _, _], // D6 E6 G6
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
  let padBus = null;
  let pad = [];
  let noise = null; // 하이햇 · 셰이커 · 스냅 · 장면 전환 바람 소리용 잡음
  let chord = 0;
  const stateListeners = new Set();

  // 패드: 화음이 바뀌면 음이 미끄러지듯 옮겨 가고, 마디 머리에서 살짝 부풀었다 가라앉는다
  function setChord(i, when, glide = 0.25) {
    chord = ((i % CHORDS.length) + CHORDS.length) % CHORDS.length;
    const t = when ?? ctx.currentTime;
    pad.forEach((v, k) => {
      const f = hz(CHORDS[chord][k] + 12);
      v.oscs.forEach((o) => o.frequency.setTargetAtTime(f, t, glide));
    });
    const g = padBus.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.026, t, 0.04);
    g.setTargetAtTime(0.014, t + 0.3, 0.8);
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

    // 메아리(점 8분음표): 좌우로 오가며 사라진다 — 되먹임 고리에서 저음 · 고음을 덜어 맑게
    delaySend = ctx.createGain();
    const dl = ctx.createDelay(1);
    const dr = ctx.createDelay(1);
    dl.delayTime.value = EIGHTH * 1.5;
    dr.delayTime.value = EIGHTH * 1.5;
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

    // 패드: 화음을 한 옥타브 위(C6 ~ D7)에서 삼각파 둘로 좌우 살짝 어긋나게 — 깔리는 소리가 아니라 박자 뒤의 아주 작은 빛
    const padTone = ctx.createBiquadFilter();
    padTone.type = 'lowpass';
    padTone.frequency.value = 6500;
    const padHp = ctx.createBiquadFilter();
    padHp.type = 'highpass';
    padHp.frequency.value = 450;
    padBus = ctx.createGain();
    padBus.gain.value = 0.014;
    padTone.connect(padHp).connect(padBus);
    padBus.connect(bus);
    padBus.connect(verbSend);
    pad = CHORDS[0].map((m, k) => {
      const g = ctx.createGain();
      g.gain.value = 0.22 - k * 0.025;
      const oscs = [-1, 1].map((side) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = hz(m + 12);
        o.detune.value = side * 7;
        if (ctx.createStereoPanner) {
          const p = ctx.createStereoPanner();
          p.pan.value = side * 0.5;
          o.connect(p).connect(g);
        } else o.connect(g);
        o.start();
        return o;
      });
      g.connect(padTone);
      return { oscs, g };
    });

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

  // 잡음 타악기: 하이햇(8kHz 위, 아주 짧게) · 셰이커(6kHz 대역) · 핑거스냅(2.4kHz 대역, 두 번 겹쳐)
  function hit(kind, when, level) {
    const t = when;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    let dur = 0.05;
    if (kind === 'hat') {
      f.type = 'highpass';
      f.frequency.value = 8000;
      dur = 0.045;
    } else if (kind === 'shaker') {
      f.type = 'bandpass';
      f.frequency.value = 6500;
      f.Q.value = 0.8;
      dur = 0.07;
    } else {
      f.type = 'bandpass';
      f.frequency.value = 2400;
      f.Q.value = 1.4;
      dur = 0.12;
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + (kind === 'shaker' ? 0.02 : 0.002));
    if (kind === 'snap') {
      // 손가락 두 번이 겹친 듯 — 아주 짧은 간격의 두 번째 머리
      g.gain.exponentialRampToValueAtTime(level * 0.3, t + 0.012);
      g.gain.exponentialRampToValueAtTime(level * 0.8, t + 0.018);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g);
    route(g, { pan: kind === 'hat' ? 0.25 : kind === 'shaker' ? -0.3 : 0.05, wet: kind === 'snap' ? 0.35 : 0.08 });
    src.start(t, Math.random() * 1.2, dur + 0.02);
  }

  // ── 박자 스케줄러: 25ms마다 앞으로 0.15초 안에 올 8분음표를 예약한다 ──
  let seqTimer = 0;
  let step = 0; // 8분음표 번호(마디 = 8)
  let nextTime = 0;
  function schedule() {
    if (!awake()) return;
    const now = ctx.currentTime;
    // 브라우저가 재웠다 깨우면(탭 전환 등) 밀린 음을 몰아 치지 않고 지금부터 다시
    if (nextTime < now - 0.1) nextTime = now + 0.05;
    while (nextTime < now + 0.15) {
      playStep(step, nextTime);
      step++;
      nextTime += EIGHTH;
    }
  }
  function playStep(n, t) {
    const s = n % 8; // 마디 안 위치
    const bar = Math.floor(n / 8);
    const c = bar % CHORDS.length;
    if (s === 0) setChord(c, t);
    const tones = CHORDS[c];
    // 플럭 8분음표(한 옥타브 위) — 박 머리는 조금 세게
    const arp = ARPS[bar % ARPS.length];
    pluckTone(tones[arp[s]] + 12, { when: t, level: s % 2 ? 0.02 : 0.028, pan: (arp[s] - 1.5) * 0.25 });
    // 멜로디는 네 마디를 쉬었다가(플럭만) 여덟 마디 노래 — 열두 마디마다 한 바퀴
    const phrase = bar % 12;
    if (phrase >= 4) {
      const m = MELODY[phrase - 4][s];
      if (m) glock(m, { when: t, level: 0.045, pan: 0.15, decay: 1.4 });
    }
    // 타악기: 엇박 하이햇 · 16분 셰이커 · 2 · 4박 스냅(마디 첫 줄은 비워 숨 돌리기)
    if (s % 2 === 1) hit('hat', t, 0.05);
    hit('shaker', t + EIGHTH / 2, 0.016);
    if (bar % 4 !== 0 && (s === 2 || s === 6)) hit('snap', t, 0.05);
    // 네 마디마다 마지막 박에 위로 쓸어 올리는 반짝임
    if (bar % 4 === 3 && s === 7) [96, 100, 103, 108].forEach((m, k) => glock(m, { when: t + k * 0.045, level: 0.012, pan: -0.3 + k * 0.2, decay: 0.9, wet: 0.5 }));
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
    master.gain.setTargetAtTime(on ? LEVEL : 0, ctx.currentTime, on ? 0.8 : 0.4);
    clearInterval(seqTimer);
    if (on) {
      // 다시 켤 때는 첫 마디부터
      step = 0;
      nextTime = ctx.currentTime + 0.1;
      schedule();
      seqTimer = setInterval(schedule, 25);
    }
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
