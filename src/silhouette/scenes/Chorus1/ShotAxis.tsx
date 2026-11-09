// Chorus1 · shot H — 87.63 → 92.56 (scene end). Line 19: "click to cancel, I'm cancelling you."
// The widest frame of the chorus: a raised black causeway runs dead-centre through a canyon of tagged towers to the
// vanishing point, where the CANCEL button is a single red dot. He is a speck walking toward it. The line stands on the
// causeway ahead of him as words of light, each word further down the axis than the last (and bigger, so all read the
// same size): the sentence itself recedes toward the button — the more he cancels, the further away it gets.
// A slow crane rises until the 92.00 downbeat, where the red dot pulses once and the frame holds.
import React, {useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {Backlight, LightPool} from '../../lib/atmos';
import {TenureScreen, LeaseTags, leaseTagBox, mergeTagSets} from '../../lib/tenure';
import {CityGrid, cityGridLayout} from '../../lib/sets';
import {bassAt, lerp} from '../../../lib/time';
import {guyWalk, GUY} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeInOut, flashAfter, Ground, BoxRow, Slab, CancelButton, GlowCard, rowsPerWord, RIM_BONE} from './common';

export const SHOT_H = {t0: 87.63, t1: 92.56};
export const FOG_H = {color: S.ash, near: 140, far: 1700};

const END_Z = -1500; // the button
const CAUSE_W = 46;
const WALK = GUY.strideLength * 0.94;
const DOWN = 92.0;
const CITY = {rows: 26, cols: 12, spacing: 74, seed: 6, height: [70, 230] as [number, number], footprint: [26, 46] as [number, number], litFraction: 0.012};
const CITY_Z = -720;
// camera crane (mid values used to lay the two rows of words out on screen)
const CAM0 = {y: 33, z: 10};
const CAM1 = {y: 36.5, z: 3};
const CAM_MID = {y: 34.7, z: 6.5};
const TARGET_Z = -330; // horizon (and the red dot) sits ~0.4 above the frame centre
/** row 0 "CLICK TO CANCEL," far down the axis near the button; row 1 "I'M CANCELLING YOU." nearer, ahead of him */
const ROWS = [6.3, 10.6].map((dep) => {
  const D = CAM_MID.y / Math.tan((dep * Math.PI) / 180);
  const em = 0.0268 * D;
  return {z: CAM_MID.z - D, em};
}).map((r, k) => ({...r, place: rowsPerWord(19, r.em, [k === 0 ? [0, 1, 2] : [3, 4, 5]])}));

export const ShotAxis: React.FC<ShotProps> = ({t, f}) => {
  const lt = t - SHOT_H.t0;
  const e = easeInOut(prog(t, SHOT_H.t0, DOWN));
  const bass = bassAt(f);
  const gz = -117 - lt * WALK;
  const avoid = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let z = -1100; z <= 1100; z += 40) out.push([0, z, 62]);
    return out;
  }, []);
  const tags = useMemo(() => {
    const blocks = cityGridLayout({...CITY, avoid});
    return mergeTagSets(...blocks.map((b, i) => leaseTagBox({width: b.w, depth: b.d, height: b.h, density: 0.03, seed: 40 + i, x: b.x, z: b.z + CITY_Z})));
  }, [avoid]);
  const lights = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let k = 0; k < 190; k++) for (const s of [-1, 1]) out.push([s * (CAUSE_W / 2 - 0.8), 0, 40 - k * 8]);
    return out;
  }, []);
  const pulse = flashAfter(t, DOWN, 3.5);
  return (
    <>
      <CameraRig position={[0, lerp(CAM0.y, CAM1.y, e), lerp(CAM0.z, CAM1.z, e)]} target={[0, 0, TARGET_Z]} fov={cameraFovForVisible(26)} />
      <Ground y={-8} color={S.void} />
      {/* the horizon: city glow low in the haze, the red sun of the button at the vanishing point */}
      <Backlight position={[0, 40, END_Z - 200]} size={[3000, 260]} shape="slab" softness={1} intensity={0.34} time={t} />
      <GlowCard position={[0, 10, END_Z - 10]} scale={[130, 60]} color={S.authRed} intensity={0.32 + 0.45 * pulse + 0.06 * bass} />
      <CityGrid {...CITY} avoid={avoid} position={[0, -8, CITY_Z]} color={GREYS.g2} ambient={0.55} />
      <LeaseTags positions={tags.positions} facing={tags.facing} position={[0, -8, 0]} size={2.4} time={t} intensity={1.25} minPx={1.2} flicker={0.15} seed={3} />
      {/* the causeway: dark stone, a thin bone axis line, runway lights converging on the dot */}
      <Slab size={[CAUSE_W, 8, 1700]} position={[0, -8, -760]} color={GREYS.g2} ambient={0.06} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, -760]}>
        <planeGeometry args={[0.35, 1700]} />
        <meshBasicMaterial color={S.bone} fog toneMapped />
      </mesh>
      <BoxRow positions={lights} size={[0.6, 0.25, 0.6]} color={S.bone} intensity={1.6} />
      <TenureScreen position={[0, 0, END_Z]} width={40} height={22} content={{chrome: true, lines: []}} time={t} intensity={0.8} haze={0.2} fog={0.6} />
      <CancelButton width={18 * (1 + 0.5 * pulse)} intensity={1.35 + 0.15 * pulse} halo={0.9 + 0.3 * pulse} position={[0, 9, END_Z + 1.5]} />
      {/* the sentence stands on the causeway in two rows of light, the first one far down the axis near the button */}
      {ROWS.map((r, k) => (
        <WorldLyric key={k} line={19} time={t} size={r.em} position={[0, r.em * 0.2, r.z]} until={SHOT_H.t1 + 0.1} intensity={1.15} perWord={r.place} />
      ))}
      {/* a pool of light on the causeway: he walks through it, a speck of black */}
      <LightPool position={[0, 0, -121]} radius={5} color={S.bone} intensity={0.75} haze={0.4} hazeHeight={4} />
      <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[0, 0, gz]} rim={{...RIM_BONE, strength: 1.1, dir: [0, 1]}} />
    </>
  );
};
