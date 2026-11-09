// Atmos look-dev: one cinematic shot per atmosphere component (src/silhouette/lib/atmos), 30 frames each.
//   node scripts/still.mjs silplay Atmos --frames=15,45,75,105,135,165,195,225,255,285,315,345,375,405
//   shot  frames    component
//   0     0–29      Backlight 'radial' (monumental: pillars, layered haze, tiny figures)
//   1     30–59     Backlight 'slab'   (horizon band behind a distant skyline)
//   2     60–89     Backlight 'vertical' (+core: a doorway of light in a black wall)
//   3     90–119    FogLayers          (a crowd receding into layered haze: depth)
//   4     120–149   LightShaft         (the single overhead light, with dust: Hold)
//   5     150–179   LightShaft red     (drone searchlight cones sweeping a plaza)
//   6     180–209   ScannerSweep + ScanLine (red fan swinging through him, line crossing the wall)
//   7     210–239   BlindsLight + BlindShafts (V1Bedroom key light, red scan sliding through the slats)
//   8     240–269   SilRain            (hard rain: bright on dark, dark on the backlight, splashes)
//   9     270–299   WetGround          (Reflector: iris + screens mirrored in wet concrete)
//   10    300–329   Motes              (ash flakes + dust drifting through a window shaft)
//   11    330–359   LightPool red      (under the feeder monolith, Pancake looking up)
//   12    360–389   LightPool gold     (FINAL ONLY: Pancake eats from his bowl in a pool of dawnGold)
//   13    390–419   BlindShafts        (looking back toward the blinds: slatted volumetric beams + floor stripes)
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SilStage, CameraRig} from '../lib/SilStage';
import {SilGuy, SilPancake} from '../lib/SilCast';
import {Silhouette} from '../lib/Silhouette';
import {Iris} from '../lib/Iris';
import {S, GREYS, SFONTS, cameraFovForVisible} from '../lib/palette';
import {Letterbox} from '../overlays/SilOverlays';
import {guyIdle, guyWalk} from '../../lib/characters/Guy';
import {pancakeBeg, pancakeEat, pancakeIdle, pancakeSad, pancakeWalk, PANCAKE} from '../../lib/characters/Pancake';
import {DogBowl} from '../../lib/props/DogBowl';
import {beatAt, rand} from '../../lib/time';
import {
  Backlight, FogLayers, LightShaft, ScannerSweep, ScanLine, BlindsLight, BlindShafts, SilRain, WetGround, Motes, LightPool,
} from '../lib/atmos';

export const duration = 420;
const SHOT = 30;

const LABELS = [
  'Backlight · radial', 'Backlight · slab', 'Backlight · vertical + core', 'FogLayers', 'LightShaft · overhead + dust',
  'LightShaft · red drone cones', 'ScannerSweep + ScanLine', 'BlindsLight + BlindShafts', 'SilRain', 'WetGround (Reflector)',
  'Motes', 'LightPool · red', 'LightPool · dawnGold', 'BlindShafts · toward the window',
];

const Ground: React.FC<{color?: string}> = ({color = S.void}) => (
  <mesh rotation-x={-Math.PI / 2}>
    <planeGeometry args={[400, 400]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

const Block: React.FC<{size: [number, number, number]; position: [number, number, number]; color?: string}> = ({size, position, color = S.void}) => (
  <mesh position={[position[0], position[1] + size[1] / 2, position[2]]}>
    <boxGeometry args={size} />
    <meshBasicMaterial color={color} />
  </mesh>
);

const NOWAG = {tailWagAmount: 0};
const rimTop = {color: S.bone, strength: 0.9, power: 6, dir: [0, 1] as [number, number]};

const Shot: React.FC<{i: number; t: number; f: number}> = ({i, t}) => {
  const fov = (v: number) => cameraFovForVisible(v);
  switch (i) {
    // ------------------------------------------------------------------ 0 Backlight radial
    case 0:
      return (
        <SilStage fog={{color: S.ash, near: 20, far: 120}}>
          <CameraRig position={[0, 1.0, 26]} target={[0, 3.4, 0]} fov={fov(22)} />
          <Ground />
          <Backlight position={[0, 3.5, -45]} size={[46, 32]} shape="radial" softness={1} noise={0.2} time={t} />
          <Block size={[7, 46, 7]} position={[-12, 0, -16]} />
          <Block size={[7, 46, 7]} position={[12, 0, -16]} />
          <FogLayers position={[0, 0, -0.6]} near={0.5} far={44} count={9} width={90} height={18} density={0.12} time={t} />
          <SilGuy pose={guyWalk(t)} rotation-y={Math.PI / 2} position={[-0.6 + t * 0.4, 0, 0]} />
          <SilPancake pose={{...pancakeWalk(t), ...NOWAG}} rotation-y={Math.PI / 2} position={[0.4 + t * 0.4, 0, 0.3]} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 1 Backlight slab
    case 1: {
      // a skyline only at the frame edges + low far blocks in the centre, so the slab band reads across the horizon
      const towers = Array.from({length: 22}, (_, k) => {
        const side = k < 11 ? -1 : 1;
        const j = k % 11;
        const x = side * (16 + j * 4.6 + rand(`tw${k}`) * 2);
        const h = 10 + rand(`th${k}`) * 26 + j * 1.5;
        return <Block key={k} size={[3 + rand(`tw2${k}`) * 3, h, 4]} position={[x, 0, -60 - rand(`tz${k}`) * 8]} />;
      });
      const low = Array.from({length: 9}, (_, k) => (k >= 3 && k <= 5 ? null : (
        <Block key={`l${k}`} size={[2 + rand(`lw${k}`) * 4, 1 + rand(`lh${k}`) * 3.5, 3]} position={[(k - 4) * 3.4 + rand(`lx${k}`) * 1.5, 0, -70]} />
      )));
      return (
        <SilStage fog={{color: S.ash, near: 30, far: 140}}>
          <CameraRig position={[0, 0.3, 30]} target={[0, 1.4, 0]} fov={fov(16)} />
          <Ground />
          <Backlight position={[0, 2.5, -80]} size={[220, 13]} shape="slab" softness={0.9} core={0.3} time={t} />
          <Backlight position={[0, 6, -82]} size={[150, 44]} shape="radial" softness={1} intensity={0.3} time={t} />
          {towers}
          {low}
          <FogLayers position={[0, 0, 26]} near={4} far={95} count={9} width={160} height={14} color={GREYS.g6} density={0.07} time={t} />
          <SilGuy pose={guyIdle(t)} rotation-y={Math.PI} position={[-0.35, 0, 0]} />
          <SilPancake pose={{...pancakeIdle(t), sit: 1, ...NOWAG}} rotation-y={Math.PI + 0.5} position={[0.45, 0, 0.1]} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 2 Backlight vertical (door)
    case 2:
      return (
        <SilStage fog={{color: GREYS.g2, near: 10, far: 60}}>
          <CameraRig position={[0, 1.35, 11]} target={[0, 1.45, -3]} fov={fov(19)} />
          <Ground />
          <Backlight position={[0, 1.8, -6]} size={[3.4, 7]} shape="vertical" softness={0.85} core={0.3} time={t} />
          {/* black wall with a 1.3 × 2.5 m door opening */}
          <Block size={[12, 9, 0.4]} position={[-6.65, 0, -3]} />
          <Block size={[12, 9, 0.4]} position={[6.65, 0, -3]} />
          <Block size={[1.3, 6.5, 0.4]} position={[0, 2.5, -3]} />
          <LightShaft from={[0, 1.3, -2.75]} to={[0, 0.4, 5]} radiusStart={0.7} radiusEnd={2.2} intensity={0.06} softness={2.0} falloff={1.8} time={t} />
          <FogLayers position={[0, 0, 6]} near={8.7} far={14} count={6} width={20} height={8} color={GREYS.g6} density={0.08} time={t} />
          <SilGuy pose={guyIdle(t)} position={[0.2, 0, -2.4]} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 3 FogLayers (crowd depth)
    case 3: {
      const crowd: React.ReactNode[] = [];
      const rows = [-3, -9, -16, -25, -36, -50];
      rows.forEach((z, r) => {
        const n = 3 + r;
        for (let k = 0; k < n; k++) {
          const x = (k - (n - 1) / 2) * (2.2 + r * 0.5) + (rand(`cx${r}${k}`) - 0.5) * 0.8;
          crowd.push(<SilGuy key={`${r}-${k}`} pose={guyIdle(t + k * 0.7 + r, r * 10 + k)} rotation-y={Math.PI} position={[x, 0, z]} />);
        }
      });
      return (
        <SilStage fog={{color: S.ash, near: 25, far: 130}}>
          <CameraRig position={[0, 1.7, 20]} target={[0, 1.5, -20]} fov={fov(17)} />
          <Ground />
          <Backlight position={[0, 6, -85]} size={[170, 40]} shape="slab" softness={1} intensity={0.95} time={t} />
          <FogLayers position={[0, 0, 18]} near={13.5} far={100} count={11} width={110} height={22} density={0.14} time={t * 2} pulse={0.2} />
          {crowd}
          <SilGuy pose={guyWalk(t)} position={[0.6, 0, 6 - t * 0.9]} rotation-y={0} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 4 LightShaft overhead (Hold)
    case 4:
      return (
        <SilStage fog={{color: GREYS.g1, near: 12, far: 60}}>
          <CameraRig position={[0, 1.4, 15]} target={[0, 2.6, 0]} fov={fov(25)} />
          <Ground />
          <LightShaft from={[0, 13, -0.4]} to={[0, 0, 0]} radiusStart={0.3} radiusEnd={1.45} intensity={0.95} dust={420} falloff={0.6} time={t + 3} />
          <LightPool radius={1.7} intensity={0.55} haze={0} softness={0.8} />
          <SilGuy pose={{...guyIdle(t), headPitch: -0.25}} position={[0, 0, 0]} rim={{...rimTop, strength: 1.1}} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 5 LightShaft red drone cones
    case 5: {
      const cones = [
        {from: [-7, 11, -5] as const, to: [-1.8 + Math.sin(t * 0.8) * 2.5, 0, 0.5] as const},
        {from: [0.5, 12, -8] as const, to: [0.2 + Math.sin(t * 0.6 + 2) * 0.6, 0, 0] as const},
        {from: [8, 10.5, -6] as const, to: [4.5 + Math.sin(t * 0.7 + 4) * 2, 0, -1.5] as const},
      ];
      return (
        <SilStage fog={{color: S.ash, near: 14, far: 90}}>
          <CameraRig position={[0, 2.0, 26]} target={[0, 3.2, 0]} fov={fov(26)} />
          <Ground />
          <Backlight position={[0, 5, -40]} size={[70, 30]} shape="radial" softness={1} intensity={0.22} time={t} />
          {cones.map((c, k) => (
            <group key={k}>
              <LightShaft from={[...c.from]} to={[...c.to]} radiusStart={0.1} radiusEnd={1.35} color={S.authRed} intensity={1.05} source={1.1}
                dust={120} seed={k + 3} time={t} />
              <Block size={[0.7, 0.18, 0.7]} position={[c.from[0], c.from[1] + 0.05, c.from[2]]} />
            </group>
          ))}
          <FogLayers position={[0, 0, 22]} near={22.8} far={62} count={8} width={80} height={16} color={GREYS.g6} density={0.1} time={t} />
          <SilGuy pose={guyIdle(t)} position={[-0.2, 0, 0]} rotation-y={0.4} rim={{color: S.authRed, strength: 0.9, power: 5, dir: [0, 1]}} />
          <SilPancake pose={{...pancakeSad(t), ...NOWAG}} position={[0.7, 0, 0.3]} rotation-y={-Math.PI / 2 + 0.3} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 6 ScannerSweep + ScanLine
    case 6: {
      const ang = Math.sin(t * 1.4 + 0.6) * 0.42;
      return (
        <SilStage fog={{color: GREYS.g2, near: 10, far: 60}}>
          <CameraRig position={[0, 1.6, 13]} target={[0, 2.3, -2]} fov={fov(26)} />
          <Ground />
          <mesh position={[0, 6, -4]}>
            <planeGeometry args={[40, 12]} />
            <meshBasicMaterial color={GREYS.g3} />
          </mesh>
          <Backlight position={[0, 2.2, -3.95]} size={[12, 7]} shape="radial" softness={1} intensity={0.55} time={t} />
          <ScanLine position={[0, 3, -3.97]} width={18} height={6} progress={0.25 + t * 0.25} />
          <ScannerSweep origin={[0, 6.6, -1]} angle={ang} span={0.3} length={7.2} lead={Math.sign(Math.cos(t * 1.4 + 0.6))} time={t} />
          <Block size={[0.8, 0.25, 0.4]} position={[0, 6.55, -1]} />
          <FogLayers position={[0, 0, 10]} near={11.4} far={13.7} count={4} width={24} height={9} color={GREYS.g6} density={0.08} time={t} />
          <SilGuy pose={guyIdle(t)} position={[0, 0, -1]} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 7 BlindsLight + BlindShafts
    case 7: {
      const scan = ((t + 0.4) * 0.55) % 1.3 - 0.15;
      return (
        <SilStage fog={{color: GREYS.g1, near: 8, far: 40}}>
          <CameraRig position={[3.4, 1.45, 7.5]} target={[-0.6, 1.35, -1.6]} fov={fov(30)} />
          <Ground />
          {/* back wall + left wall (the window is in the left wall, off frame) */}
          <mesh position={[0, 3, -3]}>
            <planeGeometry args={[14, 6]} />
            <meshBasicMaterial color={GREYS.g2} />
          </mesh>
          <BlindsLight position={[-0.15, 1.15, -2.98]} scale-x={-1} width={3.1} height={2.3} slats={10} angle={0.16} scan={scan} time={t} />
          <BlindShafts position={[-3.2, 1.7, -0.4]} rotation-y={Math.PI / 2} width={2.6} height={2.2} slats={10} angle={0.16} scan={scan}
            direction={[0.85, -0.2, 1]} length={3.2} intensity={0.4} />
          <Motes position={[-1.6, 0.6, -1.1]} area={[3.0, 1.9, 2.2]} count={200} size={0.008} time={t} intensity={1.2} drift={[0.02, 0.03, 0]} />
          <Block size={[2.1, 0.55, 1.0]} position={[1.6, 0, -2.3]} />
          <SilGuy pose={guyIdle(t)} position={[0.2, 0, -2.0]} rotation-y={-Math.PI / 2} />
          <SilPancake pose={{...pancakeIdle(t), sit: 1, ...NOWAG}} position={[-0.8, 0, -2.5]} rotation-y={Math.PI / 2} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 8 SilRain
    case 8:
      return (
        <SilStage fog={{color: S.ash, near: 16, far: 80}}>
          <CameraRig position={[0, 0.38, 16]} target={[0, 1.4, 0]} fov={fov(24)} />
          <Ground />
          <Backlight position={[4.5, 4, -24]} size={[20, 15]} shape="slab" softness={0.75} time={t} />
          <Backlight position={[-8, 3, -26]} size={[16, 10]} shape="radial" softness={1} color={S.fog} intensity={0.25} time={t} />
          <SilRain time={t + 5} area={[22, 11, 26]} position={[0, 0, 0]} count={4200} />
          <FogLayers position={[0, 0, 12]} near={4} far={40} count={7} width={50} height={12} color={GREYS.g6} density={0.09} time={t} />
          <SilGuy pose={{...guyIdle(t), headPitch: -0.3}} position={[1.1, 0, 0]} rotation-y={-0.25} />
          <SilPancake pose={{...pancakeSad(t), ...NOWAG}} position={[2.0, 0, 0.3]} rotation-y={-Math.PI / 2 - 0.25} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 9 WetGround
    case 9: {
      const bass = 0.5 + 0.5 * beatAt(60 + t).pulse;
      return (
        <SilStage fog={{color: S.ash, near: 18, far: 110}}>
          <CameraRig position={[0, 0.85, 22]} target={[0, 2.6, -10]} fov={fov(22)} />
          <WetGround puddles={0.5} ripple={0.25} time={t} />
          <Backlight position={[0, 7, -70]} size={[110, 40]} shape="radial" softness={1} intensity={0.45} time={t} />
          <Block size={[60, 26, 2]} position={[0, 0, -38]} color={S.void} />
          <Iris position={[0, 7.5, -36.8]} radius={4.2} time={t} intensity={1.5 + 0.3 * bass} />
          <Backlight position={[-11, 7, -36.8]} size={[7, 11]} shape="slab" softness={0.12} intensity={1.25} time={t} />
          <Backlight position={[11, 7, -36.8]} size={[7, 11]} shape="slab" softness={0.12} intensity={1.25} time={t} />
          <FogLayers position={[0, 0, 18]} near={19} far={58} count={8} width={90} height={16} density={0.1} time={t} />
          <LightShaft from={[5, 14, -24]} to={[2.8 + Math.sin(t * 0.7) * 0.3, 0, -6]} radiusStart={0.1} radiusEnd={1.1} color={S.authRed}
            intensity={1.05} source={1.1} time={t} />
          <SilGuy pose={guyWalk(t)} rotation-y={Math.PI / 2} position={[-1.4 + t * 0.4, 0, 0]} />
          <SilPancake pose={{...pancakeWalk(t), ...NOWAG}} rotation-y={Math.PI / 2} position={[-2.4 + t * 0.4, 0, 0.5]} />
        </SilStage>
      );
    }
    // ------------------------------------------------------------------ 10 Motes
    case 10:
      return (
        <SilStage fog={{color: S.ash, near: 12, far: 70}}>
          <CameraRig position={[0, 1.5, 11]} target={[0, 2.4, 0]} fov={fov(28)} />
          <Ground />
          <Backlight position={[0, 4, -22]} size={[34, 20]} shape="radial" softness={1} intensity={0.8} time={t} />
          <LightShaft from={[-7, 10, -7]} to={[0.6, 0, 0]} radiusStart={0.9} radiusEnd={2.3} intensity={0.45} softness={1.8} time={t} />
          <Motes area={[16, 8, 12]} count={1600} color={GREYS.g3} blending="normal" size={0.03} drift={[0.25, -0.12, 0.05]} wander={0.4}
            intensity={0.9} time={t + 4} seed={2} />
          <Motes position={[-0.9, 0, -1.4]} area={[5, 4.4, 4.4]} count={600} size={0.009} intensity={1.4} time={t} seed={3} />
          <SilGuy pose={{...guyIdle(t), headPitch: 0.35}} position={[0.3, 0, 0]} rotation-y={-0.5} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 11 LightPool red (feeder)
    case 11:
      return (
        <SilStage fog={{color: GREYS.g2, near: 10, far: 60}}>
          <CameraRig position={[3.6, 0.32, 10]} target={[0.4, 1.35, 0]} fov={fov(22)} />
          <Ground />
          <Backlight position={[1, 2.4, -12]} size={[30, 14]} shape="radial" softness={1} intensity={0.75} time={t} />
          <Block size={[1.5, 3.4, 1.0]} position={[0, 0, -0.6]} />
          <Iris position={[0, 2.35, -0.09]} radius={0.24} time={t} intensity={1.7} />
          <LightPool position={[0.7, 0, 0.9]} radius={2.0} color={S.authRed} intensity={1.3} haze={0.7} hazeHeight={2.4} hazeRadius={0.85} />
          <FogLayers position={[0, 0, 7]} near={2} far={20} count={7} width={30} height={9} color={GREYS.g6} density={0.07} time={t} />
          <SilPancake pose={{...pancakeBeg(t), ...NOWAG}} position={[1.75, 0, 1.6]} rotation-y={-1.85} />
        </SilStage>
      );
    // ------------------------------------------------------------------ 12 LightPool gold (FINAL ONLY)
    case 12:
      return (
        <SilStage fog={{color: GREYS.g2, near: 10, far: 60}}>
          <CameraRig position={[0, 0.55, 6]} target={[0, 0.45, 0]} fov={fov(22)} />
          <Ground />
          <Backlight position={[0, 1.6, -12]} size={[22, 9]} shape="radial" softness={1} color={S.dawnGold} intensity={0.55} time={t} />
          <LightPool radius={1.5} color={S.dawnGold} intensity={1.5} haze={0.55} />
          <Motes area={[3, 2, 3]} count={180} size={0.007} color={S.dawnGold} intensity={1.3} time={t} drift={[0.02, 0.04, 0]} />
          <SilPancake pose={pancakeEat(t)} rotation-y={Math.PI / 2} position={[-PANCAKE.bowl[2], 0, 0]} />
          <Silhouette position={[0, 0, 0]}>
            <DogBowl fill={0.6} />
          </Silhouette>
        </SilStage>
      );
    // ------------------------------------------------------------------ 13 BlindShafts toward the window
    case 13: {
      const scan = ((t + 0.2) * 0.6) % 1.4 - 0.2;
      const slats = Array.from({length: 10}, (_, k) => (
        <Block key={k} size={[0.03, 2.0, 0.13]} position={[-2.98, 0.7, -2.2 + (k + 0.5) * 0.24 + 0.12 - 0.12]} />
      ));
      return (
        <SilStage fog={{color: GREYS.g1, near: 6, far: 30}}>
          <CameraRig position={[3.3, 1.1, 2.7]} target={[-3, 1.4, -1.2]} fov={fov(34)} />
          <Ground />
          {/* left wall with a 2.4 × 2.0 m window (z −2.2…0.2, y 0.7…2.7), vertical slats, bright overcast outside */}
          <Block size={[0.2, 6, 8]} position={[-3.1, 0, -6.2]} color={GREYS.g1} />
          <Block size={[0.2, 6, 8]} position={[-3.1, 0, 4.2]} color={GREYS.g1} />
          <Block size={[0.2, 0.7, 2.4]} position={[-3.1, 0, -1]} color={GREYS.g1} />
          <Block size={[0.2, 3.3, 2.4]} position={[-3.1, 2.7, -1]} color={GREYS.g1} />
          {slats}
          <Backlight position={[-6, 1.7, -1]} rotation-y={Math.PI / 2} size={[7, 5]} shape="radial" softness={0.8} intensity={0.35} time={t} />
          <BlindShafts position={[-3, 1.7, -1]} rotation-y={Math.PI / 2} width={2.4} height={2.0} slats={10} gap={0.42} angle={0}
            direction={[-0.55, -0.35, 1]} length={4.6} intensity={0.6} scan={scan} />
          <BlindsLight position={[0.3, 0.003, 0.82]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} width={2.4} height={2.8} slats={10}
            angle={Math.atan(-0.55)} softness={0.25} intensity={0.6} scan={scan} edge={0.4} />
          <Motes position={[-1.3, 0.1, 0.2]} area={[3.2, 1.9, 2.4]} count={260} size={0.008} time={t} intensity={1.3} drift={[0.02, 0.03, 0]} />
          <SilGuy pose={guyIdle(t)} position={[-0.9, 0, -0.2]} rotation-y={-Math.PI / 2 - 0.4} />
        </SilStage>
      );
    }
    default:
      return null;
  }
};

export default function Atmos() {
  const f = useCurrentFrame();
  const i = Math.min(LABELS.length - 1, Math.floor(f / SHOT));
  const t = (f - i * SHOT) / 30;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shot i={i} t={t} f={f} />
      <Letterbox />
      <div style={{position: 'absolute', left: 40, top: 52, fontFamily: SFONTS.mono, fontSize: 26, letterSpacing: '0.12em', color: GREYS.g7}}>
        ATMOS · {String(i).padStart(2, '0')} · {LABELS[i].toUpperCase()}
      </div>
      {i === 12 ? (
        <div style={{position: 'absolute', right: 40, top: 52, fontFamily: SFONTS.mono, fontSize: 26, letterSpacing: '0.2em', color: S.dawnGold}}>
          FINAL ONLY
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
