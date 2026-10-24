import '@fontsource-variable/space-grotesk';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/main.css';
import './styles/pages.css';
import './styles/premium.css';
import './styles/skills.css';
import './styles/about.css';
import './styles/history.css';
import './styles/guide.css';
import './styles/perf.css';
import './styles/clarity.css';

import * as THREE from 'three';
import gsap from 'gsap';
import { scenes, profile } from './content.js';
import { createStage } from './core/stage.js';
import { createPerf } from './core/perf.js';
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
import { createGuide } from './ui/guide.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// 검증용(?capture)에서는 자동 진입하지 않는다
const CAPTURE = new URLSearchParams(location.search).has('capture');
bindCardFx({ reducedMotion: reduced });
const canvas = document.getElementById('gl');
const $ = (id) => document.getElementById(id);

// ── 3D 세계 구성 ───────────────────────────────────────────
// 작품 주소로 바로 들어오면 무거운 3D 무대는 필름을 열 때 만든다 — 페이지가 먼저 보이도록
let stage = null;
let perf = null; // 성능 단계(core/perf.js) — 3D 무대와 함께 만든다
let director = null;
let actors = null;
let video = null;
let worldBuilt = false;

function buildWorld() {
  if (worldBuilt) return;
  worldBuilt = true;
  stage = createStage(canvas, { reducedMotion: reduced });
  if (stage) {
    perf = createPerf(stage.renderer.getContext(), { onChange: (lv, q) => stage.setQuality(q) });
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
    director.hitTargets = [drone.hit, ground.rover.hit, robotics.dog.hit, robotics.humanoid.hit, robotics.arm.hit, core.hit];
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
// 손가락이 카드 덱 위에 있는 동안은 자동 재생을 멈춘다(끌던 카드가 저절로 넘어가지 않게)
let touchHold = false;
// 끌기 안내: 손으로 보는 중(자동 재생 꺼짐)에 한동안 아무 입력이 없으면 넘기는 법을 반투명한 손끝으로 보여 준다
let lastInput = performance.now();
let lastHand = 0; // 마지막으로 손을 쓴 시각(멈춤 상태로 늘리지 않는 실제 입력)
let hintsLeft = 4;
const coarse = matchMedia('(pointer: coarse)').matches;
['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach((t) =>
  addEventListener(
    t,
    () => {
      lastInput = lastHand = performance.now();
      guide?.hideGhost();
      guide?.stopHint();
    },
    { passive: true, capture: true }
  )
);
addEventListener('touchstart', (e) => (touchHold = !!e.target.closest?.('.deck-stage')), { passive: true, capture: true });
addEventListener('touchend', () => (touchHold = false), { passive: true, capture: true });
addEventListener('touchcancel', () => (touchHold = false), { passive: true, capture: true });
// 부팅(로딩) 중에도 3D를 그린다 — 진행률과 드론이 올 화면 높이(레티클 가운데)
let booting = false;
let bootProgress = 0;
let bootFocusY = 0.42;
let bootFocusX = 0.5;
let bootFit = 0.3; // 레티클 지름 / 화면 높이 — 드론이 레티클을 알맞게 채우는 거리
let bootPin = -1; // 검증용: 진행률을 이 값에 고정(-1이면 실제 진행)
let leaveTl = null; // 시작할 때의 아이리스 아웃
const bootLeader = document.querySelector('.boot-leader');
// 레티클의 화면 위치를 재고, 부팅 화면의 어둠(가운데 빈 원)도 그 자리에 맞춘다
function measureLeader(ease = 1) {
  const lr = bootLeader?.getBoundingClientRect();
  if (!lr?.height) return;
  const cx = lr.left + lr.width / 2;
  const cy = lr.top + lr.height / 2;
  bootFocusX += (cx / innerWidth - bootFocusX) * ease;
  bootFocusY += (cy / innerHeight - bootFocusY) * ease;
  bootFit = lr.width / innerHeight;
  const key = `${Math.round(cx)},${Math.round(cy)}`;
  const el = document.getElementById('boot');
  if (el && el.dataset.focus !== key) {
    el.dataset.focus = key;
    el.style.setProperty('--fx', `${Math.round(cx)}px`);
    el.style.setProperty('--fy', `${Math.round(cy)}px`);
  }
}

const panels = createPanels($('stage'), scenes, {
  reducedMotion: reduced,
  onReplay: () => goTo(0),
  // 릴 초점을 손으로 옮기면(스크롤 · 스와이프 · 버튼) 자동 재생 시계를 그 카드 자리로 맞춘다
  onReelFocus: ({ focus, count, entry }) => {
    const h = holdOf(director?.index);
    if (h > 0) elapsed = (h * focus) / count;
    if (!entry) takeOver();
    // 손으로 마지막 카드까지 왔다: 아래로 넘기면 다음 장면이라는 것을 반투명한 손끝으로 보여 준다
    if (!entry && focus === count - 1) hintNextScene(1100);
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

// 관람 안내: 다음 장면 버튼 · 알림 · 처음 방문 사용법 · 이어 보기
const guide = createGuide(scenes, {
  profile,
  reducedMotion: reduced,
  // 덱을 살짝 끌어 보이고, 손끝 안내가 설 자리(가운데 카드)를 돌려준다 — 다음 카드 쪽으로 움직였을 때만
  onPeek: () => (panels.peek() > 0 ? panels.current?.reel?.card?.getBoundingClientRect() : null),
  onNext: () => goTo(director.index + 1),
  onGo: (i) => goTo(i),
  onAuto: () => {
    auto = true;
    hud.setAuto(true);
  },
});
// 손으로 넘기기 시작하면(휠 · 스와이프 · 방향키 · 카드) 자동 재생을 멈춘다 — 읽는 도중 장면이 넘어가지 않게
function takeOver() {
  if (!auto || !started) return;
  auto = false;
  hud.setAuto(false);
  guide.takeover();
}

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
  // 끌어서 넘겼으면 끌려 올라가 있던 패널을 그 자리에서 이어 내보내고, 다음 장면을 더 빨리 들인다
  const nav = pendingNav;
  pendingNav = null;
  panels.go(i, prev, duration, nav || {}); // 뒤로 돌아와 마지막 카드에서 시작하는 릴이면 onReelFocus가 시계를 맞춘다
  hud.setScene(i, prev, duration);
  guide.setScene(i, !!panels.panels[i]?.reel);
  // 덱이 없는 장면(소개): 조금 머물면 아래로 넘기는 법을 보여 준다.
  // 휴대폰은 위로 밀면 덱이 있어도 바로 다음 장면이라, 덱 장면에서도 카드 안내 뒤에 한 번
  if (started && i > 0 && i < scenes.length - 1) {
    if (!panels.panels[i]?.reel) hintNextScene(3200);
    else if (coarse) hintNextScene(7500);
  }
  // 주소에 지금 장면을 남긴다(새로 고침 · 공유해도 그 장면으로) — 작품 페이지가 열려 있을 때는 건드리지 않는다
  if (started && !site.open && location.pathname === '/') {
    const want = i > 0 ? `#${scenes[i].id}` : '';
    if (location.hash !== want) history.replaceState(history.state, '', `/${location.search}${want}`);
  }
  if (prev >= 0) audio.whoosh(Math.max(1.2, duration));
}

function goTo(i, opts) {
  if (!started) return false;
  return director.go(Math.max(0, Math.min(scenes.length - 1, i)), opts);
}

// 스크롤 · 화살표 · 마우스로 끌기: 프로젝트 릴이 있으면 카드를 한 장씩 넘긴 뒤 다음 장면으로.
// 휴대폰에서 위아래로 밀면(swipe) 카드는 건너뛰고 바로 다음 · 이전 장면 — 카드는 옆으로 넘긴다
let pendingNav = null;
function stepOrGo(dir, how) {
  if (!started) return false;
  if (!(how === 'swipe' && panels.current?.reel) && panels.step(dir)) return 'step'; // 시계는 onReelFocus가 맞춘다
  const j = director.index + dir;
  if (j < 0 || j >= scenes.length || director.index < 0) return false;
  if (!how) return goTo(j);
  pendingNav = { quick: true, from: guide.commitPull(), first: how === 'swipe' };
  const ok = goTo(j, { quick: true });
  if (!ok) pendingNav = null;
  return ok;
}

const pad2 = (n) => String(n).padStart(2, '0');
createInput({
  // 위아래로 끄는 동안 무엇으로 넘어갈지(다음 카드 · 다음 장면) — 넘어갈 것이 없으면 null
  pullLabel: (dir, how) => {
    if (!started) return null;
    const i = director.index;
    if (scenes[i]?.layout === 'finale') return null;
    const reel = panels.panels[i]?.reel;
    if (reel?.paged && how !== 'swipe') {
      const k = reel.focus + dir;
      if (k >= 0 && k < reel.count) return `${dir > 0 ? '다음' : '이전'} 카드 · ${pad2(k + 1)}/${pad2(reel.count)}`;
    }
    const j = i + dir;
    return j >= 0 && j < scenes.length ? `${dir > 0 ? '다음' : '이전'} 장면 · ${scenes[j].ko}` : null;
  },
  onPull: (st) => guide.pull(st),
  next: (how) => {
    const r = stepOrGo(1, how);
    if (r) takeOver();
    return r;
  },
  prev: (how) => {
    const r = stepOrGo(-1, how);
    if (r) takeOver();
    return r;
  },
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

// 주소의 장면을 손으로 바꾸면(#robotics 등) 그 장면으로
addEventListener('hashchange', () => {
  if (!started || site.open) return;
  const i = scenes.findIndex((s) => `#${s.id}` === location.hash);
  if (i >= 0 && i !== director.index) goTo(i);
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
  if (down && director?.drag && e.pointerType === 'mouse' && !document.documentElement.classList.contains('is-pulling')) {
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

// 카운트다운 한 프레임: 표찰의 숫자, 초마다 다시 차는 고리, 재생 아이콘 둘레의 자동 시작 고리
function countdown(left, total) {
  const pct = $('boot-pct');
  const bootEl = $('boot');
  if (!pct || !bootEl) return;
  if (!bootEl.classList.contains('is-counting')) {
    bootEl.classList.add('is-counting');
    const unit = pct.nextElementSibling;
    if (unit) unit.hidden = true;
  }
  const n = Math.max(1, Math.ceil(left * (3 / total)));
  if (pct.textContent !== String(n)) {
    pct.textContent = String(n);
    $('boot-status').textContent = `AUTO START — ${n}`;
    if (!reduced) gsap.fromTo(pct, { scale: 1.35, autoAlpha: 0.3 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'power3.out' });
  }
  const frac = ((left * (3 / total)) % 1) || (left > 0 ? 1 : 0);
  $('boot-ring').style.strokeDashoffset = String(100 - frac * 100);
  $('boot-actions')?.style.setProperty('--auto', (1 - left / total).toFixed(3));
}

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
      if (bootPin >= 0) progress = bootPin; // 검증용 고정
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
  $('boot-lock').textContent = 'LOCKED';
  actions.hidden = false;
  // 필름 리더처럼 3 · 2 · 1을 세고 저절로 들어간다(누르면 바로)
  if (!CAPTURE) {
    // 실제 흐른 시간으로 센다(느린 기기에서 애니메이션 시계가 늦어져도 제때 들어가도록)
    const total = reduced ? 1.2 : 3;
    const c0 = performance.now();
    const tick = () => {
      if (started) return;
      const left = Math.max(0, total - (performance.now() - c0) / 1000);
      countdown(left, total);
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
  leaveTl = irisOut($('boot'));
  // 느린 기기에서 프레임이 밀려도 부팅 화면이 오래 남지 않게(멈춰 둔 검증용 재생은 그대로)
  setTimeout(() => leaveTl?.isActive() && leaveTl.progress(1), 4000);
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
  // 주소에 장면이 있으면(#robotics 등) 그 장면으로, 없으면 처음부터 — 지난번 멈춘 곳이 있으면 이어 보기를 권한다
  const deep = scenes.findIndex((s) => `#${s.id}` === location.hash);
  director.go(deep > 0 ? deep : 0);
  if (deep <= 0) setTimeout(() => !site.open && guide.offerResume(), reduced ? 600 : 3200);
  site.markFilm();
  syncSoundHint();
  setTimeout(syncSoundHint, 900);
}

// 부팅 화면 걷기: 글자가 먼저 빠지고, 레티클이 화면 끝까지 열리며(아이리스 아웃) 필름이 드러난다
function irisOut(bootEl) {
  if (!bootEl) return null;
  const lr = bootLeader?.getBoundingClientRect();
  // 움직임을 줄이는 설정 · 레티클이 없으면 짧게 사라지기만
  if (reduced || !lr?.width) {
    return gsap.to(bootEl, { autoAlpha: 0, duration: reduced ? 0.25 : 0.8, ease: 'power2.inOut', onComplete: () => bootEl.remove() });
  }
  const cx = lr.left + lr.width / 2;
  const cy = lr.top + lr.height / 2;
  const r0 = lr.width * 0.46; // 진행 고리의 반지름(viewBox 92/200)
  const r1 = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 60;
  bootEl.style.setProperty('--ix', `${cx.toFixed(1)}px`);
  bootEl.style.setProperty('--iy', `${cy.toFixed(1)}px`);
  bootEl.style.setProperty('--ir', `${r0.toFixed(1)}px`);
  bootEl.classList.add('is-leaving');
  const copy = bootEl.querySelectorAll('.boot-copy > *, .boot-actions, .boot-lock, .boot-pct');
  const chrome = bootEl.querySelectorAll('.boot-top, .boot-bottom, .boot-log, .boot-corners');
  const tl = gsap.timeline({ onComplete: () => bootEl.remove() });
  const lite = document.documentElement.classList.contains('q-lite'); // 저사양: 흐림 없이
  tl.to(copy, { autoAlpha: 0, y: -10, ...(lite ? {} : { filter: 'blur(4px)' }), duration: 0.45, stagger: 0.04, ease: 'power2.in' }, 0)
    .to(chrome, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, 0)
    // 레티클 고리가 한 번 조여졌다가(숨 고르기) 화면 밖까지 열린다
    .to(bootLeader, { scale: 0.94, duration: 0.3, ease: 'power2.out' }, 0)
    .to(bootLeader, { autoAlpha: 0, duration: 0.25, ease: 'power1.in' }, 0.3)
    .set(bootEl.querySelector('.boot-iris'), { opacity: 1 }, 0.3)
    .fromTo(bootEl, { '--ir': `${r0 * 0.94}px` }, { '--ir': `${r1}px`, duration: 1.15, ease: 'power2.in' }, 0.3)
    .to(bootEl.querySelector('.boot-iris'), { opacity: 0, duration: 0.35, ease: 'power1.in' }, 1.1);
  return tl;
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

// 넘길 카드가 남았으면 덱을 살짝 끌어 보이고(옆으로), 아니면 화면을 위로 끌어 올려 보인다(아래로 넘기면 다음 장면).
// 휴대폰은 위로 밀면 바로 다음 장면이라 두 안내를 번갈아(장면 넘김부터)
let idleFlip = false;
function idleHint() {
  const reel = panels.current?.reel;
  const cardFirst = !coarse || (idleFlip = !idleFlip) === false;
  if (cardFirst && reel && reel.focus < reel.count - 1 && panels.peek() > 0) {
    guide.ghost('x', reel.card.getBoundingClientRect());
    return true;
  }
  if (director.index >= scenes.length - 1) return false;
  return guide.sceneHint(`다음 장면 · ${scenes[director.index + 1].ko}`, reel?.card?.getBoundingClientRect());
}

// 장면 넘김 안내: 덱의 마지막 카드에 손으로 닿았을 때 · 덱이 없는 장면에 들어와 머물 때 — 장면마다 한 번
const hintedScenes = new Set();
let sceneHintT = 0;
function hintNextScene(delay) {
  clearTimeout(sceneHintT);
  const i = director.index;
  if (i >= scenes.length - 1 || hintedScenes.has(i)) return;
  sceneHintT = setTimeout(() => {
    if (director.index !== i || director.trans || site.open || lightbox.open || hud.indexOpen) return;
    // 손으로 무언가 하는 중이면(카드를 넘기는 등) 손을 쉴 때까지 미룬다
    const busy = 1600 - (performance.now() - lastHand);
    if (busy > 0) return hintNextScene(busy + 60);
    // 손가락 · 마우스가 아직 화면을 끄는 중이면 놓을 때까지
    if (touchHold || document.documentElement.classList.contains('is-pulling')) return hintNextScene(600);
    if (guide.talking) return hintNextScene(900);
    const reel = panels.current?.reel;
    if (!coarse && reel && reel.focus < reel.count - 1) return; // 넘길 카드가 남았으면 카드 안내가 먼저(휴대폰은 위로 밀면 바로 다음 장면)
    if (!guide.sceneHint(`다음 장면 · ${scenes[i + 1].ko}`, reel?.card?.getBoundingClientRect())) return;
    hintedScenes.add(i);
    lastInput = performance.now(); // 손을 쉬는 안내(idleHint)가 곧바로 또 뜨지 않게
  }, delay);
}

// ── 렌더 루프 ──────────────────────────────────────────────
const timer = new THREE.Timer();
timer.connect(document);
let filmTime = 0;
let frame = 0;
let simTime = 0;
let frozen = false;
let acc3d = 0; // 3D를 건너뛴 프레임의 시간
let last3d = 0;
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
      const busy = director.trans || lightbox.open || hud.indexOpen || hoverHold || touchHold || deckFocus || site.open;
      const hold = holdOf(director.index);
      if (auto && hold > 0 && !busy) {
        elapsed += dt;
        panels.autoFocus(elapsed / hold);
      }
      hud.setProgress(hold > 0 ? elapsed / hold : 0);
      guide.setProgress(hold > 0 ? elapsed / hold : 0, auto && hold > 0);
      if (auto && hold > 0 && elapsed >= hold) goTo(director.index + 1);
      // 끌기 안내(보여 줄 때마다 다음 안내까지 더 오래 기다린다)
      const idleMs = performance.now() - lastInput;
      if (busy || auto) lastInput = Math.max(lastInput, performance.now() - 1000);
      else if (hintsLeft > 0 && idleMs > (coarse ? 7000 : 10000) * (5 - hintsLeft) && s.layout !== 'finale') {
        lastInput = performance.now();
        if (idleHint()) hintsLeft--;
      }
    }
  }
  if (!stage) return;
  if (pointerDirty && frame % 3 === 0) pick();
  const drawing = !(frozen || pageCovered) && (started || (booting && !!director?.bootFrame));
  perf.frame(now, drawing && !document.hidden);
  if (!drawing) return;
  // 3D 프레임 수 제한: 보통은 초당 60(120Hz 화면에서도 3D는 60이면 충분), 최소 단계는 30,
  // 장면을 거의 가리는 창(라이트박스 · 인덱스)이 열리면 20 — 건너뛴 시간은 모아 다음 3D 프레임에 한 번에 넘긴다
  // (카드 · 글자 같은 화면 움직임은 그대로 매 프레임)
  acc3d += dt;
  // 휴대폰에서 손가락이 카드 덱을 잡고 있는 동안은 30 — 카드가 손가락을 따라 매 프레임 움직일 여유를 GPU에 남긴다
  const cap = lightbox.open || hud.indexOpen ? 20 : touchHold && coarse ? Math.min(30, perf.settings.fps) : perf.settings.fps;
  if (now - last3d < 1000 / cap - 4) return;
  last3d = now;
  const d3 = Math.min(acc3d, 0.1);
  acc3d = 0;
  // 부팅 중: 반투명 부팅 화면 뒤로 격납고의 드론을 천천히 돌아본다(진행률만큼 밝아지고 다가간다)
  if (!started) {
    // 드론이 레티클 가운데에 오도록 — 레티클 위치를 매 프레임 재고 부드럽게 따라간다
    measureLeader(Math.min(1, d3 * 6));
    director.bootFrame(d3, t, bootProgress, bootFocusY, bootFocusX, bootFit);
    const u = stage.film.uniforms;
    u.uExposure.value += (0.32 + 0.6 * bootProgress - u.uExposure.value) * Math.min(1, d3 * 3);
    stage.dust.update(t);
    u.uTime.value = t;
    stage.composer.render(d3);
    return;
  }
  director.update(d3, t);
  trackLoop(d3);
  mood.update(d3);
  stage.dust.update(t);
  stage.film.uniforms.uTime.value = t;
  stage.composer.render(d3);
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
      measureLeader();
      for (let k = 0; k < sec / step; k++) {
        simTime += step;
        director.bootFrame(step, simTime, progress, bootFocusY, bootFocusX, bootFit);
      }
      stage.film.uniforms.uExposure.value = 0.32 + 0.6 * progress;
      stage.composer.render(step);
    },
    // 드론 · 카메라 위치(부팅 3D 확인용)
    probe: () => ({ drone: actors.drone.pos.toArray().map((v) => +v.toFixed(2)), cam: stage.camera.position.toArray().map((v) => +v.toFixed(2)), exposure: +stage.film.uniforms.uExposure.value.toFixed(2), booting }),
    // 부팅 화면의 진행률을 고정(0~1) · 해제(-1)
    bootAt: (p) => (bootPin = p),
    // 카운트다운 화면(n = 3 · 2 · 1, 그 초의 중간)
    bootCount: (n = 2) => countdown(n - 0.5, 3),
    // 아이리스 아웃을 멈추고 sec초 지점을 보여 준다
    leaveAt: (sec) => leaveTl?.pause().seek(sec),
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
