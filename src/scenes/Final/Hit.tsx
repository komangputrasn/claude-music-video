// A gentle accent flash for in-shot hits on words/beats. Unlike CutEffect 'flash' (backdrop brightness + white wash, made for
// scene cuts) it never clips the bright sunrise palette: a screen-blended radial tint plus a thin anamorphic streak.
import React from 'react';
import {AbsoluteFill} from 'remotion';

export type HitProps = {
  /** frames since the hit (peak at 0, 1-frame pre-glow at -1) */
  k: number;
  tint?: string;
  streak?: string;
  /** 0..1 (0.3 = a clear accent) */
  strength?: number;
  /** centre of the tint, px */
  x?: number;
  y?: number;
  seed?: number;
};

export const Hit: React.FC<HitProps> = ({k, tint = '#FFF6E0', streak = '#FFD24A', strength = 0.3, x = 960, y = 470}) => {
  const env = k < -1 ? 0 : k < 0 ? 0.45 : Math.exp(-k / 2.6);
  const e = env * strength;
  if (e < 0.004 || k > 14) return null;
  const a = Math.min(0.55, e * 1.15);
  const s = Math.min(1, e * 2.2);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{mixBlendMode: 'screen', opacity: a, background: `radial-gradient(ellipse 60% 55% at ${x}px ${y}px, ${tint} 0%, ${tint}aa 40%, ${tint}00 100%)`}}
      />
      <div
        style={{
          position: 'absolute', left: -200, width: 2320, top: y - 4, height: 8, opacity: s, mixBlendMode: 'screen', borderRadius: 4,
          background: `linear-gradient(90deg, ${streak}00 0%, ${streak}cc 30%, #FFFFFF 50%, ${streak}cc 70%, ${streak}00 100%)`,
          boxShadow: `0 0 22px 8px ${streak}66`,
          transform: `scaleY(${(1 + Math.max(0, k) * 0.35).toFixed(3)})`,
        }}
      />
    </AbsoluteFill>
  );
};
