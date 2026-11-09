/**
 * The flip phone held at the ear so it actually READS on screen: the lib's HeldPhone orientation, but a touch bigger
 * (chunky 2002 phone), pushed off the cheek toward the jaw, plus a helper giving the world position of its glowing
 * green screen (for a glow sprite / spill light).
 */
import React from 'react';
import * as THREE from 'three';
import {FlipPhone} from '../../lib/props';
import {guyJointMatrix, GuyPose} from '../../lib/characters/Guy';
import type {V3} from './common';

/** same basis as lib/props/Held PHONE_ROT: phone X -> grip +Z, phone Y -> grip -Y (fingertips), phone Z (screen) -> grip +X (cheek) */
const PHONE_ROT = (() => {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0));
  const e = new THREE.Euler().setFromRotationMatrix(m);
  return [e.x, e.y, e.z] as V3;
})();

export const EAR_SCALE = 1.3;
export const EAR_OFFSET: V3 = [-0.06, 0.04, 0.03];
/** cartoon cheat: the phone is turned ~70° about its long axis so its back (external LCD) faces forward, not edge-on */
export const EAR_TILT: V3 = [0, -1.2, -0.3];

export const EarPhone: React.FC<React.ComponentProps<typeof FlipPhone> & {tilt?: V3; off?: V3}> = ({tilt = EAR_TILT, off = EAR_OFFSET, ...props}) => (
  <group position={off} rotation={tilt}>
    <group rotation={PHONE_ROT} scale={EAR_SCALE}>
      <FlipPhone {...props} />
    </group>
  </group>
);

/** world position of the open phone's screen for a Guy at (pos, yaw) in pose */
export const earPhoneScreen = (pose: GuyPose, pos: V3, yaw: number): V3 => {
  const local = new THREE.Vector3(0.01, -0.089 * EAR_SCALE, 0)
    .applyEuler(new THREE.Euler(...EAR_TILT))
    .add(new THREE.Vector3(...EAR_OFFSET));
  const v = local.applyMatrix4(guyJointMatrix(pose, 'gripR', {R: true}));
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [pos[0] + v.x * c + v.z * s, pos[1] + v.y, pos[2] - v.x * s + v.z * c];
};
