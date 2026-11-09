/**
 * Feeder — "the box on the ground": chunky white "FeedMe PLUS" smart pet feeder (0.45 × 0.35 × 0.35 m) with a translucent
 * Bondi-blue hinged lid, an LCD on the front, gel buttons, and a red <Padlock> hanging on a chrome hasp.
 *
 * <Feeder lid? lidFly? lcdText? lcdColor? locked? lockOpen? lockShake? smashed? kibbleFill? time? {...groupProps}/>
 *   lid        0 closed .. 1 flung open (~112° about the back hinge). >1 over-rotates (2 ≈ hanging down the back).
 *   lidFly     0..1 the lid tears off the hinge, somersaults back and lands upside-down ~0.7 m behind (Swing scene).
 *   lcdText    LCD message (auto-wrapped to ≤3 lines, auto-sized). '\n' forces a break. default 'GOOD MORNING!'
 *   lcdColor   backlight colour (default LCD green '#9DFF5A'; dark colours like '#1E5BFF' switch to light text).
 *   locked     padlock present (default true). lockOpen 0..1 opens its shackle (use for the "clamps shut" beat: 1 → 0).
 *   lockShake  0..1 padlock swings/rattles on the hasp (driven by `time`).
 *   smashed    0..1 cracks spread, body dents/slumps, LCD glitches, plastic shards fly, padlock snaps and drops to the floor.
 *   kibbleFill 0..1 food visible inside the hopper (default 0.8).
 * Origin: base centre on the floor; front (LCD) faces +Z.
 * Anchors (FEEDER): size, bodyTop (lid seam y), hinge, lcdCenter/lcdSize, lockPivot, hopperCenter (kibble burst origin), frontZ.
 *
 * Example:
 *   <Feeder position={[0.6, 0, 0]} rotation={[0, -0.4, 0]} lcdText="BREAKFAST IS FOR PLUS MEMBERS ONLY" lockShake={beat.pulse} />
 *   <Feeder smashed={ramp(f, 10, 25)} lid={1.4 * popIn(f, 10, 8)} kibbleFill={0.3} />
 *   <KibbleBurst origin={FEEDER.hopperCenter} progress={...} />   // from './Kibble', in the same parent group
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C, FONTS} from '../palette';
import {rand} from '../time';
import {
  GroupProps, Ink, PADLOCK, PROP_INK, Padlock, candyMat, chromeMat, clamp01, easeOutCubic, flatMat, glossMat, makeGlossMat, rbox,
  rrectShape, smooth01, useCanvasTexture, usePropTime,
} from './Padlock';
import {KibblePile} from './Kibble';

const W = 0.45, D = 0.35, BODY_H = 0.25, LID_H = 0.1, BASE_H = 0.026;
const LCD_Y = 0.08, LCD_W = 0.236, LCD_H = 0.058;
const LOCK_SCALE = 1.2;
const STAPLE_Y = 0.234, STAPLE_Z = D / 2 + 0.019;
/** contact point of the shackle on the staple's lower bar (pendulum pivot) */
const PIVOT_Y = STAPLE_Y - 0.0088;
const HANG_Y = PIVOT_Y - PADLOCK.shackleInnerTop * LOCK_SCALE;
const BONDI = '#0FA3CC';

export const FEEDER = {
  size: [W, BODY_H + LID_H, D] as [number, number, number],
  /** y of the lid seam / top of the white body */
  bodyTop: BODY_H,
  /** lid hinge axis point (axis along X) */
  hinge: [0, BODY_H, -D / 2] as [number, number, number],
  lcdCenter: [0, LCD_Y, D / 2 + 0.0075] as [number, number, number],
  lcdSize: [LCD_W, LCD_H] as [number, number],
  /** where the padlock hangs (staple) */
  lockPivot: [0, PIVOT_Y, STAPLE_Z] as [number, number, number],
  /** centre of the food hopper — use as KibbleBurst origin */
  hopperCenter: [0, BODY_H + 0.04, 0] as [number, number, number],
  frontZ: D / 2,
};

// ------------------------------------------------------------------------------------------------- canvas painters
const lum = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
};

const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxW: number) => {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
};

const drawLcd = (ctx: CanvasRenderingContext2D, w: number, h: number, text: string, color: string, smashed: number, locked: boolean) => {
  const dark = lum(color) < 0.42;
  const base = new THREE.Color(color);
  // backlight
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.2, w * 0.5, h * 0.5, w * 0.6);
  g.addColorStop(0, `#${base.clone().lerp(new THREE.Color('#ffffff'), 0.25).getHexString()}`);
  g.addColorStop(1, `#${base.clone().multiplyScalar(0.72).getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // dot-matrix grid
  ctx.fillStyle = dark ? 'rgba(0,0,30,0.18)' : 'rgba(20,50,0,0.10)';
  for (let x = 0; x < w; x += 5) ctx.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += 5) ctx.fillRect(0, y, w, 1);
  const ink = dark ? '#EAF8FF' : '#10200A';
  const ghost = dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,30,0,0.07)';
  // status row
  ctx.fillStyle = ink;
  ctx.font = `bold 17px ${FONTS.lcd}`;
  ctx.textBaseline = 'top';
  ctx.fillText('FeedMe+', 14, 9);
  // wifi arcs
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(w - 120, 30, i * 6, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
  }
  // battery
  ctx.strokeRect(w - 88, 12, 30, 15);
  ctx.fillRect(w - 58, 16, 4, 7);
  ctx.fillRect(w - 85, 15, 20, 9);
  // lock glyph
  if (locked) {
    ctx.fillRect(w - 40, 19, 18, 13);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w - 31, 19, 6, Math.PI, 0);
    ctx.stroke();
  }
  // message
  const area = {x: 16, y: 38, w: w - 32, h: h - 48};
  let size = 64;
  let lines: string[] = [];
  for (; size > 18; size -= 2) {
    ctx.font = `bold ${size}px ${FONTS.lcd}`;
    lines = wrapLines(ctx, text.toUpperCase(), area.w);
    if (lines.length * size * 1.05 <= area.h && lines.length <= 3) break;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = size * 1.05;
  const y0 = area.y + area.h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => {
    const jx = smashed > 0.15 ? (rand(`lcdj${i}-${Math.round(smashed * 20)}`) - 0.5) * 30 * smashed : 0;
    ctx.fillStyle = ghost;
    ctx.fillText(ln.replace(/[^ ]/g, '█'), w / 2, y0 + i * lh);
    ctx.fillStyle = ink;
    ctx.fillText(ln, w / 2 + jx, y0 + i * lh);
  });
  ctx.textAlign = 'left';
  // glare
  const gl = ctx.createLinearGradient(0, 0, w, h);
  gl.addColorStop(0, 'rgba(255,255,255,0.0)');
  gl.addColorStop(0.18, 'rgba(255,255,255,0.22)');
  gl.addColorStop(0.3, 'rgba(255,255,255,0.0)');
  gl.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, w, h);
  // smashed: dead pixel bleed + cracks
  if (smashed > 0.12) {
    const s = clamp01((smashed - 0.12) / 0.5);
    ctx.save();
    ctx.globalAlpha = 0.9;
    const bg = ctx.createRadialGradient(w * 0.62, 0, 4, w * 0.62, 0, h * 1.6 * s);
    bg.addColorStop(0, '#05060a');
    bg.addColorStop(0.55, 'rgba(20,0,40,0.85)');
    bg.addColorStop(0.75, 'rgba(255,0,200,0.35)');
    bg.addColorStop(1, 'rgba(0,255,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    // stuck columns
    for (let i = 0; i < 7; i++) {
      if (rand(`col${i}`) > s) continue;
      ctx.fillStyle = ['#ff2fb4', '#21e6ff', '#ffffff', '#000000'][i % 4];
      ctx.fillRect(rand(`colx${i}`) * w, 0, 3 + rand(`colw${i}`) * 4, h);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      let x = w * 0.62, y = 0;
      ctx.moveTo(x, y);
      const ang = Math.PI * (0.15 + 0.7 * rand(`lc${k}`));
      const len = h * 1.8 * s * (0.5 + rand(`ll${k}`));
      for (let j = 1; j <= 6; j++) {
        x += (Math.cos(ang) * len) / 6 + (rand(`lx${k}${j}`) - 0.5) * 18;
        y += (Math.sin(ang) * len) / 6 + (rand(`ly${k}${j}`) - 0.5) * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
};

const drawFrontDecal = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // canvas covers x ∈ [-0.2, 0.2], y ∈ [BASE_H, BODY_H] of the front face; 1 m = w/0.4 px
  const ppm = w / 0.4;
  const X = (x: number) => (x + 0.2) * ppm;
  const Y = (y: number) => (BODY_H - y) * ppm;
  // logo "FeedMe" with a gold PLUS pill underneath
  ctx.save();
  ctx.translate(X(-0.176), Y(0.203));
  ctx.font = `italic bold ${0.031 * ppm}px ${FONTS.web}`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 0.004 * ppm;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('FeedMe', 0, 0);
  const lg = ctx.createLinearGradient(0, -0.015 * ppm, 0, 0.015 * ppm);
  lg.addColorStop(0, C.titleB);
  lg.addColorStop(1, C.titleA);
  ctx.fillStyle = lg;
  ctx.fillText('FeedMe', 0, 0);
  const px = 0.002 * ppm, py = 0.0215 * ppm, pw = 0.05 * ppm, ph = 0.019 * ppm;
  const pg = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph / 2);
  pg.addColorStop(0, '#FFE58A');
  pg.addColorStop(0.5, '#F5B92E');
  pg.addColorStop(1, '#D98A12');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.roundRect(px, py - ph / 2, pw, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${0.0135 * ppm}px ${FONTS.heavy}`;
  ctx.textAlign = 'center';
  ctx.fillText('PLUS', px + pw / 2, py + 0.001 * ppm);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8A97B2';
  ctx.font = `bold ${0.0085 * ppm}px ${FONTS.ui}`;
  ctx.fillText('MEMBERS', px + pw + 0.004 * ppm, py + 0.0005 * ppm);
  // sparkle
  const sx = px + pw - 0.002 * ppm, sy = py - 0.011 * ppm, sr = 0.0085 * ppm;
  ctx.fillStyle = '#FFD84A';
  ctx.beginPath();
  ctx.moveTo(sx, sy - sr);
  ctx.quadraticCurveTo(sx, sy, sx + sr, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy + sr);
  ctx.quadraticCurveTo(sx, sy, sx - sr, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy - sr);
  ctx.fill();
  ctx.restore();
  // speaker grille (top right)
  ctx.fillStyle = '#5A6680';
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 10; c++) {
      ctx.beginPath();
      ctx.arc(X(0.062 + c * 0.0115 + (r % 2) * 0.0057), Y(0.207 - r * 0.0105), 0.0032 * ppm, 0, Math.PI * 2);
      ctx.fill();
    }
};

const drawCracks = (ctx: CanvasRenderingContext2D, w: number, h: number, s: number, ox: number, oy: number, color: string, seed: string, dent: boolean) => {
  if (s <= 0.001) return;
  if (dent) {
    const g = ctx.createRadialGradient(ox, oy, 2, ox, oy, h * 0.35 * Math.min(1, s * 2));
    g.addColorStop(0, 'rgba(40,50,80,0.55)');
    g.addColorStop(1, 'rgba(40,50,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = 9;
  for (let k = 0; k < n; k++) {
    const ang = Math.PI * (0.05 + 0.9 * (k + rand(`${seed}a${k}`) * 0.8) / n);
    const len = h * (0.55 + rand(`${seed}l${k}`) * 0.75) * clamp01(s * 1.4);
    let x = ox, y = oy;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 7;
    for (let j = 1; j <= steps; j++) {
      const a = ang + (rand(`${seed}j${k}-${j}`) - 0.5) * 0.9;
      x += (Math.cos(a) * len) / steps;
      y += (Math.sin(a) * len) / steps;
      ctx.lineTo(x, y);
      if (j === 3 && rand(`${seed}b${k}`) > 0.4) {
        // branch
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const ba = a + (rand(`${seed}ba${k}`) > 0.5 ? 0.7 : -0.7);
        ctx.lineTo(x + Math.cos(ba) * len * 0.25, y + Math.sin(ba) * len * 0.25);
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
};

const drawPaw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const cx = w / 2, cy = h * 0.56, s = w * 0.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.35, s * 0.62, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const toes: [number, number][] = [[-0.62, -0.25], [-0.24, -0.62], [0.24, -0.62], [0.62, -0.25]];
  for (const [x, y] of toes) {
    ctx.beginPath();
    ctx.ellipse(cx + x * s, cy + y * s, s * 0.21, s * 0.27, x * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

// ------------------------------------------------------------------------------------------------- geometry
let fGeo: null | Record<string, THREE.BufferGeometry> = null;
const feederGeo = () => {
  if (fGeo) return fGeo;
  // white rim frame at the lid's bottom (ring, so the kibble stays visible from above)
  const ringS = rrectShape(W + 0.008, D + 0.008, 0.042);
  ringS.holes.push(rrectShape(W - 0.034, D - 0.034, 0.03) as unknown as THREE.Path);
  const ring = new THREE.ExtrudeGeometry(ringS, {depth: 0.016, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 6});
  ring.rotateX(-Math.PI / 2);
  // staple: U loop sticking out of the body front (plane YZ)
  const staple = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.012, -0.018), new THREE.Vector3(0, 0.012, 0.02), new THREE.Vector3(0, 0.008, 0.0275),
      new THREE.Vector3(0, 0, 0.03), new THREE.Vector3(0, -0.008, 0.0275), new THREE.Vector3(0, -0.012, 0.02), new THREE.Vector3(0, -0.012, -0.018),
    ], false, 'centripetal'),
    32, 0.0032, 8, false,
  );
  const shardS = new THREE.Shape();
  shardS.moveTo(0, 0.022);
  shardS.lineTo(0.016, -0.01);
  shardS.lineTo(-0.012, -0.014);
  shardS.closePath();
  const shard = new THREE.ExtrudeGeometry(shardS, {depth: 0.004, bevelEnabled: false});
  shard.center();
  const button = new THREE.SphereGeometry(0.0135, 20, 12);
  button.scale(1, 1, 0.55);
  const hinge = new THREE.CylinderGeometry(0.0115, 0.0115, 0.075, 16);
  hinge.rotateZ(Math.PI / 2);
  fGeo = {
    body: rbox(W, BODY_H - BASE_H + 0.004, D, 0.032, 4),
    base: rbox(W - 0.014, BASE_H + 0.004, D - 0.014, 0.014, 3),
    liner: rbox(W - 0.05, 0.006, D - 0.05, 0.003, 2),
    lid: rbox(W + 0.004, LID_H, D + 0.004, 0.042, 4),
    ring,
    bezel: rbox(LCD_W + 0.03, LCD_H + 0.026, 0.014, 0.012, 3),
    btnRing: rbox(0.036, 0.036, 0.006, 0.01, 2),
    button,
    antenna: new THREE.CylinderGeometry(0.004, 0.0055, 0.085, 8),
    antennaTip: new THREE.SphereGeometry(0.0095, 14, 10),
    hasp: rbox(0.036, 0.056, 0.0045, 0.006, 2),
    hinge,
    staple,
    shard,
    lcd: new THREE.PlaneGeometry(LCD_W, LCD_H),
    front: new THREE.PlaneGeometry(0.4, BODY_H - BASE_H),
    lidTop: new THREE.PlaneGeometry(W - 0.09, D - 0.09),
    paw: new THREE.PlaneGeometry(0.14, 0.14),
    slot: new THREE.PlaneGeometry(0.009, 0.03),
  };
  return fGeo;
};

const SHARDS = Array.from({length: 9}, (_, i) => {
  const r = (k: number) => rand(`shard-${i}-${k}`);
  const a = -Math.PI * 0.1 + r(0) * Math.PI * 1.2; // mostly toward the front/sides
  const d = 0.28 + r(1) * 0.4;
  return {
    end: [Math.cos(a) * d * 1.1, 0.003, D / 2 + Math.sin(a) * d * 0.7] as [number, number, number],
    spin: [r(2) * 14 - 7, r(3) * 14 - 7, r(4) * 14 - 7] as [number, number, number],
    rest: r(5) * 6.28,
    color: i % 3 === 2 ? BONDI : '#F4F6FA',
    s: 0.7 + r(6) * 0.8,
    h: 0.12 + r(7) * 0.2,
  };
});

// ------------------------------------------------------------------------------------------------- component
export type FeederProps = GroupProps & {
  lid?: number;
  lidFly?: number;
  lcdText?: string;
  lcdColor?: string;
  locked?: boolean;
  lockOpen?: number;
  lockShake?: number;
  smashed?: number;
  kibbleFill?: number;
  /** seconds for shake phases (defaults to current frame / fps) */
  time?: number;
};

export const Feeder: React.FC<FeederProps> = ({
  lid = 0, lidFly = 0, lcdText = 'GOOD MORNING!', lcdColor = '#9DFF5A', locked = true, lockOpen = 0, lockShake = 0, smashed = 0,
  kibbleFill = 0.8, time, ...rest
}) => {
  const t = usePropTime(time);
  const g = feederGeo();
  const s = clamp01(smashed);
  const sq = Math.round(s * 25) / 25; // quantised for canvas redraws

  const lcdTex = useCanvasTexture(640, 160, (ctx, w, h) => drawLcd(ctx, w, h, lcdText, lcdColor, sq, locked && s < 0.3), [lcdText, lcdColor, sq, locked]);
  const frontTex = useCanvasTexture(1024, Math.round((1024 * (BODY_H - BASE_H)) / 0.4), drawFrontDecal, []);
  const crackTex = useCanvasTexture(1024, Math.round((1024 * (BODY_H - BASE_H)) / 0.4), (ctx, w, h) => drawCracks(ctx, w, h, sq, w * 0.5, 0, '#2a2f45', 'fc', true), [sq]);
  const lidCrackTex = useCanvasTexture(512, 400, (ctx, w, h) => drawCracks(ctx, w, h, sq, w * 0.5, h * 0.95, 'rgba(255,255,255,0.9)', 'lc', false), [sq]);
  const pawTex = useCanvasTexture(256, 256, drawPaw, []);

  const mats = useMemo(
    () => ({
      lcd: new THREE.MeshBasicMaterial({map: lcdTex, toneMapped: false, color: '#e6e6e6'}),
      front: makeGlossMat('#ffffff', {map: frontTex, transparent: true, spec: 0, depthWrite: false, polygonOffset: 2}),
      crack: makeGlossMat('#ffffff', {map: crackTex, transparent: true, spec: 0, depthWrite: false, polygonOffset: 3}),
      lidCrack: new THREE.MeshBasicMaterial({map: lidCrackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}),
      paw: new THREE.MeshBasicMaterial({map: pawTex, transparent: true, depthWrite: false, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -2}),
    }),
    [lcdTex, frontTex, crackTex, lidCrackTex, pawTex],
  );

  const white = glossMat('#E4E9F2', {spec: 0.25, edge: 0.975});
  const grey = glossMat('#8F9BB5', {spec: 0.2});
  const baseMat = glossMat('#1394BC', {spec: 0.6, edge: 0.95});
  const liner = glossMat('#C6D0E0', {spec: 0});
  const bezel = glossMat('#283041', {spec: 0.5, edge: 0.97});
  const chrome = chromeMat();
  const lidMat = candyMat(BONDI, 0.5);
  const ink = flatMat('#141826');

  // ---- smash: slump/dent
  const dent = smooth01(s * 2);
  const bodyScaleY = 1 - 0.07 * dent;
  const bodyTilt = 0.045 * dent;

  // ---- lid
  const lidAng = lid * 1.95;
  const fly = clamp01(lidFly);
  const flyE = easeOutCubic(fly);
  const lidRot = fly > 0 ? -lidAng * (1 - flyE) - 3 * Math.PI * flyE : -lidAng;
  const lidPos: [number, number, number] = fly > 0
    ? [0.06 * flyE, BODY_H * bodyScaleY + 1.1 * fly * (1 - fly) - (BODY_H - LID_H) * fly * fly, -D / 2 + 0.004 - 0.75 * flyE]
    : [0, BODY_H * bodyScaleY, -D / 2 + 0.004];

  // ---- padlock
  const sk = clamp01(lockShake);
  const swingZ = sk * 0.32 * Math.sin(t * 24) * (0.7 + 0.3 * Math.sin(t * 7.1));
  const swingX = sk * 0.12 * Math.sin(t * 17 + 0.7);
  const lockBroken = clamp01(s * 3.5);
  const fall = clamp01((s - 0.12) / 0.55);
  // fall path: from hanging to lying on its back on the floor in front-right
  const fallG = fall * fall;
  const bounce = fall > 0.78 ? 0.035 * Math.sin((Math.PI * (fall - 0.78)) / 0.22) : 0;
  const lockPos: [number, number, number] = [
    0.13 * easeOutCubic(fall),
    HANG_Y + ((PADLOCK.body[2] / 2) * LOCK_SCALE + 0.002 - HANG_Y) * Math.min(1, fallG / 0.6084) + bounce,
    STAPLE_Z + 0.13 * easeOutCubic(fall),
  ];
  const lockRot: [number, number, number] = [-Math.PI / 2 * smooth01(fall * 1.3), 0.5 * fall, 0.4 * fall];

  return (
    <group {...rest}>
      {/* ------------- body (slumps when smashed) */}
      <group scale={[1 + 0.025 * dent, bodyScaleY, 1 + 0.02 * dent]} rotation={[bodyTilt, 0, -0.025 * dent]}>
        <Ink geometry={g.base} material={baseMat} position={[0, (BASE_H + 0.004) / 2, 0]} outline={PROP_INK.thick} />
        <Ink geometry={g.body} material={white} position={[0, BASE_H + (BODY_H - BASE_H + 0.004) / 2 - 0.004, 0]} outline={PROP_INK.big} />
        <mesh geometry={g.liner} material={liner} position={[0, BODY_H + 0.0005, 0]} />
        {/* front decals */}
        <mesh geometry={g.front} material={mats.front} position={[0, (BASE_H + BODY_H) / 2, D / 2 + 0.0004]} />
        {s > 0.001 ? <mesh geometry={g.front} material={mats.crack} position={[0, (BASE_H + BODY_H) / 2, D / 2 + 0.0008]} /> : null}
        {/* LCD */}
        <Ink geometry={g.bezel} material={bezel} position={[0, LCD_Y, D / 2]} outline={PROP_INK.mid} />
        <mesh geometry={g.lcd} material={mats.lcd} position={[0, LCD_Y, D / 2 + 0.0072]} />
        {/* gel buttons either side of the LCD */}
        {([[-0.168, C.aqua], [0.168, C.bubblegum]] as [number, string][]).map(([x, col]) => (
          <group key={x} position={[x, LCD_Y, D / 2]}>
            <Ink geometry={g.btnRing} material={grey} outline={PROP_INK.thin} />
            <Ink geometry={g.button} material={glossMat(col, {spec: 0.6, edge: 0.96, rim: 0.2, rimColor: '#ffffff', emissive: col, emissiveIntensity: 0.35})} position={[0, 0, 0.004]} outline={PROP_INK.thin} />
          </group>
        ))}
        {/* hinge barrels */}
        {[-0.13, 0.13].map((x) => (
          <Ink key={x} geometry={g.hinge} material={white} position={[x, BODY_H, -D / 2 - 0.002]} outline={PROP_INK.mid} />
        ))}
        {/* "cloud connected" antenna with an aqua LED ball */}
        <group position={[W / 2 + 0.012, BODY_H - 0.005, -D / 2 + 0.05]} rotation={[-0.15, 0, -0.28]}>
          <Ink geometry={g.antenna} material={grey} outline={PROP_INK.thin} />
          <Ink geometry={g.antennaTip} material={glossMat(C.aqua, {spec: 0.9, emissive: C.aqua, emissiveIntensity: 0.5})} position={[0, 0.046, 0]} outline={PROP_INK.thin} />
        </group>
        {/* staple (bends down when smashed) */}
        <group position={[0, STAPLE_Y, D / 2 + 0.002]} rotation={[0.5 * smooth01(s * 2), 0, 0]}>
          <Ink geometry={g.staple} material={chrome} outline={PROP_INK.thin} />
        </group>
        {/* hopper food */}
        {kibbleFill > 0.01 ? (
          <KibblePile
            count={Math.round(60 + 300 * clamp01(kibbleFill))}
            footprint={[W - 0.085, D - 0.085]}
            height={0.012 + 0.07 * clamp01(kibbleFill)}
            seed={3}
            position={[0, BODY_H + 0.003, 0]}
          />
        ) : null}
      </group>

      {/* ------------- lid (hinged at the back top edge) */}
      <group position={lidPos} rotation={[lidRot, 0, 0]}>
        <group position={[0, 0, D / 2 - 0.004]}>
          <Ink geometry={g.ring} material={white} position={[0, 0, 0]} outline={PROP_INK.thick} />
          <Ink geometry={g.lid} material={lidMat} position={[0, LID_H / 2 + 0.006, 0]} outline={PROP_INK.thick} silhouette renderOrder={2} />
          <mesh geometry={g.paw} material={mats.paw} position={[0.12, LID_H + 0.0065, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]} renderOrder={3} />
          {s > 0.001 ? (
            <mesh geometry={g.lidTop} material={mats.lidCrack} position={[0, LID_H + 0.0068, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} />
          ) : null}
          {/* hasp plate on the lid front, hangs over the seam */}
          <group position={[0, -0.004, D / 2 + 0.004]}>
            <Ink geometry={g.hasp} material={chrome} position={[0, -0.006, 0.002]} outline={PROP_INK.thin} />
            <mesh geometry={g.slot} material={ink} position={[0, -0.012, 0.0046]} />
          </group>
        </group>
      </group>

      {/* ------------- padlock: hangs from the staple, swings when shaken, snaps & drops when smashed */}
      {locked ? (
        fall > 0 ? (
          <Padlock position={lockPos} rotation={lockRot} broken={lockBroken} time={t} scale={LOCK_SCALE} />
        ) : (
          <group position={[0, PIVOT_Y, STAPLE_Z]} rotation={[swingX, 0, swingZ]}>
            <Padlock position={[0, HANG_Y - PIVOT_Y, 0]} open={lockOpen} shake={sk * 0.5} broken={lockBroken} time={t} scale={LOCK_SCALE} />
          </group>
        )
      ) : null}

      {/* ------------- shards */}
      {s > 0.02
        ? SHARDS.map((sh, i) => {
            const e = easeOutCubic(clamp01((s - 0.02) / 0.6));
            const p0: [number, number, number] = [0, BODY_H, D / 2];
            const x = p0[0] + (sh.end[0] - p0[0]) * e;
            const z = p0[2] + (sh.end[2] - p0[2]) * e;
            const y = p0[1] + (sh.end[1] - p0[1]) * e + 4 * e * (1 - e) * sh.h;
            const spinK = 1 - e;
            return (
              <Ink
                key={i}
                geometry={g.shard}
                material={sh.color === BONDI ? glossMat(BONDI, {spec: 0.6}) : white}
                position={[x, y, z]}
                rotation={[-Math.PI / 2 + sh.spin[0] * spinK, sh.rest + sh.spin[1] * spinK, sh.spin[2] * spinK]}
                scale={sh.s}
                outline={PROP_INK.thin}
              />
            );
          })
        : null}
    </group>
  );
};

export default Feeder;
