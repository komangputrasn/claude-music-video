// TERMS · Outro — timing (song seconds), the shot list and the story curves (sun, iris, fade). Pure functions of song
// time (useSongTime()) so everything stays locked to the music. Instrumental: sceneLyricLines(204.2, 220) is empty.
import {DOWNBEATS, clamp01, lerp, rand} from '../../../lib/time';

export const FROM = 6126; // absolute frame of the scene start (src/timeline.ts)
export const TO = 6600;
export const LEN = TO - FROM; // 474 frames
export const T0 = FROM / 30; // 204.2 s
export const T1 = TO / 30; // 220.0 s

/** nearest downbeat (s) to a nominal time */
export const downbeat = (t: number) => DOWNBEATS.reduce((b, d) => (Math.abs(d - t) < Math.abs(b - t) ? d : b), DOWNBEATS[0]);

/** THE cut: the static wide holds until the downbeat at 213.44, then the last image (the doorway and the iris). */
export const T_CUT = downbeat(213.44); // 213.44
export const CUT = Math.round(T_CUT * 30) - FROM; // scene-local frame 277

export type ShotId = 'house' | 'door';
export const shotAt = (local: number): ShotId => (local < CUT ? 'house' : 'door');

// ------------------------------------------------------------------------------------------------ curves
export const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
export const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/**
 * The sun rises straight up behind the house during the wide: its disc is hidden by the cube at the cut in (only the
 * corona glows round the roof), the upper limb crests the roof line at ~208.5 s and it stands about half clear of the
 * roof at the cut. Returned in degrees ABOVE the cube's roof line as seen from the wide camera.
 */
export const sunOverRoof = (t: number) => lerp(-1.05, 0.2, smooth(span(t, T0, T_CUT)) * 0.35 + span(t, T0, T_CUT) * 0.65);

// ---- the TENURE iris on the door-frame: one last time (all in song seconds)
export const IRIS = {
  wake: 213.98, //   a red pinpoint comes back in the dead disc (on the beat 214.02)
  open0: 214.05, //  the blades open, slowly
  open1: 214.75, //  fully open: it stares (scan sweep, pupil on the bass) …
  fail0: 215.2, //   … then it starts to fail: the stutter grows
  close0: 215.66, // on the beat 215.64: it closes …
  close1: 216.12, // … to a pinpoint
  dead: 216.18, //   gone for good on the beat 216.18 (the music comes back in)
} as const;

/** iris aperture 0..1 */
export const irisOpen = (t: number) => {
  if (t < IRIS.open0) return 0;
  if (t < IRIS.close0) return smooth(span(t, IRIS.open0, IRIS.open1));
  return 1 - smooth(span(t, IRIS.close0, IRIS.close1));
};

/**
 * iris power 0..1: 0 dead (black housing disc only), a hesitant wake, full while open, then a failing stutter that
 * gets worse until it dies for good. Deterministic per frame.
 */
export const irisPower = (t: number) => {
  if (t < IRIS.wake || t >= IRIS.dead + 0.35) return 0;
  const f = Math.floor(t * 30);
  // wake: two short hesitant blinks, then on
  if (t < IRIS.open0 + 0.1) return rand(`outro-wake-${f}`) > 0.45 ? 0.75 : 0.15;
  if (t < IRIS.fail0) return 1;
  if (t < IRIS.dead) {
    const k = span(t, IRIS.fail0, IRIS.dead);
    const on = rand(`outro-fail-${f}`) > 0.12 + k * 0.62;
    return on ? 1 - 0.35 * k : 0.08;
  }
  // the very last pinpoint fades out after the death
  return 0.25 * (1 - span(t, IRIS.dead, IRIS.dead + 0.35)) * (rand(`outro-pin-${f}`) > 0.5 ? 1 : 0.3);
};

/** how much the iris draws Pancake's attention (0..1): ears up, head turned to it while it is awake */
export const irisAttention = (t: number) => {
  const on = smooth(span(t, IRIS.wake + 0.15, IRIS.open1));
  const off = smooth(span(t, IRIS.dead + 0.25, IRIS.dead + 1.15));
  return on * (1 - off);
};

/** fade to black: starts 218.3, fully black from 219.5 */
export const FADE = {a: 218.3, b: 219.5} as const;
export const fadeBlack = (t: number) => smooth(span(t, FADE.a, FADE.b));
