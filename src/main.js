import '@fontsource-variable/space-grotesk';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/main.css';
import './styles/pages.css';

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
import { createAudio } from './audio.js';
import { createSite } from './pages/site.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');
const $ = (id) => document.getElementById(id);

// ── 3D 세계 구성 ───────────────────────────────────────────
const stage = createStage(canvas, { reducedMotion: reduced });
let director = null;
let actors = null;
let video = null;

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

// ── UI ───────────────────────────────────────────────────
const audio = createAudio();
const lightbox = createLightbox();
const cursor = createCursor();
let auto = !reduced;
let elapsed = 0;
let started = false;
let hoverHold = false;

const panels = createPanels($('stage'), scenes, {
  reducedMotion: reduced,
  onReplay: () => goTo(0),
});
const hud = createHud(scenes, {
  reducedMotion: reduced,
  onGo: (i) => goTo(i),
  onToggleAuto: () => {
    auto = !auto;
    hud.setAuto(auto);
  },
  onToggleSound: () => {
    audio.set(!audio.on);
    hud.setSound(audio.on);
  },
});
hud.setAuto(auto);

// ── 작품 아카이브 · 상세 페이지 ─────────────────────────────────
let pageCovered = false;
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
      $('boot').hidden = false;
      start(false);
    } else if (scenes[director.index]?.id === 'ground') video?.play().catch(() => {});
    site.markFilm();
  },
});

function onTransition(i, prev, duration) {
  elapsed = 0;
  panels.go(i, prev, duration);
  hud.setScene(i, prev, duration);
  if (prev >= 0) audio.whoosh(Math.max(1.2, duration));
}

function goTo(i) {
  if (!started) return false;
  return director.go(Math.max(0, Math.min(scenes.length - 1, i)));
}

createInput({
  next: () => goTo(director.index + 1),
  prev: () => goTo(director.index - 1),
  first: () => goTo(0),
  last: () => goTo(scenes.length - 1),
  isBlocked: () => !started || lightbox.open || hud.indexOpen || site.open,
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
      audio.set(!audio.on);
      hud.setSound(audio.on);
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
  const bar = $('boot-bar');
  const clock = $('boot-clock');
  const t0 = performance.now();
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
      if (stage) stage.renderer.compile(stage.scene, stage.camera);
    },
    () => {
      // 셰이더 예열용 한 프레임
      if (stage) stage.composer.render(0.016);
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
      pct.textContent = String(Math.round(progress * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${progress})`;
      const want = Math.min(bootLines.length, Math.floor(progress * bootLines.length + 0.6));
      while (shown < want) addLine(shown++);
      if (progress >= 1) resolve();
      else requestAnimationFrame(step);
    };
    step();
  });
  await work;
  clearInterval(clockTimer);
  const actions = $('boot-actions');
  actions.hidden = false;
  gsap.fromTo(actions.children, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' });
  $('enter-sound').focus({ preventScroll: true });
}

function start(withSound) {
  if (started) return;
  started = true;
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
    actors.drone.targetThrottle = 0;
    setTimeout(() => (actors.drone.targetThrottle = 1), 500);
    setTimeout(() => {
      video.preload = 'auto';
      video.load();
    }, 5000);
  }
  director.go(0);
  site.markFilm();
}

$('enter-sound').addEventListener('click', () => start(true));
$('enter-quiet').addEventListener('click', () => start(false));

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
      const busy = director.trans || lightbox.open || hud.indexOpen || hoverHold || site.open;
      if (auto && s.hold > 0 && !busy) elapsed += dt;
      hud.setProgress(s.hold > 0 ? elapsed / s.hold : 0);
      if (auto && s.hold > 0 && elapsed >= s.hold) goTo(director.index + 1);
    }
  }
  if (!stage) return;
  if (pointerDirty && frame % 3 === 0) pick();
  // 부팅 화면이 덮고 있는 동안은 렌더하지 않는다
  if (!started || frozen || pageCovered) return;
  director.update(dt, t);
  stage.dust.update(t);
  stage.film.uniforms.uTime.value = t;
  stage.adapt(dt);
  stage.composer.render(dt);
}

if (stage) {
  // 부팅 동안 보여줄 첫 프레임: 격납고 근접
  stage.camera.position.copy(director.camPos);
  stage.camera.lookAt(director.camTarget);
  actors.drone.pos.set(SETS.hangar.x, 0.27, SETS.hangar.z);
  actors.drone.target.copy(actors.drone.pos);
  actors.drone.faceYaw = actors.drone.yaw = 0;
}
requestAnimationFrame(loop);
boot();
// /works 주소로 바로 들어오면 부팅 화면 없이 페이지를 연다
site.start(site.initial);

// 검증용 훅(?capture): 장면으로 즉시 이동하고 시뮬레이션을 빨리 감는다
if (stage && new URLSearchParams(location.search).has('capture')) {
  gsap.ticker.lagSmoothing(0);
  window.__film = {
    start: () => start(false),
    freeze: () => (frozen = true),
    go: (i) => director.go(i, { instant: true }),
    advance(sec, step = 1 / 30) {
      for (let k = 0; k < sec / step; k++) {
        simTime += step;
        director.update(step, simTime);
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
