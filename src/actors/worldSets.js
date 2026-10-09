import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats, glow, COLORS } from '../core/materials.js';
import { makeLabel, makeFloorText } from '../core/labels.js';
import { lightCone } from '../core/stage.js';

// ── 00 격납고: 착륙 패드 + 스포트라이트 ─────────────────────────
export class HangarSet {
  constructor(center) {
    this.group = new THREE.Group();
    this.group.position.copy(center);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.08, 64), mats.pad);
    pad.position.y = 0.04;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.26, 96), glow(COLORS.cyan, 2.2));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.085;
    const H = makeFloorText('H', { size: 210, color: 'rgba(232,237,244,0.85)', width: 256, height: 256, weight: 700 });
    H.scale.setScalar(2.2);
    H.position.y = 0.09;
    this.group.add(pad, ring, H);
    // 패드 둘레의 점멸 마커
    this.markers = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.12), glow(i % 3 ? COLORS.cyan : COLORS.orange, 4));
      m.position.set(Math.cos(a) * 2.75, 0.03, Math.sin(a) * 2.75);
      this.group.add(m);
      this.markers.push(m);
    }
    this.cone = lightCone({ top: 0.2, bottom: 2.6, height: 14, opacity: 0.2 });
    this.cone.position.y = 14;
    this.group.add(this.cone);
    const floor = makeFloorText('00 — HANGAR', { size: 120, color: 'rgba(94,242,255,0.13)' });
    floor.scale.setScalar(2.2);
    floor.position.set(0, 0.03, -4.6);
    this.group.add(floor);
    this.coneLevel = 0;
  }
  update(dt, t) {
    this.markers.forEach((m, i) => m.scale.setScalar(0.6 + 0.6 * Math.max(0, Math.sin(t * 3 - i * 0.5))));
    this.cone.material.uniforms.uOpacity.value = 0.2 * this.coneLevel;
  }
}

// ── 02 항공: 웨이포인트 미션 ──────────────────────────────────
export class AerialSet {
  constructor(center) {
    this.group = new THREE.Group();
    this.group.position.copy(center);
    this.center = center.clone();
    const wps = [
      [5.5, 3.2, 0],
      [3.2, 4.6, 5.0],
      [-2.8, 5.6, 5.4],
      [-6.0, 4.2, 0.6],
      [-3.4, 3.0, -4.8],
      [2.6, 3.8, -5.4],
    ];
    this.waypoints = wps.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this.curve = new THREE.CatmullRomCurve3(
      this.waypoints.map((p) => p.clone().add(center)),
      true,
      'centripetal'
    );

    // 지오펜스
    const fence = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 8, 64, 4, true),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, wireframe: true, transparent: true, opacity: 0.05 })
    );
    fence.position.y = 4;
    this.group.add(fence);
    const base = new THREE.Mesh(new THREE.RingGeometry(8.95, 9.05, 128), glow(COLORS.cyan, 1.6));
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.02;
    this.group.add(base);

    // 경로 라인(진행 대시)
    const pts = this.curve.getSpacedPoints(400).map((p) => p.clone().sub(center));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const along = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) along[i] = i / (pts.length - 1);
    geo.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    this.pathMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uHead: { value: 0 } },
      vertexShader: /* glsl */ `attribute float aAlong; varying float vA; void main(){ vA = aAlong; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uHead; varying float vA;
        void main(){
          float dash = step(0.45, fract(vA * 120.0 - uTime * 1.5));
          float behind = fract(uHead - vA);
          float trail = exp(-behind * 7.0);
          vec3 col = vec3(0.37, 0.95, 1.0) * (0.35 * dash + trail * 1.8);
          gl_FragColor = vec4(col, 0.6 * dash + trail);
        }
      `,
    });
    this.group.add(new THREE.Line(geo, this.pathMat));

    // 웨이포인트 마커
    this.wpRings = [];
    this.waypoints.forEach((p, i) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, p.y, 6),
        new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.35 })
      );
      pillar.position.set(p.x, p.y / 2, p.z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 40), glow(COLORS.cyan, 2.4));
      ring.position.copy(p);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), glow(COLORS.cyan, 0.8));
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(p.x, 0.03, p.z);
      const tag = makeLabel([`WP${i + 1}`, `ALT ${(p.y * 10).toFixed(0)}m`], { width: 300, height: 110, size: 34, bg: null });
      tag.position.set(p.x, p.y + 0.8, p.z);
      tag.scale.multiplyScalar(1.6);
      this.group.add(pillar, ring, dot, tag);
      this.wpRings.push(ring);
    });

    // 홈 패드
    const home = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.06, 48), mats.pad);
    home.position.y = 0.03;
    const homeRing = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.1, 64), glow(COLORS.orange, 2.5));
    homeRing.rotation.x = -Math.PI / 2;
    homeRing.position.y = 0.065;
    this.group.add(home, homeRing);

    const floor = makeFloorText('02 — AERIAL', { size: 120, color: 'rgba(94,242,255,0.28)' });
    floor.scale.setScalar(3);
    floor.position.set(0, 0.03, 10.2);
    this.group.add(floor);
  }
  update(dt, t, droneU) {
    this.pathMat.uniforms.uTime.value = t;
    this.pathMat.uniforms.uHead.value = droneU;
    this.wpRings.forEach((r, i) => {
      r.rotation.y = t * 0.8 + i;
      r.rotation.x = Math.sin(t * 0.6 + i) * 0.4;
    });
  }
}

// ── 05 AI: 뉴럴 코어 ────────────────────────────────────────
export class NeuralCore {
  constructor(center) {
    this.group = new THREE.Group();
    this.group.position.copy(center);
    this.spin = new THREE.Group();
    this.group.add(this.spin);
    this.energy = 0;

    const nodes = [];
    const NO = 360;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NO; i++) {
      const y = 1 - (i / (NO - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      nodes.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(2.7));
    }
    for (let i = 0; i < 150; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.9 + Math.random() * 1.5);
      nodes.push(v);
    }
    const n = nodes.length;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const hot = new Float32Array(n);
    nodes.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], i * 3);
      seed[i] = Math.random();
      hot[i] = Math.random() < 0.08 ? 1 : 0;
    });
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    pg.setAttribute('aHot', new THREE.BufferAttribute(hot, 1));
    this.nodeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) }, uEnergy: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aSeed; attribute float aHot; uniform float uTime, uPx, uEnergy; varying float vA; varying float vHot;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 50.0);
          gl_PointSize = uPx * (2.0 + aHot * 2.5 + uEnergy * 1.5) * (18.0 / -mv.z) * (0.7 + tw * 0.6);
          vA = tw; vHot = aHot;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA; varying float vHot;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          vec3 c = mix(vec3(0.45, 0.95, 1.0), vec3(1.0, 0.5, 0.15), vHot);
          gl_FragColor = vec4(c * a * 2.0, a);
        }
      `,
    });
    this.spin.add(new THREE.Points(pg, this.nodeMat));

    // 가까운 이웃끼리 연결
    const edges = [];
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      const dists = [];
      for (let j = 0; j < n; j++) if (i !== j) dists.push([nodes[i].distanceToSquared(nodes[j]), j]);
      dists.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < 3; k++) {
        const j = dists[k][1];
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      }
    }
    const ep = new Float32Array(edges.length * 6);
    const et = new Float32Array(edges.length * 2);
    const es = new Float32Array(edges.length * 2);
    edges.forEach(([a, b], i) => {
      ep.set([nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z], i * 6);
      et.set([0, 1], i * 2);
      const s = Math.random();
      es.set([s, s], i * 2);
    });
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    eg.setAttribute('aT', new THREE.BufferAttribute(et, 1));
    eg.setAttribute('aSeed', new THREE.BufferAttribute(es, 1));
    this.edgeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 } },
      vertexShader: /* glsl */ `attribute float aT; attribute float aSeed; varying float vT; varying float vS; void main(){ vT = aT; vS = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uEnergy; varying float vT; varying float vS;
        void main(){
          float p = fract(uTime * (0.25 + vS * 0.5) * (1.0 + uEnergy * 2.0) + vS * 9.0);
          float pulse = exp(-pow((vT - p) * 9.0, 2.0));
          float a = 0.07 + pulse * (0.7 + uEnergy * 0.6) * step(0.45, vS);
          vec3 c = mix(vec3(0.3, 0.75, 0.95), vec3(0.75, 1.0, 1.0), pulse);
          gl_FragColor = vec4(c * a * 1.8, a);
        }
      `,
    });
    this.spin.add(new THREE.LineSegments(eg, this.edgeMat));

    // 중심 코어
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.orange).multiplyScalar(3), wireframe: true }));
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.orange).multiplyScalar(1.4) }));
    this.ico = ico;
    this.inner = inner;
    this.group.add(ico, inner);

    // 궤도 링
    this.rings = [];
    [[3.4, 0.4, 0.2], [3.8, -0.6, 1.1], [4.3, 1.2, -0.4]].forEach(([r, rx, rz], i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 6, 160), glow(i === 1 ? COLORS.orange : COLORS.cyan, 1.6));
      ring.rotation.set(Math.PI / 2 + rx, 0, rz);
      this.group.add(ring);
      this.rings.push(ring);
    });
    // 눈금 링
    const tick = new THREE.BoxGeometry(0.02, 0.18, 0.02);
    const ticks = new THREE.InstancedMesh(tick, glow(COLORS.cyan, 1.4), 120);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const len = i % 10 === 0 ? 2.2 : 1;
      m.compose(new THREE.Vector3(Math.cos(a) * 4.9, 0, Math.sin(a) * 4.9), new THREE.Quaternion(), new THREE.Vector3(1, len, 1));
      ticks.setMatrixAt(i, m);
    }
    this.ticks = ticks;
    this.group.add(ticks);

    // 지면으로 내려가는 빛기둥
    this.beam = lightCone({ top: 0.5, bottom: 1.6, height: 7.5, color: 0xffa060, opacity: 0.14 });
    this.beam.position.y = -0.4;
    this.group.add(this.beam);

    const tag = makeLabel(['NEURAL CORE', 'perception → planning'], { width: 460, height: 110, size: 30, bg: null });
    tag.position.set(0, 3.6, 0);
    tag.scale.multiplyScalar(2.2);
    this.group.add(tag);

    this.hit = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.userData.actor = this;
    this.group.add(this.hit);
    this.boost = 0;
  }
  get label() {
    return { title: 'NEURAL CORE', sub: 'Click — fire the network' };
  }
  poke() {
    this.boost = 1.6;
  }
  update(dt, t, pointer) {
    this.boost = Math.max(0, this.boost - dt * 0.8);
    const e = Math.min(1.5, this.energy + this.boost);
    this.nodeMat.uniforms.uTime.value = t;
    this.nodeMat.uniforms.uEnergy.value = e;
    this.edgeMat.uniforms.uTime.value = t;
    this.edgeMat.uniforms.uEnergy.value = e;
    this.spin.rotation.y += dt * (0.08 + e * 0.25);
    this.spin.rotation.x += ((pointer?.y || 0) * 0.25 - this.spin.rotation.x) * Math.min(1, dt * 2);
    this.ico.rotation.y -= dt * 0.5;
    this.ico.rotation.x += dt * 0.3;
    const s = 1 + Math.sin(t * 2.2) * 0.05 + e * 0.15;
    this.ico.scale.setScalar(s);
    this.inner.scale.setScalar(s * (0.9 + Math.sin(t * 4) * 0.05));
    this.rings.forEach((r, i) => (r.rotation.z += dt * (0.1 + i * 0.07) * (i % 2 ? -1 : 1)));
    this.ticks.rotation.y -= dt * 0.05;
  }
}

// ── 07 기록: 연도별 수상 적층 막대 ────────────────────────────
export class RecordSet {
  constructor(center) {
    this.group = new THREE.Group();
    this.group.position.copy(center);
    this.years = [['2023', 7], ['2024', 15], ['2025', 14], ['2026', 1]];
    this.total = this.years.reduce((s, y) => s + y[1], 0);
    const geo = new RoundedBoxGeometry(1.4, 0.13, 1.4, 2, 0.03);
    const mat = new THREE.MeshStandardMaterial({ color: 0xa9b4c0, metalness: 0.45, roughness: 0.4, emissive: new THREE.Color(COLORS.cyan), emissiveIntensity: 0.03 });
    this.plates = new THREE.InstancedMesh(geo, mat, this.total);
    this.plates.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.slots = [];
    this.years.forEach(([y, count], i) => {
      const x = (i - 1.5) * 2.5;
      for (let j = 0; j < count; j++) this.slots.push({ x, y: 0.12 + j * 0.2, col: i, row: j });
      const yl = makeFloorText(y, { size: 150, color: 'rgba(232,237,244,0.75)', width: 512, height: 256 });
      yl.scale.setScalar(1.3);
      yl.position.set(x, 0.03, 1.5);
      this.group.add(yl);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.02, 1.44), glow(i === 2 ? COLORS.orange : COLORS.cyan, 3));
      cap.userData = { col: i, top: 0.12 + (count - 1) * 0.2 + 0.075 };
      this.group.add(cap);
      const tag = makeLabel([`${count}`, `awards · ${y}`], { width: 280, height: 120, size: 44, bg: null, border: false, color: i === 2 ? '#ff8a40' : '#5ef2ff' });
      tag.scale.multiplyScalar(1.7);
      tag.userData = { col: i, top: cap.userData.top + 0.7 };
      this.group.add(tag);
      (this.caps ||= []).push(cap);
      (this.tags ||= []).push(tag);
    });
    this.group.add(this.plates);
    const base = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.04, 2.4), mats.pad);
    base.position.y = 0.02;
    this.group.add(base);
    const floor = makeFloorText('07 — RECORD', { size: 120, color: 'rgba(94,242,255,0.22)' });
    floor.scale.setScalar(2);
    floor.position.set(0, 0.03, -3.4);
    this.group.add(floor);
    this.reveal = 0;
    this.revealTarget = 0;
    this.dummy = new THREE.Object3D();
    this.update(0, 0);
  }
  update(dt, t) {
    this.reveal += (this.revealTarget - this.reveal) * Math.min(1, dt * 1.1);
    const n = this.slots.length;
    this.slots.forEach((s, i) => {
      const order = (s.row + s.col * 0.6) / 16;
      const k = THREE.MathUtils.clamp((this.reveal * 1.6 - order) * 3, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      this.dummy.position.set(s.x, s.y + (1 - e) * 4, 0);
      this.dummy.scale.setScalar(Math.max(0.0001, e));
      this.dummy.rotation.y = (1 - e) * 1.2 + Math.sin(t * 0.6 + i * 0.4) * 0.015;
      this.dummy.updateMatrix();
      this.plates.setMatrixAt(i, this.dummy.matrix);
    });
    this.plates.instanceMatrix.needsUpdate = true;
    const show = THREE.MathUtils.clamp(this.reveal * 1.3 - 0.3, 0, 1);
    this.caps.forEach((c) => {
      c.position.set((c.userData.col - 1.5) * 2.5, c.userData.top * show + 0.01, 0);
      c.visible = show > 0.02;
    });
    this.tags.forEach((tg) => {
      tg.position.set((tg.userData.col - 1.5) * 2.5, tg.userData.top * show + 0.3, 0);
      tg.material.opacity = show;
    });
  }
}

// ── 데이터 링크: 각 세트 ↔ 코어 ───────────────────────────────
export class DataLinks {
  constructor(core, points) {
    this.group = new THREE.Group();
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uOpacity; varying vec2 vUv;
        void main(){
          float p = fract(vUv.x * 3.0 - uTime * 0.45);
          float pulse = smoothstep(0.0, 0.08, p) * smoothstep(0.35, 0.08, p);
          float a = (0.18 + pulse * 1.4) * uOpacity;
          gl_FragColor = vec4(vec3(0.4, 0.95, 1.0) * a * 1.6, a);
        }
      `,
    });
    points.forEach((p) => {
      const from = p.clone().setY(p.y + 1.2);
      const mid = from.clone().lerp(core, 0.5);
      mid.y += 7;
      const curve = new THREE.QuadraticBezierCurve3(from, mid, core.clone());
      this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.035, 6, false), this.mat));
    });
    this.level = 0;
  }
  update(dt, t) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uOpacity.value += (this.level - this.mat.uniforms.uOpacity.value) * Math.min(1, dt * 1.5);
    this.group.visible = this.mat.uniforms.uOpacity.value > 0.01;
  }
}
