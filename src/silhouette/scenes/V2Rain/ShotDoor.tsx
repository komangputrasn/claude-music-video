/**
 * Shot 2 — DOOR (scene-local 81–145, song 112.66–114.82). "…doorbell said, 'Who?'" / "so…"
 * Symmetrical, low, long lens: the house is a black cube standing in the rain against the haze of the city's distant
 * screens. Its door is a pale TENURE panel with a big red iris in it — the doorbell. He stands on the step, a black
 * cut-out against the panel, his hood cutting into the bottom of the eye. The sung line is projected across the
 * facade above the door; on "Who?" the iris snaps shut to a pinpoint, a red scan line runs down the door over him and
 * "IDENTITY NOT ON PLAN" lights up in red over the lintel. He turns away, toward the window.
 * (The scan line is a SOLID authRed line, not the additive lib ScanLine: red added onto the bone door panel read
 * pinkish-white, and orange where it crossed the iris.)
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {Iris} from '../../lib/Iris';
import {WorldLyric} from '../../lib/WorldLyric';
import {S, GREYS, SFONTS, cameraFovForVisible} from '../../lib/palette';
import {Backlight, SilRain, WetGround} from '../../lib/atmos';
import {HouseCube, HOUSE_SPOTS} from '../../lib/sets';
import {guyIdle, guyWalk, mergePose, mixPose} from '../../../lib/characters/Guy';
import {bassAt, clamp01, lerp, ramp} from '../../../lib/time';
import {LyricBlock} from './LyricBlock';
import {TCUT, W} from './timing';

const F = HOUSE_SPOTS.frontZ; // 4
const DOOR_FACE_Z = F - 0.6 + 0.045; // front face of the door slab (reveal 0.6, slab 0.08)
const DOOR_Y0 = 0.37; // step top
const DOOR_H = 2.5;
const IRIS_Y = 2.28;
const SCAN_T = 0.035; // scan line thickness (m): ~3 px at this distance

const s01 = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

export const ShotDoor: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const u = s01(t, TCUT.door, TCUT.climb);
  // the doorbell wakes (iris opens) as we arrive, then snaps to a pinpoint on "Who?"
  const open = 0.25 + 0.75 * ramp(t * 30, TCUT.door * 30, TCUT.door * 30 + 9);
  const who = s01(t, W.who, W.who + 0.12);
  const pupil = lerp(0.34 + 0.04 * bass, 0.09, who);
  const scan = s01(t, W.who + 0.02, W.who + 0.62);
  // he turns away from the door toward the window (−X) after "Who?" and starts to walk
  const turn = ramp(t * 30, (W.so + 0.05) * 30, (W.so + 0.5) * 30);
  const walkT = Math.max(0, t - (W.so + 0.3));
  const gx = -walkT * 0.9;
  const pose = mixPose(mergePose(guyIdle(t), {headPitch: -0.22}), mergePose(guyWalk(t), {headPitch: 0.05}), clamp01(turn * 1.2));
  const camZ = lerp(30.5, 29.2, u);
  return (
    <SilStage fog={{color: GREYS.g2, near: 24, far: 170}}>
      <CameraRig position={[0, 1.55, camZ]} target={[0, 4.15, F]} fov={cameraFovForVisible(19.5)} />
      <WetGround size={[140, 140]} puddles={0.55} ripple={0.45} time={t} color={GREYS.g1} />
      {/* the city glow behind the house and two distant screens in the haze */}
      <Backlight position={[0, 7, -45]} size={[110, 40]} shape="radial" softness={1} intensity={0.5} time={t} />
      <Backlight position={[0, 1.5, -48]} size={[160, 7]} shape="slab" softness={0.9} intensity={0.32} time={t} />
      {[-1, 1].map((s) => (
        <Backlight key={s} position={[s * 22, 10.5, -42]} size={[7.5, 15]} shape="slab" softness={0.18} noise={0.2} intensity={0.46 + 0.06 * bass} time={t} />
      ))}

      <HouseCube time={t} doorIris={false} windowGlow={0.5} facadeLight={0.14} stencil="" />
      {/* the door is a pale TENURE panel with the iris */}
      <Backlight position={[0, DOOR_Y0 + DOOR_H / 2, DOOR_FACE_Z]} size={[1.2, DOOR_H]} shape="slab" softness={0.06} noise={0.05}
        intensity={0.6} time={t} />
      <Iris position={[0, IRIS_Y, DOOR_FACE_Z + 0.01]} radius={0.4} open={open} pupil={pupil} intensity={1.45 + 0.2 * who}
        time={t} glow={0.6} />
      {/* the scan runs down the door (behind him): a solid red line drawn over the panel and the iris */}
      {scan > 0 && scan < 1 ? (
        <mesh position={[0, DOOR_Y0 + DOOR_H * (1 - scan), DOOR_FACE_Z + 0.02]} scale={[1.2, SCAN_T, 1]} renderOrder={3}>
          <planeGeometry />
          <meshBasicMaterial color={S.authRed} transparent depthWrite={false} fog={false} />
        </mesh>
      ) : null}

      {/* the sung line, projected across the facade; then "so" */}
      {/* (below the roof parapet lip, which stands 8 cm proud of the facade from y 7.5) */}
      <LyricBlock line={24} time={t} rows={[[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10]]} align="center" anchor="top" mode="light"
        size={0.68} position={[0, 7.22, F + 0.03]} intensity={1.05} />
      <LyricBlock line={25} time={t} rows={[[0]]} align="center" anchor="top" mode="light" size={0.68} position={[0, 7.22, F + 0.03]}
        intensity={1.05} />
      {/* the doorbell's answer */}
      <WorldLyric text="IDENTITY NOT ON PLAN" time={t} from={W.who} until={TCUT.climb + 1} mode="screen" color={S.authRed}
        font={SFONTS.mono} weight={700} size={0.5} tracking={0.16} intensity={1.15} halo={0.55}
        position={[0, 3.38, F + 0.03]} />

      <SilRain time={t} position={[0, 0, 14]} area={[30, 16, 30]} count={7000} length={0.8} width={0.009} speed={12}
        wind={[-1.4, 0]} intensity={0.55} splashes={420} />
      <SilGuy position={[gx, DOOR_Y0, F + 0.5]} rotation-y={Math.PI + turn * (Math.PI / 2)} pose={pose}
        rim={{color: S.authRed, strength: 0.45, power: 7, dir: [0, 1]}} />
    </SilStage>
  );
};
