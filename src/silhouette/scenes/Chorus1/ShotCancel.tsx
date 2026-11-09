// Chorus1 · shot D — 70.24 → 74.61. Line 15: "click to cancel, I'm cancelling you."
// An endless colonnade on wet black stone. At its end a TENURE screen with a red CANCEL button; the sung line glows on
// the screen above the button. He walks toward it (back to us, the camera following him at walking pace) and the screen
// slides away faster than he can walk: it shrinks while the colonnade keeps coming — the hall stretches.
import React, {useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {Backlight, WetGround, FogLayers} from '../../lib/atmos';
import {TenureScreen, screenDims} from '../../lib/tenure';
import {bassAt, lerp} from '../../../lib/time';
import {guyWalk, GUY} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeInOut, BoxRow, CancelButton, rowsPerWord, RIM_RED} from './common';

export const SHOT_D = {t0: 70.24, t1: 74.61};
export const FOG_D = {color: S.ash, near: 30, far: 520};

const WALK = GUY.strideLength * 0.94; // m/s
const SCREEN = {width: 40, height: 22, content: {chrome: true, lines: [], header: 'TENURE · ACCOUNT', footer: 'CANCELLATION REQUESTS ARE PROCESSED WITHIN 30–90 BILLING CYCLES · TERMS 14.3(b)'}};

const EM = 2.75;
const PILLAR_X = 23;
const ROWS15 = rowsPerWord(15, EM, [[0, 1, 2], [3, 4, 5]]);

export const ShotCancel: React.FC<ShotProps> = ({t, f}) => {
  const lt = t - SHOT_D.t0;
  const u = prog(t, SHOT_D.t0, SHOT_D.t1);
  const bass = bassAt(f);
  const gz = -lt * WALK; // the Guy walks toward -Z
  const camZ = gz + 24;
  // the screen recedes: 92 m → ~128 m from the camera over the shot (it slides away much faster than he walks)
  const sz = camZ - lerp(92, 128, easeInOut(u)) - 0.15 * lt;
  const dims = screenDims({width: SCREEN.width, height: SCREEN.height});
  const faceZ = sz + dims.depth + 0.06;
  const faceY0 = 2.2 + dims.border;
  const pillars = useMemo(() => {
    const out: [number, number, number][] = [];
    // tight to the screen (its outer edge is at ±20.4 m), so the colonnade converges on it in one-point perspective
    for (let k = 0; k < 120; k++) for (const s of [-1, 1]) out.push([s * PILLAR_X, 0, 30 - k * 12]);
    return out;
  }, []);
  return (
    <>
      <CameraRig position={[0, 1.45, camZ]} target={[0, 9.5, sz]} fov={cameraFovForVisible(24)} />
      <WetGround size={[240, 1600]} position={[0, 0, -650]} reflectivity={0.9} puddles={0.6} streak={1} time={t} color={GREYS.g1} />
      {/* the haze behind the screen and down the colonnade (all of it beyond the walker) */}
      <Backlight position={[0, 1.2, sz - 30]} size={[150, 8]} shape="slab" softness={1} intensity={0.48} noise={0.15} time={t} />
      <Backlight position={[0, 14, sz - 60]} size={[200, 70]} shape="radial" softness={1} intensity={0.16} noise={0.2} time={t} />
      {/* lit haze outside the hall, far beyond the screen: seen through the gaps, the pillars stand black against it */}
      <Backlight position={[0, 16, camZ - 230]} size={[560, 84]} shape="slab" softness={1} intensity={0.5} noise={0.25} time={t} />
      <FogLayers position={[0, 0, gz - 4]} count={7} near={2} far={140} width={60} height={30} color={S.fog} density={0.07} time={t} />
      <BoxRow positions={pillars} size={[3.4, 60, 3.4]} color={GREYS.g2} concrete ambient={0.04} />
      {/* the receding screen + button */}
      <group position={[0, 0, 0]}>
        <TenureScreen position={[0, 2.2, sz]} width={SCREEN.width} height={SCREEN.height} content={SCREEN.content} time={t} pulse={bass * 0.7} haze={0.25} intensity={1.1} />
        <WorldLyric line={15} time={t} mode="screen" size={EM} position={[0, faceY0 + SCREEN.height * 0.73, faceZ]} until={SHOT_D.t1 + 0.05} perWord={ROWS15} />
        <CancelButton width={16} intensity={1.0 + 0.25 * bass} halo={0.4} position={[0, faceY0 + SCREEN.height * 0.26, faceZ + 0.02]} />
      </group>
      <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[0, 0, gz]} rim={{...RIM_RED, strength: 0.6, dir: [0, 1]}} />
    </>
  );
};
