// TERMS — Intro, shot B (song 6.85–9.03 s, frames 206–270): the terms of service scroll up a black skyscraper like
// film credits. One-point perspective up the facade: the red TENURE iris crowns a column of clauses; the camera cranes
// slowly DOWN the face (≈ 3–4 px/frame) while the clauses rise faster than the building (on screen the text always moves
// UP, like credits), and settles on the lit entrance at the foot, where tiny hooded figures cross. Two slits of sky light
// between the towers draw the perspective lines.
import React from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {Iris} from '../../lib/Iris';
import {TermsScroll} from '../../lib/tenure';
import {Backlight, WetGround} from '../../lib/atmos';
import {bassAt, beatAt, lerp} from '../../../lib/time';
import {ShotProps, Ground, Block, Walkers, Walker, RIM_BONE} from './common';
import {clamp01, prog, smooth} from './timing';

const VIS_FOV = 32;
const FOV = cameraFovForVisible(VIS_FOV);
const T0 = 6.85;
const T1 = 9.033;

const TOWER_W = 54;
const GAP = 5;
const TERMS_Y = 11.5;
const TERMS_H = 25.5; // the clause column runs from above the door to just under the iris
const IRIS_Y = 42;
const IRIS_R = 3.3;
const DOOR: [number, number] = [6.5, 8.5];

// camera: opens on the iris crowning the terms (iris fully inside the 2.39:1 band), ends on the door at the foot
const CAM0: [number, number, number] = [0, 9, 66];
const TGT0 = 25.5;
const CAM1: [number, number, number] = [0, 1.3, 61];
const TGT1 = 15.2;

// they cross the lit doorway in the last ~0.8 s, once it has risen into the frame
const WALKERS: Walker[] = [
  {x0: -1.0, z: 6, dir: 1, t0: 8.7},
  {x0: 1.4, z: 7.5, dir: -1, t0: 8.7, phase: 0.4},
  {x0: -3.6, z: 5, dir: 1, t0: 8.7, phase: 0.8},
];

export const ShotTerms: React.FC<ShotProps> = ({t, f}) => {
  // one slow crane down the facade, still drifting at the cut (no dead stop)
  const u = smooth(prog(t, T0, T1 + 0.35));
  const breath = clamp01(bassAt(f) * 2.2) * 0.8 + 0.2 * beatAt(t).pulse;
  const camPos: [number, number, number] = [0, lerp(CAM0[1], CAM1[1], u), lerp(CAM0[2], CAM1[2], u)];
  const tgt: [number, number, number] = [0, lerp(TGT0, TGT1, u), 0];
  const side = TOWER_W / 2 + GAP + 45;
  return (
    <>
      <CameraRig position={camPos} target={tgt} fov={FOV} />

      {/* the terms tower and its two neighbours (one-point perspective canyon) */}
      <Block size={[TOWER_W, 600, 50]} position={[0, 0, 0]} color={GREYS.g2} ambient={0.035} />
      <Block size={[90, 560, 50]} position={[-side, 0, -1.5]} color={GREYS.g2} ambient={0.03} />
      <Block size={[90, 560, 50]} position={[side, 0, -1.5]} color={GREYS.g2} ambient={0.03} />
      {/* sky light in the two gaps: thin vertical slits converging upward */}
      {[-1, 1].map((s) => (
        <Backlight key={s} color={S.bone} intensity={0.46} size={[GAP * 1.15, 1400]} position={[s * (TOWER_W / 2 + GAP / 2), 500, -3]} shape="vertical" softness={0.55} noise={0.15} time={t} />
      ))}

      {/* the terms of service, scrolling up like credits (faster than the camera sinks, so they rise on screen) */}
      <TermsScroll position={[0, TERMS_Y, 0.2]} width={TOWER_W - 8} height={TERMS_H} fontSize={1.45} speed={3.6} time={t} intensity={0.9} seed={3} fade={0.1} />
      {/* TENURE watches from the crown of the text */}
      <Iris position={[0, IRIS_Y, 0.3]} radius={IRIS_R} time={t} open={1} pupil={0.28 + 0.1 * breath} intensity={1.15 + 0.2 * breath} glow={0.45} />

      {/* the lit entrance at the foot: tiny passers-by cross it */}
      <mesh position={[0, DOOR[1] / 2, 0.12]}>
        <planeGeometry args={DOOR} />
        <meshBasicMaterial color={GREYS.g8} toneMapped />
      </mesh>
      <Backlight color={S.bone} intensity={0.1} size={[22, 16]} position={[0, DOOR[1] / 2, 0.6]} shape="radial" softness={1} noise={0} time={t} />
      <Walkers walkers={WALKERS} t={t} rim={RIM_BONE} />

      <WetGround size={[300, 160]} position={[0, 0, 75]} color={GREYS.g1} reflectivity={0.85} puddles={0.5} time={t} seed={9} />
      <Ground />
    </>
  );
};
