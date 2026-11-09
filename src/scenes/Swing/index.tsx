/**
 * SWING (frames 3850–4126, 128.34–137.53 s) — "One swing, and the lid flew off, / Pancake ate till he'd had enough. /
 * I picked up the phone with the hammer in my hand, / I'm cancelling every last thing on a plan."
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SmashShot} from './SmashShot';
import {PancakeShot} from './PancakeShot';
import {PhoneShot} from './PhoneShot';
import {CancelShot} from './CancelShot';
import {SHOT} from './common';

export const Swing: React.FC = () => {
  const f = useCurrentFrame();
  let body: React.ReactNode = null;
  if (f < SHOT.smash[1]) body = <SmashShot f={f} />;
  else if (f < SHOT.pancake[1]) body = <PancakeShot f={f} />;
  else if (f < SHOT.phone[1]) body = <PhoneShot f={f} />;
  else body = <CancelShot f={f} />;
  return <AbsoluteFill style={{background: '#000'}}>{body}</AbsoluteFill>;
};
