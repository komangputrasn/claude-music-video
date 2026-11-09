/**
 * Tree / Bush — cute low-poly cel-shaded yard greenery with ink outlines. Base at y=0.
 *
 *   <Tree kind="round" seed={2} height={5} position={[8, 0, -3]} />     lollipop deciduous tree (~3 m wide at height 5)
 *   <Tree kind="pine" height={7} />                                     stacked-cone conifer
 *   <Bush seed={1} size={1} color="#2fa52a" flowers="#ff8fd0" />         round shrub (size = diameter-ish), optional blossoms
 *   time?: number on Tree sways the canopy a little (pure function of time).
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {toonMat} from '../../characters/toon';
import {Ink, hash1} from './common';

type GroupProps = ThreeElements['group'];

const icoCache = new Map<string, THREE.BufferGeometry>();
const ico = (r: number, d = 1) => {
  const k = `${r}|${d}`;
  let g = icoCache.get(k);
  if (!g) {
    g = new THREE.IcosahedronGeometry(r, d);
    icoCache.set(k, g);
  }
  return g;
};

export type TreeProps = GroupProps & {
  kind?: 'round' | 'pine';
  height?: number;
  seed?: number;
  leaf?: string;
  leafDark?: string;
  trunk?: string;
  time?: number;
  outline?: number | false;
};

export const Tree: React.FC<TreeProps> = ({kind = 'round', height = 5, seed = 1, leaf, leafDark, trunk = '#8a5a34', time = 0, outline = 0.05, ...g}) => {
  const s = height / 5;
  const sway = Math.sin(time * 1.3 + seed * 2.1) * 0.025;
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.26, 2.4, 7), []);
  const coneGeos = useMemo(() => [0, 1, 2, 3].map((i) => new THREE.ConeGeometry(1.7 - i * 0.35, 1.9, 8)), []);
  const blobs = useMemo(
    () =>
      Array.from({length: 4}, (_, i) => ({
        r: i === 0 ? 1.45 : 0.8 + hash1(i, seed) * 0.35,
        p: i === 0 ? [0, 3.3, 0] : [Math.cos(i * 2.1 + seed) * 0.95, 3.0 + hash1(i, seed + 3) * 0.9, Math.sin(i * 2.1 + seed) * 0.95],
      })),
    [seed],
  );
  if (kind === 'pine') {
    const lc = leaf ?? '#1f8a4a';
    return (
      <group {...g} scale={[s, s, s]}>
        <Ink geometry={trunkGeo} color={trunk} outline={outline} position={[0, 0.8, 0]} scale={[0.7, 0.7, 0.7]} />
        <group rotation={[sway, 0, sway * 0.7]}>
          {coneGeos.map((cg, i) => (
            <Ink key={i} geometry={cg} color={i % 2 ? (leafDark ?? '#177a3e') : lc} outline={outline} position={[0, 2.0 + i * 1.05, 0]} rotation={[0, i * 0.4, 0]} />
          ))}
        </group>
      </group>
    );
  }
  const lc = leaf ?? '#3fbf34';
  const ld = leafDark ?? '#2a9a2c';
  return (
    <group {...g} scale={[s, s, s]}>
      <Ink geometry={trunkGeo} color={trunk} outline={outline} position={[0, 1.2, 0]} />
      <group rotation={[sway, 0, sway * 0.6]}>
        {blobs.map((b, i) => (
          <Ink key={i} geometry={ico(b.r, 1)} color={i % 2 ? ld : lc} outline={outline} position={b.p as [number, number, number]} rotation={[i, i * 2, 0]} />
        ))}
      </group>
    </group>
  );
};

export type BushProps = GroupProps & {seed?: number; size?: number; color?: string; flowers?: string | null; outline?: number | false};
export const Bush: React.FC<BushProps> = ({seed = 1, size = 1, color = '#2fa52a', flowers = null, outline = 0.025, ...g}) => {
  const puffs = useMemo(
    () =>
      Array.from({length: 4}, (_, i) => ({
        r: 0.32 + hash1(i, seed + 40) * 0.14,
        p: [(i - 1.5) * 0.28, 0.3 + hash1(i, seed + 41) * 0.12, (hash1(i, seed + 42) - 0.5) * 0.25] as [number, number, number],
      })),
    [seed],
  );
  const dots = useMemo(
    () =>
      flowers
        ? Array.from({length: 7}, (_, i) => {
            const a = hash1(i, seed + 50) * 6.28, y = 0.35 + hash1(i, seed + 51) * 0.35;
            const p = puffs[i % 4];
            return [p.p[0] + Math.cos(a) * p.r * 0.85, y, p.p[2] + Math.sin(a) * p.r * 0.85 + 0.12] as [number, number, number];
          })
        : [],
    [seed, flowers, puffs],
  );
  return (
    <group {...g} scale={[size, size, size]}>
      {puffs.map((p, i) => (
        <Ink key={i} geometry={ico(p.r, 1)} color={i % 2 ? color : new THREE.Color(color).offsetHSL(0, 0, 0.06).getStyle()} outline={outline} position={p.p} rotation={[i, i * 1.3, 0]} />
      ))}
      {dots.map((d, i) => (
        <mesh key={`f${i}`} geometry={ico(0.055, 0)} material={toonMat(flowers!)} position={d} />
      ))}
    </group>
  );
};
