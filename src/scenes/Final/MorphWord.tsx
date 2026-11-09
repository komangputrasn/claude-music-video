// Chrome WordArt "BUY NOW" that MORPHS into gold "GOOD FOR NOW" on the sung words:
//   goodAt: the B-U-Y letters split-flap away and G-O-O-D flips in (gold), the sign re-centres as it widens
//   forAt:  F-O-R drops in from the sky with a spin, pushing the words apart
//   nowAt:  N-O-W flips from chrome to gold and the whole sign bounces
// Pure: everything is a function of the scene-local frame `f`. Each word is one <ChromeText> (letters animate via perLetter).
import React from 'react';
import type {ThreeElements} from '@react-three/fiber';
import {ChromeText, measureChromeText} from '../../lib/three';
import type {Y2KPreset} from '../../lib/three';
import {popIn, clamp01, lerp} from '../../lib/time';

const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export type MorphWordProps = Omit<ThreeElements['group'], 'children'> & {
  f: number;
  size?: number;
  /** BUY letters pop in from this frame (staggered) */
  appear: number;
  /** NOW letters pop in from this frame */
  appear2?: number;
  goodAt: number;
  forAt: number;
  nowAt: number;
  popStagger?: number;
  flipStagger?: number;
  flipDur?: number;
  matA?: Y2KPreset;
  matB?: Y2KPreset;
  fromZ?: number;
  outline?: number;
  /** keep the sign at most this wide (m) by scaling it down as it grows (undefined = no fit) */
  fitWidth?: number;
};

const GAP = 0.55; // word gap in cap-heights

export const morphWidths = (size: number) => {
  const o = {size, anchor: 'center' as const};
  return {
    buy: measureChromeText('BUY', o).width,
    good: measureChromeText('GOOD', o).width,
    for: measureChromeText('FOR', o).width,
    now: measureChromeText('NOW', o).width,
    gap: GAP * size,
  };
};

/** layout of the three word slots at frame f -> centres x and total width */
export const morphLayout = (p: {f: number; size: number; goodAt: number; forAt: number; flipDur?: number}) => {
  const M = morphWidths(p.size);
  const kGood = easeInOut((p.f - p.goodAt) / ((p.flipDur ?? 8) + 4));
  const kFor = easeInOut((p.f - (p.forAt - 5)) / 8);
  const w1 = lerp(M.buy, M.good, kGood);
  const w2 = M.for * kFor;
  const g2 = M.gap * kFor;
  const total = w1 + M.gap + w2 + g2 + M.now;
  const x1 = -total / 2 + w1 / 2;
  const x2 = -total / 2 + w1 + M.gap + w2 / 2;
  const x3 = total / 2 - M.now / 2;
  return {x1, x2, x3, total, kGood, kFor};
};

export const MorphWord: React.FC<MorphWordProps> = ({
  f, size = 1, appear, appear2, goodAt, forAt, nowAt, popStagger = 1.6, flipStagger = 1.6, flipDur = 8, matA = 'chrome', matB = 'gold', fromZ = 6,
  outline = 0.028, fitWidth, ...group
}) => {
  const L = morphLayout({f, size, goodAt, forAt, flipDur});
  const fit = fitWidth ? Math.min(1, fitWidth / L.total) : 1;
  const ol = {thickness: outline * size, color: '#2a0a20'};
  const ap2 = appear2 ?? appear + 3 * popStagger;
  const pop = (at: number) => (f < at ? 0 : popIn(f, at, 11));
  // flip angle of letter i of a word that flips at `at`: 0 -> PI (front face swaps at PI/2)
  const ang = (at: number, i: number) => easeInOut((f - (at + i * flipStagger)) / flipDur) * Math.PI;
  // whole-sign bounce on the final "now"
  const kb = f - nowAt;
  const bounce = kb < 0 ? 1 : 1 + 0.16 * Math.exp(-kb / 5) * Math.sin(kb * 0.85);
  const forDrop = clamp01((f - (forAt - 3)) / 9);
  const forK = f < forAt - 3 ? 0 : popIn(f, forAt - 3, 12);
  return (
    <group {...group} scale={fit * bounce}>
      {/* slot 1: BUY -> GOOD */}
      <group position={[L.x1, 0, 0]}>
        <ChromeText text="BUY" size={size} anchor="center" material={matA} outline={ol} shine={clamp01((f - appear - 6) / 18)}
          perLetter={(i) => {
            const k = pop(appear + i * popStagger);
            const a = ang(goodAt, i);
            return {
              visible: k > 0.001 && a < Math.PI / 2,
              scale: Math.max(0.001, k),
              position: [0, 0, (1 - Math.min(1, k)) * fromZ],
              rotation: [a + (1 - Math.min(1, k)) * 1.3, 0, 0],
            };
          }} />
        <ChromeText text="GOOD" size={size} anchor="center" material={matB} outline={ol} shine={clamp01((f - goodAt - 6) / 16)}
          perLetter={(i) => {
            const a = ang(goodAt, i);
            return {visible: a >= Math.PI / 2, rotation: [a - Math.PI, 0, 0]};
          }} />
      </group>
      {/* slot 2: FOR drops in */}
      {forK > 0.001 ? (
        <group position={[L.x2, (1 - forDrop) ** 3 * 3 * size, (1 - forDrop) * 0.8 * size]} rotation={[-(1 - forDrop) * 0.9, 0, (1 - forDrop) * 0.4]} scale={Math.max(0.001, forK)}>
          <ChromeText text="FOR" size={size} anchor="center" material={matB} outline={ol} shine={clamp01((f - forAt) / 14)} />
        </group>
      ) : null}
      {/* slot 3: NOW chrome -> gold */}
      <group position={[L.x3, 0, 0]}>
        <ChromeText text="NOW" size={size} anchor="center" material={matA} outline={ol} shine={clamp01((f - ap2 - 6) / 18)}
          perLetter={(i) => {
            const k = pop(ap2 + i * popStagger);
            const a = ang(nowAt - 4, i);
            return {
              visible: k > 0.001 && a < Math.PI / 2,
              scale: Math.max(0.001, k),
              position: [0, 0, (1 - Math.min(1, k)) * fromZ],
              rotation: [a + (1 - Math.min(1, k)) * 1.3, 0, 0],
            };
          }} />
        <ChromeText text="NOW" size={size} anchor="center" material={matB} outline={ol} shine={clamp01((f - nowAt) / 14)}
          perLetter={(i) => {
            const a = ang(nowAt - 4, i);
            return {visible: a >= Math.PI / 2, rotation: [a - Math.PI, 0, 0]};
          }} />
      </group>
    </group>
  );
};
