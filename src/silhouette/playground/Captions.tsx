// Caption + letterbox check over a flat grey picture (no 3D). Frames map to song times listed in TIMES.
//   node scripts/still.mjs silplay Captions --frames=0,1,2,3,4,5
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {S} from '../lib/palette';
import {Letterbox, SilCaptions} from '../overlays/SilOverlays';

export const duration = 8;
// longest lines, a red-word line, a final gold line, the hold whisper
const TIMES = [25.6, 29.5, 41.9, 151.5, 172.5, 191.8, 164.5, 190.2];

export default function Captions() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `linear-gradient(${S.fog}, ${S.ash})`}}>
      <Letterbox />
      <SilCaptions time={TIMES[f] ?? 30} />
    </AbsoluteFill>
  );
}
