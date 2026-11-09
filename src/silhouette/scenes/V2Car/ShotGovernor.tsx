/**
 * Shot 2 — GOVERNOR (scene-local 147–293, song 97.48–102.35). [21] "and the speed is a tier, so I crawled in first gear."
 * Dead-centre one-point perspective down the highway, from behind and above his capsule. Ahead, TENURE's speed governor
 * spans the road: a monumental black beam with a giant dial whose arc is almost all red — the plan stops the needle at
 * 20 ("SPEED · TIER 1"). It trembles against the stop, then sags on "crawled". His black pod (red iris on its tail,
 * the frost-white seat glowing through the glass) creeps up the centre lane while other capsules stream past on both
 * sides as long trails of white light, one on every beat, and vanish under the gantry toward the horizon.
 * The line is lit on the beam itself, either side of the dial: AND THE SPEED / IS A TIER, | SO I CRAWLED / IN FIRST GEAR.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {makeSilhouetteMaterial} from '../../lib/Silhouette';
import {LaserLines} from '../../lib/sets';
import type {LaserSegment} from '../../lib/sets/LaserLines';
import {BEATS, bassAt, beatAt, clamp01, noise1} from '../../../lib/time';
import {guyShiver, guySitOn, mergePose, mixPose} from '../../../lib/characters/Guy';
import {Capsule, CAPSULE} from './Capsule';
import {Highway} from './Highway';
import {GovernorGantry} from './Governor';
import {placeWords, rowWidth} from './lyric';
import {TCUT, W} from './timing';

const FOV = cameraFovForVisible(22);
const CRAWL = 1.6; // m/s
const GANTRY_Z = -52;
const DIAL_Y = 8.0;
const RADIUS = 5;
const EM = 1.5;
const STREAK_V = 48; // m/s
const LANES = [3.6, -3.6, 7.2, -7.2, -3.6, 7.2, 3.6, -7.2];
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/** the passing capsules: one per beat, alternating lanes */
const PASSES = BEATS.filter((b) => b > TCUT.governor - 2.2 && b < TCUT.pillar + 0.3).map((tb, k) => ({tb, x: LANES[k % LANES.length]}));

const Streaks: React.FC<{t: number; camZ: number}> = ({t, camZ}) => {
  const pods = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.66, 3.0, 6, 16);
    g.rotateX(Math.PI / 2);
    g.scale(1.3, 1.0, 1.0);
    const m = makeSilhouetteMaterial(S.void, null, true);
    const im = new THREE.InstancedMesh(g, m, 24);
    im.frustumCulled = false;
    return im;
  }, []);
  useLayoutEffect(() => () => {
    pods.geometry.dispose();
    (pods.material as THREE.Material).dispose();
  }, [pods]);
  const live = PASSES.map((p) => ({x: p.x, z: camZ - STREAK_V * (t - p.tb)})).filter((p) => p.z < camZ + 25 && p.z > -900);
  const segs: LaserSegment[] = [];
  for (const p of live) {
    for (const s of [-0.62, 0.62]) {
      const y = 0.62;
      const z0 = p.z + 2.05;
      const parts = [0, 4, 10, 18, 30];
      for (let k = 0; k < parts.length - 1; k++) {
        segs.push([[p.x + s, y, z0 + parts[k]], [p.x + s, y, z0 + parts[k + 1]], [1, 0.62, 0.34, 0.14][k]]);
      }
    }
  }
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    live.slice(0, 24).forEach((p, i) => {
      m.makeTranslation(p.x, 0.82, p.z);
      pods.setMatrixAt(i, m);
    });
    pods.count = Math.min(24, live.length);
    pods.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <primitive object={pods} />
      <LaserLines segments={segs} color={S.bone} intensity={1.25} width={0.07} minPx={1.6} halo={3} fog={0.35} maxHdr={1.4} />
    </>
  );
};

export const ShotGovernor: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const lt = t - TCUT.governor;
  const zCar = -CRAWL * lt;
  const camZ = zCar + 17;
  // the needle: pinned against the stop (20), trembling; it sags on "crawled"
  const sag = smooth((t - W.crawled) / 0.5);
  const speed = 19.5 - 8 * sag + 0.45 * noise1(t * 9, 3) + 0.25 * beatAt(t).pulse;
  const pose = mixPose(
    mergePose(guySitOn(CAPSULE.seatH), {torsoBend: 0.08, armL: {shoulderX: 0.95, shoulderZ: 0.12, shoulderY: 0.25, elbow: 0.75, swing: 0}, armR: {shoulderX: 0.95, shoulderZ: 0.12, shoulderY: 0.25, elbow: 0.75, swing: 0}}),
    mergePose(guyShiver(t), guySitOn(CAPSULE.seatH)),
    0.6,
  );
  // the line, lit on the beam either side of the dial
  const lay = useMemo(() => {
    const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]];
    const bw = Math.max(...rows.map((r) => rowWidth(21, r, EM)));
    const xc = RADIUS * 1.12 + 1.1 + bw / 2;
    const y0 = 0.24 * EM;
    const y1 = y0 - 1.18 * EM;
    const perWord = placeWords(21, EM, [
      {words: rows[0], x: -xc, y: y0}, {words: rows[1], x: -xc, y: y1},
      {words: rows[2], x: xc, y: y0}, {words: rows[3], x: xc, y: y1},
    ]);
    return {perWord, beamW: 2 * (xc + bw / 2 + 1.3)};
  }, []);
  return (
    <SilStage fog={{color: GREYS.g3, near: 60, far: 750}} camera={{far: 2500}}>
      <CameraRig position={[0, 3.0, camZ]} target={[0, 1.86, camZ - 77]} fov={FOV} />
      <Highway time={t} zNear={40} zFar={-900} gantries={false} pulse={bass} horizon={0.7} horizonY={6} horizonH={60}
        sky={0.09} wet={{reflectivity: 0.8, puddles: 0.18, streak: 2.0}} />
      <GovernorGantry time={t} position={[0, DIAL_Y, GANTRY_Z]} speed={speed} limit={20} redPulse={bass} beamW={lay.beamW}
        radius={RADIUS} height={DIAL_Y}>
        <WorldLyric line={21} time={t} mode="screen" size={EM} position={[0, 0, 0.06]} perWord={lay.perWord}
          until={TCUT.pillar + 0.05} intensity={1.0} halo={0.18} />
      </GovernorGantry>
      <Streaks t={t} camZ={camZ} />
      <Capsule time={t} position={[0, 0, zCar]} rotation-y={Math.PI} seatGlow={1} iris={0.9 + 0.1 * bass} headlights={1}
        cabinGlow={0.3} rim={{color: S.bone, strength: 0.6, power: 6, dir: [0, 1]}}>
        <SilGuy position={CAPSULE.seatRoot} pose={pose} />
      </Capsule>
    </SilStage>
  );
};
