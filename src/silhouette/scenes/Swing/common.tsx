/**
 * Swing — shared pieces of the cell after the blow: the Monolith at CELL_SPOTS.feeder driven by the scene's continuous
 * box clocks (timing.boxState), coordinate helpers between Monolith-local and room space, the lease-tag wall
 * (TENURE's inventory of the cell) and its lyric band. Everything is a pure function of (song time, absolute frame).
 */
import React, {useMemo} from 'react';
import {S} from '../../lib/palette';
import {CELL, CELL_DOOR, CELL_SLIT, CELL_SPOTS} from '../../lib/sets';
import {Monolith, MONOLITH} from '../../lib/props';
import {LeaseTags} from '../../lib/tenure';
import {rand} from '../../../lib/time';
import {boxState} from './timing';
import {GoldSpill} from './GoldSpill';

export type V3 = [number, number, number];

const F = CELL_SPOTS.feeder;
const R = CELL_SPOTS.feederRotY; // π/2: the box's front (+Z local) faces room +X
const cR = Math.cos(R), sR = Math.sin(R);

/** Monolith-local point → room point (the box sits at CELL_SPOTS.feeder, turned feederRotY). */
export const boxToRoom = (p: V3): V3 => [F[0] + p[0] * cR + p[2] * sR, p[1], F[2] - p[0] * sR + p[2] * cR];

/** where the kibble heap settles (room space, on the floor) */
export const PILE: V3 = boxToRoom([MONOLITH.pileCenter[0], 0, MONOLITH.pileCenter[1]]);
/** the iris / impact point (room space) */
export const IMPACT: V3 = boxToRoom(MONOLITH.impactPoint as V3);
/** the Guy's swing root (room space) and yaw (he faces the box, −X) */
export const SWING_SPOT: V3 = boxToRoom(MONOLITH.guySwingSpot.position as V3);
export const SWING_YAW = R + MONOLITH.guySwingSpot.rotationY;

/**
 * The feeder after (and before) the blow, in room space. Children render in Monolith-local space.
 * The gold spill is the LOCAL <GoldSpill> (NaN-safe shaders), so the Monolith itself gets spill={0}.
 */
export const BrokenBox: React.FC<{t: number; abs: number; pupil?: number; halo?: number; cones?: number; front?: number;
  children?: React.ReactNode}> = ({t, abs, pupil = 0.3, halo = 1, cones = 1, front = 1, children}) => {
  const st = boxState(abs);
  return (
    <group position={F} rotation-y={R}>
      <Monolith time={t} pupil={pupil} intensity={1.5} irisGlow={0.45} shatter={st.shatter} spill={0} kibble={st.kibble}
        kibbleCount={300} />
      <GoldSpill spill={st.spill} shatter={st.shatter} halo={halo} cones={cones} front={front} />
      {children}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ the lease-tag wall
/** The cell's LEFT wall (x = −1.8, facing +X) as TENURE's inventory: a dense field of red lease tags around the door
 *  and the hammer slit. Tag band y ∈ [TAG_Y0, TAG_Y1]; the lyric band sits above it. */
export const TAG_Y0 = 0.22;
export const TAG_Y1 = 1.92;
export const TAG_SIZE = 0.1;

const wallTagPositions = () => {
  const pos: number[] = [];
  const dz = 0.128, dy = 0.052;
  const z0 = CELL.zMin + 0.12, z1 = CELL.zMax - 0.12;
  const doorZ0 = CELL_DOOR.z - CELL_DOOR.width / 2 - 0.06, doorZ1 = CELL_DOOR.z + CELL_DOOR.width / 2 + 0.06;
  const slitZ0 = CELL_SLIT.z - 0.2, slitZ1 = CELL_SLIT.z + 0.2;
  let k = 0;
  for (let y = TAG_Y0; y <= TAG_Y1 + 1e-6; y += dy) {
    const row = Math.round((y - TAG_Y0) / dy);
    for (let z = z0 + (row % 2) * dz * 0.5; z <= z1; z += dz) {
      k++;
      if (z > doorZ0 && z < doorZ1) continue; // the door (its iris lock stays the only red there)
      if (z > slitZ0 && z < slitZ1 && y > CELL_SLIT.bottom - 0.08) continue; // the empty pegs across the light slit
      if (rand(k * 7.31 + 0.5) < 0.07) continue; // a few gaps: hand-applied, not a printed grid
      const jz = (rand(k * 3.17) - 0.5) * 0.018;
      const jy = (rand(k * 5.71) - 0.5) * 0.008;
      // wall-local frame (the wall is the local XY plane, local +X = room −Z), so LeaseTags' 'centre' order works
      pos.push(-(z + jz), y + jy, 0);
    }
  }
  return new Float32Array(pos);
};

/** The wall of lease tags. `onFrom/onTo`: TENURE lists his account as he dials; `offFrom/offTo`: cancelled, one by one. */
export const TagWall: React.FC<{t: number; onFrom?: number; onTo?: number; offFrom?: number; offTo?: number; intensity?: number}> = ({
  t, onFrom, onTo, offFrom, offTo, intensity = 1.25,
}) => {
  const positions = useMemo(wallTagPositions, []);
  return (
    <group position={[CELL.xMin + 0.012, 0, 0]} rotation-y={Math.PI / 2}>
      <LeaseTags positions={positions} time={t} size={TAG_SIZE} intensity={intensity} color={S.authRed}
        flicker={0.08} fog={0.2} minPx={1.4} seed={315}
        onFrom={onFrom ?? -1e9} onTo={onTo}
        offFrom={offFrom ?? 1e9} offTo={offTo} offOrder="centre" offJitter={0.35} outDur={0.35} />
    </group>
  );
};
