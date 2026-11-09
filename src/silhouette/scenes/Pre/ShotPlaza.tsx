// Pre · shot 2 — PLAZA, 50.33 → 57.73 (abs 1510–1731). Lines 9, 10, 11 + the red whiteout into the chorus.
// He walks out alone up the axis of an enormous plaza at night. Everything is tagged: a red lease tag on every paving
// slab, on every bollard, bench and floodlight mast, and on every facade around. A red tracking pool follows him.
// The camera starts close and steep behind him and, from "How hard", cranes up and back, accelerating, until he is a
// speck and then nothing in a city of glowing tags; the light builds into a red whiteout by the chorus (57.75).
// The lines lie on the paving ahead of him as projected light, each line further up the axis and larger, sized for
// the camera at the time it is sung (crane.ts): [9] near him, [10] beyond it, [11] in letters taller than he is.
// When a line is over, its words flicker out and the patch of paving under them lights up with tags: the words
// dissolve into the sea of lease tags.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {S, GREYS} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric, measureLyric, WordInfo} from '../../lib/WorldLyric';
import {LightPool} from '../../lib/atmos';
import {TenureScreen, LeaseTags, leaseTagBox, mergeTagSets, TagSet} from '../../lib/tenure';
import {Plaza, PLAZA_SPOTS, Megablock, CityGrid, cityGridLayout} from '../../lib/sets';
import {bassAt, rand} from '../../../lib/time';
import {guyWalk} from '../../../lib/characters/Guy';
import {BoxRow, ShotProps, V3, prog, smooth} from './common';
import {crane, CAM_FOV, heZ} from './crane';
import {W} from './timing';

export const FOG_PLAZA = {color: S.ash, near: 160, far: 2400};

// ------------------------------------------------------------------------------------------------ layout
const PLAZA_SIZE: [number, number] = [180, 200];
const CITY = {rows: 17, cols: 17, spacing: 62, seed: 11, height: [40, 170] as [number, number], footprint: [22, 40] as [number, number], litFraction: 0.01};
const CITY_AVOID: [number, number, number][] = [[0, 0, 150], [0, -130, 90]];
const TOWERS: {pos: V3; rotY: number}[] = [
  ...PLAZA_SPOTS.towersLeft.map((p) => ({pos: p, rotY: PLAZA_SPOTS.towersLeftRotY})),
  ...PLAZA_SPOTS.towersRight.map((p) => ({pos: p, rotY: PLAZA_SPOTS.towersRightRotY})),
];
const TOWER = {w: 32, h: 110, d: 24};

/** lyric blocks on the paving (centre z, em, depth stretch k) — solved against crane() so each block sits in the
 *  upper part of the frame while it is sung, above him, its cap height ≥ ~38–42 px the whole time (largest at its
 *  first word). k stretches the letters along the axis like road markings (anamorphic for the oblique camera). */
const BLOCKS = [
  {line: 9, z: 42.9, em: 1.3, k: 1.5, rows: 2, end: W.how},
  {line: 10, z: 38.2, em: 2.49, k: 1.35, rows: 3, end: W.in},
  {line: 11, z: 27.0, em: 7.02, k: 1.22, rows: 3, end: 56.75},
] as const;
const DISSOLVE = 0.5; // s: words flicker out, tags light up under them
const BOLLARD: V3 = [0.34, 1.0, 0.34];
const BENCH: V3 = [3.4, 0.46, 0.8];

/** The lines are light projected onto the plaza from above: they land on whatever stands in them. Drawn without depth
 *  test, so the 14 m floodlight masts (and bollards) standing inside the big [10]/[11] blocks no longer cut black bars
 *  through the letters. */
const ProjectedLyric: React.FC<React.ComponentProps<typeof WorldLyric>> = (props) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && m.depthTest) {
        m.depthTest = false;
        m.needsUpdate = true;
      }
    });
  });
  return (
    <group ref={ref}>
      <WorldLyric {...props} />
    </group>
  );
};

/** The walker is drawn LAST (after the additive lyric light, tags and his red pool's haze), so he stays a pure black
 *  figure even where the lines' light reaches him. SilGuy at opacity 0.999 joins the transparent pass (depthWrite on);
 *  every node gets renderOrder 10 (three's groupOrder is taken from the innermost group). */
const OnTop: React.FC<{children: React.ReactNode}> = ({children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      o.renderOrder = 10;
    });
  });
  return <group ref={ref}>{children}</group>;
};

/** flat tag positions in the ground group's local frame (rotation-x -π/2: world (x, y, z) = local (x, z, -y)) */
const groundLocal = (pts: [number, number][], lift = 0.03) => {
  const a = new Float32Array(pts.length * 3);
  pts.forEach(([x, z], i) => {
    a[i * 3] = x;
    a[i * 3 + 1] = -z;
    a[i * 3 + 2] = lift;
  });
  return a;
};

export const ShotPlaza: React.FC<ShotProps> = ({t, abs}) => {
  const cam = crane(t);
  const bass = bassAt(abs);
  const he = heZ(t);
  const build = smooth(prog(t, 53.2, 57.6)); // the light builds toward the chorus

  // ---- static sets (memoised) ------------------------------------------------------------------------------------
  const bollards = useMemo(() => {
    const out: V3[] = [];
    for (let z = 96; z > -60; z -= 5) for (const x of [-8.5, 8.5]) out.push([x, 0, z]);
    return out;
  }, []);
  const benches = useMemo(() => {
    const out: V3[] = [];
    for (let z = 88; z > -58; z -= 14) for (const x of [-24, 24, -42, 42]) out.push([x, 0, z + (Math.abs(x) > 30 ? 7 : 0)]);
    return out;
  }, []);
  // vertical tags on objects (bollards, masts) facing the camera side (+Z)
  const objectTags = useMemo<TagSet>(() => {
    const pos: number[] = [];
    bollards.forEach(([x, , z]) => pos.push(x, 0.72, z + 0.17));
    PLAZA_SPOTS.masts.forEach(([x, , z]) => pos.push(x, 2.6, z + 0.25));
    return {positions: new Float32Array(pos), facing: new Float32Array(pos.length / 3)};
  }, [bollards]);
  // flat tags: one per paving slab, plus one on every bench top
  const groundTags = useMemo(() => {
    const pts: [number, number][] = [];
    const [sx, sz] = PLAZA_SIZE;
    let k = 0;
    for (let z = -sz / 2 + 3; z < sz / 2; z += 6) {
      for (let x = -sx / 2 + 3; x < sx / 2; x += 6) {
        k++;
        if (z < PLAZA_SPOTS.stairZ + 1) continue; // not on the stair/podium
        if (Math.abs(x) < 1.2) continue; // keep the axis inlay clean
        if (rand(k * 7.13) > 0.78) continue;
        pts.push([x + (rand(k * 3.1) - 0.5) * 2.2, z + (rand(k * 5.7) - 0.5) * 2.2]);
      }
    }
    benches.forEach(([x, , z]) => pts.push([x, z]));
    return groundLocal(pts);
  }, [benches]);
  // patches of tags under each lyric block (they light up as the words dissolve)
  const blockTags = useMemo(
    () =>
      BLOCKS.map((b, bi) => {
        const m = measureLyric(b.line, b.em);
        const w = Math.min(m.width / b.rows, 150) * 1.05;
        const h = ((b.rows - 1) * 1.18 + 0.7) * b.em * b.k;
        const n = Math.round((w * h) / (b.em * b.em * 0.18));
        const pts: [number, number][] = [];
        for (let i = 0; i < n; i++) pts.push([(rand(bi * 1000 + i * 2.1) - 0.5) * w, b.z + (rand(bi * 1000 + i * 3.7) - 0.5) * h]);
        return {pos: groundLocal(pts, 0.05), maxW: (m.width / b.rows) * 1.08};
      }),
    [],
  );
  // the city: every facade tagged. Base set (always lit) + a build set that lights up toward the chorus.
  const cityBlocks = useMemo(() => cityGridLayout({...CITY, avoid: CITY_AVOID}), []);
  const cityTags = useMemo(() => {
    const towers = TOWERS.map((tw, i) =>
      leaseTagBox({width: TOWER.d + 1.6, depth: TOWER.w + 1.6, height: TOWER.h, density: 0.1, seed: 300 + i, x: tw.pos[0], z: tw.pos[2]}),
    );
    const base = mergeTagSets(...towers, ...cityBlocks.map((b, i) => leaseTagBox({width: b.w + 0.8, depth: b.d + 0.8, height: b.h, density: 0.028, seed: 10 + i, x: b.x, z: b.z})));
    const more = mergeTagSets(...cityBlocks.map((b, i) => leaseTagBox({width: b.w + 0.8, depth: b.d + 0.8, height: b.h, density: 0.04, fill: 0.9, seed: 900 + i, x: b.x, z: b.z})));
    return {base, more};
  }, [cityBlocks]);

  // ---- lyric dissolve -----------------------------------------------------------------------------------------------
  const dissolveFx = (end: number) => (i: number, info: WordInfo) => {
    const k = (t - end) / DISSOLVE;
    if (k <= 0) return {};
    // each word stutters out at its own moment inside the dissolve
    const own = Math.min(1, Math.max(0, k * 1.6 - rand(i * 3.3 + info.start) * 0.6));
    const on = rand(Math.floor(t * 24) + i * 17.1) > own * 0.9;
    return {opacity: on ? 1 - own : 0.15 * (1 - own), visible: own < 1};
  };

  const tagI = Math.min(1.95, 1.2 + 0.6 * build + 0.15 * bass);
  return (
    <>
      <CameraRig position={cam.pos} target={cam.target} fov={CAM_FOV} />
      {/* ground beyond the plaza (black) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <planeGeometry args={[4000, 4000]} />
        <meshBasicMaterial color={S.void} />
      </mesh>
      <Plaza size={PLAZA_SIZE} color={GREYS.g4} ambient={0.1} mastColor={S.authRed} mastLight={0.85 + 0.3 * bass} spill={0.8} spillColor={S.authRed} />
      {/* the city around it */}
      <CityGrid {...CITY} avoid={CITY_AVOID} color={GREYS.g2} ambient={0.45} />
      {TOWERS.map((tw, i) => (
        <Megablock key={i} position={tw.pos} rotation-y={tw.rotY} w={TOWER.w} h={TOWER.h} d={TOWER.d} seed={21 + i} color={GREYS.g3} ambient={0.4} litFraction={0.015} />
      ))}
      <TenureScreen position={PLAZA_SPOTS.screen} width={58} height={25} content="wordmark" time={t} pulse={Math.min(1, bass * 1.1)} intensity={1.2} haze={0.3} />
      {/* street furniture: bollards along the axis, benches */}
      <BoxRow positions={bollards} size={BOLLARD} color={GREYS.g1} />
      <BoxRow positions={benches} size={BENCH} color={GREYS.g1} />
      {/* every object tagged */}
      <LeaseTags positions={objectTags.positions} facing={objectTags.facing} size={0.3} time={t} intensity={1.5} minPx={1.4} flicker={0.12} seed={4} />
      <group rotation-x={-Math.PI / 2}>
        <LeaseTags positions={groundTags} size={1.25} time={t} intensity={tagI * 0.85} minPx={1.3} flicker={0.1} seed={5} fog={0.5} />
        {blockTags.map((b, i) => (
          <LeaseTags key={i} positions={b.pos} size={BLOCKS[i].em * 0.42} time={t} intensity={tagI} minPx={1.4} flicker={0.1} seed={60 + i}
            onFrom={BLOCKS[i].end - 0.05} onTo={BLOCKS[i].end + DISSOLVE * 1.4} />
        ))}
      </group>
      <LeaseTags positions={cityTags.base.positions} facing={cityTags.base.facing} size={2.8} time={t} intensity={tagI} minPx={1.3} flicker={0.15} seed={3} />
      <LeaseTags positions={cityTags.more.positions} facing={cityTags.more.facing} size={2.8} time={t} intensity={tagI} minPx={1.6} flicker={0.15} seed={9}
        onFrom={54.4} onTo={57.0} />
      {/* TENURE's tracking pool follows him; it gives way to the tags as he is lost */}
      <LightPool position={[0, 0, he - 1.3]} radius={3.3} color={S.authRed} intensity={0.9 * (1 - smooth(prog(t, 55.6, 56.9)))} haze={0.28} hazeHeight={4.2} seed={3} />
      <OnTop>
        <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[0, 0, he]} opacity={0.999} rim={{color: S.authRed, strength: 0.8, power: 6, dir: [0, 1]}} />
      </OnTop>
      {/* the lines, projected on the paving ahead of him */}
      {BLOCKS.map((b, i) => {
        return (
          <ProjectedLyric key={b.line} line={b.line} time={t} size={b.em} maxWidth={blockTags[i].maxW} rotation={[-Math.PI / 2, 0, 0]} scale={[1, b.k, 1]}
            position={[0, 0.06, b.z]} intensity={0.92} halo={0.18} until={b.end + DISSOLVE} perWord={dissolveFx(b.end)} renderOrder={2} />
        );
      })}
    </>
  );
};

