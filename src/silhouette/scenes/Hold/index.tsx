// TERMS (silhouette cut) — Hold, frames 4678–4992 (song 155.93–166.40 s). Bridge: hold music, then the voice.
// The quietest scene, ONE take: a black ocean, the hold music as thin red waveforms in the fog, a building-sized pillow
// hanging over the horizon with TENURE's eye closed in it, and him on the water, small, phone at his ear. On "stopped"
// every light dies but the eye's red seam; in the near-silence the eye opens fully, its red light runs down the sea to
// him, and it asks one small line of bone: "IS THAT YOU?". Lyrics [36]–[37] live in the world (<WorldLyric>).
// Shot list + sync points: ./NOTES.md.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, GREYS} from '../../lib/palette';
import {SilStage} from '../../lib/SilStage';
import {useSongTime, useAbsoluteFrame} from '../../../lib/time';
import {ShotHold} from './ShotHold';
import {lit} from './timing';

const FOG_LIT = {color: GREYS.g1, near: 70, far: 520};
const FOG_DARK = {color: S.void, near: 70, far: 520};

export const Hold: React.FC = () => {
  const t = useSongTime();
  const f = useAbsoluteFrame();
  return (
    <AbsoluteFill style={{background: S.void}}>
      <SilStage fog={lit(t) ? FOG_LIT : FOG_DARK} camera={{near: 0.5, far: 3000}}>
        <ShotHold t={t} f={f} />
      </SilStage>
    </AbsoluteFill>
  );
};
