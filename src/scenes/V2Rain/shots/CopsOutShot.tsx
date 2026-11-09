/**
 * Shot copsOut (207–243) — "…and the cops came…"
 * Low across the wet street at the house: the POLICE+ cruiser slides in from screen right on "cops", rear end swinging
 * out, brakes diving the nose, a wave of puddle water thrown at the lens; its light bar strobes red/blue across the house
 * (whose upstairs bedroom window is still open, curtain flapping). On "came" a POLICE+ dispatch pop-up lands.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig, Rain} from '../../../lib/three';
import {SkyDome, ExteriorLights, RollingHills, House, HOUSE_SPOTS, Tree} from '../../../lib/sets/Exterior';
import {Street} from '../../../lib/sets/exterior/Street';
import {Dialog} from '../../../lib/ui';
import {ramp, popIn, lerp, noise1, clamp01} from '../../../lib/time';
import {CutEffect} from '../../../overlays/CutFlash';
import {CopCar, barFlash} from '../CopCar';
import {PuddleSplash} from '../Water';
import {W, SHOTS} from '../timing';

type V3 = [number, number, number];

const A = SHOTS.copsOut[0]; // 207
const STOP = A + 12; // the slide ends on the beat (~219/220 "came")
const LANE_Z = 15.3;
const X_STOP = 1.6;

/** car x along the street (it drives toward -X), decelerating to a stop at STOP */
const carX = (f: number) => {
  const s = Math.min(f, STOP) - (A - 3);
  const T = STOP - (A - 3);
  return X_STOP + 11 * Math.pow(1 - s / T, 2);
};

const DISPATCH = {
  kind: 'info' as const,
  title: 'POLICE+ Premium Response',
  heading: 'OFFICERS DISPATCHED',
  message: 'Location: 1 Owner Lane (your house)\nReason: unrecognized resident\nETA: 4 min   (Basic plan: 3-5 business days)',
  buttons: ['OK', 'Upgrade to POLICE+ Gold'],
  aquaButton: 1,
  aquaColor: 'gold' as const,
  width: 520,
};

export const CopsOutShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const k = f - A;
  const x = carX(f);
  const slide = ramp(f, A + 4, STOP, (q) => q * q);
  const yaw = -Math.PI / 2 + 0.32 * slide - 0.06 * ramp(f, STOP, STOP + 8);
  const after = Math.max(0, f - STOP);
  const dive = f >= STOP ? 0.07 * Math.exp(-after / 5) * Math.cos(after * 0.9) : 0.02 * slide;
  const roll = f < STOP ? 0.05 * slide : 0.05 * Math.exp(-after / 4) * Math.cos(after * 1.1);
  const cop = barFlash(f);
  // camera: low on the far kerb; jolts when the car stops, slow push-in afterwards
  const jolt = f >= STOP ? 0.05 * Math.exp(-after / 4) * Math.sin(after * 2.2) : 0;
  const push = ramp(f, A, SHOTS.copsOut[1], (q) => q);
  const camPos: V3 = [lerp(4.6, 4.1, push) + 0.03 * noise1(t * 1.2, 2), lerp(1.15, 1.0, push) + jolt, lerp(22.6, 21.8, push)];
  const camTgt: V3 = [lerp(-0.2, -0.6, push), 3.0 + jolt * 0.5, 4];
  const sT = (f - (STOP - 2)) / 30;
  const dialogK = popIn(f, Math.round(W.came) - 2, 10);
  return (
    <>
      <Stage background="#03051a" env="night" fog={{color: '#0a0f35', near: 22, far: 75}} bloom={{strength: 0.8, radius: 0.55, threshold: 0.85}}>
        <CameraRig position={camPos} target={camTgt} fov={44} roll={-0.035 + 0.6 * jolt} />
        <SkyDome preset="night" time={t + 110} clouds={0} starBrightness={0.2} />
        <ExteriorLights preset="night" intensity={0.55} />
        <RollingHills palette="night" grass={900} flowers={120} />
        <House time="night" bedroomLight={1} doorbellGlow={0.6 + 0.4 * (Math.floor(f / 4) % 2)} doorbellColor="#E2231A" />
        <Tree position={[-7.2, 0, 8.5]} height={6.5} seed={4} time={t} />
        <Tree position={[7.5, 0, 6]} height={5.5} seed={7} time={t} kind="pine" />
        <Street length={70} wet lamps="left" spacing={22} houseLights={0.8} houses={false} rotation={[0, Math.PI / 2, 0]} position={[0, 0, 17.5]} />
        <Rain time={t} count={2400} area={[20, 10, 13]} position={[1, 0, 13.5]} color="#ffdcae" intensity={0.65 + 0.5 * Math.max(cop.red, cop.blue)}
          speed={11} wind={[0.9, 0.4]} length={0.5} width={0.0085} splashes={240} />
        <pointLight position={[3.2, 2.2, 19.5]} color="#9fb4ff" intensity={2.2} distance={9} decay={1.2} />
        <CopCar frame={f} position={[x, 0, LANE_Z]} rotation={[0, yaw, 0]} wheelSpin={-x / 0.32} bodyPitch={dive} bodyRoll={roll} lightPower={1.25} lightDistance={26} />
        <PuddleSplash time={sT} origin={[X_STOP + 0.4, 0.08, LANE_Z + 0.95]} dir={[0.35, 1]} along={[1, 0]} count={260} speed={5.5} up={3.4}
          color="#b8ccff" intensity={0.7} floorY={0} lenScale={0.5} widScale={1.6} opacity={0.5} />
      </Stage>
      {/* strobe spill on the lens */}
      <AbsoluteFill style={{background: cop.red > 0.5 ? 'radial-gradient(ellipse at 62% 62%, rgba(255,40,60,0.35), rgba(255,40,60,0) 60%)' : cop.blue > 0.5 ? 'radial-gradient(ellipse at 52% 62%, rgba(50,90,255,0.4), rgba(50,90,255,0) 60%)' : 'none', mixBlendMode: 'screen'}} />
      {f >= Math.round(W.came) - 2 ? (
        <Dialog {...DISPATCH} x={1400} y={300} anchor="center" scale={1.18 * dialogK} rotate={2.5} />
      ) : null}
      <CutEffect style="glitch" k={k} strength={0.8} seed={207} />
      {void HOUSE_SPOTS}
      {void clamp01}
    </>
  );
};
