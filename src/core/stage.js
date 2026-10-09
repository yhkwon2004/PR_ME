import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COLORS } from './materials.js';

// 필름 패스: 색수차 · 전환 줌블러 · 비네팅 · 그레인 · 노출(페이드)
const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uTransition: { value: 0 },
    uGrain: { value: 0.045 },
    uAberration: { value: 1.0 },
    uExposure: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uTransition, uGrain, uAberration, uExposure;
    uniform vec2 uRes;
    varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float d = length(c);
      vec2 dir = c * (0.0035 + 0.02 * uTransition) * uAberration;
      vec3 col;
      col.r = texture2D(tDiffuse, uv - dir).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + dir).b;
      if (uTransition > 0.01) {
        vec3 acc = vec3(0.0);
        for (int i = 1; i <= 6; i++) {
          float s = 1.0 - float(i) * 0.011 * uTransition;
          acc += texture2D(tDiffuse, c * s + 0.5).rgb;
        }
        col = mix(col, acc / 6.0, clamp(uTransition * 0.85, 0.0, 1.0));
      }
      float vig = smoothstep(0.92, 0.28, d);
      col *= mix(0.55, 1.0, vig);
      float g = rand(uv * uRes * 0.5 + fract(uTime * 13.7)) - 0.5;
      col += g * uGrain;
      col *= uExposure;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createStage(canvas, { reducedMotion = false } = {}) {
  const isMobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  } catch (e) {
    return null;
  }
  const maxDpr = isMobile ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.horizon);
  scene.fog = new THREE.FogExp2(COLORS.horizon, 0.019);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 1.4, 44);

  // 조명
  scene.add(new THREE.HemisphereLight(0x9cc4ff, 0x0b0d12, 0.55));
  const key = new THREE.DirectionalLight(0xdfe9ff, 1.5);
  key.position.set(-20, 40, 30);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5ef2ff, 0.6);
  rim.position.set(30, 10, -40);
  scene.add(rim);

  scene.add(createSky());
  scene.add(createGround());
  const dust = createDust(isMobile ? 900 : 1800);
  scene.add(dust.points);

  // 후처리
  const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: isMobile ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.85, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  film.uniforms.uGrain.value = reducedMotion ? 0.02 : 0.045;
  composer.addPass(film);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    film.uniforms.uRes.value.set(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  // 프레임 저하 시 화질 단계적 하향
  let slowFrames = 0;
  let tier = 0;
  function adapt(dt) {
    if (dt > 1 / 38) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 0.5);
    if (slowFrames > 90 && tier < 2) {
      tier++;
      slowFrames = 0;
      if (tier === 1) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        composer.setPixelRatio(renderer.getPixelRatio());
        resize();
      } else {
        bloom.enabled = false;
      }
    }
  }

  return { renderer, scene, camera, composer, film, bloom, dust, resize, adapt, isMobile };
}

function createSky() {
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x010204) },
      uHorizon: { value: new THREE.Color(COLORS.horizon) },
      uGlow: { value: new THREE.Color(0x16304a) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uGlow;
      varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      void main(){
        float h = vDir.y;
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.55, h));
        col += uGlow * exp(-abs(h) * 9.0) * 0.6;
        // 희미한 별
        vec3 p = floor(vDir * 420.0);
        float s = step(0.9975, hash(p)) * smoothstep(0.12, 0.5, h);
        col += vec3(s) * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -10;
  return sky;
}

function createGround() {
  const geo = new THREE.PlaneGeometry(500, 500, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uBase: { value: new THREE.Color(0x070b11) },
      uFog: { value: new THREE.Color(COLORS.horizon) },
      uLine: { value: new THREE.Color(0x3a7f9a) },
      uMajor: { value: new THREE.Color(COLORS.cyan) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uFog, uLine, uMajor;
      varying vec3 vWorld;
      float grid(vec2 p, float size){
        vec2 q = p / size;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main(){
        vec2 p = vWorld.xz;
        float minor = grid(p, 1.0);
        float major = grid(p, 8.0);
        float dist = length(vWorld - cameraPosition);
        float fade = exp(-dist * 0.024);
        float near = exp(-dist * 0.06);
        vec3 col = uBase;
        col += uLine * minor * 0.10 * (0.3 + near);
        col += uMajor * major * 0.16;
        col = mix(uFog, col, fade);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.renderOrder = -5;
  return ground;
}

function createDust(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 140;
    pos[i * 3 + 1] = Math.random() * 26;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 140;
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPx;
      varying float vA;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.2 + aSeed * 40.0) * 0.6;
        p.x += sin(uTime * 0.13 + aSeed * 20.0) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + aSeed * 2.2) * uPx * (22.0 / -mv.z);
        vA = (0.25 + 0.75 * aSeed) * smoothstep(90.0, 8.0, -mv.z) * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed) + aSeed * 60.0));
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(vec3(0.62, 0.9, 1.0) * a * 0.9, a);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, update: (t) => (mat.uniforms.uTime.value = t) };
}

// 무대 조명 같은 가짜 볼류메트릭 광원 원뿔
export function lightCone({ top = 0.15, bottom = 3, height = 12, color = 0xbfe9ff, opacity = 0.16 } = {}) {
  const geo = new THREE.CylinderGeometry(top, bottom, height, 48, 1, true);
  geo.translate(0, -height / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uH: { value: height } },
    vertexShader: /* glsl */ `
      varying float vY; varying vec3 vN; varying vec3 vView;
      void main(){
        vY = position.y;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity, uH;
      varying float vY; varying vec3 vN; varying vec3 vView;
      void main(){
        float along = clamp(-vY / uH, 0.0, 1.0);
        float edge = pow(abs(dot(vN, vView)), 1.6);
        float a = uOpacity * edge * (1.0 - along * 0.85) * smoothstep(0.0, 0.08, along);
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
  const cone = new THREE.Mesh(geo, mat);
  cone.renderOrder = 5;
  return cone;
}
