/**
 * Shot LONELY — scene-local 402–523 (abs 1302–1423, song 43.40–47.47). [7] "and Pancake looked up at me, hungry and lonely."
 * The loneliest frame of the film: a long, held, wide frame with NO camera move, from the floor (0.2 m) on the room's
 * open side. The camera sits closer to the box than to the dog and the man, so the feeder Monolith looms over everything
 * by perspective (its open red eye at mid-frame, ~2.7× the lying dog); Pancake lies small beside it, where the FEEDER
 * shot left him (behind its front plane), ears down, tail still, and on "looked up" lifts his head and chest toward the
 * tall black figure standing at the left edge of the frame against a column of haze, who looks down at him and can do
 * nothing. Behind them a low wall of backlit haze; to the right and above, deep dark.
 * The sung line is small and quiet in the dark above the dog, left-aligned beside the man's bowed head.
 */
import React from 'react';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy, SilPancake} from '../../lib/SilCast';
import {cameraFovForVisible} from '../../lib/palette';
import {CellRoom, CELL, CELL_SPOTS} from '../../lib/sets';
import {Monolith, HungSilHammer} from '../../lib/props';
import {Backlight} from '../../lib/atmos';
import {metresForPx} from '../../lib/WorldLyric';
import {beatAt} from '../../../lib/time';
import {guyIdle, mergePose} from '../../../lib/characters/Guy';
import {pancakeLie} from '../../../lib/characters/Pancake';
import {W, sm} from './timing';
import {RowLyric, V3} from './parts';
import {DOG_LIE, DOG_LIE_YAW, FEEDER, FEEDER_YAW} from './common';
import {FEEDER_HIDE} from './ShotFeeder';

// the camera sits toward the door side (+Z) so the line of sight to the man's back still lands on the lit left wall
// (not the dark front wall) and the box's edge clears the dog's tail
const CAM: V3 = [2.6, 0.2, 1.3];
const TARGET: V3 = [-1.6, 0.95, 0.5];
const FOV = 30;
/** he lies beside the box, behind its front plane, facing the man (+Z): profile to the camera. FEEDER ends with him turning
 *  away from the box and lying down on exactly this spot and heading, so the cut keeps his screen direction (left). */
const DOG: V3 = DOG_LIE;
const DOG_YAW = DOG_LIE_YAW;
/** the man stands near the door at the left edge of the frame, turned down toward the dog */
const MAN: V3 = [-1.55, 0, 1.95];
const MAN_YAW = Math.PI - 0.3;
/** the line: in the dark above the dog, left edge just right of the man's head (rows read toward the box) */
const ROWS = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
const TEXT_POS: V3 = [-1.25, 1.78, 1.45];
const TEXT_EM = metresForPx(42, 4.2, cameraFovForVisible(FOV)); // cap ≈ 28–30 px of the 1080 frame (measured)

export const ShotLonely: React.FC<{t: number; abs: number}> = ({t}) => {
  const look = sm(t, W.looked - 0.05, W.up + 0.35);
  const lie = pancakeLie(t, false, 3);
  // resting, chin down by the box; on "looked up" he lifts his head and chest toward the man and stays there
  const br0 = Math.sin(t * Math.PI * 2 * 0.3);
  const dog = {...lie, eyes: 'puppy' as const, lie: 1 - 0.42 * look, headPitch: -0.08 + 1.0 * look + 0.02 * br0, headTilt: 0.1 * look,
    headYaw: 0.05 * look, earPerk: -1, tailWagAmount: 0, tailWag: 0};
  const br = Math.sin(t * Math.PI * 2 * 0.18);
  // head bowed to the dog mostly from the shoulders: a steeper neck swings the hood's crown point out behind his head
  // (a "beak" in this profile)
  const man = mergePose(guyIdle(t, 4), {headPitch: 0.32 + 0.01 * br, torsoBend: 0.17, shrug: 0.08 + 0.02 * br});
  return (
    <>
      <CameraRig position={CAM} target={TARGET} fov={cameraFovForVisible(FOV)} />
      <CellRoom time={t} hideWalls={['right']} hide={[...FEEDER_HIDE]} slit={0} doorLeak={0.25} vent={0.3} ambient={0.045}
        doorIris={false} windowLight={{dir: [0.25, -0.2, -1], intensity: 0.12}}>
        <group position={FEEDER} rotation-y={FEEDER_YAW}>
          <Monolith time={t} open={1} pupil={0.28 + 0.03 * beatAt(t).pulse} intensity={1.45} irisGlow={0.5} slit={1.1} />
        </group>
        <SilPancake pose={dog} position={DOG} rotation-y={DOG_YAW} />
        <SilGuy pose={man} position={MAN} rotation-y={MAN_YAW} />
        <HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false} warmth={0} />
      </CellRoom>
      {/* the far wall: one low field of backlit haze behind the dog and the box (under bloom, so they stay black) */}
      <Backlight position={[CELL.xMin + 0.02, 0.55, 0.55]} rotation-y={Math.PI / 2} size={[4.2, 1.6]} shape="radial" softness={0.95}
        intensity={0.68} time={t} />
      {/* a soft column of haze in the corner directly behind the man, so the whole tall figure (hood included) reads */}
      <Backlight position={[CELL.xMin + 0.03, 1.15, 1.95]} rotation-y={Math.PI / 2} size={[0.8, 2.7]} shape="vertical" softness={0.9}
        intensity={0.5} time={t} />
      <RowLyric line={7} rows={ROWS} time={t} size={TEXT_EM} intensity={0.74} halo={0.18} align="left"
        position={TEXT_POS} rotation-y={Math.PI / 2} anchor="top" />
    </>
  );
};
