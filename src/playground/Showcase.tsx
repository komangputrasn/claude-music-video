/**
 * Showcase — integration playground: the whole shared library together at TRUE SCALE, to catch cross-module issues.
 *
 * Segments (frames):
 *   0–89     BEDROOM, 3:15 AM (frames 0–14 room lights only; from 15 a warm character key point light is added — compare). Guy standing by the bed, Pancake begging beside the locked Feeder on its floor spot,
 *            grandpa's Hammer hung on its wall hook, CRT TV on the dresser showing a test card.
 *            cameras: 0–29 wide (BEDROOM_SPOTS.cameraWide) · 30–59 3/4 on Pancake + feeder · 60–74 hammer close-up ·
 *            75–89 low hero on Guy holding the hammer (HeldHammer) beside Pancake
 *   90–179   OUTDOORS, day. House on RollingHills under the day SkyDome, Car in the driveway, Guy + Pancake on the porch.
 *            cameras: 90–119 wallpaper wide · 120–149 3/4 yard (car + porch) · 150–179 porch close-up
 *   180–239  TITLE. Chrome "BUY NOW, FOR NOW" + Popup3D windows + sparkles on the Y2K blue.
 *   240–269  SCALE LINE-UP on a 0.5 m grid: 2.0 m door frame, Guy, Pancake, Feeder, bowl, bag, CRT, car.
 *   270–329  WAKE-UP: Guy in bed mode at BEDROOM_SPOTS.guyLieInBed, guySleepyWake(p) synced to bed tilt = wakeTilt(p).
 *   330–389  OUTRO PORCH, sunrise: Guy sitting on the porch edge (HOUSE_SPOTS.porchSeat, sit=1), Pancake eating from the
 *            DogBowl at PANCAKE.bowl on HOUSE_SPOTS.porchSeatPancake. cameras: 330–359 yard wide · 360–389 bowl close-up
 *   390–419  BED EDGE, dawn: Guy sitting on the bed edge (BEDROOM_SPOTS.guySitOnBed, guySitOn(0.52)) on the flip phone (HeldPhone),
 *            Pancake lying on the rug. 390–404 wide · 405–419 close
 *   420–449  CAR, dusk: Guy in the driver seat (CAR.driverSeat − [0, GUY.sitHipHeight, 0], sit=1), door open, frosty seats.
 *            420–434 outside driver side · 435–449 CAR.seatCam
 *
 *   node scripts/still.mjs play Showcase --frames=5,20,45,65,85,95,130,160,200,235,255,275,300,340,375,395,410,425,440
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {ChromeText, measureChromeText} from '../lib/three/ChromeText';
import {SparkleField, LensFlare, Sunburst, SkyDome as Y2KSky, Swoosh} from '../lib/three/fx';
import {Bedroom, BEDROOM_SPOTS as S} from '../lib/sets/Bedroom';
import {SkyDome, ExteriorLights, RollingHills, House, HOUSE_SPOTS, SKY_PRESETS, SunFlare} from '../lib/sets/Exterior';
import {Guy, GUY, guyIdle, mergePose, guyPatDog, guySleepyWake, guyPhoneToEar, guyPoint, guySitOn, guyShiver} from '../lib/characters/Guy';
import {Pancake, PANCAKE, pancakeBeg, pancakeIdle, pancakeHappy, pancakeLie, pancakeEat} from '../lib/characters/Pancake';
import {Feeder, HAMMER, DogBowl, FoodBag, HeldHammer, HungHammer, HeldPhone} from '../lib/props';
import {CRTTV, makeTestPatternTexture} from '../lib/props/CRTTV';
import {Car, CAR} from '../lib/props/Car';
import {Popup3D, POPUP_MESSAGES, Cursor3D, popupButton3D, Stamp3D} from '../lib/ui';
import {ramp, popIn, lerp} from '../lib/time';
import {C} from '../lib/palette';

export const duration = 450;

type V3 = [number, number, number];

// ---------------------------------------------------------------- 1. bedroom

const BedroomShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const tex = makeTestPatternTexture();
  const seg = f < 30 ? 0 : f < 60 ? 1 : f < 75 ? 2 : 3;
  const cams: {position: V3; target: V3; fov: number}[] = [
    {...S.cameraWide, position: [lerp(0.9, 0.6, f / 30), 1.65, 1.9]},
    {position: [0.55, 0.62, 0.95], target: [0.45, 0.32, -0.45], fov: 50},
    {...S.cameraHammer, fov: 24},
    {position: [0.7, 1.12, 1.9], target: [-0.2, 0.95, 0.0], fov: 56},
  ];
  const cam = cams[seg];
  const holding = seg === 3;
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <Bedroom time="night" frame={f} moon={1} lamp={0.35}
        tv={{power: 1, screen: tex, static: 0.15}}
        clock={{text: '3:15'}}
        hammerGlow={seg === 2 ? 0.6 : 0}>
        {/* character key: warm, distance-limited point light near camera so faces read in the moody night room */}
        {f >= 15 ? <pointLight position={[0.6, 1.7, 1.5]} color="#ffe2c4" intensity={2.2} distance={3.2} decay={1.4} /> : null}
        <Guy position={[-0.35, 0, 0.62]} rotation={[0, holding ? 0.25 : 0.55, 0]}
          pose={mergePose(guyIdle(t), {expression: holding ? 'determined' : 'sleepy', headYaw: holding ? 0.0 : 0.25})}
          rightHand={holding ? <HeldHammer glow={0.4} /> : undefined} />
        <Feeder position={S.feeder} rotation={[0, 0.35, 0]} lcdText="BREAKFAST IS FOR PLUS MEMBERS ONLY" lockShake={0.4} time={t} />
        <Pancake position={[S.feeder[0] - 0.36, 0, S.feeder[2] + 0.22]} rotation={[0, 0.2, 0]} pose={{...pancakeBeg(t), tear: seg === 1 ? 0.6 : 0}} />
        {holding ? null : <HungHammer position={S.hammerHook} glow={seg === 2 ? 0.5 : 0} />}
      </Bedroom>
    </Stage>
  );
};

// ---------------------------------------------------------------- 2. outdoors
const OutdoorShot: React.FC<{f: number}> = ({f}) => {
  const lf = f - 90;
  const t = f / 30;
  const seg = lf < 30 ? 0 : lf < 60 ? 1 : 2;
  const porch = HOUSE_SPOTS.porch;
  const cams: {position: V3; target: V3; fov: number}[] = [
    {position: [lerp(-15, -12, lf / 30), 2.2, 30], target: [0, 4.2, 0], fov: 48},
    {position: [9.5, 2.0, 15.5], target: [1.5, 1.4, 5.5], fov: 50},
    {position: [porch[0] + 0.9, porch[1] + 1.05, porch[2] + 2.3], target: [porch[0] + 0.1, porch[1] + 0.75, porch[2] + 0.3], fov: 48},
  ];
  const cam = cams[seg];
  return (
    <Stage background="#4aa3ff" env={SKY_PRESETS.day.env}>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <SkyDome preset="day" time={t} />
      <ExteriorLights preset="day" />
      <RollingHills palette="day" />
      <House time="day" mailboxFlag={1} />
      <Car position={HOUSE_SPOTS.driveway} rotation={[0, Math.PI, 0]} interior={seg === 2 ? false : true} />
      <Guy position={[porch[0] + 0.15, porch[1], porch[2] + 0.2]} rotation={[0, 0.25, 0]}
        pose={seg === 2 ? mergePose(guyPatDog(t), {expression: 'happy'}) : mergePose(guyIdle(t), {expression: 'happy'})} />
      <Pancake position={[porch[0] + 0.15 + 0.12, porch[1], porch[2] + 0.2 + 0.62]} rotation={[0, seg === 2 ? Math.PI + 0.1 : 0.4, 0]}
        pose={seg === 2 ? pancakeHappy(t, 0, false) : pancakeIdle(t)} />
      <SunFlare dir={SKY_PRESETS.day.sunDir} strength={0.7} />
    </Stage>
  );
};

// ---------------------------------------------------------------- 3. title
const TITLE = 'BUY NOW,\nFOR NOW';
const M = measureChromeText(TITLE, {size: 0.62, anchor: 'center'});
const LOCK = POPUP_MESSAGES[2];
const TitleShot: React.FC<{f: number}> = ({f}) => {
  const lf = f - 180;
  const t = f / 30;
  const btn = popupButton3D(LOCK, 0, 2.0);
  return (
    <Stage background={C.y2kBlue} env="chrome">
      <CameraRig position={[0, 0.15, 6.2]} target={[0, 0.15, 0]} fov={42} />
      <Y2KSky preset="y2k" />
      <Sunburst position={[0, 0.4, -8]} radius={14} rays={18} rotation2d={t * 0.2} glow={0.25} opacity={0.6} />
      <Popup3D spec={POPUP_MESSAGES[3]} width={2.0} position={[-3.3, 1.45, -2.2]} rotation={[0.05, 0.38, -0.06]} />
      <Popup3D spec={LOCK} width={2.0} position={[3.35, -1.3, -1.8]} rotation={[-0.04, -0.36, 0.05]}>
        <Cursor3D kind="hand" size={0.36} position={[btn[0] + 0.05, btn[1] - 0.06, btn[2] + 0.06]} click={lf > 40 ? 0.6 : 0} />
      </Popup3D>
      <Popup3D spec={POPUP_MESSAGES[9]} width={1.9} position={[3.6, 1.7, -3.2]} rotation={[0.08, -0.45, 0.04]}>
        <Stamp3D progress={ramp(lf, 20, 34, (x) => x)} width={1.3} position={[0, 0, 0.05]} />
      </Popup3D>
      <ChromeText text={TITLE} size={0.62} anchor="center" outline={{thickness: 0.025, color: '#06103a'}}
        shine={ramp(lf, 12, 40)}
        perLetter={(i) => {
          const k = popIn(lf, i * 1.4, 12);
          return {position: [0, 0, (1 - k) * 4], rotation: [(1 - k) * 1.2, 0, 0], scale: 0.4 + 0.6 * k};
        }} />
      <Swoosh position={[0, -M.height / 2 - 0.15, 0.4]} radius={[M.width * 0.6, 0.45]} arc={[-2.8, -0.3]} progress={ramp(lf, 8, 30)} />
      <SparkleField count={30} seed={7} area={[M.width + 1.6, M.height + 1.2, 1]} time={t} position={[0, 0, 0.3]} />
      <LensFlare position={[0.9, M.height / 2 + 0.45, 0.3]} intensity={0.4} rotation={t * 0.4} />
    </Stage>
  );
};

// ---------------------------------------------------------------- 4. scale line-up
const Grid: React.FC = () => {
  const lines: React.ReactNode[] = [];
  for (let i = -16; i <= 16; i++) {
    lines.push(
      <mesh key={`x${i}`} position={[i * 0.5, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[i % 2 === 0 ? 0.02 : 0.008, 12]} />
        <meshBasicMaterial color="#5c7bd6" />
      </mesh>,
      <mesh key={`z${i}`} position={[0, 0.001, i * 0.5 - 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, i % 2 === 0 ? 0.02 : 0.008]} />
        <meshBasicMaterial color="#5c7bd6" />
      </mesh>,
    );
  }
  return <group>{lines}</group>;
};
const DoorFrame: React.FC<{position: V3}> = ({position}) => (
  <group position={position}>
    {[-0.45, 0.45].map((x) => (
      <mesh key={x} position={[x, 1.0, 0]}><boxGeometry args={[0.06, 2.0, 0.08]} /><meshToonMaterial color="#d8d2c0" /></mesh>
    ))}
    <mesh position={[0, 2.03, 0]}><boxGeometry args={[0.96, 0.06, 0.08]} /><meshToonMaterial color="#d8d2c0" /></mesh>
  </group>
);
const LineupShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  return (
    <Stage background="#20307a" env="sky">
      <CameraRig position={[0.6, 1.25, 6.4]} target={[0.6, 0.85, 0]} fov={40} />
      <hemisphereLight args={['#dfefff', '#4a3a6a', 0.75]} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.0} color="#fff4e6" />
      <directionalLight position={[-3, 2.5, -3]} intensity={1.2} color="#7fd8ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} /><meshToonMaterial color="#2c3f96" /></mesh>
      <Grid />
      <DoorFrame position={[-2.4, 0, 0]} />
      <Guy position={[-1.3, 0, 0]} pose={mergePose(guyIdle(t), {expression: 'happy'})} rightHand={<HeldHammer />} />
      <Pancake position={[-0.2, 0, 0.1]} rotation={[0, -0.5, 0]} pose={pancakeIdle(t)} />
      <Feeder position={[0.75, 0, 0]} rotation={[0, -0.2, 0]} lcdText="GOOD MORNING!" />
      <DogBowl position={[1.4, 0, 0.35]} fill={0.8} />
      <FoodBag position={[1.85, 0, 0]} rotation={[0, -0.3, 0]} />
      <CRTTV position={[2.75, 0, 0]} rotation={[0, -0.35, 0]} power={1} screen={makeTestPatternTexture()} />
      <Car position={[2.4, 0, -3.4]} rotation={[0, -Math.PI / 2, 0]} interior={false} />
      <Pancake position={[4.0, 0, 0.6]} rotation={[0, -0.6, 0]} pose={pancakeLie(t, true)} />
    </Stage>
  );
};

// ---------------------------------------------------------------- 5. wake-up (bed + Guy bed mode)
/** bed head-section tilt that matches guySleepyWake(p)'s sit-up phase (0.15..0.5, smoothstep) */
const wakeTilt = (p: number) => {
  const x = Math.max(0, Math.min(1, (p - 0.15) / 0.35));
  return x * x * (3 - 2 * x);
};
const WakeShot: React.FC<{f: number}> = ({f}) => {
  const lf = f - 270;
  const p = Math.min(1, lf / 50);
  const cam = lf < 20 ? S.cameraBed : {position: [0.45, 1.05, -0.2] as V3, target: [-0.6, 0.95, -1.15] as V3, fov: 50};
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <Bedroom time="night" frame={f} lamp={0.2} bed={{tilt: wakeTilt(p)}}>
        <Guy position={S.guyLieInBed} pose={guySleepyWake(p)} shadow={false} />
      </Bedroom>
    </Stage>
  );
};

// ---------------------------------------------------------------- 6. outro porch (sitting + eating from the bowl)
const PorchShot: React.FC<{f: number}> = ({f}) => {
  const lf = f - 330;
  const t = f / 30;
  const seat = HOUSE_SPOTS.porchSeat;
  const dog = HOUSE_SPOTS.porchSeatPancake;
  const cam = lf < 30
    ? {position: [-0.4, 1.35, 9.6] as V3, target: [-1.2, 0.95, 5.4] as V3, fov: 38}
    : {position: [dog[0] + 0.55, dog[1] + 0.45, dog[2] + 1.45] as V3, target: [dog[0], dog[1] + 0.25, dog[2] + 0.3] as V3, fov: 40};
  return (
    <Stage background="#ffb36b" env={SKY_PRESETS.sunrise.env}>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <SkyDome preset="sunrise" time={t} />
      <ExteriorLights preset="sunrise" />
      <RollingHills palette="sunrise" />
      <House time="sunrise" />
      <Guy position={[seat[0], seat[1] - GUY.seatHeight, seat[2]]} pose={mergePose(guyIdle(t), {sit: 1, expression: 'happy', headYaw: 0.45, headPitch: 0.2})} />
      <group position={dog} rotation={[0, 0.5, 0]}>
        <Pancake pose={pancakeEat(t)} />
        <DogBowl position={PANCAKE.bowl} fill={0.85} />
      </group>
    </Stage>
  );
};

// ---------------------------------------------------------------- 7. sitting on the bed edge, on the phone
const BedEdgeShot: React.FC<{f: number}> = ({f}) => {
  const lf = f - 390;
  const t = f / 30;
  const pose = mergePose(mergePose(guyPhoneToEar(t), guySitOn(S.mattressTop[1])), {expression: 'angry', mouthOpen: 0.25 + 0.25 * Math.sin(t * 9)});
  const sitPos = S.guySitOnBed;
  const e = guyPoint(pose, 'eyes');
  // eyes in room space (Guy yawed by guySitOnBedRotY about Y)
  const a = S.guySitOnBedRotY;
  const eye: V3 = [sitPos[0] + e[0] * Math.cos(a) + e[2] * Math.sin(a), sitPos[1] + e[1], sitPos[2] - e[0] * Math.sin(a) + e[2] * Math.cos(a)];
  const cam = lf < 15
    ? {position: [1.75, 1.35, 1.2] as V3, target: [0.2, 0.8, -0.7] as V3, fov: 50}
    : {position: [eye[0] + 0.85, eye[1] + 0.05, eye[2] + 0.55] as V3, target: [eye[0], eye[1] - 0.08, eye[2]] as V3, fov: 34};
  return (
    <Stage background={C.night} env="night">
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <Bedroom time="dawn" frame={f} lamp={0.6}>
        <Guy position={sitPos} rotation={[0, a, 0]} pose={pose}
          rightHand={<HeldPhone open={1} screenLines={['INKSURE+', 'ON HOLD', 'POSITION: 4,812']} />} />
        <Pancake position={[0.75, 0, 0.7]} rotation={[0, -2.2, 0]} pose={pancakeLie(t, false)} />
      </Bedroom>
    </Stage>
  );
};

// ---------------------------------------------------------------- 8. in the car
const CarShot: React.FC<{f: number}> = ({f}) => {
  const lf = f - 420;
  const t = f / 30;
  const seat = CAR.driverSeat;
  const cam = lf < 15 ? {position: [3.2, 1.45, 1.4] as V3, target: [0.35, 0.95, -0.2] as V3, fov: 42} : CAR.seatCam;
  return (
    <Stage background="#2a1f5a" env={SKY_PRESETS.dusk.env}>
      <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
      <SkyDome preset="dusk" time={t} />
      <ExteriorLights preset="dusk" />
      <RollingHills palette="dusk" avoid={[]} />
      <Car doorOpen={1} headlights={1} seatFrost={0.5} dashLocked dashSpeedText="SPEED PACK REQUIRED" />
      <Guy position={[seat[0], seat[1] - GUY.sitHipHeight, seat[2]]} pose={mergePose(guyShiver(t), {sit: 1, expression: 'cold'})} shadow={false} />
    </Stage>
  );
};

export default function Showcase() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {f < 90 ? <BedroomShot f={f} /> : f < 180 ? <OutdoorShot f={f} /> : f < 240 ? <TitleShot f={f} /> : f < 270 ? <LineupShot f={f} /> : f < 330 ? <WakeShot f={f} /> : f < 390 ? <PorchShot f={f} /> : f < 420 ? <BedEdgeShot f={f} /> : <CarShot f={f} />}
    </AbsoluteFill>
  );
}

// keep imports referenced for quick toggles while iterating
void HAMMER; void GUY; void CAR;
