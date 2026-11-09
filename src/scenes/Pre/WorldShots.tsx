/**
 * Pre P6/P7 — "in a world where you can't own anything?": one night-exterior <Stage> for the whole build-up.
 *   P6 (211–256)  start on the glowing bedroom window and pull back HARD to the whole house on its hill while the world
 *                 gets tagged: giant RENTED $2,499/mo tag on the gable ("world"), LEASED sticker on the car, MAIL+ tag,
 *                 a giant padlock CLAMPS the front door ("can't"), NOT YOURS sticker + SHADE+ tree tag ("own").
 *   P7 (256–308)  cuts accelerate (beat -> half-beat -> quarter): the MOON gets a price tag ("anything?"), car, mailbox
 *                 padlock, tree, door lock rattling, then a rising aerial of the tagged house -> white-out into Chorus1.
 * Speed lines build over the whole stretch; a 2D Y2K progress window races to 100 % (see WorldOverlay).
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {SpeedLines, Sparkle, SparkleField, Glow as FxGlow} from '../../lib/three/fx';
import {SkyDome, ExteriorLights, RollingHills, House, HOUSE_SPOTS as H, SKY_PRESETS} from '../../lib/sets/Exterior';
import {Car, CAR} from '../../lib/props/Car';
import {Padlock} from '../../lib/props';
import {Win, ProgressBar} from '../../lib/ui';
import {CutEffect} from '../../overlays/CutFlash';
import {C, FONTS} from '../../lib/palette';
import {ramp, popIn, lerp, noise1, clamp01} from '../../lib/time';
import {add, mix3, V3} from '../V1Feeder/common';
import {PriceTag, Sticker} from './Tags';
import {W, CUT} from './timing';

type P = {f: number; t: number; from: number};

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const MOON_DIR = norm(SKY_PRESETS.night.sunDir as V3);

/** P7 insert cuts (scene frames) — accelerating */
export const INSERTS = [
  {at: CUT.moon, id: 'moon'},
  {at: 276, id: 'car'},
  {at: 284, id: 'mail'},
  {at: 292, id: 'tree'},
  {at: 296, id: 'door'},
  {at: 300, id: 'aerial'},
] as const;
export const WHITE_AT = 300;

const DOOR_LOCK: V3 = [H.frontDoor[0], 1.55, H.frontDoor[2] + 0.16];
const CAR_POS: V3 = H.driveway;
const MAIL_LOCK: V3 = [H.mailbox[0], H.mailbox[1] - 0.05, H.mailbox[2] + 0.06];
const TREE: V3 = [-6.3, 0, 6.2];

type Cam = {pos: V3; target: V3; fov: number; roll?: number};

/** our own low-poly cratered moon (the sky's moon is just a glow at this focal length) */
const Moon: React.FC<{position: V3; radius: number; t: number}> = ({position, radius, t}) => {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#e9efff';
    ctx.fillRect(0, 0, 512, 256);
    const craters: [number, number, number][] = [[90, 80, 34], [210, 150, 22], [300, 70, 40], [400, 170, 28], [150, 200, 18], [460, 60, 16], [40, 170, 20], [350, 130, 12]];
    for (const [x, y, r] of craters) {
      ctx.fillStyle = '#b9c4e8';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d3dbf6';
      ctx.beginPath();
      ctx.arc(x + r * 0.15, y + r * 0.15, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: tex, fog: false, color: '#f2f4ff'}), [tex]);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 3), []);
  return (
    <group position={position}>
      <FxGlow size={radius * 5} color="#9fc0ff" intensity={0.55} />
      <mesh geometry={geo} material={mat} scale={radius} rotation={[0.3, t * 0.05 + 2.2, 0]} />
    </group>
  );
};

const camAt = (sf: number, t: number): Cam => {
  if (sf < CUT.moon) {
    // P6: hard pull-back from the bedroom window (log-distance, ease-out)
    const u = ramp(sf, CUT.house, 250, (x) => 1 - Math.pow(1 - x, 3));
    const win = H.bedroomWindow;
    const dir = norm([0.32, 0.2, 1]);
    const d = 2.0 * Math.pow(21 / 2.0, u);
    const drift = ramp(sf, 245, CUT.moon, (x) => x);
    const pos = add(add(win, [dir[0] * d, dir[1] * d, dir[2] * d]), [-1.5 * drift, 0.4 * drift, -1.0 * drift]);
    const target = mix3([win[0], win[1] - 0.1, win[2]], [0.3, 3.4, 3.5], u);
    // punch-in on "can't" (the door padlock clamps)
    const punch = sf >= W.cant - 2 ? Math.sin(Math.PI * clamp01((sf - W.cant + 2) / 12)) : 0;
    return {pos, target: mix3(target, DOOR_LOCK, 0.35 * punch), fov: lerp(42, 44, u) - 12 * punch, roll: 0.08 * (1 - u)};
  }
  const k = (a: number, b: number) => ramp(sf, a, b, (x) => x);
  if (sf < 276) {
    const cam: V3 = [3.5, 1.6, 17];
    const q = k(CUT.moon, 276);
    const look = add(cam, [MOON_DIR[0] * 100, MOON_DIR[1] * 100 - lerp(6.5, 5.5, q), MOON_DIR[2] * 100]);
    return {pos: cam, target: look, fov: lerp(19, 15, q)};
  }
  if (sf < 284) {
    const q = k(276, 284);
    return {pos: [lerp(8.6, 8.2, q), 1.45, lerp(12.4, 11.9, q)], target: [6.2, 0.95, 9.4], fov: 40, roll: -0.12};
  }
  if (sf < 292) {
    const q = k(284, 292);
    return {pos: [lerp(0.95, 0.75, q), 1.35, lerp(12.9, 12.5, q)], target: [-0.25, 1.15, 10.9], fov: 42, roll: 0.1};
  }
  if (sf < 296) return {pos: [-3.6, 1.8, 12.2], target: [-6.3, 3.6, 6.6], fov: 44, roll: -0.15};
  if (sf < 300) {
    const q = k(296, 300);
    return {pos: [-1.35, 1.65, lerp(5.9, 5.5, q)], target: [-1.6, 1.5, 3.8], fov: 50, roll: 0.14};
  }
  const q = ramp(sf, 300, 308, (x) => x * x);
  return {pos: [lerp(9, 14, q), lerp(16, 34, q), lerp(30, 44, q)], target: [0, 1, 0], fov: 46, roll: 0.0};
};

export const ShotWorld: React.FC<P> = ({f, t, from}) => {
  const sf = f + from;
  const cam = camAt(sf, t);
  // camera shake on the lock clamp + build-up jitter
  const clamp = sf >= W.cant - 1 ? Math.exp(-(sf - W.cant + 1) / 5) : 0;
  const jit = 0.04 * clamp + 0.015 * ramp(sf, 256, 308);
  const pos: V3 = add(cam.pos, [noise1(t * 25, 1) * jit, noise1(t * 25, 2) * jit, 0]);
  const lockOpen = 1 - ramp(sf, W.cant - 3, W.cant, (x) => x * x);
  const lockShake = sf >= W.cant ? Math.max(0.6 * Math.exp(-(sf - W.cant) / 10), sf >= 296 ? 0.9 : 0) : 0;
  const mailLock = 1 - ramp(sf, 285, 288, (x) => x * x);
  const speed = ramp(sf, CUT.house + 10, 300, (x) => x * x);
  const moonC = add(cam.pos, [MOON_DIR[0] * 90, MOON_DIR[1] * 90, MOON_DIR[2] * 90]);
  const moonTagPos = add(moonC, [0, -3.2, 0]);
  const moonShot = sf >= CUT.moon && sf < 276;
  const yawTo = (p: V3) => Math.atan2(cam.pos[0] - p[0], cam.pos[2] - p[2]);
  const sw = (at: number) => Math.max(0, (sf - at) / 30);
  return (
    <Stage env="night" background="#000" bloom={{strength: 0.65 + 0.3 * speed, threshold: 0.88}} lens={{aberration: 0.0015 + 0.004 * speed, vignette: 0.4}}>
      <CameraRig position={pos} target={cam.target} fov={cam.fov} roll={cam.roll ?? 0} />
      <SkyDome preset="night" time={t} clouds={6} glow={moonShot ? 0.25 : 1} sunScale={moonShot ? 0.5 : 1} />
      {moonShot ? <Moon position={moonC} radius={3.4} t={t} /> : null}
      <ExteriorLights preset="night" />
      <RollingHills palette="night" grass={1600} flowers={300} />
      <House time="night" doorbellGlow={0.8} />
      <Car position={CAR_POS} rotation={[0, Math.PI, 0]} headlights={0} lights={false} />
      {/* --- the price tags of the world --- */}
      <PriceTag position={[0.0, 8.05, 3.9]} lines={['RENTED', '$2,499/mo']} width={4.4} pop={popIn(sf, W.world - 2, 10)} swing={sw(W.world - 2)} string={0.45} />
      <Sticker text="LEASED" size={1.3} color={C.y2kBlue} pop={popIn(sf, 229, 7)} position={[CAR_POS[0], 1.05, CAR_POS[2] + CAR.length / 2 + 0.06]} spin={0.2} />
      <PriceTag position={[H.mailbox[0] + 0.15, 1.75, H.mailbox[2] + 0.1]} lines={['MAIL+', '$1/letter']} width={1.1} pop={popIn(sf, 235, 8)} swing={sw(235)} string={0.5}
        color="#C9FF9A" ink="#0b5a12" />
      <group position={DOOR_LOCK} scale={sf >= W.cant - 5 ? 13 * popIn(sf, W.cant - 5, 6) : 0.001}>
        <Padlock open={lockOpen} shake={lockShake} time={t} />
      </group>
      <Sticker text="NOT YOURS" size={3.0} pop={popIn(sf, W.own - 2, 7)} position={[2.1, 3.25, 3.62]} spin={-0.15} color={C.bubblegum} />
      <PriceTag position={[TREE[0] + 0.9, 3.6, TREE[2] + 2.4]} rotation={[0, 0.45, 0]} lines={['SHADE+', '$3/mo']} width={2.2} pop={popIn(sf, W.own, 8)}
        swing={sw(W.own)} string={0.45} color="#FFE45C" />
      {/* the moon, too */}
      <PriceTag position={moonTagPos} rotation={[0, yawTo(moonTagPos), 0]} lines={['MOON+', '$0.99/mo']} width={9} pop={popIn(sf, W.anything - 1, 10)}
        swing={sw(W.anything - 1)} string={0.25} color="#BFF3FF" ink="#0A3FD8" />
      {sf >= 284 ? (
        <group position={MAIL_LOCK} scale={2.6 * popIn(sf, 284, 5)}>
          <Padlock open={mailLock} shake={sf >= 288 ? 0.8 : 0} time={t} color="#F5C542" />
        </group>
      ) : null}
      {clamp > 0.05 ? <Sparkle position={add(DOOR_LOCK, [0, 0.35, 0.3])} size={2.2 * clamp} intensity={3} color="#ffd0c0" time={t} /> : null}
      <SparkleField count={30} seed={77} area={[24, 10, 14]} position={[0, 7, 4]} time={t} size={0.5} intensity={1.5 * speed} />
      <SpeedLines intensity={speed} time={t} inner={lerp(0.6, 0.32, speed)} opacity={0.75} color="#dff3ff" />
    </Stage>
  );
};

// ------------------------------------------------------------------------------------------------ 2D: progress window + flashes + white-out
const FILES = ['house.own', 'car.own', 'mailbox.own', 'tree.own', 'dog_food.own', 'moon.own', 'grass.own', 'stars.own', 'you.own'];

export const WorldOverlay: React.FC<{sf: number}> = ({sf}) => {
  const a = CUT.house;
  const p = clamp01(Math.pow(ramp(sf, a + 4, WHITE_AT - 2, (x) => x), 1.6));
  const pop = popIn(sf, a + 2, 8);
  const file = FILES[Math.min(FILES.length - 1, Math.floor(p * FILES.length))];
  const white = ramp(sf, WHITE_AT, 307, (x) => x * x);
  const lastInsert = [...INSERTS].reverse().find((c) => sf >= c.at);
  const flashK = lastInsert && lastInsert.at > CUT.moon ? sf - lastInsert.at : 99;
  const shakeX = sf >= 256 ? noise1(sf * 0.9, 9) * 6 * ramp(sf, 256, 300) : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {sf >= a + 2 && white < 0.95 ? (
        <Win title="OmniStore Update" icon="info" width={640} height={150} x={70 + shakeX} y={50} scale={1.1 * pop} origin="top left" active sheen={(sf % 40) / 40 * 1.4 - 0.2}>
          <div style={{padding: '10px 16px', fontFamily: FONTS.ui, fontSize: 18, color: '#111'}}>
            <div style={{marginBottom: 8}}>
              Converting your stuff to subscriptions… <b style={{fontFamily: FONTS.mono}}>{file}</b> → <b style={{color: C.alertRed}}>{file.replace('.own', '.rent')}</b>
            </div>
            <ProgressBar value={p} width={600} height={26} showPercent color={p >= 1 ? 'pink' : 'green'} />
          </div>
        </Win>
      ) : null}
      {flashK < 4 ? <CutEffect style="flash" k={flashK} strength={0.55} seed={130 + Math.round(flashK)} /> : null}
      {white > 0 ? (
        <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, rgba(255,255,255,${Math.min(1, white * 1.6)}) 0%, rgba(255,255,255,${white}) 70%)`}} />
      ) : null}
    </AbsoluteFill>
  );
};
