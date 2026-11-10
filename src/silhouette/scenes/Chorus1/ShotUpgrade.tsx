// Chorus1 · shot G — 83.31 → 87.63. Line 18: "I'm done with 'upgrade to continue,'" (+ "click" of line 19 at 87.30)
// A monumental black facade looked up at from the street: six giant screens in a 3 × 2 grid, dark until their word is
// sung — each one slams on with its word (I'M · DONE · WITH / UPGRADE · TO · CONTINUE), a sequence of light, then they
// all breathe on the bass. Terms scroll up the piers. He stands small at the foot, black against the lit entrance;
// over the entrance a small screen wakes with "CLICK" just before the cut.
import React, {useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric, measureLyric} from '../../lib/WorldLyric';
import {Backlight, WetGround} from '../../lib/atmos';
import {TenureScreen, TermsScroll, IrisWall, screenDims} from '../../lib/tenure';
import {bassAt, lerp} from '../../../lib/time';
import {LINES} from '../../../lib/lyrics';
import {guyIdle} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeOut, flashAfter, Slab, RIM_BONE} from './common';

export const SHOT_G = {t0: 83.31, t1: 87.63};
export const FOG_G = {color: S.ash, near: 60, far: 420};

const FZ = -60; // facade surface
const SW = 30; // screen face
const SH = 11.5;
const COLS = [-34, 0, 34];
const ROWS = [26.2, 12.6]; // base y of the top row / bottom row
const BLANK = {chrome: true, lines: []};
const DOOR = {w: 7, h: 4.6};
const SMW = 17, SMH = 5; // the small screen over the entrance
// word em on the big screens / on the small one, unless the widest word would fill more than FIT of its face
// (measured at runtime: >= 25% margin on any font)
const EM = 3.35;
const EM_CLICK = 2.9;
const FIT = 0.75;

export const ShotUpgrade: React.FC<ShotProps> = ({t, f}) => {
  const u = prog(t, SHOT_G.t0, SHOT_G.t1);
  const bass = bassAt(f);
  const words = LINES[18].words;
  const d = screenDims({width: SW, height: SH});
  const cell = (i: number) => ({x: COLS[i % 3], y: ROWS[i < 3 ? 0 : 1] + d.border + SH / 2});
  const tClick = LINES[19].words[0].start;
  const {em, emClick} = useMemo(() => ({
    em: Math.min(EM, (EM * FIT * SW) / Math.max(...LINES[18].words.map((w) => measureLyric(w.text, EM).width))),
    emClick: Math.min(EM_CLICK, (EM_CLICK * FIT * SMW) / measureLyric(LINES[19].words[0].text, EM_CLICK).width),
  }), []);
  const small = screenDims({width: SMW, height: SMH});
  return (
    <>
      <CameraRig position={[0, 1.3, lerp(44, 40, easeOut(u))]} target={[0, 19.5, FZ]} fov={cameraFovForVisible(30)} />
      <WetGround size={[400, 220]} position={[0, 0, 30]} reflectivity={0.85} puddles={0.55} time={t} color={GREYS.g1} />
      <Slab size={[190, 95, 6]} position={[0, 0, FZ - 3]} color={GREYS.g3} ambient={0.035} />
      {/* the lit entrance at the foot of the facade: his backlight */}
      <Backlight position={[0, DOOR.h / 2, FZ + 0.3]} size={[DOOR.w, DOOR.h]} shape="slab" softness={0.25} intensity={0.85} time={t} />
      <Backlight position={[0, 2, FZ + 2]} size={[46, 8]} shape="radial" softness={1} intensity={0.3} time={t} />
      {/* six screens, each dark until its word */}
      {words.map((w, i) => {
        const c = cell(i);
        const on = t >= w.start;
        const fl = flashAfter(t, w.start, 7);
        return (
          <TenureScreen
            key={i}
            position={[c.x, ROWS[i < 3 ? 0 : 1], FZ]}
            width={SW}
            height={SH}
            content={BLANK}
            time={t + i * 0.7}
            intensity={on ? 1.0 + 0.6 * fl : 0.12}
            pulse={on ? bass : 0}
            haze={on ? 0.32 : 0.05}
          />
        );
      })}
      <WorldLyric
        line={18}
        time={t}
        mode="screen"
        size={em}
        position={[0, 0, FZ + d.depth + 0.07]}
        until={SHOT_G.t1 + 0.05}
        perWord={(i, w) => {
          const c = cell(i);
          return {offset: [c.x - (w.x + w.width / 2), c.y - (w.y + 0.35 * em), 0]};
        }}
      />
      {/* the building watches: a band of irises above the grid; a pulse ripples out from the centre on the downbeat */}
      <IrisWall position={[0, 40.5, FZ + 0.05]} cols={56} rows={4} spacing={1.95} radius={0.72} time={t} pupil={0.3 + 0.05 * bass} intensity={1.15}
        wave={{center: [0, 3], start: 85.47, speed: 30, width: 7, mode: 'pulse'}} blink={0.05} seed={8} />
      {/* terms scrolling up the piers either side of the grid */}
      {[-1, 1].map((s) => (
        <TermsScroll key={s} position={[s * 66, 6, FZ + 0.25]} width={22} height={52} fontSize={1.05} speed={1.6} time={t} seed={s > 0 ? 8 : 9} intensity={0.5} />
      ))}
      {/* the small screen over the entrance: CLICK */}
      <TenureScreen position={[0, 5.6, FZ]} width={SMW} height={SMH} content={BLANK} time={t} intensity={t >= tClick ? 1.1 + 0.5 * flashAfter(t, tClick, 7) : 0.12} haze={t >= tClick ? 0.25 : 0.04} />
      <WorldLyric
        line={19}
        time={t}
        mode="screen"
        size={emClick}
        position={[0, 5.6 + small.border + SMH / 2, FZ + small.depth + 0.07]}
        until={SHOT_G.t1 + 0.05}
        perWord={(i, w) => (i === 0 ? {offset: [-(w.x + w.width / 2), -(w.y + 0.35 * emClick), 0]} : {visible: false})}
      />
      <SilGuy pose={{...guyIdle(t, 7), headPitch: -0.28}} rotation-y={Math.PI} position={[0, 0, -16]} rim={{...RIM_BONE, strength: 0.8}} />
    </>
  );
};
