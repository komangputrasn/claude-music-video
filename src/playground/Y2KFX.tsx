/**
 * Playground: the Y2K FX kit in five shots (frames):
 *   0-89    TITLE   chrome "BUY NOW, / FOR NOW" slams in letter by letter on a Y2K sky + sunburst + god rays + neon grid,
 *                   lens flare and sparkles, shine sweep. Camera pushes in.
 *   90-149  VARIANTS 3/4 low angle: gold / candy / aqua / iridescent words over the scrolling grid.
 *   150-209 WARP    starfield warp + wire tunnel + speed lines + "LOADING..." chrome.
 *   210-269 RAIN    night street: rain + splashes under a sodium flare, ruby "WHO?".
 *   270-329 PARTY   confetti burst with chrome stars, sunset "GOOD FOR NOW", sparkles, flare.
 *   330-389 LEGEND  dark room, god rays from above onto a gold relic, glow aura, sparkles, slow push-in.
 *   node scripts/still.mjs play Y2KFX --frames=12,40,80,110,140,170,200,235,300,360
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, Easing} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {ChromeText, measureChromeText} from '../lib/three/ChromeText';
import {SparkleField, Sparkle, LensFlare, LightRays, Sunburst, Starfield, WireGrid, WireTunnel, SpeedLines, Confetti, Rain, SkyDome, Glow, Swoosh} from '../lib/three/fx';
import {glowMat, goldMat} from '../lib/three/materials';
import {popIn, ramp, lerp, clamp01} from '../lib/time';
import {C} from '../lib/palette';

export const duration = 390;
const FPS = 30;

const TITLE = 'BUY NOW,\nFOR NOW';
const TITLE_SIZE = 0.78;
const titleM = measureChromeText(TITLE, {size: TITLE_SIZE, anchor: 'center'});

const TitleShot: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const push = ramp(f, 0, 89, Easing.out(Easing.cubic));
  // slam: each letter drops from the camera with overshoot, 2 frames apart
  const slam = (i: number) => popIn(f, 4 + i * 2.2, 13);
  const allIn = popIn(f, 30, 10);
  const top = titleM.letters[titleM.letters.length - 1];
  return (
    <>
      <CameraRig position={[lerp(-0.6, 0.15, push), lerp(1.2, 1.55, push), lerp(9.5, 6.6, push)]} target={[0, 1.55, 0]} fov={42} roll={lerp(-0.05, 0, push)} />
      <SkyDome preset="y2k" />
      <Sunburst position={[0, 1.6, -9]} radius={16} rays={20} rotation2d={t * 0.25} colorA="#3f86ff" colorB="#1E5BFF" center="#8fd0ff" glow={0.3} />
      <LightRays position={[0, 9, -5]} length={12} radius={6} count={16} time={t} color="#fff4d6" endColor="#9fd8ff" intensity={0.3} />
      <WireGrid offset={t * 3} color="#FF4FB8" fill="#0b1468" horizon="#4B9BFF" fadeNear={3} fadeFar={34} major={4} />
      <group position={[0, 1.55, 0]}>
        <ChromeText
          text={TITLE}
          size={TITLE_SIZE}
          anchor="center"
          outline={{thickness: 0.03, color: '#06103a'}}
          shine={ramp(f, 40, 70)}
          rotation={[0, Math.sin(t * 1.1) * 0.06, 0]}
          perLetter={(i) => {
            const k = slam(i);
            return {position: [0, 0, (1 - k) * 6], rotation: [(1 - k) * 1.4, (1 - k) * 0.6, 0], scale: Math.max(0.001, 0.4 + 0.6 * k)};
          }}
        />
        <Swoosh position={[0, -titleM.height / 2 + 0.25, 0.5]} radius={[titleM.width * 0.62, 0.55]} arc={[-2.8, -0.25]} width={0.2} progress={ramp(f, 32, 52)} />
        <SparkleField count={34} seed={3} area={[titleM.width + 1.5, titleM.height + 1, 1.2]} time={t} size={0.28} intensity={2.4 * allIn} />
        <Sparkle position={[top.center[0] + 0.45, top.center[1] + 0.35, 0.4]} size={0.9 * allIn} time={t} intensity={3} />
      </group>
      <LensFlare position={[3.6, 4.2, -2]} intensity={0.25 + 0.75 * allIn} rotation={t * 0.35} />
    </>
  );
};

const VariantShot: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const k = ramp(f, 0, 59, Easing.inOut(Easing.sin));
  const words: {text: string; mat: 'gold' | 'candy' | 'aqua' | 'iridescent'; y: number; font: 'Impact' | 'ArialBlack' | 'TrebuchetBoldItalic' | 'VerdanaBold'}[] = [
    {text: 'GOLD MEMBER', mat: 'gold', y: 3.1, font: 'Impact'},
    {text: 'Candy Plus', mat: 'candy', y: 2.15, font: 'TrebuchetBoldItalic'},
    {text: 'AQUA TIER', mat: 'aqua', y: 1.2, font: 'VerdanaBold'},
    {text: 'HOLO PASS', mat: 'iridescent', y: 0.25, font: 'ArialBlack'},
  ];
  return (
    <>
      <CameraRig position={[lerp(5.2, 3.6, k), lerp(0.6, 1.0, k), lerp(5.2, 6.4, k)]} target={[0, 1.6, 0]} fov={46} roll={0.04} />
      <SkyDome preset="y2k" stripes={60} />
      <WireGrid offset={t * 3} color="#19C6FF" fill="#0b1468" horizon="#4B9BFF" fadeNear={3} fadeFar={30} major={4} />
      {words.map((w, i) => (
        <ChromeText key={w.text} text={w.text} material={w.mat} font={w.font} size={0.6} position={[0, w.y, 0]}
          iriPhase={t * 0.3} shine={ramp(f, 10 + i * 8, 40 + i * 8)}
          perLetter={(j, n) => ({position: [0, Math.sin(t * 4 - j * 0.5) * 0.06, 0], rotation: [0, 0, Math.sin(t * 4 - j * 0.5) * 0.03]})} />
      ))}
      <SparkleField count={40} seed={9} area={[7, 4, 2]} position={[0, 1.8, 0.5]} time={t} size={0.22} />
      <LensFlare position={[3.5, 4.8, -3.5]} intensity={0.7} rotation={t * 0.3} />
    </>
  );
};

const WarpShot: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const warp = ramp(f, 0, 40, Easing.in(Easing.cubic));
  const k = ramp(f, 0, 59);
  return (
    <>
      <CameraRig position={[0, 0, 12]} target={[Math.sin(t) * 0.3, Math.cos(t * 0.7) * 0.2, 0]} fov={lerp(55, 75, warp)} roll={t * 0.2} />
      <Starfield count={2600} seed={4} speed={lerp(2, 70, warp)} time={t} streak={0.06} area={[50, 30, 90]} position={[0, 0, -20]} />
      <WireTunnel radius={4.5} length={90} position={[0, 0, -30]} offset={t * lerp(4, 40, warp)} color="#9BFF3A" fill={null} glow={1.8} cell={1.5} twist={t * 0.4} />
      <ChromeText text="LOADING..." material="blue" font="ArialBlack" size={0.55} position={[0, -0.25, 6]} anchor="baseline"
        perLetter={(i) => ({position: [0, Math.max(0, Math.sin(t * 8 - i * 0.6)) * 0.12, 0]})} />
      <mesh position={[0, -0.6, 6]} material={glowMat('#9BFF3A', 2.2)}>
        <boxGeometry args={[3.2 * clamp01(k * 1.02), 0.08, 0.02]} />
      </mesh>
      <SpeedLines intensity={warp} time={t} inner={0.55} />
    </>
  );
};

const RainShot: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const k = ramp(f, 0, 59);
  const who = popIn(f, 18, 14);
  return (
    <>
      <CameraRig position={[lerp(-2.6, -1.8, k), 1.2, lerp(7, 6, k)]} target={[0.3, 1.6, 0]} fov={50} roll={-0.06} />
      <SkyDome preset="night" />
      <WireGrid color="#ff9f3a" fill="#050816" line={0.015} glow={0.6} fadeFar={20} cell={1.2} />
      {/* street lamp */}
      <mesh position={[2.6, 2, -1.5]} material={glowMat('#2a2a3a', 1)}>
        <cylinderGeometry args={[0.05, 0.07, 4, 8]} />
      </mesh>
      <mesh position={[2.3, 4, -1.5]} material={glowMat(C.sodium, 4)}>
        <sphereGeometry args={[0.16, 16, 12]} />
      </mesh>
      <Glow position={[2.3, 4, -1.5]} size={3} color={C.sodium} intensity={0.9} />
      <LightRays position={[2.3, 3.95, -1.5]} length={4} radius={1.8} count={10} time={t} color="#ffb347" intensity={0.5} haze={0.2} />
      <LensFlare position={[2.3, 4, -1.5]} intensity={0.8} color="#ffd08a" streakColor="#ffb347" rotation={t * 0.2} scale={0.8} />
      <Rain time={t} area={[14, 8, 12]} color="#ffd9a0" intensity={1} count={2200} />
      <ChromeText text="WHO?" material="ruby" size={1.0} position={[-0.3, 1.2, 0]} outline={{thickness: 0.04, color: '#19C6FF', glow: 2.5}}
        perLetter={(i) => ({scale: Math.max(0.001, popIn(f, 18 + i * 3, 12)), rotation: [0, 0, (1 - popIn(f, 18 + i * 3, 12)) * 0.6]})}
        rotation={[0, 0.25, 0]} brightness={0.85 + 0.15 * who} />
    </>
  );
};

const PartyShot: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const k = ramp(f, 0, 59, Easing.out(Easing.quad));
  const boom = clamp01((f - 4) / 75);
  return (
    <>
      <CameraRig position={[lerp(0.8, -0.4, k), lerp(1.3, 1.6, k), lerp(5.2, 4.6, k)]} target={[0, 1.4, 0]} fov={52} />
      <SkyDome preset="sunrise" glow={{dir: [0.5, 0.25, -1], color: '#ffd38a', size: 0.2, intensity: 0.8}} />
      <Sunburst position={[0, 1.5, -6]} radius={12} rays={24} rotation2d={-t * 0.3} colorA="#ff9ec0" colorB="#ff6aa6" center="#ffc2d8" glow={0.15} opacity={0.9} twist={0.3} />
      <ChromeText text={'GOOD\nFOR NOW'} material="sunset" sideMaterial="gold" size={0.62} anchor="center" position={[0, 1.5, 0]}
        shine={ramp(f, 20, 50)} outline={{thickness: 0.03, color: '#3a0c46'}}
        perLetter={(i) => {
          const p = popIn(f, i * 1.6, 12);
          return {scale: Math.max(0.001, p), rotation: [0, (1 - p) * Math.PI, 0]};
        }} />
      <Confetti progress={boom} duration={3.2} position={[0, 0.4, -0.8]} count={280} seed={5} power={1.05} size={1.2} />
      <Confetti mode="fall" time={t} area={[9, 6, 4]} count={120} seed={8} position={[0, 0, -1]} />
      <SparkleField count={30} seed={12} area={[6, 3, 2]} position={[0, 1.6, 0.4]} time={t} size={0.3} colors={['#ffffff', '#FFE9A0', '#FFC2EA']} />
      <LensFlare position={[2.6, 3.1, -3]} intensity={0.9} color="#fff0c8" rotation={t * 0.4} />
    </>
  );
};

const LegendShot: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const k = ramp(f, 0, 59, Easing.inOut(Easing.sin));
  const on = ramp(f, 0, 20);
  return (
    <>
      <CameraRig position={[lerp(1.6, 0.6, k), lerp(1.3, 1.45, k), lerp(5.5, 3.6, k)]} target={[0, 1.4, 0]} fov={45} />
      <SkyDome preset="night" brightness={0.6} />
      <WireGrid color="#8A4DFF" fill="#05030f" glow={0.7} line={0.012} fadeFar={14} cell={0.8} />
      <Sunburst position={[0, 1.4, -1.5]} radius={3.2} rays={18} rotation2d={t * 0.15} colorA="#2a1460" colorB="#10082a" center="#ffd27a" glow={0.5} opacity={0.9 * on} additive />
      <LightRays position={[0, 5.5, 0]} length={6} radius={1.6} count={12} time={t} color="#fff2c0" endColor="#ffb347" intensity={1.1 * on} haze={0.15} />
      <Glow position={[0, 1.4, -0.3]} size={2.6} color="#ffcf6a" intensity={0.8 * on} />
      <group position={[0, 1.4, 0]} rotation={[0.3, t * 0.8, 0.2]}>
        <mesh material={goldMat()}>
          <torusKnotGeometry args={[0.32, 0.11, 160, 20]} />
        </mesh>
      </group>
      <SparkleField count={26} seed={21} area={[1.8, 1.6, 1.2]} position={[0, 1.4, 0]} time={t} size={0.26} colors={['#ffffff', '#FFE9A0', '#fff4d6']} intensity={2.4 * on} />
      <ChromeText text="LEGENDARY" material="gold" font="TrebuchetBoldItalic" size={0.24} position={[0, 0.45, 0.3]} shine={ramp(f, 25, 50)} />
    </>
  );
};

export default function Y2KFX() {
  const f = useCurrentFrame();
  let shot: React.ReactNode;
  let bg = '#1E5BFF';
  let fog: {color: string; near: number; far: number} | null = null;
  if (f < 90) shot = <TitleShot f={f} />;
  else if (f < 150) shot = <VariantShot f={f - 90} />;
  else if (f < 210) {
    shot = <WarpShot f={f - 150} />;
    bg = '#02030c';
  } else if (f < 270) {
    shot = <RainShot f={f - 210} />;
    bg = '#02030c';
    fog = {color: '#070a1c', near: 8, far: 26};
  } else if (f < 330) shot = <PartyShot f={f - 270} />;
  else {
    shot = <LegendShot f={f - 330} />;
    bg = '#030208';
  }
  return (
    <AbsoluteFill>
      <Stage background={bg} env="chrome" fog={fog}>
        <hemisphereLight args={['#dff0ff', '#3a2a6a', 0.9]} />
        <directionalLight position={[3, 6, 5]} intensity={2.4} />
        {shot}
      </Stage>
    </AbsoluteFill>
  );
}
