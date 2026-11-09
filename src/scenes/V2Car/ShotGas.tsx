// S6 (local 293-375) "I stopped to get gas, and the car" + S7 (375-424) "drove away".
//  S6a 293-326 'wide'  exterior establishing: neon FUEL+ canopy, PREMIUM+ $9.99/mo price sign, sodium street lamps; the car
//                      rolls in under the canopy and stops (brake lights flare) on "stopped".
//  S6b 326-359 'pump'  cut on "gas": two-shot at the pump: he fuels, the price races while GALLONS stays 0.000; he gives
//                      us a deadpan look.
//  S6c 359-375 'alive' low front angle: on "car" the headlights SNAP on by themselves (flares), dash glows red, the empty
//                      driver seat; (the 2D "VEHICLE RETURNING TO DEALER" dialog is drawn by GasDialog in the overlay).
//  S7a 375-391 'drove' from behind him: the empty car lurches off, rips the nozzle out of the filler (fuel splash).
//  S7b 391-424 'away'  he turns to the lens, deadpan, nozzle dangling, while the car's lights sweep away behind him.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Stage, CameraRig, LensFlare, SparkleField} from '../../lib/three';
import {ramp, lerp, noise1, clamp01} from '../../lib/time';
import {Guy, GuyPose, guyJointMatrix, guyBlink, mixPose} from '../../lib/characters/Guy';
import {Car, CAR} from '../../lib/props/Car';
import {SkyDome, SKY_PRESETS, ExteriorLights, GasStation, GAS_SPOTS, StreetLamp} from '../../lib/sets/Exterior';
import {C} from '../../lib/palette';
import {B, W} from './timing';
import {DRIVER_POS, Spot, V3, driverPose} from './common';

// ------------------------------------------------------------------ edit points
export const GAS = {
  wide: B.cut5, // 293
  pump: B.b17, // 326 (just before "gas" 329)
  alive: B.b19, // 359 (just before "car" 362)
  drove: B.cut7, // 375
  away: B.b21, // 391 ("away" 389)
  end: B.cut8, // 424
};

// ------------------------------------------------------------------ layout (station-local = world)
// car parked a little further out and back than GAS_SPOTS.carBay so the filler lines up with pump A between the columns
const BAY = {position: [5.55, 0, -0.62] as V3, rotationY: Math.PI}; // faces -Z
const PUMP_A = GAS_SPOTS.pumpA; // [3.2, 0.18, 0], rotationY 0
const FILLER: V3 = [BAY.position[0] - CAR.fuelCap[0] + 0.03, CAR.fuelCap[1], BAY.position[2] - CAR.fuelCap[2]]; // car rotated PI
const GUY_YAW = Math.PI / 2; // faces +X (the car)
const NOZ_PITCH = 0.75; // tilt the nozzle down inside the fist
const SPOUT_TIP = new THREE.Vector3(0, -0.03, 0.27);

const FUEL_ARM = {shoulderX: 0.652, shoulderZ: 0.087, shoulderY: 0.413, elbow: 0.615, twist: -0.76, wrist: -0.6, wristZ: 0.9, grip: 1, swing: 0};
const HOLD_ARM = {shoulderX: 0.42, shoulderZ: 0.12, shoulderY: 0.45, elbow: 1.05, twist: -0.6, wrist: -0.5, wristZ: 0.6, grip: 1, swing: 0};
/** S7b: nozzle held up limply in front of the chest, "...seriously?" */
const SHOW_ARM = {shoulderX: 0.62, shoulderZ: 0.12, shoulderY: 0.35, elbow: 1.25, twist: -0.5, wrist: 0.25, wristZ: 0.3, grip: 1, swing: 0};

const fuelPose = (t: number, extra: GuyPose = {}): GuyPose => ({
  t,
  torsoBend: 0.08,
  armR: FUEL_ARM,
  armL: {shoulderX: 0.05, shoulderZ: 0.18, shoulderY: 0.2, elbow: 0.25, grip: 0.4},
  legL: {hipZ: 0.07, knee: 0.05},
  legR: {hipZ: 0.05, knee: 0.08, hipX: 0.05},
  expression: 'cold',
  blink: guyBlink(t, 9),
  shrug: 0.4,
  ...extra,
});

/** nozzle grip matrix (world) for a pose with the Guy at `pos` facing `yaw` */
const nozzleMatrix = (pose: GuyPose, pos: V3, yaw = GUY_YAW, pitch = NOZ_PITCH) => {
  const g = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  return g.multiply(guyJointMatrix(pose, 'gripR', {R: true})).multiply(new THREE.Matrix4().makeRotationX(pitch));
};

// Guy position so the spout tip of the fuelling pose sits in the filler (solved once)
const GUY_POS: V3 = (() => {
  const tip = SPOUT_TIP.clone().applyMatrix4(nozzleMatrix(fuelPose(0), [0, 0, 0]));
  return [FILLER[0] - tip.x, 0, FILLER[2] - tip.z];
})();

/** pump-A-local position + Euler of a world nozzle matrix */
const toPump = (m: THREE.Matrix4): {at: V3; rot: V3} => {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(p, q, s);
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return {at: [p.x - PUMP_A.position[0], p.y - PUMP_A.position[1], p.z - PUMP_A.position[2]], rot: [e.x, e.y, e.z]};
};

/** car travel along its own +Z (world -Z), then a right turn (toward +X) that clears the store front */
const carPath = (f: number) => {
  const go = GAS.drove - 6; // starts creeping just before the downbeat
  const s = f < go ? 0 : 0.5 * 0.012 * Math.pow(f - go, 2) + 0.004 * (f - go); // metres (accelerating)
  const straight = 5;
  if (s <= straight) return {x: BAY.position[0], z: BAY.position[2] - s, yaw: Math.PI, s, steer: 0};
  const R = 3;
  const a = Math.min(Math.PI / 2, (s - straight) / R);
  const extra = Math.max(0, s - straight - (R * Math.PI) / 2);
  const cx = BAY.position[0] + R, cz = BAY.position[2] - straight;
  const x = cx - Math.cos(a) * R + extra, z = cz - Math.sin(a) * R;
  return {x, z, yaw: Math.PI - a, s, steer: a < Math.PI / 2 ? -0.8 : 0};
};

/** car-local -> world for a car at (x, z) with heading yaw */
const carToWorld = (p: V3, x: number, z: number, yaw: number): V3 => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [x + p[0] * c + p[2] * s, p[1], z - p[0] * s + p[2] * c];
};

// ------------------------------------------------------------------ fuel splash droplets
const Splash: React.FC<{k: number; origin: V3}> = ({k, origin}) => {
  const drops = useMemo(() => Array.from({length: 14}, (_, i) => ({vx: 0.4 + 0.9 * ((i * 37) % 11) / 11, vy: 0.6 + 1.2 * ((i * 53) % 7) / 7, vz: (((i * 29) % 13) / 13 - 0.5) * 1.2})), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffe08a', transparent: true}), []);
  if (k <= 0 || k >= 1) return null;
  const tt = k * 0.9;
  return (
    <group position={origin}>
      {drops.map((d, i) => {
        const y = d.vy * tt - 4.9 * tt * tt;
        if (origin[1] + y < 0.02) return null;
        return (
          <mesh key={i} position={[d.vx * tt, y, d.vz * tt]} material={mat} scale={0.012 + 0.008 * ((i * 7) % 3)}>
            <sphereGeometry args={[1, 6, 4]} />
          </mesh>
        );
      })}
    </group>
  );
};

type Phase = 'wide' | 'pump' | 'alive' | 'drove' | 'away';

export const ShotGas: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const phase: Phase = f < GAS.pump ? 'wide' : f < GAS.alive ? 'pump' : f < GAS.drove ? 'alive' : f < GAS.away ? 'drove' : 'away';

  // ---- car
  const arriveK = ramp(f, GAS.wide - 14, W.stopped + 3, (x) => 1 - Math.pow(1 - x, 2.2));
  const arrivalZ = lerp(BAY.position[2] + 9, BAY.position[2], arriveK);
  const path = carPath(f);
  const moving = path.s > 0;
  const carX = phase === 'wide' ? BAY.position[0] : path.x;
  const carZ = phase === 'wide' ? arrivalZ : path.z;
  const carYaw = phase === 'wide' ? Math.PI : path.yaw;
  const stopDip = f >= W.stopped && f < W.stopped + 12 ? Math.sin(((f - W.stopped) / 12) * Math.PI) * 0.035 : 0;
  const ghostOn = f >= W.car2 - 1; // headlights on by themselves
  const shudder = ghostOn && !moving ? noise1(t * 30, 3) * 0.008 : 0;
  const brake = phase === 'wide' ? (f < W.stopped + 16 ? 1 : 0.15) : moving ? (path.s > 4.6 && path.s < 7.5 ? 1 : 0.25) : 0;
  const head = phase === 'wide' ? 1 : ghostOn ? Math.min(1, (f - W.car2 + 1) / 2) : 0;
  const snap = ghostOn ? Math.exp(-(f - W.car2 + 1) / 5) : 0;

  // ---- Guy + nozzle
  const ripF = GAS.drove + 3; // nozzle pops out of the filler
  const rip = ramp(f, ripF, ripF + 8, (x) => 1 - Math.pow(1 - x, 2));
  const look = ramp(f, W.car2 + 2, W.car2 + 8); // turns to the car when it comes alive
  const deadpan = ramp(f, W.gas + 4, W.gas + 10) * (1 - ramp(f, GAS.alive - 4, GAS.alive)); // looks at us while the pump races
  const stumble = f >= ripF ? Math.sin(clamp01((f - ripF) / 12) * Math.PI) : 0;
  let pose: GuyPose;
  let guyYaw = GUY_YAW;
  if (phase !== 'away') {
    const base = fuelPose(t, {
      expression: f < W.car2 ? 'cold' : 'shock',
      mouthOpen: f >= W.car2 && f < ripF + 20 ? 0.4 : 0,
      headYaw: lerp(0.05, 0.6, look) - 0.9 * deadpan,
      eyesX: 0.8 * look - 0.7 * deadpan,
      headPitch: lerp(0.1, -0.02, look) - 0.06 * deadpan,
      blink: deadpan > 0.5 ? 0.45 : guyBlink(t, 9),
      lean: -0.1 * stumble,
      hipsZ: 0.08 * stumble,
    });
    pose = mixPose(base, {...base, armR: HOLD_ARM}, rip);
  } else {
    // turned to face the lens: deadpan, nozzle held up limply
    const k = ramp(f, GAS.away, GAS.away + 7, (x) => 1 - Math.pow(1 - x, 2));
    guyYaw = lerp(1.05, 0.22, k);
    const lift = ramp(f, GAS.away + 4, GAS.away + 14);
    pose = {
      t,
      armR: {...HOLD_ARM, ...Object.fromEntries(Object.entries(SHOW_ARM).map(([key, v]) => [key, lerp((HOLD_ARM as Record<string, number>)[key], v, lift)]))},
      armL: {shoulderX: 0.05, shoulderZ: 0.14, elbow: 0.2, grip: 0.3},
      expression: 'neutral',
      expression2: 'sad',
      expressionMix: 0.35,
      blink: 0.42, // half-lidded deadpan
      headYaw: lerp(0.3, 0.06, k),
      headPitch: 0.05,
      headTilt: lerp(0, 0.12, ramp(f, GAS.away + 10, GAS.away + 18)),
      eyesX: 0.05,
      shrug: 0.3,
      legL: {hipZ: 0.06},
      legR: {hipZ: 0.05},
    };
  }
  // S7b: the nozzle droops in his limp grip
  const nozM = nozzleMatrix(pose, GUY_POS, guyYaw, phase === 'away' ? lerp(NOZ_PITCH, 2.1, ramp(f, GAS.away + 4, GAS.away + 14)) : NOZ_PITCH);
  const noz = toPump(nozM);
  const tipW = SPOUT_TIP.clone().applyMatrix4(nozM);

  // ---- cameras
  let cam: V3, tgt: V3, fov: number;
  if (phase === 'wide') {
    // from across the street: the whole neon station, price sign on the right
    const k = ramp(f, GAS.wide, GAS.pump, (x) => x);
    cam = [lerp(15.8, 15.2, k), lerp(1.35, 1.45, k), lerp(19.5, 18.7, k)];
    tgt = [lerp(3.6, 4.0, k), 3.5, -1.5];
    fov = 44;
  } else if (phase === 'pump') {
    const k = ramp(f, GAS.pump, GAS.alive, (x) => x);
    cam = [lerp(6.25, 6.05, k), 1.58, lerp(3.35, 3.05, k)];
    tgt = [lerp(3.85, 3.9, k), 1.28, 0.2];
    fov = 40;
  } else if (phase === 'alive') {
    // low front angle on the car's face (it faces -Z): headlights snap on at the lens
    const k = ramp(f, GAS.alive, GAS.drove, (x) => x);
    const sh = snap * 0.02;
    cam = [5.0 + noise1(f, 2) * sh, 0.62 + noise1(f, 3) * sh, lerp(-5.6, -5.15, k)];
    tgt = [4.95, 1.02, -0.4];
    fov = lerp(42, 38, k);
  } else if (phase === 'drove') {
    const k = ramp(f, GAS.drove, GAS.away, (x) => x);
    cam = [lerp(4.6, 4.65, k), lerp(1.45, 1.5, k), lerp(4.6, 4.45, k)];
    tgt = [lerp(5.0, 5.15, k), 1.05, -4.5];
    fov = 44;
  } else {
    const k = ramp(f, GAS.away, GAS.end, (x) => x);
    cam = [lerp(4.42, 4.4, k), 1.48, lerp(2.95, 2.7, k)];
    tgt = [lerp(4.95, 4.9, k), 1.2, -6];
    fov = lerp(36, 33, k);
  }

  const tail = CAR.tailLights.map((p) => carToWorld(p, carX, carZ, carYaw));
  const headW = CAR.headlights.map((p) => carToWorld([p[0], p[1], p[2] + 0.1], carX, carZ, carYaw));
  const fade = 1 - ramp(f, GAS.end - 10, GAS.end, (x) => x);
  const showGuyInCar = phase === 'wide';

  return (
    <Stage background={C.night} env={SKY_PRESETS.night.env}
      bloom={{strength: phase === 'wide' ? 0.55 : 0.6, radius: 0.5, threshold: phase === 'pump' ? 0.95 : 0.9}}
      fog={phase === 'wide' ? {color: '#0a1238', near: 25, far: 90} : undefined}>
      <CameraRig position={cam} target={tgt} fov={fov} />
      <SkyDome preset="night" time={t} clouds={3} />
      <ExteriorLights preset="night" intensity={0.55} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#141a28" roughness={0.85} />
      </mesh>
      {/* the street in front of the station + sodium lamps (visual only: no extra lights) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 11]}>
        <planeGeometry args={[200, 7]} />
        <meshStandardMaterial color="#1b1f2c" roughness={0.9} />
      </mesh>
      {[-14, 0, 14, 28].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.004, 11]}>
          <planeGeometry args={[3.2, 0.14]} />
          <meshBasicMaterial color="#c9a43a" />
        </mesh>
      ))}
      {[5.5, 25].map((x) => (
        <StreetLamp key={x} position={[x, 0, 13]} rotation={[0, Math.PI, 0]} light={false} />
      ))}
      <GasStation nozzleAt={phase === 'wide' ? undefined : noz.at} nozzleRot={phase === 'wide' ? undefined : noz.rot}
        screenText={phase === 'wide' ? '$0.00' : `$${(Math.max(0, Math.min(f, ripF) - GAS.pump + 18) * 0.11 + 0.01).toFixed(2)}`} />
      <group position={[carX, 0, carZ]} rotation={[0, carYaw, 0]}>
        <Car headlights={head} lights={false} brakeLights={brake} bodyPitch={stopDip} bodyBounce={shudder}
          wheelSpin={(phase === 'wide' ? BAY.position[2] + 9 - arrivalZ : path.s) / CAR.wheelRadius}
          steer={phase === 'alive' ? Math.sin((f - GAS.alive) * 0.35) * 0.9 : path.steer} doorOpen={0} seatFrost={0.8}
          consoleText={ghostOn ? 'AUTO-RETURN ON' : 'FUEL DOOR OPEN'} consoleColor={ghostOn ? '#ff4a5a' : C.aqua}
          dashSpeedText={ghostOn ? 'DRIVER NOT REQUIRED' : undefined} dashLocked={ghostOn} speedNeedle={ghostOn ? 0.03 : 0} rpmNeedle={ghostOn ? 0.3 : 0.05} />
        {/* red dash glow inside the empty cabin once it wakes up */}
        <pointLight position={[0.2, 1.15, 0.25]} color="#ff3a5a" intensity={ghostOn ? 1.4 + 2 * snap : 0} distance={1.8} decay={1.5} />
        <Spot position={[0, 0.75, 2.1]} target={[0, 0, 14]} color="#eaf4ff" intensity={head * 14} />
        {showGuyInCar ? <Guy position={DRIVER_POS} pose={driverPose(t, {expression: 'cold', shrug: 0.5, headYaw: 0.2})} shadow={false} outlineScale={1.4} /> : null}
      </group>
      {!showGuyInCar ? <Guy position={GUY_POS} rotation={[0, guyYaw, 0]} pose={pose} rightHand={<group />} outlineScale={phase === 'alive' ? 1.4 : 1.1} /> : null}
      {/* warm face light near the pump so he reads under the cold canopy */}
      <pointLight position={[GUY_POS[0] + 0.9, 1.9, GUY_POS[2] + 1.4]} color="#ffd9b8" intensity={phase === 'pump' || phase === 'away' ? 1.4 : 0} distance={3.2} decay={1.4} />
      {phase === 'drove' || phase === 'away' ? <Splash k={ramp(f, ripF, ripF + 24, (x) => x)} origin={[tipW.x, tipW.y, tipW.z]} /> : null}
      {phase === 'drove' ? (
        <SparkleField count={8} seed={3} time={t} area={[0.3, 0.3, 0.3]} position={[tipW.x, tipW.y, tipW.z]} size={0.06}
          intensity={3 * Math.exp(-Math.max(0, f - ripF) / 5) * (f >= ripF ? 1 : 0)} colors={['#ffffff', '#ffe9a0']} />
      ) : null}
      {phase === 'alive'
        ? headW.map((p, i) => (
            <LensFlare key={i} position={p} intensity={head * (0.35 + 1.1 * snap)} scale={0.5 + 0.4 * snap} ghosts={i === 0} streak={1 + snap}
              color="#f2f8ff" streakColor="#7fd8ff" />
          ))
        : null}
      {(phase === 'drove' || phase === 'away') && moving
        ? tail.map((p, i) => (
            <LensFlare key={i} position={p} intensity={0.45 * fade * (brake > 0.5 ? 1.5 : 1)} scale={0.45} color="#ff3050" streakColor="#ff5a7a" ghosts={i === 0} />
          ))
        : null}
    </Stage>
  );
};
