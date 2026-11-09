// S3 · THE LETTERS FALL (174.10–178.47) — low, wide, symmetrical. TENURE's 30-storey red "BUY NOW" stands across the
// plain against the dawn; the man and the dog stand small in the word gap. On the beats the letters stutter and fall
// backwards one by one (outside in), each fall opening more gold sky — the sun was hiding behind the O. [40] hangs
// above them as bone light (UPGRADE red, dying, falling out of the line); [39]'s last words and [41]'s first word use
// the same place.
import React, {useMemo} from 'react';
import {S, cameraFovForVisible} from '../../../lib/palette';
import {SilStage, CameraRig} from '../../../lib/SilStage';
import {SilGuy, SilPancake} from '../../../lib/SilCast';
import {FinalLyric} from '../FinalLyric';
import {FogLayers, WetGround} from '../../../lib/atmos';
import {GiantLetters, giantLettersLayout} from '../../../lib/tenure';
import {guyIdle} from '../../../../lib/characters/Guy';
import {pancakeIdle} from '../../../../lib/characters/Pancake';
import {bassAt, clamp01, lerp} from '../../../../lib/time';
import {DawnSky, fogAt, goldRim} from '../Dawn';
import {Skyline, CITY_DARK} from '../City';
import {dyingRed} from '../lyricFx';
import {beatsIn, easeOut} from '../timing';
import {pitchTarget, pxToM, screenPoint, V3} from '../frame';

const WORD = 'BUY NOW';
const ORDER = [0, 5, 1, 4, 2, 3]; // outside in: B, W, U, O, Y, N
const FALL_BEATS = beatsIn(174.5, 178.6); // one letter per beat
const VIS = 18;
const GAP = 1.0; // word gap (× cap height): the figures stand in it
const LZ = -230; // the giant word's plane
const SKY_Z = -1150; // skyline grid centre
const REF_Z = 16.7; // mid-shot camera z (sizing reference)

export const Letters: React.FC<{t: number; f: number; u: number}> = ({t, u}) => {
  const fov = cameraFovForVisible(VIS);
  const camZ = lerp(17.5, 16.0, easeOut(u, 1.5));
  const cam: V3 = [0, 1.1, camZ];
  const target = pitchTarget(cam, 3.6);
  const D = 2000;
  const dist = camZ - LZ;
  // the word is sized ONCE (fits ~84 % of the frame width from the mid-shot camera) and stays fixed in the world, so
  // the push-in is real; the skyline opens a lane behind the O so the low sun can show when the O falls
  const {H, gapX, oX, avoid} = useMemo(() => {
    const frameW = 2 * (REF_Z - LZ) * Math.tan((cameraFovForVisible(VIS) * Math.PI) / 360) * (16 / 9);
    const unit = giantLettersLayout(WORD, {height: 1, wordGap: GAP});
    const h = (0.84 * frameW) / unit.width;
    const lay = giantLettersLayout(WORD, {height: h, wordGap: GAP});
    const space = lay.letters.find((l) => l.ch === ' ');
    const gx = space ? space.x : 0;
    const lt = lay.letters.filter((l) => l.ch !== ' ');
    const ox = (lt[4]?.x ?? 0) - gx; // the O (letter index 4)
    // line of sight camera → sun (behind the O) through the skyline grid (grid-local coords, grid at z = SKY_Z)
    const lane: [number, number, number][] = [];
    for (let zl = -220; zl <= 220; zl += 36) lane.push([(ox * (REF_Z - SKY_Z - zl)) / (REF_Z - LZ), zl, 42]);
    return {H: h, gapX: gx, oX: ox, avoid: lane};
  }, []);
  const fallAt = (slot: number) => FALL_BEATS[Math.min(FALL_BEATS.length - 1, 1 + slot)] ?? 177;
  const bass = bassAt(Math.round(t * 30));
  const perLetter = (i: number) => {
    const slot = ORDER.indexOf(i);
    const t0 = fallAt(slot);
    const pre = clamp01((t - (t0 - 0.75)) / 0.75);
    const fall = clamp01((t - t0) / 1.2);
    return {on: fall > 0 ? Math.max(0, 1 - fall * 2.4) : 1, flicker: 0.25 + 0.6 * pre, fall, fallDir: -1 as const, intensity: 0.8 + 0.25 * bass};
  };
  // the sun hides behind the O
  const sunX = ((D + camZ) / dist) * oX;
  // lyric: bone light high in the picture
  const midCam: V3 = [0, 1.1, 16.7];
  const ld = 160;
  const em = pxToM(64, ld, VIS);
  const lp = screenPoint(midCam, pitchTarget(midCam, 3.6), VIS, 0, 0.52, ld);
  return (
    <SilStage fog={{color: fogAt(t), near: 200, far: 3300}} camera={{far: 4000, near: 0.3}}>
      <CameraRig position={cam} target={target} fov={fov} />
      <DawnSky t={t} distance={D + camZ} eye={cam[1]} position={[0, 0, -D]} sunX={sunX} sunElev={1.4} bandDeg={3.2} />
      <WetGround size={[6000, 6000]} color={S.void} reflectivity={0.78} puddles={0.45} streak={0.7} time={t} seed={7} />
      <Skyline t={t} position={[0, 0, SKY_Z]}
        grid={{rows: 5, cols: 30, spacing: 76, seed: 31, height: [20, 60], footprint: [20, 38], centreBoost: 0.1, avoid, ...CITY_DARK}} />
      <FogLayers count={4} near={30} far={400} width={1400} height={60} color={fogAt(t, 0.45)} density={0.05} time={t} scale={180} position={[0, 0, LZ + 30]} />
      <GiantLetters text={WORD} height={H} wordGap={GAP} time={t} position={[-gapX, 0, LZ]} perLetter={perLetter} intensity={1.6} fog={0.3} />
      {[39, 40, 41].map((line) => (
        <FinalLyric key={line} line={line} time={t} mode="light" size={em} maxWidth={em * 15} intensity={1.0} halo={0.4}
          position={lp} mirror={false} perWord={dyingRed(t, {size: em, dir: -1, seed: line + 3})} />
      ))}
      <SilGuy pose={guyIdle(t, 5)} hood={0} rotation-y={Math.PI} position={[-0.3, 0, 0]} rim={goldRim(t, [0, 1], 0.45)} />
      <SilPancake pose={{...pancakeIdle(t, 2), sit: 1, headPitch: 0.3, tailWag: t * 2.2, tailWagAmount: 0.8}}
        position={[0.4, 0, 0.3]} rotation-y={-Math.PI / 2} rim={goldRim(t, [0, 1], 0.4)} />
    </SilStage>
  );
};
