import '@fontsource-variable/space-grotesk';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/main.css';
import './styles/pages.css';
import './styles/premium.css';
import './styles/skills.css';
import './styles/about.css';
import './styles/journey.css';
import './styles/beats.css';
import './styles/guide.css';
import './styles/perf.css';
import './styles/clarity.css';

import * as THREE from 'three';
import gsap from 'gsap';
import { scenes, profile } from './content.js';
import { projects } from './data/projects.js';
import { AWARDS } from './data/awards.js';
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

// 세로 태블릿: 휴대폰 배치(세로 1100px까지 같은 배치)를 화면에 맞게 키운다 — 폭 600px · 높이 860px를 기준으로 최대 1.7배.
// 휴대폰 · 가로 화면 · 데스크톱은 1(main.css의 zoom: var(--tz)). 다른 resize 처리보다 먼저 맞춘다
function fitZoom() {
  const w = innerWidth;
  const h = innerHeight;
  const tz = w >= 600 && w <= 1100 && h > w ? Math.min(1.7, Math.max(1, Math.min(w / 600, h / 860))) : 1;
  if (tz > 1.01) document.documentElement.style.setProperty('--tz', tz.toFixed(3));
  else document.documentElement.style.removeProperty('--tz');
}
fitZoom();
addEventListener('resize', fitZoom);
const zoomOf = () => parseFloat(document.documentElement.style.getPropertyValue('--tz')) || 1;
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
      reframeTimer = setTimeout(() => {
        director.reframe();
        frameBeat();
      }, 200);
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
let leaveTl = null; // 시작할 때 부팅 화면이 위로 걷히는 움직임
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
  // 소개 · 이력의 화면(비트)이 바뀌면: 손으로 옮긴 화면이면 자동 재생 시계를 맞추고, 마지막 화면이면 다음 장면 안내
  onBeat: ({ index, prev, count, entry, auto: byAuto }) => {
    frameBeat();
    const h = holdOf(director?.index);
    if (h > 0 && !byAuto) elapsed = (h * index) / count;
    if (entry) return;
    if (!byAuto) takeOver();
    audio.pluck(index, index > prev ? 1 : -1);
    if (index === count - 1) hintNextScene(1600);
  },
});
// 장면 길이: 카드 덱이 있으면 카드마다 1.5초는 머물도록 늘린다(수상 덱처럼 카드가 많은 장면)
function holdOf(i) {
  const s = scenes[i];
  if (!(s?.hold > 0)) return 0;
  const beats = panels.panels[i]?.beats;
  return Math.max(s.hold, (panels.panels[i]?.reel?.count || 0) * 1.5, beats ? beats.count * (s.beatHold || 7) : 0);
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
  // route.scene: 프로필(/about)처럼 필름의 한 장면으로 가는 주소
  onClose: (route) => {
    pageCovered = false;
    if (route?.scene && started) goScene(route.scene, route.beat);
    if (!started) {
      if (route?.beat != null) pendingNav = { beat: route.beat };
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
  // 글을 읽는 장면(소개 · 성장 · 이력)은 읽기 모드 — 3D를 흐리고 밝게 띄워 글이 앞에 선다(크레인 이동과 함께 천천히)
  if (stage) gsap.to(stage.film.uniforms.uRead, { value: scenes[i]?.layout === 'beats' ? 1 : 0, duration: Math.max(0.6, duration * 0.8), ease: 'power2.inOut', overwrite: true });
}

// 주소의 장면(#robotics 등) — 예전 이력 장면 주소(#history)는 지금의 성장 · 이력 장면으로
function sceneOfHash(h) {
  return scenes.findIndex((s) => `#${s.id}` === h);
}

function goTo(i, opts) {
  if (!started) return false;
  return director.go(Math.max(0, Math.min(scenes.length - 1, i)), opts);
}

// 화면(비트)은 글 · 카드가 가운데에 서므로 드론을 제목 위 빈 띠의 가운데로 올린다 —
// 띠가 좁으면(세로 휴대폰의 카드 화면) 제자리(카드 뒤 가운데). 드론 제자리가 정해진 장면(소개)에서만 움직인다
function frameBeat() {
  if (!director) return;
  const el = panels.current;
  const top = el?.beats && el.querySelectorAll('.beat')[el.beats.index]?.querySelector('.bt-top');
  let at = null;
  if (top) {
    const hud = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top')) || 0) * zoomOf();
    const room = top.getBoundingClientRect().top - hud;
    if (room > 70) at = (hud + room / 2) / innerHeight;
  }
  director.frame(at);
}

// 이름으로 장면(과 그 안의 화면)으로 — 이미 그 장면이면 화면만 옮긴다
function goScene(id, beat) {
  const i = scenes.findIndex((s) => s.id === id);
  if (i < 0) return;
  if (i === director.index) {
    const beats = panels.current?.beats;
    if (beats && beat != null) beats.set(beats.indexOf(beat));
    return;
  }
  if (beat != null) pendingNav = { beat };
  goTo(i);
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
    const beats = panels.panels[i]?.beats;
    if (beats) {
      const k = beats.index + dir;
      if (k >= 0 && k < beats.count) return `${dir > 0 ? '다음' : '이전'} · ${beats.label(k)}`;
    }
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

// 성과 장면의 장학증서: 누르면 크게(라이트박스)
$('stage').addEventListener('click', (e) => {
  const b = e.target.closest('[data-honor]');
  if (!b) return;
  const sch = profile.scholarship;
  takeOver();
  lightbox.show({ media: [{ type: 'image', src: sch.sheet.src, caption: `${sch.title} 장학증서 — ${sch.date} · ${sch.by} (생년월일은 가림)` }] }, 0, b);
});
// 표지의 발표 순서: 누르면 그 장의 첫 장면으로
$('stage').addEventListener('click', (e) => {
  const b = e.target.closest('[data-scene-go]');
  if (!b) return;
  takeOver();
  goTo(+b.dataset.sceneGo);
});

// 주소의 장면을 손으로 바꾸면(#robotics 등) 그 장면으로
addEventListener('hashchange', () => {
  if (!started || site.open) return;
  const i = sceneOfHash(location.hash);
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

// ── 첫 화면 ────────────────────────────────────────────
// 네 장의 순서(장면의 chapter에서)와 바로 보기 줄(숫자는 데이터에서)을 채운다
function fillBoot() {
  const agenda = $('boot-agenda');
  if (agenda) {
    const seen = new Map();
    scenes.forEach((s) => s.chapter && !seen.has(s.chapter[0]) && seen.set(s.chapter[0], s.chapter[1]));
    agenda.innerHTML = [...seen].map(([no, ko]) => `<li><b>${no}</b>${ko}</li>`).join('');
  }
  const links = $('boot-links');
  if (links)
    links.innerHTML = [
      ['/works', '프로젝트', projects.length],
      ['/awards', '수상', AWARDS.length],
      ['/resume', '이력서 한 장', ''],
    ]
      .map(([href, label, n]) => `<a href="${href}" data-link>${label}${n !== '' ? `<b>${n}</b>` : ''}</a>`)
      .join('');
  if (profile.roleKo && $('boot-role')) $('boot-role').textContent = profile.roleKo;
}

async function boot() {
  const state = $('boot-state');
  const t0 = performance.now();
  booting = true;
  let ready = false;
  const bootEl = $('boot');
  // 준비 전에 누르거나 걷어 올렸다면 준비되는 즉시 들어간다
  let queued = false;
  const go = () => {
    if (pageCovered || started) return; // 작품 · 수상 페이지가 덮고 있으면 필름을 열지 않는다
    if (ready) return start(true);
    queued = true;
    state.textContent = '준비되는 대로 시작합니다';
  };
  const poke = () => {
    if (pageCovered) return;
    audio.unlock();
    go();
  };
  $('enter-sound').addEventListener('pointerdown', () => !pageCovered && audio.unlock());
  $('enter-sound').addEventListener('click', poke);
  // Enter · Space · ↓ · PageDown으로도 시작(링크 · 버튼에 포커스가 있으면 그 동작대로)
  addEventListener(
    'keydown',
    (e) => {
      if (started || !booting || e.repeat || pageCovered) return;
      if (!['Enter', ' ', 'ArrowDown', 'PageDown'].includes(e.key)) return;
      if (e.target.closest?.('a, button')) return;
      e.preventDefault();
      poke();
    },
    { capture: true }
  );
  bindLift(bootEl, go);
  let progress = 0;
  fillBoot();

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
      bootEl.style.setProperty('--p', progress.toFixed(3));
      if (!queued) state.textContent = `불러오는 중 ${Math.round(progress * 100)}%`;
      bootProgress = progress;
      if (progress >= 1 || started) resolve();
      else requestAnimationFrame(step);
    };
    step();
  });
  await work;
  // 상세 페이지에서 바로 필름을 열었다면 첫 화면은 이미 사라졌다
  if (started || !bootEl.isConnected) return;
  ready = true;
  if (queued && !pageCovered) return start(true);
  bootEl.classList.add('is-ready');
  state.textContent = '소리와 함께 시작합니다';
  // 버튼에 초점을 준다(그 사이 다른 곳을 눌렀다면 그대로 둔다)
  if (!document.activeElement || document.activeElement === document.body) $('enter-sound').focus({ preventScroll: true });
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
  leaveTl = splashUp($('boot'));
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
  const deep = sceneOfHash(location.hash);
  // 주소가 그 장면의 한 화면을 가리키면(route.beat) 그 화면부터
  if (deep > 0 && site.initial?.beat != null && !pendingNav) pendingNav = { beat: site.initial.beat };
  director.go(deep > 0 ? deep : 0);
  if (deep <= 0) setTimeout(() => !site.open && guide.offerResume(), reduced ? 600 : 3200);
  site.markFilm();
  syncSoundHint();
  setTimeout(syncSoundHint, 900);
}

// 부팅 화면 걷기(스플래시 업): 글자가 위로 빠지고, 화면 전체가 빛나는 아래 끝을 끌며 위로 걷혀 필름이 드러난다
function splashUp(bootEl) {
  if (!bootEl) return null;
  bootEl.classList.add('is-leaving');
  if (reduced) return gsap.to(bootEl, { autoAlpha: 0, duration: 0.25, ease: 'power1.out', onComplete: () => bootEl.remove() });
  const copy = bootEl.querySelectorAll('.boot-top, .boot-copy > *, .boot-actions > *, .boot-agenda, .boot-bottom');
  const lite = document.documentElement.classList.contains('q-lite'); // 저사양: 흐림 없이
  const tl = gsap.timeline({ onComplete: () => bootEl.remove() });
  tl.to(copy, { autoAlpha: 0, y: -28, ...(lite ? {} : { filter: 'blur(3px)' }), duration: 0.42, stagger: 0.04, ease: 'power2.in' }, 0)
    .to(bootLeader, { scale: 1.08, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 0)
    .to(bootEl, { y: -(innerHeight / zoomOf() + 48), duration: 1.05, ease: 'power3.inOut' }, 0.1);
  return tl;
}

// 부팅 화면을 위로 걷어 올려 시작: 휠을 내리거나 손가락으로 밀어 올리면(손가락을 따라 올라온다)
function bindLift(bootEl, go) {
  let wheel = 0;
  let wheelAt = 0;
  bootEl.addEventListener('wheel', (e) => {
    if (started || bootEl.scrollHeight > bootEl.clientHeight + 2) return; // 낮은 화면에서 스크롤되는 부팅 화면은 그대로
    const now = performance.now();
    if (now - wheelAt > 300) wheel = 0;
    wheelAt = now;
    wheel += e.deltaY;
    if (wheel > 40) go();
  }, { passive: true });
  let y0 = null;
  let dy = 0;
  let t0 = 0;
  // 스크롤되는 부팅 화면(가로로 눕힌 휴대폰)은 끝까지 내린 뒤에만 걷는다
  const atEnd = () => bootEl.scrollTop + bootEl.clientHeight >= bootEl.scrollHeight - 2;
  bootEl.addEventListener('touchstart', (e) => {
    if (started || e.touches.length > 1 || e.target.closest('button')) return (y0 = null);
    y0 = atEnd() ? e.touches[0].clientY : null;
    dy = 0;
    t0 = performance.now();
  }, { passive: true });
  bootEl.addEventListener('touchmove', (e) => {
    if (y0 == null || started) return;
    dy = Math.min(0, e.touches[0].clientY - y0);
    if (dy < -6) {
      e.preventDefault();
      bootEl.classList.add('is-lifting');
      gsap.set(bootEl, { y: reduced ? 0 : (dy * 0.85) / zoomOf() }); // 키운 화면(세로 태블릿)에서도 손가락만큼
    }
  }, { passive: false });
  const end = () => {
    if (y0 == null || started) return;
    y0 = null;
    const fast = dy < -40 && dy / Math.max(1, performance.now() - t0) < -0.5;
    if (dy < -Math.min(140, innerHeight * 0.16) || fast) {
      audio.unlock(); // 손을 떼는 순간은 브라우저가 소리를 허락하는 몸짓
      go();
      if (started) return;
    }
    bootEl.classList.remove('is-lifting');
    gsap.to(bootEl, { y: 0, duration: 0.5, ease: 'power3.out' });
  };
  bootEl.addEventListener('touchend', end);
  bootEl.addEventListener('touchcancel', end);
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
  const label = nextLabel();
  return label ? guide.sceneHint(label, hintRect()) : false;
}
// 넘김 안내(손끝)를 둘 자리: 카드가 있으면 카드 위, 화면(비트) 장면이면 글이 가운데를 차지하니 아래 화면 칸 바로 위
function hintRect() {
  const card = panels.current?.reel?.card;
  if (card) return card.getBoundingClientRect();
  const nav = panels.current?.beats && panels.current.querySelector('.beat-nav');
  if (!nav) return undefined;
  const r = nav.getBoundingClientRect();
  return { left: r.left, width: r.width, top: r.top - 70, height: 0 };
}
// 아래로 넘기면 무엇이 오는지: 화면(비트)이 남았으면 다음 화면, 아니면 다음 장면
function nextLabel() {
  const beats = panels.current?.beats;
  if (beats && beats.index < beats.count - 1) return `다음 · ${beats.label(beats.index + 1)}`;
  const j = director.index + 1;
  return j < scenes.length ? `다음 장면 · ${scenes[j].ko}` : null;
}

// 장면 넘김 안내: 덱의 마지막 카드에 손으로 닿았을 때 · 덱이 없는 장면에 들어와 머물 때 — 장면마다 한 번
const hintedScenes = new Set();
let sceneHintT = 0;
function hintNextScene(delay) {
  clearTimeout(sceneHintT);
  const i = director.index;
  const key = `${i}:${panels.current?.beats?.index ?? ''}`;
  if (i >= scenes.length - 1 || hintedScenes.has(key)) return;
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
    const label = nextLabel();
    if (!label || !guide.sceneHint(label, hintRect())) return;
    hintedScenes.add(key);
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
    // 걷히는 움직임을 멈추고 sec초 지점을 보여 준다
    leaveAt: (sec) => leaveTl?.pause().seek(sec),
    freeze: () => (frozen = true),
    // 모든 움직임을 k배로 느리게(전환 중간 모습 확인용)
    slow: (k = 0.1) => gsap.globalTimeline.timeScale(k),
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
