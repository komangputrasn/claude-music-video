/**
 * <SkyDome> — big gradient backdrop sphere (Y2K wallpaper skies) with an optional soft sun/glow spot. Unlit, no fog,
 * drawn behind everything. Centre it on the camera position for a perfect infinite sky (or leave it at the origin; the
 * default radius is large).
 *
 * Props (+ group props)
 *   preset?: 'y2k' | 'day' | 'night' | 'sunset' | 'sunrise' | 'hold' | 'void' = 'y2k'
 *   stops?: [y: -1..1, css][] (overrides preset; y is the view-direction elevation, max 8 stops)
 *   radius?: 200   glow?: {dir: [x,y,z], color?: css, size?: 0.25 (rad-ish), intensity?: 1.5}
 *   brightness?: 1   stripes?: 0 (number of faint horizontal Y2K scan bands; 0 = off)
 *
 * Usage
 *   <SkyDome preset="y2k" />
 *   <SkyDome preset="sunrise" glow={{dir: [0.3, 0.1, -1], color: '#ffd38a'}} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {GroupProps} from './shared';

type Stop = [number, string];
export const SKY_PRESETS: Record<string, Stop[]> = {
  y2k: [[-1, '#0a2a9a'], [-0.1, '#1E5BFF'], [0.0, '#8fd0ff'], [0.12, '#4B9BFF'], [0.45, '#1E5BFF'], [1, '#0A3FD8']],
  day: [[-1, '#3f8a2a'], [-0.02, '#7cc8ff'], [0.0, '#e6f6ff'], [0.15, '#8cc8ff'], [0.6, '#3a8cf0'], [1, '#1f5fd8']],
  night: [[-1, '#010104'], [-0.05, '#03061a'], [0.0, '#16246a'], [0.25, '#070c30'], [1, '#020210']],
  sunset: [[-1, '#120614'], [-0.05, '#3a1430'], [0.0, '#ffb070'], [0.12, '#ff5f8a'], [0.45, '#6a3aa8'], [1, '#160c3a']],
  sunrise: [[-1, '#2a1a40'], [-0.04, '#ff9a7a'], [0.0, '#ffe2a8'], [0.1, '#ffb0c8'], [0.35, '#8ab8ff'], [1, '#3a6ae0']],
  hold: [[-1, '#12042a'], [-0.2, '#2a0c5a'], [0.0, '#6a3ad8'], [0.3, '#3a1a90'], [1, '#0e0430']],
  void: [[-1, '#000000'], [0.0, '#050A2A'], [1, '#000000']],
};

const MAX = 8;
const VERT = /* glsl */ `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
uniform float uY[${MAX}];
uniform vec3 uC[${MAX}];
uniform int uN;
uniform vec3 uGlowDir;
uniform vec3 uGlowCol;
uniform float uGlowSize;
uniform float uGlowK;
uniform float uBright;
uniform float uStripes;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 col = uC[0];
  for (int i = 0; i < ${MAX - 1}; i++) {
    if (i >= uN - 1) break;
    float t = clamp((y - uY[i]) / max(1e-4, uY[i + 1] - uY[i]), 0.0, 1.0);
    if (y >= uY[i]) col = mix(uC[i], uC[i + 1], t);
  }
  if (uGlowK > 0.0) {
    float c = max(dot(d, normalize(uGlowDir)), 0.0);
    float a = acos(min(c, 1.0));
    col += uGlowCol * uGlowK * (exp(-pow(a / uGlowSize, 2.0)) + 0.25 * exp(-a / (uGlowSize * 3.0)));
  }
  if (uStripes > 0.0) col *= 1.0 - 0.06 * step(0.5, fract(y * uStripes));
  gl_FragColor = vec4(col * uBright, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type SkyDomeProps = GroupProps & {
  preset?: keyof typeof SKY_PRESETS | string;
  stops?: Stop[];
  radius?: number;
  glow?: {dir: [number, number, number]; color?: string; size?: number; intensity?: number};
  brightness?: number;
  stripes?: number;
};

export const SkyDome: React.FC<SkyDomeProps> = ({preset = 'y2k', stops, radius = 200, glow, brightness = 1, stripes = 0, ...group}) => {
  const geo = useMemo(() => new THREE.SphereGeometry(radius, 48, 32), [radius]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uY: {value: new Array(MAX).fill(0)}, uC: {value: Array.from({length: MAX}, () => new THREE.Color())}, uN: {value: 2},
          uGlowDir: {value: new THREE.Vector3(0, 0, -1)}, uGlowCol: {value: new THREE.Color()}, uGlowSize: {value: 0.25}, uGlowK: {value: 0},
          uBright: {value: 1}, uStripes: {value: 0},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const st = (stops ?? SKY_PRESETS[preset] ?? SKY_PRESETS.y2k).slice(0, MAX);
    const u = mat.uniforms;
    st.forEach((s, i) => {
      u.uY.value[i] = s[0];
      (u.uC.value[i] as THREE.Color).set(s[1]);
    });
    u.uN.value = st.length;
    u.uGlowK.value = glow ? glow.intensity ?? 1.5 : 0;
    if (glow) {
      u.uGlowDir.value.set(...glow.dir);
      u.uGlowCol.value.set(glow.color ?? '#fff1c4');
      u.uGlowSize.value = glow.size ?? 0.25;
    }
    u.uBright.value = brightness;
    u.uStripes.value = stripes;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} renderOrder={-1000} frustumCulled={false} />
    </group>
  );
};
