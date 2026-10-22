import '@fontsource-variable/space-grotesk';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/main.css';
import './styles/pages.css';
import './styles/premium.css';

import * as THREE from 'three';
import gsap from 'gsap';
import { scenes } from './content.js';
import { createStage } from './core/stage.js';
import { SETS } from './core/layout.js';
import { Drone } from './actors/drone.js';
import { GroundSet } from './actors/groundSet.js';
import { RoboticsSet } from './actors/roboticsSet.js';
import { HangarSet, AerialSet, NeuralCore, RecordSet, DataLinks } from './actors/worldSets.js';
import { Director } from './director.js';
import { createPanels } from './ui/panels.js';
import { createHud, createCursor } from './ui/hud.js';
import { createInput } from './ui/input.js';
import { createLightbox } from './ui/lightbox.js';
import { bindCardFx } from './ui/cards.js';
import { createAudio } from './audio.js';
import { createMood } from './ui/mood.js';
import { createSite } from './pages/site.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// 검증용(?capture)에서는 자동 진입하지 않는다
const CAPTURE = new URLSearchParams(location.search).has('capture');
bindCardFx({ reducedMotion: reduced });
const canvas = document.getElementById('gl');
const $ = (id) => document.getElementById(id);

// ── 3D 세계 구성 ───────────────────────────────────────────
// 작품 주소로 바로 들어오면 무거운 3D 무대는 필름을 열 때 만든다 — 페이지가 먼저 보이도록
let stage = null;
let director = null;
let actors = null;
let video = null;
let worldBuilt = false;

function buildWorld() {
  if (worldBuilt) return;
  worldBuilt = true;
  stage = createStage(canvas, { reducedMotion: reduced });
  if (stage) {
    const drone = new Drone();
    const hangar = new HangarSet(SETS.hangar);
    const aerial = new AerialSet(SETS.aerial);
    const ground = new GroundSet(SETS.ground);
    const robotics = new RoboticsSet(SETS.robotics);
    const core = new NeuralCore(SETS.core);
    const records = new RecordSet(SETS.record);
    const links = new DataLinks(SETS.core, [SETS.hangar, SETS.aerial, SETS.ground, SETS.robotics, SETS.record]);
    [hangar, aerial, ground, robotics, core, records, links].forEach((s) => stage.scene.add(s.group));
    stage.scene.add(drone.root);

    video = document.createElement('video');
    video.src = '/media/airsim-demo.mp4';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    ground.attachVideo(video, '/media/airsim-poster.webp');

    actors = { drone, hangar, aerial, ground, robotics, core, records, links, video };
    director = new Director({ stage, actors, scenes, reducedMotion: reduced, onTransition });
    director.hitTargets = [drone.hit, ground.rover.hit, robotics.dog.hit, robotics.arm.hit, core.hit];
    let reframeTimer = 0;
    addEventListener('resize', () => {
      clearTimeout(reframeTimer);
      reframeTimer = setTimeout(() => director.reframe(), 200);
    });

    // 부팅 동안 보여줄 첫 프레임: 격납고 근접
    stage.camera.position.copy(director.camPos);
    stage.camera.lookAt(director.camTarget);
    drone.pos.set(SETS.hangar.x, 0.27, SETS.hangar.z);
    drone.target.copy(drone.pos);
    drone.faceYaw = drone.yaw = 0;
  } else {
    document.body.classList.add('no-webgl');
    // WebGL이 없을 때도 장면 진행과 콘텐츠는 그대로 동작한다
    director = {
      index: -1,
      trans: null,
      go(i) {
        if (i < 0 || i >= scenes.length || i === this.index) return false;
        const prev = this.index;
        this.index = i;
        onTransition(i, prev, 0.8);
        return true;
      },
    };
  }
}

// ── UI ───────────────────────────────────────────────────
const audio = createAudio();
const mood = createMood({ getStage: () => stage, reducedMotion: reduced });
const lightbox = createLightbox();
const cursor = createCursor();
let auto = !reduced;
let elapsed = 0;
let started = false;
let hoverHold = false;
// 부팅(로딩) 중에도 3D를 그린다 — 진행률과 드론이 올 화면 높이(레티클 가운데)
let booting = false;
let bootProgress = 0;
let bootFocusY = 0.42;
const bootLeader = document.querySelector('.boot-leader');

const panels = createPanels($('stage'), scenes, {
  reducedMotion: reduced,
  onReplay: () => goTo(0),
  // 릴 초점을 손으로 옮기면(스크롤 · 스와이프 · 버튼) 자동 재생 시계를 그 카드 자리로 맞춘다
  onReelFocus: ({ focus, count }) => {
    const h = holdOf(director?.index);
    if (h > 0) elapsed = (h * focus) / count;
  },
  // 덱의 가운데 카드가 바뀌면 배경 분위기도 그 카드로
  // 카드를 넘길 때마다 펜타토닉 한 음
  onCard: (card, dir, focus) => {
    mood.set(card, dir);
    if (dir) audio.pluck(focus, dir);
  },
});
// 장면 길이: 카드 덱이 있으면 카드마다 1.5초는 머물도록 늘린다(수상 덱처럼 카드가 많은 장면)
function holdOf(i) {
  const s = scenes[i];
  if (!(s?.hold > 0)) return 0;
  return Math.max(s.hold, (panels.panels[i]?.reel?.count || 0) * 1.5);
}
const hud = createHud(scenes, {
  reducedMotion: reduced,
  onGo: (i) => goTo(i),
  onToggleAuto: () => {
    auto = !auto;
    hud.setAuto(auto);
  },
  onToggleSound: () => {
    audio.toggle();
    hud.setSound(audio.on);
    setTimeout(syncSoundHint, 300);
  },
});
hud.setAuto(auto);

// ── 작품 아카이브 · 상세 페이지 ─────────────────────────────────
let pageCovered = false;
let warmed = false; // 셰이더 예열 여부(페이지로 바로 들어오면 필름을 열 때 예열)
const site = createSite({
  lightbox,
  reducedMotion: reduced,
  onOpen: () => {
    pageCovered = true;
    video?.pause();
    if (!started) $('boot').hidden = true;
  },
  onClose: () => {
    pageCovered = false;
    if (!started) {
      buildWorld();
      if (stage && !warmed) {
        stage.renderer.compile(stage.scene, stage.camera);
        warmed = true;
      }
      $('boot').hidden = false;
      start(true);
    } else if (scenes[director.index]?.id === 'ground') video?.play().catch(() => {});
    site.markFilm();
  },
});

function onTransition(i, prev, duration) {
  elapsed = 0;
  // 카드 덱이 없는 장면에서는 분위기를 걷는다(덱이 있으면 아래 panels.go가 첫 카드로 맞춘다)
  if (!panels.panels[i]?.reel) mood.clear();
  panels.go(i, prev, duration); // 뒤로 돌아와 마지막 카드에서 시작하는 릴이면 onReelFocus가 시계를 맞춘다
  hud.setScene(i, prev, duration);
  if (prev >= 0) audio.whoosh(Math.max(1.2, duration));
}

function goTo(i) {
  if (!started) return false;
  return director.go(Math.max(0, Math.min(scenes.length - 1, i)));
}

// 스크롤 · 스와이프 · 화살표: 프로젝트 릴이 있으면 카드를 한 장씩 넘긴 뒤 다음 장면으로
function stepOrGo(dir) {
  if (!started) return false;
  if (panels.step(dir)) return 'step'; // 시계는 onReelFocus가 맞춘다
  return goTo(director.index + dir);
}

createInput({
  next: () => stepOrGo(1),
  prev: () => stepOrGo(-1),
  first: () => goTo(0),
  last: () => goTo(scenes.length - 1),
  isBlocked: () => !started || lightbox.open || hud.indexOpen || site.open || site.busy,
  onKey: (e) => {
    if (lightbox.key(e)) return true;
    if (site.key(e)) return true;
    if (e.key === 'Escape' && hud.indexOpen) {
      hud.closeIndex();
      return true;
    }
    if (!started) return false;
    const k = e.key.toLowerCase();
    if (k === 'i') {
      hud.indexOpen ? hud.closeIndex() : hud.openIndex();
      return true;
    }
    if (k === 'p') {
      auto = !auto;
      hud.setAuto(auto);
      return true;
    }
    if (k === 'm') {
      audio.toggle();
      hud.setSound(audio.on);
      setTimeout(syncSoundHint, 300);
      return true;
    }
    return false;
  },
});

$('brand').addEventListener('click', (e) => {
  e.preventDefault();
  goTo(0);
});

// ── 포인터: 패럴랙스 · 호버 · 클릭(포크) · 드래그 오빗 ───────────
const ndc = new THREE.Vector2();
const ray = new THREE.Raycaster();
let pointerDirty = false;
let hovered = null;
let down = null;
const fine = matchMedia('(pointer: fine)').matches;

addEventListener('pointermove', (e) => {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (director?.pointer) director.pointer.copy(ndc);
  pointerDirty = e.target === canvas;
  if (e.target !== canvas) {
    hovered = null;
    cursor.setActor(null);
  }
  hoverHold = fine && !!e.target.closest?.('.panel-content, .credits');
  if (down && director?.drag && e.pointerType === 'mouse') {
    director.drag.set(((e.clientX - down.x) / innerWidth) * 1.4, ((e.clientY - down.y) / innerHeight) * 0.6);
  }
});
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY };
  canvas.classList.add('is-grabbing');
});
addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  canvas.classList.remove('is-grabbing');
  director?.drag?.set(0, 0);
  if (moved < 6 && e.target === canvas) {
    if (e.pointerType !== 'mouse') pick();
    if (hovered) {
      hovered.poke();
      audio.blip(990);
    }
  }
});

function pick() {
  if (!stage || !started) return;
  ray.setFromCamera(ndc, stage.camera);
  const hit = ray.intersectObjects(director.hitTargets, false)[0];
  const actor = hit?.object.userData.actor || null;
  if (actor !== hovered) {
    hovered = actor;
    cursor.setActor(actor ? actor.label : null);
    if (actor) audio.blip(1500);
  }
}

// ── 부팅 시퀀스 ────────────────────────────────────────────
const bootLines = [
  ['BOOT', 'physical-ai.film — reel 2026', ''],
  ['INIT', 'IMU · GPS · BAROMETER', 'OK'],
  ['SPIN', 'LIDAR 360° / 8 CH', 'OK'],
  ['LINK', 'PIXHAWK FLIGHT CONTROLLER', 'OK'],
  ['LOAD', 'NEURAL WEIGHTS · PERCEPTION', 'OK'],
  ['CALI', 'QUADRUPED GAIT · 2-LINK IK', 'OK'],
  ['ARM', 'ACTUATORS', 'READY'],
];

async function boot() {
  const log = $('boot-log');
  const pct = $('boot-pct');
  const ring = $('boot-ring');
  const clock = $('boot-clock');
  const t0 = performance.now();
  booting = true;
  let ready = false;
  // 로딩 중 화면을 누르면 그 순간 오디오를 깨워 두고, 준비가 끝났다면 바로 시작
  const bootEl = $('boot');
  const poke = () => {
    if (pageCovered) return; // 작품 · 수상 페이지가 덮고 있으면 키를 눌러도 필름을 열지 않는다
    audio.unlock();
    if (ready) start(true);
  };
  bootEl.addEventListener('pointerdown', poke);
  addEventListener('keydown', (e) => !started && booting && !e.repeat && poke(), { capture: true });
  let progress = 0;
  let shown = 0;
  const clockTimer = setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    clock.textContent = `00:00:${String(Math.floor(s)).padStart(2, '0')}:${String(Math.floor((s % 1) * 24)).padStart(2, '0')}`;
  }, 42);

  const addLine = (i) => {
    const [a, b, c] = bootLines[i];
    const li = document.createElement('li');
    li.innerHTML = `<span class="bl-a">${a}</span><span class="bl-b">${b}</span><span class="bl-c">${c}</span>`;
    log.appendChild(li);
    requestAnimationFrame(() => li.classList.add('is-in'));
  };

  const tasks = [
    () => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]),
    () => {
      // 상세 페이지로 바로 들어왔다면 페이지가 먼저 — 예열은 필름을 열 때
      if (stage && !pageCovered) {
        stage.renderer.compile(stage.scene, stage.camera);
        warmed = true;
      }
    },
    () => {
      // 셰이더 예열용 한 프레임
      if (stage && !pageCovered) stage.composer.render(0.016);
    },
  ];
  const minTime = reduced ? 600 : 2600;
  let done = 0;
  const work = (async () => {
    for (const task of tasks) {
      await task();
      done++;
    }
  })();
  let last = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const time = Math.min(1, (now - t0) / minTime);
      const real = done / tasks.length;
      progress += (Math.min(time, real * 0.4 + time * 0.6) - progress) * Math.min(1, dt * 7);
      if (real === 1 && time === 1 && progress > 0.97) progress = 1;
      pct.textContent = String(Math.round(progress * 100)).padStart(2, '0');
      ring.style.strokeDashoffset = String(100 - progress * 100);
      bootProgress = progress;
      const want = Math.min(bootLines.length, Math.floor(progress * bootLines.length + 0.6));
      while (shown < want) addLine(shown++);
      if (progress >= 1 || started) resolve();
      else requestAnimationFrame(step);
    };
    step();
  });
  await work;
  clearInterval(clockTimer);
  // 상세 페이지에서 바로 필름을 열었다면 부팅 화면은 이미 사라졌다
  const actions = $('boot-actions');
  if (started || !actions) return;
  ready = true;
  $('boot').classList.add('is-ready');
  $('boot-status').textContent = 'READY';
  actions.hidden = false;
  // 필름 리더처럼 3 · 2 · 1을 세고 저절로 들어간다(누르면 바로)
  if (!CAPTURE) {
    const unit = pct.nextElementSibling;
    if (unit) unit.hidden = true;
    // 실제 흐른 시간으로 센다(느린 기기에서 애니메이션 시계가 늦어져도 제때 들어가도록)
    const total = reduced ? 1.2 : 3;
    const c0 = performance.now();
    const tick = () => {
      if (started) return;
      const left = Math.max(0, total - (performance.now() - c0) / 1000);
      const n = Math.max(1, Math.ceil(left * (3 / total)));
      if (pct.textContent !== String(n)) {
        pct.textContent = String(n);
        $('boot-status').textContent = `AUTO START — ${n}`;
        if (!reduced) gsap.fromTo(pct, { scale: 1.25, autoAlpha: 0.4 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'power3.out' });
      }
      const frac = ((left * (3 / total)) % 1) || (left > 0 ? 1 : 0);
      ring.style.strokeDashoffset = String(100 - frac * 100);
      if (left <= 0) {
        if (!pageCovered) start(true);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }
  // 버튼이 보이게 된 뒤에 초점을 준다(그 사이 다른 곳을 눌렀다면 그대로 둔다)
  gsap.fromTo(actions.children, { autoAlpha: 0, y: 14 }, {
    autoAlpha: 1,
    y: 0,
    stagger: 0.12,
    duration: 0.7,
    ease: 'power3.out',
    onComplete: () => {
      if (!started && (!document.activeElement || document.activeElement === document.body)) $('enter-sound').focus({ preventScroll: true });
    },
  });
}

function start(withSound) {
  if (started) return;
  buildWorld(); // 페이지로 바로 들어왔다면 무대가 아직 없다
  started = true;
  const wasLive = booting && director?.booting;
  booting = false;
  audio.set(withSound);
  hud.setSound(withSound);
  document.body.classList.add('is-started');
  const bootEl = $('boot');
  gsap.to(bootEl, {
    autoAlpha: 0,
    scale: 1.04,
    filter: 'blur(10px)',
    duration: reduced ? 0.2 : 1.1,
    ease: 'power2.inOut',
    onComplete: () => bootEl.remove(),
  });
  if (stage) {
    gsap.to(stage.film.uniforms.uExposure, { value: 1, duration: reduced ? 0.3 : 2.4, ease: 'power2.inOut', delay: 0.2 });
    if (!wasLive) {
      actors.drone.targetThrottle = 0;
      setTimeout(() => (actors.drone.targetThrottle = 1), 500);
    }
    setTimeout(() => {
      video.preload = 'auto';
      video.load();
    }, 5000);
  }
  director.go(0);
  site.markFilm();
  syncSoundHint();
  setTimeout(syncSoundHint, 900);
}

// 자동 진입이라 브라우저가 소리를 막아 둔 경우: 한 번 누르면 켜진다는 안내를 띄운다
const soundHint = $('sound-hint');
function syncSoundHint() {
  if (!soundHint) return;
  const need = started && audio.on && !audio.running;
  soundHint.hidden = !need;
  document.body.classList.toggle('needs-sound', need);
}
audio.onState(syncSoundHint);
soundHint?.addEventListener('click', () => {
  audio.unlock();
  setTimeout(syncSoundHint, 300);
});

// 필름은 언제나 사운드와 함께 시작한다(사운드 버튼으로 끌 수 있다)
$('enter-sound').addEventListener('click', () => start(true));

// ── 렌더 루프 ──────────────────────────────────────────────
const timer = new THREE.Timer();
timer.connect(document);
let filmTime = 0;
let frame = 0;
let simTime = 0;
let frozen = false;
function loop(now) {
  requestAnimationFrame(loop);
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  simTime += dt;
  const t = simTime;
  frame++;
  cursor.tick();
  if (started) {
    filmTime += dt;
    hud.setTime(filmTime);
    const s = scenes[director.index];
    if (s) {
      // 키보드 초점이 지금 장면의 덱 안에 있으면 자동 재생을 멈춘다(마우스 호버와 같게)
      const deckFocus = !!panels.current?.querySelector('.deck :focus-visible');
      const busy = director.trans || lightbox.open || hud.indexOpen || hoverHold || deckFocus || site.open;
      const hold = holdOf(director.index);
      if (auto && hold > 0 && !busy) {
        elapsed += dt;
        panels.autoFocus(elapsed / hold);
      }
      hud.setProgress(hold > 0 ? elapsed / hold : 0);
      if (auto && hold > 0 && elapsed >= hold) goTo(director.index + 1);
    }
  }
  if (!stage) return;
  if (pointerDirty && frame % 3 === 0) pick();
  if (frozen || pageCovered) return;
  // 부팅 중: 반투명 부팅 화면 뒤로 격납고의 드론을 천천히 돌아본다(진행률만큼 밝아지고 다가간다)
  if (!started) {
    if (!booting || !director?.bootFrame) return;
    // 드론이 레티클 가운데에 오도록 — 레티클 위치를 매 프레임 재고 부드럽게 따라간다
    const lr = bootLeader?.getBoundingClientRect();
    if (lr?.height) bootFocusY += ((lr.top + lr.height / 2) / innerHeight - bootFocusY) * Math.min(1, dt * 6);
    director.bootFrame(dt, t, bootProgress, bootFocusY);
    const u = stage.film.uniforms;
    u.uExposure.value += (0.32 + 0.6 * bootProgress - u.uExposure.value) * Math.min(1, dt * 3);
    stage.dust.update(t);
    u.uTime.value = t;
    stage.adapt(dt);
    stage.composer.render(dt);
    return;
  }
  director.update(dt, t);
  trackLoop(dt);
  mood.update(dt);
  stage.dust.update(t);
  stage.film.uniforms.uTime.value = t;
  stage.adapt(dt);
  stage.composer.render(dt);
}

// 루프 장면: 고리 중심이 3D 코어를 부드럽게 따라간다
const loopAt = new THREE.Vector2();
const loopNow = new THREE.Vector2(-1, -1);
function trackLoop(dt) {
  if (scenes[director.index]?.id !== 'loop') {
    loopNow.set(-1, -1);
    return;
  }
  director.coreOnScreen(loopAt);
  if (loopNow.x < 0) loopNow.copy(loopAt);
  else loopNow.lerp(loopAt, Math.min(1, dt * 4));
  panels.setLoopCenter(loopNow.x, loopNow.y);
}

requestAnimationFrame(loop);
// /works 주소로 바로 들어오면 부팅 화면 없이 페이지를 연다 — 3D 무대는 필름을 열 때 만든다
site.start(site.initial);
if (!site.open) buildWorld();
boot();

// 검증용 훅(?capture): 장면으로 즉시 이동하고 시뮬레이션을 빨리 감는다
if (stage && new URLSearchParams(location.search).has('capture')) {
  gsap.ticker.lagSmoothing(0);
  window.__film = {
    start: () => start(false),
    // 부팅 3D를 빨리 감는다(progress 0~1)
    boot(sec, progress = 1, step = 1 / 30) {
      const lr = bootLeader?.getBoundingClientRect();
      if (lr?.height) bootFocusY = (lr.top + lr.height / 2) / innerHeight;
      for (let k = 0; k < sec / step; k++) {
        simTime += step;
        director.bootFrame(step, simTime, progress, bootFocusY);
      }
      stage.film.uniforms.uExposure.value = 0.32 + 0.6 * progress;
      stage.composer.render(step);
    },
    // 드론 · 카메라 위치(부팅 3D 확인용)
    probe: () => ({ drone: actors.drone.pos.toArray().map((v) => +v.toFixed(2)), cam: stage.camera.position.toArray().map((v) => +v.toFixed(2)), exposure: +stage.film.uniforms.uExposure.value.toFixed(2), booting }),
    freeze: () => (frozen = true),
    go: (i) => director.go(i, { instant: true }),
    advance(sec, step = 1 / 30) {
      for (let k = 0; k < sec / step; k++) {
        simTime += step;
        director.update(step, simTime);
        trackLoop(step);
        mood.update(step);
      }
      stage.dust.update(simTime);
      stage.composer.render(step);
    },
  };
}

document.addEventListener('visibilitychange', () => {
  if (!video) return;
  if (document.hidden) video.pause();
  else if (scenes[director.index]?.id === 'ground') video.play().catch(() => {});
});
