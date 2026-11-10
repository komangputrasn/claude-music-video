/**
 * HOLD — one take (scene-local 0–314, song 155.93–166.40). Lines [36] and [37] (+ the tail word "had." of [35]).
 *
 * A black ocean to the horizon under a band of lit fog. Over the sea hangs a pillow the size of a building: a black
 * eclipse against the haze, a thin red seam across it (TENURE's eye, closed). The hold music is VISIBLE: thin red
 * waveform traces ripple through the air at every depth, shaped by the song's spectrum, mirrored by the swell. He stands
 * on the water, small, dead centre, his back to us, phone at his ear, grandpa's hammer hanging from his right hand.
 * The camera pushes in and zooms down the axis (man → eye) from the first frame and settles at 162.0.
 *   [35] tail: "HAD." (sung across the cut, to 156.20) lies dim on the carrier trace, alone, until "THEN" arrives.
 *   [36] "THEN THE HOLD MUSIC" rides the nearest trace word by word. The music decays and the traces flatten; on
 *        "stopped" (157.80) EVERY light cuts out except the pillow's red seam and its broken reflection. In the black,
 *        "STOPPED, AND THE VOICE CAME THROUGH," stands where the music was, dim; on "voice" the seam crackles.
 *   [37] "THE ONE FROM MY PILLOW, AND IT SAID," in the same place, small; from "one" the lids part and the eye opens
 *        fully (by 163.45); its red light fills the haze around the pillow and runs down the sea toward him, and he
 *        comes back out of the dark as a black cut-out. Near-silence (162–166.39): nothing moves but his breath and
 *        the eye's. The narration leaves; on 164.18 the eye speaks one small line of bone: "IS THAT YOU?" — held to
 *        the cut, where Final kills the red and brings the gold.
 */
import React from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {Backlight, FogLayers} from '../../lib/atmos';
import {beatAt, lerp} from '../../../lib/time';
import type {WordFx} from '../../lib/WorldLyric';
import {BlackSea} from './BlackSea';
import {HoldWaves, Trace, holdBands, holdLoud, waveY, waveSlope} from './HoldWaves';
import {HoldGuy, PillowEye, LyricRows, PILLOW_POS, PILLOW_W, PILLOW_H, pitchTarget, pxToM, V3} from './common';
import {BLACKOUT, CAMERA, L, T, eyeState, musicLevel, smooth, s01, stillTime, swellAt} from './timing';

const VIS0 = 22;
const VIS1 = 17.5;
const PITCH0 = 5.1;
const PITCH1 = 4.9;

/** the trace the lyric rides; the line of text lives at this spot for the whole scene */
// the three near traces (and the far low one) run across the bright horizon haze: `cover` makes them occlude the grey
// behind their core instead of adding to it, so they stay authRed there (additive red on grey reads pink/salmon)
const CARRIER: Trace = {y: 3.3, z: -8, width: 66, amp: 0.25, freq: 1.0, speed: 1.0, seed: 1.3, core: 0.028, glow: 0.16, intensity: 1.0, cover: 1};
const TRACES: Trace[] = [
  CARRIER,
  {y: 1.74, z: -22, width: 100, amp: 0.3, freq: 0.8, speed: 0.9, seed: 2.7, core: 0.036, glow: 0.22, intensity: 0.5, cover: 1},
  {y: 2.41, z: -50, width: 130, amp: 0.45, freq: 0.6, speed: 0.85, seed: 9.2, core: 0.055, glow: 0.35, intensity: 0.42, cover: 1},
  {y: 16.5, z: -95, width: 250, amp: 1.3, freq: 0.34, speed: 0.8, seed: 5.9, core: 0.1, glow: 0.7, intensity: 0.7},
  {y: 25.0, z: -120, width: 290, amp: 1.5, freq: 0.3, speed: 0.75, seed: 3.3, core: 0.12, glow: 0.8, intensity: 0.5},
  {y: 32.4, z: -100, width: 270, amp: 1.6, freq: 0.3, speed: 0.7, seed: 4.1, core: 0.11, glow: 0.8, intensity: 0.55},
  {y: 32.7, z: -160, width: 380, amp: 1.9, freq: 0.22, speed: 0.6, seed: 7.7, core: 0.15, glow: 1.0, intensity: 0.42},
  {y: 9.0, z: -240, width: 520, amp: 2.2, freq: 0.16, speed: 0.55, seed: 6.4, core: 0.22, glow: 1.4, intensity: 0.3, cover: 0.6},
];
const TEXT_POS: V3 = [0, CARRIER.y, CARRIER.z + 0.06];
/** in the blackout the rest of [36] lies just above the black water in front of him (he is invisible then): the words and
    their broken reflection are the only proof the sea is still there */
const WATER_TEXT_POS: V3 = [0, 0.08, 1.2];

export const cameraAt = (t: number) => {
  const u = smooth(s01(t, CAMERA.t0, CAMERA.settle));
  const vis = lerp(VIS0, VIS1, u);
  const pos: V3 = [0, lerp(1.05, 1.0, u), lerp(31.5, 25, u)];
  return {pos, vis, pitch: lerp(PITCH0, PITCH1, u), fov: cameraFovForVisible(vis)};
};

export const ShotHold: React.FC<{t: number; f: number}> = ({t, f}) => {
  const cam = cameraAt(t);
  const on = t < BLACKOUT;
  const level = musicLevel(t) * (0.55 + 0.45 * holdLoud(f));
  const bands = holdBands(f);
  const eye = eyeState(t);
  const ts = stillTime(t);
  // rhythm from light: the haze and the traces breathe on the hold music's beats (gone with the music)
  const pulse = beatAt(t, 6).pulse * musicLevel(t);
  // [36] sized on the wide (~46 px em at 22°); [37] small (~42 px em at the settled framing, cap ≈ 29 px)
  const em36 = pxToM(46, 31.5 - TEXT_POS[2], cameraFovForVisible(VIS0));
  const em37 = pxToM(42, 25 - TEXT_POS[2], cameraFovForVisible(VIS1));
  const lift36 = 0.35 * em36 + 0.16 * em36;
  const lift37 = 0.35 * em37 + 0.16 * em37;
  // the tail of [35], "HAD." (sung 155.80–156.20, across the cut): a touch smaller and dim (em ≈ 41 px, cap ≈ 29 px)
  const emHad = em36 * 0.9;
  const liftHad = 0.35 * emHad + 0.16 * emHad;
  /**
   * a word riding the carrier trace: bobbing with the wave at its centre `xc`, tilted with the slope. With `halfW` the
   * word also clears a crest under its ends: its tilted baseline keeps the centre's clearance + `clear` (m) along its width.
   */
  const ride = (xc: number, lift: number, halfW = 0, clear = 0): WordFx => {
    const rot = Math.max(-0.22, Math.min(0.22, Math.atan(waveSlope(CARRIER, xc, t, bands, level)) * 0.8));
    let y = waveY(CARRIER, xc, t, bands, level);
    if (halfW > 0) {
      for (const k of [-1, -0.5, 0.5, 1]) {
        y = Math.max(y, waveY(CARRIER, xc + k * halfW, t, bands, level) - k * halfW * Math.tan(rot) + clear);
      }
    }
    return {offset: [0, y + lift, 0], rotation: [0, 0, rot]};
  };
  // the narration lands while the camera is still settling (~0.9x scale at 160.24): a touch larger so it never drops
  // under ~27 px cap; the question stays small (cap ≈ 29 px at the locked framing)
  const em37n = em37 * (44 / 42);
  // the water line: sized for the camera AT "stopped" (still far: ~40 px em, cap ≈ 28 px) and held near that pixel size
  // while the push continues in the dark (a group scale, so the glyphs are not re-laid out every frame)
  const camW = cameraAt(BLACKOUT);
  const emW = pxToM(40, camW.pos[2] - WATER_TEXT_POS[2], camW.fov);
  const kW = pxToM(lerp(40, 42, s01(t, BLACKOUT, T.the37)), cam.pos[2] - WATER_TEXT_POS[2], cam.fov) / emW;
  const liftW = 0.35 * emW + 0.16 * emW;
  return (
    <>
      <CameraRig position={cam.pos} target={pitchTarget(cam.pos, cam.pitch)} fov={cam.fov} />
      <BlackSea time={ts} reflectivity={0.8} swell={swellAt(t)} path={1} />

      {on ? (
        <>
          {/* lit fog along the horizon (its lower half is under the sea) and the haze the pillow eclipses */}
          <Backlight position={[0, 0, -420]} size={[1800, 76]} shape="slab" softness={1} noise={0.2} time={t}
            intensity={0.3 * (1 + 0.06 * pulse)} />
          <Backlight position={[PILLOW_POS[0], PILLOW_POS[1] - 1.5, PILLOW_POS[2] - 12]} size={[PILLOW_W * 3.0, PILLOW_H * 3.3]}
            shape="radial" softness={1} noise={0.22} time={t} intensity={0.44 * (1 + 0.08 * pulse)} />
          <HoldWaves time={t} bands={bands} level={level} fade={1.2 * (0.88 + 0.22 * pulse)} traces={TRACES} />
          {/* deep haze BEYOND the pillow (never in front of him or the pillow): it veils the far traces and the horizon */}
          <FogLayers position={[0, 0, PILLOW_POS[2] - 10]} count={5} near={1} far={190} width={700} height={24} color={GREYS.g4}
            density={0.08} scale={34} ground={3} time={t} drift={[0.8, 0.04]} pulse={0.3 * pulse} seed={3} />
        </>
      ) : null}

      {/* the closed seam keeps its HDR red (the only light in the blackout); as the iris opens its red comes down to ~1.1:
          the iris body above ~1.5 tone-maps salmon/peach under ACES (measured), so it stays authRed */}
      <PillowEye time={ts} open={eye.open} talk={eye.talk} breath={eye.breath} speak={eye.speak} corona={eye.corona}
        intensity={1.6 - 0.5 * smooth(s01(eye.open, 0.1, 0.8)) + 0.3 * eye.voice} rim={0.75 * eye.corona} />

      <HoldGuy t={t} phone={on ? 1 : 0} warmth={0.14}
        rim={on
          ? {color: S.bone, strength: 0.55, power: 6, dir: [0, 1], dirMix: 0.8}
          : eye.corona > 0.01 ? {color: S.authRed, strength: 0.5 * eye.corona, power: 6.5, dir: [0, 1], dirMix: 0.85} : null} />

      {!on && t < T.the37 ? (
        // "STOPPED, AND THE VOICE CAME THROUGH," on the black water, over its own reflection
        <group position={WATER_TEXT_POS} scale={kW}>
          <LyricRows line={L.hold} time={t} rows={[[4, 5, 6, 7, 8, 9]]} size={emW} mode="light" intensity={0.62} halo={0.1}
            fx={() => ({offset: [0, liftW, 0]})} />
        </group>
      ) : null}

      <group position={TEXT_POS}>
        {t < T.the37 ? (
          on ? (
            <>
              {/* the tail of [35] (Cancel's line): only "HAD." is still sung after the cut (to 156.20). Cancel showed the
                  rest of the line, so it is not repeated: the one word lies quietly on the carrier, dim bone, centred
                  where [36] is about to appear, and goes as "THEN" arrives */}
              {t < T.then ? (
                <LyricRows line={L.had} time={t} rows={[[8]]} size={emHad} mode="light" intensity={0.6} halo={0.14}
                  until={T.then} fx={(_i, _info, s) => ride(s.x + s.w / 2, liftHad, s.w / 2, 0.12 * emHad)} />
              ) : null}
              {/* [36] "THEN THE HOLD MUSIC" rides the carrier trace (it dies with the light) */}
              <LyricRows line={L.hold} time={t} rows={[[0, 1, 2, 3]]} size={em36} mode="light" intensity={1.0} halo={0.28}
                fx={(_i, _info, s) => ride(s.x + s.w / 2, lift36)} />
            </>
          ) : null
        ) : (
          <>
            {/* [37] narration, small, in the same place; it leaves the dark just before the question */}
            <LyricRows line={L.voice} time={t} rows={[[0, 1, 2, 3, 4, 5, 6, 7]]} size={em37n} mode="paint" intensity={0.72}
              until={T.end + 0.2} fx={() => ({offset: [0, lift37, 0], visible: t < T.narrationOff})} />
            {/* the pillow's voice: the only line in the dark */}
            <LyricRows line={L.voice} time={t} rows={[[8, 9, 10]]} size={em37} mode="paint" intensity={0.9}
              until={T.end + 0.2} fx={() => ({offset: [0, lift37, 0]})} />
          </>
        )}
      </group>
    </>
  );
};
