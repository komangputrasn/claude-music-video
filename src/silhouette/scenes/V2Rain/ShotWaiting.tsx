/**
 * Shot 4 — WAITING (scene-local 276–405, song 119.17–123.48). "Pancake was waiting with his nose on the box,"
 * Floor level, long lens, three-quarter from the front of the cell toward its back-left corner: Pancake stands in
 * profile with his nose pressed to the Monolith's face, ears low, tail still; the red TENURE eye on the box's brow is
 * right above his head. Behind them the light of the hammer slit spills over the concrete, so both are clean black
 * shapes against it. The sung line hangs in the dark above them, in the haze, in two blocks that flank the slit (so its
 * bright bar never runs behind a letter). On "nose" he presses in; on "box" the eye contracts on him.
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilPancake} from '../../lib/SilCast';
import {GREYS, cameraFovForVisible} from '../../lib/palette';
import {Backlight} from '../../lib/atmos';
import {CellRoom, CELL, CELL_SPOTS} from '../../lib/sets';
import {HungSilHammer, Monolith, pancakeAtMonolith} from '../../lib/props';
import {pancakeIdle} from '../../../lib/characters/Pancake';
import {bassAt, beatAt, clamp01, lerp} from '../../../lib/time';
import {LyricBlock} from './LyricBlock';
import {TCUT, W} from './timing';

type V3 = [number, number, number];
const s01 = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// camera push (room space): from the front-right of the cell toward the back-left corner
const CAM0: V3 = [3.75, 0.36, 3.47];
const CAM1: V3 = [3.4, 0.36, 3.12];
// The lyric sits ON the camera's line of sight to the hammer slit (6.1 m out: the haze between the box and the wall,
// the old text depth), split into two blocks either side of it. The push-in runs almost straight down that line, so the
// slit stays in the gap all shot (drift < 2 px). TEXT_GAP = half the gap (m): slit 0.1 m + its bloom + margin.
const SLIT_DX = CELL_SPOTS.slit[0] - CAM0[0], SLIT_DZ = CELL_SPOTS.slit[2] - CAM0[2];
const SLIT_D = Math.hypot(SLIT_DX, SLIT_DZ);
const TEXT_AT: V3 = [CAM0[0] + (SLIT_DX / SLIT_D) * 6.1, 1.16, CAM0[2] + (SLIT_DZ / SLIT_D) * 6.1];
const TEXT_YAW = Math.atan2((CAM0[0] + CAM1[0]) / 2 - TEXT_AT[0], (CAM0[2] + CAM1[2]) / 2 - TEXT_AT[2]);
const TEXT_SIZE = 0.11;
const TEXT_GAP = 0.15;

export const ShotWaiting: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const u = s01(t, TCUT.waiting, TCUT.hammer);
  // room space: from the front-right of the cell (front + right walls removed) toward the slit on the left wall.
  // (framed so the touch — his nose on the box's edge — sits just right of centre: box left, dog right)
  const cam = mix3(CAM0, CAM1, u);
  const tgt: V3 = [-0.22, 0.55, 0.05];
  // on "nose" he presses in a little; on "box" the eye contracts on him
  const press = s01(t, W.nose, W.nose + 0.25) * (1 - 0.6 * s01(t, W.nose + 0.6, W.nose + 1.4));
  // head held still (no idle yaw/tilt drift: the nose is pinned to the box, so head drift would slide his paws).
  // Nose UP a little (pitch 0.25, a sniff at the box): his big round skull alone reads as a ball in silhouette; lifted,
  // the muzzle, the nose and the chin line stand out against the lit wall. Ears low (droopy, -0.85 — in profile they
  // lie inside the head's outline), tail still.
  const pose = {...pancakeIdle(t, 2), headYaw: 0, headTilt: 0, headPitch: 0.25 - 0.05 * press, earPerk: -0.85, tailWagAmount: 0};
  // approach from the box's front-RIGHT diagonal, so he is in profile to this front-left camera. The nose touches the
  // face AT its front-right corner (x 0.3 = the face's edge), which is the box's silhouette edge from this camera: the
  // whole snout stands against the lit wall and only its tip meets the black box (at x 0.28 the muzzle sank into it).
  const pl = pancakeAtMonolith(pose, 0.3, Math.PI + 0.78);
  const pos: V3 = [pl.position[0], 0, pl.position[2] - 0.012 * press];
  const eye = s01(t, W.box, W.box + 0.18);
  const pupil = lerp(0.3 + 0.04 * beatAt(t).pulse, 0.14, eye);

  const wallX = CELL.xMin + 0.015;
  return (
    <SilStage fog={{color: GREYS.g2, near: 12, far: 60}}>
      <CameraRig position={cam} target={tgt} fov={cameraFovForVisible(16)} />
      <CellRoom time={t} hideWalls={['front', 'right']} hide={['printer', 'page', 'bed', 'pillow', 'blanket', 'facade', 'outside']}
        slit={1} doorLeak={0.5} doorIris={false}>
        {/* (the door's own iris lock lands in the top-left corner under the letterbox here: hidden, so the box's eye is
            the only iris in the frame) */}
        <group position={CELL_SPOTS.feeder} rotation-y={CELL_SPOTS.feederRotY}>
          <Monolith time={t} pupil={pupil} intensity={1.45 + 0.15 * eye} irisGlow={0.45} />
          <SilPancake pose={pose} position={pos} rotation-y={pl.rotationY} />
        </group>
        {/* grandpa's hammer is always on its pegs in the cell (warmth 0.3: the only gold before Swing) */}
        <HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false} warmth={0.3} light={[0, 1]} />
      </CellRoom>
      {/* the slit's light spilling over the wall behind them (low, broad) */}
      <Backlight position={[wallX, 0.68, -1.3]} rotation-y={Math.PI / 2} size={[4.2, 1.8]} shape="radial" softness={0.9}
        intensity={0.84 + 0.05 * bass} time={t} />
      {/* …and into the back corner, behind his body and tail */}
      <Backlight position={[-1.0, 0.55, CELL.zMin + 0.015]} size={[2.2, 1.3]} shape="radial" softness={0.95} intensity={0.55} time={t} />
      {/* the sung line hangs in the haze in two blocks that FLANK the hammer slit (the slit is the gap between them, so
          its bright bar never passes behind a letter): "PANCAKE / WAS WAITING" left, "WITH HIS NOSE / ON THE BOX," right */}
      <group position={TEXT_AT} rotation-y={TEXT_YAW}>
        <LyricBlock line={26} time={t} rows={[[0], [1, 2]]} align="right" anchor="center" mode="light" size={TEXT_SIZE}
          position={[-TEXT_GAP, 0, 0]} intensity={1.0} />
        <LyricBlock line={26} time={t} rows={[[3, 4, 5], [6, 7, 8]]} align="left" anchor="center" mode="light" size={TEXT_SIZE}
          position={[TEXT_GAP, 0, 0]} intensity={1.0} />
      </group>
    </SilStage>
  );
};
