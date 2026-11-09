/**
 * Y2K UI kit — <PopupStorm>: a deterministic cascade of overlapping dialogs popping in on a schedule (2D).
 *
 * API
 *   <PopupStorm frame seed? count={24} area?={{x,y,w,h}} kinds? messages? start={0} interval={4} accelerate={0.5}
 *               popDur={7} scale={1} scaleJitter={0.12} cascade={6} step={30} inactiveBelow={false}
 *               stamps?={{start, interval, text?, color?}}/>
 *     - popup i appears at schedule(i) (frames; `accelerate` 0..1 shrinks the gaps so the storm builds up).
 *     - popups come in cascading chains of `cascade` windows offset by `step` px, each chain at a seeded spot inside `area`
 *       (default: the frame minus the 230 px caption zone).
 *     - inactiveBelow: only the newest popup keeps an active (saturated blue) title bar (authentic, but paler overall).
 *     - stamps: CANCELLED stamps slam onto popups one by one starting at stamps.start.
 *   stormSchedule(i, {start, interval, accelerate, count}) -> appear frame of popup i
 *
 * Usage
 *   <AbsoluteFill><PopupStorm frame={frame} seed="chorus" count={30} start={10} interval={5} scale={1.3}/></AbsoluteFill>
 */
import React from 'react';
import {popIn, rand} from '../time';
import type {DialogKind, DialogSpec} from './widgets';
import {Dialog, dialogSize} from './Win';
import {POPUP_MESSAGES, pickMessage} from './messages';

export type StormArea = {x: number; y: number; w: number; h: number};
export type PopupStormProps = {
  frame: number;
  seed?: string | number;
  count?: number;
  area?: StormArea;
  kinds?: DialogKind[];
  messages?: DialogSpec[];
  start?: number;
  interval?: number;
  accelerate?: number;
  popDur?: number;
  scale?: number;
  scaleJitter?: number;
  cascade?: number;
  step?: number;
  inactiveBelow?: boolean;
  stamps?: {start: number; interval: number; text?: string; color?: string; dur?: number};
};

export const stormSchedule = (i: number, o: {start?: number; interval?: number; accelerate?: number; count?: number}) => {
  const start = o.start ?? 0, iv = o.interval ?? 4, acc = Math.max(0, Math.min(0.95, o.accelerate ?? 0.5)), n = Math.max(1, o.count ?? 24);
  // sum of shrinking gaps: gap_j = iv * (1 - acc * j / n)
  return start + iv * (i - (acc * (i * (i - 1)) / 2) / n);
};

export const PopupStorm: React.FC<PopupStormProps> = ({
  frame, seed = 'storm', count = 24, area = {x: 40, y: 30, w: 1840, h: 800}, kinds, messages, start = 0, interval = 4, accelerate = 0.5,
  popDur = 7, scale = 1, scaleJitter = 0.12, cascade = 6, step = 30, inactiveBelow = false, stamps,
}) => {
  const items: React.ReactNode[] = [];
  let newest = -1;
  const sched: number[] = [];
  for (let i = 0; i < count; i++) {
    sched.push(stormSchedule(i, {start, interval, accelerate, count}));
    if (frame >= sched[i]) newest = i;
  }
  let chainX = 0, chainY = 0;
  for (let i = 0; i <= newest; i++) {
    const r = (k: string) => rand(`${seed}-${i}-${k}`);
    const spec: DialogSpec = messages?.length
      ? messages[Math.floor(r('m') * messages.length) % messages.length]
      : kinds?.length
        ? pickMessage(`${seed}-${i}`, kinds)
        : POPUP_MESSAGES[Math.floor(r('m') * POPUP_MESSAGES.length) % POPUP_MESSAGES.length];
    const sc = scale * (1 + (r('s') - 0.5) * 2 * scaleJitter);
    const {w, h} = dialogSize(spec);
    const W = w * sc, H = h * sc;
    const inChain = i % Math.max(1, cascade);
    if (inChain === 0) {
      // stratified: chains visit a shuffled 3x2 grid of cells so the storm covers the whole area
      const chain = Math.floor(i / Math.max(1, cascade));
      const cells = [0, 1, 2, 3, 4, 5].sort((a, b) => rand(`${seed}-cell-${a}`) - rand(`${seed}-cell-${b}`));
      const cell = cells[chain % 6];
      const room = Math.max(0, cascade - 1) * step;
      const spanX = Math.max(0, area.w - W - room), spanY = Math.max(0, area.h - H - room);
      chainX = area.x + ((cell % 3) + r('cx')) / 3 * spanX;
      chainY = area.y + (Math.floor(cell / 3) + r('cy')) / 2 * spanY;
    }
    const x = Math.min(area.x + area.w - W, chainX + inChain * step);
    const y = Math.min(area.y + area.h - H, chainY + inChain * step);
    const p = popIn(frame, sched[i], popDur);
    const stampP = stamps ? Math.max(0, Math.min(1, (frame - (stamps.start + i * stamps.interval)) / (stamps.dur ?? 12))) : undefined;
    items.push(
      <Dialog
        key={i}
        {...spec}
        active={inactiveBelow ? i === newest : spec.active}
        x={x + W / 2}
        y={y + H / 2}
        anchor="center"
        scale={sc * (0.35 + 0.65 * p)}
        opacity={Math.min(1, p * 3)}
        stamp={stampP !== undefined && stampP > 0 ? {text: stamps?.text ?? 'CANCELLED', color: stamps?.color, seed: i, rotation: -18 + r('sr') * 14} : undefined}
        stampProgress={stampP !== undefined && stampP > 0 && stampP < 1 ? stampP : undefined}
      />,
    );
  }
  return <>{items}</>;
};
