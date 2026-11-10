/**
 * Shot 1 — SWING (scene-local 0–80, song 128.33–131.03). "One swing, and the lid flew off,"
 * A God's-eye from high above and behind him (ceiling removed, ~20° off vertical), long lens, a slow crane down. The
 * black box sits at the top of the frame with its red TENURE eye on the brow looking straight UP at the lens; he stands
 * below it, his back to us, grandpa's hammer drawn back over his hood. The floor is barred by the cold window light
 * through the blinds, a red scan sliding along the bars. Time slows: the blow comes down in slow motion and lands on the
 * eye exactly at 129.20 s (abs 3876): the iris shatters (red glass, a bone flash) and gold — the first gold in the film —
 * floods out of the broken box toward us across the floor; kibble sparks fountain up at the lens. Pancake, lying on his
 * side beside the man (his profile up to the lens), pricks up his ears, his tail starts to wag, he rolls up, gets up and
 * pads toward the light.
 * The line is light on the floor, split around the blow: "ONE / SWING," left, "AND THE LID / FLEW OFF," right — "ONE"
 * in the cold window light, every word from the blow on in gold.
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy, SilPancake} from '../../lib/SilCast';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CellRoom} from '../../lib/sets';
import {MONOLITH, monolithSwing, HeldSilHammer, FloorGlow} from '../../lib/props';
import {pancakeLie, pancakeWalk, pancakeEat, mixPose, PANCAKE} from '../../../lib/characters/Pancake';
import {guyIdle, mergePose, mixPose as mixGuy} from '../../../lib/characters/Guy';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {BrokenBox, PILE, V3} from './common';
import {LyricRows} from './LyricRows';
import {CUT, SCENE_FROM, boxState, W} from './timing';

const s01 = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** where Pancake lies waiting, and where he eats at the heap (facing +Z, the pose shot 2 picks up) */
const DOG_START: V3 = [0.5, 0, -0.5];
const DOG_EAT: V3 = [PILE[0] + 0.02, 0, PILE[2] - PANCAKE.noseEatLocal[2]];
const DOG_SPEED = 0.42;
/**
 * From straight above, the chin-on-paws lie is a lump: head, paws and haunches merge into one blob. So he lies on his
 * right side instead, facing the man (yaw 0 = +Z, image left), rolled LIE_ROLL about his long axis so his left flank
 * faces this lens (≈ 20° off vertical from +X): the overhead sees his PROFILE (muzzle on the paws, the hanging ear, the
 * curled tail over the rump). The roll pivots on the lying torso's centre line (lie drops the torso centre to 0.172 m),
 * lifted LIE_LIFT so the flank rests on the floor. On the blow he rolls up onto his chest, then turns and gets up.
 */
const LIE_YAW = 0;
const LIE_ROLL = 1.2;
const LIE_PIVOT = 0.172;
const LIE_LIFT = 0.02;

/** floor text, read from this camera: text +X → room −Z (image right), text +Y → room −X (image up), normal +Y */
const FloorText: React.FC<{at: V3; children: React.ReactNode}> = ({at, children}) => (
  <group position={at} rotation-y={Math.PI / 2}>
    <group rotation-x={-Math.PI / 2}>{children}</group>
  </group>
);

export const ShotSwing: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const f = abs - SCENE_FROM;
  const st = boxState(abs);
  const bass = bassAt(abs);
  const u = smooth(s01(f, 0, CUT.pancake));
  const gold = st.spill;

  // camera: high above and behind him (+X), looking down past his shoulder at the eye; slow crane down
  const h = lerp(8.6, 7.6, u);
  const tgt: V3 = [0.08, 0, lerp(0.22, 0.18, u)];
  const cam: V3 = [tgt[0] + h * 0.37, h, tgt[2] + lerp(0.06, 0, u)];

  // the window light: cold bars along the floor; the red scan crosses them until the blow, then the light dims
  const scan = st.broken ? null : clamp01(0.12 + (t - W.one) / 1.3);
  const winI = (0.95 + 0.12 * bass) * (1 - 0.4 * gold);

  // Pancake: lies on his side on the barred floor beside the man, his profile up to the lens (see LIE_ROLL), ears low,
  // tail still. On the blow his head comes up, ears up, the tail wags (the first time in the film); he rolls up onto his
  // chest, turns, gets up, pads into the gold and starts to eat at the heap (where shot 2 finds him)
  const a = st.a / 30; // seconds since the blow
  const perk = s01(a, 0.05, 0.4);
  const rise = s01(a, 0.4, 0.8);
  const walkT = Math.max(0, a - 0.6);
  const d = Math.hypot(DOG_EAT[0] - DOG_START[0], DOG_EAT[2] - DOG_START[2]);
  const walkYaw = Math.atan2(DOG_EAT[0] - DOG_START[0], DOG_EAT[2] - DOG_START[2]);
  const step = Math.min(d, DOG_SPEED * walkT);
  const eatK = smooth(s01(walkT - d / DOG_SPEED, 0, 0.3));
  const liePose = {...pancakeLie(t, false, 2), headPitch: 0.25 * perk, earPerk: lerp(-0.7, 0.55, perk), tailWagAmount: perk,
    tailWag: t * 2.6};
  const walkPose = {...pancakeWalk(walkT, DOG_SPEED, 3), earPerk: 0.55, headPitch: -0.05, tailWagAmount: 1, tailWag: t * 2.6};
  const eatPose = {...pancakeEat(t, 2), tailWagAmount: 1, earPerk: 0.15};
  const dogPose = eatK > 0 ? mixPose(walkPose, eatPose, eatK) : rise > 0 ? mixPose(liePose, walkPose, rise) : liePose;
  const rollK = 1 - smooth(s01(a, 0.06, 0.5)); // 1 = on his side (until the blow), 0 = upright on his chest
  const turn = smooth(s01(a, 0.25, 0.8));
  const dogYaw = lerp(lerp(LIE_YAW, walkYaw, turn), 0, eatK);
  const dogPos: V3 = [DOG_START[0] + Math.sin(walkYaw) * step, 0, DOG_START[2] + Math.cos(walkYaw) * step];

  // after the blow he straightens up, lowers the hammer and steps back and aside (toward the window), clearing the heap
  const back = smooth(s01(a, 0.85, 1.6));
  const stand = mergePose(guyIdle(t, 5), {headPitch: 0.35, armR: {shoulderX: 0.3, shoulderZ: 0.22, elbow: 0.45, swing: 0}});
  const guyPose = back > 0 ? mixGuy(monolithSwing(st.p), stand, back) : monolithSwing(st.p);
  const sp = MONOLITH.guySwingSpot.position as V3;
  const guyPos: V3 = [sp[0] - 0.3 * back, 0, sp[2] + 0.24 * back]; // Monolith-local: −x = room +Z, +z = room +X

  const textCol = st.broken ? S.dawnGold : S.bone;
  const textI = st.broken ? 1.05 : 0.95;
  return (
    // tighter bloom radius (constant over the shot): after the blow he and Pancake stand IN the gold flood, and the
    // default wide bloom veiled them brown (RGB ≈ 40–60) instead of void
    <SilStage fog={{color: GREYS.g2, near: 30, far: 80}} camera={{near: 0.5, far: 60}} bloom={{strength: 0.8, radius: 0.35}}>
      <CameraRig position={cam} target={tgt} fov={cameraFovForVisible(15.5)} />
      <CellRoom time={t} hideWalls={['ceiling']} hide={['vent', 'facade', 'outside', 'bed', 'pillow', 'blanket']}
        windowLight={{intensity: winI, dir: [0, -0.8, -1], scan, scanIntensity: 1.2, scanWidth: 0.2}}
        slit={0.7} doorLeak={0} doorIris={{intensity: 1.1}} ambient={0.05}>
        <BrokenBox t={t} abs={abs}>
          <SilGuy position={guyPos} rotation-y={MONOLITH.guySwingSpot.rotationY} pose={guyPose}
            rightHand={<HeldSilHammer warmth={st.warmth} light={[0, 1]} />} />
          {/* the gold floods out across the floor from the open front (a door of light opening onto the room) */}
          {gold > 0 ? (
            <FloorGlow shape="radial" position={[0, 0.006, 0.6]} size={[2.5, 2.3]} color={S.dawnGold} intensity={0.42 * gold}
              softness={0.85} breakup={0.45} seed={7} />
          ) : null}
        </BrokenBox>
        <group position={dogPos} rotation-y={dogYaw}>
          <group position-y={LIE_PIVOT + LIE_LIFT * rollK} rotation-z={LIE_ROLL * rollK}>
            <SilPancake pose={dogPose} position-y={-LIE_PIVOT} />
          </group>
        </group>
        <FloorText at={[-0.3, 0.012, 1.22]}>
          <LyricRows line={28} time={t} rows={[[0], [1]]} size={0.2} mode="light" color={textCol} intensity={textI} halo={0.3}
            from={W.one - 0.2} />
        </FloorText>
        <FloorText at={[-0.3, 0.012, -0.98]}>
          <LyricRows line={28} time={t} rows={[[2, 3, 4], [5, 6]]} size={0.2} mode="light" color={textCol} intensity={textI}
            halo={0.3} from={W.one - 0.2} />
        </FloorText>
        {/* line 29 begins in this shot: his name lights up in gold where he lay waiting (it carries on in shot 2) */}
        <FloorText at={[0.84, 0.012, -0.72]}>
          <LyricRows line={29} time={t} rows={[[0]]} size={0.2} mode="light" color={S.dawnGold} intensity={1.05} halo={0.3} />
        </FloorText>
      </CellRoom>
    </SilStage>
  );
};
