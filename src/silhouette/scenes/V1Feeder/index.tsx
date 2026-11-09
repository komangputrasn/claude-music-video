// TERMS (silhouette cut) — V1Feeder. PLACEHOLDER: replace with the scene (DESIGN-silhouette.md §4, src/silhouette/INDEX.md).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {S, SFONTS} from '../../lib/palette';

export const V1Feeder: React.FC = () => (
  <AbsoluteFill style={{background: S.void, alignItems: 'center', justifyContent: 'center'}}>
    <div style={{fontFamily: SFONTS.futura, color: S.fog, fontSize: 40, letterSpacing: '0.3em'}}>V1FEEDER · TODO</div>
  </AbsoluteFill>
);
