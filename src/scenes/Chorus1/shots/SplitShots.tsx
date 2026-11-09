// Chorus half 2 opener: "You said 'Buy now'" as a 2002 split screen (left: the Guy singing; right: chrome BUY NOW on a
// turntable), then the rooftop sign that flips letter-by-letter into FOR NOW on "for".
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig} from '../../../lib/three';
import {SkyDome as Y2KSky, Sunburst, SparkleField, LensFlare, WireGrid} from '../../../lib/three/fx';
import {lerp, clamp01, popIn} from '../../../lib/time';
import {C, FONTS} from '../../../lib/palette';
import {CutEffect} from '../../../overlays/CutFlash';
import {World} from '../World';
import {House, ExteriorLights} from '../../../lib/sets/Exterior';
import {HouseDeco} from '../HouseDeco';
import {Performer} from '../Performer';
import {HeroWord} from '../HeroWord';
import {K, beatL} from '../timing';
import {ShotProps, decoAt, smooth, easeOut, V3} from './common';

const DONE = decoAt(9999, 0);
const G: V3 = [1.0, 0, 13.2];

/** slide-in of the panels (px offset of each half, 0 = in place) */
const slide = (f: number) => (1 - easeOut(f / 7)) * 980;

/** CSS for the main Stage during the split: shift the canvas so its centre lands in the left half, clip to that half. */
export const splitLeftStyle = (f: number): React.CSSProperties => ({
  transform: `translateX(${-480 - slide(f)}px)`,
  clipPath: 'inset(0 480px 0 480px)',
});

/** LEFT (main Stage): the Guy singing "You said..." with the house behind (medium close, slight low angle). */
export const SplitLeft: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const d = lerp(2.3, 1.9, smooth(f / 62));
  return (
    <>
      <CameraRig position={[G[0] + 0.35, 1.25, G[2] + d]} target={[G[0] - 0.05, 1.55, G[2]]} fov={62 + 3 * b.pulse} roll={-0.06} />
      <World t={t} deco={{...DONE, t}} flare={0.4} grass={1200} />
      <Performer lf={lf} position={G} rotation={[0, 0.12, 0]} gesture={lf > K.buy2 - 2 ? 'fistUp' : 'sing'} from="sing" mix={clamp01((lf - K.buy2 + 2) / 5)}
        expression="determined" extra={{headTilt: -0.08}} />
    </>
  );
};

/** RIGHT (second Stage): a 2002 home-shopping channel — the price-tagged house as a mini model spinning on a chrome
 * turntable over a Y2K grid; chrome BUY / NOW slam in above it on the sung words. */
const RightPanel: React.FC<{f: number; lf: number}> = ({f, lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const spin = t * 0.9;
  const tilt = Math.sin(t * 1.6) * 0.18;
  return (
    <>
      <CameraRig position={[0, 0.5, 6.4]} target={[0, 0.85, 0]} fov={46 - 3 * b.pulse} roll={0.05} />
      <Y2KSky preset="hold" />
      <Sunburst position={[0, 0.9, -10]} radius={24} rays={18} rotation2d={-t * 0.5} opacity={0.5} colorA="#FF4FB8" colorB="#3a1a9a" glow={0.06} />
      <WireGrid position={[0, -1.4, 0]} size={60} offset={t * 2} color="#19C6FF" glow={1.1} />
      <ExteriorLights preset="day" intensity={1} />
      {/* turntable + the house as a product model */}
      <group position={[0, -0.82, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[1.25, 1.32, 0.16, 40]} />
          <meshStandardMaterial color="#5a78c8" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.12, 1.25, 48]} />
          <meshBasicMaterial color="#7FE6FF" toneMapped={false} />
        </mesh>
        <group position={[0, 0.08, 0]} rotation={[0, spin, 0]} scale={0.125}>
          <House time="day" mailboxFlag={1} lights={false} yard={false} />
          <HouseDeco {...DONE} t={t} />
        </group>
      </group>
      <group rotation={[0, tilt, 0]}>
        <HeroWord f={lf} size={0.74} a={'BUY'} b={'FOR'} appear={K.buy2 - 3} popStagger={1.4} flipAt={99999} fromZ={5} position={[0, 2.35, 0]} />
        <HeroWord f={lf} size={0.74} a={'NOW'} b={'NOW'} appear={K.now2 - 3} popStagger={1.4} flipAt={99999} fromZ={5} position={[0, 1.3, 0]} />
      </group>
      <SparkleField count={26} seed={44} area={[5, 2.5, 1]} time={t} position={[0, 1.4, 0.6]} size={0.32} intensity={1.4 + 2 * clamp01((lf - K.buy2) / 8)} />
      <group position={[-1.6, 2.2, 0.8]}>
        <LensFlare intensity={0.25 + 0.6 * clamp01(1 - Math.abs(lf - K.buy2 - 2) / 10)} scale={0.8} rotation={t} />
      </group>
      <group visible={f < 0} />
    </>
  );
};

/** Over: the second Stage (right half), chrome divider, "LIVE" bug. */
export const SplitOver: React.FC<ShotProps> = ({f, lf}) => {
  const s = slide(f);
  const tag = popIn(f, 4, 10);
  return (
    <>
      <Stage background={C.y2kBlue} env="chrome" lens={{saturation: 1.15, vignette: 0.25}}
        style={{transform: `translateX(${480 + s}px)`, clipPath: 'inset(0 480px 0 480px)'}}>
        <RightPanel f={f} lf={lf} />
      </Stage>
      {/* gap between the sliding panels: hot-pink Y2K gradient instead of black */}
      {s > 1 ? (
        <div style={{position: 'absolute', left: 960 - s, top: 0, width: 2 * s, height: 1080,
          background: 'linear-gradient(180deg, #ff5fc4 0%, #8A4DFF 50%, #19C6FF 100%)'}} />
      ) : null}
      {/* chrome divider bar */}
      <div style={{position: 'absolute', left: 952, top: 0, width: 16, height: 1080, opacity: s > 1 ? 0 : 1,
        background: 'linear-gradient(90deg, #6d7690 0%, #ffffff 35%, #c9d2e6 50%, #ffffff 65%, #5a6380 100%)',
        boxShadow: '0 0 18px rgba(127,230,255,0.9), 0 0 4px #000'}} />
      {/* Y2K "split" bug labels */}
      <div style={{position: 'absolute', left: 60, top: 54, transform: `scale(${tag})`, transformOrigin: 'left top', fontFamily: FONTS.heavy, fontSize: 34,
        color: '#fff', padding: '6px 16px', borderRadius: 22, background: 'linear-gradient(#ff5fc4, #c0127a)', border: '3px solid #fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.35)'}}>
        YOU SAID
      </div>
      <div style={{position: 'absolute', right: 60, top: 54, transform: `scale(${tag})`, transformOrigin: 'right top', fontFamily: FONTS.heavy, fontSize: 34,
        color: '#fff', padding: '6px 16px', borderRadius: 22, background: 'linear-gradient(#5fd0ff, #0a5ad8)', border: '3px solid #fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.35)'}}>
        ★ LIMITED TIME ★
      </div>
      <CutEffect style="flash" k={f} tint="#FFFFFF" streak="#FF8AD0" seed={161} strength={0.7} />
    </>
  );
};

// ------------------------------------------------------------------ S10 rooftop sign
export const ROOF_SIGN: V3 = [0, 11.9, 1.6];
const ROOF_SIZE = 1.3;

/** S10 (572-636): BUY NOW is a giant rooftop sign on the wrapped house; on "for" it flips letter by letter to gold FOR NOW. */
export const RoofSign: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const k = smooth(f / 64);
  const ang = lerp(-0.55, 0.12, k);
  const r = lerp(12.8, 10.8, k);
  const cam: V3 = [Math.sin(ang) * r, lerp(4.0, 5.0, k), 2 + Math.cos(ang) * r];
  const flash = Math.max(0, 1 - Math.abs(lf - K.for2) / 8);
  return (
    <>
      <CameraRig position={cam} target={[0, 9.3, 0.6]} fov={52 - 2 * b.pulse} roll={lerp(0.08, -0.04, k)} />
      <World t={t} deco={{...DONE, t}} flare={0.35} />
      {/* sign posts on the ridge */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 9.9, ROOF_SIGN[2] - 0.2]}>
          <cylinderGeometry args={[0.08, 0.08, 3.4, 8]} />
          <meshStandardMaterial color="#d8dfee" metalness={1} roughness={0.2} />
        </mesh>
      ))}
      <HeroWord f={lf} size={ROOF_SIZE} position={ROOF_SIGN} appear={-999} flipAt={Math.round(K.for2) - 5} flipStagger={2.2} flipDur={9} spins={1}
        bounceAt={Math.round(K.now2b) - 1} outline={0.035} />
      <SparkleField count={36} seed={52} area={[11, 2.6, 2]} time={t} position={[ROOF_SIGN[0], ROOF_SIGN[1], ROOF_SIGN[2] + 0.8]} size={0.45}
        intensity={1.2 + 3 * flash} />
      <group position={[ROOF_SIGN[0] + 5.4, ROOF_SIGN[1] + 1.4, ROOF_SIGN[2] + 0.8]}>
        <LensFlare intensity={0.08 + 0.28 * flash} scale={0.7} rotation={t * 0.8} />
      </group>
    </>
  );
};
export const RoofSignOver: React.FC<ShotProps> = ({lf}) => (
  <CutEffect style="flash" k={Math.round(lf - K.for2)} tint="#FFF6D0" streak="#FFD24A" seed={171} strength={0.3} />
);
