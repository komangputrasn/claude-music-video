// TERMS · Outro — the porch: the man (hood DOWN) sitting on the front step with his left arm round Pancake, who sits
// beside him (tail wagging slowly), and the plain bowl on the ground in its gold pool, which bounces a warm glow onto
// the step's front face so his shins and the bowl stand black against gold even in the far wide. One component for both
// shots so the cut matches exactly. House-local coordinates (HouseCube at the origin, front face +Z at z = 4; step top
// y 0.37, step front face z 5).
import React from 'react';
import {SilGuy, SilPancake} from '../../lib/SilCast';
import {FloorGlow, PlainBowl} from '../../lib/props';
import {HOUSE_SPOTS} from '../../lib/sets';
import {GuyPose, guyIdle, mergePose} from '../../../lib/characters/Guy';
import {pancakeIdle, PancakePose} from '../../../lib/characters/Pancake';
import {lerp} from '../../../lib/time';
import {S} from '../../lib/palette';
import {goldRim} from './Sky';

type V3 = [number, number, number];

/** where they sit: both inside the doorway's width (x ±0.6) so their outlines read against the gold. The doorway is
 *  only 1.2 m wide, so the dog sits three-quarter, turned toward his man (head by his shoulder), right at his side, and
 *  the man's arm goes round him: one connected shape, like the hand on the head in Pre. Turned this way the curled tail
 *  stands out on the gold at the doorway's right edge (the barometer of hope stays readable even in the wide), and when
 *  the iris wakes his head swings out the other way, up toward the jamb the eye is on. */
export const GUY_AT: V3 = [-0.31, 0, HOUSE_SPOTS.guySeat[2]];
export const DOG_AT: V3 = [0.24, HOUSE_SPOTS.step[1], 4.84];
export const DOG_YAW = -0.95;
/** how far his body turns toward the iris while it has his attention (rad, added to DOG_YAW × attn) */
export const DOG_TURN = 0.35;
/** warm bounce off the gold pool onto the step face (point light intensity) */
export const BOUNCE = 3.5;
export const BOWL_AT: V3 = [0.62, 0, HOUSE_SPOTS.bowl[2] + 0.1];
/** the gold pool round the bowl (PlainBowl poolSize; Final's crane uses 2.2) */
export const POOL_SIZE = 2;
/** the step's front face (z) and height: door plane + 2 × half the step depth (5.0 for the 8 m cube) */
export const STEP_FRONT = 2 * HOUSE_SPOTS.step[2] - HOUSE_SPOTS.door[2];
export const STEP_TOP = HOUSE_SPOTS.step[1];
/** the pool's gold bounce on the step's front face: a glow brightest at the ground line, fading up the face. From the
 *  wide (0.9 m high, 55 m out) the 7 cm bowl is seen against the bottom 6 cm of this face, so this is what it reads
 *  against there (on the dark concrete it was a ~4 px smudge); his shins and feet read against it too. Centred between
 *  his feet and the bowl, inside the step's width (x ±1.6) and below its top edge. */
export const STEP_GLOW = {x: 0.18, width: 2.7, intensity: 0.85};

/** Pancake's pose: sitting, a slow contented wag, head toward his man; `attn` 0..1 = the iris has his attention (he
 *  shifts round, his head swings up toward it in profile, the tail goes still); `after` 0..1 = it is gone (the wag comes back, a little
 *  happier). */
export const dogPose = (t: number, attn: number, after: number): PancakePose => {
  const idle = pancakeIdle(t, 3);
  const wag = lerp(0.62, 0.05, attn) + 0.3 * after;
  return {
    ...idle,
    sit: 1,
    // attention: he shifts round on his haunches (DOG_TURN on the body) and the head swings over his shoulder until the
    // muzzle is in clean PROFILE pointing up at the jamb. (A frontal head with ears flared sideways read as a blob, and
    // a nose pointing straight up as a teddy bear: sweep checked at 214.8–215.8.)
    headYaw: lerp(0.15 + (idle.headYaw ?? 0) * 0.5, 2.1, attn),
    headPitch: lerp((idle.headPitch ?? 0) * 0.6 + 0.16, 0.72, attn),
    headTilt: lerp((idle.headTilt ?? 0) * 0.7, 0, attn),
    earPerk: lerp(0.15 + 0.1 * after, 0.25, attn),
    tailWag: t * (0.95 + 0.25 * after),
    tailWagAmount: wag,
    bodySquash: (idle.bodySquash ?? 0) * 0.6,
  };
};

/** the man: sitting at rest, breathing, looking out; his left arm round the dog (he does not look at the iris: it has
 *  no hold on him any more) */
export const guyPose = (t: number, attn = 0): GuyPose =>
  mergePose({...guyIdle(t, 4), sit: 1}, {
    torsoBend: 0.08 + 0.012 * Math.sin(t * Math.PI * 2 * 0.24),
    headPitch: 0.06,
    // while the eye is awake he draws the dog a little closer (a small squeeze), without turning his head
    armL: {shoulderX: -0.374, shoulderZ: 0.92 - 0.07 * attn, shoulderY: -0.6, elbow: 1.7 + 0.12 * attn, twist: -0.5, grip: 0.2 + 0.3 * attn},
  });

export type PorchProps = {
  t: number;
  /** 0..1 iris attention / 0..1 after the iris died */
  attn?: number;
  after?: number;
  /** gold rim strength on the figures (thin) */
  rim?: number;
  /** bowl fill (he has eaten) */
  fill?: number;
  pool?: number;
  /** gold bounce glow on the step's front face (FloorGlow intensity; 0 = off) */
  stepGlow?: number;
};

/** a FloorGlow stood up on the step's front face: local +Y (its normal) → +Z, its wedge (+Z, brightest at the source edge)
 *  → +Y, so the source edge lies along the ground line and the glow fades upward */
const StepGlow: React.FC<{intensity: number}> = ({intensity}) => (
  <group position={[STEP_GLOW.x, 0, STEP_FRONT]} rotation-y={Math.PI}>
    <group rotation-x={-Math.PI / 2}>
      <FloorGlow shape="wedge" size={[STEP_GLOW.width, STEP_TOP - 0.02]} near={1} far={0.8} softness={0.55} breakup={0.3}
        color={S.dawnGold} intensity={intensity} seed={7} />
    </group>
  </group>
);

export const Porch: React.FC<PorchProps> = ({t, attn = 0, after = 0, rim = 0.35, fill = 0.12, pool = 0.8, stepGlow = STEP_GLOW.intensity}) => (
  <>
    <SilGuy position={GUY_AT} pose={guyPose(t, attn)} hood={0} rim={goldRim(rim)} />
    <SilPancake position={DOG_AT} rotation-y={DOG_YAW + DOG_TURN * attn} pose={dogPose(t, attn, after)} rim={goldRim(rim * 0.9)} />
    <PlainBowl position={BOWL_AT} fill={fill} goldPool={pool} poolSize={POOL_SIZE} shaft={0} />
    <StepGlow intensity={stepGlow} />
    {/* the gold pool on the ground bounces a little warm light onto the step's front face, so his shins read as one
        black shape down to his feet (on a black step the feet floated, cut off from the body) */}
    <pointLight position={[0.1, 0.08, 5.75]} color={S.dawnGold} intensity={BOUNCE} distance={2.4} decay={2} />
  </>
);
