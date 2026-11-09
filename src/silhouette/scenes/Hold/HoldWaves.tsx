/**
 * <HoldWaves> — LOCAL to Hold: the hold music as VISIBLE SOUND. Thin authRed waveform traces hanging in the fog over
 * the black sea, each one a soft oscilloscope line (a hot ~1.5 px core + a faint red glow) whose shape is the song's
 * spectrum at this frame (16 bands → 8 partials, smoothed over 3 frames) scrolling sideways. One ribbon mesh per trace
 * (480 segments, displaced in the vertex shader, premultiplied-alpha blended — light that also occludes the haze behind
 * it by `cover`, so red stays red over the grey horizon — depth-tested so silhouettes cut it). `level` 0 flatlines them.
 * The same shape is available on the CPU (waveY) so the lyric can ride the trace.
 *
 *   <HoldWaves time={t} bands={holdBands(absFrame)} level={0..1} traces={TRACES}/>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../../lib/palette';
import {bandsAt, rmsAt} from '../../../lib/time';

export type Trace = {
  /** centre of the trace (world) */
  y: number;
  z: number;
  x?: number;
  /** total width (m); the ends taper */
  width: number;
  /** peak displacement (m) at full level */
  amp: number;
  /** spatial frequency multiplier */
  freq: number;
  /** scroll speed multiplier */
  speed: number;
  seed: number;
  /** core line thickness (m) and glow half-width (m) */
  core: number;
  glow: number;
  /** HDR red of the core (keep ≤ ~1.2 so red stays red); glow fraction */
  intensity: number;
  glowK?: number;
  /** 0..1: how much the line REPLACES what is behind it instead of adding to it (premultiplied alpha). Red added on
      top of the bright grey horizon haze tone-maps to pink/salmon; near traces crossing the haze use 1 so they stay
      pure authRed. Far, thin traces keep a low value (mostly additive, veiled). Default 0.35. */
  cover?: number;
};

const N_PART = 8;

/** 8 partial amplitudes from the 16 spectrum bands, averaged over 3 frames (no frame-to-frame jitter) */
export const holdBands = (absFrame: number): number[] => {
  const out = new Array(N_PART).fill(0);
  for (let k = 0; k < 3; k++) {
    const b = bandsAt(absFrame - k);
    for (let i = 0; i < N_PART; i++) out[i] += (b[2 * i] + b[2 * i + 1]) / 6;
  }
  return out;
};

/** loudness used for the trace amplitude (smoothed) */
export const holdLoud = (absFrame: number) => (rmsAt(absFrame) + rmsAt(absFrame - 1) + rmsAt(absFrame - 2)) / 3;

// partials sit close together (0.5, 0.78, 1.06 … × freq): they beat into soft travelling wave packets, a held tune
// rather than a seismograph; higher partials are weighted down hard
const shape = (x: number, t: number, b: number[], tr: Trace) => {
  let s = 0;
  for (let i = 0; i < N_PART; i++) {
    const k = tr.freq * (0.5 + 0.28 * i);
    const w = tr.speed * (1.1 + 0.45 * i);
    s += (b[i] * Math.sin(x * k - t * w + tr.seed * (i + 1.3))) / (1 + 0.6 * i);
  }
  return s;
};
const env = (u: number) => {
  const a = Math.min(1, Math.max(0, (Math.abs(u) - 0.28) / 0.22));
  return 1 - a * a * (3 - 2 * a);
};

/** height (m, relative to the trace centre) of a trace at local x (m) — identical to the vertex shader */
export const waveY = (tr: Trace, x: number, t: number, bands: number[], level: number) =>
  shape(x, t, bands, tr) * env(x / tr.width) * tr.amp * level;

/** slope dy/dx of the trace at x */
export const waveSlope = (tr: Trace, x: number, t: number, bands: number[], level: number) => {
  const e = 0.05;
  return (waveY(tr, x + e, t, bands, level) - waveY(tr, x - e, t, bands, level)) / (2 * e);
};

const VERT = /* glsl */ `
uniform float uTime, uAmp, uWidth, uHalf, uSeed, uFreq, uSpeed;
uniform float uB[${N_PART}];
varying float vV;
varying float vU;
float shape(float x) {
  float s = 0.0;
  for (int i = 0; i < ${N_PART}; i++) {
    float fi = float(i);
    float k = uFreq * (0.5 + 0.28 * fi);
    float w = uSpeed * (1.1 + 0.45 * fi);
    s += uB[i] * sin(x * k - uTime * w + uSeed * (fi + 1.3)) / (1.0 + 0.6 * fi);
  }
  return s;
}
float env(float u) {
  float a = clamp((abs(u) - 0.28) / 0.22, 0.0, 1.0);
  return 1.0 - a * a * (3.0 - 2.0 * a);
}
float yAt(float u) { return shape(u * uWidth) * env(u) * uAmp; }
void main() {
  float u = position.x;
  float x = u * uWidth;
  float y = yAt(u);
  float e = 0.0012;
  float dy = (yAt(u + e) - yAt(u - e)) / (2.0 * e * uWidth);
  vec2 n = normalize(vec2(-dy, 1.0));
  vec2 p = vec2(x, y) + n * position.y * 2.0 * uHalf;
  vV = position.y * 2.0;
  vU = u;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uCore, uGlow, uSeedF, uCover;
varying float vV;
varying float vU;
void main() {
  float d = abs(vV);
  float fw = fwidth(vV);
  // the core never gets thinner than ~1 px: wider but dimmer (energy kept), so far traces don't alias
  float cw = max(uCore, fw * 1.1);
  float core = (1.0 - smoothstep(cw * 0.45, cw, d)) * (uCore / cw);
  float glow = exp(-d * d * 6.0) * (1.0 - d);
  float endFade = 1.0 - smoothstep(0.34, 0.5, abs(vU));
  // the trace passes through drifting haze: its brightness breathes along its length
  float veil = 0.62 + 0.38 * sin(vU * 17.0 + uSeedF * 3.1) * sin(vU * 6.3 - uSeedF * 1.7);
  float k = endFade * veil;
  vec3 c = uColor * (core + glow * uGlow) * k;
  // premultiplied: dst = c + dst * (1 - a). The core occludes the haze behind it (red stays red over grey).
  float a = uCover * clamp(core * k + glow * uGlow * k * 0.5, 0.0, 1.0);
  if (max(c.r, max(c.g, c.b)) < 0.0004 && a < 0.002) discard;
  gl_FragColor = vec4(c, a);
}`;

let ribbon: THREE.PlaneGeometry | null = null;
const getRibbon = () => (ribbon ??= new THREE.PlaneGeometry(1, 1, 480, 1));

const TraceMesh: React.FC<{tr: Trace; time: number; bands: number[]; level: number; fade: number}> = ({tr, time, bands, level, fade}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: {value: 0}, uAmp: {value: 0}, uWidth: {value: 1}, uHalf: {value: 0.1}, uSeed: {value: 0}, uFreq: {value: 1},
          uSpeed: {value: 1}, uB: {value: new Array(N_PART).fill(0)}, uColor: {value: new THREE.Color()}, uCore: {value: 0.1},
          uGlow: {value: 0.25}, uSeedF: {value: 0}, uCover: {value: 0.35},
        },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
        premultipliedAlpha: true, side: THREE.DoubleSide, toneMapped: true,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uTime.value = time;
    u.uAmp.value = tr.amp * level;
    u.uWidth.value = tr.width;
    u.uHalf.value = tr.glow;
    u.uSeed.value = tr.seed;
    u.uSeedF.value = tr.seed;
    u.uFreq.value = tr.freq;
    u.uSpeed.value = tr.speed;
    (u.uB.value as number[]).splice(0, N_PART, ...bands);
    u.uColor.value.set(S.authRed).multiplyScalar(tr.intensity * fade);
    u.uCore.value = tr.core / tr.glow;
    u.uGlow.value = tr.glowK ?? 0.16;
    u.uCover.value = tr.cover ?? 0.35;
  });
  return <mesh geometry={getRibbon()} material={mat} position={[tr.x ?? 0, tr.y, tr.z]} renderOrder={4} frustumCulled={false} />;
};

export const HoldWaves: React.FC<{time: number; bands: number[]; level: number; fade?: number; traces: Trace[]}> = ({
  time, bands, level, fade = 1, traces,
}) => (
  <group>
    {traces.map((tr, i) => (
      <TraceMesh key={i} tr={tr} time={time} bands={bands} level={level} fade={fade} />
    ))}
  </group>
);
