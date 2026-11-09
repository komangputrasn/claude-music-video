/**
 * Neon wireframe grids (Y2K / "cyber" floor) with anti-aliased, moire-free lines (Golus "pristine grid"), a soft glow
 * halo and distance fade. Lines are HDR so they bloom.
 *
 * <WireGrid> — floor in the XZ plane at y=0 (origin = centre).
 *   size?: 80 (m)   cell?: 1 (m)   line?: 0.035 (fraction of a cell)   color?: '#19C6FF'   glow?: 1.6 (HDR multiplier)
 *   offset?: number | [x, z] (m; positive z moves lines toward +Z = toward a camera looking down -Z; e.g. time * 4)
 *   fill?: css | null = '#050A2A' (floor colour; null = lines only, transparent)   fillOpacity?: 1
 *   fadeNear?: 4   fadeFar?: 40 (m from camera)   horizon?: css colour lines fade into (default = fill)
 *   major?: 0 (every Nth line brighter; 0 = off)
 *
 * <WireTunnel> — the same grid on the inside of a cylinder along Z (centred on the origin), for screen-saver tunnels.
 *   radius?: 3   length?: 60   cell?: 1   offset?: number (m; positive moves the grid toward +Z, i.e. flying down -Z)
 *   twist?: 0 (rad, rotates grid)
 *   + color / line / glow / fill / fillOpacity / fadeNear / fadeFar / horizon as above
 *
 * Usage
 *   <WireGrid offset={t * 4} color="#FF4FB8" fill="#0a0230" />
 *   <WireTunnel offset={t * 12} radius={4} color="#9BFF3A" />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {GroupProps} from './shared';

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform vec2 uOffset;
uniform float uCell;
uniform float uAround;
uniform float uTwist;
varying vec2 vCoord;
varying vec3 vViewPos;
void main() {
  #ifdef TUNNEL
    vCoord = vec2(uv.x * uAround + uTwist / 6.2831853 * uAround, (position.z - uOffset.y) / uCell);
  #else
    vCoord = (position.xz + uOffset) / uCell;
  #endif
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform vec3 uFill;
uniform vec3 uHorizon;
uniform float uFillAlpha;
uniform float uLine;
uniform float uGlow;
uniform float uNear;
uniform float uFar;
uniform float uMajor;
varying vec2 vCoord;
varying vec3 vViewPos;
float pristine(vec2 uv, float lw) {
  vec2 dd = fwidth(uv);
  vec2 draw = clamp(vec2(lw), dd, vec2(0.5));
  vec2 aa = dd * 1.5;
  vec2 g = 1.0 - abs(fract(uv) * 2.0 - 1.0);
  vec2 l = smoothstep(draw + aa, draw - aa, g);
  l *= clamp(lw / draw, 0.0, 1.0);
  l = mix(l, vec2(lw), clamp(dd * 2.0 - 1.0, 0.0, 1.0));
  return mix(l.x, 1.0, l.y);
}
void main() {
  float g = pristine(vCoord, uLine);
  float halo = pristine(vCoord, uLine * 3.0) * 0.14;
  float maj = 0.0;
  if (uMajor > 0.5) maj = pristine(vCoord / uMajor, uLine / uMajor * 1.6);
  float fade = 1.0 - smoothstep(uNear, uFar, length(vViewPos));
  float lines = clamp(g + halo + maj * 0.6, 0.0, 1.0);
  vec3 lc = uColor * uGlow * (1.0 + maj * 0.8);
  vec3 base = mix(uHorizon, uFill, fade);
  vec3 col = mix(base, lc, lines * fade);
  float alpha = max(uFillAlpha, lines * fade);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

type GridCommon = {
  cell?: number;
  line?: number;
  color?: string;
  glow?: number;
  fill?: string | null;
  fillOpacity?: number;
  fadeNear?: number;
  fadeFar?: number;
  horizon?: string;
  major?: number;
};

const useGridMat = (tunnel: boolean) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uOffset: {value: new THREE.Vector2()}, uCell: {value: 1}, uAround: {value: 16}, uTwist: {value: 0},
            uColor: {value: new THREE.Color()}, uFill: {value: new THREE.Color()}, uHorizon: {value: new THREE.Color()},
            uFillAlpha: {value: 1}, uLine: {value: 0.035}, uGlow: {value: 1.6}, uNear: {value: 4}, uFar: {value: 40}, uMajor: {value: 0},
          },
        ]),
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        fog: true,
        side: tunnel ? THREE.BackSide : THREE.DoubleSide,
        defines: tunnel ? {TUNNEL: ''} : {},
      }),
    [tunnel],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return mat;
};

const applyCommon = (mat: THREE.ShaderMaterial, p: GridCommon) => {
  const u = mat.uniforms;
  u.uCell.value = p.cell ?? 1;
  u.uLine.value = p.line ?? 0.035;
  u.uColor.value.set(p.color ?? '#19C6FF');
  u.uGlow.value = p.glow ?? 1.6;
  const fill = p.fill === undefined ? '#050A2A' : p.fill;
  u.uFill.value.set(fill ?? '#000000');
  u.uFillAlpha.value = fill === null ? 0 : p.fillOpacity ?? 1;
  u.uHorizon.value.set(p.horizon ?? fill ?? '#000000');
  u.uNear.value = p.fadeNear ?? 4;
  u.uFar.value = p.fadeFar ?? 40;
  u.uMajor.value = p.major ?? 0;
  mat.depthWrite = fill !== null && (p.fillOpacity ?? 1) >= 1;
};

export type WireGridProps = GroupProps & GridCommon & {size?: number; offset?: number | [number, number]};

export const WireGrid: React.FC<WireGridProps> = ({size = 80, offset = 0, cell, line, color, glow, fill, fillOpacity, fadeNear, fadeFar, horizon, major, ...group}) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2), [size]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useGridMat(false);
  useLayoutEffect(() => {
    applyCommon(mat, {cell, line, color, glow, fill, fillOpacity, fadeNear, fadeFar, horizon, major});
    const o = typeof offset === 'number' ? [0, offset] : offset;
    mat.uniforms.uOffset.value.set(o[0], -o[1]);
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} renderOrder={-1} />
    </group>
  );
};

export type WireTunnelProps = GroupProps & GridCommon & {radius?: number; length?: number; offset?: number; twist?: number};

export const WireTunnel: React.FC<WireTunnelProps> = ({radius = 3, length = 60, offset = 0, twist = 0, cell, line, color, glow, fill, fillOpacity, fadeNear, fadeFar, horizon, major, ...group}) => {
  const geo = useMemo(() => new THREE.CylinderGeometry(radius, radius, length, 96, 1, true).rotateX(Math.PI / 2), [radius, length]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useGridMat(true);
  useLayoutEffect(() => {
    applyCommon(mat, {cell, line, color: color ?? '#9BFF3A', glow, fill, fillOpacity, fadeNear: fadeNear ?? 2, fadeFar: fadeFar ?? length * 0.6, horizon, major});
    mat.uniforms.uAround.value = Math.max(3, Math.round((2 * Math.PI * radius) / (cell ?? 1)));
    mat.uniforms.uOffset.value.set(0, offset);
    mat.uniforms.uTwist.value = twist;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} renderOrder={-1} />
    </group>
  );
};
