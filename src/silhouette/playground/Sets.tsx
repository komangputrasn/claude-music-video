// Sets look-dev: one cinematic shot per set component (src/silhouette/lib/sets), 30 frames each, staged as real shots
// (SilStage, fog, backlight, long lens, letterbox, tiny silhouettes for scale).
//   node scripts/still.mjs silplay Sets --frames=15,45,75,105,135,165,195,225,255,285,315,345,375,405,435,465
//   shot  frames    what
//   0     0–29      CellRoom: through the blinds from the deck, he rises with the bed, red scan through the slats
//   1     30–59     CellRoom: symmetrical diorama wide (front wall off), bed up, printer page halted + error
//   2     60–89     CellRoom: bed profile — the back-board lifts him upright, slit light behind
//   3     90–119    CellRoom: feeder wide from floor level, door cracked, Pancake in profile
//   4     120–149   CellRoom: the hammer wall — pegs across the vertical light slit
//   5     150–179   CellRoom: the window from outside — deck-access facade, a figure on the deck
//   6     180–209   CellRoom: from inside toward the window — he climbs in, backlit by the city
//   7     210–239   CellRoom: the printer slab from above — red slit, page halted half out
//   8     240–269   Megablock: low monumental look-up, tiny figure at the pilotis
//   9     270–299   CityGrid + Megablock warmWindow: the Final crane — a black city with one warm window
//   10    300–329   Plaza: lone figure crossing the axis, stair + podium + screen at the far end, floodlight masts
//   11    330–359   HouseCube: Chorus1 — the cube in a red laser cage, low and monumental
//   12    360–389   HouseCube: V2Rain — the door and its iris lock, him in front of it
//   13    390–419   HouseCube: Outro — dawn gold, warm window, man + dog on the step, the bowl
//   14    420–449   Corridor: gates closing in sequence toward the far light, him walking in
//   15    450–479   HouseCube: windowOpen — he climbs in through the left window (sill 1.0 m, 0.2 m skin)
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SilStage, CameraRig} from '../lib/SilStage';
import {SilGuy, SilPancake} from '../lib/SilCast';
import {Iris} from '../lib/Iris';
import {S, GREYS, cameraFovForVisible} from '../lib/palette';
import {Letterbox} from '../overlays/SilOverlays';
import {guyIdle, guySleepyWake, guyClimb, guyWalk} from '../../lib/characters/Guy';
import {pancakeIdle, pancakeSad} from '../../lib/characters/Pancake';
import {ramp} from '../../lib/time';
import {Backlight, LightPool} from '../lib/atmos';
import {
  CellRoom, CELL_SPOTS, CELL_CAMERAS, cellBedTilt, Megablock, CityGrid, Plaza, PLAZA_SPOTS, PLAZA_CAMERAS, HouseCube,
  HOUSE_SPOTS, HOUSE_CAMERAS, Corridor, CORRIDOR_SPOTS, CORRIDOR_CAMERAS,
} from '../lib/sets';
import type {CellCamera} from '../lib/sets';

export const duration = 480;
const SHOT = 30;

type V3 = [number, number, number];
const cam = (c: {position: V3; target: V3; fov: number}) => <CameraRig position={c.position} target={c.target} fov={c.fov} />;
const NOWAG = {tailWagAmount: 0};
const rimTop = {color: S.bone, strength: 0.7, power: 6, dir: [0, 1] as [number, number]};

/** stand-in feeder monolith (the real one lives in the props module): its face is local +Z, faintly lit red by its iris */
const FeederStandIn: React.FC<{t: number}> = ({t}) => (
  <group position={CELL_SPOTS.feeder} rotation-y={CELL_SPOTS.feederRotY}>
    <mesh position={[0, 0.65, 0]}>
      <boxGeometry args={[0.7, 1.3, 0.5]} />
      <meshStandardMaterial color={GREYS.g5} roughness={0.7} />
    </mesh>
    <Iris position={[0, 0.98, 0.252]} radius={0.13} time={t} />
    <pointLight position={[0, 0.55, 0.75]} color={S.authRed} intensity={1.6} distance={2.2} decay={2} />
  </group>
);

const Ground: React.FC<{color?: string; size?: number}> = ({color = S.void, size = 2000}) => (
  <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

const CellShot: React.FC<{c: CellCamera; children: React.ReactNode; fogFar?: number}> = ({c, children, fogFar = 70}) => (
  <SilStage fog={{color: S.ash, near: 12, far: fogFar}}>
    {cam(c)}
    {children}
  </SilStage>
);

const Shot: React.FC<{i: number; f: number; t: number}> = ({i, f, t}) => {
  const k = f - i * SHOT;
  const u = k / SHOT;
  switch (i) {
    case 0: {
      const p = 0.3 + u * 0.45;
      return (
        <CellShot c={CELL_CAMERAS.throughBlinds}>
          <CellRoom time={t} bedTilt={cellBedTilt(p)} bedActive={0.8} windowLight={{scan: 0.15 + u * 0.7}}>
            <SilGuy position={CELL_SPOTS.guyInBed} pose={guySleepyWake(p)} />
          </CellRoom>
        </CellShot>
      );
    }
    case 1: {
      const c = CELL_CAMERAS.wide;
      return (
        <CellShot c={c}>
          <CellRoom time={t} bedTilt={1} printerFeed={0.5} printerError={1} hideWalls={c.hideWalls} hide={c.hide}>
            <SilGuy position={CELL_SPOTS.guyInBed} pose={guySleepyWake(0.7)} />
          </CellRoom>
        </CellShot>
      );
    }
    case 2: {
      const c = CELL_CAMERAS.bedProfile;
      const p = 0.3 + u * 0.3;
      return (
        <CellShot c={c}>
          <CellRoom time={t} bedTilt={cellBedTilt(p)} bedActive={1} hideWalls={c.hideWalls} hide={c.hide}>
            <SilGuy position={CELL_SPOTS.guyInBed} pose={guySleepyWake(p)} />
          </CellRoom>
        </CellShot>
      );
    }
    case 3: {
      const c = CELL_CAMERAS.feederWide;
      return (
        <CellShot c={c}>
          <CellRoom time={t} hideWalls={c.hideWalls} hide={c.hide} doorIris={false}>
            <FeederStandIn t={t} />
            <LightPool position={[0.25, 0, 0.3]} radius={1.0} color={S.authRed} intensity={1.0} haze={1.0} hazeHeight={1.1} />
            <SilPancake position={CELL_SPOTS.pancakeAtFeeder} rotation-y={CELL_SPOTS.pancakeAtFeederRotY} pose={{...pancakeSad(t), ...NOWAG}} />
          </CellRoom>
        </CellShot>
      );
    }
    case 4: {
      const c = CELL_CAMERAS.hammerWall;
      return (
        <CellShot c={c}>
          <CellRoom time={t} hideWalls={c.hideWalls} hide={c.hide}>
            {/* stand-in hammer: handle along +Z, head toward +Z */}
            <group position={CELL_SPOTS.hammerHook}>
              <mesh position={[0, 0.014, 0.05]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.014, 0.014, 0.34, 10]} />
                <meshBasicMaterial color={S.void} />
              </mesh>
              <mesh position={[0, 0.03, 0.22]}>
                <boxGeometry args={[0.03, 0.16, 0.04]} />
                <meshBasicMaterial color={S.void} />
              </mesh>
            </group>
          </CellRoom>
        </CellShot>
      );
    }
    case 5:
      return (
        <CellShot c={CELL_CAMERAS.windowOutside} fogFar={90}>
          <CellRoom time={t} bedTilt={1} windowLight={{scan: 0.6}}>
            <SilGuy position={CELL_SPOTS.guyInBed} pose={guySleepyWake(0.7)} />
            <SilGuy position={[4.6, 0, 3.4]} rotation-y={-Math.PI / 2} pose={guyWalk(t)} />
          </CellRoom>
        </CellShot>
      );
    case 6: {
      const c = CELL_CAMERAS.windowInside;
      const p = 0.35 + u * 0.3;
      return (
        <CellShot c={c} fogFar={90}>
          <CellRoom time={t} hideWalls={c.hideWalls} blinds={{traverse: 0.85}}>
            <SilGuy position={CELL_SPOTS.climbRoot} rotation-y={CELL_SPOTS.climbRotY} pose={guyClimb(p)} />
          </CellRoom>
        </CellShot>
      );
    }
    case 7: {
      const c = CELL_CAMERAS.printer;
      return (
        <CellShot c={c}>
          <CellRoom time={t} printerFeed={0.5} printerError={1} hideWalls={c.hideWalls}>
            <SilGuy position={CELL_SPOTS.guyAtPrinter} rotation-y={CELL_SPOTS.guyAtPrinterRotY} pose={guyIdle(t)} />
          </CellRoom>
        </CellShot>
      );
    }
    // ------------------------------------------------------------------ 8 Megablock look-up
    case 8:
      return (
        <SilStage fog={{color: S.ash, near: 60, far: 520}}>
          <CameraRig position={[0, 1.6, 190]} target={[0, 47, 0]} fov={cameraFovForVisible(30)} />
          <Ground />
          <Backlight position={[0, 30, -220]} size={[520, 240]} shape="radial" softness={1} intensity={0.9} time={t} />
          <Megablock w={34} h={88} d={24} seed={3} litFraction={0.04} />
          <Megablock w={30} h={130} d={26} seed={7} position={[-84, 0, -120]} litFraction={0.02} />
          <Megablock w={30} h={130} d={26} seed={9} position={[84, 0, -120]} litFraction={0.02} />
          <SilGuy position={[0, 0, 4]} rotation-y={Math.PI} pose={guyWalk(t)} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 9 CityGrid crane + one warm window
    case 9:
      return (
        <SilStage fog={{color: GREYS.g4, near: 150, far: 1300}} camera={{far: 4000}}>
          <CameraRig position={[0, 180 + u * 12, 520]} target={[0, 60, -300]} fov={cameraFovForVisible(17)} />
          <Ground />
          <Backlight position={[0, 60, -1000]} size={[3200, 420]} shape="slab" softness={1} intensity={0.7} time={t} />
          <CityGrid rows={16} cols={16} spacing={62} seed={4} avoid={[[0, 0, 40]]} litFraction={0.0} color={GREYS.g2} ambient={1} />
          <Megablock w={30} h={120} d={26} seed={5} warmWindow={{intensity: 1.8}} litFraction={0} color={GREYS.g2} ambient={0.6} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 10 Plaza crossing
    case 10: {
      const c = PLAZA_CAMERAS.crossing;
      const a = PLAZA_SPOTS.crossingStart, b = PLAZA_SPOTS.crossingEnd;
      const x = -6 + (b[0] - a[0]) * 0.02 * u;
      return (
        <SilStage fog={{color: S.ash, near: 30, far: 260}}>
          {cam(c)}
          <Ground />
          <Backlight position={[0, 14, PLAZA_SPOTS.screen[2] - 30]} size={[240, 60]} shape="radial" softness={1} intensity={0.7} time={t} />
          <Plaza />
          {/* stand-in TENURE screen on the podium */}
          <group position={PLAZA_SPOTS.screen}>
            <mesh position={[0, 12, 0]}>
              <planeGeometry args={[40, 22]} />
              <meshBasicMaterial color={S.bone} toneMapped />
            </mesh>
            <Iris position={[0, 13.5, 0.05]} radius={5.5} time={t} />
          </group>
          <Megablock w={34} h={120} d={24} seed={2} position={PLAZA_SPOTS.towersLeft[0]} rotation-y={PLAZA_SPOTS.towersLeftRotY} litFraction={0.03} />
          <Megablock w={34} h={120} d={24} seed={6} position={PLAZA_SPOTS.towersRight[0]} rotation-y={PLAZA_SPOTS.towersRightRotY} litFraction={0.03} />
          <SilGuy position={[x, 0, a[2]]} rotation-y={Math.PI / 2} pose={guyWalk(t)} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 11 HouseCube laser cage
    case 11: {
      const c = HOUSE_CAMERAS.cage;
      return (
        <SilStage fog={{color: S.ash, near: 20, far: 160}}>
          {cam(c)}
          <Ground color={GREYS.g1} />
          <Backlight position={[0, 6, -40]} size={[110, 40]} shape="radial" softness={1} intensity={0.55} time={t} />
          <HouseCube time={t} laserCage={0.55 + u * 0.45} />
          <SilGuy position={[1.2, 0, 6.6]} rotation-y={Math.PI} pose={guyIdle(t)} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 12 HouseCube door + iris (V2Rain)
    case 12: {
      const c = HOUSE_CAMERAS.door;
      return (
        <SilStage fog={{color: GREYS.g2, near: 10, far: 90}}>
          {cam(c)}
          <Ground color={GREYS.g1} />
          <Backlight position={[0, 4, -20]} size={[60, 30]} shape="radial" softness={1} intensity={0.6} time={t} />
          <HouseCube time={t} windowGlow={0.5} facadeLight={0.35} doorIris={{open: 0.4 + 0.6 * ramp(f, 360, 380), intensity: 1.6}} />
          <SilGuy position={HOUSE_SPOTS.guyAtDoor} rotation-y={Math.PI} pose={guyIdle(t)} rim={{...rimTop, color: S.authRed, strength: 0.6, dir: [0.4, 0.6]}} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 13 HouseCube outro (dawn gold)
    case 13: {
      const c = HOUSE_CAMERAS.outro;
      return (
        <SilStage fog={{color: S.ash, near: 30, far: 200}}>
          {cam(c)}
          <Ground />
          <Backlight color={S.dawnGold} position={[0, 4, -60]} size={[200, 50]} shape="radial" softness={1} intensity={0.75} time={t} />
          <Backlight color={S.bone} position={[0, 1, -70]} size={[300, 10]} shape="slab" softness={1} intensity={0.5} time={t} />
          <HouseCube time={t} warmWindow={1} doorOpen={1} interior={0.9} interiorColor={S.dawnGold} doorIris={{open: 0.3, flicker: 0.5}} irisLight={0.3} />
          <SilGuy position={HOUSE_SPOTS.guySeat} pose={{...guyIdle(t), sit: 1}} hood={0} />
          <SilPancake position={HOUSE_SPOTS.pancakeSeat} rotation-y={0.5} pose={{...pancakeIdle(t), sit: 1}} />
          <mesh position={[HOUSE_SPOTS.bowl[0], 0.04, HOUSE_SPOTS.bowl[2]]}>
            <cylinderGeometry args={[0.13, 0.1, 0.08, 20]} />
            <meshBasicMaterial color={S.void} />
          </mesh>
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 15 HouseCube window climb
    case 15: {
      const c = HOUSE_CAMERAS.window;
      return (
        <SilStage fog={{color: GREYS.g2, near: 10, far: 90}}>
          {cam(c)}
          <Ground color={GREYS.g1} />
          <Backlight position={[-6, 4, -20]} size={[70, 30]} shape="radial" softness={1} intensity={0.55} time={t} />
          <HouseCube time={t} windowOpen interior={0.7} facadeLight={0.4} windowGlow={0.5} />
          <SilGuy position={HOUSE_SPOTS.climbRoot} rotation-y={HOUSE_SPOTS.climbRotY} pose={guyClimb(0.25 + u * 0.3)} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 14 Corridor
    default: {
      const c = CORRIDOR_CAMERAS.axial;
      const close = (g: number) => ramp(f, 420 + g * 3, 432 + g * 3);
      return (
        <SilStage fog={{color: S.ash, near: 15, far: 120}}>
          {cam(c)}
          <Ground />
          <Corridor time={t} gateClose={(g) => (g >= 3 ? close(g - 3) : 0)} />
          <SilGuy position={[0, 0, CORRIDOR_SPOTS.walkStart[2] - 3 - u * 1.2]} rotation-y={Math.PI} pose={guyWalk(t)} />
        </SilStage>
      );
    }
  }
};

export default function Sets() {
  const f = useCurrentFrame();
  const t = f / 30;
  const i = Math.floor(f / SHOT);
  return (
    <AbsoluteFill style={{background: S.void}}>
      <Shot i={i} f={f} t={t} />
      <Letterbox />
    </AbsoluteFill>
  );
}
