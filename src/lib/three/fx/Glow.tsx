/**
 * Glows & swooshes.
 *
 * <Glow> — soft additive halo billboard (street lamps, LEDs, screens, the "legendary item" aura). Always faces the
 * camera; HDR so it blooms.
 *   size?: 1 (m, diameter)   color?: '#19C6FF'   intensity?: 1.2   depthTest?: true   squash?: 1 (x/y aspect, >1 = wide)
 *   e.g. <Glow position={[0, 3.9, 0]} size={2.5} color={C.sodium} />
 *
 * <Swoosh> — the 2000s logo swoosh: a glowing tapered ribbon along an elliptical arc in the XY plane (faces +Z),
 * drawn on with `progress` 0..1 (bright head, fading tail). Centre of the ellipse = group origin.
 *   radius?: [rx, ry] = [3, 0.8]   arc?: [startRad, endRad] = [-2.6, -0.3] (angles on the ellipse; default = lower
 *   smile under a title)   width?: 0.16 (m, max)   progress?: 1   colorA?: '#19C6FF'   colorB?: '#FF4FB8'
 *   intensity?: 1.6   tilt?: 0 (rad, tilts the ribbon plane around the arc's chord for depth)
 *   e.g. <Swoosh position={[0, 0.9, 0.4]} progress={ramp(f, 20, 40)} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {fxAtlas, quadInstances, GLSL_ATLAS, GroupProps, ATLAS} from './shared';

const GLOW_VERT = /* glsl */ `
uniform float uSize;
uniform float uSquash;
varying vec2 vUv;
void main() {
  float ms = length(modelMatrix[0].xyz);
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * vec2(uSquash, 1.0) * uSize * 0.5 * ms;
  gl_Position = projectionMatrix * mv;
  vUv = uv;
}`;
const GLOW_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
${GLSL_ATLAS}
void main() {
  float m = texture2D(uTex, atlasUv(vUv, ${ATLAS.dot.toFixed(1)})).r;
  gl_FragColor = vec4(uColor * m * uIntensity, 1.0);
}`;

export type GlowProps = Omit<GroupProps, 'scale'> & {size?: number; color?: string; intensity?: number; depthTest?: boolean; squash?: number};

export const Glow: React.FC<GlowProps> = ({size = 1, color = '#19C6FF', intensity = 1.2, depthTest = true, squash = 1, ...group}) => {
  const geo = useMemo(() => quadInstances(1, {iDummy: [1, new Float32Array([0])]}), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uTex: {value: fxAtlas()}, uSize: {value: 1}, uSquash: {value: 1}, uColor: {value: new THREE.Color()}, uIntensity: {value: 1}},
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useLayoutEffect(() => {
    mat.uniforms.uSize.value = size;
    mat.uniforms.uSquash.value = squash;
    mat.uniforms.uColor.value.set(color);
    mat.uniforms.uIntensity.value = intensity;
    mat.depthTest = depthTest;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={8} visible={intensity > 0} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ Swoosh
const SW_VERT = /* glsl */ `
attribute float aU;
attribute float aV;
varying float vU;
varying float vV;
void main() { vU = aU; vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SW_FRAG = /* glsl */ `
uniform float uProgress;
uniform float uIntensity;
uniform vec3 uA;
uniform vec3 uB;
varying float vU;
varying float vV;
void main() {
  if (vU > uProgress) discard;
  float rel = vU / max(uProgress, 1e-4);
  float across = 1.0 - abs(vV);
  float core = smoothstep(0.0, 0.35, across);
  float hot = smoothstep(0.55, 1.0, across);
  float tail = smoothstep(0.0, 0.5, rel);
  float head = smoothstep(uProgress - 0.12, uProgress, vU) * step(uProgress, 0.999);
  vec3 col = mix(uA, uB, vU);
  col = col * core * (0.55 + 0.45 * tail) + vec3(1.0) * hot * 0.6 * tail + vec3(1.0) * head * core * 1.5;
  gl_FragColor = vec4(col * uIntensity, 1.0);
}`;

export type SwooshProps = GroupProps & {
  radius?: [number, number];
  arc?: [number, number];
  width?: number;
  progress?: number;
  colorA?: string;
  colorB?: string;
  intensity?: number;
  tilt?: number;
};

export const Swoosh: React.FC<SwooshProps> = ({
  radius = [3, 0.8], arc = [-2.6, -0.3], width = 0.16, progress = 1, colorA = '#19C6FF', colorB = '#FF4FB8', intensity = 1.6, tilt = 0, ...group
}) => {
  const geo = useMemo(() => {
    const N = 160;
    const pos: number[] = [], U: number[] = [], V: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = arc[0] + (arc[1] - arc[0]) * u;
      const x = Math.cos(a) * radius[0], y = Math.sin(a) * radius[1];
      // normal of the ellipse in-plane
      const nx = Math.cos(a) / radius[0], ny = Math.sin(a) / radius[1];
      const nl = Math.hypot(nx, ny) || 1;
      const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.7) * (0.35 + 0.65 * u);
      for (const s of [-1, 1]) {
        pos.push(x + (nx / nl) * w * 0.5 * s, y + (ny / nl) * w * 0.5 * s, 0);
        U.push(u);
        V.push(s);
      }
      if (i < N) {
        const b = i * 2;
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aU', new THREE.Float32BufferAttribute(U, 1));
    g.setAttribute('aV', new THREE.Float32BufferAttribute(V, 1));
    g.setIndex(idx);
    return g;
  }, [radius[0], radius[1], arc[0], arc[1], width]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uProgress: {value: 1}, uIntensity: {value: 1.6}, uA: {value: new THREE.Color()}, uB: {value: new THREE.Color()}},
        vertexShader: SW_VERT,
        fragmentShader: SW_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useLayoutEffect(() => {
    mat.uniforms.uProgress.value = progress;
    mat.uniforms.uIntensity.value = intensity;
    mat.uniforms.uA.value.set(colorA);
    mat.uniforms.uB.value.set(colorB);
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} rotation={[tilt, 0, 0]} renderOrder={7} visible={progress > 0} />
    </group>
  );
};
