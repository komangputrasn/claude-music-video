// Pre · shot 1 — KNEEL, 47.47 → 50.33 (abs 1424–1509). Line 8: "Hold on, buddy, I'll be right back,"
// The way out. A black wall with one wide doorway of soft bone light; the light spills across the floor toward us.
// In it, strictly in profile, he lowers onto one knee (on "Hold on") and lays his hand on Pancake's head (on "buddy");
// Pancake sits facing him, ears low, tail still, head dipping into the hand. The touch sits on the doorway's axis.
// One small red eye watches from the wall beside the door. The line hangs as soft light in the haze above them,
// over the lintel, drifting up like breath. Slow push-in.
import React, {useLayoutEffect, useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy, SilPancake} from '../../lib/SilCast';
import {Silhouette} from '../../lib/Silhouette';
import {Iris} from '../../lib/Iris';
import {WorldLyric, measureLyric} from '../../lib/WorldLyric';
import {Backlight, LightShaft} from '../../lib/atmos';
import {Stencil, leaseCode} from '../../lib/tenure';
import {useConcreteMat, wboxMinMax, mergeBoxes, FLOOR_TILE} from '../../lib/sets';
import * as THREE from 'three';
import {bassAt} from '../../../lib/time';
import {guyJointMatrix, GuyPose} from '../../../lib/characters/Guy';
import {GlowCard, ShotProps, spillTex, smooth, prog, easeInOut, lerp} from './common';
import {guyKneelPat, pancakeWaitSit} from './pose';
import {T0, T_CUT, W} from './timing';

export const FOG_KNEEL = {color: S.ash, near: 13, far: 70};

const WALL_Z = -2.5;
const WALL_T = 0.5;
const DOOR = {w: 2.6, h: 2.7};
/** he kneels facing +X, Pancake sits facing -X; the hand (rig-probed: grip at [-0.175, 0.786, 0.721] Guy-local at
 *  k = r = 1) rests on Pancake's head top. Positions solved so the head top sits right under the hand. */
const GUY_POS: [number, number, number] = [-0.55, 0, -0.5];
const DOG_POS: [number, number, number] = [GUY_POS[0] + 0.834, 0, GUY_POS[2] + 0.213];
const RIM = {color: S.bone, strength: 0.7, power: 6, dir: [0, 1] as [number, number]};
const VIS_FOV = 24;
const LYRIC_EM = 0.34;

/** Cowl filler (local; the shared hood is untouched). In strict profile the SilGuy hood's back drape stands off the
 *  neck as a separate point, which reads as a ponytail. A soft black volume behind the neck, carried by the NECK joint
 *  (not the head), closes the gap so the hood flows into the shoulders like a hoodie's cowl. */
const COWL = new THREE.SphereGeometry(1, 16, 12);
const HoodFill: React.FC<{pose: GuyPose; rim: typeof RIM} & Omit<React.ComponentProps<'group'>, 'children'>> = ({pose, rim, ...group}) => {
  const m = guyJointMatrix(pose, 'neck');
  return (
    <group {...group}>
      <Silhouette rim={rim}>
        <group matrix={m} matrixAutoUpdate={false}>
          <mesh geometry={COWL} position={[0, 0.0, -0.13]} scale={[0.13, 0.15, 0.12]} />
        </group>
      </Silhouette>
    </group>
  );
};

const Wall: React.FC = () => {
  const mat = useConcreteMat({color: GREYS.g4, ambient: 0.05, kind: 'wall'});
  const geo = useMemo(() => {
    const S2 = 30;
    const z0 = WALL_Z - WALL_T;
    return mergeBoxes([
      wboxMinMax([-DOOR.w / 2 - S2, 0, z0], [-DOOR.w / 2, 20, WALL_Z]),
      wboxMinMax([DOOR.w / 2, 0, z0], [DOOR.w / 2 + S2, 20, WALL_Z]),
      wboxMinMax([-DOOR.w / 2 - 0.01, DOOR.h, z0], [DOOR.w / 2 + 0.01, 20, WALL_Z]),
    ]);
  }, []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} />;
};

const Floor: React.FC = () => {
  const mat = useConcreteMat({color: GREYS.g3, ambient: 0.035, kind: 'floor'});
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * 60) / (FLOOR_TILE * 2), (uv.getY(i) * 60) / (FLOOR_TILE * 2));
    return g;
  }, []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} position={[0, 0, WALL_Z + 30]} />;
};

export const ShotKneel: React.FC<ShotProps> = ({t, abs}) => {
  const e = easeInOut(prog(t, T0, T_CUT));
  const bass = bassAt(abs);
  // acting
  const k = smooth(prog(t, W.hold - 0.3, W.hold + 0.5)); // he lowers onto one knee on "Hold on"
  const r = smooth(prog(t, W.hold + 0.3, W.buddy)); // he reaches out as he settles; the hand lands on "buddy"
  const touch = smooth(prog(t, W.buddy - 0.12, W.buddy + 0.4));
  const stroke = Math.max(0, t - W.buddy) * 2.1;
  const guyPose = guyKneelPat(k, r, stroke, t);
  const dogPose = pancakeWaitSit(t, touch);
  // the line: two rows of soft light above the lintel
  const maxW = useMemo(() => measureLyric(8, LYRIC_EM).width * 0.58, []);
  const breath = (_i: number, info: {since: number}) => ({offset: [0, Math.min(0.12, Math.max(0, info.since) * 0.035), 0] as [number, number, number]});
  return (
    <>
      <CameraRig position={[0, 1.15, lerp(10.4, 9.3, e)]} target={[0, 1.78, WALL_Z]} fov={cameraFovForVisible(VIS_FOV)} />
      <Floor />
      <Wall />
      {/* beyond the door: a column of soft light filling the opening (stays under bloom) */}
      <Backlight position={[0, 1.5, WALL_Z - 4.5]} size={[7.5, 6]} shape="vertical" intensity={0.6} softness={0.9} noise={0.14} time={t} />
      {/* light scattered in the room haze around the door (on the wall, faint) */}
      <GlowCard position={[0, 1.6, WALL_Z + 0.02]} scale={[8, 5.5]} intensity={0.035} />
      {/* the spill across the floor toward us, and the beam through the haze (figures inside it stay pure black) */}
      <GlowCard tex={spillTex()} position={[0, 0.004, WALL_Z + 3.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[5.4, 6.4]} intensity={0.3} renderOrder={1} />
      <LightShaft from={[0, 1.4, WALL_Z + 0.06]} to={[0, 0.4, 4.0]} radiusStart={1.2} radiusEnd={2.4} intensity={0.08} softness={1.2}
        striation={0.6} dust={220} dustSize={0.012} dustSpeed={0.04} time={t} ground={0} groundFade={0.2} seed={8} />
      {/* TENURE watches from the wall: the door lock's eye, a stencilled lease line */}
      <Iris position={[DOOR.w / 2 + 0.55, 1.42, WALL_Z + 0.01]} radius={0.085} time={t} pupil={0.3 + 0.04 * bass} intensity={1.4} />
      <Stencil text={leaseCode()} font="mono" size={0.06} color={GREYS.g6} intensity={0.45} position={[DOOR.w / 2 + 0.55, 1.22, WALL_Z + 0.01]} />
      <Stencil text="EXIT · ON PLAN" font="mono" size={0.05} color={GREYS.g6} intensity={0.4} position={[DOOR.w / 2 + 0.55, 1.12, WALL_Z + 0.01]} />
      {/* the two of them, in profile */}
      <SilGuy pose={guyPose} position={GUY_POS} rotation-y={Math.PI / 2} rim={RIM} />
      <HoodFill pose={guyPose} position={GUY_POS} rotation-y={Math.PI / 2} rim={RIM} />
      <SilPancake pose={dogPose} position={DOG_POS} rotation-y={-Math.PI / 2} rim={RIM} />
      {/* "HOLD ON, BUDDY, / I'LL BE RIGHT BACK," */}
      <WorldLyric line={8} time={t} size={LYRIC_EM} maxWidth={maxW} position={[0, 3.08, WALL_Z + 0.9]} intensity={0.95} halo={0.3} until={T_CUT + 0.1} perWord={breath} />
    </>
  );
};
