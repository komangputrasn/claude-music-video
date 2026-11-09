/**
 * Swing · shot 1 (local 0–65): BULLET TIME. The Guy frozen mid-leap with grandpa's hammer overhead, cop strobes frozen,
 * dust hanging in the air, letterbox bars, the camera whipping ~200° around him + the feeder -> real-time drop with a
 * hammer smear -> SMASH exactly on "swing" (white flash, shake, padlock pops off) -> slow-motion aftermath while the
 * orbit drifts on (~270° in total): kibble erupts, on "lid" the lid rips off and "flew off" (speed ramp back to real time).
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {SparkleField, SpeedLines, LensFlare, Glow, Swoosh} from '../../lib/three/fx';
import {Bedroom} from '../../lib/sets/Bedroom';
import {Guy, guyHammerSwing, mergePose, mixPose, GuyPose} from '../../lib/characters/Guy';
import {Pancake, pancakeIdle, PancakePose} from '../../lib/characters/Pancake';
import {Feeder, FEEDER, HeldHammer, KibbleBurst, Padlock} from '../../lib/props';
import {lerp, noise1} from '../../lib/time';
import {C} from '../../lib/palette';
import {CutEffect} from '../../overlays/CutFlash';
import {
  FEEDER_POS, FEEDER_ROT, GUY_SWING_POS, PANCAKE_POS, PANCAKE_ROT, HIDE_PIECES, IMPACT, KIBBLE_BURST, LOCK_LAND, LOCK_SCALE, T, V3, clamp, kibbleProgress, lockAt, simAfter, smooth,
} from './common';

const FREEZE_END = IMPACT - 6; // time un-freezes 6 frames before the hit (20)
const LID_RIP = Math.round(T.lid) - 2; // 44: the lid tears off on "lid"

/** slow-motion "simulation time" after the impact, in seconds */
export const slowSim = simAfter;

const leap = (k: number): GuyPose => ({
  hipsY: 0.3 * k,
  torsoBend: -0.08 * k,
  legL: {hipX: 0.45 + 0.75 * k, hipZ: 0.14, knee: 0.4 + 1.1 * k, ankle: 0.45 * k},
  legR: {hipX: -0.25 - 0.2 * k, hipZ: 0.1, knee: 0.3 + 1.2 * k, ankle: 0.7 * k},
});

/** swing progress p (guyHammerSwing) through the shot: frozen at p≈0.28 mid-air, real-time drop, slow follow-through */
const swingP = (f: number) => {
  if (f < FREEZE_END) return 0.275 + 0.012 * (f / FREEZE_END); // a hair of drift: "slowed", not "paused"
  if (f < IMPACT) {
    const u = (f - FREEZE_END) / (IMPACT - FREEZE_END);
    return lerp(0.287, 0.5, u); // guyHammerSwing already eases in toward the impact
  }
  return 0.5 + 0.1 * smooth(simAfter(f) / 0.5);
};
/** how far along the drawn swing arc (0 overhead .. 1 impact) the hammer head is, for a swing progress p
 *  (measured from guyJointMatrix: the head sweeps a ~0.8 m circle around the right shoulder) */
const swingArc = (p: number) => {
  let q = clamp(p, 0, 1);
  if (q > 0.3 && q < 0.5) {
    const v = (q - 0.3) / 0.2;
    q = 0.3 + 0.2 * (v * v * 0.65 + v * 0.35);
  }
  const K: [number, number][] = [[0.3, 0], [0.35, 0.08], [0.4, 0.29], [0.45, 0.7], [0.5, 1]];
  if (q <= K[0][0]) return 0;
  for (let i = 1; i < K.length; i++) if (q <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (q - K[i - 1][0]) / (K[i][0] - K[i - 1][0]));
  return 1;
};

/** Guy pose through the shot: frozen mid-air, real-time drop into the impact, slow follow-through. */
export const swingPose = (f: number): GuyPose => {
  const p = swingP(f);
  const air = f < FREEZE_END ? 1 : f < IMPACT ? 1 - ((f - FREEZE_END) / (IMPACT - FREEZE_END)) ** 2 : 0;
  const base = mergePose(guyHammerSwing(p), {expression: 'yell', mouthOpen: f < FREEZE_END ? 0.85 : 1, blink: 0});
  const pose = mergePose(base, leap(air));
  return air > 0 ? mixPose(base, pose, air) : base;
};

const R2D = Math.PI / 180;
/** orbit angle (deg; 0 = in front of him (+Z), 90 = his left (+X, the desk wall)) */
const orbitDeg = (f: number) => {
  if (f <= IMPACT) {
    const u = f / IMPACT;
    // near-constant whip speed, easing only slightly into the hit
    // starts behind him (his back, hammer overhead, the feeder + Pancake beyond), whips round his right side to the front
    return lerp(130, 312, u * 0.75 + 0.25 * (1 - (1 - u) * (1 - u)));
  }
  const u = clamp((f - IMPACT) / 39, 0, 1);
  return lerp(312, 350, 1 - (1 - u) * (1 - u));
};

export const SmashShot: React.FC<{f: number}> = ({f}) => {
  const frozen = f < FREEZE_END;
  const k = f - IMPACT;
  const sim = simAfter(f);
  const pose = swingPose(f);

  // ---- camera: orbit around the swing (radius shrinks near the desk wall; fov keeps ~2.5 m of height in frame)
  const phi = orbitDeg(f) * R2D;
  const c: V3 = [0.95, 0, 0.42];
  const side = Math.max(0, Math.sin(phi));
  const r = 1.78 - 0.52 * side * side + (k >= 0 ? 0.42 * smooth(k / 30) * Math.max(0, Math.cos(phi)) : 0);
  const shake = k >= 0 ? Math.exp(-k / 4) * 0.075 : 0;
  const sx = shake * noise1(f * 1.7, 3), sy = shake * noise1(f * 1.9, 7);
  const camY = f < IMPACT ? lerp(1.22, 1.05, smooth(f / IMPACT)) : lerp(1.05, 1.2, smooth(k / 39));
  const camPos: V3 = [c[0] + r * Math.sin(phi) + sx, camY + sy, c[2] + r * Math.cos(phi)];
  const tgtY = f < FREEZE_END ? 1.34 : f < IMPACT ? lerp(1.34, 0.95, smooth((f - FREEZE_END) / 6)) : lerp(0.95, 0.85, smooth(k / 30));
  const target: V3 = [c[0] - 0.02, tgtY + sy * 0.5, c[2]];
  const halfH = f < IMPACT ? 1.42 : lerp(1.15, 1.0, smooth(k / 39));
  const fov = Math.min(92, (2 * Math.atan(halfH / r)) / R2D) + (k >= 0 && k < 6 ? 6 * (1 - k / 6) : 0);

  // ---- the hit
  const smashed = k >= 0 ? clamp(k / 4, 0, 0.35) + 0.65 * smooth(sim / 0.35) : 0;
  const lidJolt = k >= 0 ? 0.32 * Math.exp(-k / 6) * Math.abs(Math.cos(k * 0.5)) + 0.08 : 0;
  const lid = f < LID_RIP ? lidJolt : lerp(lidJolt, 1.45, smooth((f - LID_RIP + 1) / 4));
  const lidFly = f < LID_RIP ? 0 : clamp((f - LID_RIP) / 22, 0, 1);

  // frozen cop strobe: both colours held; live pattern after the hit
  const copFrame = frozen ? 0 : f;
  const holdBlue = frozen ? 1 : 0;
  const glowHammer = frozen ? 0.7 : k < 0 ? 0.9 : Math.max(0.3, 0.9 - k / 20);

  const pancakePose: PancakePose = {
    ...pancakeIdle(frozen ? 0.4 : f / 30),
    sit: 1,
    eyes: 'open',
    earPerk: frozen ? 1 : k < 6 ? 1 : 0.8,
    headPitch: k >= 0 ? 0.42 : 0.3,
    headYaw: k >= 0 ? -0.2 : 0.12,
    headTilt: 0.18,
    mouthOpen: k >= 0 ? 0.45 : 0.3,
    bodySquash: k >= 0 && k < 10 ? -0.14 * Math.exp(-k / 3) : 0,
    hop: k >= 0 && k < 10 ? 0.05 * Math.sin((k / 10) * Math.PI) : 0,
    blink: 0,
  };

  // hammer smear: a glowing arc drawn on along the swing plane, its head locked to the real hammer head, fading after the hit
  const smearP = f < FREEZE_END ? 0 : f < IMPACT ? swingArc(swingP(f)) : 1;
  const smearI = f < FREEZE_END ? 0 : k < 0 ? 1.1 : 1.1 * Math.max(0, 1 - k / 6);

  // character key: pulled in from the camera toward the action, above it (never inside his head)
  const keyPos: V3 = [c[0] + (camPos[0] - c[0]) * 0.7, 2.15, c[2] + (camPos[2] - c[2]) * 0.7];
  const lock = lockAt(sim);
  const lockSpin = Math.min(sim, LOCK_LAND) * 14;
  const bars = f < FREEZE_END ? 1 : 1 - smooth((f - FREEZE_END) / 5);

  return (
    <AbsoluteFill>
      <Stage background={C.night} env="night" bloom={{strength: frozen ? 0.55 : 0.65, radius: 0.42, threshold: 0.9}}
        lens={{aberration: frozen ? 0.004 : 0.002, vignette: frozen ? 0.6 : 0.5, grain: 0.04, saturation: frozen ? 0.78 : 1.14}}>
        <CameraRig position={camPos} target={target} fov={fov} roll={frozen ? 0.05 * Math.sin(phi) : 0} />
        <Bedroom time="night" frame={copFrame} copLights={1} moon={0.9} lamp={0.12} hide={[...HIDE_PIECES]} rainOnWindow
          hideWalls={camPos[2] > 1.9 ? ['front'] : []}>
          {/* character key + frozen blue strobe partner (constant light count) */}
          <pointLight position={keyPos} color="#ffe2c4" intensity={frozen ? 2.0 : 2.4} distance={4} decay={1.4} />
          <pointLight position={[1.6, 1.6, -1.6]} color="#3a6bff" intensity={holdBlue * 2.5} distance={5} decay={1.3} />

          <Guy position={GUY_SWING_POS} pose={pose} rightHand={<HeldHammer glow={glowHammer} />} shadow={0.45} />

          <group position={FEEDER_POS} rotation={[0, FEEDER_ROT, 0]}>
            <Feeder lcdText={k >= 0 ? 'ERR 0xD06' : 'BREAKFAST IS FOR PLUS MEMBERS ONLY'} smashed={smashed} lid={lid} lidFly={lidFly}
              locked={k < 0} kibbleFill={k >= 0 ? 0.35 : 0.8} time={frozen ? 0.3 : f / 30} lockShake={frozen ? 0.6 : 0} />
            {k >= 0 ? <KibbleBurst progress={kibbleProgress(f)} origin={FEEDER.hopperCenter} {...KIBBLE_BURST} /> : null}
          </group>
          {k >= 0 ? (
            <group position={lock} rotation={[lockSpin, lockSpin * 0.7, 0.4]} scale={LOCK_SCALE}>
              <Padlock broken={1} time={f / 30} />
            </group>
          ) : null}

          <Pancake position={PANCAKE_POS} rotation={[0, PANCAKE_ROT, 0]} pose={pancakePose} />

          {/* dust motes hanging in frozen time */}
          <SparkleField count={70} seed={4} area={[3, 2, 3]} position={[0.6, 1.2, 0.4]} time={frozen ? 0.5 : f / 30} size={0.05}
            intensity={frozen ? 1.4 : 0.5} />
        </Bedroom>

        {smearI > 0.01 ? (
          <Swoosh position={[GUY_SWING_POS[0] - 0.18, 1.2, GUY_SWING_POS[2] + 0.2]} rotation={[0, Math.PI / 2, 0]} radius={[0.82, 0.82]}
            arc={[1.2, 4.2]} width={0.16} progress={smearP} colorA="#fff1c8" colorB="#7fe6ff" intensity={smearI} />
        ) : null}
        {/* impact glint */}
        {k >= 0 && k < 14 ? (
          <group position={[FEEDER_POS[0], 0.42, FEEDER_POS[2]]}>
            <Glow size={0.8 * Math.exp(-k / 5)} color="#fff4d6" intensity={2.2} />
            <LensFlare intensity={0.9 * Math.exp(-k / 4)} scale={1} rotation={k * 0.05} />
          </group>
        ) : null}
        {k >= 0 && sim < 0.6 ? <Glow position={lock} size={0.12} color="#ffd0d0" intensity={1.2 * (1 - sim / 0.6)} /> : null}
        {frozen ? <SpeedLines intensity={0.55} time={0.2} inner={0.55} opacity={0.38} color="#dfe8ff" flicker={0} /> : null}
      </Stage>
      {/* letterbox bars while time is frozen */}
      {bars > 0 ? (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 92 * bars, background: '#000'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 92 * bars, background: '#000'}} />
        </>
      ) : null}
      {/* the hit: white flash */}
      {k >= 0 ? <CutEffect style="flash" k={k} strength={0.85} tint="#FFFFFF" streak="#FFD08A" /> : null}
    </AbsoluteFill>
  );
};
