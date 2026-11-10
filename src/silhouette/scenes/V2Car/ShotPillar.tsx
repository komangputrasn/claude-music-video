/**
 * Shot 3 — PILLAR (scene-local 294–423, song 102.35–106.70). [22] "I stopped to get gas, and the car drove away,"
 * The gas station is a fuelling pillar standing on the highway: a black monolith with a tall lightbox face, under one
 * hard white floodlight falling through the fog onto wet concrete. The capsule rolls to a stop beside it (stopped,
 * 102.44); the gull-wing door lifts and he climbs out, a black shape against the lightbox, and reaches for the red
 * iris socket (gas, 103.54). On "car" (104.62) the door slams, the iris on the tail flares; on "drove away" (105.10)
 * the EMPTY capsule — its frost-white seat still glowing — pulls away on its own down the lane and dissolves into the
 * fog, a red eye shrinking. He takes a step after it and stops.
 * The line stands on the lightbox as black stencil letters: I STOPPED / TO GET GAS, / AND THE CAR / DROVE AWAY,
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {Iris} from '../../lib/Iris';
import {WorldLyric, measureLyric} from '../../lib/WorldLyric';
import {S, GREYS, SFONTS, cameraFovForVisible} from '../../lib/palette';
import {makeSilhouetteMaterial} from '../../lib/Silhouette';
import {Backlight, FogLayers, LightPool, LightShaft} from '../../lib/atmos';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {guyIdle, guySitOn, guyWalk, mergePose, mixPose, GuyPose} from '../../../lib/characters/Guy';
import {Capsule, CAPSULE} from './Capsule';
import {Highway} from './Highway';
import {TCUT, W} from './timing';

const FOV = cameraFovForVisible(24);
const PZ = -24; // pillar front face
const PW = 3.7; // lightbox width
const PH = 13; // pillar height
const BOX_Y0 = 0.55; // lightbox bottom
const PLINTH_TOP = 0.24; // the island plinth under the pillar (he stands on it at the socket)
const CAR_X = 3.35;
const CAR_Z = -24.4;
/** the lightbox rows: I STOPPED / TO GET GAS, / AND THE CAR / DROVE AWAY, */
const ROWS = [[0, 1], [2, 3, 4], [5, 6, 7], [8, 9]];
const ROW_PITCH = 1.24; // em
/** letter size: 0.43 m, or smaller so the widest row (measured in the font actually installed) fills at most 80% of
 *  the lightbox. Measured at runtime: the box width is fixed and the final render's Futura differs from the fallback. */
const lightboxEm = () => {
  const w1 = Math.max(...measureLyric(22, 1, undefined, {rows: ROWS, lineHeight: ROW_PITCH}).rowWidths);
  return Math.min(0.43, (0.8 * PW) / w1);
};
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 2.4);

/** lightbox face: soft lit panel brighter at the top (the floodlight above), a thin header and the lease line */
let boxTex: THREE.CanvasTexture | null = null;
const getBoxTex = () => {
  if (boxTex) return boxTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1536;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 1536);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.55, '#e4e2dd');
  gr.addColorStop(1, '#a9a8a4');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 1536);
  // faint diffuser seams
  g.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 192; y < 1536; y += 192) g.fillRect(0, y, 512, 3);
  // header and footer in small stencil type
  g.fillStyle = 'rgba(10,10,12,0.9)';
  g.textAlign = 'center';
  (g as unknown as {letterSpacing: string}).letterSpacing = '6px';
  g.font = `600 30px ${SFONTS.futura}`;
  g.fillText('FUEL · ON PLAN ONLY', 256, 70, 432); // maxWidth: stays between the rules in any font
  g.font = `400 22px ${SFONTS.mono}`;
  g.fillText('PILLAR 07 · LEASE 0315-77', 256, 1500, 432);
  g.fillRect(40, 92, 432, 3);
  g.fillRect(40, 1460, 432, 3);
  boxTex = new THREE.CanvasTexture(c);
  boxTex.colorSpace = THREE.SRGBColorSpace;
  return boxTex;
};

const FuelPillar: React.FC<{t: number; socket: number; bass: number}> = ({t, socket, bass}) => {
  const mats = useMemo(() => ({
    black: makeSilhouetteMaterial(S.void, {color: S.bone, strength: 0.5, power: 6, dir: [0, 1]}, true),
    box: new THREE.MeshBasicMaterial({map: getBoxTex(), fog: true, toneMapped: true}),
  }), []);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const boxH = PH - BOX_Y0 - 0.6;
  useLayoutEffect(() => {
    mats.box.color.setScalar(0.74 + 0.03 * bass);
  });
  return (
    <group position={[0, 0, PZ]}>
      {/* island plinth + the monolith */}
      <mesh material={mats.black} position={[0, PLINTH_TOP / 2, -0.9]}>
        <boxGeometry args={[PW + 1.6, PLINTH_TOP, 4.4]} />
      </mesh>
      {/* a thin black frame round the lightbox: he climbs out past its right edge, and a wide black border there would
          swallow his silhouette (black on black) for the half-second he crosses it */}
      <mesh material={mats.black} position={[0, PH / 2, -0.75]}>
        <boxGeometry args={[PW + 0.12, PH, 1.5]} />
      </mesh>
      <mesh material={mats.box} position={[0, BOX_Y0 + boxH / 2, 0.012]}>
        <planeGeometry args={[PW, boxH]} />
      </mesh>
      {/* the fuel socket: a red iris that opens when he reaches for it */}
      <Iris position={[0.55, 1.3, 0.03]} radius={0.16} time={t} open={0.25 + 0.75 * socket} intensity={1.0 + 0.4 * socket}
        glow={0.3 + 0.3 * socket} />
    </group>
  );
};

/** the floodlight: a black cantilever arm off the pillar's crown with a hot white strip under it, over the apron */
// the lamp hangs beyond the car's far (right) side: its cone must not stand between the camera and his path out of the
// door to the socket, nor between the camera and his bust seated in the stopped pod (the camera looks down the car's
// lane, x = CAR_X; the cone's back face drawn in front of a hero veils him grey). At x = CAR_X + 2.0 the cone (r 1.8 m
// at the glass band's height) clears the bust (x = CAR_X ± 0.25) at every height of the glass.
const LAMP: [number, number, number] = [CAR_X + 2.0, 6.05, PZ + 2.4];
const FloodArm: React.FC = () => {
  const mats = useMemo(() => ({
    black: makeSilhouetteMaterial(S.void, null, true),
    hot: new THREE.MeshBasicMaterial({color: new THREE.Color(S.bone).multiplyScalar(2.2), fog: true}),
  }), []);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const x0 = PW / 2, x1 = LAMP[0] + 1.6;
  return (
    <group>
      <mesh material={mats.black} position={[(x0 + x1) / 2, LAMP[1] + 0.22, LAMP[2] - 0.6]}>
        <boxGeometry args={[x1 - x0, 0.42, 2.0]} />
      </mesh>
      <mesh material={mats.hot} position={[LAMP[0], LAMP[1] - 0.005, LAMP[2]]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[2.2, 0.16]} />
      </mesh>
    </group>
  );
};

// his moves (world space)
const SEAT_W = (carZ: number): [number, number, number] => [CAR_X - CAPSULE.seatRoot[0], CAPSULE.seatRoot[1], carZ - CAPSULE.seatRoot[2]];
/** where he stands at the socket: on the island plinth, so his feet rest on its top, not inside it */
const STAND: [number, number, number] = [1.45, PLINTH_TOP, -22.95];

export const ShotPillar: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const lt = t - TCUT.pillar;
  // the capsule: rolls in to a stop, waits, then drives itself away into the fog
  const arrive = easeOut(lt / 0.75);
  const depart = Math.max(0, t - W.drove);
  const carZ = lerp(CAR_Z + 3.2, CAR_Z, arrive) - 0.5 * 14 * depart * depart;
  const door = smooth((t - (W.stopped + 0.12)) / 0.45) * (1 - smooth((t - W.car22) / 0.28));
  const irisK = smooth((t - W.car22) / 0.2);
  // him: rise out (sit → stand, seat → outside), turn to the pillar, reach for the socket; then watch the car go
  const out = smooth((t - (W.stopped + 0.35)) / 0.75);
  const seat = SEAT_W(CAR_Z);
  const step = smooth((t - (W.drove + 0.25)) / 0.7);
  const pos: [number, number, number] = [
    lerp(seat[0], STAND[0], out) + 0.18 * step,
    lerp(seat[1], STAND[1], out),
    lerp(seat[2], STAND[2], out) - 0.42 * step,
  ];
  const sitP: GuyPose = mergePose(guySitOn(CAPSULE.seatH), {armL: {shoulderX: 0.6, elbow: 0.6, swing: 0}, armR: {shoulderX: 0.6, elbow: 0.6, swing: 0}});
  const reach = smooth((t - (W.gas - 0.35)) / 0.45) * (1 - smooth((t - W.car22) / 0.35));
  const standP: GuyPose = mergePose(guyIdle(t, 2), {
    armL: {shoulderX: 0.15 + 0.75 * reach, shoulderZ: 0.12 + 0.75 * reach, elbow: 0.2, swing: 0},
    headYaw: -0.55 * smooth((t - W.car22) / 0.35) * (1 - step * 0.4),
    headPitch: 0.04,
  });
  const walkP = mixPose(standP, mergePose(guyWalk(t), {armR: {shoulderX: 0.5 * step, elbow: 0.2, swing: 0.3}}), Math.sin(Math.PI * step) * 0.9);
  const pose = mixPose(sitP, walkP, out);
  // facing: −Z in the car; turn a little toward the pillar to reach; after "drove", turn toward the departing car
  const yaw = Math.PI + 0.35 * reach * out - 0.3 * step;
  const em = useMemo(lightboxEm, []);
  const camZ = lerp(-7.6, -8.4, smooth(lt / 4.3));
  return (
    <SilStage fog={{color: GREYS.g3, near: 30, far: 260}} camera={{far: 2500}}>
      <CameraRig position={[CAR_X, 1.45, camZ]} target={[CAR_X, 3.15, PZ]} fov={FOV} />
      <Highway time={t} zNear={10} zFar={-900} gantries={false} pulse={bass} horizon={0.55} horizonY={6} horizonH={60} sky={0.08}
        wet={{reflectivity: 0.85, puddles: 0.6, streak: 1.2}} />
      {/* fog beyond the pillar: the capsule dissolves into it */}
      <FogLayers position={[0, 0, PZ - 5]} count={9} near={0.5} far={140} width={70} height={18} color={GREYS.g5} density={0.2}
        time={t} drift={[0.3, 0.02]} />
      <Backlight position={[0, 5, -230]} size={[220, 40]} shape="radial" softness={1} intensity={0.35} time={t} />
      {/* the floodlight: hard white top light on the pillar's apron */}
      <FloodArm />
      <LightShaft from={[LAMP[0], LAMP[1] - 0.12, LAMP[2]]} to={[LAMP[0], 0, LAMP[2]]} radiusStart={0.35} radiusEnd={2.1}
        intensity={0.9} softness={1.3} striation={0.55} dust={320} time={t} ground={0} groundFade={0.4} source={0.9} />
      <LightPool position={[LAMP[0], 0, LAMP[2]]} radius={2.4} intensity={0.7} haze={0} />
      <FuelPillar t={t} socket={reach} bass={bass} />
      <WorldLyric line={22} time={t} mode="dark" size={em} rows={ROWS} lineHeight={ROW_PITCH} anchor="baseline"
        position={[0, 5.4, PZ + 0.03]} until={TCUT.patent + 0.05} fog={false} />
      {/* the same low seat back + front glow as shot 2: from behind he is seen seated in the pod before he climbs out */}
      <Capsule time={t} position={[CAR_X, 0, carZ]} rotation-y={Math.PI} doorSide={1} door={door} seatGlow={1} iris={0.35 + 0.65 * irisK}
        irisOpen={0.4 + 0.6 * irisK} headlights={1} cabinGlow={0.3} frontGlow={1} seatBack={0.5}
        rim={{color: S.bone, strength: 0.6, power: 6, dir: [0, 1]}}>
        {out < 0.02 ? <SilGuy position={CAPSULE.seatRoot} pose={sitP} /> : null}
      </Capsule>
      {out >= 0.02 ? <SilGuy position={pos} rotation-y={yaw} pose={pose} rim={{color: S.bone, strength: 0.5, power: 7, dir: [0, 1]}} /> : null}
    </SilStage>
  );
};
