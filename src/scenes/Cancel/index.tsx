// Cancel (frames 4126–4678, 137.53–155.95 s), lyric lines [32]–[35].
// A: "They passed 'Click to Cancel'" — a glossy aqua CLICK TO CANCEL monument rises, PASSED! + confetti.
// B: "and a court said no" — a giant gavel smashes it; DENIED.
// C: "page after page with nowhere to go" — flight down an endless corridor of cancel pages (signature 1).
// D: "Amazon named its cancel page" — OmniStore logo, Page Properties dialog typing I-L-I-A-D on the beats.
// E: "'Iliad', the most honest name that a cancel page had" — the ILIAD temple of web UI at sunset (signature 2).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../../lib/three';
import {useSongTime} from '../../lib/time';
import {SHOT} from './times';
import {ShotA1, ShotA2, ShotA3, ShotB1, ShotB2, ShotB2b} from './Plaza';
import {ShotC1, ShotC2, FOG, CORRIDOR_BLOOM} from './Corridor';
import {ShotE1, ShotE2, ShotE3} from './Temple';
import {ShotD} from './Naming';
import {Overlay2D} from './Overlays2D';

export const Cancel: React.FC = () => {
  const f = useCurrentFrame();
  const t = useSongTime();
  let body: React.ReactNode = null;
  let stage: {bg: string; env: 'sky' | 'chrome' | 'sunset'} = {bg: '#4aa3ff', env: 'sky'};
  if (f < SHOT.A2) body = <ShotA1 f={f} t={t} />;
  else if (f < SHOT.A3) body = <ShotA2 f={f} t={t} />;
  else if (f < SHOT.B1) body = <ShotA3 f={f} t={t} />;
  else if (f < SHOT.B2) body = <ShotB1 f={f} t={t} />;
  else if (f < SHOT.B2b) body = <ShotB2 f={f} t={t} />;
  else if (f < SHOT.C1) body = <ShotB2b f={f} t={t} />;
  else if (f < SHOT.C2) body = <ShotC1 f={f} t={t} />;
  else if (f < SHOT.D1) body = <ShotC2 f={f} t={t} />;
  else if (f < SHOT.E1) body = <ShotD f={f} t={t} />;
  else if (f < SHOT.E2) body = <ShotE1 f={f} t={t} />;
  else if (f < SHOT.E3) body = <ShotE2 f={f} t={t} />;
  else body = <ShotE3 f={f} t={t} />;
  const corridor = f >= SHOT.C1 && f < SHOT.D1;
  if (corridor) stage = {bg: FOG.color, env: 'chrome'};
  if (f >= SHOT.D1 && f < SHOT.E1) stage = {bg: '#2a0f6a', env: 'chrome'};
  if (f >= SHOT.E1) stage = {bg: '#2a1030', env: 'sunset'};
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Stage background={stage.bg} env={stage.env} fog={corridor ? FOG : null} bloom={corridor ? CORRIDOR_BLOOM : {}}>
        {body}
      </Stage>
      <Overlay2D f={f} />
    </AbsoluteFill>
  );
};
