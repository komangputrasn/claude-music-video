// Chorus1 · shot B — 61.56 → 65.90. Line 13: "you put my whole house on a plan somehow."
// The house as a black cube on wet ground, backlit by the city haze. The sung line is stencilled on the house itself
// like a repossession notice; on "put … whole house" a red laser cage builds around it from the ground up; on "plan"
// a price is projected into the fog above it. He stands small at the side, looking at his caged house.
import React from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {Backlight, WetGround} from '../../lib/atmos';
import {FloatingPrice} from '../../lib/tenure';
import {HouseCube, Megablock} from '../../lib/sets';
import {bassAt, lerp} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';
import {guyIdle} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeOut, easeInOut, RIM_BONE} from './common';

export const SHOT_B = {t0: 61.56, t1: 65.9};
export const FOG_B = {color: S.ash, near: 30, far: 260};

const SIZE = 9;
/** the notice's rows, fixed (not wrapped by font metrics): YOU PUT MY / WHOLE HOUSE / ON A PLAN / SOMEHOW */
const ROWS13 = [[0, 1, 2], [3, 4], [5, 6, 7], [8]];

export const ShotHouse: React.FC<ShotProps> = ({t, f}) => {
  const u = prog(t, SHOT_B.t0, SHOT_B.t1);
  const e = easeOut(u);
  const bass = bassAt(f);
  const tPut = wordTime(13, 'put');
  const tHouse = wordTime(13, 'house');
  const tPlan = wordTime(13, 'plan');
  const cage = easeInOut(prog(t, tPut + 0.2, tHouse + 0.15));
  // the price snaps on with a projector stutter on "plan"
  const since = t - tPlan;
  const priceOn = since < 0 ? 0 : since < 0.2 ? (Math.floor(since * 40) % 2 ? 0.35 : 1) : 1;
  const gx = -7.4, gz = 8.2;
  return (
    <>
      <CameraRig position={[0, 0.85, lerp(36.5, 32.5, e)]} target={[0, 6.6, 0]} fov={cameraFovForVisible(30)} />
      <WetGround size={[600, 600]} reflectivity={0.85} puddles={0.5} time={t} color={GREYS.g1} />
      <Backlight position={[0, 9, -60]} size={[170, 70]} shape="radial" softness={1} intensity={0.66} noise={0.2} time={t} />
      <Backlight position={[0, 3, -40]} size={[260, 12]} shape="slab" softness={0.9} intensity={0.35} time={t} />
      {/* the far city, symmetrical, dark in the haze */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Megablock w={34} h={150} d={26} seed={s > 0 ? 21 : 22} position={[s * 54, 0, -120]} litFraction={0.015} ambient={0.18} color={GREYS.g3} />
          <Megablock w={30} h={210} d={26} seed={s > 0 ? 23 : 24} position={[s * 112, 0, -190]} litFraction={0.01} ambient={0.18} color={GREYS.g3} />
        </group>
      ))}
      <HouseCube size={SIZE} time={t} laserCage={cage} cagePulse={0.6 + 0.4 * bass} stencil="" ambient={0.05} facadeLight={0.05} doorIris={{open: 1, intensity: 1.4 + 0.3 * bass}} />
      {/* the notice, stencilled on the house */}
      <WorldLyric line={13} time={t} mode="paint" color={S.bone} intensity={0.82} size={0.84} rows={ROWS13} position={[0, 6.15, SIZE / 2 + 0.03]} until={SHOT_B.t1 + 0.05} />
      {/* the plan, projected in the fog above it (both lines clear the cage's front top edge in projection, so no laser
          line runs through the text) */}
      <FloatingPrice text="$9.99 / MO" size={1.45} position={[0, 14.1, 0]} time={t} intensity={1.35} opacity={priceOn} haze={0.7} />
      <FloatingPrice text="WHOLE HOUSE PLAN · AUTO-RENEW" font="mono" size={0.36} position={[0, 12.8, 0]} time={t} intensity={0.9} color={S.bone} haze={0.3} opacity={priceOn} />
      <SilGuy pose={guyIdle(t, 5)} position={[gx, 0, gz]} rotation-y={Math.atan2(-gx, -gz)} rim={{...RIM_BONE, dir: [0.4, 1]}} />
    </>
  );
};
