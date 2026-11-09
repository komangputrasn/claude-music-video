// TERMS (silhouette cut) — Hold. PLACEHOLDER: replace with the scene (DESIGN-silhouette.md §4, src/silhouette/INDEX.md).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, SFONTS} from '../../lib/palette';

export const Hold: React.FC = () => (
  <AbsoluteFill style={{background: S.void, alignItems: 'center', justifyContent: 'center'}}>
    <div style={{fontFamily: SFONTS.futura, color: S.fog, fontSize: 40, letterSpacing: '0.3em'}}>HOLD · TODO</div>
  </AbsoluteFill>
);
