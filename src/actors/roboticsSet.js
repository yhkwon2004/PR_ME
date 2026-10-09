import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats, glow, COLORS, contactShadow } from '../core/materials.js';
import { makeLabel, makeFloorText } from '../core/labels.js';

const clamp = THREE.MathUtils.clamp;
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);

// ── 4족보행 로봇 ─────────────────────────────────────────────
class Quadruped {
  constructor() {
    this.L1 = 0.32;
    this.L2 = 0.34;
    this.H = 0.52;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);

    const torso = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.2, 0.92, 4, 0.06), mats.shell);
    const belly = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.08, 0.8, 2, 0.03), mats.dark);
    belly.position.y = -0.11;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.7), mats.orange);
    spine.position.y = 0.11;
    const pack = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.08, 0.3, 2, 0.03), mats.body);
    pack.position.set(0, 0.13, -0.18);
    const packLed = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.012), mats.glowCyan);
    packLed.position.set(0, 0.17, -0.03);
    this.body.add(torso, belly, spine, pack, packLed);
    [-1, 1].forEach((s) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.5), mats.orange);
      side.position.set(s * 0.195, 0.0, 0);
      this.body.add(side);
    });

    // 머리
    this.head = new THREE.Group();
    this.head.position.set(0, 0.06, 0.5);
    const skull = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.16, 0.2, 3, 0.05), mats.body);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.012), mats.glowCyanSoft);
    visor.position.set(0, 0.015, 0.103);
    const eyes = [-0.06, 0.06].map((x) => {
      const e = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), mats.glowWhite);
      e.position.set(x, -0.04, 0.102);
      return e;
    });
    this.head.add(skull, visor, ...eyes);
    this.body.add(this.head);

    this.legs = [];
    const upperGeo = new RoundedBoxGeometry(0.07, this.L1, 0.09, 2, 0.025);
    const lowerGeo = new RoundedBoxGeometry(0.05, this.L2, 0.06, 2, 0.02);
    const jointGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 20);
    jointGeo.rotateZ(Math.PI / 2);
    const kneeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.09, 16);
    kneeGeo.rotateZ(Math.PI / 2);
    const footGeo = new THREE.SphereGeometry(0.045, 16, 12);
    [
      ['FL', 0.25, 0.34, 0],
      ['FR', -0.25, 0.34, 0.5],
      ['RL', 0.25, -0.34, 0.5],
      ['RR', -0.25, -0.34, 0],
    ].forEach(([name, x, z, offset]) => {
      const hip = new THREE.Group();
      hip.position.set(x, -0.02, z);
      hip.add(new THREE.Mesh(jointGeo, mats.dark));
      const thigh = new THREE.Group();
      hip.add(thigh);
      const upper = new THREE.Mesh(upperGeo, mats.orange);
      upper.position.y = -this.L1 / 2;
      thigh.add(upper);
      const knee = new THREE.Group();
      knee.position.y = -this.L1;
      thigh.add(knee);
      knee.add(new THREE.Mesh(kneeGeo, mats.dark));
      const lower = new THREE.Mesh(lowerGeo, mats.body);
      lower.position.y = -this.L2 / 2;
      knee.add(lower);
      const foot = new THREE.Mesh(footGeo, mats.rubber);
      foot.position.y = -this.L2;
      knee.add(foot);
      this.body.add(hip);
      this.legs.push({ name, hip, thigh, knee, offset });
    });

    this.shadow = contactShadow(1.8, 0.6);
    this.root.add(this.shadow);

    this.hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = 0.5;
    this.hit.userData.actor = this;
    this.root.add(this.hit);

    this.gaitT = 0;
    this.walk = 1;
    this.hopT = -1;
    this.look = new THREE.Vector3();
  }

  get label() {
    return { title: 'QUADRUPED · TROT GAIT', sub: '2-link IK — click to hop' };
  }

  poke() {
    if (this.hopT < 0) this.hopT = 0;
  }

  solve(z, y) {
    const { L1, L2 } = this;
    const d = clamp(Math.hypot(z, y), 0.08, L1 + L2 - 0.002);
    const phi = Math.atan2(z, -y);
    const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const gamma = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    return [alpha - phi, -(Math.PI - gamma)];
  }

  update(dt, t, walking) {
    this.walk += ((walking ? 1 : 0) - this.walk) * Math.min(1, dt * 2);
    const T = 0.6;
    const S = 0.11;
    const lift = 0.09;
    this.gaitT += dt;
    let H = this.H;
    let air = 0;
    if (this.hopT >= 0) {
      this.hopT += dt / 0.9;
      const p = this.hopT;
      if (p < 0.3) H -= 0.13 * Math.sin((p / 0.3) * (Math.PI / 2));
      else if (p < 1) {
        air = Math.sin(((p - 0.3) / 0.7) * Math.PI);
        H -= 0.13 * (1 - Math.min(1, (p - 0.3) / 0.15));
      } else this.hopT = -1;
    }
    for (const leg of this.legs) {
      const ph = ((this.gaitT / T + leg.offset) % 1 + 1) % 1;
      let fz, fy;
      if (ph < 0.5) {
        fz = S - 2 * S * (ph / 0.5);
        fy = -H;
      } else {
        const s = (ph - 0.5) / 0.5;
        fz = -S + 2 * S * (0.5 - 0.5 * Math.cos(Math.PI * s));
        fy = -H + lift * Math.sin(Math.PI * s);
      }
      fz *= this.walk;
      fy = -H + (fy + H) * this.walk + air * 0.12;
      const [a, k] = this.solve(fz, fy);
      leg.thigh.rotation.x = a;
      leg.knee.rotation.x = k;
    }
    const bob = Math.sin((this.gaitT / T) * Math.PI * 4) * 0.012 * this.walk;
    this.body.position.y = H + 0.045 + bob + air * 0.42;
    this.body.rotation.x = air * -0.12;
    this.shadow.scale.setScalar(1 - air * 0.35);

    // 머리는 시선 목표를 따라 회전
    const local = this.root.worldToLocal(this.look.clone());
    const yaw = clamp(Math.atan2(local.x, local.z - 0.5), -0.7, 0.7);
    const pitch = clamp(-Math.atan2(local.y - 0.6, Math.hypot(local.x, local.z)) * 0.6, -0.35, 0.3);
    this.head.rotation.y += (yaw - this.head.rotation.y) * Math.min(1, dt * 4);
    this.head.rotation.x += (pitch - this.head.rotation.x) * Math.min(1, dt * 4);
  }
}

// ── 6축 로봇팔 ──────────────────────────────────────────────
class RobotArm {
  constructor() {
    this.L1 = 0.95;
    this.L2 = 0.8;
    this.Lt = 0.21;
    this.shoulderY = 0.42;
    this.root = new THREE.Group();

    const plinth = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.3, 2.6, 2, 0.04), mats.body);
    plinth.position.set(0, -0.15, 0.55);
    this.root.add(plinth);
    // 플린스 윗면 테두리
    const edgeMat = glow(COLORS.orange, 2.2);
    [[0, -0.75, 3.22, 0.02], [0, 1.85, 3.22, 0.02], [-1.6, 0.55, 0.02, 2.62], [1.6, 0.55, 0.02, 2.62]].forEach(([x, z, w, d]) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), edgeMat);
      e.position.set(x, 0.002, z);
      this.root.add(e);
    });
    // 작업 위치 마커
    this.A = new THREE.Vector3(-1.0, 0.1, 0.78);
    this.B = new THREE.Vector3(1.0, 0.1, 0.78);
    [this.A, this.B].forEach((p) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.23, 4, 1), glow(COLORS.cyan, 1.6));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.PI / 4;
      m.position.set(p.x, 0.005, p.z);
      this.root.add(m);
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.14, 40), mats.dark);
    base.position.y = 0.07;
    this.root.add(base);
    this.turn = new THREE.Group();
    this.turn.position.y = 0.14;
    this.root.add(this.turn);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.24, 36), mats.orange);
    turret.position.y = 0.12;
    this.turn.add(turret);

    const jGeo = (r, l) => {
      const g = new THREE.CylinderGeometry(r, r, l, 28);
      g.rotateZ(Math.PI / 2);
      return g;
    };
    this.shoulder = new THREE.Group();
    this.shoulder.position.y = this.shoulderY - 0.14;
    this.turn.add(this.shoulder);
    this.shoulder.add(new THREE.Mesh(jGeo(0.15, 0.34), mats.dark));
    const upper = new THREE.Mesh(new RoundedBoxGeometry(0.2, this.L1, 0.22, 3, 0.06), mats.orange);
    upper.position.y = this.L1 / 2;
    this.shoulder.add(upper);

    this.elbow = new THREE.Group();
    this.elbow.position.y = this.L1;
    this.shoulder.add(this.elbow);
    this.elbow.add(new THREE.Mesh(jGeo(0.12, 0.3), mats.dark));
    const fore = new THREE.Mesh(new RoundedBoxGeometry(0.15, this.L2, 0.16, 3, 0.05), mats.shell);
    fore.position.y = this.L2 / 2;
    this.elbow.add(fore);
    const foreLed = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.3, 0.01), mats.glowCyanSoft);
    foreLed.position.set(0, this.L2 * 0.45, 0.081);
    this.elbow.add(foreLed);

    this.wrist = new THREE.Group();
    this.wrist.position.y = this.L2;
    this.elbow.add(this.wrist);
    this.wrist.add(new THREE.Mesh(jGeo(0.075, 0.2), mats.dark));
    this.roll = new THREE.Group();
    this.wrist.add(this.roll);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 24), mats.metal);
    flange.position.y = 0.04;
    const gbase = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.06, 0.11, 2, 0.02), mats.body);
    gbase.position.y = 0.09;
    this.roll.add(flange, gbase);
    const fGeo = new RoundedBoxGeometry(0.03, 0.16, 0.08, 2, 0.01);
    this.fingers = [-1, 1].map((s) => {
      const f = new THREE.Mesh(fGeo, mats.dark);
      f.position.set(s * 0.17, 0.2, 0);
      this.roll.add(f);
      return f;
    });
    this.grip = 0;

    // 물체(큐브)
    this.cube = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.2, 0.2, 2, 0.02), mats.shell);
    const cubeMark = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.04, 0.205), mats.orange);
    this.cube.add(cubeMark);
    this.cube.position.copy(this.A);
    this.cube.rotation.y = Math.atan2(this.A.x, this.A.z);
    this.root.add(this.cube);
    this.bbox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 0.34, 0.34)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(2.6) })
    );
    this.root.add(this.bbox);
    this.tag = makeLabel(['OBJECT · cube', 'conf 0.96 · grasp ok'], { width: 420, height: 110, size: 30 });
    this.tag.scale.multiplyScalar(1.6);
    this.root.add(this.tag);

    this.hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = 1.1;
    this.hit.userData.actor = this;
    this.root.add(this.hit);

    this.from = this.A;
    this.to = this.B;
    this.home = new THREE.Vector3(0, 1.25, 0.95);
    this.cur = this.home.clone();
    this.buildSeq();
    this.waveT = -1;
  }

  get label() {
    return { title: '6-AXIS ARM · VISION PICK', sub: 'IK pick & place — click to wave' };
  }

  poke() {
    if (this.waveT < 0) this.waveT = 0;
  }

  buildSeq() {
    const above = (p) => new THREE.Vector3(p.x, 0.78, p.z);
    const at = (p) => p.clone();
    this.seq = [
      { p: above(this.from), d: 1.1 },
      { p: at(this.from), d: 0.75 },
      { grip: 1, d: 0.4 },
      { p: above(this.from), d: 0.65 },
      { p: above(this.to), d: 1.4 },
      { p: at(this.to), d: 0.75 },
      { grip: 0, d: 0.4 },
      { p: above(this.to), d: 0.6 },
      { p: this.home.clone(), d: 1.0 },
      { wait: 1, d: 0.7 },
    ];
    this.step = 0;
    this.stepT = 0;
    this.stepFrom = this.cur.clone();
  }

  toCyl(v) {
    return { yaw: Math.atan2(v.x, v.z), r: Math.hypot(v.x, v.z), y: v.y };
  }

  solve(p) {
    const { L1, L2, Lt, shoulderY } = this;
    const yaw = Math.atan2(p.x, p.z);
    const r = Math.hypot(p.x, p.z);
    const wy = p.y + Lt - shoulderY;
    const d = clamp(Math.hypot(r, wy), 0.25, L1 + L2 - 0.01);
    const beta = Math.atan2(r, wy);
    const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const gamma = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const t1 = beta - alpha;
    const t2 = Math.PI - gamma;
    this.turn.rotation.y = yaw;
    this.shoulder.rotation.x = t1;
    this.elbow.rotation.x = t2;
    this.wrist.rotation.x = Math.PI - t1 - t2;
    return yaw;
  }

  update(dt, t) {
    const s = this.seq[this.step];
    this.stepT += dt / s.d;
    const k = smoother(Math.min(1, this.stepT));
    if (s.p) {
      const a = this.toCyl(this.stepFrom);
      const b = this.toCyl(s.p);
      let dy = b.yaw - a.yaw;
      if (dy > Math.PI) dy -= Math.PI * 2;
      if (dy < -Math.PI) dy += Math.PI * 2;
      const yaw = a.yaw + dy * k;
      const r = a.r + (b.r - a.r) * k;
      this.cur.set(Math.sin(yaw) * r, a.y + (b.y - a.y) * k, Math.cos(yaw) * r);
    } else if (s.grip !== undefined) {
      this.grip += (s.grip - this.grip) * Math.min(1, dt * 10);
      if (s.grip === 1 && k > 0.5) this.holding = true;
      if (s.grip === 0 && k > 0.3) this.holding = false;
    }
    let target = this.cur;
    if (this.waveT >= 0) {
      this.waveT += dt / 2.2;
      const w = Math.sin(Math.min(1, this.waveT) * Math.PI);
      target = this.cur.clone().lerp(new THREE.Vector3(Math.sin(t * 5) * 0.35, 1.55, 0.85), w);
      if (this.waveT >= 1) this.waveT = -1;
    }
    const yaw = this.solve(target);
    this.roll.rotation.y = Math.sin(t * 0.7) * 0.05;
    const open = 0.17 - this.grip * 0.055;
    this.fingers[0].position.x = -open;
    this.fingers[1].position.x = open;

    if (this.holding) {
      this.cube.position.set(target.x, target.y, target.z);
      this.cube.rotation.y = yaw;
    }
    this.bbox.position.copy(this.cube.position);
    this.bbox.rotation.y = this.cube.rotation.y;
    this.tag.position.set(this.cube.position.x, this.cube.position.y + 0.55, this.cube.position.z);

    if (this.stepT >= 1) {
      this.step++;
      this.stepT = 0;
      this.stepFrom = this.cur.clone();
      if (this.step >= this.seq.length) {
        [this.from, this.to] = [this.to, this.from];
        this.buildSeq();
      }
    }
  }
}

export class RoboticsSet {
  constructor(center) {
    this.group = new THREE.Group();
    this.group.position.copy(center);

    const deck = new THREE.Mesh(new THREE.CircleGeometry(7.2, 96), mats.pad);
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = 0.01;
    const ring = new THREE.Mesh(new THREE.RingGeometry(7.15, 7.25, 128), glow(COLORS.orange, 2));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    const inner = new THREE.Mesh(new THREE.RingGeometry(1.86, 1.9, 96), glow(COLORS.cyan, 0.9));
    inner.rotation.x = -Math.PI / 2;
    this.walkCenter = new THREE.Vector3(-1.0, 0, 1.8);
    this.walkR = 1.9;
    inner.position.set(this.walkCenter.x, 0.025, this.walkCenter.z);
    this.group.add(deck, ring, inner);

    const floor = makeFloorText('04 — ROBOTICS', { size: 120, color: 'rgba(255,107,26,0.32)' });
    floor.scale.setScalar(3);
    floor.position.set(0, 0.03, 8.8);
    this.group.add(floor);

    this.dog = new Quadruped();
    this.dogScale = 1.3;
    this.dog.root.scale.setScalar(this.dogScale);
    this.group.add(this.dog.root);
    this.arm = new RobotArm();
    this.arm.root.position.set(2.8, 0.3, -1.4);
    this.arm.root.rotation.y = -0.35;
    this.group.add(this.arm.root);

    // 비전 카메라 리그 — 로봇팔 작업 영역을 비스듬히 내려다본다
    const rig = new THREE.Group();
    rig.position.set(5.2, 0, -3.6);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.4, 10), mats.body);
    pole.position.y = 1.7;
    rig.add(pole);
    this.group.add(rig);
    const eye = new THREE.Group();
    eye.position.set(0, 3.4, 0);
    rig.add(eye);
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.3, 2, 0.04), mats.dark);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), mats.glowCyan);
    lens.position.z = 0.152;
    const fGeo = new THREE.ConeGeometry(0.9, 3.6, 4, 1, true);
    fGeo.translate(0, -1.8, 0);
    fGeo.rotateX(-Math.PI / 2);
    fGeo.rotateZ(Math.PI / 4);
    const frustum = new THREE.Mesh(
      fGeo,
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    const fEdges = new THREE.LineSegments(new THREE.EdgesGeometry(fGeo), new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.3 }));
    eye.add(head, lens, frustum, fEdges);
    // 작업 영역(팔 앞쪽)을 향하도록
    this.group.updateMatrixWorld(true);
    const aim = new THREE.Vector3(2.9, 0.4, -0.5);
    eye.lookAt(this.group.localToWorld(aim));

    this.angle = 0;
    this.lookWorld = new THREE.Vector3();
  }

  update(dt, t, active) {
    const walking = this.dog.hopT < 0;
    if (walking) this.angle += (dt * 0.73 * this.dogScale * this.dog.walk) / this.walkR;
    const a = this.angle;
    const c = this.walkCenter;
    this.dog.root.position.set(c.x + Math.cos(a) * this.walkR, 0, c.z + Math.sin(a) * this.walkR);
    // 원을 따라 반시계 방향 진행
    this.dog.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
    this.dog.look.copy(this.lookWorld);
    this.dog.update(dt, t, walking);
    this.arm.update(dt, t);
  }
}
