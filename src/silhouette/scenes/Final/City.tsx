// TERMS · Final — the far city as a skyline band (CityGrid) with its red lease tags failing city-wide at the hit, plus
// small reusable bits (a dying TENURE screen, a viaduct to stand letters on).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS} from '../../lib/palette';
import {CityGrid, cityGridLayout} from '../../lib/sets';
import type {CityGridProps} from '../../lib/sets/Megablock';
import {LeaseTags, leaseTagBox, mergeTagSets, TenureScreen} from '../../lib/tenure';
import {Iris} from '../../lib/Iris';
import {redFail, T_HIT} from './timing';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

export type SkylineProps = GroupProps & {
  t: number;
  grid: CityGridProps;
  /** lease tags on every block that blink out city-wide over [offFrom, offTo] */
  tags?: false | {density?: number; offFrom?: number; offTo?: number; order?: 'random' | 'centre' | 'left' | 'right' | 'up' | 'down'; size?: number};
};

export const Skyline: React.FC<SkylineProps> = ({t, grid, tags = false, ...group}) => {
  const blocks = useMemo(() => cityGridLayout(grid), [JSON.stringify(grid)]); // eslint-disable-line react-hooks/exhaustive-deps
  const tagSet = useMemo(() => {
    if (!tags) return null;
    return mergeTagSets(
      ...blocks.map((b, i) => leaseTagBox({width: b.w, depth: b.d, height: b.h, density: tags.density ?? 0.02, fill: 0.6, seed: i, x: b.x, z: b.z})),
    );
  }, [blocks, tags ? tags.density : 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group {...group}>
      <CityGrid {...grid} />
      {tags && tagSet && t < (tags.offTo ?? T_HIT + 1) + 1 ? (
        <LeaseTags positions={tagSet.positions} facing={tagSet.facing} time={t} offFrom={tags.offFrom ?? T_HIT} offTo={tags.offTo ?? T_HIT + 0.9}
          offOrder={tags.order ?? 'centre'} offJitter={0.35} size={tags.size ?? 2.2} intensity={1.3} minPx={1.6} fog={0.6} flicker={0.1} />
      ) : null}
    </group>
  );
};

/** a TENURE screen that fails at `dieAt` (stutter) and then is a dead black slab (its iris a black disc) */
export const DyingScreen: React.FC<GroupProps & {
  t: number; dieAt?: number; dur?: number; seed?: number; width?: number; height?: number;
  content?: React.ComponentProps<typeof TenureScreen>['content']; haze?: number;
}> = ({t, dieAt = T_HIT, dur = 0.6, seed = 0, width = 40, height = 22, content = 'wordmark', haze = 0.3, ...group}) => {
  const lit = redFail(t, dieAt, dur, seed);
  return (
    <group {...group}>
      <TenureScreen width={width} height={height} content={content} time={t} intensity={1.3 * lit} haze={haze * lit}
        irisOpen={lit > 0.01 ? 1 : 0.0001} fog={0.5} />
    </group>
  );
};

/** a dead TENURE iris: a red iris that stutters out to a black housing disc (a "black sun") */
export const DyingIris: React.FC<GroupProps & {t: number; dieAt?: number; dur?: number; seed?: number; radius?: number}> = ({
  t, dieAt = T_HIT, dur = 0.7, seed = 3, radius = 5, ...group
}) => {
  const lit = redFail(t, dieAt, dur, seed);
  return <Iris {...group} radius={radius} time={t} open={1} intensity={1.6 * lit} glow={0.5 * lit} flicker={lit > 0 && lit < 1 ? 0.6 : 0} />;
};

/** a long black viaduct (elevated highway) on thin piers: something monumental for letters to stand on */
export const Viaduct: React.FC<GroupProps & {length?: number; deck?: number; thick?: number; pier?: number; span?: number; depth?: number; color?: string}> = ({
  length = 600, deck = 30, thick = 2.6, pier = 1.6, span = 48, depth = 10, color = S.void, ...group
}) => {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const d = new THREE.BoxGeometry(length, thick, depth);
    d.translate(0, deck - thick / 2, 0);
    parts.push(d);
    const n = Math.floor(length / span);
    for (let i = 0; i <= n; i++) {
      const x = -length / 2 + (length - n * span) / 2 + i * span;
      const p = new THREE.BoxGeometry(pier, deck - thick, pier * 1.6);
      p.translate(x, (deck - thick) / 2, 0);
      parts.push(p);
    }
    // parapet line on top (thin)
    const pa = new THREE.BoxGeometry(length, 0.9, 0.3);
    pa.translate(0, deck + 0.45, depth / 2 - 0.2);
    parts.push(pa);
    return parts;
  }, [length, deck, thick, pier, span, depth]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color}), [color]);
  return (
    <group {...group}>
      {geo.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}
    </group>
  );
};

export const CITY_DARK = {color: GREYS.g2, glass: GREYS.g1, litFraction: 0, ambient: 0.25} as const;
