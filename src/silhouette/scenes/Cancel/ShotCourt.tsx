// Cancel · shot A — 137.53 → 142.86. Line 32: "They passed 'Click to Cancel,' and a court said no,"
// A vast dark court seen from the gallery. Through a colossal portal, bright haze; in front of it a RING of eight tall
// black lecterns (the faceless judges) stands on a floor inlaid with a circle of light. In the centre, on a slender black
// plinth just higher than he can reach, one red button — "Click to Cancel". He walks up to it, back to us, hammer in his
// right hand, and reaches up for it. The line is the court's inscription, carved in light into the frieze over the
// portal in two columns either side of the court's seal (the gavel's axis stays clear of words). On "and a court" the
// lecterns' red eyes open one by one and a colossal gavel lowers out of the dark down that axis; on "said" it slams
// down onto the button and every light in the hall dies. Only the inscription is left burning: "…SAID NO,".
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {Silhouette} from '../../lib/Silhouette';
import {Iris} from '../../lib/Iris';
import {WorldLyric, measureLyric} from '../../lib/WorldLyric';
import {Backlight, FogLayers, LightPool, WetGround} from '../../lib/atmos';
import {HeldSilHammer, GlowBillboard} from '../../lib/props';
import {concreteMat, wboxMinMax, mergeBoxes} from '../../lib/sets';
import {bassAt} from '../../../lib/time';
import {guyWalk, guyIdle, mixPose, mergePose} from '../../../lib/characters/Guy';
import {ShotProps, VoidFloor, Instances, prog, easeInOut, easeOut, easeIn, smooth, mix, mixV, pulseAfter, V3} from './common';
import {T, L, SHOTS} from './timing';

export const FOG_A = {color: GREYS.g2, near: 30, far: 260};

const WALL_Z = -26; // front face of the far wall
const PORTAL = {w: 36, h: 9.4};
/** the frieze beam's half-width: wider than the portal so the split inscription keeps a wide margin on the stone */
const FRIEZE_HW = PORTAL.w / 2 + 5;
const RING = {r: 12.5, cz: -2.5, angles: [14, 31, 48, 65]}; // lectern ring (degrees, mirrored)
const PLINTH = {w: 0.6, h: 1.68, d: 0.6, cap: 0.92};
const BUTTON_Y = PLINTH.h + 0.08; // top of the cap = base of the dome
const GAVEL = {r: 0.72, len: 3.5, handle: 2.1};
const GUY_STOP: V3 = [0.62, 0, 0.34];
const GUY_START: V3 = [1.05, 0, 5.4]; // off the plinth's line of sight so the two silhouettes never merge
/** facing: π = away from camera; turned toward the plinth at the end so the reaching arm reads in near-profile */
const GUY_TURN = 0.62;

// ------------------------------------------------------------------------------------------------ architecture
/** The far wall with the portal opening and the frieze beam (front face at z = 0 of this group). */
const HallWall: React.FC = () => {
  const geo = useMemo(() => {
    const W = 90, H = 46, th = 3;
    const ow = PORTAL.w / 2;
    return mergeBoxes([
      wboxMinMax([-W, 0, -th], [-ow, H, 0]),
      wboxMinMax([ow, 0, -th], [W, H, 0]),
      wboxMinMax([-ow, PORTAL.h, -th], [ow, H, 0]),
      // the frieze beam stands proud of the wall
      wboxMinMax([-FRIEZE_HW, PORTAL.h + 0.3, 0], [FRIEZE_HW, PORTAL.h + 6.2, 0.6]),
      // portal jambs (deep reveal)
      wboxMinMax([-ow - 1.4, 0, 0], [-ow, PORTAL.h + 0.3, 0.6]),
      wboxMinMax([ow, 0, 0], [ow + 1.4, PORTAL.h + 0.3, 0.6]),
    ]);
  }, []);
  return <mesh geometry={geo} material={concreteMat({color: GREYS.g4, ambient: 0.05, kind: 'wall'})} />;
};

const box = (min: V3, max: V3, rotX = 0, pivot: V3 = [0, 0, 0]) => {
  const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  g.translate((min[0] + max[0]) / 2 - pivot[0], (min[1] + max[1]) / 2 - pivot[1], (min[2] + max[2]) / 2 - pivot[2]);
  if (rotX) g.rotateX(rotX);
  g.translate(pivot[0], pivot[1], pivot[2]);
  return g;
};

/**
 * One lectern (a judge): stepped base, a tapering shaft, a slanted reading desk that overhangs the front, and a tall
 * wide back like a high-backed chair, with the eye at its top. Front = +Z. ~8.4 m.
 */
const lecternGeometry = () => {
  const shaft = new THREE.CylinderGeometry(0.42, 0.62, 4.6, 4, 1);
  shaft.rotateY(Math.PI / 4);
  shaft.scale(1.25, 1, 0.95);
  shaft.translate(0, 0.8 + 2.3, 0);
  const parts = [
    box([-1.25, 0, -1.15], [1.25, 0.4, 1.15]),
    box([-0.95, 0.4, -0.85], [0.95, 0.8, 0.85]),
    shaft,
    box([-1.15, 5.35, -0.7], [1.15, 5.75, 0.7]),
    // the slanted desk overhanging the front (the court looks down)
    box([-1.4, 5.75, -0.75], [1.4, 5.9, 1.25], -0.25, [0, 5.75, -0.75]),
    // the tall back: as wide as the desk (a narrow back made the lectern read as a cross), stepped crown
    box([-1.12, 5.6, -0.95], [1.12, 8.0, -0.6]),
    box([-0.78, 8.0, -0.92], [0.78, 8.42, -0.63]),
  ];
  const flat = parts.map((p) => p.toNonIndexed());
  const g = mergeGeometries(flat, false)!;
  [...parts, ...flat].forEach((p) => p.dispose());
  return g;
};

type LecternSlot = {pos: V3; rotY: number; rank: number};
const SLOTS: LecternSlot[] = (() => {
  const out: LecternSlot[] = [];
  RING.angles.forEach((deg, rank) => {
    for (const s of [-1, 1]) {
      const a = (s * deg * Math.PI) / 180;
      out.push({pos: [RING.r * Math.sin(a), 0, RING.cz - RING.r * Math.cos(a)], rotY: -a, rank});
    }
  });
  return out;
})();
const IRIS_LOCAL: V3 = [0, 7.25, -0.58];

const Lecterns: React.FC = () => {
  const geo = useMemo(lecternGeometry, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: S.void, fog: true}), []);
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  const matrices = useMemo(
    () => SLOTS.map((s) => new THREE.Matrix4().compose(new THREE.Vector3(...s.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rotY), new THREE.Vector3(1, 1, 1))),
    [],
  );
  return <Instances geometry={geo} material={mat} matrices={matrices} />;
};

/** a thin ring of light inlaid in the floor (the court's circle), plus the inner circle round the plinth */
const FloorRings: React.FC<{k: number}> = ({k}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true}), []);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.color.set(S.bone).multiplyScalar(0.55 * k);
  });
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh material={mat} position={[0, -RING.cz, 0.006]}>
        <ringGeometry args={[RING.r - 2.0, RING.r - 1.88, 160]} />
      </mesh>
      <mesh material={mat} position={[0, -RING.cz, 0.006]}>
        <ringGeometry args={[RING.r + 1.6, RING.r + 1.66, 160]} />
      </mesh>
      <mesh material={mat} position={[0, 0, 0.006]}>
        <ringGeometry args={[2.9, 2.96, 96]} />
      </mesh>
    </group>
  );
};

/** The red "Click to Cancel" button on its slender plinth. `lit` 0..1, `crushed` 0..1. */
const ButtonPlinth: React.FC<{lit: number; pulse: number; crushed: number}> = ({lit, pulse, crushed}) => {
  const domeMat = useMemo(() => new THREE.MeshBasicMaterial({fog: true}), []);
  const black = useMemo(() => new THREE.MeshBasicMaterial({color: S.void, fog: true}), []);
  useLayoutEffect(() => () => {
    domeMat.dispose();
    black.dispose();
  }, [domeMat, black]);
  // capped at 1: brighter authRed tone-maps toward orange (ACES), so the throb lives mostly in the glow
  const k = lit * (0.82 + 0.18 * pulse);
  useLayoutEffect(() => {
    domeMat.color.set(S.authRed).multiplyScalar(Math.max(0.07, Math.min(1, k)));
  });
  const squash = 1 - 0.85 * crushed;
  return (
    <group>
      {/* stepped foot, slender shaft, a wider cap */}
      <mesh material={black} position={[0, 0.1, 0]} scale={[1.3, 0.2, 1.3]}>
        <boxGeometry />
      </mesh>
      <mesh material={black} position={[0, PLINTH.h / 2, 0]} scale={[PLINTH.w, PLINTH.h, PLINTH.d]}>
        <boxGeometry />
      </mesh>
      <mesh material={black} position={[0, PLINTH.h + 0.04, 0]} scale={[PLINTH.cap, 0.08, PLINTH.cap]}>
        <boxGeometry />
      </mesh>
      <mesh position={[0, BUTTON_Y, 0]} scale={[1, 0.55 * squash, 1]} material={domeMat}>
        <sphereGeometry args={[0.3, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {lit > 0.01 ? (
        <GlowBillboard color={S.authRed} intensity={0.42 * lit * (1 + 0.6 * pulse) * (1 - crushed)} size={1.4} falloff={2.6} position={[0, BUTTON_Y + 0.1, -0.35]} />
      ) : null}
    </group>
  );
};

/** The court's gavel: a barrel head along X with flared caps and two bands; a short handle up into the dark. */
const Gavel: React.FC<{position: V3; tilt: number}> = ({position, tilt}) => (
  <group position={position} rotation-x={tilt}>
    <Silhouette rim={{color: S.bone, strength: 0.6, power: 6, dir: [0, 1]}}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[GAVEL.r, GAVEL.r, GAVEL.len * 0.78, 40]} />
        <meshBasicMaterial />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* flared striking faces */}
          <mesh rotation-z={(s * Math.PI) / 2} position={[s * GAVEL.len * 0.43, 0, 0]}>
            <cylinderGeometry args={[GAVEL.r * 0.98, GAVEL.r * 1.18, GAVEL.len * 0.1, 40]} />
            <meshBasicMaterial />
          </mesh>
          <mesh rotation-z={Math.PI / 2} position={[s * GAVEL.len * 0.25, 0, 0]}>
            <cylinderGeometry args={[GAVEL.r * 1.1, GAVEL.r * 1.1, 0.18, 40]} />
            <meshBasicMaterial />
          </mesh>
        </group>
      ))}
      <mesh position={[0, GAVEL.handle / 2 + GAVEL.r * 0.7, 0]}>
        <cylinderGeometry args={[0.17, 0.24, GAVEL.handle, 24]} />
        <meshBasicMaterial />
      </mesh>
      <mesh position={[0, GAVEL.handle + GAVEL.r * 0.7 + 0.12, 0]}>
        <sphereGeometry args={[0.24, 20, 12]} />
        <meshBasicMaterial />
      </mesh>
    </Silhouette>
  </group>
);

// ------------------------------------------------------------------------------------------------ the gavel's path
const gavelAt = (t: number): {pos: V3; tilt: number} => {
  const restY = BUTTON_Y + 0.05 + GAVEL.r; // contact: the head crushes the dome
  const highY = 4.45;
  if (t < T.and) return {pos: [0, 30, 0], tilt: 0};
  if (t < T.court + 0.1) {
    // lowers out of the dark
    const u = easeOut(prog(t, T.and, T.court + 0.1));
    return {pos: [0, mix(16, highY, u), 0], tilt: mix(0.0, -0.1, u)};
  }
  if (t < T.blow) {
    // the wind-up: lifts and tilts back
    const u = smooth(prog(t, T.court + 0.1, T.blow));
    return {pos: [0, highY + 0.55 * u, -0.35 * u], tilt: -0.1 - 0.25 * u};
  }
  // the blow (3 frames), then it rests on the crushed button
  const u = easeIn(prog(t, T.blow, T.contact));
  return {pos: [0, mix(highY + 0.55, restY, u), mix(-0.35, 0, u)], tilt: mix(-0.35, 0.03, u)};
};

// ------------------------------------------------------------------------------------------------ the shot
// The gavel lowers straight down the axis in front of the frieze, so the inscription is split around that axis: two
// columns either side of the court's seal, read row by row: THEY PASSED · CLICK TO CANCEL, / AND A COURT · SAID NO,.
// The clear gap is wider than the gavel's head projected onto the frieze (head ±1.68 m at z 0, seen from the camera's
// ~33 m → ±3.0 m at the wall), so no word is covered at any point of its descent.
const FRIEZE_Y = PORTAL.h + 3.98; // baseline of row 0 (row 1 is 1.83 m lower)
const FRIEZE_GAP = 3.8; // half-width of the clear axis between the columns (m)
const FRIEZE_LEFT = [[0, 1], [5, 6, 7]]; // right-aligned to −FRIEZE_GAP
const FRIEZE_RIGHT = [[2, 3, 4], [8, 9]]; // left-aligned to +FRIEZE_GAP
const SEAL_Y = PORTAL.h + 3.275; // the seal sits midway between the incised rules
/** em: 1.55 m (cap ≈ 31–36 px), shrunk only if the installed font's widest column would leave < 15 % of the beam */
const LYRIC_EM = (() => {
  const col = Math.max(...[FRIEZE_LEFT, FRIEZE_RIGHT].flatMap((rows) => measureLyric(L.court, 1, undefined, {rows}).rowWidths));
  return Math.min(1.55, (0.85 * FRIEZE_HW - FRIEZE_GAP) / col);
})();

export const ShotCourt: React.FC<ShotProps> = ({t, f}) => {
  const dark = t >= T.strike;
  const bass = bassAt(f);
  // camera: from the gallery, a slow symmetrical push-in; held still from the blow on
  const u = easeInOut(prog(Math.min(t, T.strike), SHOTS.court.t0, T.strike));
  const cam = mixV([0, 5.3, 41], [0, 4.8, 33], u);
  const target: V3 = [0, 5.4, WALL_Z];

  // the Guy walks up the axis to the plinth, stops, reaches up for the button with his left hand
  const walkEnd = T.and + 0.3;
  const wu = prog(t, SHOTS.court.t0, walkEnd);
  const gp = mixV(GUY_START, GUY_STOP, wu);
  const turn = GUY_TURN * smooth(prog(t, walkEnd - 0.6, walkEnd + 0.1));
  const stop = smooth(prog(t, walkEnd - 0.5, walkEnd + 0.15));
  const reach = smooth(prog(t, walkEnd - 0.05, T.court + 0.1));
  const flinch = smooth(prog(t, T.blow, T.contact + 0.02));
  const base = mixPose(guyWalk(t, 0.98), guyIdle(t, 3), stop);
  const pose = mergePose(base, {
    headPitch: mix(0.02, -0.42, reach),
    headYaw: 0.25 * reach,
    lean: -0.04 * reach,
    torsoTwist: 0.12 * reach,
    armL: {
      shoulderX: mix(0.05, 2.2, reach) - 1.0 * flinch, shoulderZ: mix(0.15, 0.22, reach), shoulderY: 0.05,
      elbow: mix(0.25, 0.1, reach) + 0.9 * flinch, wristZ: -0.35 * reach, grip: mix(0.5, 0.05, reach), swing: 1 - reach,
    },
  });

  // the button: lights as the law passes, throbs on the sung words, dies under the gavel
  const lit = prog(t, T.passed, T.passed + 0.08);
  const pulse = Math.max(pulseAfter(t, T.click, 5), pulseAfter(t, T.cancel, 4), 0.6 * pulseAfter(t, T.passed, 5));
  const gav = gavelAt(t);
  const crushed = prog(t, T.contact - 0.035, T.contact);

  // the frieze: after the blow the earlier words dim, the verdict "SAID NO," stays burning
  const perWord = (i: number) => (dark && i < 8 ? {opacity: 0.42} : {});

  const portalI = 0.7 + 0.1 * bass;
  return (
    <>
      <CameraRig position={cam} target={target} fov={cameraFovForVisible(24)} />
      {/* the inscription: carved in light into the frieze over the portal, two columns either side of the gavel's axis;
          CANCEL in solid red (additive red on the lit stone tone-maps coral) */}
      <WorldLyric line={L.court} time={t} mode="light" size={LYRIC_EM} intensity={1.15} halo={0.3} redFill={1} rows={FRIEZE_LEFT} align="right"
        anchor="baseline" position={[-FRIEZE_GAP, FRIEZE_Y, WALL_Z + 0.62]} perWord={perWord} />
      <WorldLyric line={L.court} time={t} mode="light" size={LYRIC_EM} intensity={1.15} halo={0.3} redFill={1} rows={FRIEZE_RIGHT} align="left"
        anchor="baseline" position={[FRIEZE_GAP, FRIEZE_Y, WALL_Z + 0.62]} perWord={perWord} />
      {dark ? (
        <>
          <WetGround size={[150, 150]} position={[0, 0, -16]} reflectivity={0.9} puddles={0.9} streak={0.5} color={GREYS.g1} time={t} />
          <VoidFloor />
        </>
      ) : (
        <>
          <group position={[0, 0, WALL_Z]}>
            <HallWall />
          </group>
          {/* incised rules framing the inscription */}
          {[PORTAL.h + 0.95, PORTAL.h + 5.6].map((y) => (
            <mesh key={y} position={[0, y, WALL_Z + 0.61]}>
              <planeGeometry args={[2 * FRIEZE_HW - 1.9, 0.07]} />
              <meshBasicMaterial color={S.bone} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
          {/* the court's seal on the axis, in the gap between the inscription's columns (the gavel passes over it) */}
          {[1.95, 1.7].map((r) => (
            <mesh key={r} position={[0, SEAL_Y, WALL_Z + 0.61]}>
              <ringGeometry args={[r - 0.035, r + 0.035, 120]} />
              <meshBasicMaterial color={S.bone} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
          {/* the bright haze beyond the portal (all of it behind the wall plane): brightest at the floor */}
          <Backlight position={[0, 2.6, WALL_Z - 34]} size={[80, 11]} shape="slab" softness={1} intensity={portalI} noise={0.2} time={t} />
          <Backlight position={[0, 6, WALL_Z - 60]} size={[130, 34]} shape="radial" softness={1} intensity={0.3} noise={0.25} time={t} />
          <FogLayers position={[0, 0, WALL_Z - 1]} count={6} near={1} far={30} width={52} height={11} color={S.fog} density={0.12} time={t} seed={4} />
          {/* a faint grazing light on the frieze stone so the beam reads as architecture */}
          <Backlight position={[0, PORTAL.h + 3.2, WALL_Z + 0.65]} size={[46, 8]} shape="slab" softness={1} intensity={0.06} noise={0.3} time={t} />
          <Lecterns />
          {SLOTS.map((s, i) => {
            const open = smooth(prog(t, T.and + 0.1 * s.rank, T.and + 0.1 * s.rank + 0.4));
            const p = new THREE.Vector3(...IRIS_LOCAL).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rotY).add(new THREE.Vector3(...s.pos));
            return open > 0.001 ? (
              <Iris key={i} position={[p.x, p.y, p.z + 0.02]} rotation-y={s.rotY} radius={0.42} open={open} pupil={0.26} intensity={1.35} time={t + i * 0.7} glow={0.7} />
            ) : null;
          })}
          <FloorRings k={1} />
          {/* the light pool round the plinth (from an oculus far above, unseen) */}
          <LightPool position={[0, 0, 0.2]} radius={3.2} intensity={0.8} haze={0.16} hazeHeight={4.5} breakup={0.25} />
          <ButtonPlinth lit={lit} pulse={pulse} crushed={crushed} />
          <Gavel position={gav.pos} tilt={gav.tilt} />
          <SilGuy pose={pose} position={gp} rotation-y={Math.PI + turn} rim={{color: S.bone, strength: 0.5, power: 6, dir: [0, 1]}} rightHand={<HeldSilHammer warmth={0.2} />} />
          <WetGround size={[150, 150]} position={[0, 0, -16]} reflectivity={0.9} puddles={0.9} streak={0.5} color={GREYS.g2} time={t} />
          <VoidFloor />
        </>
      )}
    </>
  );
};
