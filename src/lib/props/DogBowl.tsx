/**
 * DogBowl — simple glazed ceramic dog bowl: cobalt-blue outside, cream inside and rim, "PANCAKE" hand-painted on the front
 * with paw prints and a bone on the back. Optional kibble inside.
 *
 * <DogBowl fill? color? name? {...groupProps}/>
 *   fill   0..1 kibble level (0 = empty, 1 = heaped). default 0
 *   color  outer glaze (default '#2F63D8')
 *   name   painted name (default 'PANCAKE')
 * Origin: base centre on the floor; the name faces +Z. Ø 0.25 m × 0.071 m.
 * DOGBOWL: {radius, height, innerRadius, floorY} — floorY is the inside bottom (where food sits).
 *
 * Example:
 *   <DogBowl position={[0.3, 0, 0.4]} fill={1 - ramp(f, 0, 90)} />
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C, FONTS} from '../palette';
import {rand} from '../time';
import {GroupProps, Ink, PROP_INK, clamp01, glossMat, makeGlossMat, useCanvasTexture} from './Padlock';
import {KibblePile} from './Kibble';

const R = 0.125, HGT = 0.071, R_IN = 0.094, FLOOR = 0.016;
export const DOGBOWL = {radius: R, height: HGT, innerRadius: R_IN, floorY: FLOOR};

const OUTER: [number, number][] = [
  [0.0, 0.0], [0.116, 0.0], [0.123, 0.003], [0.125, 0.01], [0.119, 0.035], [0.113, 0.06], [0.111, 0.066], [0.106, 0.0712],
];
const INNER: [number, number][] = [
  [0.106, 0.0712], [0.1, 0.0722], [0.0955, 0.069], [0.091, 0.05], [0.086, 0.025], [0.079, 0.0175], [0.04, 0.016], [0.0, 0.016],
];

// outer wall radius at height y (for the painted band)
const outerR = (y: number) => {
  for (let i = 0; i < OUTER.length - 1; i++) {
    const [r0, y0] = OUTER[i], [r1, y1] = OUTER[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
  }
  return OUTER[OUTER.length - 1][0];
};
const BAND_Y0 = 0.017, BAND_Y1 = 0.058;

const drawBand = (ctx: CanvasRenderingContext2D, w: number, h: number, name: string) => {
  ctx.clearRect(0, 0, w, h);
  const cream = '#FFF1D2';
  // stripes top & bottom
  ctx.fillStyle = cream;
  ctx.fillRect(0, 3, w, 4);
  ctx.fillRect(0, h - 7, w, 4);
  // name (centre = +Z), hand-painted wobble
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${h * 0.62}px "Marker Felt", "Chalkboard SE", ${FONTS.comic}`;
  const letters = name.split('');
  const widths = letters.map((l) => ctx.measureText(l).width * 1.12);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = w / 2 - total / 2;
  letters.forEach((l, i) => {
    const cx = x + widths[i] / 2;
    ctx.save();
    ctx.translate(cx, h * 0.53 + (rand(`by${i}`) - 0.5) * 6);
    ctx.rotate((rand(`br${i}`) - 0.5) * 0.18);
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(15,30,90,0.55)';
    ctx.strokeText(l, 2, 3);
    ctx.fillStyle = i % 2 ? '#FFD36B' : cream;
    ctx.fillText(l, 0, 0);
    ctx.restore();
    x += widths[i];
  });
  // paw prints either side of the name
  const paw = (px: number, py: number, s: number, rot: number) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.3, s * 0.55, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [tx, ty] of [[-0.55, -0.25], [-0.2, -0.6], [0.2, -0.6], [0.55, -0.25]]) {
      ctx.beginPath();
      ctx.ellipse(tx * s, ty * s, s * 0.18, s * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  const pad = total / 2 + h * 0.55;
  paw(w / 2 - pad, h * 0.5, h * 0.3, -0.3);
  paw(w / 2 + pad, h * 0.5, h * 0.3, 0.3);
  paw(w / 2 - pad - h * 0.9, h * 0.58, h * 0.24, -0.5);
  paw(w / 2 + pad + h * 0.9, h * 0.58, h * 0.24, 0.5);
  // bone on the back (texture seam = back of the bowl)
  const bone = (bx: number) => {
    ctx.save();
    ctx.translate(bx, h * 0.52);
    ctx.fillStyle = cream;
    ctx.fillRect(-h * 0.5, -h * 0.1, h, h * 0.2);
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx * h * 0.5, sy * h * 0.12, h * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.restore();
  };
  bone(h * 0.8);
  bone(w - h * 0.8);
  // little hearts sprinkled
  ctx.fillStyle = C.bubblegum;
  for (const hx of [0.3, 0.7]) {
    const px = w * hx, py = h * 0.5, s = h * 0.13;
    ctx.beginPath();
    ctx.moveTo(px, py + s);
    ctx.bezierCurveTo(px - s * 1.6, py - s * 0.2, px - s * 0.6, py - s * 1.3, px, py - s * 0.4);
    ctx.bezierCurveTo(px + s * 0.6, py - s * 1.3, px + s * 1.6, py - s * 0.2, px, py + s);
    ctx.fill();
  }
};

let dGeo: null | Record<string, THREE.BufferGeometry> = null;
const bowlGeo = () => {
  if (dGeo) return dGeo;
  const outer = new THREE.LatheGeometry(OUTER.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const inner = new THREE.LatheGeometry(INNER.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const band = new THREE.CylinderGeometry(outerR(BAND_Y1) + 0.0007, outerR(BAND_Y0) + 0.0007, BAND_Y1 - BAND_Y0, 64, 1, true, Math.PI, Math.PI * 2);
  dGeo = {outer, inner, band};
  return dGeo;
};

export type DogBowlProps = GroupProps & {
  fill?: number;
  color?: string;
  name?: string;
  outline?: number;
};

export const DogBowl: React.FC<DogBowlProps> = ({fill = 0, color = '#2F63D8', name = 'PANCAKE', outline = PROP_INK.thick * 0.8, ...rest}) => {
  const g = bowlGeo();
  const bandTex = useCanvasTexture(2048, 112, (ctx, w, h) => drawBand(ctx, w, h, name), [name]);
  const bandMat = useMemo(() => makeGlossMat('#ffffff', {map: bandTex, transparent: true, spec: 0.5, edge: 0.95, depthWrite: false, polygonOffset: 2}), [bandTex]);
  const glaze = glossMat(color, {spec: 0.45, edge: 0.965, rim: 0.08});
  const creamGlaze = glossMat('#F2E6CC', {spec: 0.3, edge: 0.975, side: THREE.DoubleSide});
  const f = clamp01(fill);
  return (
    <group {...rest}>
      <Ink geometry={g.outer} material={glaze} outline={outline} />
      <mesh geometry={g.inner} material={creamGlaze} />
      <mesh geometry={g.band} material={bandMat} position={[0, (BAND_Y0 + BAND_Y1) / 2, 0]} />
      {f > 0.01 ? (
        <KibblePile count={Math.round(22 + 120 * f)} radius={0.082} height={0.008 + 0.055 * f} seed={11} position={[0, FLOOR, 0]} />
      ) : null}
    </group>
  );
};

export default DogBowl;
