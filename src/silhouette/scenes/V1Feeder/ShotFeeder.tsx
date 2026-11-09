/**
 * Shot FEEDER — scene-local 263–401 (abs 1163–1301, song 38.77–43.40). [6] "The feeder said, 'Breakfast is Plus members only,'"
 * Dog's-eye, long lens, floor level from the room's open right side, a slow push toward the box. The feeder Monolith
 * stands black against the lit haze on the far wall with Pancake beside it, head low toward the food slot, ears down,
 * tail still. Its eye is a sleeping red pinpoint; on "feeder" it opens and the red halo blooms in the haze. The machine's
 * sentence is projected in red light on the dark wall above it, word by word; on "Plus" the red stencil PLUS ONLY lights
 * on the box's face, the food-slot lock glows and Pancake lifts his head to the eye. On "only" he gives up and lies down
 * (the camera tilts gently after him), which is how the held wide (LONELY) finds him.
 */
import React from 'react';
import {CameraRig} from '../../lib/SilStage';
import {SilPancake} from '../../lib/SilCast';
import {S, cameraFovForVisible} from '../../lib/palette';
import {CellRoom, CELL, CELL_SPOTS} from '../../lib/sets';
import {Monolith, MONOLITH, HungSilHammer} from '../../lib/props';
import {Backlight} from '../../lib/atmos';
import {Stencil} from '../../lib/tenure';
import {WorldLyric} from '../../lib/WorldLyric';
import {bassAt, beatAt} from '../../../lib/time';
import {pancakeSad} from '../../../lib/characters/Pancake';
import {T_CUT, W, lin, sm, smooth} from './timing';
import {V3, lerp3} from './parts';
import {FEEDER, FEEDER_YAW} from './common';

/** Pancake beside the box (door side), well behind its front plane (so the box looms over him), facing its side */
export const DOG_S3: V3 = [-1.0, 0, 1.3];
const DOG_S3_YAW = Math.PI + 0.12;

export const FEEDER_HIDE = ['printer', 'page', 'bed', 'pillow', 'blanket', 'facade', 'outside'] as const;

/** the box's eye: a sleeping pinpoint until "feeder", then open */
export const feederEye = (t: number) => 0.06 + 0.94 * sm(t, W.feeder - 0.08, W.feeder + 0.7);

export const ShotFeeder: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const u = lin(t, T_CUT.feeder, T_CUT.lonely);
  const bass = bassAt(abs);
  // low (Pancake's eye level and below), square to the box's face, a slow push toward it
  const cam = lerp3([1.85, 0.2, 0.62], [1.6, 0.19, 0.6], smooth(u));
  const open = feederEye(t);
  const plus = sm(t, W.plus - 0.04, W.plus + 0.06);
  // nose at the slot; on "Plus" he lifts his head to the eye; on "only" he gives up and lies down by the box (chin down),
  // which is how the held wide (LONELY) finds him
  const look = sm(t, W.plus - 0.05, W.plus + 0.5) * (1 - sm(t, W.only, W.only + 0.6));
  const down = sm(t, W.only - 0.05, W.only + 0.75);
  // the push ends with a slight tilt down, following him to the floor (gentle: the projected line stays clear of the top bar)
  const target: V3 = [-0.35, 0.72 - 0.07 * sm(t, W.only - 0.1, W.only + 0.9), 0.56];
  const sad = pancakeSad(t);
  const pose = {...sad, lie: down, headPitch: -0.38 + 0.8 * look + 0.3 * down, headYaw: -0.08 * look, earPerk: -0.85 - 0.15 * plus,
    tailWagAmount: 0};
  return (
    <>
      <CameraRig position={cam} target={target} fov={cameraFovForVisible(30)} />
      <CellRoom time={t} hideWalls={['right']} hide={[...FEEDER_HIDE]} slit={0} doorLeak={0.35} vent={0.3} ambient={0.05}
        doorIris={false} windowLight={{dir: [0.25, -0.2, -1], intensity: 0.12}}>
        <group position={FEEDER} rotation-y={FEEDER_YAW}>
          <Monolith time={t} open={open} pupil={0.3 + 0.04 * beatAt(t).pulse} intensity={1.45} irisGlow={0.25 + 0.35 * open}
            slit={0.9 + 0.7 * plus} />
          {/* PLUS ONLY lights in red on the face, under the matte NUTRITION UNIT stencil */}
          {plus > 0 ? (
            <Stencil text="PLUS ONLY" glow color={S.authRed} intensity={1.25 * plus * (1 + 0.1 * bass)} size={0.05} wear={0.15}
              position={[0, 0.43, MONOLITH.frontZ + 0.004]} />
          ) : null}
        </group>
        {/* beside the box at its front plane (never in front of it), in profile, nose toward the food slot */}
        <SilPancake pose={pose} position={DOG_S3} rotation-y={DOG_S3_YAW} />
        <HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false} warmth={0} />
      </CellRoom>
      {/* the haze on the far wall behind the box and the dog (kept low: the red words above stay on dark) */}
      <Backlight position={[CELL.xMin + 0.02, 0.42, 0.55]} rotation-y={Math.PI / 2} size={[4.8, 1.45]} shape="radial" softness={0.9}
        intensity={0.8 + 0.05 * bass} time={t} />
      <WorldLyric line={6} time={t} mode="light" color={S.authRed} intensity={1.0} halo={0.45} size={0.112} maxWidth={1.75}
        anchor="top" position={[CELL.xMin + 0.03, 1.86, 0.42]} rotation-y={Math.PI / 2} until={T_CUT.lonely} />
    </>
  );
};
