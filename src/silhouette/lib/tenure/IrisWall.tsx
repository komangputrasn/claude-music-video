/**
 * <IrisWall> — thousands of TENURE irises on a city wall, ONE instanced draw call, drawn with the exact <Iris>
 * shader (IRIS_GLSL) — for the Intro pull-back: "one of thousands of irises on a city wall at night in fog".
 * Every per-iris variation (open, pupil, blade phase, brightness, blink) is computed in the shader from uniforms and
 * a per-instance seed — no per-frame uploads.
 *
 *   <IrisWall cols?={60} rows?={34} spacing?={1.6} radius?={0.55} time?={t} open?={1} pupil?={0.3} intensity?={1.4}
 *             wave?={{center: [x, y], start, speed, width, mode: 'open' | 'pulse'}} blink?={0.06} dead?={0.02}
 *             seed?={0} hex?={false} skip?={[[col, row], …]} wall?={S.void} housing?={true} flicker?={0}
 *             fog?={1} renderOrder? {...group}/>
 *
 *   cols, rows, spacing  grid (metres between centres). Origin: BASE CENTRE of the wall, irises face +Z.
 *                        Iris (c, r) centre = irisWallCell(c, r, {cols, rows, spacing, hex}) — use it to put a hero <Iris>
 *                        exactly in a cell (and `skip` that cell), e.g. the Intro's first iris.
 *   radius               iris radius in metres (≤ spacing/2).
 *   open                 0..1 global aperture (multiplies everything).
 *   wave                 ripple from `center` (local metres, default the wall centre) starting at `start` (s, same clock
 *                        as `time`), front moving at `speed` m/s with soft `width` m.
 *                          mode 'open'  : irises are CLOSED until the front reaches them, then open (the pull-back reveal)
 *                          mode 'pulse' : open irises flare + dilate as a ring passes (a bass hit rippling over the city)
 *   blink                0..1 fraction of irises that blink now and then (sparse, deterministic).
 *   dead                 0..1 fraction of dark/dead irises (texture of a real city wall).
 *   flicker              0..1 failing flicker for the whole wall (Final), per-iris desynchronised.
 *   wall                 colour of the backing wall plane (false = none). It fogs with distance like any surface.
 *   fog                  0..1 how strongly stage fog veils the irises (1 = like any surface).
 *
 * Small on screen, irises collapse to a clean averaged ring (LOD in the shader) instead of aliasing.
 * Also exported: irisWallCell(col, row, opts) → [x, y, 0], irisWallSize(opts) → [w, h].
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {IRIS_GLSL} from '../Iris';
import {stream, fogUniforms, TENURE_FOG_GLSL} from './shared';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

export type IrisWallLayout = {cols?: number; rows?: number; spacing?: number; hex?: boolean};

export const irisWallCell = (col: number, row: number, o: IrisWallLayout = {}): [number, number, number] => {
  const cols = o.cols ?? 60;
  const sp = o.spacing ?? 1.6;
  const off = o.hex && row % 2 === 1 ? sp / 2 : 0;
  return [(col - (cols - 1) / 2) * sp + off - (o.hex ? sp / 4 : 0), (row + 0.5) * sp * (o.hex ? 0.866 : 1), 0];
};

export const irisWallSize = (o: IrisWallLayout = {}): [number, number] => {
  const sp = o.spacing ?? 1.6;
  return [(o.cols ?? 60) * sp + (o.hex ? sp / 2 : 0), (o.rows ?? 34) * sp * (o.hex ? 0.866 : 1)];
};

const VERT = /* glsl */ `
attribute vec4 aInst;   // xy centre (local), z rnd, w rnd2
uniform float uRadius, uTime, uOpen, uPupil, uBlink, uDead, uMaxBright;
uniform vec4 uWave;     // xy centre, z start, w speed
uniform vec2 uWave2;    // x width, y mode (0 off, 1 open, 2 pulse)
varying vec2 vUv;
varying float vOpen;
varying float vPupil;
varying float vT;
varying float vBright;
varying float vRnd;
#include <common>
#include <fog_pars_vertex>
float wh(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  vUv = uv;
  float rnd = aInst.z, rnd2 = aInst.w;
  vRnd = rnd;
  float o = uOpen;
  float bright = 0.82 + 0.36 * rnd2;
  float pupil = uPupil + (rnd - 0.5) * 0.08;
  if (uWave2.y > 0.5) {
    float d = length(aInst.xy - uWave.xy);
    float front = (uTime - uWave.z) * uWave.w;
    float x = (front - d) / max(uWave2.x, 1e-3);
    if (uWave2.y < 1.5) {
      o *= smoothstep(0.0, 1.0, clamp(x + rnd * 0.35, 0.0, 1.0));
    } else {
      float ring = exp(-x * x * 2.5) * step(-3.0, x);
      // the flare is capped at 2x authRed overall (uMaxBright = 2 / intensity): brighter red turns orange under ACES
      bright = min(bright * (1.0 + 0.9 * ring), max(bright, uMaxBright));
      pupil += 0.12 * ring;
    }
  }
  // sparse blinking: each blinker has its own period; a blink closes and reopens in ~0.35 s
  if (rnd2 < uBlink) {
    float period = 2.5 + 6.0 * rnd;
    float bt = mod(uTime + rnd * 37.0, period);
    o *= mix(0.03, 1.0, smoothstep(0.0, 0.17, abs(bt - 0.18)));
  }
  if (fract(rnd * 5.17 + rnd2 * 3.3) < uDead) { bright *= 0.12; o *= 0.35; }
  vOpen = o;
  vPupil = pupil;
  vT = uTime + rnd * 60.0;
  vBright = bright;
  vec4 mvPosition = modelViewMatrix * vec4(vec3(aInst.xy, 0.0) + position * uRadius, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHousing;
uniform vec3 uGlint;
uniform float uHousingOn, uFlicker, uFog, uTime;
varying vec2 vUv;
varying float vOpen;
varying float vPupil;
varying float vT;
varying float vBright;
varying float vRnd;
#include <common>
#include <fog_pars_fragment>
${IRIS_GLSL}
${TENURE_FOG_GLSL}
float fh(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  vec4 k = irisLayers(p, vOpen, vPupil, vT);
  // LOD: when an iris covers only a few pixels, fade its fine blade detail to an averaged glow (no shimmer)
  // (no hard edges: every feature of the averaged version is wider than a pixel, so the grid can't beat against the
  // pixel grid and draw moiré)
  float px = fwidth(p.x);
  float lod = smoothstep(0.025, 0.11, px);
  float sc = mix(0.06, 1.0, smoothstep(0.0, 1.0, clamp(vOpen, 0.0, 1.0)));
  float rr = r / sc;
  float soft = 0.18 + px * 1.5;
  float avg = smoothstep(vPupil - soft, vPupil + soft, rr) * (1.0 - smoothstep(0.86 - soft, 0.86 + soft * 0.5, rr)) * 0.85
            * smoothstep(0.0, 0.08, vOpen) + exp(-r * r / (0.02 + px * px * 4.0)) * (1.0 - vOpen) * 0.5;
  float ring = mix(k.x, avg, lod);
  float fl = 1.0;
  if (uFlicker > 0.0) {
    float s = floor(uTime * 22.0 + vRnd * 7.0);
    float on = step(uFlicker * 0.85, fh(s + vRnd * 113.0)) * (0.6 + 0.4 * fh(s + 7.0));
    fl = mix(1.0, on, clamp(uFlicker, 0.0, 1.0));
  }
  vec3 col = uHousing * k.y * uHousingOn;
  col += uColor * ring * fl * vBright;
  col += uGlint * k.z * fl * (1.0 - lod);
  #ifdef USE_FOG
  col = mix(col, fogColor, tFogF() * uFog * max(k.y * uHousingOn, clamp(ring, 0.0, 1.0)));
  #endif
  float a = max(k.y * uHousingOn, clamp(ring * fl, 0.0, 1.0));
  if (a < 0.002) discard;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type IrisWave = {center?: [number, number]; start?: number; speed?: number; width?: number; mode?: 'open' | 'pulse'};

export type IrisWallProps = GroupProps & {
  cols?: number;
  rows?: number;
  spacing?: number;
  radius?: number;
  time?: number;
  open?: number;
  pupil?: number;
  intensity?: number;
  color?: string;
  wave?: IrisWave | null;
  blink?: number;
  dead?: number;
  seed?: number | string;
  hex?: boolean;
  skip?: [number, number][];
  wall?: string | false;
  housing?: boolean;
  flicker?: number;
  fog?: number;
  renderOrder?: number;
};

const DISC = new THREE.PlaneGeometry(2, 2);

export const IrisWall: React.FC<IrisWallProps> = ({
  cols = 60, rows = 34, spacing = 1.6, radius = 0.55, time = 0, open = 1, pupil = 0.3, intensity = 1.4, color = S.authRed, wave = null,
  blink = 0.06, dead = 0.02, seed = 0, hex = false, skip, wall = S.void, housing = true, flicker = 0, fog = 1, renderOrder, ...group
}) => {
  const skipKey = JSON.stringify(skip ?? []);
  const geo = useMemo(() => {
    const skipSet = new Set((skip ?? []).map(([c, r]) => `${c},${r}`));
    const r = stream(`iriswall-${seed}`);
    const inst: number[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = r();
        const b = r();
        if (skipSet.has(`${i},${j}`)) continue;
        const [x, y] = irisWallCell(i, j, {cols, rows, spacing, hex});
        inst.push(x, y, a, b);
      }
    }
    const g = new THREE.InstancedBufferGeometry();
    g.index = DISC.index!.clone();
    g.setAttribute('position', DISC.getAttribute('position').clone());
    g.setAttribute('uv', DISC.getAttribute('uv').clone());
    g.setAttribute('aInst', new THREE.InstancedBufferAttribute(new Float32Array(inst), 4));
    g.instanceCount = inst.length / 4;
    return g;
  }, [cols, rows, spacing, hex, seed, skipKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uColor: {value: new THREE.Color()},
          uHousing: {value: new THREE.Color(S.void)},
          uGlint: {value: new THREE.Color()},
          uHousingOn: {value: 1},
          uRadius: {value: 0.5},
          uTime: {value: 0},
          uOpen: {value: 1},
          uPupil: {value: 0.3},
          uBlink: {value: 0},
          uDead: {value: 0},
          uMaxBright: {value: 1.4},
          uFlicker: {value: 0},
          uFog: {value: 1},
          uWave: {value: new THREE.Vector4()},
          uWave2: {value: new THREE.Vector2()},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        fog: true,
        transparent: true,
        depthWrite: true,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  const [ww, wh] = irisWallSize({cols, rows, spacing, hex});
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(color).multiplyScalar(intensity);
    u.uGlint.value.set(S.bone).multiplyScalar(1.2);
    u.uHousingOn.value = housing ? 1 : 0;
    u.uRadius.value = radius;
    u.uTime.value = time;
    u.uOpen.value = open;
    u.uPupil.value = pupil;
    u.uBlink.value = blink;
    u.uDead.value = dead;
    u.uMaxBright.value = 2 / Math.max(1e-3, intensity);
    u.uFlicker.value = flicker;
    u.uFog.value = fog;
    if (wave) {
      const c = wave.center ?? [0, wh / 2];
      u.uWave.value.set(c[0], c[1], wave.start ?? 0, wave.speed ?? 12);
      u.uWave2.value.set(wave.width ?? 6, wave.mode === 'pulse' ? 2 : 1);
    } else u.uWave2.value.set(1, 0);
  });
  return (
    <group {...group}>
      {wall ? (
        <mesh position={[0, wh / 2, -Math.max(0.02, spacing * 0.05)]} renderOrder={renderOrder}>
          <planeGeometry args={[ww + spacing, wh + spacing]} />
          <meshBasicMaterial color={wall} polygonOffset polygonOffsetFactor={2} polygonOffsetUnits={8} />
        </mesh>
      ) : null}
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};
