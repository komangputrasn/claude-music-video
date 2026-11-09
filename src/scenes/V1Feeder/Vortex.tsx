/**
 * The "OmniStore cloud" that takes the e-book back:
 *   <CloudVortex open time/>      a swirling aqua/grape whirlpool disc ringed with puffy low-poly clouds and an
 *                                 "OmniStore" cloud badge, hanging under the ceiling, facing DOWN (-Y).
 *   <LetterStream progress time from to/>   page letters + pixels peel off the e-reader and spiral up into the vortex,
 *                                 turning from e-ink black into glowing aqua as they rise (billboarded instanced glyphs).
 * Pure functions of their props (frame-driven), mutations in useLayoutEffect only.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Billboard} from '@react-three/drei';
import {rand} from '../../lib/time';
import {toonMat} from '../../lib/characters/toon';
import {FONTS} from '../../lib/palette';
import type {V3} from './common';

// ------------------------------------------------------------------------------------------------ swirl disc
const SWIRL_VERT = /* glsl */ `
varying vec2 vP;
void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SWIRL_FRAG = /* glsl */ `
uniform float uTime; uniform float uOpen; uniform float uIntensity;
varying vec2 vP;
void main() {
  float r = length(vP);
  if (r > 1.0) discard;
  float a = atan(vP.y, vP.x);
  float sw = a * 4.0 + log(max(r, 0.02)) * 7.0 + uTime * 5.0;
  float arms = 0.5 + 0.5 * sin(sw);
  arms = pow(arms, 2.2);
  float fine = 0.5 + 0.5 * sin(a * 11.0 + log(max(r, 0.02)) * 15.0 + uTime * 8.0);
  vec3 cCore = vec3(1.0, 1.0, 1.0);
  vec3 cAqua = vec3(0.10, 0.78, 1.0);
  vec3 cGrape = vec3(0.54, 0.30, 1.0);
  vec3 cPink = vec3(1.0, 0.31, 0.72);
  vec3 col = mix(cAqua, cGrape, smoothstep(0.25, 0.85, r));
  col = mix(col, cPink, 0.35 * smoothstep(0.6, 1.0, r) * fine);
  float core = smoothstep(0.32, 0.0, r);
  col = mix(col, cCore, core * 0.7);
  float edge = smoothstep(1.0, 0.72, r);
  float hole = 1.0 - 0.75 * smoothstep(0.12, 0.0, r);
  float m = (0.3 + 0.8 * arms + 0.2 * fine) * edge * hole + core * 0.9;
  gl_FragColor = vec4(col * m * uIntensity * uOpen, 1.0);
}`;

const CLOUD_N = 16;

export const CloudVortex: React.FC<{
  open: number;
  time: number;
  intensity?: number;
  radius?: number;
  /** 0..1 badge visibility */
  badge?: number;
  position?: V3;
}> = ({open, time, intensity = 0.8, radius = 1, badge = 1, position = [0, 0, 0]}) => {
  const swirl = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uTime: {value: 0}, uOpen: {value: 0}, uIntensity: {value: 1}},
        vertexShader: SWIRL_VERT,
        fragmentShader: SWIRL_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  useLayoutEffect(() => {
    swirl.uniforms.uTime.value = time;
    swirl.uniforms.uOpen.value = Math.max(0, Math.min(1, open));
    swirl.uniforms.uIntensity.value = intensity;
  });
  useLayoutEffect(() => () => swirl.dispose(), [swirl]);
  const disc = useMemo(() => new THREE.CircleGeometry(1, 64), []);
  const puff = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const puffs = useMemo(
    () =>
      Array.from({length: CLOUD_N}, (_, i) => ({
        a: (i / CLOUD_N) * Math.PI * 2 + rand(`cv-a${i}`) * 0.3,
        r: 0.92 + rand(`cv-r${i}`) * 0.22,
        s: 0.2 + rand(`cv-s${i}`) * 0.16,
        y: (rand(`cv-y${i}`) - 0.5) * 0.12,
        c: rand(`cv-c${i}`),
      })),
    [],
  );
  const matW = toonMat('#EDE9FF', {emissive: '#4b3aa8', emissiveIntensity: 0.35});
  const matL = toonMat('#B9A8FF', {emissive: '#3a2a9a', emissiveIntensity: 0.35});
  const o = Math.max(0, Math.min(1.2, open));
  const spin = time * 0.9;
  return (
    <group position={position} scale={[radius * o, radius * Math.max(0.001, o), radius * o]}>
      {/* swirl disc facing down */}
      <mesh geometry={disc} material={swirl} rotation={[Math.PI / 2, 0, 0]} />
      {/* puffy cloud rim */}
      <group rotation={[0, spin, 0]}>
        {puffs.map((p, i) => (
          <mesh key={i} geometry={puff} material={p.c > 0.45 ? matW : matL}
            position={[Math.cos(p.a) * p.r, p.y + 0.06, Math.sin(p.a) * p.r]} scale={[p.s * 1.25, p.s * 0.8, p.s]} />
        ))}
      </group>
      {badge > 0.01 ? (
        <Billboard position={[0, -0.26, 0]}>
          <OmniBadge opacity={badge} />
        </Billboard>
      ) : null}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ OmniStore badge
let badgeTex: THREE.CanvasTexture | null = null;
const getBadgeTex = () => {
  if (badgeTex) return badgeTex;
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;
  // cloud shape
  const cloud = () => {
    ctx.beginPath();
    ctx.arc(150, 150, 70, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(215, 88, 62, Math.PI, Math.PI * 1.85);
    ctx.arc(305, 80, 74, Math.PI * 1.15, Math.PI * 1.95);
    ctx.arc(372, 150, 70, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
  };
  ctx.save();
  cloud();
  const g = ctx.createLinearGradient(0, 20, 0, 230);
  g.addColorStop(0, '#6fb4ff');
  g.addColorStop(0.5, '#1E5BFF');
  g.addColorStop(1, '#0A2FA8');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(10,20,80,0.9)';
  ctx.shadowBlur = 24;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff';
  cloud();
  ctx.stroke();
  // glossy highlight
  ctx.save();
  cloud();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(262, 70, 210, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic bold 66px ${FONTS.web}`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#06164f';
  ctx.strokeText('OmniStore', 262, 150);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('OmniStore', 262, 150);
  ctx.font = `bold 22px ${FONTS.ui}`;
  ctx.fillStyle = '#9BFF3A';
  ctx.fillText('CLOUD LIBRARY™', 262, 196);
  badgeTex = new THREE.CanvasTexture(cv);
  badgeTex.colorSpace = THREE.SRGBColorSpace;
  return badgeTex;
};

const OmniBadge: React.FC<{opacity: number}> = ({opacity}) => {
  const tex = getBadgeTex();
  return (
    <mesh>
      <planeGeometry args={[1.0, 0.5]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ------------------------------------------------------------------------------------------------ letter stream
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz.,'; // 64 cells (last = solid square override)
const GRID = 8;
let atlasTex: THREE.CanvasTexture | null = null;
const getAtlas = () => {
  if (atlasTex) return atlasTex;
  const cv = document.createElement('canvas');
  const cell = 64;
  cv.width = cv.height = cell * GRID;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 50px ${FONTS.serif}`;
  for (let i = 0; i < GRID * GRID; i++) {
    const cx = (i % GRID) * cell + cell / 2, cy = Math.floor(i / GRID) * cell + cell / 2;
    if (i === GRID * GRID - 1) ctx.fillRect(cx - 20, cy - 20, 40, 40);
    else ctx.fillText(GLYPHS[i], cx, cy + 2);
  }
  atlasTex = new THREE.CanvasTexture(cv);
  atlasTex.generateMipmaps = true;
  atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
  return atlasTex;
};

const STREAM_VERT = /* glsl */ `
attribute float aGlyph;
attribute float aGlow;
attribute float aRot;
varying vec2 vUv;
varying float vGlow;
void main() {
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float s = length(instanceMatrix[0].xyz);
  float c = cos(aRot), sn = sin(aRot);
  vec2 p = vec2(c * position.x - sn * position.y, sn * position.x + c * position.y);
  mv.xy += p * s;
  gl_Position = projectionMatrix * mv;
  float gx = mod(aGlyph, ${GRID}.0);
  float gy = floor(aGlyph / ${GRID}.0);
  vUv = (vec2(gx, ${GRID - 1}.0 - gy) + uv) / ${GRID}.0;
  vGlow = aGlow;
}`;
const STREAM_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uOpacity;
varying vec2 vUv;
varying float vGlow;
void main() {
  float a = texture2D(uAtlas, vUv).r;
  if (a < 0.04) discard;
  vec3 ink = vec3(0.10, 0.10, 0.12);
  vec3 aqua = vec3(0.45, 0.9, 1.0) * 1.35;
  vec3 grape = vec3(0.8, 0.5, 1.0) * 1.3;
  vec3 glow = mix(aqua, grape, smoothstep(0.55, 1.0, vGlow));
  vec3 col = mix(ink, glow, smoothstep(0.02, 0.25, vGlow));
  gl_FragColor = vec4(col, a * uOpacity);
}`;

const SOURCE = 'WARISPEACEFREEDOMISSLAVERYIGNORANCEISSTRENGTH1984GEORGEORWELLBIGBROTHERISWATCHINGYOU';

export const LetterStream: React.FC<{
  /** 0..1 emission + travel progress (letters are born over the first ~70 %) */
  progress: number;
  time: number;
  from: V3;
  to: V3;
  count?: number;
  /** spiral radius (m) at mid-flight */
  swirl?: number;
  size?: number;
}> = ({progress, time, from, to, count = 170, swirl = 0.32, size = 0.075}) => {
  const atlas = getAtlas();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uAtlas: {value: atlas}, uOpacity: {value: 1}},
        vertexShader: STREAM_VERT,
        fragmentShader: STREAM_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [atlas],
  );
  const parts = useMemo(
    () =>
      Array.from({length: count}, (_, i) => {
        const pix = rand(`ls-px${i}`) < 0.22;
        const ch = SOURCE[i % SOURCE.length];
        const gi = pix ? GRID * GRID - 1 : Math.max(0, GLYPHS.indexOf(ch));
        return {
          glyph: gi,
          birth: (i / count) * 0.68 + rand(`ls-b${i}`) * 0.04,
          life: 0.26 + rand(`ls-l${i}`) * 0.1,
          a0: rand(`ls-a${i}`) * Math.PI * 2,
          turns: 1.2 + rand(`ls-t${i}`) * 1.0,
          r: 0.6 + rand(`ls-r${i}`) * 0.8,
          sx: (rand(`ls-sx${i}`) - 0.5) * 0.08,
          sy: (rand(`ls-sy${i}`) - 0.5) * 0.11,
          spin: (rand(`ls-sp${i}`) - 0.5) * 8,
          sz: (pix ? 0.45 : 1) * (0.7 + rand(`ls-sz${i}`) * 0.6),
        };
      }),
    [count],
  );
  const mesh = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = geo.index;
    ig.setAttribute('position', geo.getAttribute('position'));
    ig.setAttribute('uv', geo.getAttribute('uv'));
    ig.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(new Float32Array(parts.map((p) => p.glyph)), 1));
    ig.setAttribute('aGlow', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
    ig.setAttribute('aRot', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
    const m = new THREE.InstancedMesh(ig, mat, count);
    m.frustumCulled = false;
    m.renderOrder = 5;
    return m;
  }, [parts, mat, count]);
  useLayoutEffect(() => {
    const g = mesh.geometry as THREE.InstancedBufferGeometry;
    const glow = g.getAttribute('aGlow') as THREE.InstancedBufferAttribute;
    const rot = g.getAttribute('aRot') as THREE.InstancedBufferAttribute;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const F = new THREE.Vector3(...from), T = new THREE.Vector3(...to);
    const axis = T.clone().sub(F);
    const up = axis.clone().normalize();
    const side = new THREE.Vector3(1, 0, 0).cross(up).normalize();
    if (side.lengthSq() < 0.01) side.set(0, 0, 1);
    const side2 = up.clone().cross(side).normalize();
    let n = 0;
    parts.forEach((pt) => {
      const s = (progress - pt.birth) / pt.life;
      if (s <= 0 || s >= 1) return;
      // ease: slow lift off the page, accelerating into the vortex
      const e = s * s * (1.6 - 0.6 * s);
      const rr = swirl * pt.r * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.9);
      const ang = pt.a0 + pt.turns * Math.PI * 2 * e + time * 1.5;
      p.copy(F).addScaledVector(axis, e);
      p.x += pt.sx * (1 - e);
      p.y += pt.sy * (1 - e) * 0.3;
      p.z += pt.sy * (1 - e);
      p.addScaledVector(side, Math.cos(ang) * rr).addScaledVector(side2, Math.sin(ang) * rr);
      const grow = Math.min(1, s * 6) * (1 - Math.pow(Math.max(0, (s - 0.7) / 0.3), 1.5));
      sc.setScalar(size * pt.sz * (0.35 + 0.9 * grow));
      m.compose(p, q, sc);
      mesh.setMatrixAt(n, m);
      glow.setX(n, Math.min(1, s * 1.4));
      rot.setX(n, pt.spin * s + time * 0.5);
      // keep glyph attribute aligned with compacted index
      (g.getAttribute('aGlyph') as THREE.InstancedBufferAttribute).setX(n, pt.glyph);
      n++;
    });
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    glow.needsUpdate = true;
    rot.needsUpdate = true;
    (g.getAttribute('aGlyph') as THREE.InstancedBufferAttribute).needsUpdate = true;
  });
  useLayoutEffect(() => () => {
    mesh.geometry.dispose();
    mat.dispose();
  }, [mesh, mat]);
  return <primitive object={mesh} />;
};
