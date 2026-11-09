/**
 * Bedroom canvas textures (deterministic, system fonts only, cached module-wide — they never change).
 *   floorTexture()        honey wood planks (2 m x 2 m tile, repeat it)
 *   wallTexture()         periwinkle Y2K wallpaper (1 m x 1 m tile)
 *   rugTexture()          round grape/aqua/bubblegum shag rug (use with alphaTest/transparent)
 *   posterStarTexture()   chrome 4-point star poster
 *   posterY2KTexture()    band-less "Y2K" graphic poster
 *   backdropTexture(time) view outside the window (night / dawn / day)
 *   glowTexture()         soft radial white glow (halos, LED spill on floors)
 */
import * as THREE from 'three';
import {rand} from '../../time';
import {FONTS} from '../../palette';
import {makeCanvas, canvasTex} from './ink';

const cache = new Map<string, THREE.Texture>();
const once = (key: string, make: () => THREE.Texture) => {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
};

const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;

export const floorTexture = () =>
  once('floor', () => {
    const S = 1024;
    const {c, ctx} = makeCanvas(S, S);
    const n = 12;
    const pw = S / n;
    for (let i = 0; i < n; i++) {
      let y = -rand(`fo${i}`) * S;
      let k = 0;
      while (y < S) {
        const len = S * (0.35 + rand(`fl${i}-${k}`) * 0.45);
        const r = rand(`fc${i}-${k}`);
        const base = hsl(28 + r * 8, 52 + r * 10, 52 + (rand(`fd${i}-${k}`) - 0.5) * 12);
        ctx.fillStyle = base;
        ctx.fillRect(i * pw, y, pw, len);
        // grain
        for (let g = 0; g < 7; g++) {
          const gx = i * pw + 6 + rand(`gx${i}-${k}-${g}`) * (pw - 12);
          ctx.strokeStyle = rand(`gc${i}-${k}-${g}`) > 0.5 ? 'rgba(90,45,15,0.16)' : 'rgba(255,225,170,0.14)';
          ctx.lineWidth = 1 + rand(`gw${i}-${k}-${g}`) * 2;
          ctx.beginPath();
          ctx.moveTo(gx, y + 4);
          ctx.bezierCurveTo(gx + 6, y + len * 0.3, gx - 6, y + len * 0.6, gx + 2, y + len - 4);
          ctx.stroke();
        }
        // highlight edge + seam
        ctx.fillStyle = 'rgba(255,230,190,0.18)';
        ctx.fillRect(i * pw + 2, y, 3, len);
        ctx.fillStyle = '#4a2a14';
        ctx.fillRect(i * pw, y + len - 3, pw, 3);
        y += len;
        k++;
      }
      ctx.fillStyle = '#4a2a14';
      ctx.fillRect(i * pw - 2, 0, 4, S);
    }
    return canvasTex(c, {repeat: [2.25, 2]});
  });

export const wallTexture = () =>
  once('wall', () => {
    const S = 512;
    const {c, ctx} = makeCanvas(S, S);
    ctx.fillStyle = '#a2b4ea';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(i * 128 + 40, 0, 48, S);
      ctx.fillStyle = 'rgba(80,100,200,0.07)';
      ctx.fillRect(i * 128 + 36, 0, 4, S);
      ctx.fillRect(i * 128 + 88, 0, 4, S);
    }
    // tiny sparkles
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = i * 128 + 64 + (j % 2) * 0, y = j * 128 + 64;
        const s = 7;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.quadraticCurveTo(x, y, x + s, y);
        ctx.quadraticCurveTo(x, y, x, y + s);
        ctx.quadraticCurveTo(x, y, x - s, y);
        ctx.quadraticCurveTo(x, y, x, y - s);
        ctx.fill();
      }
    }
    return canvasTex(c, {repeat: [1, 1]});
  });

export const rugTexture = () =>
  once('rug', () => {
    const S = 512;
    const {c, ctx} = makeCanvas(S, S);
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2;
    const rings: [number, string][] = [
      [1.0, '#7c3cf0'],
      [0.84, '#19c6ff'],
      [0.7, '#f4f0ff'],
      [0.6, '#ff4fb8'],
      [0.42, '#ffd23f'],
      [0.24, '#ff4fb8'],
    ];
    // shaggy edge
    ctx.fillStyle = rings[0][1];
    ctx.beginPath();
    for (let a = 0; a <= 180; a++) {
      const t = (a / 180) * Math.PI * 2;
      const r = (S / 2 - 6) * (0.975 + 0.025 * Math.sin(t * 37) + 0.012 * (rand(`rg${a}`) - 0.5));
      const x = cx + Math.cos(t) * r, y = cy + Math.sin(t) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.fill();
    rings.slice(1).forEach(([r, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx, cy, (S / 2 - 6) * r, 0, Math.PI * 2);
      ctx.fill();
    });
    // shag speckle
    for (let i = 0; i < 2600; i++) {
      const a = rand(`ra${i}`) * Math.PI * 2, rr = Math.sqrt(rand(`rr${i}`)) * (S / 2 - 10);
      ctx.fillStyle = rand(`rc${i}`) > 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(30,0,60,0.13)';
      ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3, 3);
    }
    return canvasTex(c);
  });

const fourStar = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, thin = 0.18) => {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * thin, y - r * thin, x + r, y);
  ctx.quadraticCurveTo(x + r * thin, y + r * thin, x, y + r);
  ctx.quadraticCurveTo(x - r * thin, y + r * thin, x - r, y);
  ctx.quadraticCurveTo(x - r * thin, y - r * thin, x, y - r);
  ctx.closePath();
};

const chromeGrad = (ctx: CanvasRenderingContext2D, y0: number, y1: number) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.42, '#9fc4ff');
  g.addColorStop(0.5, '#1d2f6e');
  g.addColorStop(0.58, '#d9e8ff');
  g.addColorStop(1, '#5a76c8');
  return g;
};

export const posterStarTexture = () =>
  once('posterStar', () => {
    const W = 512, H = 700;
    const {c, ctx} = makeCanvas(W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1450');
    bg.addColorStop(0.55, '#1e5bff');
    bg.addColorStop(1, '#08082a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // burst rays
    ctx.save();
    ctx.translate(W / 2, H * 0.42);
    for (let i = 0; i < 24; i++) {
      ctx.rotate((Math.PI * 2) / 24);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(25,198,255,0.10)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(600, -40);
      ctx.lineTo(600, 40);
      ctx.fill();
    }
    ctx.restore();
    // chrome star
    fourStar(ctx, W / 2, H * 0.42, 220, 0.2);
    ctx.fillStyle = chromeGrad(ctx, H * 0.42 - 220, H * 0.42 + 220);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0a1450';
    ctx.stroke();
    fourStar(ctx, W / 2 - 10, H * 0.42 - 14, 120, 0.12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    // sparkles
    const sp: [number, number, number][] = [[90, 110, 30], [420, 150, 22], [400, 470, 34], [110, 430, 18], [260, 70, 14]];
    sp.forEach(([x, y, r]) => {
      fourStar(ctx, x, y, r, 0.12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
    // title
    ctx.textAlign = 'center';
    ctx.font = `italic 900 92px ${FONTS.heavy}`;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#0a1450';
    ctx.strokeText('SHINE', W / 2, H * 0.86);
    ctx.fillStyle = chromeGrad(ctx, H * 0.86 - 80, H * 0.86);
    ctx.fillText('SHINE', W / 2, H * 0.86);
    ctx.font = `bold 30px ${FONTS.web}`;
    ctx.fillStyle = '#bff3ff';
    ctx.fillText('*  2 0 0 2  *', W / 2, H * 0.94);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    return canvasTex(c);
  });

export const posterY2KTexture = () =>
  once('posterY2K', () => {
    const W = 512, H = 680;
    const {c, ctx} = makeCanvas(W, H);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#ff4fb8');
    bg.addColorStop(0.5, '#8a4dff');
    bg.addColorStop(1, '#19c6ff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // orbit rings
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(W / 2, H * 0.44, 230 - i * 40, 70 - i * 10, -0.35 + i * 0.32, 0, Math.PI * 2);
      ctx.stroke();
    }
    // halftone dots
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 10; x++) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(30 + x * 50, H - 150 + y * 18, 2 + (y / 8) * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.textAlign = 'center';
    ctx.font = `900 190px ${FONTS.impact}`;
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1b1030';
    ctx.strokeText('Y2K', W / 2, H * 0.52);
    ctx.fillStyle = chromeGrad(ctx, H * 0.52 - 160, H * 0.52);
    ctx.fillText('Y2K', W / 2, H * 0.52);
    ctx.font = `italic bold 40px ${FONTS.web}`;
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3a0a6a';
    ctx.strokeText('ARE YOU READY?', W / 2, H * 0.72);
    ctx.fillText('ARE YOU READY?', W / 2, H * 0.72);
    [[70, 90, 26], [450, 120, 20], [430, 560, 30]].forEach(([x, y, r]) => {
      fourStar(ctx, x, y, r, 0.12);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    return canvasTex(c);
  });

export type TimeOfDay = 'night' | 'dawn' | 'day';

/** Outside view: 1024x640 canvas meant for a ~5 x 3.1 m plane ~1.6 m behind the back wall. */
export const backdropTexture = (time: TimeOfDay) =>
  once(`bd-${time}`, () => {
    const W = 1024, H = 640;
    const {c, ctx} = makeCanvas(W, H);
    const horizon = H * 0.66;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    if (time === 'night') {
      sky.addColorStop(0, '#03061f');
      sky.addColorStop(0.7, '#0d1a5a');
      sky.addColorStop(1, '#2a3f9a');
    } else if (time === 'dawn') {
      sky.addColorStop(0, '#2a1f78');
      sky.addColorStop(0.45, '#b4579e');
      sky.addColorStop(0.8, '#ff9a6a');
      sky.addColorStop(1, '#ffd690');
    } else {
      sky.addColorStop(0, '#1f63f0');
      sky.addColorStop(0.7, '#6fb4ff');
      sky.addColorStop(1, '#d6f0ff');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    if (time === 'night') {
      for (let i = 0; i < 140; i++) {
        const x = rand(`sx${i}`) * W, y = rand(`sy${i}`) * horizon * 0.95;
        const r = 0.6 + rand(`sr${i}`) * 1.6;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + rand(`sa${i}`) * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (time === 'day') {
      const cloud = (x: number, y: number, s: number) => {
        ctx.fillStyle = '#ffffff';
        [[0, 0, 1], [0.9, 0.15, 0.8], [-0.9, 0.2, 0.75], [0.4, -0.45, 0.8], [-0.4, -0.35, 0.7]].forEach(([dx, dy, r]) => {
          ctx.beginPath();
          ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = 'rgba(160,200,255,0.5)';
        ctx.fillRect(x - 1.6 * s, y + 0.5 * s, 3.2 * s, 0.4 * s);
      };
      cloud(240, 160, 46);
      cloud(700, 110, 38);
      cloud(900, 260, 30);
    }
    // rolling hill
    const hill = time === 'night' ? '#0b1238' : time === 'dawn' ? '#4a2a6a' : '#46b02a';
    const hill2 = time === 'night' ? '#070c28' : time === 'dawn' ? '#35204f' : '#2f8f22';
    ctx.fillStyle = hill;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, horizon + 10);
    ctx.bezierCurveTo(W * 0.3, horizon - 70, W * 0.6, horizon + 40, W, horizon - 20);
    ctx.lineTo(W, H);
    ctx.fill();
    // neighbour houses
    const roof = time === 'night' ? '#050822' : time === 'dawn' ? '#2a1640' : '#c8503a';
    const wall = time === 'night' ? '#0a1030' : time === 'dawn' ? '#3d2456' : '#f2e6c8';
    const house = (x: number, w: number, h: number, lit: boolean) => {
      const by = horizon + 60;
      ctx.fillStyle = wall;
      ctx.fillRect(x, by - h, w, h + 200);
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(x - 18, by - h);
      ctx.lineTo(x + w / 2, by - h - w * 0.42);
      ctx.lineTo(x + w + 18, by - h);
      ctx.fill();
      ctx.fillStyle = lit ? '#ffcc66' : time === 'day' ? '#6fb4ff' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + w * 0.2, by - h * 0.7, w * 0.22, w * 0.2);
      ctx.fillStyle = time === 'day' ? '#6fb4ff' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + w * 0.58, by - h * 0.7, w * 0.22, w * 0.2);
    };
    house(80, 220, 120, time === 'night');
    house(640, 260, 150, false);
    ctx.fillStyle = hill2;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, horizon + 120);
    ctx.bezierCurveTo(W * 0.4, horizon + 70, W * 0.7, horizon + 130, W, horizon + 90);
    ctx.lineTo(W, H);
    ctx.fill();
    // tree
    const leaf = time === 'night' ? '#060a26' : time === 'dawn' ? '#2b1a44' : '#2c8a2a';
    ctx.fillStyle = time === 'day' ? '#6a3f1e' : leaf;
    ctx.fillRect(420, horizon - 40, 22, 200);
    ctx.fillStyle = leaf;
    [[431, horizon - 110, 70], [380, horizon - 70, 52], [485, horizon - 75, 55], [431, horizon - 170, 50]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    // street lamp
    if (time !== 'day') {
      ctx.fillStyle = '#05061a';
      ctx.fillRect(560, horizon - 120, 8, 260);
      ctx.fillRect(540, horizon - 124, 48, 8);
      const g = ctx.createRadialGradient(548, horizon - 112, 2, 548, horizon - 112, 90);
      g.addColorStop(0, 'rgba(255,190,90,0.95)');
      g.addColorStop(0.15, 'rgba(255,170,70,0.45)');
      g.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(448, horizon - 212, 200, 200);
    }
    return canvasTex(c);
  });

/** Soft radial white glow, alpha falloff (use with additive/transparent basic materials). */
export const glowTexture = () =>
  once('glow', () => {
    const S = 128;
    const {c, ctx} = makeCanvas(S, S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return canvasTex(c);
  });

/** Window-pane light pool (2x2 panes with soft edges) for the floor patch. */
export const windowPoolTexture = () =>
  once('pool', () => {
    const W = 256, H = 256;
    const {c, ctx} = makeCanvas(W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.filter = 'blur(5px)';
    ctx.fillStyle = '#fff';
    const m = 16, g = 12;
    const pw = (W - 2 * m - g) / 2, ph = (H - 2 * m - g) / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) ctx.fillRect(m + i * (pw + g), m + j * (ph + g), pw, ph);
    ctx.filter = 'none';
    return canvasTex(c, {srgb: false});
  });
