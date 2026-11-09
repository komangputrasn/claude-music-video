/**
 * The pillow as a floating "character" for Hold: the same puffy white SOMNIA+ smart pillow as the bedroom (lib Pillow
 * geometry recipe), stood upright so its glowing aqua speaker grille faces the camera like a face, softly self-lit so it
 * reads WHITE in the dark (the lib one turns into an aqua slab under a single aqua light), the grille waveform is its
 * "mouth" while it talks. Local frame: grille faces +Z, origin at the pillow centre.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TOON_GRADIENT, outlineMat} from '../../lib/characters/toon';
import {noise1} from '../../lib/time';
import {C, FONTS} from '../../lib/palette';

const W = 0.64, H = 0.17, D = 0.42;

let GEO: THREE.BufferGeometry | null = null;
/** puffy pillow (lib recipe), rotated so its top face (the grille side) points +Z */
const pillowGeo = () => {
  if (GEO) return GEO;
  let g: THREE.BufferGeometry = new THREE.BoxGeometry(W, H, D, 14, 3, 10);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = x / (W / 2), nz = z / (D / 2);
    const puff = (1 - Math.pow(Math.abs(nx), 3)) * (1 - Math.pow(Math.abs(nz), 3));
    const ny = y / (H / 2);
    p.setY(i, y * (0.3 + 0.7 * puff));
    const pinch = 1 - 0.06 * (1 - Math.abs(ny));
    p.setX(i, x * (1 - 0.05 * nz * nz) * pinch);
    p.setZ(i, z * (1 - 0.07 * nx * nx) * pinch);
  }
  g.rotateX(Math.PI / 2); // +Y (top) -> +Z (front)
  g.computeVertexNormals();
  GEO = g;
  return g;
};

const rrect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const HoldPillow: React.FC<{
  /** 0..1 how lit the pillow is (fades in with the voice) */
  on: number;
  /** 0..1 speaking amplitude */
  talk: number;
  frame: number;
} & Omit<React.ComponentProps<'group'>, 'children'>> = ({on, talk, frame, ...group}) => {
  const geo = pillowGeo();
  const body = useMemo(
    () => new THREE.MeshToonMaterial({color: '#eef3ff', gradientMap: TOON_GRADIENT, emissive: new THREE.Color('#9fe6ff'), emissiveIntensity: 0}),
    [],
  );
  const {canvas, ctx, tex} = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 240;
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return {canvas: cv, ctx: cv.getContext('2d')!, tex: t};
  }, []);
  const grille = useMemo(() => new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false, depthWrite: false}), [tex]);
  const tk = Math.max(0, Math.min(1, talk));
  const key = tk > 0.001 ? `${tk.toFixed(3)}|${frame}` : 'idle';
  useLayoutEffect(() => {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    rrect(ctx, 6, 6, w - 12, h - 12, 80);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(10,80,120,0.95)');
    bg.addColorStop(1, 'rgba(4,40,70,0.95)');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#8ff0ff';
    ctx.stroke();
    // speaker dots
    ctx.fillStyle = 'rgba(25,198,255,0.45)';
    for (let y = 36; y < h - 28; y += 22) for (let x = 52; x < w - 40; x += 22) {
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // the voice: a mirrored waveform
    const n = 19;
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) / ((n - 1) / 2);
      const env = 1 - u * u * 0.7;
      const a = tk > 0.001 ? tk * env * (0.2 + 0.8 * Math.abs(noise1(frame * 0.42 + i * 1.7, 7))) : 0;
      const bh = 12 + a * (h - 70);
      const x = w / 2 + u * (w / 2 - 70);
      ctx.fillStyle = a > 0.3 ? '#f2fdff' : '#8ff0ff';
      ctx.shadowColor = '#19c6ff';
      ctx.shadowBlur = 18;
      rrect(ctx, x - 8, h / 2 - bh / 2, 16, bh, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // little brand tag
    ctx.font = `italic bold 22px ${FONTS.web}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(191,243,255,0.75)';
    ctx.fillText('SOMNIA+', w - 46, h - 22);
    tex.needsUpdate = true;
  }, [key, canvas, ctx, tex, frame, tk]);
  useLayoutEffect(() => {
    body.emissiveIntensity = 0.06 + 0.16 * on;
    grille.color.setScalar(0.25 + 0.95 * on + 0.25 * tk);
    grille.opacity = Math.min(1, 0.3 + on);
  });
  useLayoutEffect(() => () => {
    body.dispose();
    grille.dispose();
    tex.dispose();
  }, [body, grille, tex]);
  const pulse = tk * (0.5 + 0.5 * Math.sin(frame * 0.9));
  const s = 1 + 0.03 * pulse;
  return (
    <group {...group}>
      <group scale={[s, s * (1 + 0.04 * pulse), 1 + 0.06 * pulse]}>
        <mesh geometry={geo} material={body} />
        <mesh geometry={geo} material={outlineMat(0.011)} />
        <mesh position={[0, 0, H / 2 + 0.006]} rotation={[-0.04, 0, 0]}>
          <planeGeometry args={[0.42, 0.197]} />
          <primitive object={grille} attach="material" />
        </mesh>
      </group>
    </group>
  );
};

export const PILLOW_COLOR = C.aqua;
