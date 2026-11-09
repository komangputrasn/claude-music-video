/**
 * FoodBag — "CRUNCH-O's" dog-food bag: puffy pillow-shaped bag with a crimped top seal and loud Y2K packaging
 * (sunburst, chunky yellow logo, a cartoon golden pup, "NEW! BACON BITS!" starburst, lime "100% REAL CRUNCH" ribbon).
 * All artwork is drawn procedurally on canvases with system fonts — an invented brand.
 *
 * <FoodBag {...groupProps}/>   (no animation props; spin/carry it via the group transform)
 * Origin: base centre on the floor, front faces +Z. Size ≈ 0.30 × 0.47 × 0.13 m.
 * FOODBAG: {size, frontCenter, sealY, carryPoint} — carryPoint is a good hand position on the top seal.
 *
 * Example (hero spin):
 *   <FoodBag position={[0, 1, 0]} rotation={[0.1, f * 0.06, 0]} scale={1.4} />
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C, FONTS} from '../palette';
import {rand} from '../time';
import {GroupProps, Ink, PROP_INK, makeGlossMat, useCanvasTexture} from './Padlock';

const W = 0.3, H = 0.44, DP = 0.13, SEAL_H = 0.032;

export const FOODBAG = {
  size: [W, H + SEAL_H, DP] as [number, number, number],
  frontCenter: [0, H / 2, DP / 2 + 0.01] as [number, number, number],
  sealY: H + SEAL_H / 2,
  carryPoint: [0, H + SEAL_H * 0.5, 0] as [number, number, number],
};

// ------------------------------------------------------------------------------------------------- artwork
const star = (ctx: CanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, n: number, rot = 0) => {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r1 : r0;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
};

const kibbleBlob = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) => {
  ctx.fillStyle = ['#8A4A1F', '#A35A26', '#6E3815'][seed % 3];
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.72, rand(`kbr${seed}`) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,170,0.6)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.25, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fill();
};

/** Cartoon golden pup (Pancake-ish) centred at (x, y), head radius r. */
const drawPup = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  const gold = C.pancakeGold, dark = '#C98A3A', cream = C.pancakeCream, line = '#3A1E0A';
  ctx.lineWidth = r * 0.06;
  ctx.strokeStyle = line;
  // ears (behind)
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(x + s * r * 0.82, y - r * 0.15);
    ctx.rotate(s * 0.35);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.35, r * 0.34, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // head
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // muzzle
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.38, r * 0.55, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // tongue
  ctx.fillStyle = '#FF6F91';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.08, y + r * 0.78, r * 0.17, r * 0.24, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.56, r * 0.4, r * 0.18, 0, 0, Math.PI);
  ctx.fill();
  // smile
  ctx.beginPath();
  ctx.moveTo(x - r * 0.32, y + r * 0.52);
  ctx.quadraticCurveTo(x - r * 0.15, y + r * 0.68, x, y + r * 0.5);
  ctx.quadraticCurveTo(x + r * 0.15, y + r * 0.68, x + r * 0.32, y + r * 0.52);
  ctx.stroke();
  // nose
  ctx.fillStyle = '#1C120C';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.26, r * 0.17, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.05, y + r * 0.22, r * 0.05, r * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  for (const s of [-1, 1]) {
    const ex = x + s * r * 0.36, ey = y - r * 0.12;
    ctx.fillStyle = '#1C120C';
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.16, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex - r * 0.05, ey - r * 0.08, r * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + r * 0.05, ey + r * 0.06, r * 0.03, 0, Math.PI * 2);
    ctx.fill();
    // brows
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.14, ey - r * 0.33);
    ctx.quadraticCurveTo(ex, ey - r * 0.42, ex + r * 0.14, ey - r * 0.33);
    ctx.stroke();
  }
  // collar + bone tag
  ctx.fillStyle = C.alertRed;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.95, r * 0.7, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFD84A';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.12, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const drawFront = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // sunburst background
  const cx = w / 2, cy = h * 0.6;
  const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, h * 0.75);
  bg.addColorStop(0, '#4FB3FF');
  bg.addColorStop(0.5, C.y2kBlue);
  bg.addColorStop(1, '#0A2C9E');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 18; i++) {
    const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 30;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * h, cy + Math.sin(a0) * h);
    ctx.lineTo(cx + Math.cos(a1) * h, cy + Math.sin(a1) * h);
    ctx.closePath();
    ctx.fill();
  }
  // white swoosh
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-20, h * 0.42);
  ctx.quadraticCurveTo(w * 0.5, h * 0.3, w + 20, h * 0.4);
  ctx.stroke();
  // top band
  ctx.fillStyle = C.alertRed;
  ctx.fillRect(0, 0, w, h * 0.13);
  ctx.fillStyle = '#FFE14A';
  ctx.font = `bold ${h * 0.034}px ${FONTS.heavy}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PREMIUM  DOG  FOOD', w / 2, h * 0.085);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${h * 0.018}px ${FONTS.verdana}`;
  ctx.fillText('★ NOW WITH 0% SUBSCRIPTION ★', w / 2, h * 0.037);
  // logo
  ctx.save();
  ctx.translate(w / 2, h * 0.225);
  ctx.rotate(-0.07);
  // fit the logo to ~88% of the bag width
  ctx.font = `${h * 0.1}px ${FONTS.heavy}`;
  const lw = ctx.measureText("CRUNCH-O's").width;
  const fs = Math.min(h * 0.1, (h * 0.1 * w * 0.86) / lw);
  ctx.font = `${fs}px ${FONTS.heavy}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = fs * 0.26;
  ctx.strokeStyle = '#fff';
  ctx.strokeText("CRUNCH-O's", 0, 0);
  ctx.lineWidth = fs * 0.14;
  ctx.strokeStyle = '#B3140E';
  ctx.strokeText("CRUNCH-O's", 0, 0);
  const lg = ctx.createLinearGradient(0, -fs * 0.5, 0, fs * 0.5);
  lg.addColorStop(0, '#FFF6A0');
  lg.addColorStop(0.5, '#FFD21E');
  lg.addColorStop(1, '#FF8A1E');
  ctx.fillStyle = lg;
  ctx.fillText("CRUNCH-O's", 0, 0);
  ctx.restore();
  // pup
  drawPup(ctx, w / 2, h * 0.56, w * 0.21);
  // starburst
  ctx.save();
  ctx.translate(w * 0.8, h * 0.4);
  ctx.rotate(0.2);
  ctx.fillStyle = '#FFE14A';
  star(ctx, 0, 0, w * 0.15, w * 0.11, 14);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#B3140E';
  ctx.stroke();
  ctx.fillStyle = '#D0140E';
  ctx.font = `bold ${w * 0.05}px ${FONTS.heavy}`;
  ctx.fillText('NEW!', 0, -w * 0.035);
  ctx.font = `bold ${w * 0.034}px ${FONTS.heavy}`;
  ctx.fillText('BACON', 0, w * 0.012);
  ctx.fillText('BITS!', 0, w * 0.05);
  ctx.restore();
  // "ADULT" badge
  ctx.save();
  ctx.translate(w * 0.17, h * 0.42);
  ctx.fillStyle = C.bubblegum;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${w * 0.034}px ${FONTS.heavy}`;
  ctx.fillText('ADULT', 0, -w * 0.012);
  ctx.font = `bold ${w * 0.024}px ${FONTS.verdana}`;
  ctx.fillText('ALL SIZES', 0, w * 0.025);
  ctx.restore();
  // kibble pile illustration
  for (let i = 0; i < 26; i++) {
    const a = rand(`fk${i}`) * Math.PI, rr = rand(`fkr${i}`);
    kibbleBlob(ctx, w / 2 + Math.cos(a) * w * 0.38 * rr * 1.3, h * 0.82 - Math.sin(a) * h * 0.05 * rr, w * 0.028, i);
  }
  // ribbon
  ctx.fillStyle = C.lime;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.82);
  ctx.lineTo(w, h * 0.79);
  ctx.lineTo(w, h * 0.875);
  ctx.lineTo(0, h * 0.905);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0B3A12';
  ctx.save();
  ctx.translate(w / 2, h * 0.848);
  ctx.rotate(-0.035);
  ctx.font = `bold ${h * 0.04}px ${FONTS.heavy}`;
  ctx.fillText('100% REAL CRUNCH!', 0, 0);
  ctx.restore();
  // bottom band
  ctx.fillStyle = '#081E6E';
  ctx.fillRect(0, h * 0.905, w, h * 0.095);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${h * 0.026}px ${FONTS.verdana}`;
  ctx.fillText('NET WT 15 LB (6.8 kg)', w / 2, h * 0.95);
  // sparkles
  ctx.fillStyle = '#fff';
  for (const [sx, sy, sr] of [[0.1, 0.3, 14], [0.9, 0.23, 10], [0.12, 0.68, 9], [0.88, 0.65, 12]] as [number, number, number][]) {
    star(ctx, w * sx, h * sy, sr, sr * 0.22, 4);
    ctx.fill();
  }
};

const drawBack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#3D7BFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.alertRed;
  ctx.fillRect(0, 0, w, h * 0.13);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFE14A';
  ctx.font = `${h * 0.06}px ${FONTS.heavy}`;
  ctx.fillText("CRUNCH-O's", w / 2, h * 0.075);
  // feeding guide panel
  ctx.fillStyle = '#fff';
  ctx.fillRect(w * 0.08, h * 0.18, w * 0.84, h * 0.4);
  ctx.fillStyle = '#081E6E';
  ctx.font = `bold ${h * 0.03}px ${FONTS.verdana}`;
  ctx.fillText('FEEDING GUIDE', w / 2, h * 0.215);
  ctx.font = `${h * 0.022}px ${FONTS.verdana}`;
  const rows = [['DOG WEIGHT', 'CUPS / DAY'], ['5-15 lb', '1 - 1½'], ['15-30 lb', '1½ - 2½'], ['30-50 lb', '2½ - 3½'], ['PANCAKE', 'MORE PLEASE']];
  rows.forEach(([a, b], i) => {
    ctx.fillText(a, w * 0.3, h * 0.27 + i * h * 0.06);
    ctx.fillText(b, w * 0.7, h * 0.27 + i * h * 0.06);
    ctx.fillRect(w * 0.1, h * 0.295 + i * h * 0.06, w * 0.8, 1.5);
  });
  // small pup
  drawPup(ctx, w * 0.25, h * 0.72, w * 0.1);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${h * 0.024}px ${FONTS.comic}`;
  ctx.textAlign = 'left';
  ctx.fillText('No app required.', w * 0.42, h * 0.68);
  ctx.fillText('No login. No lid lock.', w * 0.42, h * 0.72);
  ctx.fillText('Just food. Woof!', w * 0.42, h * 0.76);
  // barcode
  ctx.fillStyle = '#fff';
  ctx.fillRect(w * 0.55, h * 0.84, w * 0.36, h * 0.11);
  ctx.fillStyle = '#000';
  for (let i = 0; i < 36; i++) if (rand(`fbc${i}`) > 0.35) ctx.fillRect(w * 0.57 + i * w * 0.009, h * 0.85, w * 0.006, h * 0.075);
  ctx.fillStyle = '#fff';
  ctx.font = `${h * 0.018}px ${FONTS.verdana}`;
  ctx.fillText('Made in Kibbletown, USA', w * 0.06, h * 0.9);
};

const drawSide = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#1E5BFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = -4; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 70);
    ctx.lineTo(w, i * 70 - 60);
    ctx.lineTo(w, i * 70 - 30);
    ctx.lineTo(0, i * 70 + 30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = C.alertRed;
  ctx.fillRect(0, 0, w, h * 0.13);
  ctx.save();
  ctx.translate(w / 2, h * 0.55);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#FFE14A';
  ctx.font = `${w * 0.36}px ${FONTS.heavy}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("CRUNCH-O's", 0, 0);
  ctx.restore();
};

const drawSeal = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = C.alertRed;
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 6) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, 0, 2, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 3, 0, 1, h);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(0, h * 0.78, w, 2);
};

// ------------------------------------------------------------------------------------------------- geometry
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
let bagGeo: null | {body: THREE.BufferGeometry; seal: THREE.BufferGeometry} = null;
const foodBagGeo = () => {
  if (bagGeo) return bagGeo;
  const g = new THREE.BoxGeometry(W, H, DP, 14, 22, 6);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z = p.getZ(i);
    const y = p.getY(i);
    const nx = (2 * x) / W, ny = (2 * y) / H;
    const top = smooth(0.45, 1.0, ny);
    let zf = (0.66 + 0.34 * (1 - nx * nx)) * (1 - 0.9 * top);
    zf += 0.22 * (1 - nx * nx) * (1 - ny * ny) * (1 - top);
    z *= zf;
    x *= 1 + 0.035 * (1 - ny * ny) - 0.02 * top;
    p.setXYZ(i, x, y + H / 2, z);
  }
  g.computeVertexNormals();
  const seal = new THREE.BoxGeometry(W * 0.99, SEAL_H, 0.012, 1, 1, 1);
  seal.translate(0, H + SEAL_H / 2 - 0.004, 0);
  bagGeo = {body: g, seal};
  return bagGeo;
};

export type FoodBagProps = GroupProps & {outline?: number};

export const FoodBag: React.FC<FoodBagProps> = ({outline = PROP_INK.thick, ...rest}) => {
  const g = foodBagGeo();
  const front = useCanvasTexture(600, 880, drawFront, []);
  const back = useCanvasTexture(600, 880, drawBack, []);
  const side = useCanvasTexture(260, 880, drawSide, []);
  const seal = useCanvasTexture(512, 48, drawSeal, []);
  const mats = useMemo(() => {
    const sideM = makeGlossMat('#ffffff', {map: side, spec: 0.14, edge: 0.985});
    const red = makeGlossMat('#D41F17', {spec: 0.06, edge: 0.99});
    const sealM = makeGlossMat('#ffffff', {map: seal, spec: 0.06, edge: 0.99});
    return {
      // +x, -x, +y, -y, +z, -z
      body: [sideM, sideM, red, makeGlossMat('#16348F', {spec: 0}), makeGlossMat('#ffffff', {map: front, spec: 0.1, edge: 0.988}), makeGlossMat('#ffffff', {map: back, spec: 0.1, edge: 0.988})],
      seal: [red, red, red, red, sealM, sealM],
    };
  }, [front, back, side, seal]);
  return (
    <group {...rest}>
      <Ink geometry={g.body} material={mats.body} outline={outline} />
      <Ink geometry={g.seal} material={mats.seal} outline={outline * 0.6} />
    </group>
  );
};

export default FoodBag;
