import * as THREE from 'three';
import { SETS } from './core/layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const add = (a, x, y, z) => a.clone().add(V(x, y, z));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// 장면별 카메라 숏. shift는 렌즈 시프트 — 모든 장면은 가운데 축 구성이라 x는 0, y로 제목(위)과 카드(아래) 사이 띠에 피사체를 둔다.
const SHOTS = {
  intro: { pos: add(SETS.hangar, 0, 2.1, 6.4), target: add(SETS.hangar, 0, 1.8, 0), fov: 34, shift: [0, 0.16] },
  prologue: { pos: add(SETS.hangar, 5.5, 3.4, 7.4), target: add(SETS.hangar, 0, 2.2, 0), fov: 36, shift: [0, 0] },
  ground: { pos: add(SETS.ground, 15.35, 9.0, 18.35), target: add(SETS.ground, -2.2, 1.2, -2.2), fov: 44, shift: [0, 0.2] },
  // 로보틱스: 덱 양옆의 두 무리(휴머노이드 + 4족 · 매니퓰레이터 작업 셀)를 조금 낮고 가깝게
  robotics: { pos: add(SETS.robotics, 0.2, 5.6, 12.0), target: add(SETS.robotics, 0.3, 0.9, -0.9), fov: 40, shift: [0, 0.12] },
  intelligence: { pos: add(SETS.core, 19.8, 3.24, 31.5), target: add(SETS.core, 0, 0, 0), fov: 40, shift: [0, 0.11] },
  // 제품 · 창업: 격납고 패드 위에 떠 있는 드론을 비스듬히 — 이륙 직전의 장면
  build: { pos: add(SETS.hangar, -13, 9.5, 21), target: add(SETS.hangar, 1.5, 3.2, -10), fov: 40, shift: [0.34, 0.16] },
  // 보도: 데이터 링크가 켜진 세계 전체를 높이서 — 소식이 세트마다 퍼져 나가는 장면
  press: { pos: V(0, 34, 52), target: V(0, 1, -8), fov: 44, shift: [0, 0.12] },
  record: { pos: add(SETS.record, -1.73, 6.05, 20.13), target: add(SETS.record, 0, 2.6, 0), fov: 40, shift: [0, 0.1] },
  finale: { pos: add(SETS.hangar, 0, 7.5, 17), target: add(SETS.hangar, 0, 2.8, -4), fov: 40, shift: [0, -0.085] },
};

export class Director {
  constructor({ stage, actors, scenes, reducedMotion, onTransition }) {
    this.stage = stage;
    this.a = actors;
    this.scenes = scenes;
    this.reducedMotion = reducedMotion;
    this.onTransition = onTransition;
    this.index = -1;
    this.sceneTime = 0;
    this.trans = null;
    this.camPos = SHOTS.intro.pos.clone().add(V(0, -0.8, 4));
    this.camTarget = SHOTS.intro.target.clone().add(V(0, -1.2, 0));
    this.fov = 30;
    this.shift = new THREE.Vector2(0, 0.1);
    // 비트 구도: 글만 있는 화면에서 드론이 머물 화면 높이(위에서부터 비율) · 그 장면에서 드론이 서는 자리
    this.droneAt = null;
    this.holdHome = null;
    this.ndc = new THREE.Vector2();
    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();
    this.drag = new THREE.Vector2();
    this.dragSmooth = new THREE.Vector2();
    this.flyover = this.makeFlyover();
    this.coreOrbit = this.makeOrbit(SETS.core, 5.4, 1.2);
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    // 세로 화면 지상 장면: 넓은 트랙에서 로버를 화면 안에 두기 위한 시선 추종
    this.follow = new THREE.Vector3();
    this.followOff = new THREE.Vector3();
    this.followW = 0;
    this.coreK = 1;
    this.raycaster = new THREE.Raycaster();
    this.lookPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
    // 화면 밖 세트 판정(카메라 시야 · 세트를 감싸는 구)
    this.frustum = new THREE.Frustum();
    this.viewProj = new THREE.Matrix4();
    this.sphere = new THREE.Sphere();
    this.lazyAcc = {};
  }

  get scene() {
    return this.scenes[this.index];
  }

  makeOrbit(c, r, h) {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push(V(c.x + Math.cos(a) * r, c.y + Math.sin(a * 2) * h, c.z + Math.sin(a) * r));
    }
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  }

  makeFlyover() {
    const pts = [SETS.hangar, SETS.aerial, SETS.ground, SETS.robotics, SETS.record].map((p) => p.clone().setY(7));
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  }

  shotFor(id) {
    const s = SHOTS[id];
    const aspect = this.stage.camera.aspect;
    const pos = s.pos.clone();
    const target = s.target.clone();
    let fov = s.fov;
    let shift = new THREE.Vector2(s.shift[0], s.shift[1]);
    if (aspect < 0.85) {
      // 세로 화면: 뒤로 물러나 화면 폭에 피사체를 담고, 제목(위)과 시트(아래) 사이 띠에 둔다
      if (id === 'robotics') {
        // 오른쪽 앞에서 비스듬히 — 양옆 무리가 겹쳐 좁아지고, 카드 위 빈 띠에 셋이 한 줄로 든다
        pos.sub(target).applyAxisAngle(THREE.Object3D.DEFAULT_UP, 0.4).add(target);
      }
      const pull = { press: 1.25, robotics: 1.9, record: 1.3, intro: 1.2 }[id] || 1.45;
      const back = pos.clone().sub(target).multiplyScalar(pull);
      pos.copy(target).add(back);
      fov += 8;
      const reel = this.scenes.find((x) => x.id === id)?.layout === 'reel';
      const stage = ['stage', 'beats'].includes(this.scenes.find((x) => x.id === id)?.layout);
      shift.set(0, id === 'finale' ? 0.45 : id === 'record' ? 0.12 : id === 'robotics' ? 0.2 : reel ? 0.06 : stage ? 0.02 : 0.2);
    } else if (aspect < 1.3) {
      const back = pos.clone().sub(target).multiplyScalar(1.15);
      pos.copy(target).add(back);
      shift.x *= 0.7;
    } else if (id === 'robotics' && aspect > 1.9) {
      // 낮고 넓은 화면: 휴머노이드 머리가 제목 줄에 닿지 않게 피사체를 조금 내린다
      shift.y = 0.05;
    } else if (id === 'record' && (innerHeight < 1000 || aspect > 1.9)) {
      // 낮은 화면: 적층 막대가 위쪽 수치 띠로 올라가지 않게(가로 휴대폰은 카드 줄 뒤로 내린다)
      shift.y = innerHeight < 500 ? -0.3 : 0.08;
    }
    return { pos, target, fov, shift };
  }

  // quick: 손으로 끌어 넘긴 전환 — 크레인 이동을 조금 짧게(손을 뗀 뒤 기다리는 시간이 길지 않게)
  go(index, { instant = false, quick = false } = {}) {
    if (index < 0 || index >= this.scenes.length) return false;
    if (index === this.index && !instant) return false;
    const prev = this.index;
    this.index = index;
    this.sceneTime = 0;
    const id = this.scene.id;
    const shot = this.shotFor(id);
    const from = { pos: this.camPos.clone(), target: this.camTarget.clone(), fov: this.fov, shift: this.shift.clone() };
    const dist = from.pos.distanceTo(shot.pos);
    let duration = instant ? 0 : quick ? THREE.MathUtils.clamp(1.4 + dist * 0.016, 1.6, 2.5) : THREE.MathUtils.clamp(1.9 + dist * 0.022, 2.1, 3.4);
    if (this.reducedMotion && !instant) duration = 1.2;
    const mid = from.pos.clone().lerp(shot.pos, 0.5);
    mid.y += Math.min(14, dist * 0.22);
    const path = new THREE.CatmullRomCurve3([from.pos, mid, shot.pos]);
    this.trans = { t: 0, duration, from, to: shot, path, dist, cut: this.reducedMotion };
    if (duration === 0) this.finishTransition();
    // 새 장면은 제자리에서 — 화면(비트)이 들어서며 다시 정한다(onTransition 안에서)
    this.droneAt = null;
    this.holdHome = null;
    this.enterScene(id, prev);
    this.onTransition?.(index, prev, duration);
    return true;
  }

  // 비트 구도: 드론을 화면 높이 y(위에서부터 0~1) 띠로 날려 보낸다 — 카메라 · 세트는 그대로, 드론만 오르내린다.
  // null이면 그 장면의 제자리로. 제자리가 정해진 장면(holdHome)에서만 움직인다
  frame(y) {
    this.droneAt = y;
  }

  // 부팅(로딩) 중: 격납고 위에 떠 있는 드론 둘레를 천천히 돈다 — 시작하면 이 자리에서 첫 장면으로 날아간다.
  // progress 0~1에 따라 조금씩 다가가고, (focusX, focusY)(화면 대비)에 드론이 오도록 렌즈를 옮긴다.
  // fit은 레티클 지름 / 화면 높이 — 드론이 레티클 안을 알맞게 채우는 거리로 물러선다.
  bootFrame(dt, t, progress, focusY = 0.42, focusX = 0.5, fit = 0) {
    const { drone, hangar } = this.a;
    if (!this.booting) {
      this.booting = true;
      drone.hold(add(SETS.hangar, 0, 0.3, 0), 0);
      drone.targetThrottle = 1;
      hangar.coneLevel = 1;
      this.bootAngle = -0.75;
    }
    // 로딩이 차오르는 만큼 드론이 패드에서 떠오른다 — 100%에서 첫 장면의 높이
    const lift = progress * progress * (3 - 2 * progress);
    drone.target.set(SETS.hangar.x, SETS.hangar.y + 0.3 + 1.45 * lift, SETS.hangar.z);
    this.bootAngle += dt * (this.reducedMotion ? 0 : 0.14);
    const portrait = this.stage.camera.aspect < 0.85;
    this.fov = portrait ? 40 : 34;
    // 드론 폭(약 1.45)이 레티클 고리 지름(0.92 · fit)의 60%쯤 되는 거리 — 다 차면 조금 더 다가선다
    const span = 1.45 / (0.6 * 0.92 * Math.max(0.12, fit || 0.27));
    const fitDist = span / (2 * Math.tan(THREE.MathUtils.degToRad(this.fov / 2)));
    const r = THREE.MathUtils.clamp(fitDist, 6, 22) + (1 - progress) * 1.6;
    const c = SETS.hangar;
    this.camTarget.set(c.x, c.y + 1.75, c.z);
    this.camPos.set(c.x + Math.sin(this.bootAngle) * r, c.y + 2.5 + progress * 0.5, c.z + Math.cos(this.bootAngle) * r);
    this.shift.set(focusX - 0.5, 0.5 - focusY);
    this.update(dt, t);
  }

  // 3D 코어의 화면 좌표(px) — 루프 장면의 고리가 따라간다
  coreOnScreen(out) {
    const cam = this.stage.camera;
    cam.updateMatrixWorld();
    this.tmp.copy(this.a.core.group.position).project(cam);
    out.set((this.tmp.x * 0.5 + 0.5) * innerWidth, (0.5 - this.tmp.y * 0.5) * innerHeight);
    return out;
  }

  // 연도별 3D 라벨은 넉넉한 가로 화면에서만 — 좁거나 낮은 화면에선 수치 아래 글줄(연도별 수상)이 대신한다
  fitRecordTags() {
    const aspect = this.stage.camera.aspect;
    this.a.records.showTags = aspect >= 0.85 && aspect <= 1.9 && innerHeight >= 860;
  }

  // 창 크기가 바뀌면 지금 장면의 구도를 다시 잡는다(세로 · 낮은 화면 구도가 바로 반영되게)
  reframe() {
    if (this.index < 0) return;
    this.fitRecordTags();
    if (this.trans) {
      this.reframePending = true;
      return;
    }
    const shot = this.shotFor(this.scene.id);
    this.camPos.copy(shot.pos);
    this.camTarget.copy(shot.target);
    this.fov = shot.fov;
    this.shift.copy(shot.shift);
  }

  finishTransition() {
    const { to } = this.trans;
    this.camPos.copy(to.pos);
    this.camTarget.copy(to.target);
    this.fov = to.fov;
    this.shift.copy(to.shift);
    this.trans = null;
    if (this.reframePending) {
      this.reframePending = false;
      this.reframe();
    }
    this.stage.film.uniforms.uTransition.value = 0;
  }

  // 장면에 들어설 때 배우들의 상태
  enterScene(id) {
    const { drone, hangar, ground, records, core, links, video } = this.a;
    drone.targetThrottle = 1;
    drone.stiffness = 1.4;
    hangar.coneLevel = id === 'intro' || id === 'finale' ? 1 : id === 'prologue' || id === 'build' ? 0.5 : 0;
    // 바닥 글자(00 — HANGAR, 02 — AERIAL)는 카드 · 제목과 겹쳐 모든 장면에서 끈다
    hangar.floorLevel = 0;
    this.a.aerial.floorLevel = 0;
    // 보도 장면: 세트를 잇는 데이터 링크가 켜져 소식이 퍼져 나가듯
    links.level = id === 'press' ? 1 : id === 'finale' ? 0.35 : 0;
    core.energy = id === 'intelligence' ? 1 : id === 'press' ? 0.5 : 0.15;
    if (id === 'record') {
      records.reveal = 0;
      records.revealTarget = 1;
      this.fitRecordTags();
    }
    if (id === 'ground') video.play?.().catch(() => {});
    else video.pause?.();
    this.landing = false;
    switch (id) {
      case 'intro':
        drone.hold(add(SETS.hangar, 0, 1.75, 0), 0);
        break;
      case 'prologue':
        this.holdHome = add(SETS.hangar, -0.4, 2.3, 0);
        drone.hold(this.holdHome, 0.5);
        break;
      case 'ground':
        drone.hold(add(SETS.ground, 0, 3.4, 0));
        break;
      case 'robotics':
        drone.hold(add(SETS.robotics, 0, 1.3, 0.5));
        break;
      case 'intelligence':
        drone.fly(this.coreOrbit, 0.035, 0.1);
        break;
      case 'build':
        drone.hold(add(SETS.hangar, 0.4, 2.9, 0), 0.6);
        break;
      case 'press':
        drone.fly(this.flyover, 0.022, 0.0);
        break;
      case 'record':
        drone.hold(add(SETS.record, 6.2, 4.0, 1.4));
        break;
      case 'finale':
        drone.hold(add(SETS.hangar, 0, 2.2, 0), 0);
        this.landing = true;
        break;
    }
  }

  update(dt, t) {
    const { drone, ground, robotics, aerial, hangar, core, records, links } = this.a;
    const cam = this.stage.camera;
    this.sceneTime += dt;
    const id = this.scene?.id;

    // 카메라 전환(크레인 이동)
    if (this.trans) {
      const tr = this.trans;
      tr.t += dt / tr.duration;
      const k = Math.min(1, tr.t);
      const e = easeInOut(k);
      if (tr.cut) {
        // 동작 줄이기: 암전 후 컷
        const cut = k > 0.5;
        const src = cut ? tr.to : tr.from;
        this.camPos.copy(src.pos);
        this.camTarget.copy(src.target);
        this.fov = src.fov;
        this.shift.copy(src.shift);
        this.stage.film.uniforms.uExposure.value = Math.abs(k - 0.5) * 2;
      } else {
        tr.path.getPoint(e, this.camPos);
        this.camTarget.lerpVectors(tr.from.target, tr.to.target, easeInOut(Math.min(1, k * 1.08)));
        this.fov = THREE.MathUtils.lerp(tr.from.fov, tr.to.fov, e);
        this.shift.lerpVectors(tr.from.shift, tr.to.shift, e);
        this.stage.film.uniforms.uTransition.value = Math.sin(k * Math.PI) * Math.min(1, tr.dist / 20);
      }
      if (k >= 1) this.finishTransition();
    }

    // 포인터 패럴랙스와 드래그 오빗
    this.pointerSmooth.lerp(this.pointer, Math.min(1, dt * 3));
    this.dragSmooth.lerp(this.drag, Math.min(1, dt * 6));
    const off = this.tmp.copy(this.camPos).sub(this.camTarget);
    const idleYaw = Math.sin(t * 0.07) * 0.05 - this.pointerSmooth.x * 0.07 - this.dragSmooth.x;
    off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, idleYaw);
    let lift = this.pointerSmooth.y * 0.5 + this.dragSmooth.y * off.length() * 0.6 + Math.sin(t * 0.11) * 0.15;
    if (id === 'finale' && !this.trans) {
      const ft = Math.min(this.sceneTime, 12);
      off.multiplyScalar(1 + ft * 0.004);
      lift += ft * 0.03;
    }
    const followOn = id === 'ground' && !this.trans && cam.aspect < 0.85;
    this.followW += ((followOn ? 1 : 0) - this.followW) * Math.min(1, dt * 1.2);
    this.followOff.set(0, 0, 0);
    if (this.followW > 0.001) {
      ground.roverWorldPosition(this.tmp2);
      if (this.followW < 0.02) this.follow.copy(this.tmp2);
      else this.follow.lerp(this.tmp2, Math.min(1, dt * 2));
      this.followOff.set(this.follow.x - this.camTarget.x, 0, this.follow.z - this.camTarget.z).multiplyScalar(0.6 * this.followW);
    }
    cam.position.copy(this.camTarget).add(off).add(this.followOff);
    cam.position.y = Math.max(0.6, cam.position.y + lift);
    cam.lookAt(this.tmp2.copy(this.camTarget).add(this.followOff));
    if (Math.abs(cam.fov - this.fov) > 1e-3) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    cam.setViewOffset(w, h, -this.shift.x * w, this.shift.y * h, w, h);
    // 비트 구도: 카메라가 자리 잡은 뒤, 제자리까지의 거리에서 화면 높이 droneAt을 지나는 점으로(스프링이 부드럽게 따라간다)
    if (this.holdHome && drone.mode === 'hold') {
      if (this.droneAt != null && !this.trans) {
        this.ndc.set(0, 1 - 2 * this.droneAt);
        cam.updateMatrixWorld();
        this.raycaster.setFromCamera(this.ndc, cam);
        this.raycaster.ray.at(cam.position.distanceTo(this.holdHome), drone.target);
      } else drone.target.copy(this.holdHome);
    }

    // 드론 — 이동 중엔 부드럽게, 도착 후엔 단단하게 목표를 추종
    drone.stiffness = Math.min(drone.mode === 'path' ? 4 : 5, 1.4 + this.sceneTime * 1.1);
    drone.pointer.copy(this.pointerSmooth);
    if (drone.mode === 'hold' && Math.hypot(drone.vel.x, drone.vel.z) < 1.2) {
      drone.faceYaw = Math.atan2(cam.position.x - drone.pos.x, cam.position.z - drone.pos.z);
    }
    if (id === 'ground') {
      ground.roverWorldPosition(this.tmp);
      drone.target.set(this.tmp.x, 3.3, this.tmp.z);
    }
    if (this.landing && this.sceneTime > 3.2) {
      drone.target.copy(add(SETS.hangar, 0, 0.27, 0));
      if (drone.pos.y < 0.45) drone.targetThrottle = 0;
    }

    // 강아지 로봇의 시선: 포인터가 가리키는 지면 지점
    this.raycaster.setFromCamera(this.pointerSmooth, cam);
    if (this.raycaster.ray.intersectPlane(this.lookPlane, robotics.lookWorld) === null) robotics.lookWorld.copy(cam.position);
    if (id !== 'robotics') robotics.lookWorld.copy(drone.pos);

    // 세로 화면에서는 코어 라벨이 장면 제목·수치와 겹치므로 숨긴다
    if (core.tag) core.tag.visible = cam.aspect >= 0.85 && id !== 'intelligence' && id !== 'press';
    // 오프닝·엔딩: 위쪽 가장자리·타임코드 뒤에 걸리는 코어를 부드럽게 접어 드론에 집중
    const hideCore = (id === 'intro' || id === 'finale' || id === 'build') && !this.trans;
    this.coreK += ((hideCore ? 0 : 1) - this.coreK) * Math.min(1, dt * 2.5);
    core.group.scale.setScalar(Math.max(0.001, this.coreK));
    core.group.visible = this.coreK > 0.01;

    drone.update(dt, t);
    // 화면 밖 세트는 0.25초에 한 번, 모아 둔 시간으로 움직인다 — 보이지 않는 로봇 관절 · 센서 계산을 아낀다
    cam.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.viewProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const pathU = drone.mode === 'path' && drone.path === aerial.curve ? drone.pathU : 0;
    const groundOn = id === 'ground' || (this.trans && this.scenes[this.index]?.id === 'ground');
    this.lazy('hangar', hangar, 12, dt, (d) => hangar.update(d, t));
    this.lazy('aerial', aerial, 18, dt, (d) => aerial.update(d, t, pathU));
    this.lazy('ground', ground, 16, dt, (d) => ground.update(d, t, groundOn));
    this.lazy('robotics', robotics, 12, dt, (d) => robotics.update(d, t, id === 'robotics'));
    this.lazy('core', core, 6, dt, (d) => core.update(d, t, this.pointerSmooth));
    this.lazy('records', records, 12, dt, (d) => records.update(d, t));
    links.update(dt, t);
  }

  // set: 세트(group) · r: 세트를 감싸는 반지름 — 시야에 걸리면 매 프레임, 아니면 0.25초마다
  lazy(key, set, r, dt, fn) {
    const acc = (this.lazyAcc[key] || 0) + dt;
    const seen = this.frustum.intersectsSphere(this.sphere.set(set.group.position, r));
    if (!seen && acc < 0.25) {
      this.lazyAcc[key] = acc;
      return;
    }
    this.lazyAcc[key] = 0;
    fn(Math.min(acc, 0.25));
  }
}
