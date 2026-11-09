/**
 * Shot 1 — THERMAL TIER (scene-local 0–146, song 92.56–97.48). [20] "The car seats went cold, 'cause the heat is a tier,"
 * Head-on, symmetrical, long lens: the black capsule holds the centre of the frame while the elevated highway streams
 * away behind it (red lane lines converging on the horizon band, gantries receding). Through the windshield he is a
 * black hooded shape at the yoke against the seat. On "cold" (94.84) the seat turns frost-white — cold light from
 * below — frost creeps over the glass from its edges and he hunches, arms wrapped round himself, shivering. The red
 * THERMAL TIER readout wakes on the nose on "seats". The line hangs in the haze far down the highway, projected light,
 * receding with the world; TIER in red.
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {Motes} from '../../lib/atmos';
import {WorldLyric, metresForPx} from '../../lib/WorldLyric';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {guyShiver, guySitOn, mergePose, mixPose, GuyPose} from '../../../lib/characters/Guy';
import {Capsule, CAPSULE} from './Capsule';
import {Highway} from './Highway';
import {T_START, TCUT, W} from './timing';

const SPEED = 12; // m/s, the world streams past the capsule
const FOV = cameraFovForVisible(19);
const TEXT_Z = -300;
const TEXT_Y = 25;
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

const drivePose = (t: number): GuyPose =>
  mergePose(guySitOn(CAPSULE.seatH), {
    t,
    torsoBend: 0.04,
    headPitch: 0.05,
    armL: {shoulderX: 0.95, shoulderZ: 0.12, shoulderY: 0.25, elbow: 0.75, grip: 0.9, swing: 0},
    armR: {shoulderX: 0.95, shoulderZ: 0.12, shoulderY: 0.25, elbow: 0.75, grip: 0.9, swing: 0},
  });

export const ShotThermal: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const lt = t - T_START;
  const u = clamp01(lt / (TCUT.governor - T_START));
  const scroll = SPEED * lt;
  const cold = smooth((t - W.cold) / 0.3);
  const frost = smooth((t - W.cold) / 1.8);
  const readout = t < W.seats ? 0 : t < W.seats + 0.25 ? (Math.floor((t - W.seats) * 16) % 2 ? 0.3 : 1) : 1;
  const tierFlash = Math.max(0, 1 - Math.abs(t - W.tier20 - 0.1) / 0.3);
  const shiverK = smooth((t - W.cold - 0.15) / 0.7);
  const pose = mixPose(drivePose(t), mergePose(mergePose(guyShiver(t), guySitOn(CAPSULE.seatH)), {torsoBend: 0.22, headPitch: 0.2}), shiverK);
  const camZ = lerp(8.9, 8.0, smooth(u));
  const em = metresForPx(64, 335, FOV);
  return (
    <SilStage fog={{color: GREYS.g3, near: 40, far: 650}} camera={{far: 2500}}>
      <CameraRig position={[0, 1.36, camZ]} target={[0, 1.22, 0]} fov={FOV} />
      <Highway time={t} scroll={scroll} zNear={24} zFar={-900} gantries={false} pulse={bass} horizon={0.66} horizonY={6} horizonH={60} wet={{reflectivity: 0.6, puddles: 0.2, streak: 1.6}} sky={0.09} />
      <Capsule time={t} seatGlow={0.16 + 0.84 * cold} frost={frost} readout={readout * (1 + 0.35 * tierFlash)} cabinGlow={0.4} headlights={1}
        rim={{color: S.bone, strength: 0.7, power: 6, dir: [0, 1]}}>
        <SilGuy position={CAPSULE.seatRoot} pose={pose} />
        {/* frost crystals hanging in the cold light of the cabin */}
        {cold > 0.01 ? (
          <Motes position={[0, 0.55, -0.15]} area={[1.3, 0.95, 1.5]} count={160} size={0.007} time={t} intensity={0.9 * cold}
            drift={[0.01, 0.035, 0]} wander={0.08} twinkle={0.7} seed={4} />
        ) : null}
      </Capsule>
      <WorldLyric line={20} time={t} mode="light" size={em} maxWidth={em * 18} position={[0, TEXT_Y, TEXT_Z - scroll]}
        intensity={1.05} halo={0.4} until={TCUT.governor + 0.05} />
    </SilStage>
  );
};
