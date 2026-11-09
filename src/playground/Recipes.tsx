/**
 * Recipes playground — renders the "Recipes" section of src/lib/INDEX.md verbatim-ish, so the documented snippets are
 * known to compile and to look right.
 *   0–59    10.1 Guy swings grandpa's hammer at the feeder (HeldHammer + guyHammerSwing, Feeder at GUY.hammerImpact,
 *           KibbleBurst from FEEDER.hopperCenter). Impact at frame 12.
 *   60–119  10.2 Pancake eating from the bowl (DogBowl at PANCAKE.bowl inside Pancake's group).
 *   120–179 10.8 pop-up storm in 3D (PopupTunnel3D + Popup3D + Stamp3D + Cursor3D on the Y2K blue).
 *   180–299 10.10 chrome hero word synced to lyric [12] "Buy now ... for now" via wordTime() + useAbsoluteFrame()
 *           (SceneStart fakes the scene's song offset so local frame 190 ≈ the sung "Buy").
 *   node scripts/still.mjs play Recipes --frames=6,12,20,45,90,150,175,192,215,240,246,290
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {ChromeText, SparkleField} from '../lib/three';
import {ramp, popIn, lerp, beatAt, useAbsoluteFrame, SceneStart} from '../lib/time';
import {wordTime} from '../lib/lyrics';
import {C} from '../lib/palette';
import {Guy, GUY, guyHammerSwing} from '../lib/characters/Guy';
import {Pancake, PANCAKE, pancakeEat} from '../lib/characters/Pancake';
import {Feeder, FEEDER, HeldHammer, KibbleBurst, DogBowl} from '../lib/props';
import {PopupTunnel3D, Popup3D, POPUP_MESSAGES, Stamp3D, Cursor3D, popupButton3D, clickAt} from '../lib/ui';

export const duration = 300;
type V3 = [number, number, number];

const Lights: React.FC = () => (
  <>
    <hemisphereLight args={['#dfefff', '#4a3a6a', 0.9]} />
    <directionalLight position={[2.5, 4, 3]} intensity={2.1} color="#fff4e6" />
    <directionalLight position={[-3, 2.5, -3]} intensity={1.1} color="#7fd8ff" />
  </>
);

/** 10.1 — hammer meets feeder */
const HammerSmash: React.FC<{f: number}> = ({f}) => {
  const p = ramp(f, 0, 24, (x) => x);
  return (
    <>
      <CameraRig position={f < 30 ? [2.3, 1.2, 2.1] : [1.6, 0.9, 2.4]} target={[0.15, 0.6, 0.45]} fov={44} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[4, 48]} /><meshToonMaterial color="#7e6aa8" /></mesh>
      <group position={[0.4, 0, 0]} rotation={[0, -0.5, 0]}>
        <Guy pose={guyHammerSwing(p)} rightHand={<HeldHammer glow={0.4} />} />
        <group position={[GUY.hammerImpact[0], 0, GUY.hammerImpact[2]]}>
          <Feeder smashed={ramp(f, 12, 24)} lid={1.5 * ramp(f, 12, 16)} lidFly={ramp(f, 14, 50)} lcdText="ERR" kibbleFill={0.3} />
          <KibbleBurst progress={ramp(f, 12, 100, (x) => x)} origin={FEEDER.hopperCenter} count={220} spread={0.9} />
        </group>
      </group>
    </>
  );
};

/** 10.2 — Pancake eating from the bowl */
const PancakeEats: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const spot: V3 = [0, 0, 0];
  return (
    <>
      <CameraRig position={[spot[0] + 0.55, spot[1] + 0.45, spot[2] + 1.45]} target={[spot[0], spot[1] + 0.25, spot[2] + 0.3]} fov={40} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[4, 48]} /><meshToonMaterial color="#c9a27a" /></mesh>
      <group position={spot} rotation={[0, 0.4, 0]}>
        <Pancake pose={pancakeEat(t)} />
        <DogBowl position={PANCAKE.bowl} fill={1 - ramp(f, 0, 60)} />
      </group>
    </>
  );
};

/** 10.8 — pop-up storm in 3D */
const PopupStorm3D: React.FC<{f: number}> = ({f}) => {
  const spec = POPUP_MESSAGES[2];
  const btn = popupButton3D(spec, 1, 2.2);
  return (
    <>
      <CameraRig position={[0, 0, 4]} target={[0, 0, -10]} fov={60} />
      <hemisphereLight args={['#dff2ff', '#20307a', 1.1]} />
      <PopupTunnel3D frame={f} count={56} radius={3.6} near={2} speed={0.3} width={2.2} length={44} position={[0, 0, -2]}
        pulse={beatAt(f / 30).pulse} />
      <Popup3D spec={spec} width={2.2} pr={3} sheen={lerp(-0.2, 1.2, ramp(f, 10, 28, (x) => x))}>
        <Stamp3D progress={ramp(f, 40, 54, (x) => x)} width={1.5} position={[0, 0, 0.06]} />
        <Cursor3D kind="hand" size={0.5} position={[btn[0], btn[1], btn[2] + 0.1]} click={clickAt(f, 30)} />
      </Popup3D>
    </>
  );
};

/** 10.10 — chrome hero word on the sung word (needs the SONG frame: useAbsoluteFrame) */
const HeroWord: React.FC = () => {
  const af = useAbsoluteFrame();
  const tBuy = wordTime(12, 'buy') * 30;
  const tFor = wordTime(12, 'for') * 30;
  const flip = ramp(af, tFor - 4, tFor + 4);
  return (
    <>
      <CameraRig position={[0, 1.6, 6]} target={[0, 1.5, 0]} fov={40} />
      <group rotation={[flip * Math.PI, 0, 0]} position={[0, 1.6, 0]}>
        <ChromeText text="BUY NOW" visible={flip < 0.5} size={0.7} anchor="center" shine={ramp(af, tBuy, tBuy + 20)}
          perLetter={(i) => { const k = popIn(af, tBuy - 3 + i * 1.5, 10); return {scale: k, position: [0, (1 - k) * 2, 0]}; }} />
        <group rotation={[Math.PI, 0, 0]} visible={flip >= 0.5}><ChromeText text="FOR NOW" size={0.7} anchor="center" material="gold" /></group>
      </group>
      <SparkleField count={24} area={[5, 1.5, 0.5]} time={af / 30} position={[0, 1.6, 0.3]} />
    </>
  );
};
/** song frame of local frame 190 ≈ the sung "Buy" of line 12 */
const HERO_FROM = Math.round(wordTime(12, 'buy') * 30) - 190;

export default function RecipesPlayground() {
  const f = useCurrentFrame();
  let body: React.ReactNode;
  let bg = '#2a4bb8';
  if (f < 60) body = (<><Lights /><HammerSmash f={f} /></>);
  else if (f < 120) body = (<><Lights /><PancakeEats f={f - 60} /></>);
  else if (f < 180) { bg = C.y2kBlue; body = <PopupStorm3D f={f - 120} />; }
  else { bg = C.y2kBlue; body = <SceneStart from={HERO_FROM}><HeroWord /></SceneStart>; }
  return (
    <AbsoluteFill>
      <Stage background={bg} env="chrome" fog={f >= 120 && f < 180 ? {color: C.y2kBlue, near: 10, far: 46} : undefined}>
        {body}
      </Stage>
    </AbsoluteFill>
  );
}
