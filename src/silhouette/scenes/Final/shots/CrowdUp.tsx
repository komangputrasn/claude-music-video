// S4 · THE CROWD LOOKS UP (178.47–182.83) — side-on, long lens, low (0.8 m) and close (front row ~9.5 m): rows of
// identical hooded silhouettes in profile, their heads above the horizon against the gold sky (front row high and black,
// each row behind lower and paler). High at the left hangs the last TENURE screen, carrying [41] ("CLICK TO
// CANCEL, I CANCELLED YOU." — CANCEL/CANCELLED red, dying). As the line is sung the heads tilt up in a wave; on
// "cancelled" the screen's red iris and haze stutter out; the gold rim on the crowd strengthens as the last red dies.
// The Guy stands in the front row, hood down: the only bare head, already looking up.
import React from 'react';
import {S, cameraFovForVisible, GREYS} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy} from '../../../lib/SilCast';
import {Crowd} from '../../../lib/Crowd';
import {Iris} from '../../../lib/Iris';
import {WorldLyric, measureLyric} from '../../../lib/WorldLyric';
import {Backlight, FogLayers, WetGround} from '../../../lib/atmos';
import {guyIdle, mergePose} from '../../../../lib/characters/Guy';
import {beatAt, lerp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, CITY_DARK} from '../City';
import {redGlowDies} from '../lyricFx';
import {redFail, smooth} from '../timing';
import {pitchTarget, pxToM, screenPoint, V3} from '../frame';

export const CROWD_UP = {from: 179.2, to: 182.6};
const SCREEN_DIES = 181.4; // the iris + red haze stutter out on "cancelled"
const VIS = 16;
const deg = Math.PI / 180;
// low and close, looking slightly up: front-row heads at y ≈ 500, far-row heads ≈ 655, horizon ≈ 750 of the 1080 frame
const CAM_Y = 0.8;
const CAM_Z = 9.2;
const PITCH = 4.2;
const YAW = -2.5;
/** [41] on the screen: explicit rows (font-independent); the screen is sized to the measured text */
const ROWS = [[0, 1, 2], [3, 4, 5]];

export const CrowdUp: React.FC<{t: number; f: number; u: number}> = ({t, u}) => {
  const fov = cameraFovForVisible(VIS);
  const cam: V3 = [lerp(0.45, -0.45, u), CAM_Y, CAM_Z];
  const target = pitchTarget(cam, PITCH, YAW);
  const D = 2000;
  const look = smooth((t - CROWD_UP.from) / (CROWD_UP.to - CROWD_UP.from));
  const red = redFail(t, SCREEN_DIES, 0.9, 41);
  // the last screen, high at the left, clear above the heads (fixed in the world: mid-shot camera)
  const midCam: V3 = [0, CAM_Y, CAM_Z];
  const sd = 170;
  const em = pxToM(64, sd, VIS);
  const m = measureLyric(41, em, undefined, {rows: ROWS});
  const sw = m.width + em * 4.4;
  const sh = m.height + em * 1.7;
  const sp = screenPoint(midCam, pitchTarget(midCam, PITCH, YAW), VIS, -0.42, 0.62, sd);
  const sunX = (D + cam[2]) * Math.tan(5 * deg);
  const guyPose = mergePose(guyIdle(t, 7), {headPitch: lerp(-0.3, -0.62, look)});
  return (
    <SilStage fog={{color: fogAt(t), near: 40, far: 1400}} camera={{far: 4000, near: 0.5}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + cam[2]} eye={cam[1]} position={[0, 0, -D]} sunX={sunX} bandDeg={3.0} />
      <WetGround size={[6000, 6000]} color={S.void} reflectivity={0.6} puddles={0.35} streak={0.6} time={t} seed={9} />
      <Skyline t={t} position={[0, 0, -1150]}
        grid={{rows: 5, cols: 30, spacing: 76, seed: 47, height: [10, 30], footprint: [20, 38], centreBoost: 0.1, ...CITY_DARK}} />
      {/* the last screen on its mast */}
      <group position={sp}>
        <Backlight color={S.authRed} position={[0, 0, -8]} size={[sw * 1.9, sh * 2.6]} shape="radial" softness={1} intensity={0.4 * red} />
        <mesh position={[0, 0, -0.8]}>
          <boxGeometry args={[sw, sh, 1.2]} />
          <meshBasicMaterial color={GREYS.g1} />
        </mesh>
        <mesh position={[0, -sp[1] / 2 - sh / 4, -0.8]}>
          <boxGeometry args={[1.3, sp[1] - sh / 2, 1.3]} />
          <meshBasicMaterial color={S.void} />
        </mesh>
        <Iris position={[-sw / 2 + em * 1.6, 0, 0.02]} radius={em * 1.0} time={t} pupil={0.3 + 0.08 * beatAt(t).pulse} intensity={1.6 * red} glow={0.5 * red} flicker={red > 0 && red < 1 ? 0.7 : 0} />
        {/* on the failing screen the red drains out of CANCEL / CANCELLED (they stay readable, bone) */}
        <WorldLyric redFill={1} line={41} rows={ROWS} time={t} mode="screen" size={em} position={[em * 1.25, 0, 0.05]} intensity={0.95}
          glow={redGlowDies(t, 0.9, 0.5, 41)} />
      </group>
      {/* haze cards interleaved with the rows: the front row is black, each row behind is a step paler (depth) */}
      <FogLayers count={6} near={1.6} far={40} width={300} height={2.6} color={fogAt(t, 0.75, GREYS.g2, 1.0)} density={0.2} time={t} scale={14} ground={0.4} fadeNear={1} position={[0, 0, -1.2]} />
      <Crowd count={330} seed={5} area={[40, 16]} spacing={1.1} position={[-3, 0, -8.4]} facing={-Math.PI / 2} facingJitter={0.22} time={t}
        lookUp={look} lookUpSpread={0.75} exclude={[[3.2, 7.9, 1.9]]} rim={goldRim(t, [0.2, 1], 0.32 + 0.22 * (1 - red))} />
      <SilGuy pose={guyPose} hood={0} position={[0.2, 0, 0.1]} rotation-y={-Math.PI / 2} rim={goldRim(t, [0.2, 1], 0.5)} />
    </SilStage>
  );
};
