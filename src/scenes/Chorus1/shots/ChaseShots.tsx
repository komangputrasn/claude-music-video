// "Click to cancel": a giant 3D cursor tries to click a CANCEL button that hops away on every beat.
import React from 'react';
import {CameraRig} from '../../../lib/three';
import {SparkleField} from '../../../lib/three/fx';
import {Cursor3D, clickAt} from '../../../lib/ui';
import {Pancake, pancakeWalk, pancakeHappy, mixPose as mixDog} from '../../../lib/characters/Pancake';
import {lerp, clamp01} from '../../../lib/time';
import {World} from '../World';
import {RunawayButton} from '../RunawayButton';
import {K, beatL} from '../timing';
import {ShotProps, decoAt, mix3, smooth, easeOut, V3, projectPx} from './common';
import type {CamState} from './common';
import {Starburst} from '../../../lib/ui';
import {popIn} from '../../../lib/time';

const DONE = decoAt(9999, 0);
const HOP = 9; // frames per hop
const BTN_TOP = 0.34 + 0.56; // leg + body height

type Chase = {clicks: number[]; spots: V3[]; exit: V3; exitAt: number; hoverY: number};

/** button + cursor state for a chase at local frame lf */
const chaseAt = (c: Chase, lf: number) => {
  const {clicks, spots} = c;
  // ---- button
  let pos: V3 = spots[0];
  let hop = 0, squash = 0, run = 0, runAmount = 0, look = 0;
  for (let i = 0; i < clicks.length; i++) {
    const s = clicks[i] - 4; // dodge starts just before the click lands
    if (lf >= s) {
      const k = clamp01((lf - s) / HOP);
      pos = mix3(spots[i], spots[i + 1], smooth(k));
      hop = Math.sin(k * Math.PI) * 0.75;
      squash = k < 0.15 ? -0.6 * (k / 0.15) : k < 0.85 ? 0.5 : -0.7 * (1 - (k - 0.85) / 0.15);
      if (k >= 1) {
        const after = lf - s - HOP;
        squash = after < 5 ? -0.35 * Math.exp(-after / 2) * Math.cos(after * 1.2) : 0;
        hop = 0;
      }
      look = spots[i + 1][0] > spots[i][0] ? -1 : 1;
      runAmount = k > 0 && k < 1 ? 1 : 0;
      run = (lf - s) / 6;
    }
  }
  if (lf >= c.exitAt) {
    const k = clamp01((lf - c.exitAt) / 28);
    pos = mix3(spots[clicks.length], c.exit, easeOut(k) * 0.4 + k * 0.6);
    run = (lf - c.exitAt) / 4.5;
    runAmount = k < 1 ? 1 : 0;
    hop = Math.abs(Math.sin(run * Math.PI)) * 0.12;
    squash = 0;
    look = -1;
  }
  // ---- cursor
  const clickPos = (p: V3): V3 => [p[0] + 0.1, BTN_TOP * 0.9, p[2] + 0.3];
  const hover = (p: V3): V3 => [p[0] + 0.6, c.hoverY, p[2] + 0.9];
  let cur: V3 = hover(spots[0]);
  let click = 0;
  const first = clicks[0];
  // swoop in
  if (lf < first - 8) cur = mix3([spots[0][0] - 5, 4.5, spots[0][2] + 1], hover(spots[0]), easeOut((lf - (first - 30)) / 22));
  for (let i = 0; i < clicks.length; i++) {
    const ci = clicks[i];
    const prevEnd = i === 0 ? first - 8 : clicks[i - 1] + 3;
    if (lf >= prevEnd) {
      if (lf < ci - 4) cur = mix3(i === 0 ? hover(spots[0]) : clickPos(spots[i - 1]), hover(spots[i]), smooth((lf - prevEnd) / Math.max(1, ci - 4 - prevEnd)));
      else if (lf < ci) cur = mix3(hover(spots[i]), clickPos(spots[i]), easeOut((lf - (ci - 4)) / 4));
      else cur = clickPos(spots[i]);
    }
    const ck = clickAt(lf, ci, 12);
    if (ck > 0 && ck < 1) click = ck;
  }
  // after the escape the cursor gives chase (lagging behind the button)
  if (lf >= c.exitAt + 3) {
    const k = easeOut((lf - c.exitAt - 3) / 22);
    cur = mix3(cur, [pos[0] - 1.1, c.hoverY - 0.2, pos[2] + 0.6], k * 0.85);
  }
  return {pos, hop, squash, run, runAmount, look, cur, click};
};

// ------------------------------------------------------------------ S07
const C1: V3 = [0.5, 0, 16];
const CHASE1: Chase = {
  clicks: [360, 376, 391, Math.round(K.cancel1)],
  spots: [[0, 0, 0], [-2.3, 0, 0.5], [1.9, 0, -0.4], [-0.7, 0, 0.7], [2.4, 0, 0.1]],
  exit: [10, 0, -1.5],
  exitAt: Math.round(K.cancel1) + 10,
  hoverY: BTN_TOP + 1.0,
};

const SPAM1 = [418, 424, 430];
const cam1 = (f: number, lf: number): CamState => {
  const s = chaseAt(CHASE1, lf);
  const b = beatL(lf);
  const camX = C1[0] + s.pos[0] * 0.35;
  const shake = s.click > 0 && s.click < 0.3 ? 0.02 : 0;
  return {pos: [camX + shake, 1.35, C1[2] + 5.0 - smooth(f / 88) * 0.6], target: [camX, 0.8, C1[2]], fov: 52 - 1.5 * b.pulse, roll: 0.04};
};

/** S07 (352-440): "click to cancel" — the cursor clicks on the beats, the CANCEL button dodges every time. */
export const Chase1: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const s = chaseAt(CHASE1, lf);
  // spam clicks after the button escapes
  const spam = SPAM1.map((x) => clickAt(lf, x, 10)).find((x) => x > 0 && x < 1) ?? 0;
  const c = cam1(f, lf);
  return (
    <>
      <CameraRig position={c.pos} target={c.target} fov={c.fov} roll={c.roll} />
      <World t={t} deco={{...DONE, t}} flare={0.5} />
      <group position={C1}>
        <RunawayButton position={s.pos} run={s.run} runAmount={s.runAmount} squash={s.squash} hop={s.hop} look={s.look} rotation={[0, s.look * -0.25, 0]} />
        <Cursor3D kind="hand" size={1.0} position={s.cur} rotation={[-0.25, -0.15, 0.1]} click={s.click || spam} />
        <SparkleField count={14} seed={77} area={[6, 2, 2]} time={t} position={[0, 1.2, 0]} size={0.3} intensity={1.2} />
      </group>
    </>
  );
};

// ------------------------------------------------------------------ S16 (with Pancake)
const C2: V3 = [-3.5, 0, 15];
const CHASE2: Chase = {
  clicks: [Math.round(K.click2) + 2, 906, Math.round(K.cancel2), 944],
  spots: [[0.8, 0, 0], [-1.6, 0, 0.6], [1.6, 0, 0.2], [-0.4, 0, 0.9], [2.0, 0, -0.2]],
  exit: [9, 0, -2],
  exitAt: 950,
  hoverY: BTN_TOP + 0.55,
};

const cam2 = (f: number, lf: number): CamState => {
  const s = chaseAt(CHASE2, lf);
  const b = beatL(lf);
  const x = C2[0] + s.pos[0] * 0.35 + 0.3;
  return {pos: [x, 0.7, C2[2] + 4.0 - smooth(f / 80) * 0.5], target: [x - 0.2, 0.62, C2[2]], fov: 56 - 2 * b.pulse, roll: -0.05};
};

/** S16 (881-962): chase #2 at dog level — Pancake gallops after the button too. */
export const Chase2: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const s = chaseAt(CHASE2, lf);
  // Pancake follows the button with a lag
  const lag = chaseAt(CHASE2, lf - 7);
  const dp: V3 = [lag.pos[0] - 0.9, 0, lag.pos[2] + 0.9];
  const ahead = chaseAt(CHASE2, lf - 4).pos;
  const yaw = Math.atan2(ahead[0] - 0.9 - dp[0] + 0.001, ahead[2] + 0.9 - dp[2] + 0.12);
  const moving = Math.hypot(ahead[0] - lag.pos[0], ahead[2] - lag.pos[2]) > 0.05 ? 1 : 0;
  const dogPose = mixDog(pancakeHappy(t, 2, true), {...pancakeWalk(t, 1.6, 2), tailWag: t * 6, tailWagAmount: 1, eyes: 'happy', tongue: 0.8, mouthOpen: 0.6, earPerk: 0.6}, moving);
  const c = cam2(f, lf);
  return (
    <>
      <CameraRig position={c.pos} target={c.target} fov={c.fov} roll={c.roll} />
      <World t={t} deco={{...DONE, t}} flare={0.5} />
      <group position={C2}>
        <RunawayButton position={s.pos} run={s.run} runAmount={s.runAmount} squash={s.squash} hop={s.hop} look={s.look} rotation={[0, s.look * -0.25, 0]} />
        <Cursor3D kind="arrow" size={0.72} position={s.cur} rotation={[-0.2, -0.2, 0.05]} click={s.click} />
        <Pancake position={dp} rotation={[0, yaw, 0]} pose={dogPose} />
      </group>
    </>
  );
};

// ------------------------------------------------------------------ "MISS!" bursts (2D, projected onto the cursor tip)
type Burst = {at: number; text: string; color: string; textColor: string; rot: number};
const BURST_LIFE = 11;
const Bursts: React.FC<{bursts: Burst[]; lf: number; f: number; chase: Chase; origin: V3; cam: (f: number, lf: number) => CamState}> = ({bursts, lf, f, chase, origin, cam}) => {
  const c = cam(f, lf);
  return (
    <>
      {bursts.map((b, i) => {
        const k = lf - b.at;
        if (k < 0 || k > BURST_LIFE) return null;
        const tip = chaseAt(chase, b.at).cur;
        const [x, y] = projectPx([origin[0] + tip[0], origin[1] + tip[1] + 0.25, origin[2] + tip[2]], c);
        const sc = popIn(lf, b.at, 7);
        const fade = k > BURST_LIFE - 4 ? (BURST_LIFE - k) / 4 : 1;
        return (
          <Starburst key={i} text={b.text} color={b.color} textColor={b.textColor} size={250} points={14} x={Math.min(1700, Math.max(220, x + 40))}
            y={Math.min(720, Math.max(170, y - 140 - k * 3))} scale={sc} rotate={b.rot} opacity={fade} />
        );
      })}
    </>
  );
};

const B1: Burst[] = [
  {at: CHASE1.clicks[0], text: 'MISS!', color: '#FFE135', textColor: '#E2231A', rot: -10},
  {at: CHASE1.clicks[1], text: 'NOPE!', color: '#FF9AD8', textColor: '#1B1030', rot: 8},
  {at: CHASE1.clicks[2], text: 'MISS!', color: '#9BFF3A', textColor: '#1B1030', rot: -6},
  {at: CHASE1.clicks[3], text: 'ERROR', color: '#FFD23A', textColor: '#E2231A', rot: 10},
];
const B2: Burst[] = [
  {at: CHASE2.clicks[0], text: 'MISS!', color: '#FFE135', textColor: '#E2231A', rot: 9},
  {at: CHASE2.clicks[1], text: 'NOPE!', color: '#7FE6FF', textColor: '#1B1030', rot: -8},
  {at: CHASE2.clicks[2], text: 'NOPE!', color: '#FF9AD8', textColor: '#1B1030', rot: 6},
  {at: CHASE2.clicks[3], text: 'MISS!', color: '#9BFF3A', textColor: '#1B1030', rot: -10},
];
export const Chase1Over: React.FC<ShotProps> = ({f, lf}) => <Bursts bursts={B1} lf={lf} f={f} chase={CHASE1} origin={C1} cam={cam1} />;
export const Chase2Over: React.FC<ShotProps> = ({f, lf}) => <Bursts bursts={B2} lf={lf} f={f} chase={CHASE2} origin={C2} cam={cam2} />;
