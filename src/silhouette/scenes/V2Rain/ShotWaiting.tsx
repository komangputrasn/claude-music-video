/**
 * Shot 4 — WAITING (scene-local 276–405, song 119.17–123.48). "Pancake was waiting with his nose on the box,"
 * Floor level, long lens, three-quarter from the front of the cell toward its back-left corner: Pancake stands in
 * profile with his nose pressed to the Monolith's face, ears low, tail still; the red TENURE eye on the box's brow is
 * right above his head. Behind them the light of the hammer slit spills over the concrete, so both are clean black
 * shapes against it. The sung line hangs in the dark above them, in the haze. On "nose" he presses in; on "box" the eye
 * contracts on him.
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

export const ShotWaiting: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const u = s01(t, TCUT.waiting, TCUT.hammer);
  // room space: from the front-right of the cell (front + right walls removed) toward the slit on the left wall.
  // (framed so the touch — his nose on the box's edge — sits just right of centre: box left, dog right)
  const cam = mix3([3.75, 0.36, 3.47], [3.4, 0.36, 3.12], u);
  const tgt: V3 = [-0.22, 0.55, 0.05];
  // on "nose" he presses in a little; on "box" the eye contracts on him
  const press = s01(t, W.nose, W.nose + 0.25) * (1 - 0.6 * s01(t, W.nose + 0.6, W.nose + 1.4));
  // head held still (no idle yaw/tilt drift: the nose is pinned to the box, so head drift would slide his paws)
  const pose = {...pancakeIdle(t, 2), headYaw: 0, headTilt: 0, headPitch: -0.04 - 0.05 * press, earPerk: -0.85, tailWagAmount: 0};
  // approach from the box's front-RIGHT diagonal, so he is in profile to this front-left camera. The nose touches the
  // face right at its front-right corner (x 0.28 of ±0.3), which is the box's silhouette edge from this camera: the
  // snout's profile stands against the lit wall instead of vanishing into the black box.
  const pl = pancakeAtMonolith(pose, 0.28, Math.PI + 0.78);
  const pos: V3 = [pl.position[0], 0, pl.position[2] - 0.012 * press];
  const eye = s01(t, W.box, W.box + 0.18);
  const pupil = lerp(0.3 + 0.04 * beatAt(t).pulse, 0.14, eye);

  // text hangs in the haze between them and the wall, facing the camera
  const dx = tgt[0] - cam[0], dz = tgt[2] - cam[2];
  const dl = Math.hypot(dx, dz);
  const yaw = Math.atan2(cam[0] - tgt[0], cam[2] - tgt[2]);
  const textAt: V3 = [tgt[0] + (dx / dl) * 0.85, 1.16, tgt[2] + (dz / dl) * 0.85];
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
      <LyricBlock line={26} time={t} rows={[[0, 1, 2], [3, 4, 5, 6, 7, 8]]} align="center" anchor="center" mode="light" size={0.11}
        position={textAt} rotation-y={yaw} intensity={1.0} />
    </SilStage>
  );
};
