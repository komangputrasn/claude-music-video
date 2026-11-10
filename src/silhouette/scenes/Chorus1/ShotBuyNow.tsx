// Chorus1 · shot A — 57.75 → 61.56 (the chorus slam). Line 12: "You said 'Buy now,' but you meant 'for now,'"
// "BUY NOW" in 30-storey red letters at the far end of a wet black plaza, a crowd of identical silhouettes facing it
// (black against the letters' red reflection in the wet paving), towers with terms scrolling up their faces framing it.
// The sung line is projected into the haze above the sign. On "for" (60.70) the lease timers under every letter drop
// from 23:59:59 to seconds and race down.
import React, {useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {Crowd} from '../../lib/Crowd';
import {WorldLyric, metresForPx} from '../../lib/WorldLyric';
import {Backlight, WetGround} from '../../lib/atmos';
import {GiantLetters, giantLettersLayout, TermsScroll, LeaseTags, leaseTagBox, mergeTagSets} from '../../lib/tenure';
import {Megablock} from '../../lib/sets';
import {bassAt, lerp} from '../../../lib/time';
import {wordTime} from '../../../lib/lyrics';
import {guyIdle} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeOut, flashAfter, RIM_BONE} from './common';

export const SHOT_A = {t0: 57.75, t1: 61.56};
export const FOG_A = {color: S.ash, near: 180, far: 1900};

const LZ = -520; // letters plane
const LH = 80; // cap height (with slab + timer band the letters stand ~30 storeys)
const SPACING = 0.14;
const WORDGAP = 0.5;
const VIS = 24; // visible (letterboxed) vertical fov
const TAN = Math.tan((VIS * Math.PI) / 360);
const ASPECT = 1920 / 804;
const ROWS12 = [[0, 1, 2, 3], [4, 5, 6, 7, 8]];

export const ShotBuyNow: React.FC<ShotProps> = ({t, f}) => {
  const u = prog(t, SHOT_A.t0, SHOT_A.t1);
  const e = easeOut(u);
  const bass = bassAt(f);
  const tBuy = wordTime(12, 'buy');
  const tNow = wordTime(12, 'now');
  const tFor = wordTime(12, 'for');
  // fit the word to ~80% of the frame width (font metrics differ per machine, so measure at runtime)
  const W = useMemo(() => giantLettersLayout('BUY NOW', {height: LH, spacing: SPACING, wordGap: WORDGAP}).width, []);
  const D = W / (0.8 * 2 * TAN * ASPECT); // camera → letters at the end of the dolly
  const camZ = LZ + D * lerp(1.045, 1.0, e);
  const half = D * TAN; // visible half-height (m) at the letters' plane
  const Yc = 0.3 * half; // letters' base sits at ndc -0.3
  const towerW = 0.12 * W;
  const towerX = 0.5 * W + 0.1 * W + towerW / 2;
  const towerH = 2.4 * half;
  const crowdZ = LZ + D - 128;
  const em = metresForPx(62, D, cameraFovForVisible(VIS));
  const tags = useMemo(
    () =>
      mergeTagSets(
        leaseTagBox({width: towerW, depth: towerW * 0.7, height: towerH, density: 0.06, seed: 11, x: -towerX, z: LZ - 60}),
        leaseTagBox({width: towerW, depth: towerW * 0.7, height: towerH, density: 0.06, seed: 12, x: towerX, z: LZ - 60}),
      ),
    [towerW, towerH, towerX],
  );
  return (
    <>
      <CameraRig position={[0, 5.5, camZ]} target={[0, Yc, LZ]} fov={cameraFovForVisible(VIS)} />
      <WetGround size={[5000, 5000]} position={[0, 0, LZ + D * 0.5]} reflectivity={0.85} puddles={0.55} streak={1} time={t} color={GREYS.g1} />
      {/* night haze: a bright band of lit fog at the sign's feet fading up into a dark sky */}
      <Backlight position={[0, 0.1 * half, LZ - 90]} size={[3.2 * W, 0.95 * half]} shape="radial" softness={1} intensity={0.6} noise={0.2} time={t} />
      <Backlight position={[0, 0.7 * half, LZ - 200]} size={[3.5 * W, 2.2 * half]} shape="radial" softness={1} intensity={0.12} noise={0.25} time={t} />
      {/* the line, projected on the cloud deck above the sign (a faint lit patch of haze behind it) */}
      <Backlight position={[0, Yc + 0.6 * half, LZ + 12]} size={[0.75 * W, 0.4 * half]} shape="radial" softness={1} intensity={0.1} noise={0.35} time={t} />
      <WorldLyric line={12} time={t} size={em} rows={ROWS12} anchor="baseline" position={[0, Yc + 0.66 * half, LZ + 30]} until={SHOT_A.t1 + 0.05} />
      {/* BUY NOW: lit from the slam; each word flares when sung; on "for" the leases start running out */}
      <GiantLetters
        text="BUY NOW"
        position={[0, 0, LZ]}
        height={LH}
        spacing={SPACING}
        wordGap={WORDGAP}
        time={t}
        timers
        timerSize={0.15}
        intensity={1.3}
        perLetter={(i) => {
          const w = i < 3 ? tBuy : tNow;
          const flash = flashAfter(t, w, 5);
          const after = t >= tFor;
          const timer = after ? Math.max(0, 7 + ((i * 5) % 6) - (t - tFor) * 3.2) : 86399 - Math.floor(t - SHOT_A.t0) - i * 37;
          return {intensity: (after ? 0.9 : 1) * (1 + 0.28 * flash) * (1 + 0.14 * bass), timer};
        }}
      />
      {/* towers framing the sign, terms scrolling up their faces, every one of them tagged */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Megablock w={towerW} h={towerH} d={towerW * 0.7} seed={s > 0 ? 7 : 3} position={[s * towerX, 0, LZ - 60]} litFraction={0.012} ambient={0.14} color={GREYS.g3} />
          <TermsScroll position={[s * towerX, 0.15 * half, LZ - 60 + towerW * 0.35 + 0.8]} width={towerW * 0.84} height={towerH * 0.8} fontSize={towerW / 26} speed={3} time={t} seed={s > 0 ? 5 : 2} intensity={0.5} />
        </group>
      ))}
      <LeaseTags positions={tags.positions} facing={tags.facing} size={3} time={t} intensity={1.5} minPx={1.6} flicker={0.15} seed={9} />
      {/* the crowd, standing still, facing the sign; the Guy at its front on the axis */}
      <Crowd count={360} seed={4} area={[170, 60]} spacing={2.4} position={[0, 0, crowdZ]} facing={Math.PI} facingJitter={0.08} sway={0.5} time={t}
        exclude={[[0, 28, 2.4]]} rim={{color: S.authRed, strength: 0.55, power: 6, dir: [0, 1]}} />
      <SilGuy pose={guyIdle(t, 2)} rotation-y={Math.PI} position={[0, 0, crowdZ + 34]} rim={RIM_BONE} />
    </>
  );
};
