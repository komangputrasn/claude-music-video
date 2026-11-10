/**
 * Shot VENT — scene-local 126–262 (abs 1026–1162, song 34.20–38.77). [5] "Amazon took it back once, and they can take it away."
 * Frontal, symmetrical, inside the cell (front wall removed), slow push-in with a slight crane up. He stands back
 * three-quarter in front of the slatted back wall, bowed over the small light of the page in his hands (a thin bone rim
 * from above). From "took" the book's words peel off the page as ash and are pulled up into the ceiling vent, turning red
 * as TENURE swallows them; the sung words rise with them, row by row, out of the page's light, converge on the grille and
 * go red. On "and they can" he raises the emptying reader overhead toward the vent and looks up at it; the reader turns
 * in his fist so its page faces down at him (and at the camera behind him): on "take it away" it is a blank pale page
 * held up against the dark wall above the slat light, the last ash leaving it.
 */
import React from 'react';
import * as THREE from 'three';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {S, cameraFovForVisible} from '../../lib/palette';
import {CellRoom, CELL_SPOTS} from '../../lib/sets';
import {HeldSilEReader, GlowBillboard, HungSilHammer} from '../../lib/props';
import {LightShaft} from '../../lib/atmos';
import {bassAt, noise1, clamp01} from '../../../lib/time';
import {GuyArmPose, GuyPose, guyPoint, mixPose} from '../../../lib/characters/Guy';
import {T_CUT, W, bookLoss, lin, scanAt, sm, smooth} from './timing';
import {RD, READ_ROT, RowLyric, RowSlot, V3, gripMatrix, lerp3, readerMatrix, readerPage} from './parts';
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
  // bone -> red: a quick, slightly staggered handover (the white is nearly gone before the red is up), so the row never
  // sits in an additive white + red mix, which reads pink/coral, not red
  const fade = 1 - smooth((k - 0.84) / 0.16);
  const op = fade * (red ? smooth((k - 0.54) / 0.12) : 1 - smooth((k - 0.5) / 0.12));
  return {
    offset: [dx, rise - slot.y, (VENT[2] - spawn[2]) * pull],
    rotation: [0, 0, 0.08 * noise1(t * 0.4 + slot.row, 7) * smooth(k / 0.5)],
    scale,
    opacity: op,
    visible: op > 0.003,
  };
};

/** "and they can take it away": the right arm raised overhead, a little forward (the reader just above his hood) */
const RAISE_ARM: GuyArmPose = {shoulderX: 2.7, shoulderZ: 0.1, shoulderY: 0, elbow: 0.35, twist: 0, wrist: 0, wristZ: 0, grip: 1, swing: 0};
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * The reader's turn in his fist at the top of the raise (grip frame): its page faces halfway between his eyes and the
 * camera, text-up = world up. So the frontal wide sees the blank page almost face-on (cos ≈ 0.95), ~37 × 48 px, just
 * above his hood against the dark wall over the slat light (probed numerically; the 'read' grip alone keeps it edge-on).
 */
const raiseTurn = (pose: GuyPose, cam: V3) => {
  const qG = new THREE.Quaternion();
  gripMatrix(pose, GUY_SPOT, GUY_YAW).decompose(new THREE.Vector3(), qG, new THREE.Vector3());
  const c = new THREE.Vector3(0, RD.sy, RD.d / 2).applyMatrix4(readerMatrix(pose, GUY_SPOT, GUY_YAW));
  const eyes = new THREE.Vector3(...guyPoint(pose, 'head')).applyAxisAngle(Y_AXIS, GUY_YAW).add(new THREE.Vector3(...GUY_SPOT));
  const n = eyes.sub(c).normalize().add(new THREE.Vector3(...cam).sub(c).normalize()).normalize();
  const u = Y_AXIS.clone().addScaledVector(n, -n.y).normalize();
  const x = new THREE.Vector3().crossVectors(u, n);
  const qd = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, u, n));
  const qH = new THREE.Quaternion().setFromEuler(new THREE.Euler(...READ_ROT));
  return qG.invert().multiply(qd).multiply(qH.invert());
};

export const ShotVent: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const u = lin(t, T_CUT.vent, T_CUT.feeder);
  const cam = lerp3([0.06, 1.62, 5.4], [0.04, 1.74, 4.85], smooth(u));
  const target = lerp3([0.02, 1.86, -0.6], [0.0, 1.95, -0.6], smooth(u));
  // reading: bowed over the page (head + a little torso lean; the skinned cowl holds the bow from this back three-quarter)
  const r0 = readPose(t);
  const base = {...r0, headPitch: (r0.headPitch ?? 0) - 0.25, torsoBend: (r0.torsoBend ?? 0) + 0.14};
  // "and they can take it away": he raises the emptying reader overhead toward the vent and looks up at it; the reader
  // turns in his fist so its blank page faces down at him (and at us)
  const lift = sm(t, W.and5 + 0.05, W.take + 0.3);
  const look = sm(t, W.and5 + 0.2, W.take + 0.5);
  const raised: GuyPose = {...base, armR: RAISE_ARM, torsoBend: 0.02};
  const pose: GuyPose = lift > 0
    ? {...mixPose(base, raised, lift), headPitch: (base.headPitch ?? 0) + (-0.5 - (base.headPitch ?? 0)) * look, headYaw: 0}
    : base;
  const turn = new THREE.Quaternion().slerp(raiseTurn(raised, cam), lift);
  const pg = readerPage(readerMatrix(base, GUY_SPOT, GUY_YAW));
  const pgNow = lift > 0 ? readerPage(readerMatrix(pose, GUY_SPOT, GUY_YAW, turn)) : pg;
  const bass = bassAt(abs);
  // the book's words leave from "took" and the page is blank from "take it" (bookLoss)
  const prog = bookLoss(t);
  // the vent breathes red with the bass while it swallows
  const swallow = sm(t, W.took, W.took + 0.8);
  const ventK = 0.45 + 0.3 * swallow + 0.25 * swallow * bass;
  // the funnel reaches down for the book: its end follows the raised reader but stops ~0.17 m above the page (no red on it)
  const funnelTo = lerp3([pg.center[0], pg.center[1] + 0.12, pg.center[2]], [pgNow.center[0], pgNow.center[1] + 0.17, pgNow.center[2]], lift);
  const spawn: V3 = [pg.center[0] - 0.47, pg.center[1] + 0.14, pg.center[2] + 0.02];
  return (
    <>
      <CameraRig position={cam} target={target} fov={cameraFovForVisible(21)} />
      <CellRoom time={t} blinds={{angle: 0.86}} ambient={0.05} vent={ventK} slit={0.45} doorIris={false} hideWalls={['front']} hide={['facade', 'outside']}
        windowLight={{dir: [0.25, -0.15, -1], intensity: 0.8 * (1 + 0.08 * bass), scan: scanAt(t), scanIntensity: 1.3}}>
        <SilGuy position={GUY_SPOT} rotation-y={GUY_YAW} pose={pose} rim={{color: S.bone, strength: 0.5, power: 7, dir: [0, 1]}}
          rightHand={<group quaternion={turn}><HeldSilEReader progress={prog} vent={VENT} flakeSize={2.6} flakes={6} ventRed={1.2} /></group>} />
        {/* the page's own light: a small soft glow behind the page (it is a screen in the dark); it rises with the page and
            outlines his raised arm against the dark wall */}
        <GlowBillboard position={[pgNow.center[0], pgNow.center[1] + 0.03 * (1 - lift), pgNow.center[2] - 0.05 - 0.06 * lift]} color={S.bone}
          intensity={0.55 * (1 - 0.45 * clamp01(prog)) + 0.1 * lift} size={0.42 - 0.13 * lift} falloff={2.6} />
        {/* the vent's pull: a faint red funnel of light from the grille down toward his hands (the ash rises in it) */}
        <LightShaft from={[VENT[0], VENT[1] + 0.02, VENT[2]]} to={funnelTo} radiusStart={0.24}
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
