/**
 * <SkyDome> — Y2K gradient sky at infinity (camera-centred, never clipped, no parallax), with a glowing sun or moon,
 * twinkling 4-point stars at night and an optional ring of drifting low-poly clouds.
 *
 *   <SkyDome preset="day" | "sunrise" | "dusk" | "night"
 *            time={songSeconds}            // scrolls clouds + twinkles stars (pure, pass any increasing number)
 *            clouds={14}                   // number of ring clouds (0 = none). Default depends on preset.
 *            sunDir={[x,y,z]}              // override the visible sun/moon direction (world space)
 *            sunScale={1} glow={1} stars={n} starBrightness={1} horizonLift={0}/>
 *
 * Presets live in SKY_PRESETS (colours, sun/moon, matching light + fog colours). ExteriorLights (../Exterior) reads the same
 * table so the lighting always matches the sky. The sky ignores its own position/rotation (it's world-aligned at infinity),
 * renders first (renderOrder -1000) and never writes depth, so put it anywhere in the tree.
 *
 * Usage:
 *   <Stage background="#000"><SkyDome preset="sunrise" time={t} /> ... </Stage>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {hash1} from './common';
import {CloudRing} from './Clouds';

export type SkyPreset = 'day' | 'sunrise' | 'dusk' | 'night';
type V3 = [number, number, number];

export type SkyPresetDef = {
  /** gradient stops [dir.y in -1..1, hex, intensity] */
  stops: [number, string, number?][];
  sunDir: V3;
  sunColor: string;
  sunIntensity: number;
  /** angular radius of the disc in radians */
  sunSize: number;
  glowColor: string;
  glowSize: number;
  glowStrength: number;
  moon: boolean;
  stars: number;
  clouds: number;
  cloudTop: string;
  cloudBottom: string;
  cloudEmissive: number;
  /** matching light rig (used by <ExteriorLights>) */
  light: {keyColor: string; keyIntensity: number; keyDir: V3; skyColor: string; groundColor: string; hemiIntensity: number; fillColor: string; fillIntensity: number};
  /** suggested Stage fog colour (match the horizon) */
  fog: string;
  /** suggested Stage env preset */
  env: 'sky' | 'sunset' | 'night' | 'chrome';
};

const n3 = (v: V3): V3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

export const SKY_PRESETS: Record<SkyPreset, SkyPresetDef> = {
  day: {
    stops: [[-1, '#2f8a34'], [-0.04, '#7fcf6a'], [0, '#c4ecff', 1.0], [0.05, '#6cc2ff'], [0.18, '#2a86ff'], [0.45, '#1450f0'], [1, '#0a2aa8']],
    sunDir: n3([0.62, 0.42, -0.66]),
    sunColor: '#fffbe8', sunIntensity: 9, sunSize: 0.045,
    glowColor: '#fff2c4', glowSize: 0.16, glowStrength: 0.32,
    moon: false, stars: 0, clouds: 16,
    cloudTop: '#ffffff', cloudBottom: '#a9c4f4', cloudEmissive: 0.18,
    light: {keyColor: '#fff4dc', keyIntensity: 2.1, keyDir: n3([0.55, 0.85, 0.6]), skyColor: '#bfe0ff', groundColor: '#3f8a2a', hemiIntensity: 0.75, fillColor: '#9cc8ff', fillIntensity: 0.35},
    fog: '#bfe4ff',
    env: 'sky',
  },
  sunrise: {
    stops: [[-1, '#3a2a3a'], [-0.04, '#c9785a'], [0, '#ffd27a', 1.5], [0.05, '#ffa36b', 1.2], [0.14, '#ff6fa8'], [0.32, '#9a6bff'], [0.6, '#3d4fd8'], [1, '#14257a']],
    sunDir: n3([-0.55, 0.075, -0.83]),
    sunColor: '#fff0b8', sunIntensity: 10, sunSize: 0.06,
    glowColor: '#ffb35c', glowSize: 0.35, glowStrength: 1.0,
    moon: false, stars: 60, clouds: 14,
    cloudTop: '#fff0f4', cloudBottom: '#ff8fb0', cloudEmissive: 0.3,
    light: {keyColor: '#ffc27a', keyIntensity: 2.5, keyDir: n3([-0.55, 0.35, 0.55]), skyColor: '#ffc8dc', groundColor: '#3a7a3a', hemiIntensity: 0.85, fillColor: '#8a7cff', fillIntensity: 0.5},
    fog: '#ffb48a',
    env: 'sunset',
  },
  dusk: {
    stops: [[-1, '#1a0f2a'], [-0.04, '#6a3048'], [0, '#ff9a4a', 1.4], [0.06, '#ff5f6e'], [0.16, '#d0408f'], [0.36, '#5a2c9c'], [0.7, '#1d1a6a'], [1, '#0a0c3a']],
    sunDir: n3([0.5, 0.025, -0.86]),
    sunColor: '#ffd08a', sunIntensity: 8, sunSize: 0.065,
    glowColor: '#ff7a3a', glowSize: 0.4, glowStrength: 1.1,
    moon: false, stars: 160, clouds: 12,
    cloudTop: '#ffc0d8', cloudBottom: '#7a3a8a', cloudEmissive: 0.4,
    light: {keyColor: '#ff9a5a', keyIntensity: 2.2, keyDir: n3([0.6, 0.25, -0.4]), skyColor: '#b06ac8', groundColor: '#2a1a3a', hemiIntensity: 0.9, fillColor: '#6a5aff', fillIntensity: 0.6},
    fog: '#a0508a',
    env: 'sunset',
  },
  night: {
    stops: [[-1, '#020208'], [-0.04, '#0a1030'], [0, '#22357e', 1.0], [0.08, '#141f5c'], [0.3, '#0a1240'], [1, '#03061e']],
    sunDir: n3([0.45, 0.5, -0.74]),
    sunColor: '#eef4ff', sunIntensity: 3.2, sunSize: 0.04,
    glowColor: '#7fa8ff', glowSize: 0.18, glowStrength: 0.45,
    moon: true, stars: 900, clouds: 8,
    cloudTop: '#8a9ad8', cloudBottom: '#26306a', cloudEmissive: 0.3,
    light: {keyColor: '#8fb0ff', keyIntensity: 1.1, keyDir: n3([0.45, 0.8, 0.35]), skyColor: '#3a4aa0', groundColor: '#0a0a1a', hemiIntensity: 0.55, fillColor: '#5a3aff', fillIntensity: 0.25},
    fog: '#0e1840',
    env: 'night',
  },
};

const MAXS = 8;
const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    gl_Position = vec4(p.xy, p.w * 0.99999, p.w);
  }`;
const skyFrag = /* glsl */ `
  uniform float uY[${MAXS}]; uniform vec3 uC[${MAXS}]; uniform int uN;
  uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunSize;
  uniform vec3 uGlowColor; uniform float uGlowSize; uniform float uGlowStrength; uniform float uMoon; uniform float uLift;
  uniform vec3 uSunU; uniform vec3 uSunV;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float y = d.y - uLift;
    vec3 col = uC[0];
    for (int i = 0; i < ${MAXS - 1}; i++) {
      if (i >= uN - 1) break;
      float t = clamp((y - uY[i]) / max(1e-4, uY[i + 1] - uY[i]), 0.0, 1.0);
      if (y >= uY[i]) col = mix(uC[i], uC[i + 1], t * t * (3.0 - 2.0 * t));
    }
    vec3 s = normalize(uSunDir);
    float c = clamp(dot(d, s), -1.0, 1.0);
    float ang = acos(c);
    // halo: broad soft + tighter core glow (stays under bloom threshold except near the disc)
    float halo = exp(-ang / max(1e-3, uGlowSize)) * uGlowStrength + exp(-pow(ang / max(1e-3, uGlowSize * 0.28), 2.0)) * uGlowStrength * 0.9;
    col += uGlowColor * halo * smoothstep(-0.25, 0.02, d.y);
    // disc (slightly polygonal: 14-gon for a low-poly feel)
    vec2 q = vec2(dot(d - s * c, uSunU), dot(d - s * c, uSunV));
    float a = atan(q.y, q.x);
    float k = 3.14159265 / 14.0;
    float poly = cos(k) / cos(mod(a, 2.0 * k) - k);
    float r = ang / uSunSize;
    float disc = 1.0 - smoothstep(poly - 0.04, poly, r);
    vec3 sc = uSunColor;
    if (uMoon > 0.5) {
      // moon craters + terminator shading
      vec2 m = q / uSunSize;
      float cr = 1.0;
      cr -= 0.22 * (1.0 - smoothstep(0.18, 0.22, length(m - vec2(-0.30, 0.25))));
      cr -= 0.16 * (1.0 - smoothstep(0.12, 0.15, length(m - vec2(0.28, -0.18))));
      cr -= 0.18 * (1.0 - smoothstep(0.08, 0.11, length(m - vec2(0.05, 0.42))));
      cr -= 0.12 * (1.0 - smoothstep(0.14, 0.17, length(m - vec2(-0.12, -0.42))));
      cr *= 0.82 + 0.18 * smoothstep(-0.9, 0.6, m.x + m.y * 0.3);
      sc *= cr;
    }
    col = mix(col, sc, disc * smoothstep(-0.02, 0.0, d.y + uSunSize));
    gl_FragColor = vec4(col, 1.0);
  }`;

const starVert = /* glsl */ `
  attribute float aSize; attribute float aPhase;
  uniform float uTime; uniform float uDpr; uniform float uBright;
  varying float vA; varying float vBig;
  void main() {
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    gl_Position = vec4(p.xy, p.w * 0.99998, p.w);
    float tw = 0.65 + 0.35 * sin(uTime * (1.3 + aPhase * 2.1) + aPhase * 40.0);
    vA = tw * uBright * smoothstep(-0.02, 0.12, position.y);
    vBig = step(3.2, aSize);
    gl_PointSize = aSize * uDpr * (vBig > 0.5 ? 3.2 : 1.0);
  }`;
const starFrag = /* glsl */ `
  uniform vec3 uColor; varying float vA; varying float vBig;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float core = 1.0 - smoothstep(0.0, vBig > 0.5 ? 0.12 : 0.5, r);
    float rays = 0.0;
    if (vBig > 0.5) {
      rays = (1.0 - smoothstep(0.0, 0.03, abs(c.x))) * (1.0 - smoothstep(0.0, 0.5, abs(c.y)));
      rays += (1.0 - smoothstep(0.0, 0.03, abs(c.y))) * (1.0 - smoothstep(0.0, 0.5, abs(c.x)));
    }
    float a = clamp(core + rays * 0.9, 0.0, 1.0) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor * (1.0 + vBig * 1.5), a);
  }`;

export type SkyDomeProps = {
  preset?: SkyPreset;
  /** any increasing number (song seconds recommended): drifts clouds, twinkles stars */
  time?: number;
  /** number of ring clouds; default from preset; 0 disables */
  clouds?: number;
  /** cloud drift speed in radians per time unit (default 0.004) */
  cloudSpeed?: number;
  /** override the sun/moon direction */
  sunDir?: V3;
  sunScale?: number;
  glow?: number;
  stars?: number;
  starBrightness?: number;
  /** shift the gradient up/down (in dir.y units) e.g. -0.05 to lower the horizon glow */
  horizonLift?: number;
  /** cloud ring radius & height range */
  cloudRadius?: [number, number];
  cloudHeight?: [number, number];
  seed?: number;
};

export const SkyDome: React.FC<SkyDomeProps> = ({
  preset = 'day', time = 0, clouds, cloudSpeed = 0.004, sunDir, sunScale = 1, glow = 1, stars, starBrightness = 1,
  horizonLift = 0, cloudRadius, cloudHeight, seed = 1,
}) => {
  const P = SKY_PRESETS[preset];
  const {gl} = useThree();
  const geo = useMemo(() => new THREE.SphereGeometry(1, 64, 32), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uY: {value: new Array(MAXS).fill(0)},
          uC: {value: Array.from({length: MAXS}, () => new THREE.Color())},
          uN: {value: 2},
          uSunDir: {value: new THREE.Vector3(0, 1, 0)},
          uSunU: {value: new THREE.Vector3(1, 0, 0)},
          uSunV: {value: new THREE.Vector3(0, 0, 1)},
          uSunColor: {value: new THREE.Color()},
          uSunSize: {value: 0.05},
          uGlowColor: {value: new THREE.Color()},
          uGlowSize: {value: 0.2},
          uGlowStrength: {value: 0.5},
          uMoon: {value: 0},
          uLift: {value: 0},
        },
      }),
    [],
  );
  useLayoutEffect(() => {
    const u = mat.uniforms;
    const st = P.stops.slice(0, MAXS);
    u.uN.value = st.length;
    for (let i = 0; i < MAXS; i++) {
      const s = st[Math.min(i, st.length - 1)];
      u.uY.value[i] = s[0];
      (u.uC.value[i] as THREE.Color).set(s[1]).multiplyScalar(s[2] ?? 1);
    }
    const sd = new THREE.Vector3(...(sunDir ?? P.sunDir)).normalize();
    u.uSunDir.value.copy(sd);
    const up = Math.abs(sd.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const su = new THREE.Vector3().crossVectors(up, sd).normalize();
    u.uSunU.value.copy(su);
    u.uSunV.value.crossVectors(sd, su).normalize();
    (u.uSunColor.value as THREE.Color).set(P.sunColor).multiplyScalar(P.sunIntensity);
    u.uSunSize.value = P.sunSize * sunScale;
    (u.uGlowColor.value as THREE.Color).set(P.glowColor);
    u.uGlowSize.value = P.glowSize * Math.max(0.2, sunScale);
    u.uGlowStrength.value = P.glowStrength * glow;
    u.uMoon.value = P.moon ? 1 : 0;
    u.uLift.value = horizonLift;
  });

  const nStars = stars ?? P.stars;
  const starGeo = useMemo(() => {
    const N = 1400;
    const pos = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      // uniform on the upper hemisphere, biased a little toward the horizon band
      const u = hash1(i, 11 + seed), v = hash1(i, 23 + seed);
      const y = Math.pow(u, 0.8);
      const th = v * Math.PI * 2;
      const r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(th) * r;
      const s = hash1(i, 37 + seed);
      size[i] = s > 0.985 ? 3.5 + s * 1.5 : 1.2 + s * 1.8;
      ph[i] = hash1(i, 41 + seed);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    return g;
  }, [seed]);
  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: starVert,
        fragmentShader: starFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {uTime: {value: 0}, uDpr: {value: 1}, uBright: {value: 1}, uColor: {value: new THREE.Color('#dfe9ff')}},
      }),
    [],
  );
  useLayoutEffect(() => {
    starMat.uniforms.uTime.value = time;
    starMat.uniforms.uDpr.value = gl.getPixelRatio();
    starMat.uniforms.uBright.value = starBrightness * (preset === 'night' ? 1 : 0.6);
    starGeo.setDrawRange(0, Math.min(1400, nStars));
  });

  const nClouds = clouds ?? P.clouds;
  return (
    <group>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-1000} />
      {nStars > 0 ? <points geometry={starGeo} material={starMat} frustumCulled={false} renderOrder={-999} /> : null}
      {nClouds > 0 ? (
        <CloudRing
          count={nClouds}
          time={time}
          speed={cloudSpeed}
          radius={cloudRadius ?? [150, 230]}
          height={cloudHeight ?? [22, 55]}
          top={P.cloudTop}
          bottom={P.cloudBottom}
          emissive={P.cloudEmissive}
          seed={seed}
        />
      ) : null}
    </group>
  );
};
