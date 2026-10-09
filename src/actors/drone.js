import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats, glow, COLORS } from '../core/materials.js';

const TAU = Math.PI * 2;
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

function angleLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

// 쿼드콥터 — 영화 전체를 따라다니는 주인공.
export class Drone {
  constructor() {
    this.root = new THREE.Group();
    this.yawG = new THREE.Group();
    this.tiltG = new THREE.Group();
    this.root.add(this.yawG);
    this.yawG.add(this.tiltG);
    this.root.name = 'drone';

    this.pos = new THREE.Vector3(0, 0.25, 34);
    this.vel = new THREE.Vector3();
    this.target = this.pos.clone();
    this.yaw = Math.PI;
    this.faceYaw = Math.PI;
    this.throttle = 0;
    this.targetThrottle = 0;
    this.mode = 'hold';
    this.path = null;
    this.pathU = 0;
    this.pathSpeed = 0.04;
    this.stiffness = 5;
    this.flipT = -1;
    this.pointer = new THREE.Vector2();
    this.props = [];
    this.leds = [];

    this.build();
    this.root.position.copy(this.pos);
  }

  build() {
    const g = this.tiltG;
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.13, 0.64, 4, 0.05), mats.body);
    g.add(body);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 16, 0, TAU, 0, Math.PI / 2), mats.shell);
    shell.scale.set(1, 0.5, 1.45);
    shell.position.y = 0.06;
    g.add(shell);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.6), mats.orange);
    stripe.position.y = 0.165;
    g.add(stripe);
    const batt = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.06, 0.28, 2, 0.02), mats.dark);
    batt.position.set(0, -0.09, -0.02);
    g.add(batt);

    // 측면 상태 라이트
    [-1, 1].forEach((s) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.36), mats.glowCyan);
      strip.position.set(s * 0.222, 0.0, 0.02);
      g.add(strip);
    });

    const R = 0.64;
    const armGeo = new THREE.BoxGeometry(0.055, 0.035, R);
    const motorGeo = new THREE.CylinderGeometry(0.055, 0.06, 0.08, 24);
    const capGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16);
    const bladeGeo = new THREE.BoxGeometry(0.52, 0.006, 0.045);
    const discGeo = new THREE.CircleGeometry(0.27, 48);
    const guardGeo = new THREE.TorusGeometry(0.29, 0.009, 8, 64);
    const ledGeo = new THREE.SphereGeometry(0.022, 12, 8);

    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * (Math.PI / 2);
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const arm = new THREE.Mesh(armGeo, mats.body);
      arm.position.copy(dir).multiplyScalar(R / 2 + 0.06);
      arm.rotation.y = a;
      g.add(arm);

      const mPos = dir.clone().multiplyScalar(R);
      const motor = new THREE.Mesh(motorGeo, mats.dark);
      motor.position.copy(mPos).setY(0.02);
      g.add(motor);
      const cap = new THREE.Mesh(capGeo, mats.orange);
      cap.position.copy(mPos).setY(0.075);
      g.add(cap);

      const prop = new THREE.Group();
      prop.position.copy(mPos).setY(0.08);
      const b1 = new THREE.Mesh(bladeGeo, mats.dark);
      b1.rotation.x = 0.12;
      const b2 = b1.clone();
      b2.rotation.y = Math.PI / 2;
      prop.add(b1, b2);
      const disc = new THREE.Mesh(
        discGeo,
        new THREE.MeshBasicMaterial({ color: 0x9fdfff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
      );
      disc.rotation.x = -Math.PI / 2;
      prop.add(disc);
      g.add(prop);
      this.props.push({ group: prop, blades: [b1, b2], disc, dir: i % 2 ? 1 : -1 });

      const guard = new THREE.Mesh(guardGeo, mats.body);
      guard.rotation.x = Math.PI / 2;
      guard.position.copy(mPos).setY(0.08);
      g.add(guard);

      // 앞은 청록, 뒤는 주황 항법등
      const front = dir.z > 0;
      const led = new THREE.Mesh(ledGeo, front ? mats.glowCyan : glow(COLORS.orange, 6));
      led.position.copy(mPos).setY(-0.035);
      g.add(led);
      this.leds.push(led);
    }

    // 짐벌 카메라
    const gimbal = new THREE.Group();
    gimbal.position.set(0, -0.1, 0.27);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), mats.dark);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 20), mats.glass);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.055;
    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), mats.glowCyan);
    lensRing.position.z = 0.07;
    gimbal.add(ball, lens, lensRing);
    g.add(gimbal);
    this.gimbal = gimbal;

    // 착륙 스키드
    [-1, 1].forEach((s) => {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 8), mats.dark);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(s * 0.17, -0.24, 0);
      g.add(skid);
      [-1, 1].forEach((t) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.17, 0.018), mats.dark);
        leg.position.set(s * 0.15, -0.16, t * 0.14);
        leg.rotation.z = s * 0.25;
        g.add(leg);
      });
    });

    // 레이캐스트용 보이지 않는 히트 박스
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.7), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.userData.actor = this;
    g.add(this.hit);
  }

  hold(pos, faceYaw = null, stiffness = 5) {
    this.mode = 'hold';
    this.target.copy(pos);
    if (faceYaw !== null) this.faceYaw = faceYaw;
    this.stiffness = stiffness;
  }

  fly(curve, speed = 0.04, startU = null) {
    this.mode = 'path';
    this.path = curve;
    this.pathSpeed = speed;
    if (startU !== null) this.pathU = startU;
    this.stiffness = 4;
  }

  poke() {
    if (this.flipT < 0) this.flipT = 0;
  }

  get label() {
    return { title: 'QUADCOPTER · PX4', sub: 'Click — flip maneuver' };
  }

  update(dt, t) {
    this.throttle += (this.targetThrottle - this.throttle) * Math.min(1, dt * 1.6);

    let desiredYaw = this.faceYaw;
    if (this.mode === 'path' && this.path) {
      this.pathU = (this.pathU + this.pathSpeed * dt) % 1;
      this.path.getPointAt(this.pathU, this.target);
      this.path.getTangentAt(this.pathU, tmp);
      desiredYaw = Math.atan2(tmp.x, tmp.z);
    } else {
      // 이동 중에는 진행 방향을, 정지 시에는 지정한 방향(대개 카메라)을 본다
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 1.2) desiredYaw = Math.atan2(this.vel.x, this.vel.z);
    }

    // 임계 감쇠 스프링으로 목표점 추종
    const k = this.stiffness;
    const c = 2 * Math.sqrt(k) * 0.95;
    tmp.copy(this.target).sub(this.pos).multiplyScalar(k);
    tmp.addScaledVector(this.vel, -c);
    this.vel.addScaledVector(tmp, dt);
    this.pos.addScaledVector(this.vel, dt);

    const airborne = this.throttle > 0.3;
    const bob = airborne ? Math.sin(t * 1.7) * 0.05 + Math.sin(t * 0.83) * 0.03 : 0;
    this.root.position.set(this.pos.x, this.pos.y + bob, this.pos.z);

    this.yaw = angleLerp(this.yaw, desiredYaw, Math.min(1, dt * 2.2));
    this.yawG.rotation.y = this.yaw;

    // 진행 방향으로 기울기
    tmp2.copy(this.vel).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -this.yaw);
    let pitch = THREE.MathUtils.clamp(tmp2.z * 0.11, -0.45, 0.45) + this.pointer.y * 0.06;
    let roll = THREE.MathUtils.clamp(-tmp2.x * 0.11, -0.45, 0.45) - this.pointer.x * 0.08;
    if (airborne) {
      pitch += Math.sin(t * 1.3) * 0.02;
      roll += Math.sin(t * 1.1 + 1.0) * 0.02;
    }
    this.tiltG.rotation.x += (pitch - this.tiltG.rotation.x) * Math.min(1, dt * 5);
    let flipRoll = 0;
    if (this.flipT >= 0) {
      this.flipT += dt / 0.9;
      const p = Math.min(1, this.flipT);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      flipRoll = e * TAU;
      this.root.position.y += Math.sin(p * Math.PI) * 0.6;
      if (p >= 1) this.flipT = -1;
    }
    this.roll = (this.roll || 0) + (roll - (this.roll || 0)) * Math.min(1, dt * 5);
    this.tiltG.rotation.z = this.roll + flipRoll;

    // 프로펠러
    const spin = (8 + 70 * this.throttle) * dt;
    const blur = THREE.MathUtils.smoothstep(this.throttle, 0.35, 0.9);
    for (const p of this.props) {
      p.group.rotation.y += spin * p.dir;
      p.disc.material.opacity = blur * 0.09;
      p.blades.forEach((b) => (b.visible = blur < 0.98 || Math.random() > 0.5));
    }
    const blink = (Math.sin(t * 6) > 0.6 ? 1 : 0.25) * (0.3 + this.throttle * 0.7);
    this.leds.forEach((l) => l.scale.setScalar(0.6 + blink * 0.6));
    this.gimbal.rotation.x = 0.25 + Math.sin(t * 0.5) * 0.1;
  }
}
