// S5 (local 228-293) "so I crawled in first gear".
//  S5a 228-261 "so I crawled in": low ground-level tracking shot along the car's driver side; the car crawls at walking
//      pace, exhaust going putt-putt... and a cute racing snail on the centre line sails past it.
//  S5b 261-293 "first gear": cut on the beat to a low front angle: the snail races toward the lens, headlights flaring
//      behind it, the Guy slumped behind the windscreen. (The PS2-style racing HUD "POS 2/2 · GEAR 1" is drawn in 2D by
//      RaceHUD in the scene's overlay layer.)
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Stage, CameraRig, SparkleField, LensFlare} from '../../lib/three';
import {ramp, lerp, noise1} from '../../lib/time';
import {Guy} from '../../lib/characters/Guy';
import {Car, CAR} from '../../lib/props/Car';
import {SkyDome, SKY_PRESETS, ExteriorLights, Street, canvasTex} from '../../lib/sets/Exterior';
import {C} from '../../lib/palette';
import {B, W} from './timing';
import {DRIVER_POS, driverPose, Spot, V3} from './common';
import {Snail} from './Snail';

export const CAR_SPEED = 0.35; // m/s (crawl)
export const CRAWL_SPLIT = B.b13; // 261: cut to the front angle on "first gear"
const CAR_X = -1.75;

/** car z (world) at local frame f */
const carZAt = (f: number) => -6 + ((f - B.cut4) / 30) * CAR_SPEED;

// ------------------------------------------------------------------ exhaust puffs (putt-putt), pure function of t
let _smoke: THREE.Texture | null = null;
const smokeTex = () =>
  (_smoke ??= canvasTex(96, 96, (c, w, h) => {
    for (const [x, y, r] of [[48, 50, 30], [32, 56, 20], [64, 44, 22]] as [number, number, number][]) {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.7)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  }));

const Exhaust: React.FC<{t: number; origin: V3}> = ({t, origin}) => {
  const N = 5;
  const period = 0.36;
  const mats = useMemo(() => Array.from({length: N}, () => new THREE.SpriteMaterial({map: smokeTex(), color: '#c9d4ff', transparent: true, depthWrite: false})), []);
  const puffs = Array.from({length: N}, (_, i) => {
    const k = Math.floor(t / period) - i;
    const age = (t - k * period) / (period * N);
    if (age < 0 || age > 1) return null;
    return {
      pos: [origin[0] + 0.05 * Math.sin(k * 1.7), origin[1] + 0.05 + 0.35 * age, origin[2] - 0.15 - 0.5 * Math.pow(age, 0.7)] as V3,
      s: 0.12 + 0.38 * Math.pow(age, 0.6),
      op: 0.6 * Math.min(1, age * 8) * (1 - age),
    };
  });
  useLayoutEffect(() => {
    puffs.forEach((p, i) => (mats[i].opacity = p ? p.op : 0));
  });
  return (
    <group>
      {puffs.map((p, i) => (p ? <sprite key={i} position={p.pos} scale={[p.s, p.s, 1]} material={mats[i]} /> : null))}
    </group>
  );
};

export const ShotCrawl: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const front = f >= CRAWL_SPLIT;
  const carZ = carZAt(f);
  const bob = Math.sin(t * 7) * 0.004 + (Math.sin(t * Math.PI * 2 / 0.36) > 0.85 ? 0.004 : 0); // engine chug

  // ---- snail: in S5a it overtakes from the rear wheel to the front wheel; in S5b it leads, racing at the lens
  const la = (f - B.cut4) / 30;
  const lb = (f - CRAWL_SPLIT) / 30;
  const snailPos: V3 = front ? [-0.66, 0, carZ + 2.5 + lb * 0.9] : [0.25, 0, carZ - 2.3 + la * 3.0];

  // ---- Guy (grumpy, watching the snail go by)
  const grumpy = ramp(f, W.first - 6, W.first + 4);
  const pose = driverPose(t, {
    expression: 'angry',
    expression2: 'sad',
    expressionMix: grumpy * 0.6,
    headYaw: front ? -0.05 : lerp(0.15, 0.55, ramp(f, W.crawled, CRAWL_SPLIT)),
    eyesX: front ? 0.2 : 0.6,
    eyesY: front ? -0.6 : 0,
    headPitch: front ? 0.2 : 0.16,
    shrug: 0.5,
    shiver: 0.4,
  });

  // ---- cameras
  let cam: V3, tgt: V3, fov: number;
  if (!front) {
    const track = carZ + 0.25 + la * 0.15;
    cam = [1.75, 0.16 + noise1(la * 2, 9) * 0.006, track];
    tgt = [-1.0, 0.5, track];
    fov = 50;
  } else {
    // telephoto tracking shot at snail height: dollies back with the snail as it races at the lens, the car compressed
    // in behind it (left half), headlights flaring
    const k = ramp(f, CRAWL_SPLIT, B.cut5, (x) => x);
    cam = [-0.98 + noise1(lb * 3, 3) * 0.004, 0.22, snailPos[2] + lerp(2.15, 2.0, k)];
    tgt = [-1.08, 0.46, snailPos[2] - 5];
    fov = lerp(31, 29, k);
  }
  const hl = CAR.headlights.map((p) => [p[0] + CAR_X, p[1], p[2] + carZ + 0.08] as V3);
  const kick = front ? Math.exp(-(f - CRAWL_SPLIT) / 6) : 0;

  return (
    <Stage background={C.night} env={SKY_PRESETS.night.env} fog={{color: '#0b1440', near: 20, far: 80}}
      bloom={{strength: 0.65, radius: 0.5, threshold: 0.88}}>
      <CameraRig position={cam} target={tgt} fov={fov} />
      <SkyDome preset="night" time={t} clouds={0} />
      <ExteriorLights preset="night" intensity={0.85} />
      <Street length={90} lamps="left" spacing={16} houses houseLights={0.8} />
      <group position={[CAR_X, 0, carZ]}>
        <Car headlights={front ? 0.4 : 1} lights={false} beams={!front} wheelSpin={carZ / CAR.wheelRadius} bodyBounce={bob} seatFrost={1}
          consoleText="GEAR 1 ONLY" consoleColor="#ff4a5a" dashSpeedText="2 MPH" speedNeedle={0.02} rpmNeedle={0.92} dashLocked />
        <Spot position={[0, 0.75, 2.1]} target={[0, 0, 14]} color="#eaf4ff" intensity={14} />
        <Guy position={DRIVER_POS} pose={pose} shadow={false} outlineScale={1.2} />
        <pointLight position={[0.15, 1.3, 0.1]} color="#bfe8ff" intensity={1.1} distance={1.6} decay={1.5} />
        {!front ? <Exhaust t={t} origin={[0.45, 0.28, -1.95]} /> : null}
      </group>
      <group position={snailPos}>
        <Snail t={t} scale={front ? 1.5 : 1.45} rotation={[0, front ? 0.72 : 0, 0]} />
        <pointLight position={[0.4, 0.45, 0.35]} color="#ffe6f4" intensity={0.5} distance={1.4} decay={1.5} />
        <SparkleField count={12} seed={21} time={t} area={[0.14, 0.06, 1.3]} position={[0, 0.04, -0.85]} size={0.045} intensity={2.4}
          colors={['#ffffff', '#bff3ff', '#ffc2ea']} />
      </group>
      {front
        ? hl.map((p, i) => (
            <LensFlare key={i} position={p} intensity={0.12 + 0.4 * kick} scale={0.35 + 0.2 * kick} ghosts={i === 1} streak={1}
              color="#f2f8ff" streakColor="#7fd8ff" />
          ))
        : null}
    </Stage>
  );
};
