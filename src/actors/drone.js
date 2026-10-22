import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glow, COLORS } from '../core/materials.js';

const TAU = Math.PI * 2;
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

function angleLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

// ── 재질 ─────────────────────────────────────────────
// 카본: 2×2 능직(twill) 결을 캔버스로 그려 투명 코팅을 올린다
function carbonTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const n = 8; // 한 칸 8px, 8×8 칸
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const warp = (i + j) % 4 < 2; // 능직: 두 칸씩 엇갈려 사선을 만든다
      const grad = warp ? g.createLinearGradient(i * 8, 0, i * 8 + 8, 0) : g.createLinearGradient(0, j * 8, 0, j * 8 + 8);
      grad.addColorStop(0, warp ? '#1a1d22' : '#121418');
      grad.addColorStop(0.5, warp ? '#2b3038' : '#1d2026');
      grad.addColorStop(1, warp ? '#1a1d22' : '#121418');
      g.fillStyle = grad;
      g.fillRect(i * 8, j * 8, 8, 8);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.repeat.set(5, 5);
  return t;
}

// 배터리 라벨: 검은 수축 튜브 위에 주황 띠와 사양
function batteryTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, '#202329');
  bg.addColorStop(1, '#0d0f12');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#ff6b1a';
  g.beginPath();
  g.moveTo(300, 0);
  g.lineTo(360, 0);
  g.lineTo(250, 256);
  g.lineTo(190, 256);
  g.fill();
  g.fillStyle = '#5ef2ff';
  g.fillRect(372, 0, 8, 256);
  g.fillStyle = '#e8edf4';
  g.font = 'bold 64px Arial, sans-serif';
  g.fillText('6S', 34, 112);
  g.font = 'bold 30px Arial, sans-serif';
  g.fillText('1300 mAh', 34, 160);
  g.font = '20px Arial, sans-serif';
  g.fillStyle = '#9aa3b2';
  g.fillText('22.2V · 120C · LiPo', 34, 200);
  g.fillStyle = '#ff6b1a';
  g.font = 'bold 22px Arial, sans-serif';
  g.fillText('KWON', 410, 214);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 프로펠러 잔상: 세 날개가 그리는 옅은 고리
function blurTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,0)');
  r.addColorStop(0.18, 'rgba(255,255,255,0.15)');
  r.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  r.addColorStop(0.9, 'rgba(255,255,255,0.7)');
  r.addColorStop(0.97, 'rgba(255,255,255,0.15)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  // 날개 끝이 남기는 가는 줄
  g.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 18; k++) {
    g.strokeStyle = `rgba(0,0,0,${0.08 + (k % 3) * 0.05})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(64, 64, 24 + k * 2.2, 0, TAU);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let M = null;
function materials() {
  if (M) return M;
  const carbonMap = carbonTexture();
  M = {
    carbon: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: carbonMap, metalness: 0.25, roughness: 0.48, clearcoat: 0.9, clearcoatRoughness: 0.22 }),
    carbonEdge: new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.2, roughness: 0.6 }),
    anodOrange: new THREE.MeshStandardMaterial({ color: COLORS.orange, metalness: 0.85, roughness: 0.28 }),
    anodCyan: new THREE.MeshStandardMaterial({ color: 0x27c9dd, metalness: 0.85, roughness: 0.26 }),
    bell: new THREE.MeshStandardMaterial({ color: 0x2c3038, metalness: 0.92, roughness: 0.3 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa7aeb8, metalness: 0.95, roughness: 0.22 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb8692f, metalness: 0.9, roughness: 0.35 }),
    tpu: new THREE.MeshStandardMaterial({ color: COLORS.orange, metalness: 0.0, roughness: 0.78 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.3, roughness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.0, roughness: 0.92 }),
    strap: new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.0, roughness: 0.95 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x0f2a1d, metalness: 0.35, roughness: 0.45 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x08090b, metalness: 0.5, roughness: 0.4 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1.0, roughness: 0.3 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x0a1424, metalness: 0.9, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 }),
    wireRed: new THREE.MeshStandardMaterial({ color: 0xb3261e, metalness: 0.1, roughness: 0.5 }),
    wireBlack: new THREE.MeshStandardMaterial({ color: 0x111215, metalness: 0.1, roughness: 0.5 }),
    xt60: new THREE.MeshStandardMaterial({ color: 0xe8b62a, metalness: 0.1, roughness: 0.5 }),
    battery: new THREE.MeshStandardMaterial({ map: batteryTexture(), metalness: 0.15, roughness: 0.55 }),
    propCyan: new THREE.MeshPhysicalMaterial({ color: 0x5ef2ff, metalness: 0, roughness: 0.18, clearcoat: 1, transparent: true, opacity: 0.78 }),
    propOrange: new THREE.MeshPhysicalMaterial({ color: 0xff8a40, metalness: 0, roughness: 0.18, clearcoat: 1, transparent: true, opacity: 0.8 }),
    blurMap: blurTexture(),
    glowCyan: glow(COLORS.cyan, 5),
    glowLens: glow(COLORS.cyan, 1.2),
    glowOrange: glow(COLORS.orange, 5),
    glowRed: glow(COLORS.red, 6),
    glowGreen: glow(COLORS.green, 3),
  };
  return M;
}

// ── 형상 ─────────────────────────────────────────────
const R = 0.6; // 가운데에서 모터 축까지(대각선)
const PROP_R = 0.31; // 프로펠러 반지름(약 5인치 비율)
const ARM_T = 0.028; // 팔 두께(5mm 카본 비율)
const TOP_Y = 0.15; // 위판 높이(스탠드오프 길이)

// 판 모양을 XY에 그려 두께만큼 밀어 올린 뒤 바닥(XZ)에 눕힌다
function plate(shape, depth, bevel = 0.002) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 20 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}
function roundRect(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2;
  const y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function slot(x0, x1, hw, y = 0) {
  const p = new THREE.Path();
  p.moveTo(x0, y - hw);
  p.lineTo(x1, y - hw);
  p.absarc(x1, y, hw, -Math.PI / 2, Math.PI / 2, false);
  p.lineTo(x0, y + hw);
  p.absarc(x0, y, hw, Math.PI / 2, (3 * Math.PI) / 2, false);
  return p;
}
function hole(x, y, r) {
  const p = new THREE.Path();
  p.absarc(x, y, r, 0, TAU, true);
  return p;
}

// 팔: 몸통에서 허리가 잘록해졌다 모터 자리에서 둥글게 — 무게를 덜어 낸 긴 구멍과 모터 나사 구멍
function armShape() {
  const s = new THREE.Shape();
  const mr = 0.066;
  const a = 2.45;
  const jx = R + mr * Math.cos(a);
  const jy = mr * Math.sin(a);
  s.moveTo(0.03, -0.044);
  s.quadraticCurveTo(R * 0.5, -0.026, jx, -jy);
  s.absarc(R, 0, mr, -a, a, false);
  s.quadraticCurveTo(R * 0.5, 0.026, 0.03, 0.044);
  s.lineTo(0.03, -0.044);
  s.holes.push(slot(0.13, R * 0.62, 0.011));
  s.holes.push(hole(R, 0, 0.014));
  for (let k = 0; k < 4; k++) {
    const t = Math.PI / 4 + (k * Math.PI) / 2;
    s.holes.push(hole(R + Math.cos(t) * 0.036, Math.sin(t) * 0.036, 0.0065));
  }
  return s;
}

// 날개 하나: 뿌리에서 넓어졌다 끝에서 둥글게 모이는 평면형
function bladeShape() {
  const s = new THREE.Shape();
  s.moveTo(0.022, -0.012);
  s.bezierCurveTo(0.09, -0.04, 0.2, -0.032, PROP_R - 0.02, -0.016);
  s.quadraticCurveTo(PROP_R + 0.004, -0.006, PROP_R, 0.004);
  s.quadraticCurveTo(PROP_R - 0.006, 0.014, PROP_R - 0.04, 0.016);
  s.bezierCurveTo(0.2, 0.022, 0.1, 0.03, 0.022, 0.012);
  s.lineTo(0.022, -0.012);
  return s;
}

// 5인치 프리스타일 FPV 쿼드 — 영화 전체를 따라다니는 주인공
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
    const m = materials();
    // 모델은 발(TPU) 바닥이 루트보다 0.25 아래에 오도록 내려 둔다 — 패드 위 착지 높이(0.27)를 그대로 쓴다
    const g = new THREE.Group();
    g.position.y = -0.18;
    this.tiltG.add(g);
    this.model = g;
    const add = (mesh, x = 0, y = 0, z = 0) => {
      mesh.position.set(x, y, z);
      g.add(mesh);
      return mesh;
    };

    // ── 프레임: 아래판 · 네 팔 · 위판 ──
    const bottom = roundRect(0.22, 0.6, 0.05, 0, 0.01);
    bottom.holes.push(slot(-0.03, 0.03, 0.012, -0.16), slot(-0.03, 0.03, 0.012, 0.12));
    const bottomGeo = plate(bottom, 0.02);
    bottomGeo.translate(0, -0.011, 0);
    add(new THREE.Mesh(bottomGeo, m.carbon));

    const armGeo = plate(armShape(), ARM_T);
    armGeo.translate(0, -ARM_T / 2, 0);
    const top = roundRect(0.2, 0.46, 0.04, 0, 0.04);
    // 배터리 스트랩 구멍(스트랩 z -0.19 · 0.01과 같은 자리 — 판의 y는 바닥에서 -z가 된다)
    [0.19, -0.01].forEach((y) => top.holes.push(slot(-0.06, -0.035, 0.007, y), slot(0.035, 0.06, 0.007, y)));
    const topGeo = plate(top, 0.012);
    add(new THREE.Mesh(topGeo, m.carbon), 0, TOP_Y, 0);

    // 스탠드오프(주황 아노다이징 육각)
    const so = new THREE.CylinderGeometry(0.011, 0.011, TOP_Y - 0.012, 6);
    [
      [0.078, 0.17],
      [-0.078, 0.17],
      [0.078, -0.05],
      [-0.078, -0.05],
      [0.078, -0.24],
      [-0.078, -0.24],
    ].forEach(([x, z]) => add(new THREE.Mesh(so, m.anodOrange), x, TOP_Y / 2 + 0.003, z));
    // 위판 나사머리
    const screw = new THREE.CylinderGeometry(0.009, 0.009, 0.006, 12);
    [[0.078, 0.17], [-0.078, 0.17], [0.078, -0.24], [-0.078, -0.24]].forEach(([x, z]) => add(new THREE.Mesh(screw, m.alu), x, TOP_Y + 0.016, z));

    // ── 모터 · 프로펠러 · 팔 아래 빛 ──
    const motorBase = new THREE.CylinderGeometry(0.066, 0.07, 0.014, 32);
    const winding = new THREE.CylinderGeometry(0.062, 0.062, 0.016, 24);
    const bellGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.071, 0),
        new THREE.Vector2(0.074, 0.006),
        new THREE.Vector2(0.074, 0.058),
        new THREE.Vector2(0.069, 0.068),
        new THREE.Vector2(0.045, 0.073),
        new THREE.Vector2(0.02, 0.075),
        new THREE.Vector2(0.0, 0.075),
      ],
      40
    );
    const ringGeo = new THREE.TorusGeometry(0.058, 0.006, 8, 40);
    const vent = new THREE.BoxGeometry(0.018, 0.026, 0.006);
    const shaft = new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12);
    const nut = new THREE.CylinderGeometry(0.017, 0.017, 0.018, 6);
    const dome = new THREE.SphereGeometry(0.012, 16, 8, 0, TAU, 0, Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.026, 0.028, 0.02, 24);
    const bladeGeo = plate(bladeShape(), 0.004, 0.0015);
    const discGeo = new THREE.CircleGeometry(PROP_R + 0.01, 64);
    const foot = new THREE.CylinderGeometry(0.026, 0.03, 0.05, 16);
    const strip = new THREE.BoxGeometry(0.012, 0.006, 0.26);
    const sleeve = (pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.008, 8, false);

    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * (Math.PI / 2);
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const front = dir.z > 0;
      const arm = add(new THREE.Mesh(armGeo, m.carbon));
      arm.rotation.y = a - Math.PI / 2;

      const mp = dir.clone().multiplyScalar(R);
      add(new THREE.Mesh(motorBase, m.bell), mp.x, ARM_T / 2 + 0.007, mp.z);
      add(new THREE.Mesh(winding, m.copper), mp.x, ARM_T / 2 + 0.022, mp.z);
      const bell = add(new THREE.Mesh(bellGeo, m.bell), mp.x, ARM_T / 2 + 0.03, mp.z);
      // 종 옆면의 환기 홈 — 종과 함께 돈다
      for (let k = 0; k < 6; k++) {
        const v = new THREE.Mesh(vent, m.black);
        const t = (k / 6) * TAU;
        v.position.set(Math.cos(t) * 0.073, 0.03, Math.sin(t) * 0.073);
        v.rotation.y = -t + Math.PI / 2;
        bell.add(v);
      }
      const ring = new THREE.Mesh(ringGeo, front ? m.anodCyan : m.anodOrange);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.068;
      bell.add(ring);
      add(new THREE.Mesh(shaft, m.alu), mp.x, ARM_T / 2 + 0.115, mp.z);

      // 프로펠러: 세 날개 + 허브 + 너트 — 빨라지면 잔상 원판으로
      const prop = new THREE.Group();
      prop.position.set(mp.x, ARM_T / 2 + 0.112, mp.z);
      const pm = front ? m.propCyan : m.propOrange;
      prop.add(new THREE.Mesh(hub, pm));
      const blades = [];
      for (let k = 0; k < 3; k++) {
        const holder = new THREE.Group();
        holder.rotation.y = (k / 3) * TAU;
        const b = new THREE.Mesh(bladeGeo, pm);
        b.rotation.x = 0.24; // 날개 피치
        holder.add(b);
        prop.add(holder);
        blades.push(b);
      }
      const n = new THREE.Mesh(nut, front ? m.anodCyan : m.anodOrange);
      n.position.y = 0.019;
      const d = new THREE.Mesh(dome, front ? m.anodCyan : m.anodOrange);
      d.position.y = 0.028;
      prop.add(n, d);
      const disc = new THREE.Mesh(
        discGeo,
        new THREE.MeshBasicMaterial({
          map: m.blurMap,
          color: front ? 0x9ff6ff : 0xffb27a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.004;
      prop.add(disc);
      g.add(prop);
      this.props.push({ group: prop, blades, disc, bell, dir: i % 2 ? 1 : -1 });

      // 모터 아래 TPU 발
      add(new THREE.Mesh(foot, m.tpu), mp.x, -ARM_T / 2 - 0.025, mp.z);
      // 팔 아래 빛(앞 청록 · 뒤 주황) — 항법등처럼 깜빡인다
      const led = new THREE.Mesh(strip, front ? m.glowCyan : m.glowOrange);
      led.position.copy(dir).multiplyScalar(R * 0.5);
      led.position.y = -ARM_T / 2 - 0.004;
      led.rotation.y = a;
      g.add(led);
      this.leds.push(led);
      // 모터 선: 몸통에서 팔 위를 따라 모터까지
      const p0 = dir.clone().multiplyScalar(0.1).setY(0.03);
      const p1 = dir.clone().multiplyScalar(R * 0.55).setY(ARM_T / 2 + 0.009);
      const p2 = dir.clone().multiplyScalar(R - 0.08).setY(ARM_T / 2 + 0.012);
      add(new THREE.Mesh(sleeve([p0, p1, p2]), m.wireBlack));
    }

    // ── 전자 장치 스택: ESC(아래) · FC(위) ──
    const esc = add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.17), m.pcb), 0, 0.04, -0.04);
    const fc = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.007, 0.15), m.pcb), 0, 0.09, -0.04);
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        const fet = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.02), m.chip);
        fet.position.set(sx * 0.045, 0.008, sz * 0.045);
        esc.add(fet);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.002, 0.012), m.gold);
        pad.position.set(sx * 0.075, 0.005, sz * 0.075);
        esc.add(pad);
      })
    );
    const mcu = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.006, 0.045), m.chip);
    mcu.position.y = 0.006;
    fc.add(mcu);
    const fcLed = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.008), m.glowGreen);
    fcLed.position.set(0.05, 0.006, 0.05);
    fc.add(fcLed);
    // 뒤쪽 저ESR 콘덴서
    const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.09, 16), m.black), 0, 0.055, -0.26);
    cap.rotation.x = Math.PI / 2;
    const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.02, 16), m.alu);
    capBand.position.y = 0.035;
    cap.add(capBand);

    // ── FPV 카메라: 앞 케이지 안에서 위로 25° ──
    const cageShape = new THREE.Shape();
    cageShape.moveTo(0.17, 0.011);
    cageShape.lineTo(0.315, 0.011);
    cageShape.lineTo(0.315, 0.07);
    cageShape.quadraticCurveTo(0.31, 0.15, 0.24, TOP_Y);
    cageShape.lineTo(0.17, TOP_Y);
    cageShape.lineTo(0.17, 0.011);
    cageShape.holes.push(hole(0.245, 0.08, 0.012));
    const cageGeo = new THREE.ExtrudeGeometry(cageShape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 16 });
    cageGeo.rotateY(-Math.PI / 2);
    add(new THREE.Mesh(cageGeo, m.carbon), 0.075, 0, 0);
    add(new THREE.Mesh(cageGeo, m.carbon), -0.065, 0, 0);
    const cam = new THREE.Group();
    cam.position.set(0, 0.08, 0.245);
    cam.rotation.x = -0.44;
    g.add(cam);
    cam.add(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.11, 0.09, 3, 0.012), m.black));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.05, 24), m.bell);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.068;
    cam.add(barrel);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.028, 24), m.lens);
    glass.position.z = 0.094;
    cam.add(glass);
    const glint = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0018, 6, 24), m.glowLens);
    glint.position.z = 0.095;
    cam.add(glint);
    // 나사(케이지 고정)
    [-1, 1].forEach((s) => {
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 12), m.alu);
      sc.rotation.z = Math.PI / 2;
      sc.position.set(s * 0.083, 0.08, 0.245);
      g.add(sc);
    });

    // ── 배터리(6S LiPo) · 고무 패드 · 스트랩 · XT60 ──
    const batY = TOP_Y + 0.012 + 0.006;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.006, 0.3), m.rubber), 0, batY - 0.003, -0.095);
    // 라벨은 긴 옆면(0.34 × 0.19)에 맞춰 그렸다
    add(new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.19, 0.34, 3, 0.022), m.battery), 0, batY + 0.095, -0.095);
    [-0.19, 0.01].forEach((z) => {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.196, 0.006, 0.028), m.strap), 0, batY + 0.193, z);
      [-1, 1].forEach((s) => add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.2, 0.028), m.strap), s * 0.095, batY + 0.095, z));
      add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.032), m.anodOrange), 0.05, batY + 0.198, z); // 버클
    });
    // XT60 선: 배터리 뒤에서 내려와 스택으로
    [
      [0.012, m.wireRed],
      [-0.012, m.wireBlack],
    ].forEach(([x, mat]) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, batY + 0.06, -0.25),
        new THREE.Vector3(x, batY + 0.05, -0.31),
        new THREE.Vector3(x, TOP_Y - 0.01, -0.33),
        new THREE.Vector3(x, 0.07, -0.27),
      ]);
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.0085, 8, false), mat));
    });
    add(new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.026, 0.05, 2, 0.006), m.xt60), 0, TOP_Y + 0.02, -0.325);

    // ── HD 액션캠: 앞쪽 TPU 마운트 위에 위로 기울여 ──
    const mount = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.1), m.tpu), 0, TOP_Y + 0.027, 0.14);
    mount.rotation.x = -0.12;
    const hd = new THREE.Group();
    hd.position.set(0, TOP_Y + 0.12, 0.172);
    hd.rotation.x = -0.3;
    g.add(hd);
    hd.add(new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.15, 0.12, 3, 0.018), m.black));
    const face = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, 0.012, 2, 0.01), m.lens);
    face.position.set(-0.035, 0, 0.064);
    hd.add(face);
    const hdLens = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.02, 32), m.bell);
    hdLens.rotation.x = Math.PI / 2;
    hdLens.position.set(-0.035, 0, 0.075);
    hd.add(hdLens);
    const hdGlass = new THREE.Mesh(new THREE.CircleGeometry(0.026, 32), m.lens);
    hdGlass.position.set(-0.035, 0, 0.086);
    hd.add(hdGlass);
    const rec = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), m.glowRed);
    rec.position.set(0.07, 0.078, 0.03);
    hd.add(rec);
    this.rec = rec;

    // ── 안테나: 뒤쪽 VTX 롤리팝 + 수신기 두 가닥(TPU 튜브) ──
    const vtxMount = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), m.tpu), 0, TOP_Y + 0.027, -0.255);
    vtxMount.rotation.x = 0.2;
    const vtx = new THREE.Group();
    vtx.position.set(0, TOP_Y + 0.04, -0.27);
    vtx.rotation.x = -0.75;
    g.add(vtx);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.13, 8), m.black);
    stem.position.y = 0.065;
    vtx.add(stem);
    const lolli = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.016, 24), m.tpu);
    lolli.position.y = 0.135;
    vtx.add(lolli);
    [-1, 1].forEach((s) => {
      const rx = new THREE.Group();
      rx.position.set(s * 0.06, TOP_Y + 0.02, -0.26);
      rx.rotation.set(-0.7, 0, s * -0.55);
      g.add(rx);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 8), m.tpu);
      tube.position.y = 0.03;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.15, 6), m.black);
      wire.position.y = 0.11;
      rx.add(tube, wire);
    });
    // 꼬리등
    const tail = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.008), m.glowOrange), 0, TOP_Y + 0.006, -0.235);
    this.leds.push(tail);

    // 레이캐스트용 보이지 않는 히트 박스
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.userData.actor = this;
    this.tiltG.add(this.hit);
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
    return { title: 'FPV QUAD · 5" FREESTYLE', sub: 'Click — flip' };
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

    // 진행 방향으로 기울기 — FPV답게 앞으로 더 깊게 숙이고 크게 눕는다
    tmp2.copy(this.vel).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -this.yaw);
    let pitch = THREE.MathUtils.clamp(tmp2.z * 0.14, -0.6, 0.6) + this.pointer.y * 0.06;
    let roll = THREE.MathUtils.clamp(-tmp2.x * 0.14, -0.6, 0.6) - this.pointer.x * 0.08;
    if (airborne) {
      pitch += Math.sin(t * 1.3) * 0.02;
      roll += Math.sin(t * 1.1 + 1.0) * 0.02;
    }
    this.tiltG.rotation.x += (pitch - this.tiltG.rotation.x) * Math.min(1, dt * 5);
    let flipRoll = 0;
    if (this.flipT >= 0) {
      this.flipT += dt / 0.8;
      const p = Math.min(1, this.flipT);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      flipRoll = e * TAU;
      this.root.position.y += Math.sin(p * Math.PI) * 0.6;
      if (p >= 1) this.flipT = -1;
    }
    this.roll = (this.roll || 0) + (roll - (this.roll || 0)) * Math.min(1, dt * 5);
    this.tiltG.rotation.z = this.roll + flipRoll;

    // 프로펠러 · 모터 종: 빨라질수록 날개 대신 잔상 원판
    const spin = (8 + 90 * this.throttle) * dt;
    const blur = THREE.MathUtils.smoothstep(this.throttle, 0.3, 0.85);
    for (const p of this.props) {
      p.group.rotation.y += spin * p.dir;
      p.bell.rotation.y += spin * p.dir;
      p.disc.material.opacity = blur * 0.5;
      p.disc.rotation.z += spin * p.dir * 0.05;
      const show = blur < 0.6 || Math.random() > 0.55 + blur * 0.3;
      p.blades.forEach((b) => (b.visible = show));
    }
    const blink = (Math.sin(t * 6) > 0.6 ? 1 : 0.35) * (0.3 + this.throttle * 0.7);
    this.leds.forEach((l) => l.scale.set(0.5 + blink * 0.7, 0.5 + blink * 0.7, 1));
    // 녹화 표시등: 날고 있을 때 1초마다 깜빡
    if (this.rec) this.rec.visible = airborne && Math.sin(t * Math.PI * 2) > -0.2;
  }
}
