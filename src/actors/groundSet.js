import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats, glow, COLORS, contactShadow } from '../core/materials.js';
import { makeLabel, makeFloorText } from '../core/labels.js';

const TAU = Math.PI * 2;

// 둥근 사각형 트랙
function trackCurve(cx, cz, hx, hz, r) {
  const pts = [];
  const corners = [
    [cx + hx - r, cz + hz - r, 0],
    [cx - hx + r, cz + hz - r, Math.PI / 2],
    [cx - hx + r, cz - hz + r, Math.PI],
    [cx + hx - r, cz - hz + r, (3 * Math.PI) / 2],
  ];
  corners.forEach(([x, z, a0]) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector3(x + Math.cos(a) * r, 0, z + Math.sin(a) * r));
    }
  });
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

function roadRibbon(curve, width, segments = 400) {
  const pos = [];
  const uv = [];
  const idx = [];
  const len = curve.getLength();
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u % 1, p);
    curve.getTangentAt(u % 1, tan);
    side.set(-tan.z, 0, tan.x).normalize().multiplyScalar(width / 2);
    pos.push(p.x + side.x, 0.02, p.z + side.z, p.x - side.x, 0.02, p.z - side.z);
    uv.push(u * len, 0, u * len, 1);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    fog: false,
    side: THREE.DoubleSide,
    uniforms: { uFog: { value: new THREE.Color(COLORS.horizon) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWorld;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; varying vec2 vUv; varying vec3 vWorld;
      void main(){
        vec3 col = vec3(0.035, 0.042, 0.055);
        float across = vUv.y;
        float edge = smoothstep(0.06, 0.04, across) + smoothstep(0.94, 0.96, across);
        float center = step(abs(across - 0.5), 0.018) * step(0.5, fract(vUv.x * 0.9));
        col += vec3(0.85, 0.9, 0.95) * edge * 0.55;
        col += vec3(1.0, 0.7, 0.25) * center * 0.75;
        float fade = exp(-length(vWorld - cameraPosition) * 0.024);
        gl_FragColor = vec4(mix(uFog, col, fade), 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

class TrafficLight {
  constructor() {
    this.group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 12), mats.body);
    pole.position.y = 1.6;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.3), mats.body);
    arm.position.set(0, 3.1, 0.62);
    const box = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.9, 0.3, 2, 0.04), mats.dark);
    box.position.set(0, 2.62, 1.2);
    this.group.add(pole, arm, box);
    this.lamps = {};
    const lampGeo = new THREE.CircleGeometry(0.1, 24);
    [['red', COLORS.red, 2.9], ['amber', COLORS.amber, 2.62], ['green', COLORS.green, 2.34]].forEach(([k, c, y]) => {
      const on = glow(c, 6);
      const off = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.12) });
      const m = new THREE.Mesh(lampGeo, off);
      m.position.set(-0.172, y, 1.2);
      m.rotation.y = -Math.PI / 2;
      this.group.add(m);
      this.lamps[k] = { mesh: m, on, off };
    });
    // 인식 박스
    const bb = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 1.1, 0.46)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(2.5), transparent: true, opacity: 0.9 })
    );
    bb.position.set(0, 2.62, 1.2);
    this.group.add(bb);
    this.bbox = bb;
    this.tag = makeLabel(['TRAFFIC_LIGHT', 'RED · conf 0.97'], { width: 420, height: 110, size: 30 });
    this.tag.position.set(0, 3.45, 1.2);
    this.tag.scale.multiplyScalar(2.2);
    this.group.add(this.tag);
    this.state = 'green';
    this.t = 0;
    this.set('green');
  }
  set(state) {
    this.state = state;
    Object.entries(this.lamps).forEach(([k, l]) => (l.mesh.material = k === state ? l.on : l.off));
    const col = state === 'red' ? '#ff5050' : state === 'amber' ? '#ffb547' : '#3dff9a';
    const conf = (0.93 + Math.random() * 0.06).toFixed(2);
    this.tag.userData.redraw(['TRAFFIC_LIGHT', `${state.toUpperCase()} · conf ${conf}`], col);
    this.bbox.material.color.set(col).multiplyScalar(2.5);
  }
  update(dt) {
    this.t += dt;
    const cycle = { green: 5.5, amber: 1.3, red: 4.2 };
    if (this.t > cycle[this.state]) {
      this.t = 0;
      this.set(this.state === 'green' ? 'amber' : this.state === 'amber' ? 'red' : 'green');
    }
  }
}

class Rover {
  constructor() {
    this.root = new THREE.Group();
    const g = new THREE.Group();
    this.root.add(g);
    this.body = g;
    const chassis = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.24, 1.62, 4, 0.08), mats.shell);
    chassis.position.y = 0.36;
    const skirt = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.12, 1.5, 2, 0.04), mats.dark);
    skirt.position.y = 0.24;
    const cabin = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.22, 0.84, 4, 0.08), mats.glass);
    cabin.position.set(0, 0.56, -0.06);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.03, 1.2), mats.orange);
    stripe.position.set(0, 0.4, 0);
    g.add(chassis, skirt, cabin, stripe);

    // 라이다 퍽
    const lidarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.08, 24), mats.dark);
    lidarBase.position.set(0, 0.72, 0.05);
    const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.13, 24), mats.body);
    lidar.position.set(0, 0.82, 0.05);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.012, 8, 32), mats.glowCyan);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.83, 0.05);
    g.add(lidarBase, lidar, ring);
    this.lidarHead = lidar;

    // 전방 카메라, 헤드라이트, 테일라이트
    [-0.24, 0.24].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), mats.glowWhite);
      hl.position.set(x, 0.38, 0.815);
      g.add(hl);
    });
    this.tailOn = glow(COLORS.red, 7);
    this.tailOff = glow(COLORS.red, 1.5);
    this.tails = [-0.28, 0.28].map((x) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.02), this.tailOff);
      tl.position.set(x, 0.4, -0.815);
      g.add(tl);
      return tl;
    });
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.06), mats.dark);
    cam.position.set(0, 0.62, 0.36);
    const camLens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), mats.glowCyan);
    camLens.position.set(0, 0.62, 0.392);
    g.add(cam, camLens);

    // 바퀴
    const tire = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 28);
    tire.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.11, 0.11, 0.15, 16);
    hub.rotateZ(Math.PI / 2);
    this.wheels = [];
    this.steer = [];
    [[-0.5, 0.52], [0.5, 0.52], [-0.5, -0.52], [0.5, -0.52]].forEach(([x, z], i) => {
      const s = new THREE.Group();
      s.position.set(x, 0.2, z);
      const w = new THREE.Group();
      w.add(new THREE.Mesh(tire, mats.rubber), new THREE.Mesh(hub, mats.metal));
      s.add(w);
      g.add(s);
      this.wheels.push(w);
      if (i < 2) this.steer.push(s);
    });

    g.add(Object.assign(contactShadow(2.4, 0.7), {}));

    this.hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.9), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = 0.5;
    this.hit.userData.actor = this;
    g.add(this.hit);
    this.flash = 0;
  }
  get label() {
    return { title: 'AUTONOMOUS ROVER', sub: 'LiDAR · Camera — click to flash' };
  }
  poke() {
    this.flash = 1.2;
  }
}

export class GroundSet {
  constructor(center) {
    this.group = new THREE.Group();
    this.group.position.copy(center);
    this.center = center.clone();
    const cx = 0;
    const cz = 0;
    this.curve = trackCurve(cx, cz, 7.2, 4.6, 2.6);
    this.length = this.curve.getLength();
    this.group.add(roadRibbon(this.curve, 1.9));

    // 경계 펜스
    this.bounds = { minX: -10, maxX: 10, minZ: -7.4, maxZ: 7.4 };
    const fenceMat = glow(COLORS.cyan, 1.2);
    const { minX, maxX, minZ, maxZ } = this.bounds;
    [
      [0, minZ, maxX - minX, 0.06],
      [0, maxZ, maxX - minX, 0.06],
      [minX, 0, 0.06, maxZ - minZ],
      [maxX, 0, 0.06, maxZ - minZ],
    ].forEach(([x, z, w, d]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), mats.body);
      wall.position.set(x, 0.25, z);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.02, d + 0.01), fenceMat);
      top.position.set(x, 0.51, z);
      this.group.add(wall, top);
    });

    // 장애물(라이다가 읽는 대상)
    this.obstacles = [];
    const cone = new THREE.ConeGeometry(0.18, 0.46, 20);
    const coneMat = mats.orange;
    const addCone = (x, z) => {
      const m = new THREE.Mesh(cone, coneMat);
      m.position.set(x, 0.23, z);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.06, 16), mats.shell);
      band.position.set(x, 0.24, z);
      this.group.add(m, band);
      this.obstacles.push({ x, z, r: 0.18, h: 0.46 });
    };
    [[-3, 2.1], [-1.5, 2.1], [0, 2.1], [1.5, 2.1], [3, 2.1], [-3, -2.1], [3, -2.1], [8.4, 3.6], [8.4, -3.6], [-8.6, 0]].forEach(([x, z]) => addCone(x, z));

    // 보행자 더미
    const addPed = (x, z, rot) => {
      const p = new THREE.Group();
      const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 6, 12), mats.shell);
      bodyM.position.y = 0.75;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mats.shell);
      head.position.y = 1.5;
      p.add(bodyM, head);
      p.position.set(x, 0, z);
      p.rotation.y = rot;
      this.group.add(p);
      this.obstacles.push({ x, z, r: 0.22, h: 1.65 });
      const bb = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.6, 1.8, 0.6)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(COLORS.amber).multiplyScalar(2.2) })
      );
      bb.position.set(x, 0.9, z);
      this.group.add(bb);
      const tag = makeLabel(['PEDESTRIAN', 'conf 0.94 · 2.1m/s'], { color: '#ffb547', width: 420, height: 110, size: 30 });
      tag.position.set(x, 2.15, z);
      tag.scale.multiplyScalar(1.9);
      this.group.add(tag);
    };
    addPed(-6.2, 6.3, 0.4);
    addPed(5.6, -6.3, 2.5);

    // 주차 구역
    const park = new THREE.Group();
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xcfd8e3 });
    for (let i = 0; i < 4; i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.8), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(-1.8 + i * 1.2, 0.025, 0);
      park.add(l);
    }
    const P = makeFloorText('P', { size: 200, color: 'rgba(94,242,255,0.75)', width: 256, height: 256 });
    P.scale.setScalar(1.1);
    P.position.set(-1.2, 0.03, 0);
    park.add(P);
    park.position.set(0, 0, 0);
    this.group.add(park);

    // 신호등과 정지선
    this.light = new TrafficLight();
    this.stopU = 0.04;
    const stopP = this.curve.getPointAt(this.stopU);
    const stopT = this.curve.getTangentAt(this.stopU);
    const stopYaw = Math.atan2(stopT.x, stopT.z);
    const stop = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.16), new THREE.MeshBasicMaterial({ color: 0xe8edf4 }));
    stop.rotation.x = -Math.PI / 2;
    stop.rotation.z = stopYaw;
    stop.position.set(stopP.x, 0.03, stopP.z);
    this.group.add(stop);
    const sideV = new THREE.Vector3(stopT.z, 0, -stopT.x).normalize();
    this.light.group.position.set(stopP.x + sideV.x * 1.5 + stopT.x * 0.6, 0, stopP.z + sideV.z * 1.5 + stopT.z * 0.6);
    this.light.group.rotation.y = stopYaw - Math.PI / 2;
    this.group.add(this.light.group);
    this.obstacles.push({ x: this.light.group.position.x, z: this.light.group.position.z, r: 0.1, h: 3.2 });

    const floor = makeFloorText('03 — GROUND', { size: 120, color: 'rgba(94,242,255,0.28)' });
    floor.scale.setScalar(3);
    floor.position.set(0, 0.03, 9.6);
    this.group.add(floor);

    // 로버
    this.rover = new Rover();
    this.group.add(this.rover.root);
    this.s = this.length * 0.6;
    this.v = 2.0;
    this.cruise = 2.2;

    this.buildLidar();
    this.buildScreen();
  }

  buildLidar() {
    this.channels = [-0.3, -0.22, -0.155, -0.105, -0.065, -0.03, 0.0, 0.03];
    this.rays = 220;
    const n = this.rays * this.channels.length;
    const geo = new THREE.BufferGeometry();
    this.lidarPos = new Float32Array(n * 3);
    this.lidarCol = new Float32Array(n * 4);
    geo.setAttribute('position', new THREE.BufferAttribute(this.lidarPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.lidarCol, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPx: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: /* glsl */ `
        attribute vec4 color; varying vec4 vC; uniform float uPx;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * 2.4 * (14.0 / -mv.z) + 1.0; }
      `,
      fragmentShader: /* glsl */ `
        varying vec4 vC;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vC.a; gl_FragColor = vec4(vC.rgb * a * 2.2, a); }
      `,
    });
    this.lidarPoints = new THREE.Points(geo, mat);
    this.lidarPoints.frustumCulled = false;
    this.group.add(this.lidarPoints);
    this.spin = 0;
  }

  buildScreen() {
    const w = 5.6;
    const h = (w * 9) / 16;
    const frame = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, h + 0.2), new THREE.MeshBasicMaterial({ color: 0x020305 }));
    back.position.z = -0.01;
    this.screenMat = new THREE.MeshBasicMaterial({ color: 0x111820, toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.screenMat);
    frame.add(back, screen);
    // 코너 브래킷
    const bm = glow(COLORS.cyan, 2.5);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.04), bm);
      a.position.set(sx * (w / 2 + 0.1 - 0.25), sy * (h / 2 + 0.14), 0);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5), bm);
      b.position.set(sx * (w / 2 + 0.14), sy * (h / 2 + 0.1 - 0.25), 0);
      frame.add(a, b);
    });
    const tag = makeLabel(['AIRSIM // E2E STEERING', 'recorded run · deep learning'], { width: 560, height: 120, size: 30, bg: null, border: false });
    tag.scale.set(3.2, 0.69, 1);
    tag.position.set(-w / 2 + 1.5, -h / 2 - 0.5, 0);
    frame.add(tag);
    frame.position.set(-3.5, 3.6, -8.6);
    frame.rotation.y = 0.32;
    this.group.add(frame);
    this.screen = frame;
  }

  attachVideo(video, poster) {
    // 영상이 재생되기 전(또는 코덱 미지원)에는 포스터 이미지를 보여 준다
    new THREE.TextureLoader().load(poster, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (!this.videoLive) {
        this.screenMat.map = tex;
        this.screenMat.color.set(0xffffff);
        this.screenMat.needsUpdate = true;
      }
    });
    const vtex = new THREE.VideoTexture(video);
    vtex.colorSpace = THREE.SRGBColorSpace;
    video.addEventListener('playing', () => {
      this.videoLive = true;
      this.screenMat.map = vtex;
      this.screenMat.color.set(0xffffff);
      this.screenMat.needsUpdate = true;
    });
  }

  updateLidar(origin, yaw) {
    const { minX, maxX, minZ, maxZ } = this.bounds;
    const h0 = 0.83;
    const maxR = 11;
    const obs = this.obstacles;
    let k = 0;
    for (let i = 0; i < this.rays; i++) {
      const a = (i / this.rays) * TAU;
      const dx = Math.sin(a);
      const dz = Math.cos(a);
      // 벽까지 거리
      let tWall = Infinity;
      if (dx > 1e-6) tWall = Math.min(tWall, (maxX - origin.x) / dx);
      else if (dx < -1e-6) tWall = Math.min(tWall, (minX - origin.x) / dx);
      if (dz > 1e-6) tWall = Math.min(tWall, (maxZ - origin.z) / dz);
      else if (dz < -1e-6) tWall = Math.min(tWall, (minZ - origin.z) / dz);
      let tHit = tWall;
      let hH = 0.5;
      for (let j = 0; j < obs.length; j++) {
        const o = obs[j];
        const ox = origin.x - o.x;
        const oz = origin.z - o.z;
        const b = dx * ox + dz * oz;
        const c = ox * ox + oz * oz - o.r * o.r;
        const disc = b * b - c;
        if (disc > 0) {
          const t = -b - Math.sqrt(disc);
          if (t > 0.05 && t < tHit) {
            tHit = t;
            hH = o.h;
          }
        }
      }
      // 회전 중인 헤드 기준 최근 스캔일수록 밝게
      let age = ((this.spin - a) % TAU + TAU) % TAU;
      const fresh = 1 - (age / TAU) * 0.75;
      for (let c = 0; c < this.channels.length; c++) {
        const e = this.channels[c];
        const tanE = Math.tan(e);
        let t = -1;
        let y = 0;
        let r = 0, g = 0, bl = 0;
        if (e < 0) {
          const tg = h0 / -tanE;
          const yo = h0 + tHit * tanE;
          if (tg < tHit && tg < maxR) {
            t = tg;
            y = 0.03;
          } else if (yo >= 0 && yo <= hH && tHit < maxR) {
            t = tHit;
            y = yo;
          }
        } else {
          const yo = h0 + tHit * tanE;
          if (yo <= hH && tHit < maxR) {
            t = tHit;
            y = yo;
          }
        }
        const i3 = k * 3;
        const i4 = k * 4;
        if (t > 0) {
          this.lidarPos[i3] = origin.x + dx * t;
          this.lidarPos[i3 + 1] = y;
          this.lidarPos[i3 + 2] = origin.z + dz * t;
          const near = 1 - Math.min(1, t / maxR);
          // 가까울수록 주황, 멀수록 청록, 높이 있는 물체는 흰빛
          r = 0.36 + near * 0.64;
          g = 0.95 - near * 0.5 + (y > 0.1 ? 0.1 : 0);
          bl = 1.0 - near * 0.85;
          if (y > 0.1) {
            r = Math.min(1, r + 0.25);
            bl = Math.min(1, bl + 0.2);
          }
          this.lidarCol[i4] = r;
          this.lidarCol[i4 + 1] = g;
          this.lidarCol[i4 + 2] = bl;
          this.lidarCol[i4 + 3] = fresh * (y > 0.1 ? 0.95 : 0.6);
        } else {
          this.lidarCol[i4 + 3] = 0;
        }
        k++;
      }
    }
    this.lidarPoints.geometry.attributes.position.needsUpdate = true;
    this.lidarPoints.geometry.attributes.color.needsUpdate = true;
  }

  roverWorldPosition(out) {
    return this.rover.root.getWorldPosition(out);
  }

  update(dt, t, active) {
    this.light.update(dt);
    const ro = this.rover;
    const u = (this.s / this.length) % 1;
    // 신호 인식 → 감속 · 정지
    const ahead = (((this.stopU - u) % 1) + 1) % 1 * this.length;
    let vt = this.cruise;
    if (this.light.state !== 'green' && ahead < 6 && ahead > 0.25) vt = this.cruise * THREE.MathUtils.clamp((ahead - 0.7) / 4.5, 0, 1);
    this.v += (vt - this.v) * Math.min(1, dt * 2.2);
    if (this.v < 0.02 && vt === 0) this.v = 0;
    const braking = vt < this.v - 0.05 || (vt === 0 && this.v < 0.1);
    this.s = (this.s + this.v * dt) % this.length;

    const uu = this.s / this.length;
    const p = this.curve.getPointAt(uu);
    const tan = this.curve.getTangentAt(uu);
    const tan2 = this.curve.getTangentAt((uu + 0.02) % 1);
    ro.root.position.set(p.x, 0, p.z);
    const yaw = Math.atan2(tan.x, tan.z);
    ro.root.rotation.y = yaw;
    const steer = Math.atan2(tan.x * tan2.z - tan.z * tan2.x, tan.x * tan2.x + tan.z * tan2.z);
    ro.steer.forEach((s) => (s.rotation.y = THREE.MathUtils.clamp(steer * 3, -0.5, 0.5)));
    ro.wheels.forEach((w) => (w.rotation.x += (this.v * dt) / 0.2));
    ro.body.position.y = Math.sin(t * 9) * 0.004 * this.v;
    ro.lidarHead.rotation.y += dt * 12;
    this.spin = (this.spin + dt * 10) % TAU;

    ro.flash = Math.max(0, ro.flash - dt);
    const blink = ro.flash > 0 && Math.sin(ro.flash * 20) > 0;
    ro.tails.forEach((tl) => (tl.material = braking || blink ? ro.tailOn : ro.tailOff));

    if (active) {
      this.updateLidar({ x: p.x, z: p.z }, yaw);
      this.lidarPoints.visible = true;
    } else {
      this.lidarPoints.visible = false;
    }
  }
}
