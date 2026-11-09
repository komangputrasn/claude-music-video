/**
 * <Backlight> — the bright haze card silhouettes are staged against (DESIGN-silhouette §2.1, §2.3).
 * A procedural soft-gradient plane facing +Z, ORIGIN AT ITS CENTRE (it is a light card, not a floor object), additive,
 * fog-free (it IS the lit fog), depthWrite off. Put it far behind the subject; silhouettes and fog layers sit in front.
 *
 *   <Backlight color?={S.bone} intensity?={1} size?={[30, 16]} position?={[0, 4, -30]}
 *              shape?={'radial'} softness?={0.7} noise?={0.15} time?={0} core?={0} opacity?={1} {...group}/>
 *
 *   color      light colour (S.bone; S.authRed for TENURE light; dawnGold ONLY in Final/Outro).
 *   intensity  HDR multiplier. Default 1.0 puts the peak of a bone card at linear luminance ≈ 0.79, JUST UNDER the
 *              <SilStage> bloom threshold (0.86), so big haze never blooms and never washes silhouettes grey.
 *              bone: ≤ 1.08 stays under bloom. Red: keep ≤ 2 (ACES turns hotter red orange = reads as gold).
 *   size       [width, height] metres (or one number = square). The visible gradient fills the card.
 *   shape      'radial'   soft elliptical glow (fog lit by a light behind it)
 *              'slab'     soft-edged rectangle (a horizon band / a huge screen glowing through haze)
 *              'vertical' a tall soft column (a doorway, a light shaft seen head-on, a gap between buildings)
 *   softness   0..1 fraction of the half-size that is falloff (1 = all gradient, 0.2 = hard-ish plateau).
 *              For 'slab' the falloff width is softness × half the SHORTER side (same in metres on all edges).
 *   noise      0..1 slow haze breakup multiplied into the gradient (kills the CG look). Drifts with `time` (s).
 *   core       0..~2 adds a HOT core above bloom (radial: centre spot, slab: horizontal centre line, vertical: centre
 *              line = a door crack). Use sparingly — it is the only part allowed to bloom.
 *   opacity    master fade (0 hides; the mesh is skipped when 0).
 *
 * Usage
 *   <Backlight position={[0, 5, -40]} size={[60, 22]} shape="slab" softness={0.8}/>        // horizon glow
 *   <Backlight position={[0, 1.6, -9]} size={[2.2, 5]} shape="vertical" core={0.6}/>        // open door
 *   <Backlight position={[6, 6, -30]} size={14} color={S.authRed} intensity={1.4}/>           // red glow in the fog
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {atmosNoise, GroupProps} from './shared';

export type BacklightShape = 'radial' | 'slab' | 'vertical';
export type BacklightProps = GroupProps & {
  color?: string;
  intensity?: number;
  size?: number | [number, number];
  shape?: BacklightShape;
  softness?: number;
  noise?: number;
  time?: number;
  core?: number;
  opacity?: number;
  renderOrder?: number;
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uSize;
uniform float uShape, uSoft, uNoiseAmt, uTime, uCore, uOpacity;
uniform sampler2D uNoise;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  vec2 h = uSize * 0.5;
  float s = clamp(uSoft, 0.02, 1.0);
  float m, cd;
  if (uShape < 0.5) {
    float d = length(p);
    m = 1.0 - smoothstep(1.0 - s, 1.0, d);
    m *= m;
    cd = d;
  } else if (uShape < 1.5) {
    float b = s * min(h.x, h.y);
    vec2 e = h - abs(p) * h;
    m = smoothstep(0.0, b, e.x) * smoothstep(0.0, b, e.y);
    cd = abs(p.y) * h.y / max(b, 1e-3) * 0.5;
  } else {
    float mx = 1.0 - smoothstep(1.0 - s, 1.0, abs(p.x));
    float my = 1.0 - smoothstep(1.0 - 0.45 * s, 1.0, abs(p.y));
    m = mx * mx * my;
    cd = abs(p.x);
  }
  vec2 w = vUv * uSize;
  float n = texture2D(uNoise, w / 11.0 + vec2(uTime * 0.012, uTime * 0.004)).r * 0.7
          + texture2D(uNoise, w / 4.0 - vec2(uTime * 0.02, 0.0)).g * 0.3;
  m *= 1.0 - uNoiseAmt * (1.0 - n) * 1.4;
  float core = uCore * exp(-cd * cd * 45.0) * m;
  vec3 col = uColor * (max(m, 0.0) + core) * uOpacity;
  gl_FragColor = vec4(col, 1.0);
}`;

const SHAPES: Record<BacklightShape, number> = {radial: 0, slab: 1, vertical: 2};
const UNIT = new THREE.PlaneGeometry(1, 1);

export const Backlight: React.FC<BacklightProps> = ({
  color = S.bone, intensity = 1, size = [30, 16], shape = 'radial', softness = 0.7, noise = 0.15, time = 0, core = 0,
  opacity = 1, renderOrder = -10, position = [0, 4, -30], ...group
}) => {
  const [w, h] = typeof size === 'number' ? [size, size] : size;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: {value: new THREE.Color()}, uSize: {value: new THREE.Vector2(1, 1)}, uShape: {value: 0}, uSoft: {value: 0.7},
          uNoiseAmt: {value: 0.15}, uTime: {value: 0}, uCore: {value: 0}, uOpacity: {value: 1}, uNoise: {value: atmosNoise(1)},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(color).multiplyScalar(intensity);
    u.uSize.value.set(w, h);
    u.uShape.value = SHAPES[shape];
    u.uSoft.value = softness;
    u.uNoiseAmt.value = noise;
    u.uTime.value = time;
    u.uCore.value = core;
    u.uOpacity.value = opacity;
  });
  return (
    <group position={position} {...group}>
      <mesh geometry={UNIT} material={mat} scale={[w, h, 1]} renderOrder={renderOrder} visible={opacity > 0 && intensity > 0} />
    </group>
  );
};
