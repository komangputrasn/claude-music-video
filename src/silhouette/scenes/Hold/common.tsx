/**
 * Hold — shared pieces of both shots: world layout, the man (hood up, phone at his LEFT ear, grandpa's hammer hanging
 * from his right hand, still except for his breath), the pillow's eye hanging over the black sea, and <LyricRows>
 * (a line laid out in explicit rows through <WorldLyric>, local copy of the pattern Swing uses).
 */
import React, {useMemo} from 'react';
import {S, SFONTS} from '../../lib/palette';
import {SilGuy} from '../../lib/SilCast';
import type {RimOpts} from '../../lib/Silhouette';
import {Backlight} from '../../lib/atmos';
import {PillowIris, HeldSilHammer, HeldSilPhone} from '../../lib/props';
import {WorldLyric, WorldLyricProps, WordFx, WordInfo, measureLyric} from '../../lib/WorldLyric';
import {guyIdle, mergePose, GuyPose} from '../../../lib/characters/Guy';
import {LINES} from '../../../lib/lyrics';
import {breathAt} from './timing';

export type V3 = [number, number, number];
export const deg = Math.PI / 180;

/** camera target for a level camera pitched up by `pitchDeg` along −Z */
export const pitchTarget = (cam: V3, pitchDeg: number): V3 => [cam[0], cam[1] + 100 * Math.tan(pitchDeg * deg), cam[2] - 100];

/** metres for `px` pixels (of the 1080 frame) at `dist` m, for a camera fov (deg, full frame) */
export const pxToM = (px: number, dist: number, camFov: number) => (px * 2 * dist * Math.tan((camFov * deg) / 2)) / 1080;

// ------------------------------------------------------------------------------------------------ world layout
/** the man stands on the sea at the origin, his back to the camera, facing the eye (−Z) */
export const MAN: V3 = [0, 0, 0];
/** the pillow's eye: a pillow the size of a building hanging over the horizon, its face (and eye) toward him */
export const PILLOW_POS: V3 = [0, 18.3, -74];
export const PILLOW_K = 30;
/** the pillow leans its face down toward him (the eye looks down at the man on the sea) */
export const PILLOW_TILT = 0.26;
/** extra puff (thickness scale): a fat cushion whose soft volume catches the eye's light, not a flat panel */
export const PILLOW_PUFF = 2.4;
/** pillow outline in world metres (upright: 0.66 × 0.46 local) */
export const PILLOW_W = 0.66 * PILLOW_K;
export const PILLOW_H = 0.46 * PILLOW_K;

// ------------------------------------------------------------------------------------------------ the man
const PHONE_L = {shoulderX: 0.89, shoulderZ: 0.26, shoulderY: 0.1, elbow: 2.6, twist: 0.12, wrist: 0.32, wristZ: -0.27, grip: 0.55, swing: 0};
const HAMMER_ARM = {shoulderX: 0.02, shoulderZ: 0.3, shoulderY: 0.0, elbow: 0.38, twist: 0.0, wrist: 0.0, wristZ: 0.0, grip: 1, swing: 0};

/** still pose: phone at the left ear, hammer hanging, head lifted a touch toward the eye; only the breath moves */
export const holdPose = (t: number): GuyPose => {
  const b = breathAt(t);
  const base = guyIdle(158, 5); // frozen idle (no head drift): nothing moves but the breath
  return mergePose(base, {
    t: 158,
    torsoBend: 0.015 + 0.012 * b,
    lean: 0,
    shrug: 0.02 + 0.075 * b,
    headPitch: -0.05,
    headYaw: 0,
    headTilt: 0.13,
    torsoTwist: 0,
    armL: PHONE_L,
    armR: HAMMER_ARM,
  });
};

/** the hammer hangs head-down from the fist (T silhouette), as in Swing/Cancel */
const HangingHammer: React.FC<{warmth: number; light: [number, number]}> = ({warmth, light}) => (
  <group rotation-x={Math.PI / 2}>
    <group rotation-z={Math.PI / 2}>
      <HeldSilHammer warmth={warmth} light={light} />
    </group>
  </group>
);

export const HoldGuy: React.FC<{t: number; rim?: RimOpts | null; phone: number; warmth: number}> = ({t, rim = null, phone, warmth}) => (
  <SilGuy
    pose={holdPose(t)}
    position={MAN}
    rotation-y={Math.PI}
    hood={1}
    fog={false}
    rim={rim}
    rightHand={<HangingHammer warmth={warmth} light={[0, 1]} />}
    leftHand={<HeldSilPhone open={1} screen={0.8 * phone} halo={0.3 * phone} keys={0.04 * phone} ext={0} />}
  />
);

// ------------------------------------------------------------------------------------------------ the pillow's eye
export type EyeProps = {
  time: number;
  open: number;
  talk: number;
  /** slow pupil swell in the near-silence (0..1) */
  breath?: number;
  /** pupil speech envelope (0..1): "Is that you?" */
  speak?: number;
  /** red light of the eye in the haze behind/around the pillow (0..1) — outlines the pillow, backlights him */
  corona: number;
  /** red seam/iris brightness */
  intensity?: number;
  rim?: number;
};

export const PillowEye: React.FC<EyeProps> = ({time, open, talk, breath = 0, speak = 0, corona, intensity = 1.6, rim = 0}) => (
  <group position={PILLOW_POS}>
    <group rotation-x={Math.PI / 2 + PILLOW_TILT} position={[0, 0, -0.06 * PILLOW_K * PILLOW_PUFF]}
      scale={[PILLOW_K, PILLOW_K * PILLOW_PUFF, PILLOW_K]}>
      <PillowIris
        open={open}
        talk={talk}
        time={time}
        pupil={0.26 + 0.05 * breath + 0.17 * speak}
        intensity={Math.min(1.4, intensity * (1 + 0.22 * speak))}
        glow={0.9}
        irisAt={0.0}
        fog={false}
        // the eye's light through the fabric: a soft red falloff on the pillow's puffy edges (all round, a touch more
        // on the lower edge toward him) — the soft volume is what makes it read as a pillow, not a flat screen
        rim={rim > 0 ? {color: S.authRed, strength: rim, power: 2.2, dir: [0, -1], dirMix: 0.3} : null}
      />
    </group>
    {corona > 0.001 ? (
      <>
        {/* the eye's red in the haze: a tight corona round the pillow, and a column of its light falling to the sea behind
            him (the sea carries it on toward the camera); the frame's edges stay black */}
        <Backlight position={[0, -0.5, -6]} size={[PILLOW_W * 1.75, PILLOW_H * 2.0]} shape="radial" softness={1} noise={0.25}
          time={time * 0.5} color={S.authRed} intensity={0.24 * corona * (1 + 0.12 * speak)} />
        <Backlight position={[0, -PILLOW_POS[1] * 0.5, -4]} size={[PILLOW_W * 1.25, PILLOW_POS[1] * 1.6]} shape="vertical"
          softness={1} noise={0.3} time={time * 0.4} color={S.authRed} intensity={0.16 * corona} />
        <Backlight position={[0, -6, -10]} size={[PILLOW_W * 5, PILLOW_H * 3.2]} shape="radial" softness={1} noise={0.3}
          time={time * 0.4} color={S.authRed} intensity={0.045 * corona} />
      </>
    ) : null}
  </group>
);

// ------------------------------------------------------------------------------------------------ lyric rows
const SPACE = 0.42; // em: WorldLyric's word gap
const CAP = 0.7;

export type LyricRowsProps = Omit<WorldLyricProps, 'perWord' | 'maxWidth' | 'align' | 'anchor' | 'line' | 'text'> & {
  line: number;
  rows: number[][];
  align?: 'left' | 'right' | 'center';
  anchor?: 'top' | 'center' | 'bottom';
  rowGap?: number;
  fx?: (i: number, info: WordInfo, slot: {row: number; x: number; y: number; w: number}) => WordFx;
};

/** a lyric line laid out in explicit rows (word indices); each word still appears exactly when it is sung */
export const LyricRows: React.FC<LyricRowsProps> = ({
  line, rows, align = 'center', anchor = 'center', rowGap, fx, size = 0.5, font = SFONTS.futura, weight = 500, tracking = 0.15,
  lineHeight = 1.18, ...rest
}) => {
  const slots = useMemo(() => {
    const words = LINES[line].words;
    const pitch = rowGap ?? lineHeight;
    const width = (i: number) => measureLyric(words[i].text, size, undefined, {font, weight, tracking}).width;
    const H = ((rows.length - 1) * pitch + CAP) * size;
    const top = anchor === 'top' ? 0 : anchor === 'bottom' ? H : H / 2;
    const map = new Map<number, {row: number; x: number; y: number; w: number}>();
    rows.forEach((row, r) => {
      const ws = row.map(width);
      const rowW = ws.reduce((a, v) => a + v, 0) + SPACE * size * Math.max(0, row.length - 1);
      let x = align === 'left' ? 0 : align === 'right' ? -rowW : -rowW / 2;
      const y = top - CAP * size - r * pitch * size;
      row.forEach((wi, k) => {
        map.set(wi, {row: r, x, y, w: ws[k]});
        x += ws[k] + SPACE * size;
      });
    });
    return map;
  }, [line, rows, align, anchor, size, font, weight, tracking, lineHeight, rowGap]);

  const perWord = (i: number, info: WordInfo): WordFx => {
    const s = slots.get(i);
    if (!s) return {visible: false};
    const e = fx ? fx(i, info, s) : {};
    const o = e.offset ?? [0, 0, 0];
    return {...e, offset: [s.x - info.x + o[0], s.y - info.y + o[1], o[2]]};
  };

  return (
    <WorldLyric line={line} size={size} font={font} weight={weight} tracking={tracking} lineHeight={lineHeight} align="left"
      anchor="top" perWord={perWord} {...rest} />
  );
};
