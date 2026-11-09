// [40] "I'm done with 'upgrade to continue,'" — the house sheds its subscription wrap; then the pop-up storm gets
// CANCELLED-stamped on every beat and shatters into confetti.
import React from 'react';
import * as THREE from 'three';
import {CameraRig} from '../../../lib/three';
import {SparkleField, Confetti, Sunburst, SpeedLines} from '../../../lib/three/fx';
import {PopupTunnel3D, POPUP_MESSAGES} from '../../../lib/ui';
import type {DialogSpec} from '../../../lib/ui';
import {lerp, clamp01, noise1} from '../../../lib/time';
import {Hit} from '../Hit';
import {World} from '../World';
import {Performer} from '../Performer';
import {ShatterPopup} from '../Shatter';
import {K, beatL, LBEATS} from '../timing';
import {ShotProps, smooth, easeOut, hit, V3} from '../common';
import {WRAPPED} from './WordShots';
import {hillsHeight} from '../../../lib/sets/Exterior';

// ------------------------------------------------------------------ F
const HOUSE_C: V3 = [0, 4.6, 3.6];
/** for this shot he stands just outside the front gate, so nothing blocks the view of the house */
const GF: V3 = [-3.6, hillsHeight(-3.6, 14.2), 14.2];
const YAW = Math.atan2(HOUSE_C[0] - GF[0], HOUSE_C[2] - GF[2]);
const toWorld = (p: V3): V3 => {
  const c = Math.cos(YAW), s = Math.sin(YAW);
  return [GF[0] + p[0] * c + p[2] * s, GF[1] + p[1], GF[2] - p[0] * s + p[2] * c];
};
const toLocal = (p: V3): V3 => {
  const x = p[0] - GF[0], z = p[2] - GF[2];
  const c = Math.cos(YAW), s = Math.sin(YAW);
  return [x * c - z * s, p[1] - GF[1], x * s + z * c];
};
export const releaseAt = (lf: number) => clamp01((lf - (K.done1 - 3)) / 34);

/** F (248-297): over his shoulder — he sings "I'm done", points at the house on "done": the padlock pops, the wrap falls off. */
export const HouseFree: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const k = smooth(f / 49);
  const rel = releaseAt(lf);
  const pointK = clamp01((lf - (K.done1 - 6)) / 5);
  // look back at the lens on "I'm", then at the house
  const back = clamp01((lf - 250) / 6) * (1 - clamp01((lf - (K.done1 - 8)) / 6));
  const cam = toWorld([lerp(-1.05, -0.85, k), lerp(1.75, 1.85, k), lerp(-1.9, -1.4, k)]);
  const target: V3 = [lerp(HOUSE_C[0] - 1.6, HOUSE_C[0] - 0.6, k), lerp(3.4, 3.9, k), HOUSE_C[2]];
  const b = beatL(lf);
  const kick = hit(lf, K.done1, 4);
  return (
    <>
      <CameraRig position={cam} target={target} fov={44 - 3 * kick - b.pulse} roll={-0.04 + 0.03 * kick * noise1(lf, 3)} />
      <World lf={lf} flare={0.3} deco={{...WRAPPED(t), release: rel}} />
      <group position={GF} rotation={[0, YAW, 0]}>
        <Performer lf={lf} gesture={pointK > 0 ? 'point' : 'sing'} from="sing" mix={pointK} aim={toLocal(HOUSE_C)} expression={rel > 0.2 ? 'happy' : 'determined'}
          extra={{headYaw: -1.0 * back, eyesX: -0.8 * back, torsoTwist: -0.25 * back}} />
      </group>
      <SparkleField count={40} seed={41} area={[10, 8, 3]} time={t} position={[0, 4.5, 4]} size={0.7} intensity={3.2 * clamp01(rel * 3) * (1 - clamp01((rel - 0.85) * 6))} />
      <Confetti progress={clamp01((lf - K.done1 - 2) / 70)} position={[0, 6.8, 4.2]} count={220} power={2.4} spread={1.0} size={4} duration={2.6} seed={14} />
      <pointLight position={[cam[0], GF[1] + 2.2, cam[2]]} color="#ffe2c4" intensity={2.0} distance={5} decay={1.4} />
    </>
  );
};
export const HouseFreeOver: React.FC<ShotProps> = ({lf}) => (
  <Hit k={Math.round(lf - K.done1)} tint="#FFF3D0" streak="#FFD24A" seed={251} strength={0.4} />
);

// ------------------------------------------------------------------ G
const UPGRADE: DialogSpec = {
  kind: 'plus', title: 'Upgrade Required', heading: 'UPGRADE TO CONTINUE', message: 'Continuing is a PLUS feature.', buttons: ['Upgrade', 'Upgrade'],
  aquaButton: 0, aquaColor: 'lime', width: 470,
};
const SURE: DialogSpec = {kind: 'warning', title: 'Are you sure?', heading: 'Are you sure?', message: 'Are you sure you are sure?\nYou will lose everything.',
  buttons: ['Yes', 'No'], defaultButton: 1, width: 440};
const PLUS: DialogSpec = {kind: 'lock', title: 'PLUS Required', heading: 'PLUS REQUIRED', message: 'This button requires PLUS.', buttons: ['Upgrade', 'Cancel'],
  aquaButton: 0, disabledButtons: [1], width: 440};
const CONT: DialogSpec = {kind: 'question', title: 'Continue?', heading: 'Continue?', message: 'Upgrade to continue continuing.', buttons: ['Upgrade'],
  aquaButton: 0, aquaColor: 'gold', progress: 0.99, progressLabel: 'Continuing... 99%', width: 440};
export const STORM_POOL: DialogSpec[] = [UPGRADE, SURE, PLUS, CONT, POPUP_MESSAGES[1], POPUP_MESSAGES[2], POPUP_MESSAGES[5], POPUP_MESSAGES[15],
  POPUP_MESSAGES[18], POPUP_MESSAGES[19], POPUP_MESSAGES[7], POPUP_MESSAGES[11], POPUP_MESSAGES[23], POPUP_MESSAGES[4]];
export {UPGRADE, SURE, PLUS, CONT};

/** storm rig: camera floats in the sunrise sky above the hill, looking a little up/left toward the sun */
const RIG_POS: V3 = [-3, 9, 30];
const RIG_ROT: [number, number, number] = [0.1, 0.22, 0];
const rigWorld = (p: V3): V3 => {
  const v = new THREE.Vector3(...p).applyEuler(new THREE.Euler(...RIG_ROT));
  return [v.x + RIG_POS[0], v.y + RIG_POS[1], v.z + RIG_POS[2]];
};

type Hero = {spec: DialogSpec; beat: number; x: number; y: number; tilt: number};
const nearestBeat = (x: number) => Math.round(LBEATS.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), LBEATS[0]));
const HEROES: Hero[] = [
  {spec: UPGRADE, beat: nearestBeat(297), x: 0.15, y: 0.1, tilt: 0.06},
  {spec: SURE, beat: nearestBeat(313), x: -0.55, y: 0.25, tilt: -0.09},
  {spec: PLUS, beat: nearestBeat(329), x: 0.6, y: -0.05, tilt: 0.07},
  {spec: CONT, beat: nearestBeat(345), x: -0.2, y: 0.15, tilt: -0.05},
];

/** G (297-355): inside the pop-up storm; on every beat a hero dialog gets CANCELLED and shatters into confetti. */
export const StampStorm: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const camL: V3 = [0, 0, 4.2 - smooth(f / 58) * 0.6];
  const cam = rigWorld(camL);
  const tgt = rigWorld([0, 0.1, -10]);
  const roll = lerp(0.12, -0.3, f / 58) + 0.04 * Math.sin(t * 3);
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={62 + 5 * b.pulse} roll={roll} />
      <World lf={lf} flare={0.1} deco={null} skyGlow={0.5} />
      <group position={RIG_POS} rotation={RIG_ROT}>
        <hemisphereLight args={['#fff2e0', '#ff9ac0', 0.6]} />
        <Sunburst position={[0, 0, -60]} radius={70} rays={22} rotation2d={t * 0.4} opacity={0.12} colorA="#fff1c0" colorB="#ff8fc8" glow={0.03} additive />
        <PopupTunnel3D frame={lf} seed="fin-storm" count={30} radius={4.4} near={2} speed={0.3} width={1.9} length={40} position={[0, 0, -2]}
          pulse={b.pulse} specs={STORM_POOL} spin={0.005} inner={0.62} />
        {HEROES.map((h, i) => {
          const arrive = h.beat - 9;
          if (lf < arrive - 1 || lf > h.beat + 40) return null;
          const z = lerp(-14, -0.2, easeOut((lf - arrive) / 8)) + Math.max(0, lf - h.beat) * 0.02;
          return (
            <ShatterPopup key={i} spec={h.spec} width={2.3} f={lf} stampAt={h.beat - 5} shatterAt={h.beat + 6} seed={`g${i}`} position={[h.x, h.y, z]}
              rotation={[0, 0, h.tilt]} sheen={lerp(-0.2, 1.2, clamp01((lf - arrive - 3) / 10))} />
          );
        })}
        <SparkleField count={30} seed={21} area={[8, 6, 10]} time={t} position={[0, 0, -4]} size={0.25} intensity={1.6} />
      </group>
      <SpeedLines intensity={0.3 + 0.35 * b.pulse} time={t} count={60} inner={0.5} color="#ffffff" opacity={0.45} />
    </>
  );
};
export const StampStormOver: React.FC<ShotProps> = ({lf}) => (
  <>
    {HEROES.map((h, i) => (
      <Hit key={i} k={lf - (h.beat + 6)} tint="#FFF6E0" streak="#FF9AD0" seed={260 + i} strength={0.32} />
    ))}
  </>
);
