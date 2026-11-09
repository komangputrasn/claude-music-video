// Chrome WordArt "BUY NOW" that flips (whole sign, or letter-by-letter like a split-flap board) into gold "FOR NOW".
// Both phrases share the same letter slots: FOR NOW letter i sits on the back of BUY NOW letter i (rotated PI about X),
// so a flip of slot i reveals the new letter. Swap visibility at the half-flip (edge-on).
import React from 'react';
import type {ThreeElements} from '@react-three/fiber';
import {ChromeText, measureChromeText} from '../../lib/three';
import type {Y2KPreset} from '../../lib/three';
import {popIn, clamp01} from '../../lib/time';

type V3 = [number, number, number];

const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export type HeroWordProps = Omit<ThreeElements['group'], 'children'> & {
  /** scene-local frame */
  f: number;
  a?: string;
  b?: string;
  size?: number;
  /** frame at which the first letter pops in (letters stagger by `popStagger`) */
  appear: number;
  /** optional separate pop frame for the second word (letters 3..) */
  appear2?: number;
  popStagger?: number;
  /** frame at which slot 0 starts flipping */
  flipAt: number;
  flipStagger?: number;
  flipDur?: number;
  /** extra full spins added to the flip (0 = half turn) */
  spins?: number;
  matA?: Y2KPreset;
  matB?: Y2KPreset;
  /** pops in from this offset (m) */
  fromZ?: number;
  /** frame of the post-flip bounce on the last word ("now") */
  bounceAt?: number;
  outline?: number;
};

export const HeroWord: React.FC<HeroWordProps> = ({
  f, a = 'BUY NOW', b = 'FOR NOW', size = 1, appear, appear2, popStagger = 1.6, flipAt, flipStagger = 0, flipDur = 8, spins = 0, matA = 'chrome', matB = 'gold',
  fromZ = 6, bounceAt, outline = 0.028, ...group
}) => {
  const opts = {size, anchor: 'center' as const};
  const MA = measureChromeText(a, opts);
  const MB = measureChromeText(b, opts);
  const flipOf = (i: number) => easeInOut((f - (flipAt + i * flipStagger)) / flipDur);
  const popAt = (i: number) => (appear2 !== undefined && i >= 3 ? appear2 + (i - 3) * popStagger : appear + i * popStagger);
  const popOf = (i: number) => (f < popAt(i) ? 0 : popIn(f, popAt(i), 11));
  const bounce = (i: number) => {
    if (bounceAt === undefined) return 1;
    const k = f - (bounceAt + (i % 3) * 1.2);
    return k < 0 ? 1 : 1 + 0.22 * Math.exp(-k / 4) * Math.sin(k * 0.9);
  };
  const ol = {thickness: outline * size, color: '#06103a'};
  const angle = (i: number) => flipOf(i) * Math.PI * (1 + 2 * spins);
  return (
    <group {...group}>
      <ChromeText text={a} size={size} anchor="center" material={matA} outline={ol} shine={clamp01((f - appear - 6) / 18)}
        perLetter={(i) => {
          const k = popOf(i);
          return {
            visible: k > 0.001 && Math.cos(angle(i)) >= 0,
            scale: Math.max(0.001, k),
            position: [0, 0, (1 - Math.min(1, k)) * fromZ],
            rotation: [angle(i) + (1 - Math.min(1, k)) * 1.3, 0, 0],
          };
        }} />
      <ChromeText text={b} size={size} anchor="center" material={matB} outline={ol} shine={clamp01((f - flipAt - 6) / 16)}
        perLetter={(i) => {
          const la = MA.letters.filter((l) => l.char !== ' ')[i];
          const lb = MB.letters.filter((l) => l.char !== ' ')[i];
          const dx = la && lb ? la.center[0] - lb.center[0] : 0;
          const s = bounce(i);
          return {visible: Math.cos(angle(i)) < 0, position: [dx, 0, 0], rotation: [angle(i) - Math.PI, 0, 0], scale: s};
        }} />
    </group>
  );
};

/** world-ish helper: letter slot centres of the phrase (for sparkles / flares) */
export const heroSlots = (text: string, size: number): V3[] =>
  measureChromeText(text, {size, anchor: 'center'}).letters.filter((l) => l.char !== ' ').map((l) => l.center as V3);
