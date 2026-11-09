// Shared bits for the Chorus1 shots.
import React from 'react';
import * as THREE from 'three';
import type {StageProps} from '../../../lib/three';
import {clamp01} from '../../../lib/time';
import {K} from '../timing';
import type {HouseDecoProps} from '../HouseDeco';

export type V3 = [number, number, number];
export type ShotProps = {f: number; af: number; lf: number};
export type ShotDef = {
  id: string;
  from: number;
  to: number;
  /** 3D content (inside the scene's single <Stage>) */
  Scene: React.FC<ShotProps>;
  /** optional 2D HTML layer above the Stage */
  Over?: React.FC<ShotProps>;
  /** optional CSS for the main Stage canvas (split screen: shift + clip), from the shot-local frame */
  stageStyle?: (f: number) => React.CSSProperties;
  stage?: Partial<Omit<StageProps, 'children'>>;
};

export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIn = (x: number) => Math.pow(clamp01(x), 3);
export const mix3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** House decoration state as a function of the scene-local frame (wrap happens on "whole house"). */
export const decoAt = (lf: number, t: number): HouseDecoProps => ({
  wrap: clamp01((lf - (K.whole - 6)) / 22),
  bow: clamp01((lf - (K.house - 2)) / 14),
  tag: clamp01((lf - (K.house - 8)) / 24),
  lock: clamp01((lf - (K.house + 14)) / 14),
  t,
  lockShake: 0,
});

export type CamState = {pos: V3; target: V3; fov: number; roll: number};
const _projCam = new THREE.PerspectiveCamera(50, 1920 / 1080, 0.1, 500);
const _v = new THREE.Vector3();
/** world point -> screen px (1920x1080) for a CameraRig-style camera (lookAt + roll). Pure. */
export const projectPx = (p: V3, c: CamState): [number, number, boolean] => {
  _projCam.fov = c.fov;
  _projCam.position.set(...c.pos);
  _projCam.up.set(0, 1, 0);
  _projCam.lookAt(...c.target);
  if (c.roll) _projCam.rotateZ(c.roll);
  _projCam.updateMatrixWorld(true);
  _projCam.updateProjectionMatrix();
  _v.set(...p).project(_projCam);
  return [((_v.x + 1) / 2) * 1920, ((1 - _v.y) / 2) * 1080, _v.z < 1];
};
