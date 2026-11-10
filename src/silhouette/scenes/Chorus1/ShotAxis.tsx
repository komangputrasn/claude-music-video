// Chorus1 · shot H — 87.63 → 92.56 (scene end). Line 19: "click to cancel, I'm cancelling you."
// The widest frame of the chorus: a raised black causeway runs dead-centre through a canyon of tagged towers to the
// vanishing point, where the CANCEL button is a single red dot. He is a speck walking toward it. The line stands on the
// causeway ahead of him as words of light, each word further down the axis than the last (and bigger, so all read the
// same size): the sentence itself recedes toward the button — the more he cancels, the further away it gets.
// The words stand on clean ground: each runway light and the stretch of axis line seen BEHIND a row of words goes dark
// as the word in front of it lights up (word extents are measured at runtime, so any font works).
// A slow crane rises until the 92.00 downbeat, where the red dot pulses once and the frame holds.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, hdr, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric, measureLyric} from '../../lib/WorldLyric';
import {Backlight, LightPool} from '../../lib/atmos';
import {TenureScreen, LeaseTags, leaseTagBox, mergeTagSets} from '../../lib/tenure';
import {CityGrid, cityGridLayout} from '../../lib/sets';
import {bassAt, lerp} from '../../../lib/time';
import {LINES} from '../../../lib/lyrics';
import {guyWalk, GUY} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeInOut, flashAfter, Ground, BoxRow, Slab, CancelButton, GlowCard, RIM_BONE} from './common';

export const SHOT_H = {t0: 87.63, t1: 92.56};
export const FOG_H = {color: S.ash, near: 140, far: 1700};

type V3 = [number, number, number];

const END_Z = -1500; // the button
const CAUSE_W = 46;
const LIGHT_X = CAUSE_W / 2 - 0.8; // the two rows of runway lights
const AXIS = {z0: 90, z1: -1610, w: 0.35}; // the bone axis line
const WALK = GUY.strideLength * 0.94;
const DOWN = 92.0;
const CITY = {rows: 26, cols: 12, spacing: 74, seed: 6, height: [70, 230] as [number, number], footprint: [26, 46] as [number, number], litFraction: 0.012};
const CITY_Z = -720;
// camera crane (mid values used to lay the two rows of words out on screen)
const CAM0 = {y: 33, z: 10};
const CAM1 = {y: 36.5, z: 3};
const CAM_MID = {y: 34.7, z: 6.5};
const TARGET_Z = -330; // horizon (and the red dot) sits ~0.4 above the frame centre
const FOOT = 0.2; // em: the words stand this high above the causeway
/** row 0 "CLICK TO CANCEL," far down the axis near the button; row 1 "I'M CANCELLING YOU." nearer, ahead of him */
const ROWS = [6.3, 10.6].map((dep, k) => {
  const D = CAM_MID.y / Math.tan((dep * Math.PI) / 180);
  const em = 0.0268 * D;
  const z = CAM_MID.z - D;
  // the stretch of causeway seen BEHIND the row (its foot → cap top + halo) from anywhere on the crane, plus one light
  // in front of it
  const top = em * (FOOT + 0.7 + 0.5);
  const far = Math.min(...[CAM0, CAM_MID, CAM1].map((c) => c.z - ((c.z - z) * c.y) / (c.y - top))) - 4;
  return {z, em, words: [[0, 1, 2], [3, 4, 5]][k], gap: [far, z + 9] as [number, number]};
});
const inGap = (z: number) => ROWS.findIndex((r) => z >= r.gap[0] && z <= r.gap[1]);
/** x (m) in the plane of row r where a ground point at (x, z) appears, seen from the mid crane position */
const projX = (x: number, z: number, r: (typeof ROWS)[number]) => (x * (CAM_MID.z - r.z)) / (CAM_MID.z - z);

const LIGHT_POS: V3[] = [];
for (let k = 0; k < 190; k++) for (const s of [-1, 1]) LIGHT_POS.push([s * LIGHT_X, 0, 40 - k * 8]);
const STATIC_LIGHTS = LIGHT_POS.filter((p) => inGap(p[2]) < 0);
/** the axis line outside the rows' gaps (always lit) */
const AXIS_STATIC: [number, number][] = (() => {
  const out: [number, number][] = [];
  let z = AXIS.z0;
  for (const [far, near] of ROWS.map((r) => r.gap).sort((a, b) => b[1] - a[1])) {
    out.push([z, near]);
    z = far;
  }
  out.push([z, AXIS.z1]);
  return out;
})();

const LIGHT_COLOR = hdr(S.bone, 1.6);
const LIGHT_SIZE: V3 = [0.6, 0.25, 0.6];

/** Runway lights (the same boxes as the BoxRow) whose brightness k (1 → 0) is set every frame. */
const FadeLights: React.FC<{positions: V3[]; k: number}> = ({positions, k}) => {
  const {mesh, geo, mat} = useMemo(() => {
    const geo = new THREE.BoxGeometry(...LIGHT_SIZE);
    geo.translate(0, LIGHT_SIZE[1] / 2, 0);
    const mat = new THREE.MeshBasicMaterial({color: LIGHT_COLOR.clone(), fog: true, toneMapped: true});
    const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
    const M = new THREE.Matrix4();
    positions.forEach((p, i) => mesh.setMatrixAt(i, M.makeTranslation(p[0], p[1], p[2])));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return {mesh, geo, mat};
  }, [positions]);
  useLayoutEffect(() => {
    mat.color.copy(LIGHT_COLOR).multiplyScalar(k);
    mesh.visible = k > 0.003;
  });
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  return <primitive object={mesh} />;
};

/** One stretch of the bone axis line (z0 > z1) at opacity k. */
const AxisSeg: React.FC<{z0: number; z1: number; k?: number}> = ({z0, z1, k = 1}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: S.bone, fog: true, toneMapped: true, transparent: true, depthWrite: false}), []);
  useLayoutEffect(() => {
    mat.opacity = k;
  });
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, (z0 + z1) / 2]} material={mat} visible={k > 0.003}>
      <planeGeometry args={[AXIS.w, z0 - z1]} />
    </mesh>
  );
};

export const ShotAxis: React.FC<ShotProps> = ({t, f}) => {
  const lt = t - SHOT_H.t0;
  const e = easeInOut(prog(t, SHOT_H.t0, DOWN));
  const bass = bassAt(f);
  const gz = -117 - lt * WALK;
  const avoid = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let z = -1100; z <= 1100; z += 40) out.push([0, z, 62]);
    return out;
  }, []);
  const tags = useMemo(() => {
    const blocks = cityGridLayout({...CITY, avoid});
    return mergeTagSets(...blocks.map((b, i) => leaseTagBox({width: b.w, depth: b.d, height: b.h, density: 0.03, seed: 40 + i, x: b.x, z: b.z + CITY_Z})));
  }, [avoid]);
  // what goes dark behind the words, and when: each light in a row's gap (and the row's stretch of the axis line) takes
  // the onset of the word it is seen through (the nearest word if it falls in a word space; margin = the halo)
  const fades = useMemo(() => {
    const W = LINES[19].words;
    const spans = ROWS.map((r) => {
      const ws = r.words.map((i) => measureLyric(W[i].text, r.em).width);
      const sp = 0.42 * r.em;
      let x = -(ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1)) / 2;
      return r.words.map((i, k) => {
        const s = {x0: x, x1: x + ws[k], start: W[i].start};
        x += ws[k] + sp;
        return s;
      });
    });
    const onsetAt = (ri: number, x: number) => {
      const m = 0.3 * ROWS[ri].em;
      const hit = spans[ri].filter((s) => x >= s.x0 - m && x <= s.x1 + m);
      if (hit.length) return Math.min(...hit.map((s) => s.start));
      const d = (s: {x0: number; x1: number}) => Math.max(s.x0 - x, x - s.x1);
      return spans[ri].reduce((a, b) => (d(b) < d(a) ? b : a)).start;
    };
    const byOnset = new Map<number, V3[]>();
    for (const p of LIGHT_POS) {
      const ri = inGap(p[2]);
      if (ri < 0) continue;
      const o = onsetAt(ri, projX(p[0], p[2], ROWS[ri]));
      byOnset.set(o, [...(byOnset.get(o) ?? []), p]);
    }
    return {lights: [...byOnset.entries()], axis: ROWS.map((_, ri) => onsetAt(ri, 0))};
  }, []);
  // words come on hard at their onset, so the light behind them dims over the 0.2 s AROUND it (0.15 s before → 0.05 s
  // after): each word lands on clean ground (16% at the onset frame, gone one frame later) instead of being crossed by
  // a still-fading line for its first 4 frames
  const off = (onset: number) => 1 - easeInOut(prog(t, onset - 0.15, onset + 0.05));
  const pulse = flashAfter(t, DOWN, 3.5);
  return (
    <>
      <CameraRig position={[0, lerp(CAM0.y, CAM1.y, e), lerp(CAM0.z, CAM1.z, e)]} target={[0, 0, TARGET_Z]} fov={cameraFovForVisible(26)} />
      <Ground y={-8} color={S.void} />
      {/* the horizon: city glow low in the haze, the red sun of the button at the vanishing point */}
      <Backlight position={[0, 40, END_Z - 200]} size={[3000, 260]} shape="slab" softness={1} intensity={0.34} time={t} />
      <GlowCard position={[0, 10, END_Z - 10]} scale={[130, 60]} color={S.authRed} intensity={0.32 + 0.45 * pulse + 0.06 * bass} />
      <CityGrid {...CITY} avoid={avoid} position={[0, -8, CITY_Z]} color={GREYS.g2} ambient={0.55} />
      <LeaseTags positions={tags.positions} facing={tags.facing} position={[0, -8, 0]} size={2.4} time={t} intensity={1.25} minPx={1.2} flicker={0.15} seed={3} />
      {/* the causeway: dark stone, a thin bone axis line, runway lights converging on the dot */}
      <Slab size={[CAUSE_W, 8, 1700]} position={[0, -8, -760]} color={GREYS.g2} ambient={0.06} />
      {AXIS_STATIC.map(([z0, z1], i) => (
        <AxisSeg key={i} z0={z0} z1={z1} />
      ))}
      <BoxRow positions={STATIC_LIGHTS} size={LIGHT_SIZE} color={S.bone} intensity={1.6} />
      {/* behind each row of words the lights and the axis go dark as the word in front of them lights up */}
      {fades.lights.map(([onset, pos]) => (
        <FadeLights key={onset} positions={pos} k={off(onset)} />
      ))}
      {ROWS.map((r, ri) => (
        <AxisSeg key={ri} z0={r.gap[1]} z1={r.gap[0]} k={off(fades.axis[ri])} />
      ))}
      <TenureScreen position={[0, 0, END_Z]} width={40} height={22} content={{chrome: true, lines: []}} time={t} intensity={0.8} haze={0.2} fog={0.6} />
      <CancelButton width={18 * (1 + 0.5 * pulse)} intensity={1.35 + 0.15 * pulse} halo={0.9 + 0.3 * pulse} position={[0, 9, END_Z + 1.5]} />
      {/* the sentence stands on the causeway in two rows of light, the first one far down the axis near the button */}
      {ROWS.map((r, k) => (
        <WorldLyric key={k} line={19} time={t} size={r.em} rows={[r.words]} anchor="baseline" position={[0, r.em * FOOT, r.z]} until={SHOT_H.t1 + 0.1} intensity={1.15} />
      ))}
      {/* a pool of light on the causeway: he walks through it, a speck of black */}
      <LightPool position={[0, 0, -121]} radius={5} color={S.bone} intensity={0.75} haze={0.4} hazeHeight={4} />
      <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[0, 0, gz]} rim={{...RIM_BONE, strength: 1.1, dir: [0, 1]}} />
    </>
  );
};
