// TERMS props look-dev: every hero prop staged as it would appear in a shot of the film.
//   node scripts/still.mjs silplay SilProps --frames=15,38,52,56,66,72,93,101,110,125,148,165,185,200,216,226,236,255,278,292,306,312,320
//   0–29    V1Feeder: the Monolith (red iris on the brow, stencil, red food slot) looming over a begging Pancake
//   30–44   V2Rain: Pancake's nose rests on the Monolith under the red eye (3/4, pancakeAtMonolith with a yaw)
//   45–52   V2Rain: grandpa's hammer hung on two pegs on the lit wall, faint gold handle edge (warmth 0.25)
//   53–59   the same in `hook` mode, dropped onto the CellRoom's own pegs at CELL_SPOTS.hammerHook (wall on −X)
//   60–89   Swing alignment, side view: monolithSwing(p) at MONOLITH.guySwingSpot; p = 0.5 at frame 72 = contact
//           (hammer warmth stays at the 0.3 foreshadow until the impact; it only goes above 0.3 after 129.2 s)
//   90–149  Swing close-up: impact at 92 → iris shards + flash, brow caves, panel falls, gold spill, kibble sparks + pile
//   150–179 Aftermath: phone in one hand, hammer (warmth 1) in the other, backlit by gold; Pancake eats at the pile, tail wags
//   180–209 Final: the paper 1984 held up, hood down (closed 180–189, open 190+)
//   210–239 Hold: the pillow iris in the dark (seam → lids part → open; talks from 230)
//   240–269 Final hero: Pancake eating from the plain bowl in a pool of gold
//   270–299 Phone: at the ear (270–284) / insert of the open screen (285–299)
//   300–329 V1Feeder: the e-reader's words drift up as ash into a red ceiling vent (close, from above his shoulder 300–314;
//           wide 315–329)
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SilStage, CameraRig} from '../lib/SilStage';
import {SilGuy, SilPancake} from '../lib/SilCast';
import {S, GREYS, cameraFovForVisible} from '../lib/palette';
import {Letterbox} from '../overlays/SilOverlays';
import {Backlight, FogLayers} from '../lib/atmos';
import {
  Monolith, MONOLITH, monolithSwing, pancakeAtMonolith, HeldSilHammer, HungSilHammer, HeldPaperBook, PillowIris, PlainBowl,
  SilPhone, HeldSilPhone, HeldSilEReader, SILPHONE,
} from '../lib/props';
import {guyIdle, guyHoldUp, guyPhoneToEar, mergePose} from '../../lib/characters/Guy';
import {pancakeBeg, pancakeEat, pancakeIdle, PANCAKE} from '../../lib/characters/Pancake';
import {ramp} from '../../lib/time';
import {CELL, CELL_PEGS, CELL_SPOTS} from '../lib/sets';

export const duration = 330;

type V3 = [number, number, number];
const fov = (v: number) => cameraFovForVisible(v);
const lin = (x: number) => x;
/** yaw that turns a +Z-facing card toward a camera at `cam` from `at` */
const faceYaw = (at: V3, cam: V3) => Math.atan2(cam[0] - at[0], cam[2] - at[2]);

const Floor: React.FC<{color?: string; y?: number}> = ({color = GREYS.g1, y = 0}) => (
  <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]}>
    <planeGeometry args={[200, 200]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

const RedVent: React.FC<{position: V3}> = ({position}) => (
  <group position={position}>
    <mesh>
      <boxGeometry args={[0.5, 0.04, 0.3]} />
      <meshBasicMaterial color={S.void} />
    </mesh>
    {[-0.09, -0.03, 0.03, 0.09].map((z) => (
      <mesh key={z} position={[0, -0.021, z]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[0.42, 0.018]} />
        <meshBasicMaterial color={S.authRed} />
      </mesh>
    ))}
  </group>
);

/** a backlight card behind the target, facing the camera */
const BackOf: React.FC<{cam: V3; at: V3; dist?: number; size?: [number, number]; intensity?: number; color?: string; t: number}> = ({
  cam, at, dist = 9, size = [14, 7], intensity = 0.8, color = S.bone, t,
}) => {
  const d = [at[0] - cam[0], 0, at[2] - cam[2]];
  const l = Math.hypot(d[0], d[2]) || 1;
  const p: V3 = [at[0] + (d[0] / l) * dist, at[1] + 0.6, at[2] + (d[2] / l) * dist];
  return <Backlight position={p} rotation-y={faceYaw(p, cam)} size={size} softness={0.85} intensity={intensity} color={color} time={t} />;
};

export default function SilProps() {
  const f = useCurrentFrame();
  const t = f / 30;
  let body: React.ReactNode = null;
  let fog: {color: string; near: number; far: number} | null = {color: S.ash, near: 10, far: 60};
  let haze = false;

  if (f < 30) {
    // V1Feeder — low, long lens; the eye on the brow looks down at a small begging dog.
    const cam: V3 = [0.9, 0.2, 5.6];
    const pose = {...pancakeBeg(t), headPitch: 0.5, earPerk: -0.7, tailWagAmount: 0};
    haze = true;
    body = (
      <>
        <CameraRig position={cam} target={[-0.2, 0.52, 0.1]} fov={fov(15)} />
        <Backlight position={[0, 1.3, -9]} size={[13, 6]} shape="radial" softness={0.85} intensity={0.85} time={t} />
        <Backlight position={[0, 0.25, -8]} size={[20, 1.4]} shape="slab" softness={0.9} intensity={0.45} time={t} />
        <Floor />
        <Monolith time={t} />
        <SilPancake pose={pose} position={[-0.95, 0, 0.42]} rotation-y={2.2} />
      </>
    );
  } else if (f < 45) {
    // V2Rain — Pancake's nose rests on the box under the red eye (3/4 camera keeps him in profile and sees the iris).
    const cam: V3 = [3.9, 0.3, 4.3];
    const pose = {...pancakeIdle(t, 2), headPitch: -0.04, earPerk: -0.7, tailWagAmount: 0};
    const pl = pancakeAtMonolith(pose, -0.12, Math.PI - 0.78);
    body = (
      <>
        <CameraRig position={cam} target={[-0.15, 0.48, 0.35]} fov={fov(12)} />
        <BackOf cam={cam} at={[0, 0.0, 0]} dist={5} size={[6, 2.6]} intensity={0.8} t={t} />
        <Floor />
        <Monolith time={t} pupil={0.26} />
        <SilPancake pose={pose} position={pl.position} rotation-y={pl.rotationY} />
      </>
    );
  } else if (f >= 53 && f < 60) {
    // hook mode: the CellRoom draws its own pegs (0.24 m apart, 0.11 m out of the −X wall); the hammer drops onto
    // CELL_SPOTS.hammerHook in the Y2K HungHammer frame. Stand-in wall + pegs at the CellRoom's coordinates.
    const hk = CELL_SPOTS.hammerHook;
    body = (
      <>
        <CameraRig position={[CELL.xMin + 1.9, hk[1] + 0.05, hk[2] + 0.25]} target={[CELL.xMin, hk[1] + 0.01, hk[2] + 0.02]} fov={fov(11)} />
        <mesh position={[CELL.xMin, 1.5, hk[2]]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[8, 5]} />
          <meshBasicMaterial color={GREYS.g1} />
        </mesh>
        <Backlight position={[CELL.xMin + 0.015, 1.45, hk[2] + 0.1]} rotation-y={Math.PI / 2} size={[1.4, 1.0]} shape="slab" softness={0.8}
          intensity={0.75} time={t} />
        {CELL_SPOTS.hammerPegs.map((pg, i) => (
          <mesh key={i} position={pg} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[CELL_PEGS.r, CELL_PEGS.r, CELL_PEGS.out, 12]} />
            <meshBasicMaterial color={S.void} />
          </mesh>
        ))}
        <HungSilHammer hook position={hk} rotation-y={CELL_SPOTS.hammerRotY} warmth={0.25} />
      </>
    );
  } else if (f < 60) {
    // V2Rain — grandpa's hammer on the wall in the screen glow from the window: the only warm edge in the film so far.
    body = (
      <>
        <CameraRig position={[0.3, 1.5, 0.55]} target={[0.02, 1.52, -1.58]} fov={fov(11)} />
        <mesh position={[0, 1.5, -1.6]}>
          <planeGeometry args={[8, 5]} />
          <meshBasicMaterial color={GREYS.g1} />
        </mesh>
        <Backlight position={[0.15, 1.45, -1.585]} size={[1.4, 1.0]} shape="slab" softness={0.8} intensity={0.75} time={t} />
        <HungSilHammer position={[0, 1.52, -1.6]} warmth={0.25} />
      </>
    );
  } else if (f < 90) {
    // Swing alignment, side view: the striking face meets the iris at p = 0.5 (frame 72).
    const p = Math.min(1, (f - 60) / 24);
    const sp = MONOLITH.guySwingSpot;
    body = (
      <>
        <CameraRig position={[4.6, 1.05, 0.75]} target={[0, 1.0, 0.65]} fov={fov(24)} />
        <Backlight position={[-9, 1.6, 0.6]} rotation-y={Math.PI / 2} size={[12, 7]} softness={0.85} intensity={0.85} time={t} />
        <Floor />
        <Monolith time={t} />
        <SilGuy position={sp.position} rotation-y={sp.rotationY} pose={monolithSwing(p)} rightHand={<HeldSilHammer warmth={0.3} />} />
      </>
    );
  } else if (f < 150) {
    // Swing close-up: impact at 92.
    const sh = Math.max(0, (f - 92) / 40);
    const spill = ramp(f, 93, 122);
    const kib = Math.max(0, (f - 93) / 70);
    const p = f < 92 ? 0.25 + 0.25 * Math.min(1, (f - 86) / 6) : 0.5 + (f - 92) / 60;
    const sp = MONOLITH.guySwingSpot;
    const cam: V3 = [2.7, 1.25, 3.3];
    body = (
      <>
        <CameraRig position={cam} target={[-0.05, 0.6, 0.45]} fov={fov(23)} />
        <BackOf cam={cam} at={[0, 0.6, 0.3]} dist={9} size={[12, 6]} intensity={0.7} t={t} />
        <Floor />
        <Monolith time={t} shatter={sh} spill={spill} kibble={kib} />
        <SilGuy position={sp.position} rotation-y={sp.rotationY} pose={monolithSwing(Math.min(1, p))}
          rightHand={<HeldSilHammer warmth={f < 92 ? 0.3 : 0.3 + 0.7 * ramp(f, 92, 100)} />} rim={spill > 0 ? {color: S.dawnGold, strength: 0.6 * spill, power: 6, dir: [-0.8, -0.3]} : null} />
      </>
    );
  } else if (f < 180) {
    // Aftermath: phone in one hand, hammer in the other, backlit by the gold from the broken box. Pancake eats; tail wags.
    const cam: V3 = [-3.3, 0.95, 5.6];
    const pc = MONOLITH.pileCenter;
    body = (
      <>
        <CameraRig position={cam} target={[-0.25, 0.85, 0.5]} fov={fov(24)} />
        <BackOf cam={cam} at={[0, 0.8, 0]} dist={9} size={[14, 7]} intensity={0.55} t={t} />
        <Floor />
        <Monolith time={t} shatter={1} spill={1} kibble={1} />
        <SilGuy position={[-0.62, 0, 1.3]} rotation-y={0.5} pose={guyIdle(t)} rim={{color: S.dawnGold, strength: 0.6, power: 6, dir: [1, 0.2]}}
          rightHand={<HeldSilHammer warmth={1} />} leftHand={<HeldSilPhone open={0} />} />
        <SilPancake pose={{...pancakeEat(t), tailWagAmount: 1}} position={[pc[0] + PANCAKE.noseEatLocal[2], 0, pc[1]]} rotation-y={-Math.PI / 2}
          rim={{color: S.dawnGold, strength: 0.5, power: 6, dir: [0, 1]}} />
      </>
    );
  } else if (f < 210) {
    // Final: the paper 1984 held up, hood down; the brightest white in the frame once open.
    const open = ramp(f, 190, 196);
    body = (
      <>
        <CameraRig position={[0.9, 1.05, 3.8]} target={[-0.15, 1.45, 0]} fov={fov(27)} />
        <Backlight position={[0, 1.2, -12]} size={[22, 9]} softness={0.9} intensity={0.62} time={t} />
        <Backlight position={[0, 0.3, -11]} size={[26, 2.2]} shape="slab" color={S.dawnGold} softness={0.9} intensity={0.55} time={t} />
        <Floor />
        <SilGuy pose={guyHoldUp(1, t)} hood={0} rightHand={<HeldPaperBook open={open} />} rim={{color: S.dawnGold, strength: 0.8, dir: [0, -1]}} />
      </>
    );
  } else if (f < 240) {
    // Hold: total dark, one light source — the iris in the pillow.
    const open = ramp(f, 214, 232);
    const talk = f >= 230 ? 0.9 : 0;
    fog = {color: S.void, near: 3, far: 20};
    body = (
      <>
        <CameraRig position={[0.12, 1.2, 1.2]} target={[0, 0.58, -0.25]} fov={fov(19)} />
        <Backlight position={[0, 0.7, -3.5]} size={[3.4, 1.6]} softness={0.95} intensity={0.1} time={t} />
        <mesh position={[0, 0.25, 0.4]}>
          <boxGeometry args={[1.5, 0.5, 2]} />
          <meshBasicMaterial color={S.void} />
        </mesh>
        <PillowIris position={[0, 0.5, -0.32]} open={open} talk={talk} time={t} rim={{color: S.authRed, strength: 0.35, dir: [0, 1]}} />
      </>
    );
  } else if (f < 270) {
    // Final hero: Pancake eats from the plain bowl in a pool of gold.
    body = (
      <>
        <CameraRig position={[2.1, 0.38, 4.3]} target={[0.05, 0.28, 0.2]} fov={fov(15)} />
        <Backlight position={[0, 1.0, -10]} size={[18, 6]} softness={0.9} color={S.dawnGold} intensity={0.42} time={t} />
        <Backlight position={[0, 1.6, -11]} size={[24, 10]} softness={0.95} intensity={0.32} time={t} />
        <Floor />
        <group rotation-y={-1.1}>
          <SilPancake pose={{...pancakeEat(t), tailWagAmount: 1}} rim={{color: S.dawnGold, strength: 0.45, power: 6, dir: [0, 1]}} />
          <PlainBowl position={PANCAKE.bowl} fill={0.8} goldPool={1} />
        </group>
      </>
    );
  } else if (f < 300) {
    if (f < 285) {
      // profile from his right side: the phone is black on the black head, its screen light leaks around it
      const cam: V3 = [-2.6, 1.5, 0.5];
      body = (
        <>
          <CameraRig position={cam} target={[-0.1, 1.42, 0.05]} fov={fov(17)} />
          <BackOf cam={cam} at={[0, 1.0, 0]} dist={8} size={[8, 5]} intensity={0.7} t={t} />
          <Floor />
          <SilGuy pose={guyPhoneToEar(t)} rightHand={<HeldSilPhone open={1} />} />
        </>
      );
    } else {
      const c = SILPHONE.screenCenterOpen;
      body = (
        <>
          <CameraRig position={[0.05, 1.2 + c[1] + 0.04, 0.95]} target={[0, 1.2 + c[1] - 0.03, c[2]]} fov={fov(14)} />
          <Backlight position={[0.6, 1.5, -3]} size={[3, 1.6]} softness={0.95} intensity={0.3} time={t} />
          <Backlight position={[-0.9, 1.0, -3]} size={[0.8, 0.8]} color={S.authRed} softness={0.95} intensity={0.3} time={t} />
          <SilPhone position={[0, 1.2, 0]} rotation={[-0.1, 0.06, 0.03]} open={1} />
        </>
      );
    }
  } else {
    const prog = f < 315 ? 0.55 * ramp(f, 301, 314, lin) : 0.5 + 0.5 * ramp(f, 315, 329, lin);
    const vent: V3 = [0.05, 2.55, 0.35];
    const pose = mergePose(guyHoldUp(0, t), {headPitch: 0.55});
    const close = f < 315;
    body = (
      <>
        {close ? (
          // face-on to the page from above his right shoulder (along the screen normal), rolled so the text reads upright:
          // 'read' mode orients the page for HIM (text-up points away from him), so a camera in front of him sees it upside down
          <CameraRig position={[-0.415, 2.069, 0.105]} target={[-0.135, 1.148, 0.375]} roll={-1.335} fov={fov(16)} />
        ) : (
          <CameraRig position={[1.9, 1.3, 4.6]} target={[0, 1.75, 0.2]} fov={fov(28)} />
        )}
        <Backlight position={[-1.5, 1.6, -6]} size={[8, 5]} softness={0.9} intensity={0.5} time={t} />
        <Floor />
        <RedVent position={vent} />
        <SilGuy pose={pose} rightHand={<HeldSilEReader progress={prog} vent={[vent[0], vent[1] - 0.03, vent[2]]} flakeSize={close ? 1 : 2.8} />} />
      </>
    );
  }

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <SilStage fog={fog}>
        {body}
        {haze ? <FogLayers position={[0, 0, -1.5]} near={1} far={10} width={30} height={6} density={0.1} time={t} /> : null}
      </SilStage>
      <Letterbox />
    </AbsoluteFill>
  );
}
