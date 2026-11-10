// O1 · THE HOUSE AT DAWN (204.20–213.44) — the static, symmetrical wide. The house is a black cube dead centre on the
// wet plain; the low sun rises straight up behind it (its corona and rays burn round the roof line, the upper limb
// crests the roof at ~208.5 s). The door stands open on gold light and the one warm window glows; the man (hood down)
// sits on the step, Pancake beside him wagging slowly, the bowl in its gold pool in front. Far off, a low black city in
// the haze. All mirrored in the wet ground. Nothing moves but the light: fog drift, the corona breathing on the beat, a
// breath, a tail.
import React from 'react';
import {S} from '../../lib/palette';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {HouseCube} from '../../lib/sets';
import {Porch} from './Porch';
import {World, OUTRO_FOG} from './World';
import {CAM_A, FOV_A, PITCH_A, pitchTarget, sunElev} from './cameras';

export const ShotHouse: React.FC<{t: number; f: number}> = ({t}) => (
  <SilStage fog={OUTRO_FOG} camera={{far: 4000, near: 0.3}}>
    <CameraRig position={CAM_A} target={pitchTarget(CAM_A, PITCH_A)} fov={FOV_A} />
    <World t={t} cam={CAM_A} sunElev={sunElev(t)} />
    <HouseCube time={t} warmWindow={1} doorOpen={1} interior={0.9} interiorColor={S.dawnGold} stencil="UNIT 0315"
      doorIris={{radius: 0.22, intensity: 0, open: 0.0001, glow: 0}} irisLight={0} />
    <Porch t={t} rim={0.4} />
  </SilStage>
);
