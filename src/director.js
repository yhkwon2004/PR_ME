import * as THREE from 'three';
import { SETS } from './core/layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const add = (a, x, y, z) => a.clone().add(V(x, y, z));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// 장면별 카메라 숏. shift는 렌즈 시프트 — 모든 장면은 가운데 축 구성이라 x는 0, y로 제목(위)과 카드(아래) 사이 띠에 피사체를 둔다.
const SHOTS = {
  intro: { pos: add(SETS.hangar, 0, 2.1, 6.4), target: add(SETS.hangar, 0, 1.8, 0), fov: 34, shift: [0, 0.16] },
  prologue: { pos: add(SETS.hangar, 5.5, 3.4, 7.4), target: add(SETS.hangar, 0, 2.2, 0), fov: 36, shift: [0, 0] },
  aerial: { pos: add(SETS.aerial, 14.3, 10.03, 20.8), target: add(SETS.aerial, 0, 3.4, 0), fov: 42, shift: [0, 0.1] },
  ground: { pos: add(SETS.ground, 15.35, 9.0, 18.35), target: add(SETS.ground, -2.2, 1.2, -2.2), fov: 44, shift: [0, 0.2] },
  robotics: { pos: add(SETS.robotics, 0.175, 7.525, 14.975), target: add(SETS.robotics, 0.3, 0.9, -0.9), fov: 40, shift: [0, 0.18] },
  intelligence: { pos: add(SETS.core, 19.8, 3.24, 31.5), target: add(SETS.core, 0, 0, 0), fov: 40, shift: [0, 0.11] },
  loop: { pos: V(0, 44, 50), target: V(0, 1, -6), fov: 44, shift: [0, -0.03] },
  record: { pos: add(SETS.record, -1.73, 6.05, 20.13), target: add(SETS.record, 0, 2.6, 0), fov: 40, shift: [0, 0.045] },
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
        // 걷는 개와 로봇팔의 가운데를 겨눈다
        target.x -= 0.8;
        pos.x -= 0.8;
      }
      const pull = { loop: 1.25, robotics: 1.7, record: 1.3, intro: 1.2 }[id] || 1.45;
      const back = pos.clone().sub(target).multiplyScalar(pull);
      pos.copy(target).add(back);
      fov += 8;
      const reel = this.scenes.find((x) => x.id === id)?.layout === 'reel';
      const stage = this.scenes.find((x) => x.id === id)?.layout === 'stage';
      shift.set(0, id === 'finale' ? 0.45 : id === 'record' ? 0.12 : reel ? 0.06 : stage ? 0.02 : 0.2);
    } else if (aspect < 1.3) {
      const back = pos.clone().sub(target).multiplyScalar(1.15);
      pos.copy(target).add(back);
      shift.x *= 0.7;
    }
    return { pos, target, fov, shift };
  }

  go(index, { instant = false } = {}) {
    if (index < 0 || index >= this.scenes.length) return false;
    if (index === this.index && !instant) return false;
    const prev = this.index;
    this.index = index;
    this.sceneTime = 0;
    const id = this.scene.id;
    const shot = this.shotFor(id);
    const from = { pos: this.camPos.clone(), target: this.camTarget.clone(), fov: this.fov, shift: this.shift.clone() };
    const dist = from.pos.distanceTo(shot.pos);
    let duration = instant ? 0 : THREE.MathUtils.clamp(1.9 + dist * 0.022, 2.1, 3.4);
    if (this.reducedMotion && !instant) duration = 1.2;
    const mid = from.pos.clone().lerp(shot.pos, 0.5);
    mid.y += Math.min(14, dist * 0.22);
    const path = new THREE.CatmullRomCurve3([from.pos, mid, shot.pos]);
    this.trans = { t: 0, duration, from, to: shot, path, dist, cut: this.reducedMotion };
    if (duration === 0) this.finishTransition();
    this.enterScene(id, prev);
    this.onTransition?.(index, prev, duration);
    return true;
  }

  finishTransition() {
    const { to } = this.trans;
    this.camPos.copy(to.pos);
    this.camTarget.copy(to.target);
    this.fov = to.fov;
    this.shift.copy(to.shift);
    this.trans = null;
    this.stage.film.uniforms.uTransition.value = 0;
  }

  // 장면에 들어설 때 배우들의 상태
  enterScene(id) {
    const { drone, hangar, ground, records, core, links, video } = this.a;
    drone.targetThrottle = 1;
    drone.stiffness = 1.4;
    hangar.coneLevel = id === 'intro' || id === 'finale' ? 1 : id === 'prologue' ? 0.5 : 0;
    // 바닥 글자(00 — HANGAR, 02 — AERIAL)는 전체 지도를 보는 루프 장면에서만 — 다른 장면에선 제목·버튼과 겹친다
    hangar.floorLevel = id === 'loop' ? 1 : 0;
    this.a.aerial.floorLevel = id === 'loop' ? 1 : 0;
    links.level = id === 'loop' ? 1 : id === 'finale' ? 0.35 : 0;
    core.energy = id === 'intelligence' ? 1 : id === 'loop' ? 0.5 : 0.15;
    if (id === 'record') {
      records.reveal = 0;
      records.revealTarget = 1;
    }
    if (id === 'ground') video.play?.().catch(() => {});
    else video.pause?.();
    this.landing = false;
    switch (id) {
      case 'intro':
        drone.hold(add(SETS.hangar, 0, 1.75, 0), 0);
        break;
      case 'prologue':
        drone.hold(add(SETS.hangar, -0.4, 2.3, 0), 0.5);
        break;
      case 'aerial':
        drone.fly(this.a.aerial.curve, 0.032, 0.0);
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
      case 'loop':
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
    if (core.tag) core.tag.visible = cam.aspect >= 0.85 && id !== 'intelligence';
    // 오프닝·엔딩: 위쪽 가장자리·타임코드 뒤에 걸리는 코어를 부드럽게 접어 드론에 집중
    const hideCore = (id === 'intro' || id === 'finale') && !this.trans;
    this.coreK += ((hideCore ? 0 : 1) - this.coreK) * Math.min(1, dt * 2.5);
    core.group.scale.setScalar(Math.max(0.001, this.coreK));
    core.group.visible = this.coreK > 0.01;

    drone.update(dt, t);
    hangar.update(dt, t);
    aerial.update(dt, t, drone.mode === 'path' && drone.path === aerial.curve ? drone.pathU : 0);
    ground.update(dt, t, id === 'ground' || (this.trans && this.scenes[this.index]?.id === 'ground'));
    robotics.update(dt, t, id === 'robotics');
    core.update(dt, t, this.pointerSmooth);
    records.update(dt, t);
    links.update(dt, t);
  }
}
