/**
 * The cast as pure silhouettes (DESIGN-silhouette §3). They reuse the Y2K rigs and every pose helper unchanged:
 * import poses from '../../lib/characters/Guy' and '../../lib/characters/Pancake' as usual.
 *
 *   <SilGuy pose={guyWalk(t)} hood?={1} rim?={{color: S.bone, dir: [0, 1]}} color?={S.void}
 *           rightHand?={<SilHammer/>} leftHand?={…} {...group}/>
 *     hood   1 = hood UP (default; most of the film), 0 = hood DOWN (Final chorus: the spiky hair silhouette is revealed).
 *            Values in between fold the hood back over the head (animate 1 → 0 over ~0.6 s).
 *     rim    optional thin edge light in the scene's light colour (see <Silhouette>). Never thick.
 *     Hand props are rendered as silhouettes too, unless they opt out with userData.silKeep (e.g. SilKeep, Iris).
 *
 *   <SilPancake pose={pancakeBeg(t)} rim? color? {...group}/>
 *     Keep him in profile or three-quarter view: his floppy ears + curly tail are the most recognisable shape in the film.
 *     Tail is the barometer of hope: tailWagAmount 0 in the verses, wag only after the hammer (Swing onwards).
 *
 * Both hide the rigs' ink outlines and blob shadows. Faces never appear: everything is flat void.
 */
import React from 'react';
import * as THREE from 'three';
import {Guy, GuyPose, guyJointMatrix, GUY_COLORS} from '../../lib/characters/Guy';
import {Pancake, PancakePose} from '../../lib/characters/Pancake';
import {getGuyGeometry} from '../../lib/characters/guy/geometry';
import {Silhouette, RimOpts} from './Silhouette';
import {S} from './palette';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

// ------------------------------------------------------------------------------------------------ hood geometry
// Built in HEAD-local space (origin = head centre, +Z = face direction, head radius 0.156).
const buildHood = () => {
  // Cowl: a close-fitting shell only ~2 cm off the skull at the sides/top, deeper at the back, its front rim just
  // proud of the face so the profile shows a recessed face line. A soft crown point and a back drape that flows into
  // the shoulders make it read as a HOOD (not a helmet) from every angle.
  const shell = new THREE.SphereGeometry(0.176, 20, 14);
  shell.scale(1.0, 1.04, 1.08);
  shell.translate(0, 0.012, -0.012);
  // crown point (hoodie hoods peak slightly at the back-top)
  const peak = new THREE.ConeGeometry(0.11, 0.16, 12, 1);
  peak.rotateX(-0.95);
  peak.translate(0, 0.12, -0.09);
  // back drape: hood fabric falling from the back of the head onto the shoulders (hides the neck in profile)
  const drapePts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    drapePts.push(new THREE.Vector2(0.15 + 0.11 * k * k, 0.02 - 0.34 * k));
  }
  const drape = new THREE.LatheGeometry(drapePts, 16, Math.PI * 0.55, Math.PI * 0.9);
  drape.scale(1.0, 1.0, 0.85);
  drape.translate(0, 0, -0.05);
  return {shell, drape, peak};
};
let hoodGeo: ReturnType<typeof buildHood> | null = null;
const getHood = () => (hoodGeo ??= buildHood());

export type SilGuyProps = GroupProps & {
  pose?: GuyPose;
  hood?: number;
  rim?: RimOpts | false | null;
  color?: string;
  fog?: boolean;
  opacity?: number;
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
};

export const SilGuy: React.FC<SilGuyProps> = ({pose = {}, hood = 1, rim = null, color = S.void, fog = true, opacity = 1, rightHand, leftHand, ...group}) => {
  const G = getGuyGeometry({...GUY_COLORS});
  const H = getHood();
  const holding = {L: leftHand != null, R: rightHand != null};
  const headM = guyJointMatrix(pose, 'head', holding);
    const h = Math.max(0, Math.min(1, hood));
  const up = h > 0.02;
  // fold the hood back around a pivot behind/below the head as it comes down
  const fold = (1 - h) * 1.9;
  const hideFn = (m: THREE.Mesh) => {
    const g = m.geometry;
    if (h > 0.5) return g === G.spikes || g === G.hairCap || g === G.hoodRing || g === G.hoodBack || g === G.ear || g === G.nose;
    return false;
  };
  return (
    <group {...group}>
      <Silhouette color={color} rim={rim} fog={fog} opacity={opacity} hide={hideFn}>
        <Guy pose={pose} shadow={false} rightHand={rightHand} leftHand={leftHand} />
        {up ? (
          <group matrix={headM} matrixAutoUpdate={false}>
            <group position={[0, -0.12, -0.14]} rotation={[-fold, 0, 0]}>
              <group position={[0, 0.12, 0.14]} scale={0.8 + 0.2 * h}>
                <mesh geometry={H.shell} />
                <mesh geometry={H.peak} />
                <mesh geometry={H.drape} />
              </group>
            </group>
          </group>
        ) : null}
      </Silhouette>
    </group>
  );
};

export type SilPancakeProps = GroupProps & {
  pose?: PancakePose;
  rim?: RimOpts | false | null;
  color?: string;
  fog?: boolean;
  opacity?: number;
};

export const SilPancake: React.FC<SilPancakeProps> = ({pose, rim = null, color = S.void, fog = true, opacity = 1, ...group}) => (
  <group {...group}>
    <Silhouette color={color} rim={rim} fog={fog} opacity={opacity}>
      {/* eyes/tear/blush become void anyway; keep tear 0 so nothing drips off the outline */}
      <Pancake pose={{...(pose ?? {}), tear: 0, blush: 0}} shadow={false} />
    </Silhouette>
  </group>
);
