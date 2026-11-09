/**
 * Price tags & "RENTED" stickers for the "can't own anything" reveal.
 *   <PriceTag lines={['RENTED', '$399/mo']} width={1.6} pop={0..1} swing={time} anchor="top" color? ink? />
 *       classic notched paper tag (manila, red border, punched hole + string) hanging from its group origin (the string
 *       top). Faces +Z. pop 0..1 scales it in with overshoot; it swings like a pendulum after landing.
 *   <Sticker text="RENTED" size={1} pop color? />  round starburst decal facing +Z (put it 1 cm in front of a surface).
 * Textures are cached per text (canvas, system fonts).
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {FONTS, C} from '../../lib/palette';

type GroupProps = Omit<ThreeElements['group'], 'children'>;

const texCache = new Map<string, THREE.CanvasTexture>();

const TAG_W = 640, TAG_H = 300;
const tagTexture = (lines: string[], color: string, ink: string) => {
  const key = `tag|${lines.join('|')}|${color}|${ink}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = TAG_W;
  cv.height = TAG_H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TAG_W, TAG_H);
  // paper fibre speckle
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(120,90,40,${0.03 + ((i * 37) % 11) / 200})`;
    ctx.fillRect((i * 97) % TAG_W, (i * 53) % TAG_H, 2, 2);
  }
  // inner border
  ctx.strokeStyle = ink;
  ctx.lineWidth = 10;
  ctx.strokeRect(118, 18, TAG_W - 140, TAG_H - 36);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = 118 + (TAG_W - 140) / 2;
  if (lines.length === 1) {
    ctx.font = `bold 120px ${FONTS.impact}`;
    ctx.fillStyle = ink;
    ctx.fillText(lines[0], cx, TAG_H / 2 + 6, TAG_W - 170);
  } else {
    ctx.font = `bold 94px ${FONTS.impact}`;
    ctx.fillStyle = ink;
    ctx.fillText(lines[0], cx, TAG_H * 0.33, TAG_W - 170);
    ctx.font = `bold 84px ${FONTS.heavy}`;
    ctx.fillStyle = '#111';
    ctx.fillText(lines[1], cx, TAG_H * 0.7, TAG_W - 170);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
};

/** tag outline in unit-height coords: pointed end at -x with a hole */
const tagShape = (aspect: number) => {
  const w = aspect, h = 1;
  const s = new THREE.Shape();
  const n = 0.32; // notch length
  s.moveTo(-w / 2 + n, h / 2);
  s.lineTo(w / 2 - 0.06, h / 2);
  s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - 0.06);
  s.lineTo(w / 2, -h / 2 + 0.06);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2 - 0.06, -h / 2);
  s.lineTo(-w / 2 + n, -h / 2);
  s.lineTo(-w / 2, -h / 2 + n * 0.9);
  s.lineTo(-w / 2, h / 2 - n * 0.9);
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(-w / 2 + 0.2, 0, 0.07, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
};

const geoCache = new Map<string, {front: THREE.BufferGeometry; back: THREE.BufferGeometry}>();
const tagGeo = (aspect: number) => {
  const key = aspect.toFixed(3);
  const hit = geoCache.get(key);
  if (hit) return hit;
  const front = new THREE.ShapeGeometry(tagShape(aspect), 6);
  // uv: map shape coords to 0..1
  const pos = front.getAttribute('position') as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / aspect + 0.5;
    uv[i * 2 + 1] = pos.getY(i) + 0.5;
  }
  front.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  // slightly larger dark backing = ink outline
  const back = new THREE.ShapeGeometry(tagShape(aspect), 6);
  back.scale(1 + 0.05 / aspect, 1.05, 1);
  const r = {front, back};
  geoCache.set(key, r);
  return r;
};

export const PriceTag: React.FC<GroupProps & {
  lines: string[];
  /** world width (m) */
  width?: number;
  pop?: number;
  /** seconds since landing (drives the swing) */
  swing?: number;
  /** string length (m, in tag heights) */
  string?: number;
  color?: string;
  ink?: string;
  /** tilt of the hanging tag (rad) */
  hang?: number;
}> = ({lines, width = 1.6, pop = 1, swing = 0, string = 0.9, color = '#F6E2A6', ink = C.alertRed, hang = 0.5, ...g}) => {
  const aspect = TAG_W / TAG_H;
  const h = width / aspect;
  const tex = tagTexture(lines, color, ink);
  const geo = tagGeo(aspect);
  const mats = useMemo(
    () => ({
      front: new THREE.MeshBasicMaterial({map: tex, side: THREE.DoubleSide, toneMapped: true, color: '#e8e8e8', fog: false}),
      back: new THREE.MeshBasicMaterial({color: '#1b1030', side: THREE.DoubleSide, fog: false}),
      str: new THREE.MeshBasicMaterial({color: '#f4f0e6', fog: false}),
    }),
    [tex],
  );
  if (pop <= 0.001) return null;
  const sw = Math.sin(swing * 4.2) * 0.35 * Math.exp(-swing * 1.3) + Math.sin(swing * 1.3) * 0.04;
  const L = string * h;
  return (
    <group {...g}>
      <group scale={pop} rotation={[0, 0, sw]}>
        {/* string */}
        <mesh position={[0, -L / 2, 0]} material={mats.str}>
          <cylinderGeometry args={[h * 0.025, h * 0.025, L, 5]} />
        </mesh>
        {/* tag hangs from its hole (hole is at x = -aspect/2 + 0.2 in unit coords) */}
        <group position={[0, -L, 0]} rotation={[0, 0, -Math.PI / 2 + hang]}>
          <group scale={[h, h, h]} position={[(aspect / 2 - 0.2) * h, 0, 0]}>
            <mesh geometry={geo.back} material={mats.back} position={[0, 0, -0.004]} />
            <mesh geometry={geo.front} material={mats.front} />
          </group>
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ sticker
const stickerTexture = (text: string, color: string) => {
  const key = `st|${text}|${color}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const star = (r0: number, r1: number, n: number) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r1 : r0;
      const a = (i * Math.PI) / n - Math.PI / 2;
      const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  star(250, 205, 18);
  ctx.fillStyle = '#1b1030';
  ctx.fill();
  star(236, 192, 18);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 160, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 108px ${FONTS.impact}`;
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(-0.18);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#1b1030';
  ctx.strokeText(text, 0, 4, 330);
  ctx.fillText(text, 0, 4, 330);
  ctx.restore();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
};

export const Sticker: React.FC<GroupProps & {text?: string; size?: number; pop?: number; color?: string; spin?: number}> = ({
  text = 'RENTED', size = 1, pop = 1, color = C.alertRed, spin = 0, ...g
}) => {
  const tex = stickerTexture(text, color);
  if (pop <= 0.001) return null;
  return (
    <group {...g}>
      <mesh scale={pop} rotation={[0, 0, spin]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} color="#d6d6d6" transparent alphaTest={0.05} side={THREE.DoubleSide} depthWrite={false} polygonOffset polygonOffsetFactor={-3} />
      </mesh>
    </group>
  );
};
