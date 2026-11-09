/**
 * <Pancake> — the dog. Round, fluffy, pancake-golden mutt with a cream muzzle/chest/paws, floppy "browned" ears, a curly
 * tail, big glossy puppy eyes, and a red collar with a gold bone tag. Low-poly cel-shaded (toonMat + ink outlines) to match
 * the Guy. ~0.55 m at the shoulder, ~0.75 m to the top of the head. Origin: floor, under the middle of the body. Faces +Z.
 *
 * Fully pose-driven and deterministic: pass a {@link PancakePose} computed from the frame; no internal clocks.
 *
 * API
 *   <Pancake pose={PancakePose} outlineScale?={1} shadow?={true | opacity} colors?={Partial<PANCAKE_COLORS>} {...groupProps}/>
 *   PancakePose (all optional): walk, walkAmount, sit, lie, headYaw, headPitch (+ = look up), headTilt, earPerk (-1..1),
 *     tailWag, tailWagAmount, mouthOpen, tongue, eyes ('open'|'puppy'|'happy'|'closed'), blink, eat, eatPhase, bodySquash,
 *     hop (m), blush, frown, tear (0..1 a single tear forms & rolls down the cheek).
 *   Pose helpers (t = seconds): pancakeIdle(t), pancakeWalk(t), pancakeBeg(t), pancakeEat(t), pancakeHappy(t),
 *     pancakeSad(t), pancakeLie(t), pancakeBlink(t, seed), mixPose(a, b, k).
 *   Anchors: PANCAKE.{shoulderHeight, headTop, noseLocal, ...}; pancakeAnchor(pose, 'nose' | 'mouth' | 'headTop' | ...)
 *     returns the Pancake-local [x,y,z] of that point for any pose (apply your own group transform on top).
 *   Walking: advance pose.walk by (metres moved / PANCAKE.strideLength) to keep paws planted.
 *
 * Usage
 *   const f = useCurrentFrame(); const t = f / 30;
 *   <Pancake position={[0, 0, 0]} rotation={[0, -0.4, 0]} pose={pancakeBeg(t)} />
 *   // walking 0.4 m/s along +Z:
 *   <Pancake position={[0, 0, t * 0.4]} pose={pancakeWalk(t, 0.4)} />
 *   // eating: put the bowl at PANCAKE.bowl (Pancake-local), e.g. <DogBowl position={PANCAKE.bowl}/>
 *   <Pancake pose={pancakeEat(t)} />
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {InkMesh} from './InkMesh';
import {pancakeAssets, PANCAKE_COLORS} from './pancake/assets';
import {
  solvePancake, pancakeAnchor, SK, COLLAR, collarCenter, tagRingPoint, NECK_DIR, STRIDE_LENGTH,
  PancakePose, PancakeRig, PancakeEyes, PancakeAnchorName, LegSolve, V3,
} from './pancake/rig';

export {solvePancake, pancakeAnchor, PANCAKE_COLORS, STRIDE_LENGTH};
export type {PancakePose, PancakeRig, PancakeEyes, PancakeAnchorName, V3};
export {pancakeIdle, pancakeWalk, pancakeBeg, pancakeEat, pancakeHappy, pancakeSad, pancakeLie, pancakeBlink, mixPose} from './pancake/poses';

// ------------------------------------------------------------------------------------------------------------------
// Static face layout helpers (pure math, computed once)
// ------------------------------------------------------------------------------------------------------------------
const Z = new THREE.Vector3(0, 0, 1);
type Placed = {p: V3; q: THREE.Quaternion};

/** point + orientation on the head ellipsoid surface at (x,y); `front` blends the normal toward +Z (rounder, cuter faces). */
const onHead = (x: number, y: number, lift: number, front = 0): Placed => {
  const [a, b, c] = SK.head.r;
  const u = x / a, v = y / b;
  const z = c * Math.sqrt(Math.max(0, 1 - u * u - v * v));
  const n = new THREE.Vector3(x / (a * a), y / (b * b), z / (c * c)).normalize().lerp(Z, front).normalize();
  return {p: [x + n.x * lift, y + n.y * lift, z + n.z * lift], q: new THREE.Quaternion().setFromUnitVectors(Z, n)};
};

/** disc on the unit eye dome (x radius 1, y radius 1.12, z radius 0.5) */
type Disc = Placed & {s: V3};
const domeDisc = (x: number, y: number, rx: number, ry = rx): Disc => {
  const zz = 0.5 * Math.sqrt(Math.max(0, 1 - x * x - (y / 1.12) ** 2));
  const n = new THREE.Vector3(x, y / (1.12 * 1.12), zz / 0.25).normalize();
  return {p: [x + n.x * 0.025, y + n.y * 0.025, zz + n.z * 0.025], q: new THREE.Quaternion().setFromUnitVectors(Z, n), s: [rx, ry, 1]};
};
const HL_OPEN: Disc[] = [domeDisc(0.32, 0.42, 0.22, 0.25), domeDisc(-0.38, -0.46, 0.1)];
const HL_PUPPY: Disc[] = [domeDisc(0.3, 0.42, 0.26, 0.29), domeDisc(-0.36, -0.44, 0.13), domeDisc(0.56, -0.1, 0.065), domeDisc(-0.08, 0.68, 0.05)];

const EYE_X = 0.07, EYE_Y = 0.024, EYE_R = 0.047;
const EYE_L = onHead(EYE_X, EYE_Y, -0.016, 0.35);
const EYE_R_ = onHead(-EYE_X, EYE_Y, -0.016, 0.35);
const BROW = (side: 1 | -1) => onHead(side * 0.064, 0.09, -0.0045, 0.0);
const BROW_L = BROW(1), BROW_R = BROW(-1);
const BLUSH_L = onHead(0.118, -0.045, 0.004, 0.0);
const BLUSH_R = onHead(-0.118, -0.045, 0.004, 0.0);
const NOSE_C: V3 = [0, 0.004, 0.19];

// ------------------------------------------------------------------------------------------------------------------
// Anchors
// ------------------------------------------------------------------------------------------------------------------
const STAND_NOSE = pancakeAnchor({}, 'nose');
const EAT_NOSE = pancakeAnchor({eat: 1}, 'nose');

/** Useful Pancake-local measurements (metres) for staging. */
export const PANCAKE = {
  /** top of the back at the withers, standing */
  shoulderHeight: 0.55,
  /** top of the head, standing */
  headTop: pancakeAnchor({}, 'headTop')[1],
  /** nose tip, standing neutral */
  noseLocal: STAND_NOSE,
  /** mouth (between the lips), standing neutral */
  mouthLocal: pancakeAnchor({}, 'mouth'),
  /** head centre, standing / sitting / lying */
  headLocal: pancakeAnchor({}, 'head'),
  headSitLocal: pancakeAnchor({sit: 1}, 'head'),
  headLieLocal: pancakeAnchor({lie: 1}, 'head'),
  /** nose tip when sitting (for pats / "looking up" eye-lines) */
  noseSitLocal: pancakeAnchor({sit: 1}, 'nose'),
  /** nose tip when lying with chin down */
  noseLieLocal: pancakeAnchor({lie: 1}, 'nose'),
  /** nose when eat=1 — put the bowl's food surface here. */
  noseEatLocal: EAT_NOSE,
  /** recommended bowl position (floor point under the nose in the eat pose) */
  bowl: [EAT_NOSE[0], 0, EAT_NOSE[2] + 0.02] as V3,
  /** collar tag (standing) */
  tagLocal: pancakeAnchor({}, 'tag'),
  /** top of the back (for a hand pat), standing */
  backLocal: pancakeAnchor({}, 'back'),
  /** z of the rump (back of the body), standing */
  rumpZ: SK.torso.c[2] - SK.torso.r[2],
  /** nose-to-rump length & body width (approx.) */
  length: STAND_NOSE[2] - (SK.torso.c[2] - SK.torso.r[2]),
  width: 0.4,
  /** metres travelled per walk cycle with planted paws */
  strideLength: STRIDE_LENGTH,
  /** default ink outline thickness of the big shapes (metres) */
  outline: 0.009,
} as const;

// ------------------------------------------------------------------------------------------------------------------
// Component
// ------------------------------------------------------------------------------------------------------------------
type GroupProps = Omit<ThreeElements['group'], 'children'>;
export type PancakeProps = GroupProps & {
  pose?: PancakePose;
  /** multiply ink-outline thickness (e.g. 1.6 for far wide shots); 0 disables outlines */
  outlineScale?: number;
  /** soft blob shadow on the floor (y=0). number = opacity (default 0.35) */
  shadow?: boolean | number;
  /** recolour (e.g. a ghost/hologram Pancake) */
  colors?: Partial<typeof PANCAKE_COLORS>;
};

type Ctx = {A: ReturnType<typeof pancakeAssets>; col: typeof PANCAKE_COLORS; o: (t: number) => number | false};

const Leg: React.FC<{ctx: Ctx; hip: V3; s: LegSolve}> = ({ctx: {A, col, o}, hip, s}) => (
  <group position={hip} rotation-x={s.hip}>
    <InkMesh geometry={A.upperLeg} color={col.gold} outline={o(0.008)} />
    <group position={[0, -SK.upper, 0]} rotation-x={s.knee}>
      <InkMesh geometry={A.lowerLeg} color={col.gold} outline={o(0.007)} />
      <group position={[0, -SK.lower, 0]} rotation-x={s.paw}>
        <InkMesh geometry={A.paw} color={col.cream} outline={o(0.007)} />
        {[-1, 1].map((k) => (
          <mesh key={k} geometry={A.toeLine} material={A.inkMat} position={[k * 0.019, 0.011, 0.083]} rotation={[0.75, 0, k * -0.12]} />
        ))}
      </group>
    </group>
  </group>
);

const Eye: React.FC<{ctx: Ctx; side: 1 | -1; rig: PancakeRig}> = ({ctx: {A}, side, rig}) => {
  const at = side === 1 ? EYE_L : EYE_R_;
  const puppy = rig.eyes === 'puppy';
  const r = EYE_R * (puppy ? 1.2 : 1);
  if (rig.eyes === 'happy' || rig.eyes === 'closed') {
    // ^ ^ (happy) or ∪ ∪ (sleepy) ink arcs on the head surface
    const happy = rig.eyes === 'happy';
    return (
      <group position={at.p} quaternion={at.q}>
        <mesh
          geometry={A.arc}
          material={A.inkMat}
          position={[0, happy ? -0.012 : 0.006, 0.02]}
          rotation={[0, 0, happy ? 0 : Math.PI]}
          scale={[EYE_R * (happy ? 1.05 : 1.0), EYE_R * (happy ? 1.15 : 0.55), EYE_R]}
        />
      </group>
    );
  }
  const open = 1 - rig.blink * 0.94;
  const hls = puppy ? HL_PUPPY : HL_OPEN;
  return (
    <group position={at.p} quaternion={at.q}>
      <group scale={[r, r * open, r]} position={[0, (1 - open) * r * 0.25, 0]}>
        <mesh geometry={A.eye} material={puppy ? A.eyeMatPuppy : A.eyeMat} />
        {hls.map((h, i) => (
          <mesh key={i} geometry={A.hl} material={A.hlMat} position={h.p} quaternion={h.q} scale={h.s} />
        ))}
        {puppy ? <mesh geometry={A.wetArc} material={A.wetMat} position={[0, -0.02, 0.33]} scale={[1, 1.05, 1]} /> : null}
      </group>
      {rig.blink > 0.75 ? (
        <mesh geometry={A.arc} material={A.inkMat} position={[0, 0.006, 0.02]} rotation={[0, 0, Math.PI]} scale={[EYE_R * 0.95, EYE_R * 0.75, EYE_R]} />
      ) : null}
    </group>
  );
};

/** glossy tear under the dog's left eye; k 0..0.3 forms, 0.3..1 rolls down the cheek */
const Tear: React.FC<{ctx: Ctx; k: number}> = ({ctx: {A, o}, k}) => {
  const grow = Math.min(1, k / 0.3);
  const roll = Math.max(0, (k - 0.3) / 0.7);
  const at = onHead(0.098 + roll * 0.016, -0.03 - roll * 0.07, 0.008, 0.0);
  const r = 0.012 * (0.35 + 0.65 * grow);
  return (
    <group position={at.p} quaternion={at.q}>
      <InkMesh geometry={A.tearDrop} color="#BFF3FF" emissive="#6fd6ff" emissiveIntensity={0.35} outline={o(0.0022 / r)} outlineColor="#1E5BFF" scale={r} />
      <mesh geometry={A.hl} material={A.hlMat} position={[-r * 0.25, -r * 0.1, r * 0.52]} scale={[r * 0.22, r * 0.3, 1]} />
    </group>
  );
};

const Head: React.FC<{ctx: Ctx; rig: PancakeRig}> = ({ctx, rig}) => {
  const {A, col, o} = ctx;
  const sad = rig.browSad;
  return (
    <group>
      <InkMesh geometry={A.head} color={col.gold} outline={o(0.009)} />
      {/* head-top tuft */}
      <InkMesh geometry={A.headTuft} color={col.gold} outline={o(0.006)} position={[0.008, 0.124, 0.022]} rotation={[0.7, 0, -0.25]} />
      <InkMesh geometry={A.headTuft} color={col.gold} outline={o(0.006)} position={[-0.02, 0.122, 0.004]} rotation={[0.45, 0, 0.5]} scale={0.78} />
      {/* cheek fluff (under the ears) */}
      {[-1, 1].map((k) => (
        <group key={k}>
          <InkMesh geometry={A.cheekTuft} color={col.gold} outline={o(0.006)} position={[k * 0.13, -0.08, 0.035]} rotation={[0.2, 0, k * -2.35]} />
        </group>
      ))}
      {/* muzzle, nose, mouth */}
      <InkMesh geometry={A.muzzle} color={col.cream} outline={o(0.008)} position={A.muzzleC} />
      <InkMesh geometry={A.nose} material={A.noseMat} outline={o(0.005)} position={NOSE_C} />
      <mesh geometry={A.hl} material={A.hlMat} position={[0.009, NOSE_C[1] + 0.014, NOSE_C[2] + 0.017]} rotation={[-0.7, 0.25, 0]} scale={[0.011, 0.006, 1]} />
      <mesh geometry={rig.frown > 0.5 && rig.jaw < 0.12 ? A.frown : A.smile} material={A.inkMat} />
      <mesh geometry={A.philtrum} material={A.inkMat} />
      <mesh geometry={A.mouthIn} material={A.mouthMat} position={[0, -0.086, 0.128]} />
      <group position={[0, -0.088, 0.072]} rotation-x={rig.jaw}>
        <InkMesh geometry={A.jaw} color={col.cream} outline={o(0.007)} position={[0, -0.004, 0.056]} />
        {rig.tongue > 0.04 ? (
          <group position={[0, 0.022, 0.085]} rotation-x={0.3 + rig.tongue * 0.45} scale={[0.85 + rig.tongue * 0.15, 1, 0.35 + rig.tongue * 0.75]}>
            <InkMesh geometry={A.tongue} color={col.tongue} outline={o(0.004)} />
            <mesh geometry={A.tongueLine} material={A.inkMat} />
          </group>
        ) : null}
      </group>
      {/* eyes, brows, blush */}
      <Eye ctx={ctx} side={1} rig={rig} />
      <Eye ctx={ctx} side={-1} rig={rig} />
      {([1, -1] as const).map((k) => {
        const b = k === 1 ? BROW_L : BROW_R;
        return (
          <group key={k} position={[b.p[0] - k * sad * 0.008, b.p[1] + rig.browRaise, b.p[2] + sad * 0.003]} quaternion={b.q}>
            <InkMesh geometry={A.brow} color={col.brow} outline={false} rotation={[0, 0, -k * (0.72 * sad - 0.12) + (rig.eyes === 'happy' ? k * 0.15 : 0)]} />
          </group>
        );
      })}
      {rig.blush > 0.01
        ? ([1, -1] as const).map((k) => {
            const b = k === 1 ? BLUSH_L : BLUSH_R;
            return (
              <mesh key={k} geometry={A.blush} position={b.p} quaternion={b.q} scale={[0.03, 0.019, 1]}>
                <meshBasicMaterial color={col.blush} transparent opacity={0.6 * rig.blush} depthWrite={false} />
              </mesh>
            );
          })
        : null}
      {rig.tear > 0.01 ? <Tear ctx={ctx} k={rig.tear} /> : null}
      {/* ears */}
      {([1, -1] as const).map((k) => {
        const e = k === 1 ? rig.ears.l : rig.ears.r;
        return (
          <group key={k} position={[k * SK.earPivot[0], SK.earPivot[1] + e.lift, SK.earPivot[2]]} rotation={[e.rx, e.ry, e.rz, 'ZXY']} scale={[k, 1, 1]}>
            <InkMesh geometry={A.ear} color={col.browned} outline={o(0.007)} />
          </group>
        );
      })}
    </group>
  );
};

export const Pancake = React.forwardRef<THREE.Group, PancakeProps>(function Pancake(
  {pose, outlineScale = 1, shadow = true, colors, ...group},
  ref,
) {
  const A = useMemo(() => pancakeAssets(), []);
  const col = useMemo(() => ({...PANCAKE_COLORS, ...colors}), [colors]);
  const rig = solvePancake(pose);
  const o = (t: number) => (outlineScale > 0 ? t * outlineScale : false);
  const ctx: Ctx = {A, col, o};
  const s = rig.neck.stretch;
  const cc = collarCenter(s);
  const ring = tagRingPoint(s);
  const neckWorldRx = rig.neck.rx + rig.body.rx;
  const shOpacity = (typeof shadow === 'number' ? shadow : 0.35) * rig.shadow.opacity;
  const tailJ: V3 = [0, 0.205, 0.045];
  return (
    <group ref={ref} {...group}>
      {shadow !== false ? (
        <mesh geometry={A.shadow} position={[0, 0.004, -0.01 + rig.body.pos[2] - SK.pivot[2]]} scale={[0.36 * rig.shadow.scale, 1, 0.5 * rig.shadow.scale]} renderOrder={-1}>
          <meshBasicMaterial map={A.shadowMat.map} color="#000000" transparent opacity={shOpacity} depthWrite={false} />
        </mesh>
      ) : null}
      <group scale={rig.squash}>
        <group position={rig.body.pos} rotation={[rig.body.rx, rig.body.ry, rig.body.rz, 'YXZ']}>
          <group position={[-SK.pivot[0], -SK.pivot[1], -SK.pivot[2]]}>
            {/* torso */}
            <InkMesh geometry={A.torso} color={col.gold} outline={o(0.01)} position={SK.torso.c} />
            <InkMesh geometry={A.belly} color={col.cream} outline={o(0.008)} position={[0, 0.285, 0.0]} />
            <InkMesh geometry={A.chest} color={col.cream} outline={o(0.009)} position={[0, 0.385, 0.165]} />
            {[-1, 1].map((k) => (
              <InkMesh key={k} geometry={A.haunch} color={col.gold} outline={o(0.009)} position={[k * 0.112, 0.335, -0.165]} />
            ))}
            {/* chest fluff */}
            <InkMesh geometry={A.chestTuft} color={col.cream} outline={o(0.006)} position={[0, 0.33, 0.27]} rotation={[Math.PI - 0.55, 0, 0]} />
            <InkMesh geometry={A.chestTuft} color={col.cream} outline={o(0.006)} position={[0.05, 0.34, 0.26]} rotation={[Math.PI - 0.5, 0, 0.35]} scale={0.8} />
            <InkMesh geometry={A.chestTuft} color={col.cream} outline={o(0.006)} position={[-0.05, 0.34, 0.26]} rotation={[Math.PI - 0.5, 0, -0.35]} scale={0.8} />
            {/* legs */}
            <Leg ctx={ctx} hip={SK.frontHip} s={rig.legs.fl} />
            <Leg ctx={ctx} hip={[-SK.frontHip[0], SK.frontHip[1], SK.frontHip[2]]} s={rig.legs.fr} />
            <Leg ctx={ctx} hip={SK.rearHip} s={rig.legs.rl} />
            <Leg ctx={ctx} hip={[-SK.rearHip[0], SK.rearHip[1], SK.rearHip[2]]} s={rig.legs.rr} />
            {/* tail */}
            <group position={SK.tail} rotation={[rig.tail.rx, rig.tail.ry, rig.tail.rz, 'XZY']}>
              <InkMesh geometry={A.tailA} color={col.gold} outline={o(0.008)} />
              <group position={tailJ} rotation={[rig.tail.tipRx, 0, rig.tail.tipRz]}>
                <group position={[-tailJ[0], -tailJ[1], -tailJ[2]]}>
                  <InkMesh geometry={A.tailB} color={col.gold} outline={o(0.008)} />
                  <InkMesh geometry={A.tailTip} color={col.cream} outline={o(0.007)} position={[0, 0.11, 0.085]} />
                </group>
              </group>
            </group>
            {/* neck + collar + head */}
            <group position={SK.neck} rotation={[rig.neck.rx, rig.neck.ry, 0, 'YXZ']}>
              <group rotation-x={NECK_DIR}>
                <InkMesh geometry={A.neck} color={col.gold} outline={o(0.008)} position={[0, 0.07 * s, 0]} scale={[1, s, 1]} />
              </group>
              <group position={cc} rotation-x={COLLAR.tilt}>
                <InkMesh geometry={A.collar} color={col.collar} outline={o(0.006)} />
              </group>
              <group position={ring} rotation-x={-neckWorldRx}>
                <mesh geometry={A.tagRing} material={A.tagMat} position={[0, -0.006, 0]} />
                <group position={[0, -COLLAR.tagDrop, 0.004]}>
                  <InkMesh geometry={A.tag} material={A.tagMat} outline={o(0.0035)} />
                </group>
              </group>
              <group position={[SK.headOff[0] * s, SK.headOff[1] * s, SK.headOff[2] * s]} rotation={[rig.head.rx, rig.head.ry, rig.head.rz, 'YXZ']} scale={SK.headScale}>
                <Head ctx={ctx} rig={rig} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
