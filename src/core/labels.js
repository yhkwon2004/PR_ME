import * as THREE from 'three';

// 캔버스로 그린 HUD 라벨 — 3D 공간 안의 인식 박스, 세트 이름표에 쓴다.
export function makeLabel(lines, { color = '#5ef2ff', bg = 'rgba(5,9,14,0.72)', width = 512, height = 128, size = 34, border = true } = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = (ls, col = color) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, width, height);
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, width, height);
    }
    if (border) {
      g.strokeStyle = col;
      g.lineWidth = 3;
      const k = 18;
      // 모서리 등록 마크
      [[0, 0, 1, 1], [width, 0, -1, 1], [0, height, 1, -1], [width, height, -1, -1]].forEach(([x, y, sx, sy]) => {
        g.beginPath();
        g.moveTo(x + sx * 2, y + sy * k);
        g.lineTo(x + sx * 2, y + sy * 2);
        g.lineTo(x + sx * k, y + sy * 2);
        g.stroke();
      });
    }
    const list = Array.isArray(ls) ? ls : [ls];
    g.textBaseline = 'middle';
    list.forEach((line, i) => {
      g.fillStyle = i === 0 ? col : 'rgba(232,237,244,0.82)';
      g.font = `${i === 0 ? 600 : 400} ${i === 0 ? size : size * 0.7}px "JetBrains Mono", ui-monospace, monospace`;
      const lh = height / (list.length + 0.6);
      g.fillText(line, 24, lh * (i + 0.8));
    });
    tex.needsUpdate = true;
  };
  draw(lines);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(mat);
  const aspect = width / height;
  sprite.scale.set(aspect * 0.32, 0.32, 1);
  sprite.userData.redraw = draw;
  return sprite;
}

// 바닥에 눕힌 큰 활자 — 세트 이름, 연도 표기.
export function makeFloorText(text, { size = 120, color = 'rgba(94,242,255,0.55)', width = 1024, height = 256, font = '"Space Grotesk Variable", "Space Grotesk", sans-serif', weight = 600 } = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.font = `${weight} ${size}px ${font}`;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width / height, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
