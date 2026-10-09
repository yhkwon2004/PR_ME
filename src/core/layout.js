import * as THREE from 'three';

// 한 장소에서 이어 찍는 '원테이크' 세계. 각 세트의 위치.
export const SETS = {
  hangar: new THREE.Vector3(0, 0, 34),
  aerial: new THREE.Vector3(-34, 0, 10),
  ground: new THREE.Vector3(-24, 0, -26),
  robotics: new THREE.Vector3(26, 0, -24),
  core: new THREE.Vector3(0, 7.5, -4),
  record: new THREE.Vector3(34, 0, 12),
};
