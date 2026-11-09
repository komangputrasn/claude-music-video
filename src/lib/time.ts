// Song-time helpers. EVERYTHING animated must be a pure function of the frame (no useFrame, no Date, no Math.random).
import React, {createContext, useContext} from 'react';
import {useCurrentFrame, interpolate, Easing, random} from 'remotion';
import audio from '../data/audio.json';
import {FPS} from '../timeline';

export {FPS};
export const sec = (s: number) => Math.round(s * FPS);

/** Absolute frame (song frame) at which the current scene starts. Provided by Layout. */
export const SceneStartContext = createContext(0);

/** Song-absolute frame (0 = song start) even inside a scene Sequence. */
export const useAbsoluteFrame = () => useCurrentFrame() + useContext(SceneStartContext);
/** Song-absolute time in seconds. */
export const useSongTime = () => useAbsoluteFrame() / FPS;

const A = audio as {
  fps: number; tempo: number; beats: number[]; downbeats: number[];
  rms: number[]; bass: number[]; onset: number[]; bands: string[];
};
export const TEMPO = A.tempo; // ~112.3 BPM
export const BEATS: number[] = A.beats; // seconds
export const DOWNBEATS: number[] = A.downbeats; // seconds (every 4th beat)
export const BEAT_LEN = 60 / A.tempo; // ~0.534 s

const clampF = (f: number) => Math.max(0, Math.min(A.rms.length - 1, Math.floor(f)));
/** Loudness 0..1 at song frame. */
export const rmsAt = (absFrame: number) => A.rms[clampF(absFrame)];
/** Bass energy 0..1 at song frame. */
export const bassAt = (absFrame: number) => A.bass[clampF(absFrame)];
/** Onset (transient) strength 0..1 at song frame. */
export const onsetAt = (absFrame: number) => A.onset[clampF(absFrame)];
const DIGITS = '0123456789abcdefghijklmnopqrstuv';
/** 16 spectrum bands (40 Hz..16 kHz, log spaced), each 0..1, at song frame. Good for Y2K equalizer bars. */
export const bandsAt = (absFrame: number): number[] =>
  Array.from(A.bands[clampF(absFrame)]).map((c) => DIGITS.indexOf(c) / 31);

const lastIndexAtOrBefore = (arr: number[], t: number) => {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
};

export type BeatInfo = {
  /** index of the most recent beat (-1 before first beat) */
  index: number;
  /** seconds since the most recent beat */
  since: number;
  /** 0..1 progress through the current beat */
  phase: number;
  /** 1 on the beat, decays exponentially to ~0 by mid-beat. Use for pulses/flashes. */
  pulse: number;
  /** index of beat within its bar 0..3 (0 = downbeat) */
  inBar: number;
  /** 1 on a downbeat, decaying. */
  downPulse: number;
};

/** Beat information at song time t (seconds). */
export const beatAt = (t: number, decay = 9): BeatInfo => {
  const i = lastIndexAtOrBefore(BEATS, t);
  if (i < 0) return {index: -1, since: 0, phase: 0, pulse: 0, inBar: 0, downPulse: 0};
  const since = t - BEATS[i];
  const len = i + 1 < BEATS.length ? BEATS[i + 1] - BEATS[i] : BEAT_LEN;
  const pulse = Math.exp(-since * decay);
  const d = lastIndexAtOrBefore(DOWNBEATS, t);
  const dSince = d >= 0 ? t - DOWNBEATS[d] : 99;
  const firstDown = BEATS.indexOf(DOWNBEATS[0]);
  const inBar = (((i - firstDown) % 4) + 4) % 4;
  return {index: i, since, phase: Math.min(1, since / len), pulse, inBar, downPulse: Math.exp(-dSince * decay * 0.6)};
};

/** Hook version: beat info at the current song time. */
export const useBeat = (decay = 9) => beatAt(useSongTime(), decay);

/** Time (s) of the nth beat at or after time t. */
export const nextBeat = (t: number) => {
  const i = lastIndexAtOrBefore(BEATS, t);
  return BEATS[Math.min(BEATS.length - 1, i + 1)];
};

// ---------- easing / animation sugar (all pure) ----------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0..1 ramp between frames a..b with easing (default easeInOut cubic). */
export const ramp = (f: number, a: number, b: number, easing: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});
/** Smooth overshoot pop-in 0..~1.1..1 between frames a..a+dur. */
export const popIn = (f: number, a: number, dur = 12) =>
  interpolate(f, [a, a + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2))});
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Deterministic pseudo random in [0,1) for a seed. Never use Math.random(). */
export const rand = (seed: string | number) => random(seed);
/** Deterministic smooth noise (1D value noise) — for camera shake, wobble. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i;
  const a = random(`n${seed}-${i}`) * 2 - 1, b = random(`n${seed}-${i + 1}`) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};

/** Convenience: provide scene start to children (used by Layout). */
export const SceneStart: React.FC<{from: number; children: React.ReactNode}> = ({from, children}) =>
  React.createElement(SceneStartContext.Provider, {value: from}, children);
