/**
 * Shot 3 — STAND (scene-local 130–275, song 132.66–137.53).
 *   "I picked up the phone with the hammer in my hand," / "I'm cancelling every last thing on a plan."
 * The cell cut open like a dollhouse (right wall removed), symmetrical, long lens, a slow push-in. He stands square to
 * us in front of the broken box, so its gold rises behind him like a corona: grandpa's hammer hangs head-down from his
 * right hand (gold edge), and on "picked up" his left hand brings the flip phone to his ear (its screen light leaks
 * around the hood). Pancake eats at his feet, tail going. As he dials, the bare wall behind lights up as TENURE's
 * inventory of the cell: a dense field of red lease tags around the door's iris and the empty hammer pegs. From
 * "cancelling" the tags go dark one by one, outward from behind him, the door's eye dies on "plan", and he is left in gold.
 * The lines are gold light on the concrete above the tags (control words red): line 30, then line 31 in its place.
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy, SilPancake} from '../../lib/SilCast';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {Backlight} from '../../lib/atmos';
import {CellRoom, CELL} from '../../lib/sets';
import {HeldSilHammer, HeldSilPhone} from '../../lib/props';
import {guyIdle, mixPose, mergePose, GuyPose} from '../../../lib/characters/Guy';
import {pancakeEat, PANCAKE} from '../../../lib/characters/Pancake';
import {leaseTagsLit} from '../../lib/tenure';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {BrokenBox, PILE, TagWall, TAG_Y1, V3} from './common';
import {LyricRows} from './LyricRows';
import {CUT, SCENE_FROM, boxState, W} from './timing';

const s01 = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** his left hand at his left ear (guyPhoneToEar mirrored: the rig mirrors arm values L/R) */
const PHONE_L = {shoulderX: 0.89, shoulderZ: 0.26, shoulderY: 0.1, elbow: 2.6, twist: 0.12, wrist: 0.32, wristZ: -0.27, grip: 0.55, swing: 0};
const PHONE_DOWN = {shoulderX: 0.06, shoulderZ: 0.16, shoulderY: 0.15, elbow: 0.3, twist: 0.1, grip: 0.6, swing: 0};
/** right arm hanging a little away from the body, the hammer head-down beside his knee */
const HAMMER_ARM = {shoulderX: 0.02, shoulderZ: 0.3, shoulderY: 0.0, elbow: 0.38, twist: 0.0, wrist: 0.0, wristZ: 0.0, grip: 1, swing: 0};

/** the hammer hangs head-down from the fist, its head across (T silhouette from the front) */
const HangingHammer: React.FC<{warmth: number}> = ({warmth}) => (
  <group rotation-x={Math.PI / 2}>
    <group rotation-z={Math.PI / 2}>
      <HeldSilHammer warmth={warmth} light={[0, -1]} />
    </group>
  </group>
);

export const ShotStand: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const f = abs - SCENE_FROM;
  const st = boxState(abs);
  const bass = bassAt(abs);
  const u = smooth(s01(f, CUT.stand, CUT.end));

  // camera: dead on from beyond the removed right wall (+X), slow push-in. He stands centred on the broken box (z 0.3)
  // so its gold rises straight up behind him and Pancake's body clears his right leg; the axis splits the difference
  // between him and the door/slit midpoint (z 0.125), so the wall still reads symmetrical
  const manZ = 0.36;
  const z0 = 0.24;
  // set cheat: the 0.6 m box is wider than his legs (0.42 m at his depth), and once the phone hand leaves his hip its
  // right wall + brow corner stood beside his leg like a post. Drawn 0.6× as wide and 8 cm toward the door, all of the
  // box sits behind his legs (≈10 px margin each side at 1080p); only its gold shows between them. Its halo, cones,
  // floor wedge and kibble heap stay at the real box (see BoxCheat). Moving him instead put his leg over Pancake's head
  const BOX_CHEAT = {width: 0.6, shift: 0.08};
  const cam: V3 = [lerp(10.8, 9.6, u), 1.45, z0];
  const tgt: V3 = [-0.6, 1.12, z0];

  // the phone comes up on "picked up"
  const lift = smooth(s01(t, W.picked, W.picked + 0.45));
  const base = guyIdle(t, 3);
  const pose: GuyPose = mergePose(base, {
    headTilt: 0.12 * lift, headPitch: 0.05,
    armL: mixPose({armL: PHONE_DOWN}, {armL: PHONE_L}, lift).armL,
    armR: HAMMER_ARM,
  });

  // the wall: as he dials, TENURE lists his account — every leased thing lights its red tag on the wall, in a wave
  // ("picked up the phone"); from "cancelling" they go dark one by one, outward from behind him, until just after "plan"
  const onFrom = W.picked, onTo = W.phone + 0.3;
  const offFrom = W.cancelling, offTo = W.plan + 0.45;
  const lit = leaseTagsLit(t, offFrom, offTo, onFrom, onTo);
  const doorEye = 1 - s01(t, W.plan - 0.05, W.plan + 0.35);

  // Pancake eats at the heap facing +Z: his body and wagging tail to the right of the man, clear of the hammer
  const dogPos: V3 = [PILE[0] + 0.02, 0, PILE[2] - PANCAKE.noseEatLocal[2]];

  // the corona: the box's gold in the haze behind him. It opens wide at the cut (continuing shot 2's gold), is squeezed
  // to a narrow column while TENURE's red inventory is lit (gold and red side by side, never mixed to orange), and
  // widens and brightens as the tags die outward from behind him, until he stands black in a gold field at "plan."
  const free = 1 - lit;
  const coronaW = lerp(1.2, 2.9, free);
  const coronaH = lerp(2.5, 3.3, free);
  const coronaI = (lerp(0.75, 1.35, free) + 0.06 * bass) * st.spill;

  // lyric band on the concrete above the tags, over him. Line 30's second row (~3.5 m) needs the full wall, so it stays
  // centred on him (at 0.58 its "W" sank into the front wall's thickness past z 2.25). Line 31 is shorter: it is nudged
  // toward the door (+Z) so "PLAN." ends before the hammer slit's light line (z −0.9) instead of running through it
  const bandY = TAG_Y1 + 0.4;
  const l30 = t < W.im;
  const bandZ = l30 ? manZ : 0.58;
  const wallX = CELL.xMin + 0.02;
  return (
    <SilStage fog={{color: GREYS.g2, near: 14, far: 50}}>
      <CameraRig position={cam} target={tgt} fov={cameraFovForVisible(16)} />
      <CellRoom time={t} hideWalls={['right']} hide={['printer', 'page', 'bed', 'pillow', 'blanket', 'facade', 'outside']}
        windowLight={{intensity: 0.32, dir: [0, -0.4, -1]}} slit={0.26} doorLeak={0.3} vent={0.3}
        doorIris={{intensity: 1.2 * doorEye, open: 0.25 + 0.75 * doorEye, flicker: s01(t, W.plan - 0.2, W.plan + 0.3) * 0.8}} ambient={0.05}>
        {/* front={0}: the forward light cone would veil him and the dog gold (haze between the lens and the heroes) */}
        <BrokenBox t={t} abs={abs} front={0} cheat={BOX_CHEAT} />
        <SilPancake pose={{...pancakeEat(t, 2), tailWagAmount: 1}} position={dogPos} rotation-y={0}
          rim={{color: S.dawnGold, strength: 0.4, power: 6, dir: [0, 1]}} />
        <SilGuy position={[0.98, 0, manZ]} rotation-y={Math.PI / 2} pose={pose}
          rightHand={<HangingHammer warmth={st.warmth} />} leftHand={<HeldSilPhone open={1} halo={0.35} keys={0.05} />}
          rim={{color: S.dawnGold, strength: 0.38, power: 7, dir: [0, 1], dirMix: 1}} />
        {/* the box's gold in the haze behind him: the corona (see coronaW/H/I above) */}
        <Backlight position={[-1.0, 1.1, manZ + 0.02]} rotation-y={Math.PI / 2} size={[coronaW, coronaH]} shape="radial"
          softness={0.85} color={S.dawnGold} intensity={coronaI} time={t} />
        {/* the tags' own red haze on the wall, dying with them: two side panels that stay out of the corona */}
        {([[manZ + 0.75, CELL.zMax], [CELL.zMin, manZ - 0.75]] as const).map(([za, zb], k) => (
          <Backlight key={k} position={[wallX + 0.01, 1.05, (za + zb) / 2]} rotation-y={Math.PI / 2} size={[zb - za, 2.0]} shape="slab"
            softness={0.8} color={S.authRed} intensity={0.16 * lit} time={t} />
        ))}
        <TagWall t={t} onFrom={onFrom} onTo={onTo} offFrom={offFrom} offTo={offTo} />
        <group position={[wallX, bandY, bandZ]} rotation-y={Math.PI / 2}>
          {l30 ? (
            <LyricRows line={30} time={t} rows={[[0, 1, 2, 3, 4], [5, 6, 7, 8, 9, 10]]} size={0.2} mode="light" color={S.dawnGold}
              intensity={1.0} halo={0.35} />
          ) : (
            <LyricRows line={31} time={t} rows={[[0, 1, 2], [3, 4, 5, 6, 7]]} size={0.2} mode="light" color={S.dawnGold}
              intensity={1.0} halo={0.35} />
          )}
        </group>
      </CellRoom>
    </SilStage>
  );
};
