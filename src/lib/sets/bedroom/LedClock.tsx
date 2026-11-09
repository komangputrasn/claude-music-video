/**
 * <LedClock text="3:15" color="#ff2a1a" blink frame={f} flash={false} pm {...groupProps} />
 * Black bedside alarm clock with a real 7-segment LED face (drawn segment-by-segment on a canvas, with the faint
 * "88:88" ghost segments of a real display) — no fonts involved. Origin: base centre; faces +Z.
 *   text   up to "88:88". Digits 0-9 and A b C d E F H L n o P r U - and space. Without ':' the colon is off.
 *   blink  colon blinks once per second (uses frame). flash: whole display blinks (power-cut "12:00").
 *   pm / alarm  small indicator dots. brightness scales the glow (bloom); light = red spill onto the nightstand.
 * Size: CLOCK_SIZE (0.26 w x 0.105 h x 0.11 d); display centre CLOCK_FACE (local) for close-up framing.
 *
 *   <LedClock position={[0, 0.56, 0]} text="3:15" frame={f} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {TBox, geo, makeCanvas, canvasTex} from './ink';
import {glowTexture} from './textures';

export const CLOCK_SIZE = {w: 0.26, h: 0.105, d: 0.11} as const;
/** centre of the LED face, clock-local */
export const CLOCK_FACE: [number, number, number] = [0, 0.058, 0.0605];

export type LedClockProps = Omit<ThreeElements['group'], 'children'> & {
  text?: string;
  color?: string;
  blink?: boolean;
  flash?: boolean;
  frame?: number;
  pm?: boolean;
  alarm?: boolean;
  brightness?: number;
  light?: number;
};

const SEG: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg',
  '9': 'abcdfg', '-': 'g', ' ': '', A: 'abcefg', b: 'cdefg', C: 'adef', d: 'bcdeg', E: 'adefg', F: 'aefg', H: 'bcefg',
  L: 'def', n: 'ceg', o: 'cdeg', O: 'abcdef', P: 'abefg', r: 'eg', U: 'bcdef', S: 'afgcd', h: 'cefg', t: 'defg', y: 'bcdfg',
};

/** draw one 7-seg digit with its top-left at (x,y), size w x h, italic skew */
const drawDigit = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, segs: string) => {
  const t = w * 0.2; // thickness
  const sk = 0.1; // skew
  const P = (px: number, py: number): [number, number] => [x + px + (h - py) * sk, y + py];
  const hseg = (py: number) => {
    const a = [P(t * 0.6, py), P(t, py - t / 2), P(w - t, py - t / 2), P(w - t * 0.6, py), P(w - t, py + t / 2), P(t, py + t / 2)];
    return a;
  };
  const vseg = (px: number, y0: number, y1: number) => [
    P(px, y0 + t * 0.6), P(px + t / 2, y0 + t), P(px + t / 2, y1 - t), P(px, y1 - t * 0.6), P(px - t / 2, y1 - t), P(px - t / 2, y0 + t),
  ];
  const m = h / 2;
  const shapes: Record<string, [number, number][]> = {
    a: hseg(t / 2), g: hseg(m), d: hseg(h - t / 2),
    f: vseg(t / 2, 0, m), b: vseg(w - t / 2, 0, m), e: vseg(t / 2, m, h), c: vseg(w - t / 2, m, h),
  };
  for (const s of segs) {
    const pts = shapes[s];
    if (!pts) continue;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  }
};

export const LedClock: React.FC<LedClockProps> = ({
  text = '3:15', color = '#ff2a1a', blink = true, flash = false, frame = 0, pm = false, alarm = true, brightness = 1, light = 1, ...group
}) => {
  const {c, ctx, tex} = useMemo(() => {
    const k = makeCanvas(512, 200);
    return {...k, tex: canvasTex(k.c)};
  }, []);
  const colonOn = text.includes(':') && (!blink || frame % 30 < 18);
  const shown = !flash || frame % 30 < 18;
  useLayoutEffect(() => {
    const Wc = c.width, Hc = c.height;
    ctx.fillStyle = '#0d0203';
    ctx.fillRect(0, 0, Wc, Hc);
    const [l, r] = text.includes(':') ? text.split(':') : ['', text];
    const left = l.slice(-2).padStart(2, ' ');
    const right = text.includes(':') ? r.slice(0, 2).padEnd(2, ' ') : r.slice(-4).padStart(4, ' ');
    const chars = text.includes(':') ? [left[0], left[1], right[0], right[1]] : right.split('');
    const dw = 84, dh = 140, y = 30;
    const xs = [42, 146, 282, 386];
    const draw = (lit: boolean) => {
      chars.forEach((ch, i) => drawDigit(ctx, xs[i], y, dw, dh, lit ? (SEG[ch] ?? '') : 'abcdefg'));
      const cx = 248;
      if (!lit || colonOn) {
        ctx.beginPath();
        ctx.arc(cx + 6, y + dh * 0.32, 9, 0, Math.PI * 2);
        ctx.arc(cx, y + dh * 0.7, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!lit || pm) ctx.fillRect(14, y + 8, 14, 14);
      if (!lit || alarm) ctx.fillRect(14, y + dh - 22, 14, 14);
    };
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,40,30,0.07)';
    draw(false);
    if (shown) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      draw(true);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,230,220,0.35)';
      draw(true);
      ctx.fillStyle = color;
      draw(true);
    }
    tex.needsUpdate = true;
  }, [c, ctx, tex, text, color, colonOn, shown, pm, alarm]);
  useLayoutEffect(() => () => tex.dispose(), [tex]);
  const faceMat = useMemo(() => new THREE.MeshBasicMaterial({map: tex}), [tex]);
  const haloMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}),
    [],
  );
  useLayoutEffect(() => () => { faceMat.dispose(); haloMat.dispose(); }, [faceMat, haloMat]);
  const b = Math.max(0, brightness) * (shown ? 1 : 0.15);
  useLayoutEffect(() => {
    faceMat.color.setScalar(0.9 + 0.7 * Math.max(0, brightness));
    haloMat.color.set(color).multiplyScalar(0.55 * b);
  });
  const {w, h, d} = CLOCK_SIZE;
  return (
    <group {...group}>
      <TBox size={[w, h, d]} r={0.022} color="#22242f" position={[0, h / 2 + 0.006, 0]} />
      <TBox size={[w * 0.5, 0.016, 0.05]} r={0.007} color="#9aa2b2" position={[0, h + 0.012, -0.012]} ink={0.004} />
      {[-1, 1].map((s) => (
        <TBox key={s} size={[0.03, 0.008, 0.07]} r={0.003} color="#14151c" position={[s * 0.09, 0.004, 0]} ink={false} />
      ))}
      <TBox size={[w - 0.03, h - 0.03, 0.006]} r={0.008} color="#100406" position={[0, CLOCK_FACE[1], d / 2 - 0.001]} ink={false} />
      <mesh geometry={geo.plane(w - 0.044, (w - 0.044) * (200 / 512))} material={faceMat} position={CLOCK_FACE} />
      <mesh geometry={geo.plane(0.36, 0.1)} material={haloMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0.1]} />
      <pointLight color={color} position={[0, 0.08, 0.16]} intensity={0.45 * b * light} distance={1.2} decay={1.6} />
    </group>
  );
};
