/**
 * Pre P3/P4 — "one bag of food, and that's that.": a 2002 TV-commercial product shot in a Y2K void.
 *   P3 "one bag"            the CRUNCH-O's bag whips round on a chrome turntable over a spinning blue sunburst and
 *                           settles facing camera on "bag"; chrome ONE / BAG pops letter by letter; flare sweep.
 *   P4 "of food, and that's that"   low dutch hero angle, slow turntable; gold OF FOOD pops on "food"; on "that's" a
 *                           2D starburst ONE-TIME PURCHASE! slams in, and on "that" the fine print appears: "*for now".
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig, ChromeText} from '../../lib/three';
import {Sunburst, SparkleField, LensFlare, Glow, Swoosh, Sparkle} from '../../lib/three/fx';
import {chromeMat, glowMat} from '../../lib/three/materials';
import {FoodBag} from '../../lib/props';
import {Starburst} from '../../lib/ui';
import {C, FONTS} from '../../lib/palette';
import {ramp, popIn, lerp, clamp01} from '../../lib/time';
import type {V3} from '../V1Feeder/common';
import {W} from './timing';

type P = {f: number; t: number; from: number};

const BAG_S = 2.3;
const BAG_POS: V3 = [-0.62, 0.12, 0];
const TEXT_X = 0.8;

const Pedestal: React.FC<{t: number}> = ({t}) => {
  const geo = useMemo(() => ({top: new THREE.CylinderGeometry(0.42, 0.46, 0.12, 40), ring: new THREE.TorusGeometry(0.44, 0.018, 8, 48)}), []);
  return (
    <group position={[BAG_POS[0], 0, BAG_POS[2]]}>
      <mesh geometry={geo.top} material={chromeMat()} position={[0, 0.06, 0]} />
      <mesh geometry={geo.ring} material={glowMat(C.aqua, 2.2)} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <Glow position={[0, 0.02, 0.0]} size={0.7} color={C.aqua} intensity={0.35 + 0.08 * Math.sin(t * 6)} squash={2.4} />
    </group>
  );
};

/** bag yaw: P3 whips round (3 turns) and lands facing camera on "bag"; P4 drifts slowly */
const bagYaw = (sf: number, t: number) => {
  const land = W.bag - 1;
  if (sf < land) {
    const k = ramp(sf, 78, land, (x) => 1 - Math.pow(1 - x, 3));
    return (1 - k) * Math.PI * 4;
  }
  return 0.32 * Math.sin((sf - land) / 30 * 1.6) + 0.04 * Math.sin(t * 7) * (1 - ramp(sf, land, land + 10));
};

const Copy: React.FC<{sf: number; t: number}> = ({sf, t}) => {
  const shine1 = ramp(sf, W.bag + 2, W.bag + 22, (x) => x);
  const shine2 = ramp(sf, W.food + 4, W.food + 24, (x) => x);
  const letterPop = (start: number) => (i: number) => {
    const q = popIn(sf, start + i * 2, 9);
    return {scale: Math.max(0.001, q), position: [0, (1 - Math.min(1, q)) * 0.5, 0] as V3, rotation: [0, (1 - Math.min(1, q)) * 1.6, 0] as V3};
  };
  return (
    <group position={[TEXT_X, 0, 0]}>
      <ChromeText text="ONE" font="ArialBlack" size={0.36} position={[0, 1.5, 0]} anchor="center" shine={shine1} perLetter={letterPop(W.one - 3)}
        outline={{thickness: 0.012, color: '#06124a'}} />
      <ChromeText text="BAG" font="ArialBlack" size={0.36} position={[0, 1.02, 0]} anchor="center" shine={shine1} perLetter={letterPop(W.bag - 3)}
        outline={{thickness: 0.012, color: '#06124a'}} />
      {sf >= W.food - 4 ? (
        <ChromeText text="OF FOOD" font="ArialBlack" size={0.2} position={[0, 0.64, 0]} anchor="center" material="gold" shine={shine2}
          perLetter={letterPop(W.food - 4)} outline={{thickness: 0.009, color: '#3a1d00'}} />
      ) : null}
      <Swoosh position={[0, 0.98, 0.15]} radius={[0.75, 0.42]} arc={[-2.7, -0.2]} width={0.06} progress={ramp(sf, W.bag, W.bag + 14, (x) => x)}
        colorA={C.aqua} colorB={C.bubblegum} intensity={1.8} />
      <SparkleField count={12} seed={44} area={[1.2, 0.9, 0.2]} position={[0, 1.15, 0.2]} time={t} size={0.12} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ the set (shared by P3/P4)
const AdSet: React.FC<{sf: number; t: number}> = ({sf, t}) => {
  const bob = 0.02 * Math.sin(t * 2.2);
  const flareK = ramp(sf, W.bag - 2, W.bag + 4, (x) => x) * (1 - ramp(sf, W.bag + 8, W.bag + 26, (x) => x));
  const flareX = lerp(-1.5, 0.3, ramp(sf, W.bag - 2, W.bag + 26, (x) => x));
  const thump = sf >= W.thats - 1 ? Math.exp(-(sf - W.thats + 1) / 4) : 0;
  return (
    <>
      <Sunburst position={[-0.6, 0.9, -3.5]} radius={10} rays={22} colorA="#2f74ff" colorB="#0a1f9a" center="#9fd2ff" rotation2d={t * 0.25} glow={0.3} />
      <hemisphereLight args={['#e8f4ff', '#1a2a7a', 1.3]} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} color="#fff6e8" />
      <directionalLight position={[-3, 1.5, -1]} intensity={1.4} color={C.aqua} />
      <Pedestal t={t} />
      <group position={[BAG_POS[0], BAG_POS[1] + bob, BAG_POS[2]]} rotation={[0, bagYaw(sf, t), 0]} scale={BAG_S * (1 + 0.05 * thump)}>
        <FoodBag />
      </group>
      <Copy sf={sf} t={t} />
      <SparkleField count={30} seed={45} area={[5, 2.6, 1.5]} position={[0, 1.0, -0.6]} time={t} size={0.1} />
      {flareK > 0.01 ? <LensFlare position={[flareX, 1.05, 0.3]} intensity={0.9 * flareK} scale={0.7} rotation={t} /> : null}
      {thump > 0.02 ? <Sparkle position={[BAG_POS[0] + 0.3, 0.95, 0.4]} size={1.2 * thump} intensity={3} time={t} /> : null}
    </>
  );
};

export const ShotAd1: React.FC<P> = ({f, t, from}) => {
  const sf = f + from;
  const k = ramp(f, 0, 32, (x) => x);
  const hit = Math.max(0, 1 - Math.abs(sf - W.bag) / 6);
  const cam: V3 = [lerp(0.15, 0.08, k), lerp(1.0, 0.95, k), lerp(3.7, 3.3, k) - 0.12 * hit];
  return (
    <Stage background="#06156e" env="chrome" bloom={{strength: 0.7, threshold: 0.88}} lens={{vignette: 0.45, saturation: 1.15}}>
      <CameraRig position={cam} target={[0.08, 0.9, 0]} fov={36} />
      <AdSet sf={sf} t={t} />
    </Stage>
  );
};

export const ShotAd2: React.FC<P> = ({f, t, from}) => {
  const sf = f + from;
  const k = ramp(f, 0, 32, (x) => x);
  const thump = sf >= W.thats - 1 ? Math.exp(-(sf - W.thats + 1) / 3) : 0;
  const cam: V3 = [lerp(-1.3, -1.05, k), lerp(0.4, 0.48, k), lerp(2.75, 2.5, k) + 0.06 * thump];
  return (
    <Stage background="#06156e" env="chrome" bloom={{strength: 0.7, threshold: 0.88}} lens={{vignette: 0.45, saturation: 1.15, aberration: 0.0015 + 0.004 * thump}}>
      <CameraRig position={cam} target={[0.1, 1.0, 0]} fov={46} roll={lerp(-0.1, -0.13, k) + 0.02 * thump} />
      <AdSet sf={sf} t={t} />
    </Stage>
  );
};

/** two-line yellow starburst (SVG) centred on x, y */
const Burst2: React.FC<{x: number; y: number; size: number; scale: number; rotate: number; lines: string[]}> = ({x, y, size, scale, rotate, lines}) => {
  const n = 18, r = size / 2;
  const pts = (r0: number, r1: number) =>
    Array.from({length: n * 2}, (_, i) => {
      const a = (i * Math.PI) / n - Math.PI / 2;
      const rr = i % 2 ? r1 : r0;
      return `${(r + Math.cos(a) * rr).toFixed(1)},${(r + Math.sin(a) * rr).toFixed(1)}`;
    }).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{position: 'absolute', left: x - r, top: y - r, transform: `scale(${scale}) rotate(${rotate}deg)`, transformOrigin: 'center', overflow: 'visible'}}>
      <defs>
        <radialGradient id="b2g" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#FFB800" />
        </radialGradient>
      </defs>
      <polygon points={pts(r, r * 0.8)} fill="#7a1400" transform="translate(5 8)" opacity={0.5} />
      <polygon points={pts(r, r * 0.8)} fill="url(#b2g)" stroke="#A02800" strokeWidth={4} strokeLinejoin="round" />
      <polygon points={pts(r * 0.88, r * 0.7)} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={3} strokeLinejoin="round" />
      <g transform={`rotate(-12 ${r} ${r})`} fontFamily={FONTS.impact} textAnchor="middle" fontWeight="bold">
        {lines.map((l, i) => (
          <text key={i} x={r} y={r + (i - (lines.length - 1) / 2) * size * 0.17 + size * 0.06} fontSize={size * 0.155}
            fill={C.alertRed} stroke="#ffffff" strokeWidth={size * 0.022} paintOrder="stroke">{l}</text>
        ))}
      </g>
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ 2D: NEW! + ONE-TIME PURCHASE + *for now
export const AdOverlay: React.FC<{sf: number}> = ({sf}) => {
  const nw = popIn(sf, W.one, 8);
  const deal = popIn(sf, W.thats - 1, 8);
  const fine = clamp01((sf - W.that + 1) / 5);
  const wob = Math.sin(sf * 0.35) * 4;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {sf >= W.one ? <Starburst text={'NEW!'} x={230} y={200} scale={1.7 * nw} rotate={-14 + wob} color={C.alertRed} textColor="#FFE45C" size={160} /> : null}
      {sf >= W.thats - 1 ? <Burst2 x={1640} y={250} size={360} scale={deal} rotate={8 - wob * 0.5} lines={['ONE-TIME', 'PURCHASE!*']} /> : null}
      {fine > 0 ? (
        <div style={{position: 'absolute', left: 1530, top: 450, fontFamily: FONTS.comic, fontSize: 44, fontWeight: 'bold', color: '#ffffff',
          textShadow: '0 3px 0 #000, 0 0 10px #000', opacity: fine, letterSpacing: 1, transform: `rotate(-4deg) scale(${0.8 + 0.2 * fine})`}}>
          *for now.
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
