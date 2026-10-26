import * as THREE from 'three';

export const COLORS = {
  bg: 0x05070c,
  horizon: 0x0a111c,
  cyan: 0x5ef2ff,
  orange: 0xff6b1a,
  red: 0xff3b3b,
  green: 0x3dff9a,
  amber: 0xffb547,
  white: 0xe8edf4,
};

// HDR 색: 1을 넘는 값이 블룸 임계값을 넘어 빛번짐을 만든다.
export function glow(hex, intensity = 4) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity), toneMapped: true });
}

export const mats = {
  body: new THREE.MeshStandardMaterial({ color: 0x1b2029, metalness: 0.65, roughness: 0.34 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x0b0e13, metalness: 0.5, roughness: 0.55 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8a94a3, metalness: 0.9, roughness: 0.28 }),
  shell: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.12, roughness: 0.42 }),
  orange: new THREE.MeshStandardMaterial({ color: COLORS.orange, metalness: 0.2, roughness: 0.45 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.0, roughness: 0.92 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x05080d, metalness: 0.95, roughness: 0.08 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x0d1118, metalness: 0.4, roughness: 0.7 }),
  glowCyan: glow(COLORS.cyan, 5),
  glowCyanSoft: glow(COLORS.cyan, 1.6),
  glowOrange: glow(COLORS.orange, 4),
  glowRed: glow(COLORS.red, 5),
  glowWhite: glow(0xffffff, 4),
};

// 바닥 접지 그림자 — 그림자 맵 대신 방사형 그라데이션 판을 쓴다.
let shadowTex;
export function contactShadow(size = 2, opacity = 0.55) {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 1;
  return m;
}
