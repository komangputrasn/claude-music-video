// 2D Y2K error dialog that explains WHY the car leaves (sound-off story): it pops on "car" (the car wakes up by itself)
// and is dismissed when the car is gone. Top band only (captions own the bottom 230 px).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Dialog} from '../../lib/ui';
import {popIn, ramp} from '../../lib/time';

export const RETURN_SPEC = {
  kind: 'error' as const,
  title: 'MOTORCO DriveLink',
  heading: 'Lease payment late (0 min 01 s)',
  message: 'Your vehicle is returning to the dealer.\nThank you for driving MOTORCO!',
  buttons: ['OK'],
  width: 440,
};

export const GasDialog: React.FC<{f: number; start: number; end: number}> = ({f, start, end}) => {
  if (f < start || f >= end) return null;
  const k = popIn(f, start, 9);
  const out = ramp(f, end - 6, end, (x) => x * x);
  const shake = f - start < 10 ? Math.sin((f - start) * 2.4) * (10 - (f - start)) * 0.9 : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Dialog {...RETURN_SPEC} x={1180 + shake + out * 900} y={84} scale={1.55 * k} rotate={-2 + out * 8} origin="50% 50%" sheen={ramp(f, start + 4, start + 20, (x) => x)} />
    </AbsoluteFill>
  );
};
