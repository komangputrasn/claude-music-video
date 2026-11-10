// TERMS — Intro, shot A (song 0–6.85 s, frames 0–205): black → a single red iris clicks open on the first beats,
// extreme close → a long exponential pull-back reveals it as ONE OF THOUSANDS of irises on a city wall at night:
// every iris opens just as it enters the frame (they are all watching); we fly backward over the rooftops of a black
// city whose skyline stands in silhouette against the red field (the wall runs past both frame edges); red-lit mist
// between the rows, the wet avenue mirrors the wall, tiny hooded passers-by cross the avenue.
import React from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {Iris} from '../../lib/Iris';
import {IrisWall, irisWallCell, irisWallSize} from '../../lib/tenure';
import {CityGrid} from '../../lib/sets';
import {Backlight, FogLayers, WetGround} from '../../lib/atmos';
import {bassAt, beatAt, lerp} from '../../../lib/time';
import {ShotProps, Ground, Block, Walkers, Walker, RIM_RED} from './common';
import {IRIS_CLICKS, PULL_FROM, PULL_TO, clamp01, prog, smooth, easeOut} from './timing';

// ---- the wall: 131 × 28 irises (3 650) on a black facade, raised on a 4 m plinth. 393 m wide: at the end of the
// pull-back (360 m) the frame is ~365 m wide, so the iris field runs past both frame edges. The 3 m pitch is not only a
// look: with no motion blur a REGULAR grid aliases (wagon-wheel crawl, the outer field seeming to freeze or run backward)
// once an iris moves more than ~½ its pitch per frame. At 1.5 m the edge irises moved up to 2.8 pitches/frame; at 3 m,
// with the speed-capped pull below, ≤ 0.7 at the very frame edge for a moment (≤ 0.45 over the inner 60%).
const WALL = {cols: 131, rows: 28, spacing: 3};
const WALL_Y = 4;
const HERO: [number, number] = [65, 10]; // centre column (x = 0)
const HERO_POS = irisWallCell(HERO[0], HERO[1], WALL); // local
const HERO_Y = WALL_Y + HERO_POS[1];
const [WALL_W, WALL_H] = irisWallSize(WALL);
const RADIUS = 1.1;

// ---- camera: from 5.4 m (the iris fills the picture) to 360 m
const VIS_FOV = 24;
const FOV = cameraFovForVisible(VIS_FOV);
const D0 = 5.4;
const D1 = 360;
const CAM_Y1 = 3.2;
const TGT_Y1 = 30;
/** half the frame width (m) at distance d */
const halfWidthAt = (d: number) => d * Math.tan((FOV * Math.PI) / 360) * (16 / 9);

/** The pull-back profile: d' = env(t) · min(LAM·d, V). While close it is exponential (a constant-feeling pull, the
 *  hero halving in size every ~0.3 s at most); further out the linear speed is capped at V so the iris grid never
 *  strobes (see WALL). V is solved once so that d reaches D1 exactly on PULL_TO; the table is precomputed (pure). */
const PULL_LAM = 2.2;
const PULL_IN = 0.9; // a gentle start: the focused eye holds a moment on the downbeat before it recedes
const PULL_OUT = 1.0;
const PULL_DT = 1 / 240;
const pullEnv = (t: number) => smooth(prog(t, PULL_FROM, PULL_FROM + PULL_IN)) * smooth(clamp01((PULL_TO - t) / PULL_OUT));
const pullTable = (v: number) => {
  const n = Math.ceil((PULL_TO - PULL_FROM) / PULL_DT);
  const out = new Float64Array(n + 1);
  let d = D0;
  out[0] = d;
  for (let i = 0; i < n; i++) {
    d += pullEnv(PULL_FROM + (i + 0.5) * PULL_DT) * Math.min(PULL_LAM * d, v) * PULL_DT;
    out[i + 1] = d;
  }
  return out;
};
const PULL = (() => {
  let lo = 1;
  let hi = 3000;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const tab = pullTable(mid);
    if (tab[tab.length - 1] < D1) lo = mid;
    else hi = mid;
  }
  return pullTable(hi);
})();
/** camera distance from the wall at song time t */
const pullDist = (t: number) => {
  const x = (t - PULL_FROM) / PULL_DT;
  if (x <= 0) return D0;
  const i = Math.min(PULL.length - 2, Math.floor(x));
  const fr = Math.min(1, x - i);
  return PULL[i] + (PULL[i + 1] - PULL[i]) * fr;
};

/** the black city between us and the wall: a far row of mid-rises and a near row of low blocks, both clear of the
 *  avenue (|x| < ~24) the camera flies back along */
const CITY_FAR = {rows: 2, cols: 9, spacing: 42, height: [12, 30] as [number, number], footprint: [18, 30] as [number, number], jitter: 0.22,
  centreBoost: 0, avoid: [[0, -21, 30], [0, 21, 30]] as [number, number, number][], seed: 4};
const CITY_NEAR = {rows: 3, cols: 11, spacing: 34, height: [3, 8.5] as [number, number], footprint: [14, 24] as [number, number], jitter: 0.22,
  centreBoost: 0, avoid: [[0, -34, 25], [0, 0, 25], [0, 34, 25]] as [number, number, number][], seed: 6};
/** the irises' red light in the night haze (additive mist between the rows of the city) */
const MIST = '#64170F';

// all three inside the red reflection of the avenue (screen x ≈ 770–1160 at 6.3 s, 820–1130 at the end of the pull)
// from their first visible frame; at x −9 the third walked against the black reflection of the left-hand blocks, and at
// x 6.0 the second spent 6.3–6.55 s on the dark reflection of the right-hand blocks (black on black)
const WALKERS: Walker[] = [
  {x0: -2.5, z: 288, dir: 1, t0: 6.4},
  {x0: 4.2, z: 296, dir: -1, t0: 6.4, phase: 0.31},
  {x0: -5.0, z: 281, dir: 1, t0: 6.4, phase: 0.62},
];

export const ShotIris: React.FC<ShotProps> = ({t, f}) => {
  // ---- the hero iris: a standby pinpoint, then three mechanical clicks open on the first three beats
  const pin = smooth(prog(t, 0.75, 1.25));
  const clicks = IRIS_CLICKS.map((c) => easeOut(prog(t, c, c + 0.16)));
  const open = 0.36 * clicks[0] + 0.34 * clicks[1] + 0.3 * clicks[2];
  // it opens wide, then focuses on us (pupil contracts) on the downbeat
  const focus = smooth(prog(t, PULL_FROM, PULL_FROM + 0.45));

  // breathing with the bass (the bass enters at ~4.4 s; before that a whisper of the beat)
  const b = beatAt(t);
  const breath = clamp01(bassAt(f) * 2.4) * 0.85 + 0.2 * b.pulse;

  // ---- pull-back
  const d = pullDist(t);
  const k = (d - D0) / (D1 - D0); // linear-in-distance fraction: keeps the hero centred while close
  const camY = lerp(HERO_Y, CAM_Y1, Math.pow(k, 0.8));
  const tgtY = lerp(HERO_Y, TGT_Y1, Math.pow(k, 0.8));

  // the opening wave: its front rides just inside the frame edges, so every iris opens as it enters the picture,
  // then sweeps the far corners of the wall before the cut
  const R = t < PULL_FROM ? 0 : halfWidthAt(d) * 0.86 + 70 * smooth(prog(t, 5.6, 6.7));
  const waveW = 1.2 + R * 0.22;

  // the wall wakes just before the pull (closed pinpoints), then lifts a little with the bass
  const wallOn = smooth(prog(t, 1.9, 2.5));
  const haze = smooth(prog(t, PULL_FROM + 0.3, 5.5));

  // Red stays RED while the irises are big on screen: an iris ring is up to 1.2× its intensity (× 1.18 per-iris
  // brightness on the wall), and authRed above ~1.1× linear tone-maps coral under ACES (the close-up measured
  // (246, 80, 59); the wall at 3.4 s (246, 90, 66)). So the HDR level stays ≤ ~1.0 while an iris is ≥ ~40 px in radius
  // (until ~3.9 s) and rises to the wide's level once they are small dots (the LOD ring averages ≤ 0.85 there).
  const big = 1 - smooth(clamp01((d - 50) / 90)); // 1 while an iris is ≥ ~40 px in radius, 0 from ~14 px (d ≥ 140 m)
  const heroI = lerp(1.0, 0.82, big);
  const wallI = lerp(1.05, 0.8, big);

  return (
    <>
      <CameraRig position={[0, camY, d]} target={[0, tgtY, 0]} fov={FOV} />

      {/* the wall: a black facade with its 3 650 irises */}
      <Block size={[WALL_W + 120, WALL_Y + WALL_H + 3, 40]} position={[0, 0, -0.3]} color={GREYS.g2} ambient={0.03} />
      <IrisWall
        position={[0, WALL_Y, 0]}
        {...WALL}
        radius={RADIUS}
        time={t}
        intensity={(wallI + 0.25 * breath) * wallOn}
        pupil={0.27 + 0.13 * breath}
        wave={{center: [HERO_POS[0], HERO_POS[1]], start: t - R, speed: 1, width: waveW, mode: 'open'}}
        skip={[HERO]}
        blink={0.04}
        dead={0.03}
        seed={11}
        fog={0.55}
      />
      <Iris
        position={[HERO_POS[0], HERO_Y, 0.02]}
        radius={RADIUS}
        time={t}
        open={open}
        pupil={lerp(0.52, 0.29, focus) + 0.1 * breath * focus}
        intensity={heroI + 0.15 * breath}
        glow={lerp(0.22, 0.08, clamp01(k * 3)) / heroI /* the halo scales with intensity: keep its level */}
        opacity={pin}
      />

      {/* red light of the irises in the night haze in front of the wall */}
      <Backlight color={S.authRed} intensity={0.16 + 0.06 * breath} size={[WALL_W * 1.3, WALL_H * 1.25]} position={[0, WALL_Y + WALL_H * 0.45, 6]} shape="radial" softness={1} noise={0.3} time={t} opacity={haze} />
      {/* city glow in the haze above the wall: the towers' tops and the wall's crown read against it */}
      <Backlight color={S.fog} intensity={0.24} size={[1500, 110]} position={[0, WALL_Y + WALL_H, -60]} shape="radial" softness={1} noise={0.25} time={t} opacity={haze} />

      {/* the black city at the foot of the wall (we fly back over its roofs) */}
      <CityGrid position={[0, 0, 62]} {...CITY_FAR} color={GREYS.g2} glass={GREYS.g0} ambient={0.18} litFraction={0} />
      <CityGrid position={[0, 0, 196]} {...CITY_NEAR} color={GREYS.g2} glass={GREYS.g0} ambient={0.14} litFraction={0} />

      {/* red-lit mist between the wall and the far row, and between the two rows (all behind the passers-by) */}
      <FogLayers position={[0, 0, 44]} near={2} far={38} count={4} width={700} height={34} color={MIST} density={0.26} blending="additive" time={t} drift={[0.8, 0.03]} scale={30} ground={3} fadeNear={25} pulse={0.5 * breath} seed={3} />
      <FogLayers position={[0, 0, 152]} near={2} far={58} count={4} width={600} height={30} color={MIST} density={0.28} blending="additive" time={t} drift={[0.7, 0.02]} scale={22} ground={2} fadeNear={25} pulse={0.5 * breath} seed={5} />

      <Walkers walkers={WALKERS} t={t} rim={RIM_RED} />

      <WetGround size={[1000, 520]} position={[0, 0, 200]} color={GREYS.g1} reflectivity={0.85} puddles={0.5} streak={1} time={t} seed={4} />
      <Ground />
    </>
  );
};
