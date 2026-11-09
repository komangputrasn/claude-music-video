/**
 * Held — adapters that orient the hero props for the Guy's hand GRIP FRAME (<Guy rightHand={...}/> / leftHand).
 *
 * The props are modelled in their own natural frames (Hammer: handle +Y, face +X; FlipPhone: keypad +Z, hinge +Y), while
 * the Guy rig expects: hammer handle along grip +Z with the head ~0.3 m out and the striking face toward -Y; phone long axis
 * along grip Y with the earpiece toward -Y (fingertips) and the screen facing the palm. These wrappers do that rotation so
 * scene code never has to.
 *
 *   <Guy pose={guyHammerSwing(p)} rightHand={<HeldHammer glow={0.4} />} />
 *   <Guy pose={guyPhoneToEar(t)} rightHand={<HeldPhone open={1} screenLines={['CANCEL ALL?']} />} />
 *   <Guy pose={guyHoldUp(p)} rightHand={<HeldBook />} />                       // paper 1984 held up, cover to camera
 *   <HungHammer position={BEDROOM_SPOTS.hammerHook} glow={hammerGlow} />       // resting on the bedroom wall rack
 *
 * HeldHammer props = Hammer props + `slide` (metres the hammer is pushed out along the handle; default HELD.hammerSlide).
 * HeldPhone props  = FlipPhone props. HeldBook props = Book1984 props.
 * HungHammer props = Hammer props + group props. Origin = the rest point on top of the two pegs (BEDROOM_SPOTS.hammerHook):
 *   handle horizontal along +Z (head toward +Z, i.e. toward the bedroom door), claw up, face down, wall on the -X side.
 *   For a wall facing another direction rotate the group about Y (the default suits the bedroom's left wall, normal +X).
 * HELD.hammerHead = grip-frame centre of the hammer head; HELD.hammerFace = grip-frame striking-face centre
 *   (use with guyJointMatrix(pose, 'gripR', {R: true}) to find the real impact point).
 */
import React from 'react';
import * as THREE from 'three';
import {Hammer, HAMMER} from './Hammer';
import {FlipPhone} from './FlipPhone';
import {Book1984} from './Book1984';
import type {GroupProps} from './Padlock';

type V3 = [number, number, number];
const basisEuler = (x: V3, y: V3, z: V3): V3 => {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z));
  const e = new THREE.Euler().setFromRotationMatrix(m);
  return [e.x, e.y, e.z];
};

/** hammer +Y (handle) -> grip +Z, hammer +X (face) -> grip -Y, hammer +Z -> grip -X */
const HAMMER_ROT = basisEuler([0, -1, 0], [0, 0, 1], [-1, 0, 0]);
/** phone +X -> grip +Z, phone +Y (hinge/earpiece) -> grip -Y (fingertips), phone +Z (keypad/screen) -> grip +X (palm) */
const PHONE_ROT = basisEuler([0, 0, 1], [0, -1, 0], [1, 0, 0]);

const HAMMER_SLIDE = 0.05;

export const HELD = {
  /** how far the hammer's own grip origin sits out along grip +Z (hand holds near the butt, like a real swing) */
  hammerSlide: HAMMER_SLIDE,
  /** hammer head centre in the grip frame (default slide) */
  hammerHead: [0, 0, HAMMER.headOffset[1] + HAMMER_SLIDE] as V3,
  /** striking-face centre in the grip frame (default slide) */
  hammerFace: [0, -HAMMER.faceOffset[0], HAMMER.faceOffset[1] + HAMMER_SLIDE] as V3,
  /** grip-frame position of the phone's own grip (keypad-half centre): a little toward the fingertips so the open lid reaches the ear */
  phoneOffset: [-0.018, -0.05, 0] as V3,
};

export type HeldHammerProps = React.ComponentProps<typeof Hammer> & {slide?: number};
/** Grandpa's hammer, oriented for <Guy rightHand>: handle along grip +Z, striking face toward -Y. */
export const HeldHammer: React.FC<HeldHammerProps> = ({slide = HAMMER_SLIDE, ...rest}) => (
  <group position={[0, 0, slide]} rotation={HAMMER_ROT}>
    <Hammer {...rest} />
  </group>
);

/** handle centre between the pegs (hammer-local y, between butt and head) and the handle's vertical radius */
const HUNG_MID = 0.0875, HUNG_LIFT = 0.012;
export type HungHammerProps = React.ComponentProps<typeof Hammer>;
/** Grandpa's hammer resting horizontally on two wall pegs (origin = top of the pegs, midway). Same axes as HeldHammer. */
export const HungHammer: React.FC<HungHammerProps> = ({glow, glowColor, outline, ...group}) => (
  <group {...group}>
    <group position={[0, HUNG_LIFT, -HUNG_MID]} rotation={HAMMER_ROT}>
      <Hammer glow={glow} glowColor={glowColor} outline={outline} />
    </group>
  </group>
);

export type HeldPhoneProps = React.ComponentProps<typeof FlipPhone> & {offset?: V3};
/** Flip phone, oriented for <Guy rightHand> + guyPhoneToEar(): earpiece toward the fingertips, screen toward the palm side. */
export const HeldPhone: React.FC<HeldPhoneProps> = ({offset = HELD.phoneOffset, ...props}) => (
  <group position={offset} rotation={PHONE_ROT}>
    <FlipPhone {...props} />
  </group>
);

export type HeldBookProps = React.ComponentProps<typeof Book1984>;
/**
 * Paper 1984 for guyHoldUp(): the fist grips the book's bottom edge, the book stands up toward the fingertips with its
 * cover facing grip -Z — i.e. toward the camera in front of the Guy at guyHoldUp(1) (trophy pose).
 */
export const HeldBook: React.FC<HeldBookProps> = (props) => (
  <group position={[0, 0.04, 0]} rotation={[Math.PI, 0, 0]}>
    <Book1984 {...props} />
  </group>
);
