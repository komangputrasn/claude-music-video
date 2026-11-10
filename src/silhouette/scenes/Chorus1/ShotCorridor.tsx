// Chorus1 · shot C — 65.90 → 70.24. Line 14: "I'm done with 'upgrade to continue,'" (+ "click" of line 15 at 69.48)
// A monumental black wall with one tall slot: a corridor of gates running to a doorway of light. He stands small in
// the mouth, black against the lit corridor floor. The line is cut in light into the wall on either side of the slot
// (I'M DONE / WITH | UPGRADE TO / CONTINUE). From "upgrade" the gates shut one after another from the far end toward
// him (each closing leaf a red seam), cutting the light off bay by bay; the three bays nearest him stay open. "CLICK" lights
// over the lintel just before the cut.
import React, {useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric, measureLyric} from '../../lib/WorldLyric';
import {WetGround, Backlight, LightPool} from '../../lib/atmos';
import {Corridor} from '../../lib/sets';
import {bassAt, lerp} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';
import {guyIdle} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeOut, easeInOut, FacadeWithOpening, RIM_BONE} from './common';

export const SHOT_C = {t0: 65.9, t1: 70.24};
export const FOG_C = {color: S.ash, near: 30, far: 200};

const CW = 5; // corridor width
const CH = 7.5; // corridor height
const EM = 1.15; // inscription em (m)
const GAP = 1.6; // text ↔ slot edge
const ROW1 = 5.3; // baselines
const ROW2 = 3.75;
const EDGE = 13; // m: outer limit of the inscription (~84% of the visible half-width at the end of the push)

/** word centre targets for the split inscription: [left block right-aligned | right block left-aligned] */
const wordTargets = (size: number) => {
  const w = (s: string) => measureLyric(s, size).width;
  const sp = 0.42 * size;
  const xr = -(CW / 2 + GAP); // right edge of the left block
  const xl = CW / 2 + GAP; // left edge of the right block
  const wIm = w("I'M"), wDone = w('DONE'), wWith = w('WITH'), wUp = w('UPGRADE'), wTo = w('TO'), wCont = w('CONTINUE');
  return [
    {x: xr - wDone - sp - wIm / 2, y: ROW1},
    {x: xr - wDone / 2, y: ROW1},
    {x: xr - wWith / 2, y: ROW2},
    {x: xl + wUp / 2, y: ROW1},
    {x: xl + wUp + sp + wTo / 2, y: ROW1},
    {x: xl + wCont / 2, y: ROW2},
  ];
};

/** the inscription em: EM, unless the widest half (measured with the real font) would reach past EDGE */
const fitEm = () => {
  const w = (s: string) => measureLyric(s, EM).width;
  const sp = 0.42 * EM;
  const widest = Math.max(w("I'M") + sp + w('DONE'), w('WITH'), w('UPGRADE') + sp + w('TO'), w('CONTINUE'));
  return Math.min(EM, (EM * (EDGE - CW / 2 - GAP)) / widest);
};

export const ShotCorridor: React.FC<ShotProps> = ({t, f}) => {
  const u = prog(t, SHOT_C.t0, SHOT_C.t1);
  const e = easeOut(u);
  const bass = bassAt(f);
  const tUp = wordTime(14, 'upgrade');
  const tTo = wordTime(14, 'to');
  const tCont = wordTime(14, 'continue');
  // far → near: gates 7..2 shut in rhythm with the words; the bays nearest him stay open and lit (his backdrop)
  const closeAt: Record<number, number> = {7: tUp, 6: tUp + 0.24, 5: tUp + 0.48, 4: tTo, 3: tCont, 2: tCont + 0.32};
  const gateClose = (i: number) => (closeAt[i] === undefined ? 0 : easeInOut(prog(t, closeAt[i], closeAt[i] + 0.3)));
  const em = useMemo(fitEm, []);
  const targets = useMemo(() => wordTargets(em), [em]);
  return (
    <>
      <CameraRig position={[0, 3.9, lerp(31, 28, e)]} target={[0, 4.3, -100]} fov={cameraFovForVisible(26)} />
      <WetGround size={[120, 60]} position={[0, 0, 30.1]} reflectivity={0.85} puddles={0.55} time={t} color={GREYS.g1} />
      {/* board-formed concrete, self-lit just enough to read as a wall (g4 × ambient alone renders pure black) */}
      <FacadeWithOpening width={140} height={50} ow={CW} oh={CH} thick={1.2} color={GREYS.g6} ambient={0.17} />
      {/* haze deep in the corridor (behind him) */}
      <Backlight position={[0, 3.5, -30]} size={[8, 9]} shape="vertical" softness={0.9} intensity={0.35} time={t} />
      <Corridor position={[0, 0, -3.85]} length={78} width={CW} height={CH} gates={8} firstGate={7} time={t} gateClose={gateClose} endLight={0.85} pools={1.25} red={1 + 0.3 * bass} />
      {/* the line, cut in light into the wall either side of the slot */}
      <WorldLyric
        line={14}
        time={t}
        size={em}
        position={[0, 0, 0.12]}
        until={SHOT_C.t1 + 0.05}
        perWord={(i, w) => ({offset: [targets[i].x - (w.x + w.width / 2), targets[i].y - w.y, 0]})}
      />
      <WorldLyric
        line={15}
        time={t}
        size={0.95}
        position={[0, CH + 0.75, 0.12]}
        until={SHOT_C.t1 + 0.05}
        perWord={(i, w) => (i === 0 ? {offset: [-(w.x + w.width / 2), -w.y, 0]} : {visible: false})}
      />
      <LightPool position={[0, 0, -6.5]} radius={1.8} color={S.bone} intensity={0.7} haze={0.55} hazeHeight={2.6} />
      <SilGuy pose={guyIdle(t, 3)} rotation-y={Math.PI} position={[0, 0, -1.2]} rim={{...RIM_BONE, strength: 0.7}} />
    </>
  );
};
