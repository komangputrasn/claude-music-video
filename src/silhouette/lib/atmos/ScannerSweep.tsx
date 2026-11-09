/**
 * TENURE scanner light (DESIGN-silhouette §2.3 "scanner beams sweep"). authRed = control: these are always red.
 *
 * <ScannerSweep> — a thin red FAN (sheet) of light in the fog with hot laser edges, swinging about its apex.
 *   Origin = the apex (the scanner head). The fan lies in the local XY plane, centred on local −Y (hanging DOWN from
 *   the apex) and rotated by `angle` about local Z (positive = toward +X). Rotate the group to mount it elsewhere:
 *   rotation-x={Math.PI/2} lays the fan flat pointing −Z (a floor-level sweep away from camera), rotation-y turns the
 *   sheet so you see it obliquely (a sheet seen at an angle reads brighter, as in real fog).
 *
 *   <ScannerSweep origin?={[0, 6, 0]} angle?={0} span?={0.5} length?={8} color?={S.authRed} intensity?={1.4}
 *                 fill?={0.7} edge?={1} lead?={0} falloff?={0.7} time?={0}
 *                 ground?={0} groundFade?={0.3} {...group}/>
 *
 *   angle      radians, the sweep: animate it (e.g. Math.sin(t * 0.8) * 0.6) for the pendulum scan.
 *   span       angular width of the fan (rad).          length   radius of the fan (m)
 *   intensity  HDR multiplier (keep ≤ 2: hotter red goes orange under ACES).
 *   fill       brightness of the soft sheet between the edges (0 = only laser lines).
 *   edge       brightness of the ~1.5 px hot laser lines on the fan's edges (screen-space thin at any distance).
 *   lead       −1..1 sweep direction. 0 = both edges hot, symmetric fill. ±1 = only the LEADING edge (toward ±X
 *              rotation) is hot and the fill fades into a trail behind it (radar-like). Set lead = sign(dAngle/dt).
 *   falloff    exponent of the fade along the radius.     time   seconds; drives faint raster streaks in the sheet.
 *   ground / groundFade  world floor height (default 0) and the fade (m, default 0.3) so the sheet dissolves into the
 *              floor instead of a hard cut (groundFade 0 = off).
 *
 * <ScanLine> — a hot red line sliding across a wall/plane surface (a scan passing over a facade, a door, a bed).
 *   A decal plane facing +Z, ORIGIN AT ITS CENTRE; place it 1–2 cm in front of the surface (or rotate it onto the floor).
 *
 *   <ScanLine width?={4} height?={3} progress?={0.5} axis?={'x'} color?={S.authRed} intensity?={1.6}
 *             thickness?={0.015} glow?={0.25} trail?={0.6} direction?={1} {...group}/>
 *
 *   progress   0..1 position of the line across the plane (animate it).
 *   axis       'x' = a VERTICAL line moving horizontally; 'y' = a HORIZONTAL line moving vertically.
 *   thickness  hot core half-width (m)   glow  soft halo width (m)   trail  fading wash behind the line (m)
 *   direction  +1 = moving toward +axis (trail on the − side), −1 = the reverse.
 *
 * Usage
 *   <ScannerSweep position={[0, 7, -1]} angle={Math.sin(t * 0.9) * 0.5} lead={Math.sign(Math.cos(t * 0.9))} time={t}/>
 *   <ScanLine position={[0, 2, -3.98]} width={8} height={4} progress={(t * 0.25) % 1}/>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {atmosNoise, GroupProps, V3} from './shared';

// ------------------------------------------------------------------------------------------------ ScannerSweep
export type ScannerSweepProps = GroupProps & {
  origin?: V3;
  angle?: number;
  span?: number;
  length?: number;
  color?: string;
  intensity?: number;
  fill?: number;
  edge?: number;
  lead?: number;
  falloff?: number;
  time?: number;
  ground?: number;
  groundFade?: number;
  renderOrder?: number;
};

const EXT = 1.3; // geometry extends 15 % of the span beyond each edge for the laser glow

const FAN_VERT = /* glsl */ `
uniform float uAngle, uSpan, uLength;
varying float vA;
varying float vR;
varying vec3 vN;
varying vec3 vV;
varying float vWY;
void main() {
  float a = position.x * ${EXT.toFixed(2)};
  float r = position.y + 0.5;
  float ang = uAngle + a * uSpan;
  vec3 p = vec3(sin(ang), -cos(ang), 0.0) * r * uLength;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
  vV = -mv.xyz;
  vWY = (modelMatrix * vec4(p, 1.0)).y;
  vA = a;
  vR = r;
  gl_Position = projectionMatrix * mv;
}`;

const FAN_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFill, uEdge, uLead, uFalloff, uTime, uSpan, uLength, uGround, uGroundFade;
uniform sampler2D uNoise;
varying float vA;
varying float vR;
varying vec3 vN;
varying vec3 vV;
varying float vWY;
void main() {
  float ea = abs(vA);
  float soft = 0.08;
  float inside = 1.0 - smoothstep(0.5 - soft, 0.5, ea);
  float ld = sign(uLead);
  float trail = 0.15 + 0.85 * pow(clamp(vA * ld + 0.5, 0.0, 1.0), 1.2);
  float leadK = mix(1.0, trail, abs(uLead));
  float rad = smoothstep(0.0, 0.03, vR) * pow(1.0 - vR, uFalloff);
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float sheet = mix(1.0, 1.0 / max(facing, 0.3), 0.5);
  float st = texture2D(uNoise, vec2(vA * uSpan * 6.0, vR * uLength * 0.08 - uTime * 0.15)).g;
  float fill = inside * leadK * rad * sheet * (0.7 + 0.6 * st) * uFill * 1.4;
  // laser edge(s): ~1.5 px hot core + soft halo, screen-space constant width
  float fw = fwidth(vA) + 1e-5;
  float dEdge = abs(ea - 0.5);
  float dLead = abs(vA * ld - 0.5);
  float dl = mix(dEdge, dLead, step(0.5, abs(uLead))) / fw;
  float line = exp(-dl * dl * 0.35) + exp(-dl * 0.22) * 0.18;
  float lineRad = smoothstep(0.0, 0.015, vR) * pow(1.0 - vR, uFalloff * 0.55);
  float gf = uGroundFade > 0.0 ? smoothstep(uGround, uGround + uGroundFade, vWY) : 1.0;
  vec3 col = uColor * (fill * gf + line * lineRad * uEdge * 1.4 * mix(1.0, gf, 0.6));
  gl_FragColor = vec4(col, 1.0);
}`;

const FAN_GEO = new THREE.PlaneGeometry(1, 1, 64, 12);

export const ScannerSweep: React.FC<ScannerSweepProps> = ({
  origin = [0, 6, 0], angle = 0, span = 0.5, length = 8, color = S.authRed, intensity = 1.4, fill = 0.7, edge = 1, lead = 0,
  falloff = 0.7, time = 0, ground = 0, groundFade = 0.3, renderOrder = 4, ...group
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uAngle: {value: 0}, uSpan: {value: 0.5}, uLength: {value: 8}, uColor: {value: new THREE.Color()}, uFill: {value: 0.35},
          uEdge: {value: 1}, uLead: {value: 0}, uFalloff: {value: 1.1}, uTime: {value: 0}, uNoise: {value: atmosNoise(1)},
          uGround: {value: 0}, uGroundFade: {value: 0.3},
        },
        vertexShader: FAN_VERT,
        fragmentShader: FAN_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uAngle.value = angle;
    u.uSpan.value = span;
    u.uLength.value = length;
    u.uColor.value.set(color).multiplyScalar(intensity);
    u.uFill.value = fill;
    u.uEdge.value = edge;
    u.uLead.value = Math.max(-1, Math.min(1, lead));
    u.uFalloff.value = falloff;
    u.uTime.value = time;
    u.uGround.value = ground;
    u.uGroundFade.value = groundFade;
  });
  return (
    <group {...group}>
      <group position={origin}>
        <mesh geometry={FAN_GEO} material={mat} renderOrder={renderOrder} frustumCulled={false} visible={intensity > 0} />
      </group>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ ScanLine
export type ScanLineProps = GroupProps & {
  width?: number;
  height?: number;
  progress?: number;
  axis?: 'x' | 'y';
  color?: string;
  intensity?: number;
  thickness?: number;
  glow?: number;
  trail?: number;
  direction?: 1 | -1;
  renderOrder?: number;
};

const LINE_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const LINE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uSize;
uniform float uProg, uAxis, uThick, uGlow, uTrail, uDir;
varying vec2 vUv;
void main() {
  float u = mix(vUv.x, vUv.y, uAxis);
  float v = mix(vUv.y, vUv.x, uAxis);
  float ext = mix(uSize.x, uSize.y, uAxis);
  float crossExt = mix(uSize.y, uSize.x, uAxis);
  float d = (u - uProg) * ext * uDir;            // metres ahead (+) / behind (−) the line
  float fw = fwidth(d) + 1e-5;
  float th = max(uThick, fw * 0.8);
  float core = exp(-(d * d) / (th * th)) * (uThick / th);
  float glow = exp(-abs(d) / max(uGlow, 1e-3)) * 0.3;
  float trail = d < 0.0 ? exp(d / max(uTrail, 1e-3)) * 0.22 : 0.0;
  float ends = smoothstep(0.0, 0.04 * crossExt / max(crossExt, 1e-3) + 0.01, v) * smoothstep(1.0, 0.96, v);
  vec3 col = uColor * (core * 1.6 + glow + trail) * ends;
  gl_FragColor = vec4(col, 1.0);
}`;

const UNIT = new THREE.PlaneGeometry(1, 1);

export const ScanLine: React.FC<ScanLineProps> = ({
  width = 4, height = 3, progress = 0.5, axis = 'x', color = S.authRed, intensity = 1.6, thickness = 0.015, glow = 0.25, trail = 0.6,
  direction = 1, renderOrder = 3, ...group
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: {value: new THREE.Color()}, uSize: {value: new THREE.Vector2()}, uProg: {value: 0.5}, uAxis: {value: 0}, uThick: {value: 0.015},
          uGlow: {value: 0.25}, uTrail: {value: 0.6}, uDir: {value: 1},
        },
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(color).multiplyScalar(intensity);
    u.uSize.value.set(width, height);
    u.uProg.value = progress;
    u.uAxis.value = axis === 'y' ? 1 : 0;
    u.uThick.value = thickness;
    u.uGlow.value = glow;
    u.uTrail.value = trail;
    u.uDir.value = direction;
  });
  return (
    <group {...group}>
      <mesh geometry={UNIT} material={mat} scale={[width, height, 1]} renderOrder={renderOrder} visible={intensity > 0} />
    </group>
  );
};
