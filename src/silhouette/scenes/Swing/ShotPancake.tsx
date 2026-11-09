/**
 * Shot 2 — PANCAKE (scene-local 81–129, song 131.03–132.66). "Pancake ate till he'd had enough."
 * Floor level (0.3 m), long lens, looking straight into the broken front of the box: the interior blazes dawnGold, light
 * pours out along the floor toward us, kibble still falls like gold sparks onto the glowing heap. Pancake stands in
 * profile in front of it, head down in the heap, eating; his tail WAGS — the first time in the film — a black curl
 * against the gold. A slow, low lateral drift. The line rises in the warm air above the box, word by word, like embers.
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilPancake} from '../../lib/SilCast';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {Backlight} from '../../lib/atmos';
import {CellRoom} from '../../lib/sets';
import {pancakeEat} from '../../../lib/characters/Pancake';
import {PANCAKE} from '../../../lib/characters/Pancake';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {BrokenBox, PILE, V3} from './common';
import {LyricRows} from './LyricRows';
import {CUT, SCENE_FROM, boxState, TCUT} from './timing';

const s01 = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

export const ShotPancake: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const f = abs - SCENE_FROM;
  const st = boxState(abs);
  const bass = bassAt(abs);
  const u = s01(f, CUT.pancake, CUT.stand);

  // camera: low, long lens, square on to the box's broken front (+X side), drifting slowly across
  const camZ = lerp(0.66, 0.44, u);
  const cam: V3 = [5.2, 0.3, camZ];
  const tgt: V3 = [-0.2, 0.44, camZ - 0.05];

  // Pancake eats at the heap facing +Z (profile to this camera), head in the kibble in front of the open box
  const pose = {...pancakeEat(t, 2), tailWagAmount: 1, earPerk: 0.15};
  const dogPos: V3 = [PILE[0] + 0.02, 0, PILE[2] - PANCAKE.noseEatLocal[2]];
  const gold = st.spill;

  return (
    // tighter bloom: the blazing interior card sits right behind his head, and the default wide bloom (radius 0.6) spread
    // over his whole body, veiling him brown (RGB ≈ 40–67) instead of void. A short radius keeps the glow on the light.
    <SilStage fog={{color: GREYS.g2, near: 9, far: 40}} bloom={{strength: 0.6, radius: 0.12}}>
      <CameraRig position={cam} target={tgt} fov={cameraFovForVisible(16)} />
      <CellRoom time={t} hideWalls={['right', 'ceiling']} hide={['printer', 'page', 'bed', 'pillow', 'blanket', 'facade', 'outside', 'vent']}
        windowLight={{intensity: 0.55, dir: [0, -0.45, -1]}} slit={0.55} doorLeak={0.35} doorIris={{intensity: 0.35}} ambient={0.04}>
        {/* front={0}: the forward light cone is additive haze between the lens and the dog; it veiled him brown */}
        <BrokenBox t={t} abs={abs} front={0} />
        <SilPancake pose={pose} position={dogPos} rotation-y={0} rim={{color: S.dawnGold, strength: 0.35, power: 7, dir: [-0.55, 0.55]}} />
        {/* the box's light fills the haze behind it: a low gold aura the dog is cut out against */}
        <Backlight position={[-1.25, 0.5, 0.42]} rotation-y={Math.PI / 2} size={[3.0, 1.5]} shape="radial" softness={0.9}
          color={S.dawnGold} intensity={(0.5 + 0.05 * bass) * gold} time={t} />
        {/* the line rises in the warm air over the box, word by word, like embers */}
        <group position={[-0.55, 1.0, 0.3]} rotation-y={Math.PI / 2}>
          <LyricRows line={29} time={t} rows={[[0, 1], [2, 3, 4, 5]]} size={0.11} mode="light" color={S.dawnGold} intensity={1.0}
            halo={0.4} until={TCUT.stand + 0.2}
            fx={(i, info) => ({offset: [0, 0.03 * Math.max(0, info.since), 0], opacity: clamp01(info.since / 0.05)})} />
        </group>
      </CellRoom>
    </SilStage>
  );
};
