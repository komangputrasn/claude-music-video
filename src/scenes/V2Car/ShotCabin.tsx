// S2 (local 48-98) "The car seats went cold": inside the car, the seats frost over (frost creeps on "seats", fully frozen
// with icicles on "cold"); he snaps into a shiver with visible breath; snap-zoom + ice flash on "cold".
// S3 (local 98-163) "'cause the heat is a tier": tighter angle; a chrome Y2K pop-up "SEAT HEAT" materialises in the cabin
// on "heat"; on "tier" the chrome WordArt PLATINUM TIER + $7.99/mo slams in with a lens flare.
import React from 'react';
import {Stage, CameraRig, LensFlare, SparkleField, ChromeText} from '../../lib/three';
import {ramp, lerp, noise1, popIn} from '../../lib/time';
import {Guy, GuyPose} from '../../lib/characters/Guy';
import {Car, CAR} from '../../lib/props/Car';
import {SkyDome, SKY_PRESETS, ExteriorLights, Street} from '../../lib/sets/Exterior';
import {Popup3D} from '../../lib/ui';
import {C} from '../../lib/palette';
import {B, W} from './timing';
import {aimAt, Breath, DRIVER_POS, driverCold, driverPoint, faceToward, ndcPoint, OnTop, V3} from './common';

const CAR_POS: V3 = [-1.75, 0, 0];
/** hanging CD under the rear-view mirror (car-local, from lib/props/Car) */
const CD_AT: V3 = [0, 1.15, 0.2];
const toWorld = (p: V3): V3 => [p[0] + CAR_POS[0], p[1] + CAR_POS[1], p[2] + CAR_POS[2]];

export const SEAT_HEAT_SPEC = {
  kind: 'lock' as const,
  title: 'MOTORCO Comfort+',
  heading: 'SEAT HEAT is locked',
  message: 'Warm seats are a PLATINUM TIER feature.\nOnly $7.99/mo. Brr!',
  buttons: ['Upgrade', 'Stay cold'],
  aquaButton: 0,
  width: 400,
};

export const ShotCabin: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const s3 = f >= B.cut2;
  // ---- frost + cold
  const frost = ramp(f, W.seats - 3, W.cold + 1, (x) => x);
  const coldK = ramp(f, W.cold - 2, W.cold + 5);
  const chatter = coldK * (0.18 + 0.18 * Math.abs(Math.sin(t * 38)));
  const lookAtPopup = s3 ? ramp(f, W.heat + 2, W.heat + 10) : 0;
  const toCam = s3 ? ramp(f, W.tier1 - 3, W.tier1 + 3) : 0; // "...a TIER?!" straight down the lens
  const pose: GuyPose = driverCold(t, coldK, {
    expression: coldK > 0.5 ? 'cold' : 'neutral',
    expression2: s3 && f > W.tier1 - 2 ? 'shock' : undefined,
    expressionMix: s3 ? ramp(f, W.tier1 - 2, W.tier1 + 4) * 0.8 : 0,
    mouthOpen: chatter,
    headYaw: lerp(lerp(0, -0.22, lookAtPopup), -0.46, toCam) + (coldK > 0 ? noise1(t * 6, 2) * 0.03 * coldK : 0),
    eyesX: lerp(-0.5 * lookAtPopup, -0.25, toCam),
    headPitch: lerp(lerp(0.06, 0.16, lookAtPopup), 0.02, toCam),
    blink: f < W.cold ? 0 : undefined,
  });
  const mouth = driverPoint(pose, 'mouth');

  // ---- camera (passenger side, looking across at him; framed so the face stays in the upper half)
  const head = driverPoint(pose, 'head');
  let cam: V3, tgt: V3, fov: number;
  if (!s3) {
    const zoom = ramp(f, W.cold - 1, W.cold + 4, (x) => 1 - Math.pow(1 - x, 3));
    const sh = coldK * (1 - ramp(f, W.cold + 4, W.cold + 20)) * 0.012;
    const drift = ramp(f, B.cut1, B.cut2, (x) => x);
    cam = [-0.42 + noise1(f * 1.3, 1) * sh, 1.12 + noise1(f * 1.3, 2) * sh, lerp(0.2, 0.17, drift)];
    fov = lerp(58, 38, zoom);
    const wide = aimAt(cam, head, -0.02, 0.36, fov);
    const tight = aimAt(cam, head, 0.22, 0.02, fov);
    tgt = [lerp(wide[0], tight[0], zoom), lerp(wide[1], tight[1], zoom), lerp(wide[2], tight[2], zoom)];
  } else {
    // frontal 3/4 from the top of the dash (just under the windscreen) looking back at him
    const k = ramp(f, B.cut2, B.cut3, (x) => x);
    const slam = f >= W.tier1 - 1 ? Math.exp(-(f - W.tier1 + 1) / 4) : 0;
    cam = [lerp(0.06, 0.09, k) + noise1(f, 5) * slam * 0.01, 1.19 + noise1(f, 6) * slam * 0.01, lerp(0.42, 0.4, k)];
    fov = lerp(74, 68, k);
    tgt = aimAt(cam, head, -0.3, 0.06, fov);
  }
  const camW = toWorld(cam), tgtW = toWorld(tgt);

  // ---- pop-up + WordArt (S3)
  const popK = s3 ? popIn(f, W.heat - 3, 12) : 0;
  const popPos = ndcPoint(camW, tgtW, fov, 0.2, 0.42, -0.12);
  const popRot = faceToward(popPos, camW);
  const sheen = s3 ? lerp(-0.2, 1.2, ramp(f, B.d2, B.d2 + 14, (x) => x)) : undefined;
  const tierK = s3 ? popIn(f, W.tier1 - 3, 10) : 0;
  const tierPos = ndcPoint(camW, tgtW, fov, 0.19, 0.42, 0.6);
  const tierRot = faceToward(tierPos, camW);
  const pricePos = ndcPoint(camW, tgtW, fov, 0.185, 0.56, 0.37);
  const flareK = s3 && f >= W.tier1 - 2 ? Math.exp(-(f - W.tier1 + 2) / 7) : 0;

  const frostSpark = frost > 0 ? Math.min(1, frost * 3) * (1 - ramp(f, W.cold + 10, B.cut2 + 30) * 0.6) : 0;
  return (
    <Stage background={C.night} env={SKY_PRESETS.night.env} bloom={{strength: 0.55, radius: 0.4, threshold: 0.95}}>
      <CameraRig position={camW} target={tgtW} fov={fov} />
      <SkyDome preset="night" time={t} clouds={0} />
      <ExteriorLights preset="night" intensity={0.8} />
      <Street length={80} lamps="left" spacing={16} houses houseLights={0.8} lampLights={false} />
      <group position={CAR_POS}>
        <Car headlights={1} lights={false} beams={false} seatFrost={frost} doorOpen={0}
          consoleText={frost > 0.2 ? 'SEAT HEAT: LOCKED' : 'SEAT HEAT: OFF'} consoleColor={frost > 0.2 ? '#ff4a5a' : C.aqua} />
        <Guy position={DRIVER_POS} pose={pose} shadow={false} />
        <Breath t={t} origin={mouth} dir={s3 ? [0.72, 0.3, 0.3] : [-0.6, 0.02, 0.8]} start={W.cold / 30 + 0.05} amount={coldK * (s3 ? 0.55 : 1)} />
        {/* key on his face (warm, from the dash/passenger side) + icy rim from the frozen seat */}
        <pointLight position={[-0.62, 1.32, -0.12]} color="#ffe6cc" intensity={0.9} distance={1.9} decay={1.4} />
        <pointLight position={[0.38, 0.8, -0.6]} color="#7fdcff" intensity={0.15 + 0.6 * frost} distance={1.2} decay={1.6} />
        <SparkleField count={34} seed={11} time={t} area={[0.6, 0.9, 0.5]} position={[0.38, 0.9, -0.3]} size={0.05}
          intensity={2.6 * frostSpark} colors={['#ffffff', '#e6fbff', '#bff3ff', '#9fe6ff']} />
      </group>
      {s3 && popK > 0.01 ? (
        <group position={popPos} rotation={popRot} scale={popK}>
          <OnTop noDepth>
            <Popup3D spec={SEAT_HEAT_SPEC} width={0.168} pr={3} sheen={sheen} saturation={1.3} brightness={1.05} />
          </OnTop>
        </group>
      ) : null}
      {s3 && tierK > 0.01 ? (
        <>
          <group position={tierPos} rotation={tierRot} scale={tierK}>
            <ChromeText text="PLATINUM TIER" font="ArialBlack" size={0.0125} anchor="center" material="iridescent" shine={ramp(f, W.tier1, W.tier1 + 16, (x) => x)}
              outline={{thickness: 0.0016, color: '#0a1a50', glow: 0}} />
          </group>
          <group position={pricePos} rotation={tierRot} scale={popIn(f, W.tier1 + 3, 10)}>
            <ChromeText text="$7.99/mo" font="Impact" size={0.0135} anchor="center" material="gold" />
          </group>
          <LensFlare position={ndcPoint(camW, tgtW, fov, 0.19, 0.08, 0.66)} intensity={0.12 + 0.8 * flareK} scale={0.45 + 0.4 * flareK} streak={1} ghosts={false} />
        </>
      ) : null}
    </Stage>
  );
};
