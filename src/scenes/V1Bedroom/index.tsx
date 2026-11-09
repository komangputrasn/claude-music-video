/**
 * V1Bedroom — verse 1a (song 12.38–30.0 s, lyric lines 0–3). 3:15 AM, moonlit Y2K bedroom.
 *   wide (camcorder) -> bed catapults him upright on "sat me up" -> groggy face -> LED clock fisheye "quarter past three"
 *   -> pillow glows & talks -> 3D pop-up "SLEEP HAS A FEE" -> macro: padlocked ink cartridges at 100% -> blank page stalls
 *   ("won't print a line") -> INKSURE+ remote shutdown -> card into the printer's PAY HERE slot -> spat out, CARD DECLINED
 *   error-window trail. Shot list + timings in ./timing.ts. Cameras & poses in ./shots.tsx.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../../lib/three';
import {C} from '../../lib/palette';
import {shotAt} from './timing';
import {ShotScene} from './shots';
import {Overlay2D} from './overlay';

export const V1Bedroom: React.FC = () => {
  const f = useCurrentFrame();
  const shot = shotAt(f);
  return (
    <AbsoluteFill style={{background: C.night}}>
      <Stage background={C.night} env="night" camera={{near: 0.02, far: 80, fov: 45}} lens={{aberration: 0.0018, vignette: 0.42, grain: 0.04}}>
        <ShotScene f={f} shot={shot.id} />
      </Stage>
      <Overlay2D f={f} shot={shot.id} />
    </AbsoluteFill>
  );
};
