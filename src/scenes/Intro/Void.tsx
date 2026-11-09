/**
 * The Y2K void the CRT floats in: deep-blue gradient dome with a glowing horizon band, a static star shell,
 * a neon wire-grid floor far below, slow sparkles, floating chrome "$ @ + %" glyphs, and an optional sunburst.
 * `fade` 0..1 brings everything up from black (the Intro starts black). Shared by the Outro end card.
 */
import React from 'react';
import {SkyDome, Starfield, WireGrid, SparkleField, Sunburst} from '../../lib/three/fx';
import {ChromeText} from '../../lib/three';
import {noise1} from '../../lib/time';

const STOPS: [number, string][] = [
  [-1, '#000004'], [-0.32, '#02041a'], [-0.06, '#0a1460'], [0.0, '#3a64ff'], [0.035, '#1a2a9a'], [0.22, '#070d44'], [0.6, '#020522'], [1, '#000008'],
];

export const VoidBackdrop: React.FC<{t: number; fade?: number; grid?: number; burst?: number; gridY?: number; stars?: number; glyphs?: number; sky?: number}> = ({
  t, fade = 1, grid = 1, burst = 0, gridY = -1.25, stars = 1, glyphs = 1, sky = 1,
}) => {
  return (
    <>
      <SkyDome stops={STOPS} brightness={fade * sky} radius={150} />
      <Starfield shell={110} count={1400} size={0.22} time={t} intensity={1.5 * fade * stars} twinkle={0.5} seed={11} />
      {grid > 0 ? (
        <WireGrid position={[0, gridY, 0]} offset={t * 0.8} cell={0.7} line={0.03} color="#19C6FF" fill="#03072a" horizon="#2a3cff"
          glow={1.5 * fade * grid} fadeNear={1.5} fadeFar={26} major={5} size={90} />
      ) : null}
      {burst > 0 ? (
        <Sunburst position={[0, 0.4, -6]} radius={9} rays={22} rotation2d={t * 0.18} colorA="#1a3aff" colorB="#050c48" center="#8fd0ff"
          glow={0.35 * burst} opacity={0.85 * burst * fade} softness={0.5} />
      ) : null}
      <SparkleField count={34} seed={5} area={[9, 4.5, 4]} position={[0, 0.6, -2.4]} time={t} size={0.2} intensity={2.2 * fade} speed={0.5} />
      {glyphs > 0 ? <Glyphs t={t} k={fade * glyphs} /> : null}
    </>
  );
};

const GLYPHS: {ch: string; mat: 'gold' | 'aqua' | 'candy' | 'chrome' | 'iridescent'; r: number; y: number; ph: number; sp: number; size: number}[] = [
  {ch: '$', mat: 'gold', r: 3.2, y: -0.3, ph: 0.9, sp: 0.16, size: 0.34},
  {ch: '@', mat: 'aqua', r: 3.4, y: -0.55, ph: 2.7, sp: 0.13, size: 0.32},
  {ch: '+', mat: 'candy', r: 3.0, y: -0.05, ph: 4.3, sp: 0.15, size: 0.3},
];

const Glyphs: React.FC<{t: number; k: number}> = ({t, k}) => (
  <>
    {GLYPHS.map((G, i) => {
      const a = G.ph + t * G.sp;
      // orbit behind the TV (z mostly negative)
      const x = Math.sin(a) * G.r;
      const z = -2.4 - Math.cos(a) * 1.0;
      const y = G.y + 0.12 * noise1(t * 0.4, 70 + i);
      return (
        <ChromeText key={G.ch} text={G.ch} material={G.mat} size={G.size} anchor="center" position={[x, y, z]}
          rotation={[0.2 * Math.sin(t * 0.7 + i), t * 0.9 + i, 0.15 * Math.cos(t * 0.5 + i)]} brightness={0.85 * k} opacity={Math.min(1, k)} iriPhase={t * 0.3} />
      );
    })}
  </>
);
