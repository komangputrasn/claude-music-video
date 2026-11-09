// Procedural environment scenes (no HDR downloads). Baked through PMREM in <Stage env="...">.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

export type EnvPreset = 'chrome' | 'studio' | 'sky' | 'sunset' | 'night';

type Stop = [number, string, number?]; // [dir.y in -1..1, color, intensity]

const gradientSphere = (stops: Stop[]) => {
  const n = stops.length;
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uY: {value: stops.map((s) => s[0])},
      uC: {value: stops.map((s) => new THREE.Color(s[1]).multiplyScalar(s[2] ?? 1))},
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uY[${n}]; uniform vec3 uC[${n}]; varying vec3 vDir;
      void main(){
        float y = vDir.y; vec3 col = uC[0];
        for (int i = 0; i < ${n - 1}; i++) {
          float t = clamp((y - uY[i]) / max(1e-4, uY[i+1] - uY[i]), 0.0, 1.0);
          if (y >= uY[i]) col = mix(uC[i], uC[i+1], t);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), mat);
};

const panel = (w: number, h: number, color: string, intensity: number, pos: [number, number, number]) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide}),
  );
  m.position.set(...pos);
  m.lookAt(0, 0, 0);
  return m;
};

export const makeEnvScene = (preset: EnvPreset): THREE.Scene => {
  if (preset === 'studio') return new RoomEnvironment() as unknown as THREE.Scene;
  const s = new THREE.Scene();
  if (preset === 'chrome') {
    // Classic Y2K chrome: deep blue sky, hot white horizon line, dark floor, softbox strips.
    s.add(gradientSphere([[-1, '#02040c'], [-0.12, '#0b1440'], [-0.02, '#9fd8ff', 1.6], [0.0, '#ffffff', 3], [0.05, '#bfe6ff', 1.4], [0.35, '#2a5bd8'], [1, '#06124a']]));
    s.add(panel(30, 6, '#ffffff', 5, [0, 30, 10]));
    s.add(panel(6, 26, '#ffffff', 3, [-32, 6, 0]));
    s.add(panel(6, 26, '#c8f0ff', 3, [32, 6, -4]));
    s.add(panel(18, 3, '#ff7ad9', 2.5, [0, 8, -34]));
  } else if (preset === 'sky') {
    // Bright daytime: saturated blue sky, white clouds band, green ground.
    s.add(gradientSphere([[-1, '#1d4d12'], [-0.05, '#4f9a2a'], [0.0, '#e9f6ff', 1.4], [0.15, '#8cc8ff', 1.2], [1, '#1f6fe0', 1.1]]));
    s.add(panel(16, 16, '#fff6dc', 8, [20, 30, 15]));
  } else if (preset === 'sunset') {
    s.add(gradientSphere([[-1, '#120614'], [-0.05, '#3a1430'], [0.0, '#ffb070', 2.2], [0.12, '#ff5f8a', 1.3], [0.45, '#6a3aa8'], [1, '#160c3a']]));
    s.add(panel(10, 10, '#ffd38a', 7, [0, 4, -40]));
  } else if (preset === 'night') {
    s.add(gradientSphere([[-1, '#010104'], [-0.05, '#04061a'], [0.0, '#1a2a6a', 1.2], [0.4, '#080c2a'], [1, '#020210']]));
    s.add(panel(24, 2, '#ff2fb4', 4, [0, 10, -30]));
    s.add(panel(2, 20, '#21e6ff', 4, [30, 4, 0]));
    s.add(panel(2, 20, '#21e6ff', 3, [-30, 4, 6]));
  }
  return s;
};
