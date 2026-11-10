// Pre · shot 2 — PLAZA, 50.33 → 57.73 (abs 1510–1731). Lines 9, 10, 11 + the red whiteout into the chorus.
// He walks out alone up the axis of an enormous plaza at night: wet slabs under TENURE's red light, rows of black
// bollards, benches and floodlight masts. Everything is tagged: a red lease tag on every paving slab, on every bollard,
// bench top and mast, and on every facade around. A red tracking pool follows him.
// The camera opens low and long behind him (the whole plaza ahead of him, down to the red glow at its head), then booms
// up and back in one calm, continuous rise until he is a speck and then nothing in a city of glowing tags; the light
// builds into a red whiteout by the chorus (57.75).
// The lines lie on the paving ahead of him as projected light, each line further up the axis and larger, sized for
// the camera at the time it is sung (crane.ts): [9] near him, [10] beyond it, [11] in letters taller than he is.
// A line clears on the next line's first word (never two lines at once); its words stutter out and the patch of paving
// under them lights up with tags: the words dissolve into the sea of lease tags.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {S, GREYS} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric, measureLyric, WordInfo} from '../../lib/WorldLyric';
import {LightPool, WetGround} from '../../lib/atmos';
import {TenureScreen, LeaseTags, leaseTagBox, mergeTagSets, TagSet} from '../../lib/tenure';
import {Plaza, PLAZA_SPOTS, Megablock, CityGrid, cityGridLayout} from '../../lib/sets';
import {bassAt, rand} from '../../../lib/time';
import {LINES} from '../../../lib/lyrics';
import {guyWalk} from '../../../lib/characters/Guy';
import {BoxRow, GlowCard, ShotProps, V3, jointTex, prog, smooth} from './common';
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

/** lyric blocks on the paving (centre z, em, depth stretch k, explicit rows) — solved against crane() so each block sits
 *  ahead of him in the upper part of the frame while it is sung, its cap height ≥ ~38 px the whole time (scratch
 *  probe; NOTES.md). k stretches the letters along the axis like road markings (anamorphic for the oblique camera).
 *  The rows are explicit so the break never depends on the font's metrics (Futura on the Mac, a fallback elsewhere);
 *  while its words are on screen the widest row stays ≤ ~52 % of the frame width with the fallback font. Each line
 *  lies further up the axis than the patch of tags the previous line dissolved into (z ranges: [9] 36–46 m,
 *  [10] 2–38 m, [11] -11–43 m; [10]'s patch fades back out before [11]'s lower rows land on it). `handoff`: the line
 *  clears on the next line's first word (`end`); the last line dissolves over DISSOLVE after it is sung. */
const BLOCKS: {line: number; z: number; em: number; k: number; rows: number[][]; end: number; handoff: boolean}[] = [
  // ONE BAG OF FOOD, / AND THAT'S THAT.
  {line: 9, z: 41, em: 1.7, k: 3.0, rows: [[0, 1, 2, 3], [4, 5, 6]], end: W.how, handoff: true},
  // HOW HARD / CAN IT BE / TO BUY / ONE THING
  {line: 10, z: 20, em: 3.8, k: 2.2, rows: [[0, 1], [2, 3, 4], [5, 6], [7, 8]], end: W.in, handoff: true},
  // IN A WORLD / WHERE YOU / CAN'T OWN / ANYTHING?
  {line: 11, z: 16, em: 7.8, k: 1.6, rows: [[0, 1, 2], [3, 4], [5, 6], [7]], end: 56.75, handoff: false},
];
const DISSOLVE = 0.5; // s: the last line's words flicker out after it is sung, tags light up under them
const HANDOFF = 0.16; // s: an outgoing line stutters out in the last HANDOFF s before the next line's first word
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

/** The plaza paving is WET: a mirror-like <WetGround> on y = 0 carries the red of the mast heads, the screen, the tags
 *  and his pool (DESIGN 2.3). The Plaza's own dry paving plane (its size × size PlaneGeometry) is hidden so the two never
 *  z-fight; the Plaza's axis strips, inlay, mast pools, spill, masts and stair stay. */
const DryPavingOff: React.FC<{children: React.ReactNode}> = ({children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const g = (o as THREE.Mesh).geometry as THREE.PlaneGeometry | undefined;
      if (g?.type === 'PlaneGeometry' && g.parameters.width === PLAZA_SIZE[0] && g.parameters.height === PLAZA_SIZE[1]) o.visible = false;
    });
  });
  return <group ref={ref}>{children}</group>;
};

/** saw-cut joints of the 6 m slabs over the wet paving (dark lines; they cut the red reflections and pools into slabs:
 *  the scale cue). Joints on x = 6n and z = -100 + 6n, so every ground tag sits on its own slab. Unfogged black (fog
 *  would turn far joints into grey lines); drawn after the pools, before the tags (renderOrder 1.5). */
const SLAB = 6;
const JointGrid: React.FC<{opacity: number}> = ({opacity}) => {
  const geo = useMemo(() => {
    const [sx, sz] = [PLAZA_SIZE[0], PLAZA_SIZE[1] + 4];
    const g = new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * sx) / SLAB, (uv.getY(i) * sz) / SLAB);
    return g;
  }, []);
  const mat = useMemo(() => {
    const tex = jointTex();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: tex, color: S.void, transparent: true, depthWrite: false, fog: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    });
  }, []);
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useLayoutEffect(() => {
    mat.opacity = opacity;
  });
  return <mesh geometry={geo} material={mat} position={[0, 0.005, 2]} renderOrder={1.5} visible={opacity > 0.01} />;
};

/** World footprint [x0..x1] × [z0..z1] (m, plus a tag's half-length of margin) of BUY on the paving. BUY is a SOLID red
 *  letter (redFill), so a paving tag lying in the U's counter read as a strike-through ("BɄY") for the whole time the
 *  word was up; no paving tag is placed there. Measured with measureLyric at runtime (the font in use), from lyric
 *  measures only: the block height H, the height of rows 0..2 (row 2's baseline sits at H/2 − that, block-local, anchor
 *  center), BUY alone (its width and cap height) and the row "TO BUY" (centred). Block-local y → world z = z − y·k. */
const buyFootprint = () => {
  const b = BLOCKS.find((x) => x.line === 10)!;
  const ri = b.rows.findIndex((r) => r.includes(6)); // "buy" is word 6 of line 10
  const H = measureLyric(10, b.em, undefined, {rows: b.rows}).height;
  const base = H / 2 - measureLyric(10, b.em, undefined, {rows: b.rows.slice(0, ri + 1)}).height;
  const word = measureLyric(10, b.em, undefined, {rows: [[6]]});
  const rowW = measureLyric(10, b.em, undefined, {rows: [b.rows[ri]]}).width;
  const [mx, mz] = [0.7, 0.4];
  return {x0: rowW / 2 - word.width - mx, x1: rowW / 2 + mx, z0: b.z - (base + word.height) * b.k - mz, z1: b.z - base * b.k + mz};
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
  // flat tags: one per paving slab
  const groundTags = useMemo(() => {
    const pts: [number, number][] = [];
    const [sx, sz] = PLAZA_SIZE;
    const buy = buyFootprint();
    let k = 0;
    for (let z = -sz / 2 + 3; z < sz / 2; z += 6) {
      for (let x = -sx / 2 + 3; x < sx / 2; x += 6) {
        k++;
        if (z < PLAZA_SPOTS.stairZ + 1) continue; // not on the stair/podium
        if (Math.abs(x) < 1.2) continue; // keep the axis inlay clean
        if (rand(k * 7.13) > 0.78) continue;
        const p: [number, number] = [x + (rand(k * 3.1) - 0.5) * 2.2, z + (rand(k * 5.7) - 0.5) * 2.2];
        if (p[0] > buy.x0 && p[0] < buy.x1 && p[1] > buy.z0 && p[1] < buy.z1) continue; // not in BUY's counters
        pts.push(p);
      }
    }
    return groundLocal(pts);
  }, []);
  // one tag on every bench top (seat height 0.46 m)
  const benchTags = useMemo(() => groundLocal(benches.map(([x, , z]) => [x, z]), BENCH[1] + 0.015), [benches]);
  // patches of tags under each lyric block (they light up as the words dissolve)
  const blockTags = useMemo(
    () =>
      BLOCKS.map((b, bi) => {
        const m = measureLyric(b.line, b.em, undefined, {rows: b.rows});
        const w = Math.min(m.width, 150) * 1.05;
        const h = m.height * b.k;
        const n = Math.round((w * h) / (b.em * b.em * 0.18));
        const pts: [number, number][] = [];
        for (let i = 0; i < n; i++) pts.push([(rand(bi * 1000 + i * 2.1) - 0.5) * w, b.z + (rand(bi * 1000 + i * 3.7) - 0.5) * h]);
        return groundLocal(pts, 0.05);
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

  // ---- lyric hand-off / dissolve --------------------------------------------------------------------------------------
  // hand-off: in the last HANDOFF s before the next line's first word, the words stutter out in the order they were
  // sung (the last word last) and are all gone on the frame the next line's first word appears: never two lines at once
  const handoffFx = (end: number, n: number) => (i: number) => {
    const done = end - 1 / 60;
    const s = done - HANDOFF + (HANDOFF * 0.5 * i) / Math.max(1, n - 1);
    const k = (t - s) / (done - s);
    if (k <= 0) return {};
    if (k >= 1) return {visible: false};
    const on = rand(Math.floor(t * 30) * 1.7 + i * 17.1) > k * 0.85;
    return {opacity: on ? 1 - 0.55 * k : 0.12};
  };
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
      {/* wet paving: the red of the masts, the screen, the tags and his pool mirrored in it (fresnel: strongest in the
          low opening); the reflections give way as the crane looks straight down */}
      <WetGround size={PLAZA_SIZE} reflectivity={0.62 - 0.27 * smooth(prog(t, 54.6, 56.8))} puddles={0.3} streak={1.4} color={GREYS.g3} time={t} seed={7} />
      {/* TENURE's red light over the whole plaza (faint, breathing with the bass): every bench and bollard stands as a
          black shape on lit paving, not black on black */}
      <GlowCard color={S.authRed} intensity={0.11 + 0.03 * bass} scale={[210, 240]} position={[0, 0.012, 8]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} />
      <JointGrid opacity={0.85 * (1 - smooth(prog(t, 53.4, 55.4)))} />
      <DryPavingOff>
        <Plaza size={PLAZA_SIZE} color={GREYS.g4} ambient={0.1} mastColor={S.authRed} mastLight={0.85 + 0.3 * bass} spill={0.8} spillColor={S.authRed} />
      </DryPavingOff>
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
        <LeaseTags positions={groundTags} size={1.25} time={t} intensity={tagI * 0.85} minPx={1.3} flicker={0.1} seed={5} fog={0.5} renderOrder={2} />
        <LeaseTags positions={benchTags} size={0.9} time={t} intensity={tagI * 0.85} minPx={1.3} flicker={0.1} seed={6} fog={0.5} renderOrder={2} />
        {blockTags.map((pos, i) => {
          const b = BLOCKS[i];
          const from = b.handoff ? b.end - HANDOFF : b.end - 0.05;
          // [10]'s patch lies under [11]'s lower rows: it sinks back into the sea of tags before "where you"/"can't own"
          const off = b.line === 10 ? {offFrom: 55.05, offTo: 55.6} : {};
          return (
            <LeaseTags key={i} positions={pos} size={b.em * 0.42} time={t} intensity={tagI} minPx={1.4} flicker={0.1} seed={60 + i}
              onFrom={from} onTo={from + 0.75} renderOrder={2} {...off} />
          );
        })}
      </group>
      <LeaseTags positions={cityTags.base.positions} facing={cityTags.base.facing} size={2.8} time={t} intensity={tagI} minPx={1.3} flicker={0.15} seed={3} />
      <LeaseTags positions={cityTags.more.positions} facing={cityTags.more.facing} size={2.8} time={t} intensity={tagI} minPx={1.6} flicker={0.15} seed={9}
        onFrom={54.4} onTo={57.0} />
      {/* TENURE's tracking pool follows him; it gives way to the tags as he is lost */}
      <LightPool position={[0, 0, he - 1.3]} radius={3.3} color={S.authRed} intensity={0.9 * (1 - smooth(prog(t, 55.6, 56.9)))} haze={0.28} hazeHeight={4.2} seed={3} />
      <OnTop>
        <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[0, 0, he]} opacity={0.999} rim={{color: S.authRed, strength: 0.8, power: 6, dir: [0, 1]}} />
      </OnTop>
      {/* the lines, projected on the paving ahead of him (not mirrored: they lie on the wet paving itself). BUY is a solid
          authRed letter (redFill): additive red on the red-lit paving tone-maps coral */}
      {BLOCKS.map((b) => (
        <ProjectedLyric key={b.line} line={b.line} time={t} size={b.em} rows={b.rows} rotation={[-Math.PI / 2, 0, 0]} scale={[1, b.k, 1]}
          position={[0, 0.06, b.z]} intensity={0.92} halo={0.18} mirror={false} redFill={1} renderOrder={3}
          until={b.handoff ? b.end : b.end + DISSOLVE} perWord={b.handoff ? handoffFx(b.end, LINES[b.line].words.length) : dissolveFx(b.end)} />
      ))}
    </>
  );
};

