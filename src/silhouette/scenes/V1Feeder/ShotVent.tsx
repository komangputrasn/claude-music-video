/**
 * Shot VENT — scene-local 126–262 (abs 1026–1162, song 34.20–38.77). [5] "Amazon took it back once, and they can take it away."
 * Frontal, symmetrical, inside the cell (front wall removed), slow push-in with a slight crane up. He stands back
 * three-quarter in front of the slatted back wall, leaning over the small light of the page in his hands (no rim: the
 * hood's drape would catch it). From "took" the book's words peel off the page as ash and are pulled up into the
 * ceiling vent, turning red as TENURE swallows them; the sung words rise with them, row by row, out of the page's light,
 * converge on the grille and go red. On "take it away" the page is blank.
 */
import React from 'react';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {S, cameraFovForVisible} from '../../lib/palette';
import {CellRoom, CELL_SPOTS} from '../../lib/sets';
import {HeldSilEReader, GlowBillboard, HungSilHammer} from '../../lib/props';
import {LightShaft} from '../../lib/atmos';
import {bassAt, noise1, clamp01} from '../../../lib/time';
import {T_CUT, W, bookLoss, lin, scanAt, sm, smooth} from './timing';
import {RowLyric, RowSlot, V3, lerp3, readerMatrix, readerPage} from './parts';
import {GUY_SPOT, GUY_YAW, readPose} from './common';
import type {WordFx, WordInfo} from '../../lib/WorldLyric';

const ROWS = [[0], [1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];
const EM = 0.114;
const VENT: V3 = [CELL_SPOTS.vent[0], CELL_SPOTS.vent[1] - 0.04, CELL_SPOTS.vent[2]];

/** rising rows: slow while sung (legible), then accelerating up into the vent; red + shrink + fade at the grille */
const rowFx = (t: number, spawn: V3, red: boolean) => (i: number, _info: WordInfo, slot: RowSlot): WordFx => {
  const s = Math.max(0, t - slot.rowStart);
  const rise = 0.23 * s + 0.1 * s * s;
  const H = VENT[1] - spawn[1];
  const k = rise / H;
  if (k >= 1) return {visible: false};
  const pull = smooth((k - 0.4) / 0.6);
  // the row moves as one piece: its centre is drawn to the vent, and it contracts around that centre as it shrinks
  const scale = 1 - 0.8 * smooth((k - 0.62) / 0.38);
  const wcx = slot.x + slot.width / 2;
  const sway = 0.045 * noise1(t * 0.55 + slot.row * 1.7, 5) * smooth(k / 0.25) * (1 - pull);
  const dx = (VENT[0] - spawn[0] - slot.rowCx) * pull + (wcx - slot.rowCx) * (scale - 1) + sway;
  const redK = smooth((k - 0.5) / 0.32);
  const fade = 1 - smooth((k - 0.84) / 0.16);
  const op = fade * (red ? redK : 1 - redK);
  return {
    offset: [dx, rise - slot.y, (VENT[2] - spawn[2]) * pull],
    rotation: [0, 0, 0.08 * noise1(t * 0.4 + slot.row, 7) * smooth(k / 0.5)],
    scale,
    opacity: op,
    visible: op > 0.003,
  };
};

export const ShotVent: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const u = lin(t, T_CUT.vent, T_CUT.feeder);
  // on "take it away" he lifts his head from the emptying page to the vent that takes it (the arm stays: the page stays put)
  const look = sm(t, W.take - 0.35, W.away + 0.25);
  // in this back three-quarter wide the hood's back drape swings out behind a bowed head (a grey "trunk" against the
  // bright slats), so here the bow over the page comes from the torso, not the neck
  const r0 = readPose(t);
  const base = {...r0, headPitch: (r0.headPitch ?? 0) - 0.68, torsoBend: (r0.torsoBend ?? 0) + 0.14};
  const pose = {...base, headPitch: (base.headPitch ?? 0) - 0.45 * look, headYaw: -0.25 * look};
  const pg = readerPage(readerMatrix(base, GUY_SPOT, GUY_YAW));
  const bass = bassAt(abs);
  // the book's words leave from "took" and the page is blank by "away"
  const prog = bookLoss(t);
  // the vent breathes red with the bass while it swallows
  const swallow = sm(t, W.took, W.took + 0.8);
  const ventK = 0.45 + 0.3 * swallow + 0.25 * swallow * bass;
  const cam = lerp3([0.06, 1.62, 5.4], [0.04, 1.74, 4.85], smooth(u));
  const target = lerp3([0.02, 1.86, -0.6], [0.0, 1.95, -0.6], smooth(u));
  const spawn: V3 = [pg.center[0] - 0.47, pg.center[1] + 0.14, pg.center[2] + 0.02];
  return (
    <>
      <CameraRig position={cam} target={target} fov={cameraFovForVisible(21)} />
      <CellRoom time={t} blinds={{angle: 0.86}} ambient={0.05} vent={ventK} slit={0.45} doorIris={false} hideWalls={['front']} hide={['facade', 'outside']}
        windowLight={{dir: [0.25, -0.15, -1], intensity: 0.8 * (1 + 0.08 * bass), scan: scanAt(t), scanIntensity: 1.3}}>
        <SilGuy position={GUY_SPOT} rotation-y={GUY_YAW} pose={pose}
          rightHand={<HeldSilEReader progress={prog} vent={VENT} flakeSize={2.6} flakes={6} ventRed={1.2} />} />
        {/* the page's own light: a small soft glow at the page (it is a screen in the dark) */}
        <GlowBillboard position={[pg.center[0], pg.center[1] + 0.03, pg.center[2] - 0.05]} color={S.bone} intensity={0.55 * (1 - 0.45 * clamp01(prog))} size={0.42} falloff={2.6} />
        {/* the vent's pull: a faint red funnel of light from the grille down toward his hands (the ash rises in it) */}
        <LightShaft from={[VENT[0], VENT[1] + 0.02, VENT[2]]} to={[pg.center[0], pg.center[1] + 0.12, pg.center[2]]} radiusStart={0.24}
          radiusEnd={0.05} color={S.authRed} intensity={0.16 + 0.2 * swallow + 0.1 * swallow * bass} falloff={2.2} softness={2.2}
          striation={0.6} source={0} ground={-1e4} time={t} />
        {/* grandpa's hammer is always on its pegs (black here: no gold before the impact) */}
        <HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false} warmth={0} />
      </CellRoom>
      <RowLyric line={5} rows={ROWS} time={t} size={EM} weight={500} position={spawn} anchor="top" fx={rowFx(t, spawn, false)} intensity={1.05} halo={0.3} />
      <RowLyric line={5} rows={ROWS} time={t} size={EM} weight={500} position={spawn} anchor="top" fx={rowFx(t, spawn, true)} color={S.authRed} intensity={1.1} halo={0.4} />
    </>
  );
};
