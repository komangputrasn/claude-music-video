// TERMS — Intro, shot C (song 9.03–12.37 s, frames 271–370): the title. A monumental full-red TENURE slab stands alone
// on a wet black plaza at night, dead centre; a black city lies along a faint horizon behind it. "BUY NOW," types on letter by letter (Futura,
// void ink), a beat of silence, then "FOR NOW". On the downbeat at 11.262 s "BUY NOW," goes dark and leaves "FOR NOW"
// alone. A man and his dog, two small black shapes, stand before it. Slow push-in. Cold, silent, monumental.
import React from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy, SilPancake} from '../../lib/SilCast';
import {TenureScreen} from '../../lib/tenure';
import {CityGrid} from '../../lib/sets';
import {Backlight, WetGround} from '../../lib/atmos';
import {bassAt, lerp} from '../../../lib/time';
import {guyIdle, mergePose} from '../../../lib/characters/Guy';
import {pancakeIdle} from '../../../lib/characters/Pancake';
import {ShotProps, Ground, RIM_RED} from './common';
import {TITLE_A, TITLE_B, TITLE_DIM, TYPE_STEP, clamp01, prog, smooth} from './timing';

const VIS_FOV = 20;
const FOV = cameraFovForVisible(VIS_FOV);
const T0 = 9.033;
const T1 = 12.37;

const SCREEN_W = 66;
const SCREEN_H = 22.5;

// "BUY NOW, " = chars 0–8, "FOR NOW" = chars 9–15 (reveal counts characters across the spans, spaces included)
const PART_A = [0, 1, 2, 4, 5, 6, 7];
const PART_B = [9, 10, 11, 13, 14, 15];
const EVENTS: [number, number][] = [
  ...PART_A.map((c, j): [number, number] => [TITLE_A + j * TYPE_STEP, c + 1]),
  ...PART_B.map((c, j): [number, number] => [TITLE_B + j * TYPE_STEP, c + 1]),
];
const revealAt = (t: number) => EVENTS.reduce((n, [at, r]) => (t >= at ? Math.max(n, r) : n), 0);

const FIG_Z = 94;

export const ShotTitle: React.FC<ShotProps> = ({t, f}) => {
  const u = smooth(prog(t, T0, T1 + 0.4));
  const reveal = revealAt(t);
  const dim = t >= TITLE_DIM ? 0.14 : 1;
  const pulse = clamp01(bassAt(f) * 1.6) * 0.5;
  const content = {
    chrome: false,
    lines: [{spans: [{text: 'BUY NOW, ', opacity: dim}, {text: 'FOR NOW'}], size: 0.3, tracking: 0.2, ink: 'void' as const, weight: 500}],
  };
  return (
    <>
      <CameraRig position={[0, lerp(1.25, 1.15, u), lerp(152, 132, u)]} target={[0, lerp(8.6, 9.2, u), 0]} fov={FOV} />

      <TenureScreen
        position={[0, 0, 0]}
        width={SCREEN_W}
        height={SCREEN_H}
        background="red"
        content={content}
        reveal={reveal}
        intensity={0.95}
        pulse={pulse}
        time={t}
        haze={0.35}
        fog={0.15}
      />

      {/* a black city far behind, standing on a faint fog-lit horizon */}
      <Backlight color={S.fog} intensity={0.32} size={[2600, 150]} position={[0, 20, -640]} shape="slab" softness={0.95} noise={0.3} time={t} />
      <CityGrid position={[0, 0, -470]} rows={3} cols={15} spacing={62} seed={9} height={[30, 95]} footprint={[20, 40]} jitter={0.3} centreBoost={0} color={GREYS.g1} glass={GREYS.g0} ambient={0.05} litFraction={0} />

      {/* the man and his dog, small and still before it (backs to us; hood up; tail still) */}
      <SilGuy pose={mergePose(guyIdle(t, 2), {headPitch: -0.22})} hood={1} rim={RIM_RED} rotation-y={Math.PI} position={[-0.55, 0, FIG_Z]} />
      <SilPancake
        pose={{...pancakeIdle(t, 3), sit: 1, headPitch: 0.35, earPerk: -0.3, tailWagAmount: 0}}
        rim={RIM_RED}
        rotation-y={-Math.PI / 2 - 0.12}
        position={[0.8, 0, FIG_Z - 0.1]}
      />

      <WetGround size={[700, 360]} position={[0, 0, 120]} color={GREYS.g1} reflectivity={0.85} puddles={0.55} time={t} seed={2} />
      <Ground />
    </>
  );
};
