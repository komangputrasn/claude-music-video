// O2 · THE LAST IMAGE (213.44–220.00) — cut on the downbeat to a low, symmetrical medium shot of the doorway, with a
// very slow creep in. The house fills the middle like a black slab, the dawn at both sides; the open door is a tall
// rectangle of gold light, the man sits on the step against it with his arm round Pancake (turned to him, curled tail
// out on the gold); the warm window glows left. On the right door-jamb is TENURE's iris lock, dead. In the hush of the
// music (214.0) it wakes ONE LAST TIME: a red pinpoint, the blades open, red light on the jamb; Pancake's head swings
// up and round toward it, ears up, his tail goes still; the man does not look, he only draws the dog in. The eye
// stares, stutters, fails, closes to a pinpoint on the beat at 215.64 and dies for good at 216.18 as the music comes
// back in. Pancake turns back to his man, the wag returns. The gold holds; fade to black 218.3 → 219.5.
import React from 'react';
import {S} from '../../lib/palette';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {HouseCube} from '../../lib/sets';
import {bassAt} from '../../../lib/time';
import {Porch} from './Porch';
import {World, OUTRO_FOG} from './World';
import {FOV_B, PITCH_B, camB, pitchTarget, sunElev} from './cameras';
import {IRIS, irisAttention, irisOpen, irisPower, smooth, span} from './timing';

export const ShotDoor: React.FC<{t: number; f: number; abs: number}> = ({t, abs}) => {
  const cam = camB(t);
  const power = irisPower(t);
  const open = irisOpen(t);
  const failing = span(t, IRIS.fail0, IRIS.dead);
  const attn = irisAttention(t);
  const after = smooth(span(t, IRIS.dead + 0.3, IRIS.dead + 1.6));
  // the dying eye still answers the bass while it is awake (pupil), but never flashes the frame
  const pupil = 0.3 + 0.06 * bassAt(abs) * (1 - failing);
  // the lib fades the glint with intensity (a dead iris has none), but on the stutter's OFF frames (power 0.08, eye still
  // open) its leftover reads as a pale dot in the dark eye, blinking against the red: gate it with the power
  // Red stays RED: at 1.45 the open iris face (~22 px radius here) tone-mapped coral (hottest pixels ~(238, 77, 60)), so
  // like Intro's irises the open face is held at 1.0; the closed pinpoint (wake / death) keeps 1.45. The lib's halo is
  // glow x open x intensity / 1.5, so glow takes the inverse factor: the pure-red halo is exactly the old level
  const hot = 1 + 0.45 * (1 - open);
  return (
    <SilStage fog={OUTRO_FOG} camera={{far: 4000, near: 0.1}}>
      <CameraRig position={cam} target={pitchTarget(cam, PITCH_B)} fov={FOV_B} />
      <World t={t} cam={cam} sunElev={sunElev(t)} ground={{seed: 21, puddles: 0.55, streak: 0.6}} />
      <HouseCube time={t} warmWindow={1} doorOpen={1} interior={0.9} interiorColor={S.dawnGold} stencil="UNIT 0315" facadeLight={0.05}
        doorIris={{radius: 0.22, open: Math.max(0.0001, open), pupil, intensity: hot * power, glow: ((0.65 * 1.45) / hot) * power, flicker: 0.35 * failing, glint: power > 0.5}}
        irisLight={1.4 * power} />
      <Porch t={t} attn={attn} after={after} rim={0.35} />
    </SilStage>
  );
};
