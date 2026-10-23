import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, glow, COLORS, contactShadow } from '../core/materials.js';
import { makeLabel, makeFloorText } from '../core/labels.js';

const clamp = THREE.MathUtils.clamp;
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const damp = (a, b, k, dt) => a + (b - a) * Math.min(1, dt * k);
// 0→1→0 창: 앞뒤 fade 구간만큼 부드럽게 들어왔다 빠진다
const win = (x, a, b, fade) => smoother(clamp(Math.min(x - a, b - x) / fade, 0, 1));
// 프레임마다 새로 만들지 않도록 돌려 쓰는 임시 벡터
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

// ── 재질: 휴머노이드 · 매니퓰레이터가 함께 쓴다 ─────────────────
let RM = null;
function rmats() {
  if (RM) return RM;
  RM = {
    // 흰 외피: 투명 코팅을 올린 사출 패널
    shell: new THREE.MeshPhysicalMaterial({ color: 0xe4e8ee, metalness: 0.06, roughness: 0.36, clearcoat: 0.85, clearcoatRoughness: 0.16 }),
    graphite: new THREE.MeshStandardMaterial({ color: 0x1a1f27, metalness: 0.62, roughness: 0.38 }),
    joint: new THREE.MeshStandardMaterial({ color: 0x0c0f14, metalness: 0.55, roughness: 0.42 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa7aeb8, metalness: 0.95, roughness: 0.24 }),
    anodOrange: new THREE.MeshStandardMaterial({ color: COLORS.orange, metalness: 0.85, roughness: 0.28 }),
    anodCyan: new THREE.MeshStandardMaterial({ color: 0x27c9dd, metalness: 0.85, roughness: 0.26 }),
    // 산업용 로봇 도장: 주황 우레탄 위 투명 코팅
    paint: new THREE.MeshPhysicalMaterial({ color: COLORS.orange, metalness: 0.2, roughness: 0.4, clearcoat: 0.75, clearcoatRoughness: 0.2 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x04070c, metalness: 0.9, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 0.1, roughness: 0.6 }),
    rubber: mats.rubber,
    glowCyan: glow(COLORS.cyan, 4),
    glowSoft: glow(COLORS.cyan, 1.5),
    glowOrange: glow(COLORS.orange, 3),
    glowRed: glow(COLORS.red, 4),
  };
  return RM;
}

// ── 형상 도우미 ───────────────────────────────────────────
const rbox = (w, h, d, r, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);
function cyl(rt, rb, h, seg = 24, axis = 'y') {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}
// 관절 둘레의 아노다이징 고리(axis: 관절 축)
function ring(r, tube, axis = 'y', seg = 32) {
  const g = new THREE.TorusGeometry(r, tube, 6, seg);
  if (axis === 'y') g.rotateX(Math.PI / 2);
  if (axis === 'x') g.rotateY(Math.PI / 2);
  return g;
}
function put(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function joint(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
function tube(points, r, seg = 24) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, 8, false);
}
// 한 링크에 고정된 부품을 재질별로 하나의 메시로 합친다 — 그리기 호출을 줄여 휴대폰에서도 가볍게
function bake(link) {
  const byMat = new Map();
  for (const c of link.children.slice()) {
    if (!c.isMesh || c.userData.keep) continue;
    c.updateMatrix();
    const g = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    g.clearGroups();
    if (!byMat.has(c.material)) byMat.set(c.material, []);
    byMat.get(c.material).push(g);
    link.remove(c);
  }
  for (const [mat, list] of byMat) link.add(new THREE.Mesh(list.length > 1 ? mergeGeometries(list) : list[0], mat));
  return link;
}

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
    const local = this.root.worldToLocal(_v.copy(this.look));
    const yaw = clamp(Math.atan2(local.x, local.z - 0.5), -0.7, 0.7);
    const pitch = clamp(-Math.atan2(local.y - 0.6, Math.hypot(local.x, local.z)) * 0.6, -0.35, 0.3);
    this.head.rotation.y += (yaw - this.head.rotation.y) * Math.min(1, dt * 4);
    this.head.rotation.x += (pitch - this.head.rotation.x) * Math.min(1, dt * 4);
  }
}

// ── 휴머노이드 ──────────────────────────────────────────────
// 연구용 이족 로봇의 비례(키 약 1.77): 다리 0.4 + 0.4, 팔 0.28 + 0.25, 손가락 셋 + 엄지.
// 무대 소품 — 이 분야를 상징할 뿐 특정 제품을 흉내 내지 않는다.

// 둥근 끝 원통(위 r0 · 아래 r1, 길이 len, -y 방향) — 팔다리 외피. sx · sz로 단면을 눌러 납작하게
function pod(r0, r1, len, sx = 1, sz = 1, seg = 20) {
  const pts = [];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * r1, -len + r1 * (1 - Math.cos(a) * 0.85)));
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r0, -r0 + Math.sin(a) * r0 * 0.85));
  }
  return new THREE.LatheGeometry(pts, seg).scale(sx, 1, sz);
}
// 옆모습 [반지름, 높이] 목록을 돌려 깎은 몸통 — 앞뒤로 눌러 타원 단면
function lathe(profile, sz, seg = 36) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg).scale(1, 1, sz);
}
const ell = (rx, ry, rz, ws = 24, hs = 16) => new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz);
// 외피를 두르는 가는 홈(패널 선)
const seam = (r, sx = 1, sz = 1) => new THREE.TorusGeometry(r, 0.0035, 4, 32).rotateX(Math.PI / 2).scale(sx, 1, sz);

class Humanoid {
  constructor() {
    const m = rmats();
    this.L1 = 0.4;
    this.L2 = 0.4;
    this.ankleH = 0.077; // 발목 축에서 발바닥까지
    this.hipW = 0.105;
    this.hipY = -0.07;
    this.H = 0.935; // 선 자세의 골반 높이(무릎이 살짝 굽는다)
    this.root = new THREE.Group();

    // ── 골반: 검은 몸체 위 앞뒤 흰 덮개, 양옆 고관절 구동기 ──
    const pelvis = (this.pelvis = joint(this.root, 0, this.H, 0));
    put(pelvis, ell(0.13, 0.075, 0.092), m.joint, 0, -0.005, 0);
    const hipShell = (phi) => new THREE.SphereGeometry(1, 24, 10, phi - 0.8, 1.6, 1.15, 1.05).scale(0.14, 0.084, 0.103);
    put(pelvis, hipShell(Math.PI / 2), m.shell, 0, -0.008, 0);
    put(pelvis, hipShell(-Math.PI / 2), m.shell, 0, -0.008, 0);
    put(pelvis, cyl(0.094, 0.1, 0.03, 32), m.joint, 0, 0.068, 0);
    [-1, 1].forEach((s) => {
      put(pelvis, cyl(0.058, 0.058, 0.07, 28, 'x'), m.joint, s * 0.112, this.hipY, 0);
      put(pelvis, ring(0.05, 0.006, 'x'), m.anodOrange, s * 0.148, this.hipY, 0);
    });
    bake(pelvis);

    // ── 허리(요) · 몸통 ──
    const waist = (this.waist = joint(pelvis, 0, 0.08, 0));
    put(waist, cyl(0.08, 0.088, 0.06, 32), m.joint, 0, 0.03, 0);
    put(waist, ring(0.084, 0.005, 'y'), m.anodCyan, 0, 0.058, 0);
    bake(waist);
    const torso = (this.torso = joint(waist, 0, 0.065, 0));
    // 배: 검은 주름 구간 · 가슴: 어깨로 넓어지는 흰 외피(V자 실루엣)
    put(torso, lathe([[0.086, 0], [0.094, 0.04], [0.104, 0.08], [0.112, 0.11]], 0.72), m.joint);
    put(torso, lathe([[0.106, 0.088], [0.124, 0.12], [0.15, 0.17], [0.172, 0.23], [0.181, 0.28], [0.178, 0.32], [0.163, 0.355], [0.13, 0.385], [0.085, 0.405], [0.05, 0.412], [0.001, 0.414]], 0.66), m.shell);
    put(torso, seam(0.117, 1, 0.66), m.joint, 0, 0.1, 0);
    put(torso, seam(0.1805, 1, 0.66), m.joint, 0, 0.3, 0);
    // 가슴 상태 표시줄
    put(torso, new THREE.BoxGeometry(0.07, 0.007, 0.006), m.glowCyan, -0.02, 0.27, 0.118);
    put(torso, new THREE.BoxGeometry(0.02, 0.007, 0.006), m.glowOrange, 0.04, 0.27, 0.118);
    [-1, 1].forEach((s) => put(torso, cyl(0.05, 0.05, 0.06, 28, 'x'), m.joint, s * 0.18, 0.33, 0));
    // 등: 배터리 팩 · 주황 띠 · 잔량 표시
    put(torso, rbox(0.2, 0.21, 0.06, 0.026, 4), m.graphite, 0, 0.25, -0.1);
    put(torso, new THREE.BoxGeometry(0.17, 0.012, 0.064), m.anodOrange, 0, 0.33, -0.1);
    for (let k = 0; k < 4; k++) put(torso, new THREE.BoxGeometry(0.026, 0.01, 0.004), m.glowCyan, -0.054 + k * 0.036, 0.19, -0.131);
    put(torso, cyl(0.05, 0.062, 0.03, 24), m.joint, 0, 0.415, 0);
    bake(torso);

    // ── 목 · 머리: 달걀형 헬멧, 감싸는 검은 얼굴판, 그 안의 센서 띠 ──
    const neck = (this.neck = joint(torso, 0, 0.425, 0));
    put(neck, cyl(0.042, 0.048, 0.05, 20), m.joint, 0, 0.025, 0);
    put(neck, ring(0.047, 0.0045, 'y'), m.anodOrange, 0, 0.012, 0);
    bake(neck);
    const head = (this.head = joint(neck, 0, 0.05, 0));
    const hc = [0, 0.11, -0.01];
    put(head, ell(0.09, 0.112, 0.106, 32, 20), m.shell, ...hc);
    put(head, new THREE.SphereGeometry(1, 32, 14, Math.PI / 2 - 0.95, 1.9, 0.78, 1.36).scale(0.0925, 0.1138, 0.1082), m.visor, ...hc);
    [-1, 1].forEach((s) => {
      put(head, cyl(0.03, 0.03, 0.024, 20, 'x'), m.joint, s * 0.091, 0.105, -0.018);
      put(head, ring(0.025, 0.004, 'x'), m.anodOrange, s * 0.104, 0.105, -0.018);
    });
    put(head, cyl(0.03, 0.036, 0.02, 20), m.joint, 0, 0.224, -0.03);
    bake(head);
    const band = 1.42;
    const by = Math.cos(band + 0.05) * 0.1148;
    this.eye = put(head, new THREE.SphereGeometry(1, 32, 1, Math.PI / 2 - 0.72, 1.44, band, 0.1).scale(0.0932, 0.1148, 0.109).translate(0, -by, 0), m.glowCyan, hc[0], hc[1] + by, hc[2]);

    // ── 팔 · 다리 ──
    this.arms = [1, -1].map((s) => this.buildArm(s));
    this.legs = [1, -1].map((s) => this.buildLeg(s));
    this.handR = this.arms[1].palm;

    this.shadow = contactShadow(1.1, 0.55);
    this.root.add(this.shadow);

    this.hit = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.8, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = 0.9;
    this.hit.userData.actor = this;
    this.root.add(this.hit);

    this.look = new THREE.Vector3();
    this.clock = 0;
    this.waveT = -1;
    this.waistYaw = 0;
    this.headYaw = 0;
    this.headPitch = 0;
    this.q = this.arms.map((a) => ({ sp: 0.05, sr: a.s * 0.09, uy: 0, el: -0.3, wy: 0, wp: 0.1, curl: 0.45 }));
    this.goal = this.arms.map(() => ({ sp: 0, sr: 0, uy: 0, el: 0, wy: 0, wp: 0, curl: 0 }));
  }

  // s: +1 왼팔(+x) · -1 오른팔(-x). 어깨 피치 → 롤 → 위팔 요 → 팔꿈치 → 손목 요 → 손목 피치 → 손
  buildArm(s) {
    const m = rmats();
    const sp = joint(this.torso, s * 0.215, 0.33, 0);
    put(sp, ell(0.06, 0.058, 0.066), m.shell, s * 0.014, 0.004, 0);
    put(sp, ring(0.046, 0.005, 'x'), m.anodOrange, -s * 0.036, 0, 0);
    bake(sp);
    const sr = joint(sp);
    put(sr, cyl(0.033, 0.033, 0.074, 20, 'z'), m.joint, 0, -0.056, 0);
    put(sr, ring(0.043, 0.0045, 'y'), m.anodOrange, 0, -0.066, 0);
    bake(sr);
    const up = joint(sr);
    put(up, pod(0.046, 0.04, 0.2, 1, 1.05), m.shell, 0, -0.058, 0);
    put(up, cyl(0.028, 0.028, 0.06, 16), m.joint, 0, -0.25, 0);
    bake(up);
    const el = joint(up, 0, -0.28, 0);
    put(el, cyl(0.038, 0.038, 0.08, 24, 'x'), m.joint);
    [-1, 1].forEach((k) => put(el, ring(0.032, 0.004, 'x'), m.anodCyan, k * 0.041, 0, 0));
    put(el, pod(0.042, 0.031, 0.19, 1.05, 1), m.shell, 0, -0.03, 0);
    put(el, cyl(0.026, 0.026, 0.03, 16), m.joint, 0, -0.232, 0);
    put(el, ring(0.028, 0.004, 'y'), m.anodOrange, 0, -0.245, 0);
    put(el, new THREE.BoxGeometry(0.004, 0.08, 0.02), m.anodOrange, s * 0.041, -0.1, 0);
    bake(el);
    const wy = joint(el, 0, -0.245, 0);
    const wp = joint(wy);
    // 손바닥은 몸 쪽(-s)을 본다
    put(wp, cyl(0.025, 0.025, 0.02, 16), m.joint, 0, -0.008, 0);
    put(wp, rbox(0.026, 0.078, 0.068, 0.01), m.joint, 0, -0.05, 0);
    put(wp, rbox(0.01, 0.06, 0.056, 0.004), m.shell, s * 0.016, -0.048, 0);
    bake(wp);
    // 손가락: 두 마디를 살짝 굽힌 채 한 메시로 — 밑동 관절만 굽힌다
    const f1 = rbox(0.016, 0.042, 0.016, 0.006, 2);
    const f2 = rbox(0.014, 0.034, 0.014, 0.006, 2);
    const digit = (parent, x, y, z) => {
      const k = joint(parent, x, y, z);
      put(k, f1, m.joint, 0, -0.021, 0);
      const tip = put(k, f2, m.joint, -s * Math.sin(0.35) * 0.017, -0.042 - Math.cos(0.35) * 0.017, 0);
      tip.rotation.z = -s * 0.35;
      return bake(k);
    };
    const fingers = [-0.022, 0, 0.022].map((z) => digit(wp, 0, -0.09, z));
    // 엄지: 손바닥 앞쪽 안에서 비스듬히 내려온다
    const th = digit(wp, -s * 0.01, -0.035, 0.034);
    th.rotation.x = -0.55;
    return { s, sp, sr, up, el, wy, wp, fingers, th, palm: wp };
  }

  // 고관절 롤 → 피치 → 무릎 → 발목 피치 → 발목 롤 → 발
  buildLeg(s) {
    const m = rmats();
    const roll = joint(this.pelvis, s * this.hipW, this.hipY, 0);
    const pitch = joint(roll);
    put(pitch, rbox(0.08, 0.08, 0.11, 0.022), m.joint, 0, -0.04, 0);
    put(pitch, pod(0.07, 0.056, 0.29, 0.92, 1.05), m.shell, 0, -0.06, 0);
    put(pitch, seam(0.066, 0.92, 1.05), m.joint, 0, -0.2, 0);
    put(pitch, new THREE.BoxGeometry(0.004, 0.11, 0.03), m.anodOrange, s * 0.058, -0.26, 0);
    put(pitch, cyl(0.032, 0.03, 0.06, 16), m.joint, 0, -0.355, 0);
    bake(pitch);
    const knee = joint(pitch, 0, -this.L1, 0);
    put(knee, cyl(0.047, 0.047, 0.094, 28, 'x'), m.joint);
    [-1, 1].forEach((k) => put(knee, ring(0.04, 0.005, 'x'), m.anodCyan, k * 0.048, 0, 0));
    put(knee, rbox(0.066, 0.07, 0.026, 0.012), m.shell, 0, 0.004, 0.04);
    put(knee, pod(0.055, 0.042, 0.29, 0.92, 1), m.shell, 0, -0.05, 0);
    put(knee, seam(0.05, 0.92, 1), m.joint, 0, -0.2, 0);
    // 종아리 뒤 선형 구동기: 실린더와 로드
    put(knee, cyl(0.024, 0.024, 0.16, 16), m.joint, 0, -0.14, -0.052);
    put(knee, cyl(0.01, 0.01, 0.13, 10), m.alu, 0, -0.28, -0.052);
    put(knee, cyl(0.026, 0.024, 0.05, 16), m.joint, 0, -0.36, 0);
    bake(knee);
    const ankle = joint(knee, 0, -this.L2, 0);
    put(ankle, cyl(0.03, 0.03, 0.075, 20, 'x'), m.joint);
    bake(ankle);
    const ankleRoll = joint(ankle);
    put(ankleRoll, rbox(0.095, 0.042, 0.21, 0.018), m.shell, 0, -0.043, 0.035);
    put(ankleRoll, rbox(0.1, 0.016, 0.222, 0.007), m.rubber, 0, -0.069, 0.035);
    put(ankleRoll, new THREE.BoxGeometry(0.06, 0.008, 0.006), m.anodOrange, 0, -0.04, 0.141);
    bake(ankleRoll);
    return { s, roll, pitch, knee, ankle, ankleRoll };
  }

  get label() {
    return { title: 'HUMANOID · BIPEDAL BALANCE', sub: 'Whole-body IK — click to wave' };
  }

  poke() {
    if (this.waveT < 0) this.waveT = 0;
  }

  // 발목 목표(루트 좌표)로 다리 하나를 푼다 — 롤로 옆 기울기를, 2링크 IK로 앞뒤 · 높이를
  legIK(leg, ax, ay, az) {
    const p = this.pelvis;
    const pr = p.rotation.z;
    const cr = Math.cos(pr);
    const sr = Math.sin(pr);
    const hx0 = leg.s * this.hipW;
    const hy0 = this.hipY;
    const dx = ax - (p.position.x + hx0 * cr - hy0 * sr);
    const dy = ay - (p.position.y + hx0 * sr + hy0 * cr);
    const dz = az - p.position.z;
    const lx = dx * cr + dy * sr;
    const ly = -dx * sr + dy * cr;
    const roll = Math.atan2(lx, -ly);
    const lv = Math.hypot(lx, ly);
    const { L1, L2 } = this;
    const d = clamp(Math.hypot(dz, lv), 0.1, L1 + L2 - 0.001);
    const phi = Math.atan2(-dz, lv);
    const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const gamma = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const a1 = phi - alpha;
    const a2 = Math.PI - gamma;
    leg.roll.rotation.z = roll;
    leg.pitch.rotation.x = a1;
    leg.knee.rotation.x = a2;
    // 발바닥은 늘 바닥과 나란히
    leg.ankle.rotation.x = -(a1 + a2);
    leg.ankleRoll.rotation.z = -(roll + pr);
  }

  update(dt, t) {
    this.clock += dt;
    const c = this.clock % 15;
    const breath = Math.sin(t * 1.25);

    // 일정: 3.5초부터 제자리 네 걸음, 8.5초부터 오른손을 들어 살핀다
    const Ts = 0.7;
    const mt = c - 3.5;
    const env = win(mt, 0, Ts * 4, 0.35);
    const st = env > 0 ? Math.sin((Math.PI * mt) / Ts) * env : 0;
    const inspect = win(c, 8.5, 12, 0.7);
    let wave = 0;
    if (this.waveT >= 0) {
      this.waveT += dt / 2.8;
      wave = win(this.waveT, 0, 1, 0.18);
      if (this.waveT >= 1) this.waveT = -1;
    }

    // 골반: 발목 위 균형 흔들림 + 걸음마다 디딤발 쪽으로 무게 이동
    const p = this.pelvis;
    const px = Math.sin(t * 0.55) * 0.012 - st * 0.045;
    p.position.set(px, this.H - Math.abs(st) * 0.012 + breath * 0.002, Math.sin(t * 0.37) * 0.008);
    p.rotation.z = -px * 0.5;
    this.torso.rotation.z = px * 0.4;
    this.torso.rotation.x = -0.02 - breath * 0.012 + inspect * 0.04;

    // 다리: 디딘 발은 제자리, 드는 발만 들어 올린다
    const lift = 0.075;
    const lL = Math.pow(Math.max(0, st), 1.4) * lift;
    const lR = Math.pow(Math.max(0, -st), 1.4) * lift;
    this.legIK(this.legs[0], this.hipW, this.ankleH + lL, lL * 0.25);
    this.legIK(this.legs[1], -this.hipW, this.ankleH + lR, lR * 0.25);

    // 팔: 기본 자세 → 걸음 맞춰 반대로 흔들기 → 오른손 살피기 → 인사
    for (let i = 0; i < 2; i++) {
      const a = this.arms[i];
      const s = a.s;
      const g = this.goal[i];
      g.sp = 0.05 + breath * 0.015 + st * 0.2 * s;
      g.sr = s * (0.09 + Math.abs(st) * 0.03);
      g.uy = 0;
      g.el = -0.3 - Math.abs(st) * 0.15;
      g.wy = 0;
      g.wp = 0.1;
      g.curl = 0.45 + breath * 0.05;
      if (s < 0 && inspect > 0) {
        const k = inspect;
        g.sp += (-0.85 - g.sp) * k;
        g.sr += (-0.22 - g.sr) * k;
        g.uy += (0.35 - g.uy) * k;
        g.el += (-1.35 - g.el) * k;
        g.wy += (Math.sin(this.clock * 1.4) * 0.9 - g.wy) * k;
        g.wp += (0.3 - g.wp) * k;
        g.curl += (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this.clock * 2.2)) - g.curl) * k;
      }
      if (s < 0 && wave > 0) {
        const k = wave;
        g.sp += (-0.12 - g.sp) * k;
        g.sr += (-1.25 - g.sr) * k;
        g.uy += (-Math.PI / 2 - g.uy) * k;
        g.el += (-1.55 + Math.sin(this.clock * 8) * 0.38 - g.el) * k;
        g.wy += (0 - g.wy) * k;
        g.wp += (0 - g.wp) * k;
        g.curl += (0.05 - g.curl) * k;
      }
      const q = this.q[i];
      q.sp = damp(q.sp, g.sp, 7, dt);
      q.sr = damp(q.sr, g.sr, 7, dt);
      q.uy = damp(q.uy, g.uy, 7, dt);
      q.el = damp(q.el, g.el, 7, dt);
      q.wy = damp(q.wy, g.wy, 7, dt);
      q.wp = damp(q.wp, g.wp, 7, dt);
      q.curl = damp(q.curl, g.curl, 10, dt);
      a.sp.rotation.x = q.sp;
      a.sp.position.y = 0.33 + breath * 0.003;
      a.sr.rotation.z = q.sr;
      a.up.rotation.y = q.uy;
      a.el.rotation.x = q.el;
      a.wy.rotation.y = q.wy;
      a.wp.rotation.x = q.wp;
      for (const f of a.fingers) f.rotation.z = -s * q.curl;
      a.th.rotation.z = -s * q.curl * 0.6;
    }

    // 시선: 포인터(또는 드론)를 보고, 살필 때는 오른손을 본다 — 허리가 조금, 목이 나머지를
    const look = this.root.worldToLocal(_v.copy(this.look));
    if (inspect > 0) {
      this.handR.getWorldPosition(_v2);
      look.lerp(this.root.worldToLocal(_v2), inspect);
    }
    const yaw = clamp(Math.atan2(look.x, look.z), -1.3, 1.3);
    const pitch = clamp(Math.atan2(1.65 - look.y, Math.hypot(look.x, look.z)), -0.35, 0.55);
    this.waistYaw = damp(this.waistYaw, yaw * 0.3, 2.5, dt);
    this.headYaw = damp(this.headYaw, yaw * 0.7, 4, dt);
    this.headPitch = damp(this.headPitch, pitch, 4, dt);
    this.waist.rotation.y = this.waistYaw;
    this.neck.rotation.y = this.headYaw;
    this.head.rotation.x = this.headPitch - this.torso.rotation.x;
    // 눈 깜빡임: 센서 띠가 4.7초마다 잠깐 가늘어진다
    this.eye.scale.y = damp(this.eye.scale.y, t % 4.7 < 0.14 ? 0.15 : 1, 30, dt);
    this.shadow.position.x = px;
  }
}

// ── 6축 산업용 매니퓰레이터 ─────────────────────────────────────
// J1 선회 · J2 어깨 · J3 팔꿈치 · J4 아래팔 롤 · J5 손목 · J6 플랜지 + 평행 그리퍼(손목 카메라)
class RobotArm {
  constructor() {
    const m = rmats();
    this.L1 = 0.95;
    this.L2 = 0.8;
    this.Lt = 0.21;
    this.shoulderY = 0.52;
    this.a1 = 0.1; // J1 축에서 J2 축까지 앞 오프셋
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
      const mk = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.23, 4, 1), glow(COLORS.cyan, 1.6));
      mk.rotation.x = -Math.PI / 2;
      mk.rotation.z = Math.PI / 4;
      mk.position.set(p.x, 0.005, p.z);
      this.root.add(mk);
    });

    // ── 받침(고정): 바닥 플랜지 · 볼트 · J1 하우징 · 뒤 커넥터와 케이블 ──
    const base = joint(this.root);
    put(base, cyl(0.34, 0.37, 0.05, 48), m.graphite, 0, 0.025, 0);
    const bolt = cyl(0.018, 0.018, 0.016, 6);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      put(base, bolt, m.alu, Math.sin(a) * 0.31, 0.058, Math.cos(a) * 0.31);
    }
    put(base, cyl(0.28, 0.31, 0.12, 48), m.joint, 0, 0.11, 0);
    put(base, ring(0.283, 0.008, 'y', 48), m.anodOrange, 0, 0.168, 0);
    put(base, rbox(0.24, 0.12, 0.12, 0.02), m.graphite, 0, 0.09, -0.36);
    [-1, 1].forEach((s) => {
      put(base, cyl(0.026, 0.026, 0.04, 12, 'z'), m.alu, s * 0.06, 0.09, -0.435);
      put(base, tube([[s * 0.06, 0.09, -0.45], [s * 0.06, 0.06, -0.56], [s * 0.07, 0.014, -0.66], [s * 0.08, 0.014, -0.74], [s * 0.08, -0.06, -0.8], [s * 0.08, -0.3, -0.81]], 0.022), m.cable);
    });
    bake(base);

    // ── J1 선회부 ──
    this.turn = joint(this.root, 0, 0.17, 0);
    const sy = this.shoulderY - 0.17;
    put(this.turn, cyl(0.255, 0.27, 0.1, 48), m.paint, 0, 0.05, 0);
    put(this.turn, rbox(0.3, 0.24, 0.3, 0.07), m.paint, 0.02, 0.18, 0.05);
    put(this.turn, cyl(0.16, 0.16, 0.2, 40, 'x'), m.paint, 0.06, sy, this.a1);
    // J2 모터(옆으로 튀어나온 검은 캔)와 끝 고리
    put(this.turn, cyl(0.085, 0.085, 0.16, 32, 'x'), m.joint, 0.24, sy, this.a1);
    put(this.turn, ring(0.075, 0.007, 'x'), m.anodCyan, 0.322, sy, this.a1);
    put(this.turn, cyl(0.03, 0.03, 0.05, 12, 'x'), m.alu, 0.34, sy + 0.04, this.a1 - 0.03);
    put(this.turn, new THREE.BoxGeometry(0.004, 0.06, 0.16), m.glowSoft, 0.172, 0.12, 0.05);
    bake(this.turn);

    // ── J2 어깨 · 위팔 ──
    const ax = -0.13; // 위팔은 J2 모터 반대편 옆에 붙는다
    this.shoulder = joint(this.turn, 0, sy, this.a1);
    put(this.shoulder, cyl(0.145, 0.145, 0.15, 40, 'x'), m.paint, ax, 0, 0);
    put(this.shoulder, ring(0.12, 0.008, 'x'), m.anodOrange, ax - 0.077, 0, 0);
    put(this.shoulder, linkProfile(0.13, 0.1, this.L1, 0.13), m.paint, ax, 0, 0);
    put(this.shoulder, rbox(0.012, this.L1 * 0.5, 0.12, 0.005), m.joint, ax - 0.068, this.L1 * 0.5, 0);
    put(this.shoulder, new THREE.BoxGeometry(0.004, this.L1 * 0.36, 0.014), m.glowOrange, ax - 0.075, this.L1 * 0.5, 0);
    // 위팔 뒤를 따라가는 케이블 다발과 고정 클램프
    put(this.shoulder, tube([[ax + 0.02, 0.1, -0.15], [ax + 0.02, 0.4, -0.135], [ax + 0.02, 0.7, -0.12], [ax + 0.04, this.L1 - 0.02, -0.14]], 0.022), m.cable);
    [0.28, 0.62].forEach((y) => put(this.shoulder, rbox(0.07, 0.035, 0.06, 0.01), m.graphite, ax + 0.02, y, -0.125));
    bake(this.shoulder);

    // ── J3 팔꿈치 · 뒤 모터 팩 · 아래팔(J4) ──
    this.elbow = joint(this.shoulder, 0, this.L1, 0);
    put(this.elbow, cyl(0.11, 0.11, 0.3, 40, 'x'), m.paint, -0.06, 0, 0);
    put(this.elbow, cyl(0.07, 0.07, 0.12, 28, 'x'), m.joint, 0.15, 0, 0);
    put(this.elbow, ring(0.062, 0.006, 'x'), m.anodCyan, 0.212, 0, 0);
    put(this.elbow, ring(0.1, 0.007, 'x'), m.anodOrange, -0.212, 0, 0);
    put(this.elbow, rbox(0.18, 0.2, 0.17, 0.04), m.paint, 0, -0.12, 0);
    [-1, 1].forEach((s) => {
      put(this.elbow, cyl(0.045, 0.045, 0.08, 20), m.joint, s * 0.045, -0.25, 0);
      put(this.elbow, ring(0.04, 0.004, 'y'), m.anodCyan, s * 0.045, -0.292, 0);
    });
    put(this.elbow, ring(0.084, 0.006, 'y'), m.joint, 0, 0.14, 0);
    put(this.elbow, cyl(0.075, 0.085, 0.5, 32), m.paint, 0, 0.39, 0);
    [-1, 1].forEach((s) => put(this.elbow, new THREE.BoxGeometry(0.004, 0.26, 0.016), m.glowSoft, s * 0.081, 0.39, 0));
    put(this.elbow, cyl(0.06, 0.075, 0.12, 28), m.paint, 0, 0.69, 0);
    [-1, 1].forEach((s) => put(this.elbow, rbox(0.03, 0.13, 0.11, 0.014), m.paint, s * 0.072, this.L2 - 0.02, 0));
    bake(this.elbow);

    // ── J5 손목 · J6 플랜지 · 그리퍼 ──
    this.wrist = joint(this.elbow, 0, this.L2, 0);
    put(this.wrist, cyl(0.052, 0.052, 0.11, 28, 'x'), m.joint);
    [-1, 1].forEach((s) => put(this.wrist, ring(0.045, 0.005, 'x'), m.anodOrange, s * 0.089, 0, 0));
    put(this.wrist, cyl(0.045, 0.05, 0.06, 24), m.graphite, 0, 0.05, 0);
    bake(this.wrist);
    this.roll = joint(this.wrist, 0, 0.08, 0);
    put(this.roll, cyl(0.052, 0.052, 0.018, 32), m.alu, 0, 0.009, 0);
    put(this.roll, cyl(0.046, 0.046, 0.02, 24), m.joint, 0, 0.028, 0);
    put(this.roll, rbox(0.2, 0.06, 0.085, 0.015), m.graphite, 0, 0.068, 0);
    put(this.roll, new THREE.BoxGeometry(0.212, 0.012, 0.03), m.alu, 0, 0.104, 0);
    // 손목 카메라(eye-in-hand): 집을 물체를 내려다본다
    put(this.roll, rbox(0.05, 0.034, 0.04, 0.008), m.joint, 0, 0.062, 0.064);
    put(this.roll, cyl(0.012, 0.012, 0.006, 16), m.glowCyan, 0, 0.081, 0.07);
    bake(this.roll);
    const pad = rbox(0.008, 0.05, 0.045, 0.003, 2);
    this.fingers = [-1, 1].map((s) => {
      const f = joint(this.roll, s * 0.17, 0, 0);
      put(f, rbox(0.04, 0.028, 0.05, 0.008), m.graphite, 0, 0.105, 0);
      put(f, rbox(0.018, 0.13, 0.052, 0.005), m.anodOrange, 0, 0.165, 0);
      put(f, pad, m.rubber, -s * 0.012, 0.2, 0);
      return bake(f);
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
    this.stepFrom = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.waveAt = new THREE.Vector3();
    this.buildSeq();
    this.waveT = -1;
  }

  get label() {
    return { title: '6-AXIS MANIPULATOR · VISION PICK', sub: 'IK pick & place — click to wave' };
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
    this.stepFrom.copy(this.cur);
  }

  toCyl(v, out) {
    out.yaw = Math.atan2(v.x, v.z);
    out.r = Math.hypot(v.x, v.z);
    out.y = v.y;
    return out;
  }

  solve(p) {
    const { L1, L2, Lt, shoulderY, a1 } = this;
    const yaw = Math.atan2(p.x, p.z);
    const r = Math.hypot(p.x, p.z) - a1;
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
      const a = this.toCyl(this.stepFrom, (this._ca ||= {}));
      const b = this.toCyl(s.p, (this._cb ||= {}));
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
    const target = this.target.copy(this.cur);
    if (this.waveT >= 0) {
      this.waveT += dt / 2.2;
      const w = Math.sin(Math.min(1, this.waveT) * Math.PI);
      target.lerp(this.waveAt.set(Math.sin(t * 5) * 0.35, 1.55, 0.85), w);
      if (this.waveT >= 1) this.waveT = -1;
    }
    const yaw = this.solve(target);
    // J6: 잡은 물체의 방향에 맞춰 살짝 비튼다
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
      this.stepFrom.copy(this.cur);
      if (this.step >= this.seq.length) {
        [this.from, this.to] = [this.to, this.from];
        this.buildSeq();
      }
    }
  }
}

// 산업용 로봇 링크의 옆모습: 두 원(어깨 r0 · 팔꿈치 r1)을 잇는 판을 w 두께로 밀어낸다(축 x 가운데)
function linkProfile(r0, r1, len, w) {
  const s = new THREE.Shape();
  s.moveTo(r0, 0);
  s.lineTo(r1, len);
  s.absarc(0, len, r1, 0, Math.PI, false);
  s.lineTo(-r0, 0);
  s.absarc(0, 0, r0, Math.PI, Math.PI * 2, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20 });
  // 모양의 x → 링크의 z, 밀어낸 방향 → x
  g.rotateY(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  return g;
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
    // 왼쪽 무리(휴머노이드 + 개)와 오른쪽 작업 셀(매니퓰레이터)을 가운데 카드 덱 양옆에 — 같은 깊이의 한 띠
    this.walkCenter = new THREE.Vector3(-3.6, 0, -0.6);
    this.walkR = 1.6;
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
    // 휴머노이드는 개가 도는 고리 한가운데 — 몸은 세트 가운데(로봇팔 쪽)를 향한다
    this.humanoid = new Humanoid();
    this.humanoid.root.position.copy(this.walkCenter);
    this.humanoid.root.rotation.y = 0.5;
    this.group.add(this.humanoid.root);
    this.arm = new RobotArm();
    this.arm.root.position.set(4.6, 0.3, -1.3);
    this.arm.root.rotation.y = -0.5;
    this.group.add(this.arm.root);

    // 비전 카메라 리그 — 로봇팔 작업 영역을 비스듬히 내려다본다
    const rig = new THREE.Group();
    rig.position.set(6.9, 0, -3.5);
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
    eye.lookAt(this.arm.root.localToWorld(new THREE.Vector3(0, 0.1, 0.78)));

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
    this.humanoid.look.copy(this.lookWorld);
    this.humanoid.update(dt, t);
    this.arm.update(dt, t);
  }
}
