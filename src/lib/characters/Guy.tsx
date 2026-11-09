/**
 * <Guy> — the protagonist. Early-20s, low-poly cel-shaded (toonMat + ink outlines), spiky frosted-tip hair, oversized
 * tangerine hoodie with a white chest stripe, baggy blue cargo jeans, chunky white skate shoes, lime wristband.
 * ~1.8 m tall (≈5.5 heads), faces +Z, feet on y=0, origin between the feet (hip joint stays above the origin).
 *
 * API
 *   <Guy pose={GuyPose} rightHand={<Hammer/>} leftHand={...} outfit={{hoodie: '#c06010'}} outlineScale={1} shadow {...groupProps}/>
 *     pose        all joint angles / face (see GuyPose in ./guy/rig.ts). Pure: pass frame-derived numbers every render.
 *     rightHand / leftHand
 *                 rendered in the hand's GRIP FRAME (origin = centre of the closed fist), so props follow the arm.
 *                 With the arm hanging relaxed: +Z points forward out of the thumb side, -Y points down along the
 *                 fingers, the palm faces the thigh (palm normal = +X for the right hand, -X for the left).
 *                 - handles (hammer, keys, bag strap): run the handle along Z through the origin. Hammer: handle from
 *                   z≈-0.06 to z≈+0.34, head at z≈+0.33 with its striking face toward -Y (matches guyHammerSwing and
 *                   GUY.hammerImpact).
 *                 - phone (guyPhoneToEar): long axis along Y, earpiece toward -Y (fingertips), screen facing the palm.
 *                 - book / bag held up (guyHoldUp): centre it on the origin; rotate it in your own group as needed.
 *                 Holding a prop auto-closes the fist (grip=1) unless the arm pose sets `grip`.
 *     outfit      optional colour overrides (Partial<GuyColors>), e.g. a darker wet hoodie in the rain.
 *     outlineScale multiply ink-outline thickness (e.g. 1.6 for far wide shots); 0 disables outlines (same as Pancake).
 *     shadow      soft blob shadow on the floor under the hips (y=0 of the group). true | opacity (default 0.35) | false.
 *     ...group    position / rotation / scale / visible ... passthrough.
 *
 *   Pose model: every field is optional; limbs you don't set use a relaxed rest pose. The walk/run cycle (pose.walk)
 *   is ADDED on top of limb values, so posed limbs and mixPose blends keep walking; set arm.swing = 0 to stop an
 *   arm swinging (e.g. mergePose(guyWalk(t), guyPhoneToEar(t)) already does that for the phone arm).
 *   Hip height is solved automatically so the lowest sole touches y=0 (pose.ground = 0 to disable, hipsY to offset).
 *   sit=1: thighs on a seat at GUY.seatHeight, hip joint above the origin, feet ~0.45 m forward.
 *   bed=1 + lie 0..1: hips on the surface at the origin, legs flat along +Z, head toward -Z (lie=1 flat, 0 sitting up).
 *   Expressions: neutral sleepy shock angry sad happy determined yell cold; cross-fade with expression2/expressionMix;
 *   mouthOpen (lip-sync), blink, eyesX/eyesY (look direction), shiver (+t) for chattering cold jitter.
 *
 *   Pose helpers (./guy/poses.ts, re-exported): guyIdle(t), guyWalk(t), guyRun(t), guySleepyWake(p), guyShiver(t),
 *     guyHammerSwing(p), guyClimb(p), guyCheer(t), guyPhoneToEar(), guyHoldUp(p), guyPatDog(t), guySitOn(seatY), guyBlink(t),
 *     mergePose(a, b), mixPose(a, b, t), keyPoses(p, [[p0, poseA], [p1, poseB], ...]).
 *   Forward kinematics: guyPoint(pose, 'gripR' | 'head' | 'eyes' | ...) -> [x, y, z] in Guy-local space.
 *   Anchors: GUY.{height, eyeHeight, seatHeight, shoulderWidth, ...}.
 *
 * Usage
 *   const f = useCurrentFrame(); const t = f / 30;
 *   <Guy position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}
 *        pose={mergePose(guyWalk(t), {expression: 'determined', headYaw: -0.3})} />
 *   <Guy pose={guyHammerSwing(p)} rightHand={<GrandpasHammer/>} />
 *   <Guy pose={{...guyPhoneToEar(t), expression: 'angry', mouthOpen: talk}} rightHand={<FlipPhone/>} />
 *   <Guy position={[0, bedTop, 0]} pose={guySleepyWake(p)} />   // in-bed: hips on mattress at the origin, head -> -Z
 *
 * Determinism: no clocks, no useFrame. The face is a CanvasTexture redrawn in useLayoutEffect only when the
 * (quantised) face state changes. Geometry is built once per outfit and shared by all instances.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {InkMesh} from './InkMesh';
import {toonMat, TOON_GRADIENT} from './toon';
import {DIM, resolveGuy, guyJointMatrix, guyPoint} from './guy/rig';
import {guyHammerSwing} from './guy/poses';
import type {FaceState, GuyPose, Xf, ArmXf, LegXf} from './guy/rig';
import {drawFace, faceKey, faceUvTransform, FACE_TEX_SIZE, FACE_LAYOUT} from './guy/face';
import {getGuyGeometry, GUY_COLORS, headPoint, torsoFrontZ} from './guy/geometry';
import type {GuyColors, GuyGeometry} from './guy/geometry';

export type {GuyPose, GuyArmPose, GuyLegPose, GuyExpression, GuyJoint} from './guy/rig';
export {resolveGuy, guyPoint, guyJointMatrix, DIM as GUY_DIM, REST_ARM as GUY_REST_ARM, REST_LEG as GUY_REST_LEG} from './guy/rig';
export {
  guyIdle, guyWalk, guyRun, guySleepyWake, guyShiver, guyHammerSwing, guyClimb, guyCheer, guyPhoneToEar, guyHoldUp,
  guyPatDog, guySitOn, guyBlink, mergePose, mixPose, keyPoses,
} from './guy/poses';
export {GUY_COLORS} from './guy/geometry';
export type {GuyColors} from './guy/geometry';

const STEP_PER_CYCLE = 4 * (DIM.thigh + DIM.shin + DIM.ankleH * 0.5) * Math.sin(0.36);

/** Body anchors (metres, Guy-local, standing rest pose unless noted). */
export const GUY = {
  /** top of the hair spikes */
  height: 1.79,
  /** top of the skull (under the hair) */
  skullTop: DIM.hipH + DIM.spineY + DIM.neckY + DIM.headY + DIM.headR * 1.08,
  headCenterY: DIM.hipH + DIM.spineY + DIM.neckY + DIM.headY, // 1.528
  eyeHeight: guyPoint({}, 'eyes')[1],
  chinY: DIM.hipH + DIM.spineY + DIM.neckY + DIM.headY - 0.165,
  /** skull width (excluding ears and hair) */
  headWidth: 0.32,
  shoulderHeight: DIM.hipH + DIM.spineY + DIM.shoulderY, // 1.30
  /** shoulder joint to shoulder joint */
  shoulderWidth: DIM.shoulderX * 2,
  /** outer width of the hoodie+sleeves at the shoulders */
  bodyWidth: 0.58,
  hipHeight: DIM.hipH,
  /** seat surface height his thighs rest on when sit=1 with feet flat on the floor */
  seatHeight: DIM.shin + DIM.ankleH - 0.095, // 0.37
  /** hip joint height when sit=1 */
  sitHipHeight: DIM.shin + DIM.ankleH, // 0.465
  /** knees / feet forward of the origin when sitting */
  sitKneeZ: DIM.thigh,
  /** hip-joint height above the mattress when lying (lie=1) or in bed mode */
  lieHeight: DIM.lieH,
  /** head centre offset along -Z from the origin when lying flat */
  lieHeadZ: -(DIM.spineY + DIM.neckY + DIM.headY),
  /** grip point (centre of the fist) with arms hanging at rest: [x, y, z] of the RIGHT hand; mirror x for the left */
  handHang: guyPoint({}, 'gripR'),
  /** ground distance covered per walk cycle (move root by strideLength * cadence m/s with guyWalk) */
  strideLength: STEP_PER_CYCLE,
  footLength: DIM.toe - DIM.heel,
  /** where the hammer head lands at guyHammerSwing(0.5), for a head 0.33 m out along the grip's +Z (Guy-local) */
  hammerImpact: (() => {
    const v = new THREE.Vector3(0, 0, 0.33).applyMatrix4(guyJointMatrix(guyHammerSwing(0.5), 'gripR', {R: true}));
    return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)] as [number, number, number];
  })(),
  /** good camera targets (standing rest pose) */
  faceTarget: [0, 1.5, 0.05] as [number, number, number],
  chestTarget: [0, 1.17, 0] as [number, number, number],
};

const OL0 = {body: 0.011, head: 0.008, hand: 0.006, small: 0.0045, hair: 0.007};
type OLT = {[K in keyof typeof OL0]: number | false};
const scaleOL = (k: number): OLT =>
  Object.fromEntries(Object.entries(OL0).map(([n, v]) => [n, k > 0 ? +(v * k).toFixed(5) : false])) as OLT;

let shadowTexSingleton: THREE.CanvasTexture | null = null;
const shadowTex = () => {
  if (!shadowTexSingleton) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    shadowTexSingleton = new THREE.CanvasTexture(c);
  }
  return shadowTexSingleton;
};

let vcMatSingleton: THREE.MeshToonMaterial | null = null;
const vcMat = () => {
  if (!vcMatSingleton) vcMatSingleton = new THREE.MeshToonMaterial({color: '#ffffff', vertexColors: true, gradientMap: TOON_GRADIENT});
  return vcMatSingleton;
};

const J: React.FC<{x: Xf; children?: React.ReactNode}> = ({x, children}) => (
  <group position={x.p} rotation={x.r}>
    {children}
  </group>
);

const useFaceMaterial = (face: FaceState, skin: string) => {
  const res = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = FACE_TEX_SIZE;
    canvas.height = FACE_TEX_SIZE;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const {repeat, offset} = faceUvTransform();
    tex.repeat.set(repeat[0], repeat[1]);
    tex.offset.set(offset[0], offset[1]);
    const mat = new THREE.MeshToonMaterial({map: tex, gradientMap: TOON_GRADIENT, color: '#ffffff'});
    return {canvas, tex, mat};
  }, []);
  const key = faceKey(face) + skin;
  useLayoutEffect(() => {
    const ctx = res.canvas.getContext('2d');
    if (!ctx) return;
    drawFace(ctx, face, skin);
    res.tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, res]);
  useLayoutEffect(
    () => () => {
      res.tex.dispose();
      res.mat.dispose();
    },
    [res],
  );
  return res.mat;
};

const Arm: React.FC<{a: ArmXf; s: 1 | -1; G: GuyGeometry; c: GuyColors; OL: OLT; children?: React.ReactNode; band?: boolean}> = ({a, s, G, c, OL, children, band}) => (
  <J x={a.shoulder}>
    <InkMesh geometry={G.upperArm} material={vcMat()} outline={OL.body} />
    <J x={a.elbow}>
      <InkMesh geometry={G.forearm} material={vcMat()} outline={OL.body} />
      <InkMesh geometry={G.wrist} color={c.skin} outline={OL.small} />
      {band ? <InkMesh geometry={G.wristband} color={c.wristband} outline={OL.small} /> : null}
      <J x={a.wrist}>
        <InkMesh geometry={G.palm} color={c.skin} outline={OL.hand} />
        <J x={a.fingers}>
          <InkMesh geometry={G.fingers} color={c.skin} outline={OL.hand} />
        </J>
        <J x={a.thumb}>
          <InkMesh geometry={G.thumb} color={c.skin} outline={OL.small} />
        </J>
        <J x={a.grip}>{children}</J>
      </J>
    </J>
  </J>
);

const Leg: React.FC<{l: LegXf; s: 1 | -1; G: GuyGeometry; c: GuyColors; OL: OLT}> = ({l, s, G, c, OL}) => (
  <J x={l.hip}>
    <InkMesh geometry={G.thigh} material={vcMat()} outline={OL.body} />
    <InkMesh geometry={G.cargo} color={c.jeansDark} outline={OL.small} position={[s * 0.094, -0.235, -0.005]} />
    <InkMesh geometry={G.cargoFlap} color={c.jeansDark} outline={OL.small} position={[s * 0.097, -0.17, -0.005]} />
    <J x={l.knee}>
      <InkMesh geometry={G.shin} material={vcMat()} outline={OL.body} />
      <J x={l.ankle}>
        <InkMesh geometry={G.sole} color={c.sole} outline={OL.hand} />
        <InkMesh geometry={G.shoeHeel} color={c.shoe} outline={OL.hand} />
        <InkMesh geometry={G.shoeToe} color={c.shoe} outline={OL.hand} />
        <InkMesh geometry={G.tongue} color={c.shoe} outline={OL.small} />
        <InkMesh geometry={G.shoeStripe} color={c.shoeAccent} outline={false} position={[s * 0.0655, -DIM.ankleH + 0.06, 0.06]} rotation={[0.12, 0, 0]} />
        <InkMesh geometry={G.shoeStripe} color={c.shoeAccent} outline={false} position={[-s * 0.0655, -DIM.ankleH + 0.06, 0.06]} rotation={[0.12, 0, 0]} />
        <InkMesh geometry={G.laces} color={c.laces} outline={false} position={[0, -DIM.ankleH + 0.1, 0.13]} rotation={[0.35, 0, 0]} />
        <InkMesh geometry={G.laces} color={c.laces} outline={false} position={[0, -DIM.ankleH + 0.088, 0.165]} rotation={[0.45, 0, 0]} />
      </J>
    </J>
  </J>
);

export type GuyProps = Omit<ThreeElements['group'], 'children'> & {
  pose?: GuyPose;
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
  outfit?: Partial<GuyColors>;
  /** multiply ink-outline thickness (e.g. 1.6 for far wide shots); 0 disables outlines */
  outlineScale?: number;
  /** soft blob shadow on the floor (y=0) under the hips. number = opacity (default 0.35) */
  shadow?: boolean | number;
};

export const Guy: React.FC<GuyProps> = ({pose, rightHand, leftHand, outfit, outlineScale = 1, shadow = true, ...group}) => {
  const OL = useMemo(() => scaleOL(outlineScale), [outlineScale]);
  const c = useMemo<GuyColors>(() => ({...GUY_COLORS, ...(outfit ?? {})}), [outfit && JSON.stringify(outfit)]);
  const G = useMemo(() => getGuyGeometry(c), [c]);
  const rig = resolveGuy(pose ?? {}, {L: leftHand != null, R: rightHand != null});
  const faceMat = useFaceMaterial(rig.face, c.skin);

  const nosePos = useMemo(() => {
    const p = headPoint(0, FACE_LAYOUT.noseLat, 1);
    return [p.x, p.y, p.z + 0.003] as [number, number, number];
  }, []);
  const earPos = useMemo(() => {
    const p = headPoint(Math.PI / 2 - 0.08, -0.07, 1);
    return [p.x - 0.004, p.y, p.z] as [number, number, number];
  }, []);
  const stringZ = torsoFrontZ(0.455) - 0.012;
  // blob shadow: follows the hips, fades / shrinks as he leaves the floor
  const hp = rig.hips.p;
  const air = Math.max(0, Math.min(1, (hp[1] - DIM.hipH) / 0.4));
  const shOpacity = shadow === false ? 0 : (typeof shadow === 'number' ? shadow : 0.35) * (1 - 0.6 * air);
  const shScale = 1 - 0.35 * air;

  return (
    <group {...group}>
      {shOpacity > 0 ? (
        <mesh position={[hp[0], 0.004, hp[2] + 0.04]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.46 * shScale, 0.34 * shScale, 1]} renderOrder={-1}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial map={shadowTex()} color="#000000" transparent opacity={shOpacity} depthWrite={false} />
        </mesh>
      ) : null}
      <J x={rig.hips}>
        <InkMesh geometry={G.pelvis} color={c.jeans} outline={OL.body} />
        <Leg l={rig.legL} s={1} G={G} c={c} OL={OL} />
        <Leg l={rig.legR} s={-1} G={G} c={c} OL={OL} />
        <J x={rig.spine}>
          <InkMesh geometry={G.torso} material={vcMat()} outline={OL.body} />
          <mesh geometry={G.pocket} material={toonMat(c.hoodieRib)} />
          <InkMesh geometry={G.hoodRing} color={c.hoodie} outline={OL.body} position={[0, 0.468, -0.008]} />
          <InkMesh geometry={G.hoodBack} color={c.hoodie} outline={OL.body} position={[0, 0.445, -0.135]} rotation={[-0.45, 0, 0]} />
          {[1, -1].map((s) => (
            <group key={s} position={[s * 0.042, 0.448, stringZ + 0.012]} rotation={[-0.3, 0, s * 0.06]}>
              <InkMesh geometry={G.string} color={c.drawstring} outline={OL.small} />
              <InkMesh geometry={G.aglet} color={'#B8C2D0'} outline={OL.small} position={[0, -0.105, 0]} />
            </group>
          ))}
          <J x={rig.neck}>
            <InkMesh geometry={G.neck} color={c.skin} outline={OL.small} />
            <J x={rig.head}>
              <InkMesh geometry={G.head} material={faceMat} outline={OL.head} />
              <InkMesh geometry={G.nose} color={c.nose} outline={OL.small} position={nosePos} />
              {[1, -1].map((s) => (
                <group key={s} position={[s * earPos[0], earPos[1], earPos[2]]} rotation={[0.1, s * -0.25, s * -0.08]}>
                  <InkMesh geometry={G.ear} color={c.skin} outline={OL.small} />
                  <InkMesh geometry={G.earInner} color={c.nose} outline={false} position={[s * 0.012, 0, 0.004]} />
                </group>
              ))}
              <InkMesh geometry={G.hairCap} color={c.hair} outline={OL.hair} />
              <InkMesh geometry={G.spikes} material={vcMat()} outline={OL.hair} />
            </J>
          </J>
          <Arm a={rig.armL} s={1} G={G} c={c} OL={OL} band>
            {leftHand}
          </Arm>
          <Arm a={rig.armR} s={-1} G={G} c={c} OL={OL}>
            {rightHand}
          </Arm>
        </J>
      </J>
    </group>
  );
};

export default Guy;
