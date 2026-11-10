/**
 * Shot 1 — STREET (scene-local 0–80, song 109.97–112.66). "…by the way. / I walked home in the rain, and the doorbell"
 * Low long lens straight down a black avenue in hard rain. At its end a giant TENURE screen glows bone through the
 * haze — the only light — and the sung words stand on it as black letters (rain-streaked). The hooded figure walks
 * away from us down the axis, small, a black cut-out against the screen and its long reflection in the wet road.
 * Two tall TENURE banners (red iris) flank the axis; their red smears down the wet asphalt.
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {Iris} from '../../lib/Iris';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {Backlight, SilRain, WetGround} from '../../lib/atmos';
import {Megablock} from '../../lib/sets';
import {TenureScreen} from '../../lib/tenure';
import {guyWalk, mergePose, GUY} from '../../../lib/characters/Guy';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {LyricBlock} from './LyricBlock';
import {TCUT, T_START} from './timing';

type V3 = [number, number, number];

// the end screen: face z, width, top and bottom edge (m). Its face runs down to a low kerb (SCR_BOTTOM): with the old
// 2.5 m plinth, plinth + reflection made a black band at the horizon and the walker's torso (≈ 0.8–1.4 m at ~36 m)
// vanished into it, black on black. Now his whole figure stands on the bone face and its reflection.
const SCR_Z = -150;
const SCR_W = 66;
const SCR_TOP = 26.5;
const SCR_BOTTOM = 0.3;
const SCR_H = SCR_TOP - SCR_BOTTOM;
const SCR_Y = (SCR_TOP + SCR_BOTTOM) / 2;
// the screen's iris: right above him (fixed height, independent of the face size)
const IRIS_Y = 8.7;

const Block: React.FC<{size: V3; position: V3; color?: string}> = ({size, position, color = S.void}) => (
  <mesh position={position}>
    <boxGeometry args={size} />
    <meshBasicMaterial color={color} />
  </mesh>
);

export const ShotStreet: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const u = clamp01((t - T_START) / (TCUT.door - T_START));
  const bass = bassAt(abs);
  const camZ = lerp(0, -2.4, u);
  const speed = GUY.strideLength * 0.94;
  const gz = -33 - (t - T_START) * speed;
  const fov = cameraFovForVisible(16);
  return (
    <SilStage fog={{color: GREYS.g3, near: 30, far: 320}} camera={{far: 1500}}>
      <CameraRig position={[0, 1.05, camZ]} target={[0, 8.2, SCR_Z]} fov={fov} />
      <WetGround size={[240, 420]} position={[0, 0, -150]} puddles={0.6} ripple={0.45} streak={1} time={t} color={GREYS.g1} />

      {/* the end screen: a black mount, the bone face (rain-streaked), the haze it lights */}
      <Block size={[SCR_W + 3, SCR_TOP + 2.5, 4]} position={[0, (SCR_TOP + 2.5) / 2, SCR_Z - 2.3]} />
      <Block size={[SCR_W + 3, SCR_BOTTOM, 4]} position={[0, SCR_BOTTOM / 2, SCR_Z - 2.3]} color={GREYS.g1} />
      <Backlight position={[0, SCR_Y, SCR_Z - 0.2]} size={[SCR_W, SCR_H]} shape="slab" softness={0.035} noise={0.12}
        intensity={0.96 + 0.08 * bass} time={t} />
      <Backlight position={[0, 16.5, SCR_Z - 6]} size={[SCR_W * 2.2, 57.6]} shape="radial" softness={1} intensity={0.22} time={t} />
      <Iris position={[0, IRIS_Y, SCR_Z + 0.05]} radius={2.2} time={t} intensity={1.4} pupil={0.3 + 0.05 * bass} />
      {/* the lyric: black letters standing on the screen */}
      {/* (explicit rows: 3 rows that stay clear of the iris and between the banners) */}
      {/* line 23: only its tail "WAY." (sung 110.00–110.40) — V2Car's patent claim already showed "FORD FILED A PATENT
          FOR THAT BY THE" up to the cut, so this screen completes the line instead of repeating it. Line 23's window ends
          at 110.40 exactly when line 24's "I" takes the same top-centre slot. Mode "screen", colour void (black letters
          on the bone screen), as for the rest of the screen's text. */}
      <LyricBlock line={23} time={t} rows={[[8]]} align="center" anchor="top" mode="screen"
        color={S.void} fog={false} size={3.3} position={[0, SCR_TOP - 3.2, SCR_Z + 0.15]} renderOrder={5} />
      <LyricBlock line={24} time={t} rows={[[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10]]} align="center" anchor="top" mode="dark"
        fog={false} size={3.3} position={[0, SCR_TOP - 3.2, SCR_Z + 0.15]} renderOrder={5} />

      {/* flanking blocks (fronts face the axis) and two TENURE banners with the red iris */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {[-58, -98].map((z, k) => (
            <Megablock key={k} position={[s * 31, 0, z]} rotation-y={-s * Math.PI / 2} w={34} h={110} d={24} seed={3 + k + (s > 0 ? 7 : 0)}
              litFraction={0.02} ambient={0.18} color={GREYS.g3} />
          ))}
          <TenureScreen position={[s * 16.5, 5, -88]} width={5.5} height={13} content="wordmark" time={t} intensity={1.1}
            pulse={0.25 * bass} haze={0.25} fog={0.55} />
        </group>
      ))}

      {/* (the box starts 5 m beyond the lens — 2.6 m at the end of the dolly — so no drop smears across the frame) */}
      <SilRain time={t} position={[0, 0, -35]} area={[34, 22, 60]} count={8500} length={0.9} width={0.011} speed={12}
        wind={[-1.4, 0]} intensity={0.6} splashes={500} />
      <SilGuy position={[0, 0, gz]} rotation-y={Math.PI} pose={mergePose(guyWalk(t), {headPitch: 0.22})}
        rim={{color: S.bone, strength: 0.5, power: 7, dir: [0, 1]}} />
    </SilStage>
  );
};
