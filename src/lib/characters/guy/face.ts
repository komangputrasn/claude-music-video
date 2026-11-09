/**
 * Guy's face: eyes, lids, brows, mouth and blush drawn with canvas 2D onto a texture that is UV-mapped onto the front of
 * the head sphere (only the front window of the head; outside it the texture clamps to plain skin).
 * Drawing is done in "surface radians" (lon/lat on the head sphere, y up) so features keep their shape on the sphere.
 *
 *   FACE_WINDOW         lon/lat window the canvas covers
 *   faceUvTransform()   texture repeat/offset that maps the head's sphere UVs into that window
 *   drawFace(ctx, s)    redraws the whole face for a FaceState
 *   faceKey(s)          quantised key — redraw only when it changes
 */
import type {FaceState, GuyExpression} from './rig';

export const FACE_WINDOW = {lonMin: -0.8, lonMax: 0.8, latMin: -0.92, latMax: 0.62};
export const FACE_TEX_SIZE = 1024;

/** repeat/offset for a texture on SphereGeometry(phiStart = -PI/2) so the canvas covers FACE_WINDOW. */
export const faceUvTransform = () => {
  const {lonMin, lonMax, latMin, latMax} = FACE_WINDOW;
  const dLon = lonMax - lonMin;
  const dLat = latMax - latMin;
  return {
    repeat: [(2 * Math.PI) / dLon, Math.PI / dLat] as [number, number],
    offset: [(-Math.PI - lonMin) / dLon, (-Math.PI / 2 - latMin) / dLat] as [number, number],
  };
};

// Feature layout (surface radians)
export const FACE_LAYOUT = {
  eyeLon: 0.345,
  eyeLat: 0.01,
  eyeA: 0.13, // half width
  eyeB: 0.175, // half height
  browLat: 0.31,
  mouthLat: -0.43,
  noseLat: -0.15,
  blushLon: 0.5,
  blushLat: -0.22,
};

type FaceParams = {
  browY: number; browIn: number; browCurve: number;
  lidTop: number; lidTilt: number; lidBot: number; iris: number;
  smile: number; open: number; width: number; round: number; teeth: number; skew: number; blush: number; tongue: number;
};

const EXPR: Record<GuyExpression, FaceParams> = {
  neutral: {browY: 0, browIn: 0.01, browCurve: 0.035, lidTop: 0.16, lidTilt: 0, lidBot: 0.04, iris: 1, smile: 0.35, open: 0, width: 0.75, round: 0, teeth: 0, skew: 0.15, blush: 0, tongue: 0},
  sleepy: {browY: -0.025, browIn: 0.035, browCurve: 0.02, lidTop: 0.6, lidTilt: -0.25, lidBot: 0.12, iris: 1, smile: 0.0, open: 0.1, width: 0.5, round: 0.7, teeth: 0, skew: 0, blush: 0.25, tongue: 0},
  shock: {browY: 0.11, browIn: 0.04, browCurve: 0.06, lidTop: 0, lidTilt: 0, lidBot: 0, iris: 0.52, smile: -0.2, open: 1, width: 0.95, round: 0.85, teeth: 1, skew: 0, blush: 0, tongue: 0.7},
  angry: {browY: -0.03, browIn: -0.12, browCurve: 0.0, lidTop: 0.36, lidTilt: 0.55, lidBot: 0.15, iris: 0.82, smile: -0.7, open: 0.45, width: 1.0, round: 0, teeth: 2, skew: 0, blush: 0, tongue: 0},
  sad: {browY: 0.03, browIn: 0.12, browCurve: -0.02, lidTop: 0.28, lidTilt: -0.55, lidBot: 0.05, iris: 1.12, smile: -0.75, open: 0.06, width: 0.6, round: 0, teeth: 0, skew: 0, blush: 0, tongue: 0},
  happy: {browY: 0.06, browIn: 0.02, browCurve: 0.05, lidTop: 0.06, lidTilt: 0, lidBot: 0.4, iris: 1.02, smile: 1, open: 0.6, width: 1.05, round: 0, teeth: 1, skew: 0, blush: 0.8, tongue: 1},
  determined: {browY: -0.035, browIn: -0.085, browCurve: 0.015, lidTop: 0.36, lidTilt: 0.35, lidBot: 0.18, iris: 0.95, smile: 0.12, open: 0, width: 0.8, round: 0, teeth: 0, skew: 0.75, blush: 0, tongue: 0},
  yell: {browY: 0.02, browIn: -0.11, browCurve: 0.0, lidTop: 0.12, lidTilt: 0.35, lidBot: 0.05, iris: 0.75, smile: -0.05, open: 1, width: 1.3, round: 0.15, teeth: 1, skew: 0, blush: 0, tongue: 1},
  cold: {browY: 0.02, browIn: 0.1, browCurve: 0.0, lidTop: 0.3, lidTilt: -0.35, lidBot: 0.1, iris: 0.95, smile: -0.35, open: 0.24, width: 0.95, round: 0, teeth: 2, skew: 0, blush: 0.9, tongue: 0},
};

const mixParams = (a: FaceParams, b: FaceParams, t: number): FaceParams => {
  const o = {} as FaceParams;
  (Object.keys(a) as (keyof FaceParams)[]).forEach((k) => {
    o[k] = a[k] + (b[k] - a[k]) * t;
  });
  return o;
};

const q = (x: number, n: number) => Math.round(x * n);
export const faceKey = (s: FaceState) =>
  `${s.expression}|${s.expression2}|${q(s.mix, 24)}|${q(s.mouthOpen, 24)}|${q(s.blink, 16)}|${q(s.eyesX, 16)}|${q(s.eyesY, 16)}`;

const INK = '#1b1030';
const LIP = '#3a1420';
const MOUTH = '#5e1428';
const TONGUE = '#ff6f8e';
const IRIS = '#6b3a17';
const IRIS_DARK = '#3b1d0a';
const BROW = '#4a2812';

export const drawFace = (ctx: CanvasRenderingContext2D, s: FaceState, skin: string) => {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const {lonMin, lonMax, latMin, latMax} = FACE_WINDOW;
  const kx = W / (lonMax - lonMin);
  const ky = H / (latMax - latMin);
  const P = mixParams(EXPR[s.expression], EXPR[s.expression2], s.mix);
  const F = FACE_LAYOUT;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /** local frame at (lon, lat): units = surface radians, y up, mirror=-1 flips x. */
  const at = (lon: number, lat: number, mirror = 1) =>
    ctx.setTransform((kx / Math.cos(lat)) * mirror, 0, 0, -ky, (lon - lonMin) * kx, (latMax - lat) * ky);

  // ---- blush (under everything)
  if (P.blush > 0.01) {
    for (const m of [-1, 1]) {
      at(m * F.blushLon, F.blushLat, m);
      ctx.globalAlpha = 0.42 * P.blush;
      ctx.fillStyle = '#ff6f8a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.085, 0.042, 0, 0, Math.PI * 2);
      ctx.fill();
      // little anime blush hatches
      ctx.globalAlpha = 0.5 * P.blush;
      ctx.strokeStyle = '#e04a6a';
      ctx.lineWidth = 0.009;
      for (const dx of [-0.035, 0, 0.035]) {
        ctx.beginPath();
        ctx.moveTo(dx - 0.012, -0.018);
        ctx.lineTo(dx + 0.012, 0.018);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- eyes
  const blink = s.blink;
  const lidTop = P.lidTop + (1 - P.lidTop) * blink;
  const lidBot = Math.max(P.lidBot, blink * 0.8);
  const a = F.eyeA;
  const b = F.eyeB;
  const lw = 0.02;
  for (const m of [1, -1]) {
    // m = +1: his left eye (canvas right); local +x = outer side
    at(m * F.eyeLon, F.eyeLat, m);
    const yT = b * 1.12 - b * 1.45 * lidTop; // upper lid edge (centre)
    const yB = -b * 1.12 + b * 1.4 * lidBot; // lower lid edge (centre)
    const tilt = P.lidTilt;
    const topAt = (x: number) => yT - tilt * 0.5 * b * (-x / a);
    const closed = yT - yB < b * 0.16;

    const eyePath = (grow = 0) => {
      ctx.beginPath();
      ctx.ellipse(0, 0, a + grow, b + grow, 0, 0, Math.PI * 2);
    };

    if (closed) {
      const yc = Math.max(-b * 0.2, Math.min(b * 0.2, (yT + yB) / 2));
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      ctx.moveTo(-a * 1.0, yc + 0.012);
      ctx.quadraticCurveTo(0, yc - b * 0.5, a * 1.05, yc + 0.02);
      ctx.stroke();
      // lashes flick at the outer corner
      ctx.lineWidth = lw * 1.1;
      ctx.beginPath();
      ctx.moveTo(a * 0.95, yc + 0.012);
      ctx.lineTo(a * 1.25, yc + 0.04);
      ctx.stroke();
      continue;
    }

    // sclera
    eyePath();
    ctx.fillStyle = '#EEF1F6';
    ctx.fill();
    // iris + pupil + glints (clipped)
    ctx.save();
    eyePath();
    ctx.clip();
    const ri = a * 0.74 * P.iris;
    const ix = s.eyesX * m * a * 0.42;
    const iy = s.eyesY * b * 0.38 - b * 0.06;
    ctx.fillStyle = IRIS;
    ctx.beginPath();
    ctx.ellipse(ix, iy, ri, ri * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = IRIS_DARK;
    ctx.beginPath();
    ctx.ellipse(ix, iy + ri * 0.25, ri * 0.98, ri * 0.75, 0, Math.PI * 1.0, Math.PI * 2.0, true);
    ctx.fill();
    ctx.fillStyle = '#100808';
    ctx.beginPath();
    ctx.ellipse(ix, iy, ri * 0.52, ri * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // glints (same screen side for both eyes -> undo mirror)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ix - m * ri * 0.38, iy + ri * 0.42, ri * 0.3, ri * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ix + m * ri * 0.35, iy - ri * 0.45, ri * 0.13, ri * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // outline (thin all round, thick lash line on top)
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    eyePath();
    ctx.stroke();
    ctx.lineWidth = lw * 2.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, Math.PI * 0.12, Math.PI * 0.92);
    ctx.stroke();

    // lids (skin), clipped to a slightly grown eye so they also hide the outline
    ctx.save();
    eyePath(lw * 2.2);
    ctx.clip();
    ctx.fillStyle = skin;
    if (yT < b * 1.05) {
      ctx.beginPath();
      ctx.moveTo(-a * 1.4, topAt(-a * 1.4));
      ctx.quadraticCurveTo(0, yT + b * 0.16, a * 1.4, topAt(a * 1.4));
      ctx.lineTo(a * 1.5, b * 2);
      ctx.lineTo(-a * 1.5, b * 2);
      ctx.closePath();
      ctx.fill();
    }
    const botBulge = b * 0.28 * Math.min(1, lidBot * 2.5);
    if (yB > -b * 1.05) {
      ctx.beginPath();
      ctx.moveTo(-a * 1.4, yB - botBulge);
      ctx.quadraticCurveTo(0, yB + botBulge, a * 1.4, yB - botBulge);
      ctx.lineTo(a * 1.5, -b * 2);
      ctx.lineTo(-a * 1.5, -b * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // lid lines, clipped to the eye
    ctx.save();
    eyePath(lw * 0.6);
    ctx.clip();
    ctx.strokeStyle = INK;
    if (yT < b * 1.05) {
      ctx.lineWidth = lw * 2.3;
      ctx.beginPath();
      ctx.moveTo(-a * 1.4, topAt(-a * 1.4));
      ctx.quadraticCurveTo(0, yT + b * 0.16, a * 1.4, topAt(a * 1.4));
      ctx.stroke();
    }
    if (yB > -b * 1.0) {
      ctx.lineWidth = lw * 1.1;
      ctx.beginPath();
      ctx.moveTo(-a * 1.4, yB - botBulge);
      ctx.quadraticCurveTo(0, yB + botBulge, a * 1.4, yB - botBulge);
      ctx.stroke();
    }
    ctx.restore();
    // outer lash flick
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 1.4;
    const yo = Math.min(b * 0.75, topAt(a)) ;
    ctx.beginPath();
    ctx.moveTo(a * 0.9, yo - 0.005);
    ctx.lineTo(a * 1.2, yo + 0.022);
    ctx.stroke();
  }

  // ---- brows
  for (const m of [1, -1]) {
    at(m * F.eyeLon, F.browLat + P.browY, m);
    const xi = -0.14;
    const xo = 0.15;
    const yi = P.browIn;
    const yo = -P.browIn * 0.3 - 0.01;
    const ym = (yi + yo) / 2 + P.browCurve;
    const ti = 0.058;
    const to = 0.03;
    ctx.fillStyle = BROW;
    ctx.strokeStyle = BROW;
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(xi, yi + ti / 2);
    ctx.quadraticCurveTo(0, ym + (ti + to) / 4 + 0.012, xo, yo + to / 2);
    ctx.lineTo(xo + 0.01, yo - to / 2);
    ctx.quadraticCurveTo(0, ym - (ti + to) / 4 + 0.006, xi, yi - ti / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ---- mouth
  at(0, F.mouthLat, 1);
  const open = P.open + (1 - P.open) * s.mouthOpen;
  const hw = 0.19 * (P.width + s.mouthOpen * 0.05) * (1 - 0.3 * P.round * Math.min(1, open * 2));
  const cR = P.smile * 0.06 - P.skew * 0.012; // his right corner (canvas left, x<0)
  const cL = P.smile * 0.06 + P.skew * 0.04; // his left corner
  const avg = (cR + cL) / 2;
  if (open < 0.05) {
    const mid = avg - P.smile * 0.045 - 0.004;
    ctx.strokeStyle = LIP;
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.moveTo(-hw, cR);
    ctx.quadraticCurveTo(0, 2 * mid - avg, hw, cL);
    ctx.stroke();
    // smile creases
    if (P.smile > 0.25) {
      ctx.lineWidth = 0.014;
      for (const m of [-1, 1]) {
        const cx = m * hw;
        const cy = m < 0 ? cR : cL;
        ctx.beginPath();
        ctx.moveTo(cx - m * 0.012, cy + 0.03);
        ctx.quadraticCurveTo(cx + m * 0.014, cy + 0.008, cx - m * 0.004, cy - 0.022);
        ctx.stroke();
      }
    }
  } else {
    const Hh = 0.045 + open * (0.24 + 0.08 * P.round);
    const sm = P.smile;
    const yTop = avg + Hh * (0.3 - 0.42 * sm) * (1 - P.round * 0.4);
    const yBot = avg - Hh * (0.7 + 0.3 * sm);
    const rnd = P.round;
    const mouthPath = () => {
      ctx.beginPath();
      ctx.moveTo(-hw, cR);
      // right corner -> top -> left corner -> bottom -> right corner (cubic, `round` makes corners vertical)
      const hT = (yTop - cR) * 0.55;
      ctx.bezierCurveTo(-hw + (1 - rnd) * hw * 0.45, cR + hT * (rnd + (1 - rnd) * 0.9), -hw * 0.55, yTop, 0, yTop);
      ctx.bezierCurveTo(hw * 0.55, yTop, hw - (1 - rnd) * hw * 0.45, cL + (yTop - cL) * 0.55 * (rnd + (1 - rnd) * 0.9), hw, cL);
      const hB = (yBot - cL) * 0.55;
      ctx.bezierCurveTo(hw - (1 - rnd) * hw * 0.3, cL + hB * (rnd + (1 - rnd) * 0.9), hw * 0.6, yBot, 0, yBot);
      ctx.bezierCurveTo(-hw * 0.6, yBot, -hw + (1 - rnd) * hw * 0.3, cR + (yBot - cR) * 0.55 * (rnd + (1 - rnd) * 0.9), -hw, cR);
      ctx.closePath();
    };
    mouthPath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ctx.save();
    mouthPath();
    ctx.clip();
    if (P.teeth >= 1.5) {
      // gritted teeth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-hw * 1.2, yBot - 0.05, hw * 2.4, yTop - yBot + 0.1);
      ctx.strokeStyle = '#8b6b70';
      ctx.lineWidth = 0.008;
      const ym = (yTop + yBot) / 2;
      ctx.beginPath();
      ctx.moveTo(-hw, ym);
      ctx.lineTo(hw, ym);
      for (let i = -3; i <= 3; i++) {
        const x = i * hw * 0.27;
        ctx.moveTo(x, yBot - 0.02);
        ctx.lineTo(x, yTop + 0.02);
      }
      ctx.stroke();
    } else {
      if (P.tongue > 0.01 && open > 0.25) {
        ctx.fillStyle = TONGUE;
        ctx.beginPath();
        ctx.ellipse(0, yBot + Hh * 0.05, hw * 0.62, Hh * 0.42 * P.tongue, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (P.teeth >= 0.5) {
        ctx.fillStyle = '#ffffff';
        const th = Math.min(0.045, Hh * 0.32);
        ctx.beginPath();
        ctx.ellipse(0, yTop + 0.02, hw * 0.92, th + 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    mouthPath();
    ctx.strokeStyle = LIP;
    ctx.lineWidth = 0.02;
    ctx.stroke();
    // lower lip hint
    if (open > 0.35 && P.round < 0.6) {
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.28, yBot - 0.028);
      ctx.quadraticCurveTo(0, yBot - 0.04, hw * 0.28, yBot - 0.028);
      ctx.stroke();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};
