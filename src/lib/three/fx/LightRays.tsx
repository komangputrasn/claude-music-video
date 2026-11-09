/**
 * God rays and sunbursts.
 *
 * <LightRays> — a volumetric-looking cone of shimmering light beams (additive, double-sided open cone with procedural
 * beam stripes). The APEX is at the group origin and the cone points DOWN (-Y), like a spotlight from heaven; rotate the
 * group to aim it (e.g. rotation={[Math.PI / 2, 0, 0]} shines toward +Z). Beams drift/flicker with `time`.
 *   length?: 6 (m)   radius?: 2.2 (end radius, m)   apexRadius?: 0.05   count?: 14 beams around   seed?: 1
 *   color?: '#fff1c4'   endColor?: color at the far end (default = color)   intensity?: 1.2   time?: 0 (s)
 *   speed?: 0.04 (rev/s drift)   falloff?: 1.6 (higher = fades sooner)   haze?: 0.12 (base fill between beams)
 *
 * <Sunburst> — flat Y2K radial-stripe burst (logo backdrop / "WINNER!" wallpaper) in the XY plane facing +Z.
 *   radius?: 6   rays?: 16   colorA?: '#4B9BFF'   colorB?: '#1E5BFF'   center?: '#ffffff' (glow colour)
 *   rotation2d?: 0 (rad, spin it with time)   opacity?: 1   glow?: 0.8   softness?: 0.35 (edge fade, 0..1)
 *   additive?: false   twist?: 0 (spiral amount)
 *
 * Usage
 *   <LightRays position={[0, 6, 0]} length={7} radius={2.5} time={t} color="#ffe9a8" />
 *   <Sunburst position={[0, 1.5, -4]} radius={8} rotation2d={t * 0.2} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {GLSL_HASH, GroupProps} from './shared';

const RAYS_VERT = /* glsl */ `
uniform float uLength;
varying float vAlong;
varying vec2 vXZ;
varying vec3 vN;
varying vec3 vV;
void main() {
  vAlong = -position.y / uLength;
  vXZ = position.xz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const RAYS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uCount;
uniform float uSeed;
uniform float uSpeed;
uniform float uFalloff;
uniform float uHaze;
uniform float uIntensity;
uniform vec3 uColor;
uniform vec3 uColor2;
varying float vAlong;
varying vec2 vXZ;
varying vec3 vN;
varying vec3 vV;
${GLSL_HASH}
float pnoise(float x, float n, float seed) {
  float i0 = floor(x);
  float f = fract(x);
  float a = hash11(mod(i0, n) + seed);
  float b = hash11(mod(i0 + 1.0, n) + seed);
  return mix(a, b, f * f * (3.0 - 2.0 * f));
}
void main() {
  float u = atan(vXZ.y, vXZ.x) / 6.2831853 + 0.5; // per-fragment: no interpolated atan seam
  float x1 = u * uCount + uTime * uSpeed * uCount;
  float beams = smoothstep(0.42, 0.9, pnoise(x1, uCount, uSeed * 13.7));
  float x2 = u * uCount * 3.0 - uTime * uSpeed * uCount * 2.1;
  float fine = pnoise(x2, uCount * 3.0, uSeed * 7.3 + 3.0);
  float flick = 0.8 + 0.2 * sin(uTime * 2.3 + pnoise(u * uCount, uCount, uSeed + 11.0) * 30.0);
  float s = beams * (0.55 + 0.45 * fine) * flick + uHaze;
  float a = clamp(vAlong, 0.0, 1.0);
  float fade = pow(1.0 - a, uFalloff) * smoothstep(0.0, 0.1, a);
  // fade the cone's silhouette so it never shows a hard edge
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float soft = smoothstep(0.0, 0.45, facing) * mix(1.0, 0.6, facing);
  vec3 col = mix(uColor, uColor2, a) * s * fade * soft * uIntensity;
  gl_FragColor = vec4(col, 1.0);
}`;

export type LightRaysProps = GroupProps & {
  length?: number;
  radius?: number;
  apexRadius?: number;
  count?: number;
  seed?: number;
  color?: string;
  endColor?: string;
  intensity?: number;
  time?: number;
  speed?: number;
  falloff?: number;
  haze?: number;
};

export const LightRays: React.FC<LightRaysProps> = ({
  length = 6, radius = 2.2, apexRadius = 0.05, count = 14, seed = 1, color = '#fff1c4', endColor, intensity = 1.2, time = 0,
  speed = 0.04, falloff = 1.6, haze = 0.12, ...group
}) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(apexRadius, radius, length, 96, 8, true);
    g.translate(0, -length / 2, 0);
    return g;
  }, [length, radius, apexRadius]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uLength: {value: 1}, uTime: {value: 0}, uCount: {value: 14}, uSeed: {value: 1}, uSpeed: {value: 0.04}, uFalloff: {value: 1.6},
          uHaze: {value: 0.12}, uIntensity: {value: 1}, uColor: {value: new THREE.Color()}, uColor2: {value: new THREE.Color()},
        },
        vertexShader: RAYS_VERT,
        fragmentShader: RAYS_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uLength.value = length;
    u.uTime.value = time;
    u.uCount.value = Math.max(1, Math.round(count));
    u.uSeed.value = seed;
    u.uSpeed.value = speed;
    u.uFalloff.value = falloff;
    u.uHaze.value = haze;
    u.uIntensity.value = intensity;
    u.uColor.value.set(color);
    u.uColor2.value.set(endColor ?? color);
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} renderOrder={5} visible={intensity > 0} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ Sunburst
const BURST_VERT = /* glsl */ `
varying vec2 vP;
void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BURST_FRAG = /* glsl */ `
uniform float uRadius;
uniform float uRays;
uniform float uRot;
uniform float uOpacity;
uniform float uGlow;
uniform float uSoft;
uniform float uTwist;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
varying vec2 vP;
void main() {
  float r = length(vP) / uRadius;
  float a = atan(vP.y, vP.x) / 6.2831853 + uRot / 6.2831853 + uTwist * r;
  float k = fract(a * uRays);
  float tri = abs(k * 2.0 - 1.0);
  // derivative without the atan seam (two atans with opposite seams)
  float fw = min(fwidth(atan(vP.y, vP.x)), fwidth(atan(-vP.y, -vP.x))) / 6.2831853 + fwidth(uTwist * r);
  float aa = max(fw * uRays * 1.5, 1e-4);
  float stripe = smoothstep(0.5 - aa, 0.5 + aa, tri);
  vec3 col = mix(uA, uB, stripe);
  float g = exp(-r * r * 9.0);
  col = mix(col, uC, g * 0.85) + uC * g * uGlow * 0.6;
  float alpha = (1.0 - smoothstep(1.0 - uSoft, 1.0, r)) * uOpacity;
  gl_FragColor = vec4(col, alpha);
}`;

export type SunburstProps = GroupProps & {
  radius?: number;
  rays?: number;
  colorA?: string;
  colorB?: string;
  center?: string;
  rotation2d?: number;
  opacity?: number;
  glow?: number;
  softness?: number;
  additive?: boolean;
  twist?: number;
};

export const Sunburst: React.FC<SunburstProps> = ({
  radius = 6, rays = 16, colorA = '#4B9BFF', colorB = '#1E5BFF', center = '#ffffff', rotation2d = 0, opacity = 1, glow = 0.8,
  softness = 0.35, additive = false, twist = 0, ...group
}) => {
  const geo = useMemo(() => new THREE.CircleGeometry(radius, 128), [radius]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uRadius: {value: 1}, uRays: {value: 16}, uRot: {value: 0}, uOpacity: {value: 1}, uGlow: {value: 1}, uSoft: {value: 0.3}, uTwist: {value: 0},
          uA: {value: new THREE.Color()}, uB: {value: new THREE.Color()}, uC: {value: new THREE.Color()},
        },
        vertexShader: BURST_VERT,
        fragmentShader: BURST_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uRadius.value = radius;
    u.uRays.value = Math.max(1, Math.round(rays));
    u.uRot.value = rotation2d;
    u.uOpacity.value = opacity;
    u.uGlow.value = glow;
    u.uSoft.value = softness;
    u.uTwist.value = twist;
    u.uA.value.set(colorA);
    u.uB.value.set(colorB);
    u.uC.value.set(center);
    mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} renderOrder={-5} visible={opacity > 0} />
    </group>
  );
};
