/**
 * <GlobalOverlays/> — song-wide overlays rendered above every scene by src/Layout.tsx.
 *   1. <CutFlash/>  scene-cut transitions at every SCENES boundary (flash / RGB glitch / VHS tracking)
 *   2. <Captions/>  karaoke lyric captions (always on top)
 * The camcorder HUD is NOT global — scenes render <CamcorderHUD/> themselves.
 *
 * Usage (Layout already does this): <GlobalOverlays />
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CutFlash} from './CutFlash';
import {Captions} from './Captions';

export const GlobalOverlays: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <CutFlash />
    <Captions />
  </AbsoluteFill>
);
