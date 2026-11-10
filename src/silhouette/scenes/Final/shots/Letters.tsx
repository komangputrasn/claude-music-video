// S3 · THE LETTERS FALL (174.10–178.47) — low, wide, symmetrical. TENURE's 30-storey red "BUY NOW" stands across the
// plain against the dawn: the SAME sign as Chorus1's slam (ShotBuyNow: cap 80 m, spacing 0.14, word gap 0.5, lease
// timers under every letter), so the old system visibly falls. The man and the dog stand small in the word gap. Each
// letter's lease runs out (its timer counts down to 00:00:00 on its beat), it stutters and falls backwards, one per
// beat, outside in, each fall opening more gold sky — the sun was hiding behind the O. [40] hangs above them as bone
// light (UPGRADE red, dying, falling out of the line); [39]'s last words and [41]'s first word use the same place.
import React, {useMemo} from 'react';
import {S, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy, SilPancake} from '../../../lib/SilCast';
import {WorldLyric, measureLyric} from '../../../lib/WorldLyric';
import {FogLayers, WetGround} from '../../../lib/atmos';
import {GiantLetters, giantLettersLayout} from '../../../lib/tenure';
import {guyIdle} from '../../../../lib/characters/Guy';
import {pancakeIdle} from '../../../../lib/characters/Pancake';
import {bassAt, clamp01, lerp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, CITY_DARK} from '../City';
import {dyingRed} from '../lyricFx';
import {beatsIn, easeOut} from '../timing';
import {fitEm, halfWidthAt, pitchTarget, pxToM, screenPoint, V3} from '../frame';

const WORD = 'BUY NOW';
const ORDER = [0, 5, 1, 4, 2, 3]; // outside in: B, W, U, O, Y, N
const FALL_BEATS = beatsIn(174.5, 178.6); // one letter per beat
const VIS = 18;
// Chorus1's sign, letter for letter (scenes/Chorus1/ShotBuyNow.tsx)
const CAP = 80; // cap height (m)
const SPACING = 0.14;
const WORDGAP = 0.5;
const TIMER_SIZE = 0.15;
const FIT = 0.8; // the word spans 80 % of the frame width from the mid-shot camera (measured at runtime: font-independent)
const SKY_Z = -1500; // skyline grid centre (well behind the word, which stands ~950 m out)
const REF_Z = 16.7; // mid-shot camera z (sizing reference)
/** explicit rows (font-independent) */
const ROWS: Record<number, number[][]> = {39: [[0, 1, 2, 3, 4], [5, 6, 7, 8]], 40: [[0, 1, 2], [3, 4, 5]], 41: [[0, 1, 2], [3, 4, 5]]};

export const Letters: React.FC<{t: number; f: number; u: number}> = ({t, u}) => {
  const fov = cameraFovForVisible(VIS);
  const camZ = lerp(17.5, 16.0, easeOut(u, 1.5));
  const cam: V3 = [0, 1.1, camZ];
  const target = pitchTarget(cam, 3.6);
  const D = 2000;
  // the word has Chorus1's size in the world; it stands as far out as it takes to span FIT of the frame from the
  // mid-shot camera (so the push-in is real). The skyline opens a lane behind the O so the low sun can show when the O
  // falls.
  const {LZ, gapX, oX, avoid} = useMemo(() => {
    const lay = giantLettersLayout(WORD, {height: CAP, spacing: SPACING, wordGap: WORDGAP});
    const lz = REF_Z - lay.width / (FIT * 2 * halfWidthAt(1, VIS));
    const lt = lay.letters.filter((l) => l.ch !== ' ');
    // the figures stand on the axis: centre the gap between Y's and N's slabs on it
    const gx = (lt[2].x + lt[2].boxW / 2 + lt[3].x - lt[3].boxW / 2) / 2;
    const ox = lt[4].x - gx; // the O (letter index 4)
    // line of sight camera → sun (behind the O) through the skyline grid (grid-local coords, grid at z = SKY_Z)
    const lane: [number, number, number][] = [];
    for (let zl = -220; zl <= 220; zl += 36) lane.push([(ox * (REF_Z - SKY_Z - zl)) / (REF_Z - lz), zl, 42]);
    return {LZ: lz, gapX: gx, oX: ox, avoid: lane};
  }, []);
  const dist = camZ - LZ;
  const fallAt = (slot: number) => FALL_BEATS[Math.min(FALL_BEATS.length - 1, 1 + slot)] ?? 177;
  const bass = bassAt(Math.round(t * 30));
  const perLetter = (i: number) => {
    const slot = ORDER.indexOf(i);
    const t0 = fallAt(slot);
    const pre = clamp01((t - (t0 - 0.75)) / 0.75);
    const fall = clamp01((t - t0) / 1.2);
    // its lease runs out on its beat: the timer counts down to 00:00:00, then the letter falls
    return {on: fall > 0 ? Math.max(0, 1 - fall * 2.4) : 1, flicker: 0.25 + 0.6 * pre, fall, fallDir: -1 as const, intensity: 0.8 + 0.25 * bass,
      timer: Math.max(0, t0 - t)};
  };
  // the sun hides behind the O
  const sunX = ((D + camZ) / dist) * oX;
  // lyric: bone light high in the picture
  const midCam: V3 = [0, 1.1, 16.7];
  const ld = 160;
  const wide = Math.max(...[39, 40, 41].map((l) => measureLyric(l, 1, undefined, {rows: ROWS[l]}).width));
  const em = fitEm(pxToM(64, ld, VIS), wide, 2 * 0.94 * halfWidthAt(ld, VIS));
  // above the slabs (their lease-timer band makes them stand taller than the cap)
  const lp = screenPoint(midCam, pitchTarget(midCam, 3.6), VIS, 0, 0.6, ld);
  return (
    <SilStage fog={{color: fogAt(t), near: 200, far: 3300}} camera={{far: 4000, near: 0.3}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + camZ} eye={cam[1]} position={[0, 0, -D]} sunX={sunX} sunElev={1.4} bandDeg={3.2} />
      <WetGround size={[6000, 6000]} color={S.void} reflectivity={0.78} puddles={0.45} streak={0.7} time={t} seed={7} />
      <Skyline t={t} position={[0, 0, SKY_Z]}
        grid={{rows: 5, cols: 30, spacing: 76, seed: 31, height: [20, 60], footprint: [20, 38], centreBoost: 0.1, avoid, ...CITY_DARK}} />
      <FogLayers count={4} near={30} far={400} width={1400} height={60} color={fogAt(t, 0.45)} density={0.05} time={t} scale={180} position={[0, 0, LZ + 30]} />
      <GiantLetters text={WORD} height={CAP} spacing={SPACING} wordGap={WORDGAP} timers timerSize={TIMER_SIZE} time={t} position={[-gapX, 0, LZ]}
        perLetter={perLetter} intensity={1.6} fog={0.3} />
      {[39, 40, 41].map((line) => (
        <WorldLyric redFill={1} key={line} line={line} rows={ROWS[line]} time={t} mode="light" size={em} intensity={1.0} halo={0.4}
          position={lp} mirror={false} perWord={dyingRed(t, {size: em, dir: -1, seed: line + 3})} />
      ))}
      <SilGuy pose={guyIdle(t, 5)} hood={0} rotation-y={Math.PI} position={[-0.05, 0, 0]} rim={goldRim(t, [0, 1], 0.45)} />
      <SilPancake pose={{...pancakeIdle(t, 2), sit: 1, headPitch: 0.3, tailWag: t * 2.2, tailWagAmount: 0.8}}
        position={[0.5, 0, 0.3]} rotation-y={-Math.PI / 2} rim={goldRim(t, [0, 1], 0.4)} />
    </SilStage>
  );
};
