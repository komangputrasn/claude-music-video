/**
 * Our own dot-matrix LCD face for the Feeder, laid exactly over the prop's LCD (feeder-local) so the message can TYPE
 * ON word-by-word in sync with the vocal, invert "PLUS", and flip to a red alert backlight on "ONLY".
 * Redraws only when the visible state changes.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCanvasTexture, FEEDER} from '../../lib/props';
import {FONTS} from '../../lib/palette';

export type LcdWord = {text: string; at: number; invert?: boolean};
export type LcdState = {
  /** status row text in the middle */
  status?: string;
  /** message lines; words appear when frame >= at */
  lines: LcdWord[][];
  frame: number;
  /** 0 green backlight, 1 red alert */
  alert?: number;
  /** blinking block cursor after the last typed word */
  cursor?: boolean;
  /** words with index in `flashWords` blink (e.g. ONLY) */
  flash?: string[];
};

const W = 960, H = 236;
const GREEN = new THREE.Color('#9DFF5A');
const RED = new THREE.Color('#FF4A2E');

const draw = (ctx: CanvasRenderingContext2D, s: {status: string; lines: {text: string; invert: boolean; on: boolean}[][]; alert: number; cursorOn: boolean; flashOn: boolean; flash: string[]}) => {
  const base = GREEN.clone().lerp(RED, s.alert);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, H * 0.2, W * 0.5, H * 0.5, W * 0.6);
  g.addColorStop(0, `#${base.clone().lerp(new THREE.Color('#ffffff'), 0.25).getHexString()}`);
  g.addColorStop(1, `#${base.clone().multiplyScalar(0.7).getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(20,40,0,0.10)';
  for (let x = 0; x < W; x += 6) ctx.fillRect(x, 0, 1.5, H);
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1.5);
  const ink = s.alert > 0.5 ? '#2a0500' : '#10200A';
  const ghost = s.alert > 0.5 ? 'rgba(60,0,0,0.10)' : 'rgba(10,30,0,0.08)';
  // status row
  ctx.fillStyle = ink;
  ctx.textBaseline = 'top';
  ctx.font = `bold 30px ${FONTS.lcd}`;
  ctx.fillText('FeedMe+', 20, 12);
  ctx.textAlign = 'center';
  ctx.fillText(s.status, W / 2 + 40, 12);
  ctx.textAlign = 'left';
  // lock glyph + battery
  ctx.fillRect(W - 58, 26, 30, 22);
  ctx.lineWidth = 5;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.arc(W - 43, 26, 10, Math.PI, 0);
  ctx.stroke();
  ctx.strokeRect(W - 128, 18, 48, 24);
  ctx.fillRect(W - 124, 22, 30, 16);
  ctx.fillRect(W - 80, 24, 5, 12);
  ctx.fillRect(16, 52, W - 32, 3);
  // message (fixed 2-line layout, monospace so typing never reflows)
  const size = 70;
  ctx.font = `bold ${size}px ${FONTS.lcd}`;
  ctx.textBaseline = 'middle';
  const cw = ctx.measureText('M').width;
  const rows = s.lines.length;
  const lh = size * 1.08;
  const y0 = 56 + (H - 56) / 2 - ((rows - 1) * lh) / 2 + 2;
  let lastX = 0, lastY = y0, anyOn = false;
  s.lines.forEach((line, r) => {
    const full = line.map((w) => w.text).join(' ');
    let x = W / 2 - (full.length * cw) / 2;
    const y = y0 + r * lh;
    // ghost cells for the full row
    ctx.fillStyle = ghost;
    ctx.fillText(full.replace(/[^ ]/g, '█'), x, y);
    line.forEach((w) => {
      if (w.on) {
        const blinkOff = s.flash.includes(w.text) && !s.flashOn;
        if (w.invert) {
          ctx.fillStyle = ink;
          ctx.fillRect(x - cw * 0.15, y - size * 0.52, w.text.length * cw + cw * 0.3, size * 1.02);
          ctx.fillStyle = `#${base.clone().lerp(new THREE.Color('#ffffff'), 0.35).getHexString()}`;
          ctx.fillText(w.text, x, y);
        } else if (!blinkOff) {
          ctx.fillStyle = ink;
          ctx.fillText(w.text, x, y);
        }
        lastX = x + w.text.length * cw;
        lastY = y;
        anyOn = true;
      }
      x += (w.text.length + 1) * cw;
    });
  });
  if (s.cursorOn) {
    ctx.fillStyle = ink;
    const cx = anyOn ? lastX + cw * 0.3 : W / 2 - cw / 2;
    ctx.fillRect(cx, lastY - size * 0.45, cw * 0.8, size * 0.9);
  }
};

export const FeederLcd: React.FC<LcdState> = ({status = '3:15 AM', lines, frame, alert = 0, cursor = false, flash = []}) => {
  const vis = lines.map((l) => l.map((w) => ({text: w.text, invert: !!w.invert, on: frame >= w.at})));
  const cursorOn = cursor && Math.floor(frame / 8) % 2 === 0;
  const flashOn = Math.floor(frame / 5) % 2 === 0;
  const a = alert > 0.5 ? 1 : 0;
  const key = JSON.stringify([status, vis.map((l) => l.map((w) => (w.on ? 1 : 0))), a, cursorOn, flashOn && flash.length > 0]);
  const tex = useCanvasTexture(W, H, (ctx) => draw(ctx, {status, lines: vis, alert: a, cursorOn, flashOn, flash}), [key]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: tex, toneMapped: false, color: '#e6e6e6'}), [tex]);
  return (
    <mesh position={[0, FEEDER.lcdCenter[1], FEEDER.lcdCenter[2] + 0.0009]} material={mat}>
      <planeGeometry args={[FEEDER.lcdSize[0], FEEDER.lcdSize[1]]} />
    </mesh>
  );
};
