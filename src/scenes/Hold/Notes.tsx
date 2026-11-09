/**
 * Floating chrome / candy / iridescent 3D music notes (eighth notes ♪, beamed pairs ♫, quarter notes) for the hold-music
 * limbo. They drift and bob on the beat, FREEZE on "stopped", then drop away into the dark.
 * Geometry is merged once (module cache); materials are per-scene instances so brightness can drain.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createY2KMat, setY2KUniforms} from '../../lib/three/materials';
import {rand} from '../../lib/time';
import {C} from '../../lib/palette';
import type {V3} from './common';

const prep = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  if (!n.getAttribute('uv')) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((n.getAttribute('position').count) * 2), 2));
  return n;
};

const noteHead = (x: number, y: number) => {
  const g = new THREE.SphereGeometry(0.16, 18, 12);
  g.scale(1.28, 0.88, 0.78);
  g.rotateZ(0.42);
  g.translate(x, y, 0);
  return prep(g);
};
const stem = (x: number, y0: number, y1: number) => {
  const g = new THREE.CylinderGeometry(0.024, 0.024, y1 - y0, 10);
  g.translate(x, (y0 + y1) / 2, 0);
  return prep(g);
};
const flag = (x: number, top: number) => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.02, -0.12, 0.26, -0.16, 0.2, -0.42);
  s.bezierCurveTo(0.17, -0.3, 0.1, -0.22, 0, -0.2);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10});
  g.translate(x - 0.02, top, -0.025);
  return prep(g);
};
const beam = (x0: number, x1: number, y0: number, y1: number) => {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const g = new THREE.BoxGeometry(len + 0.05, 0.075, 0.07);
  g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
  return prep(g);
};

let GEOS: THREE.BufferGeometry[] | null = null;
const noteGeos = () => {
  if (GEOS) return GEOS;
  const eighth = mergeGeometries([noteHead(0, 0), stem(0.175, 0.02, 0.66), flag(0.175, 0.66)])!;
  const pair = mergeGeometries([
    noteHead(0, 0), stem(0.175, 0.02, 0.7), noteHead(0.5, 0.1), stem(0.675, 0.12, 0.8), beam(0.175, 0.675, 0.68, 0.78),
  ])!;
  const quarter = mergeGeometries([noteHead(0, 0), stem(0.175, 0.02, 0.66)])!;
  for (const g of [eighth, pair, quarter]) {
    g.computeBoundingSphere();
    g.translate(-0.2, -0.3, 0);
  }
  GEOS = [eighth, pair, quarter];
  return GEOS;
};

export type NoteSpec = {kind: number; mat: number; base: V3; size: number; spin: number; ph: number};

export const makeNotes = (n: number, center: V3, seed = 'hold'): NoteSpec[] =>
  Array.from({length: n}, (_, i) => {
    const r = (k: number) => rand(`${seed}-${i}-${k}`);
    const ang = r(0) * Math.PI * 2;
    const rad = 1.7 + r(1) * 4.8;
    return {
      kind: r(2) < 0.5 ? 0 : r(2) < 0.8 ? 1 : 2,
      mat: Math.floor(r(3) * 4),
      base: [center[0] + Math.cos(ang) * rad, center[1] + (r(4) - 0.45) * 3.6, center[2] + Math.sin(ang) * rad - 0.8] as V3,
      size: 0.55 + r(5) * 0.85,
      spin: (r(6) - 0.5) * 1.6,
      ph: r(7) * 10,
    };
  });

export const NoteField: React.FC<{
  notes: NoteSpec[];
  /** live (un-frozen) time in seconds */
  live: number;
  /** beat pulse 0..1 (frozen after "stopped") */
  pulse: number;
  /** seconds since the notes started falling (0 = not falling) */
  fall: number;
  brightness: number;
}> = ({notes, live, pulse, fall, brightness}) => {
  const geos = noteGeos();
  const mats = useMemo(
    () => [
      createY2KMat('iridescent'),
      createY2KMat('chrome', {color: '#d9c8ff', tint: 0.35}),
      createY2KMat('candy', {color: C.bubblegum}),
      createY2KMat('aqua'),
    ],
    [],
  );
  useLayoutEffect(() => {
    for (const m of mats) setY2KUniforms(m, {brightness: brightness * (1 + 0.35 * pulse)});
  });
  useLayoutEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <group>
      {notes.map((s, i) => {
        const t = live;
        const bob = 0.1 * pulse * (i % 2 ? 1 : -0.6);
        const fd = Math.max(0, fall - (i % 5) * 0.03);
        const drop = 0.5 * 7.5 * fd * fd;
        const x = s.base[0] + 0.25 * Math.sin(t * 0.45 + s.ph);
        const y = s.base[1] + 0.22 * Math.sin(t * 0.8 + s.ph * 1.3) + bob - drop;
        const z = s.base[2] + 0.25 * Math.cos(t * 0.35 + s.ph);
        const tumble = fd * fd * (1.5 + (i % 3));
        return (
          <mesh key={i} geometry={geos[s.kind]} material={mats[s.mat]} position={[x, y, z]} scale={s.size}
            rotation={[0.15 * Math.sin(t * 0.6 + s.ph) + tumble * 0.7, s.ph + t * s.spin, 0.25 * Math.sin(t * 0.5 + s.ph) + tumble]} />
        );
      })}
    </group>
  );
};

/** push notes out of a capsule around the segment a-b (e.g. the wide camera's line of sight to the chrome slogan) */
export const clearOfSegment = (notes: NoteSpec[], a: V3, b: V3, r: number): NoteSpec[] =>
  notes.map((n) => {
    const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap: V3 = [n.base[0] - a[0], n.base[1] - a[1], n.base[2] - a[2]];
    const L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L2));
    const c: V3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
    const d: V3 = [n.base[0] - c[0], n.base[1] - c[1], n.base[2] - c[2]];
    const dl = Math.hypot(...d);
    if (dl >= r) return n;
    // drop it below the sight line
    return {...n, base: [n.base[0], c[1] - r - 0.2 * n.size, n.base[2]] as V3};
  });
