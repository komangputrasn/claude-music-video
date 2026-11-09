/**
 * Swing · shot 2 (local 65–131): "Pancake ate till he'd had enough."
 *   65–81   reaction close-up: kibble rains around Pancake, one bonks his head, ears pop up, eyes go ^ ^ on "Pancake"
 *   81–114  low floor-level shot: he chows down on the spilled kibble, tail a blur, the Guy grinning behind him with the
 *           hammer; a Y2K "Pancake.exe" window downloads breakfast (progress bar)
 *   114–131 content close-up: sits back, round belly, licks his chops, little hearts, "*burp*" — 100% on "enough"
 */
import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {SparkleField, Sparkle} from '../../lib/three/fx';
import {Guy, guyIdle, mergePose} from '../../lib/characters/Guy';
import {Pancake, pancakeEat, pancakeAnchor, PancakePose, mixPose as mixDog} from '../../lib/characters/Pancake';
import {HeldHammer, KibbleField, KibblePile, KibbleItem, KIBBLE} from '../../lib/props';
import {Win, ProgressBar} from '../../lib/ui';
import {ramp, lerp, noise1, popIn} from '../../lib/time';
import {C, FONTS} from '../../lib/palette';
import {GUY_SWING_POS, PANCAKE_POS, PANCAKE_ROT, T, V3, clamp, smooth} from './common';
import {RoomAfter, toWorld} from './Room';

const A_END = 81, B_END = 114;
export const EAT_POS: V3 = [1.3, 0, 1.25];
export const EAT_ROT = -0.45;

// ------------------------------------------------------------------------------------------------ tail-wag blur
/** cartoon motion arcs beside a wagging tail (3 thin white crescents) */
const WagLines: React.FC<{t: number; position: V3; rotationY: number; size?: number}> = ({t, position, rotationY, size = 1}) => {
  const a = 0.6 + 0.4 * Math.sin(t * 40);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={size}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.16, 0.02, 0]} rotation={[0, 0, s * 0.35]}>
          {[0, 1].map((j) => (
            <mesh key={j} position={[s * j * 0.05, j * 0.03, 0]}>
              <torusGeometry args={[0.07 + j * 0.03, 0.006, 4, 16, 1.1]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85 * a} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ hearts
const heartShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.55, -0.05, -0.5, 0.25);
  s.bezierCurveTo(-0.45, 0.55, -0.08, 0.6, 0, 0.3);
  s.bezierCurveTo(0.08, 0.6, 0.45, 0.55, 0.5, 0.25);
  s.bezierCurveTo(0.55, -0.05, 0.15, -0.35, 0, -0.5);
  return s;
})();

const Heart: React.FC<{position: V3; scale: number; opacity?: number}> = ({position, scale, opacity = 1}) => (
  <mesh position={position} scale={scale}>
    <shapeGeometry args={[heartShape, 10]} />
    <meshBasicMaterial color={C.bubblegum} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
  </mesh>
);

// ------------------------------------------------------------------------------------------------ the bonk kibble
const bonkItems = (f: number, head: V3): KibbleItem[] => {
  // one nugget drops onto his head at frame 71 and pops off sideways
  const hit = 71;
  const items: KibbleItem[] = [];
  if (f < hit) {
    const u = (hit - f) / 30;
    items.push({p: [head[0], head[1] + 0.12 + 4.9 * u * u + 0.4 * u, head[2]], r: [f * 0.3, f * 0.2, 0], s: KIBBLE.size * 1.4, c: 1});
  } else {
    const u = (f - hit) / 30;
    items.push({p: [head[0] + 0.5 * u, head[1] + 0.12 + 1.2 * u - 4.9 * u * u, head[2] + 0.3 * u], r: [f * 0.5, f * 0.3, 0], s: KIBBLE.size * 1.4, c: 1});
  }
  return items;
};

// ------------------------------------------------------------------------------------------------ poses
const reactPose = (f: number): PancakePose => {
  const t = f / 30;
  const joy = smooth((f - (T.pancake - 4)) / 6);
  const bonk = f >= 71 && f < 78 ? Math.exp(-(f - 71) / 2.5) : 0;
  return {
    sit: 1,
    eyes: joy > 0.5 ? 'happy' : 'open',
    blink: f >= 70 && f < 73 ? 1 : 0,
    earPerk: lerp(0.5, 1, joy) - bonk * 0.8,
    headPitch: lerp(0.45, 0.25, joy) - bonk * 0.2,
    headTilt: lerp(0.1, -0.22, joy),
    headYaw: noise1(t * 1.2, 5) * 0.1,
    mouthOpen: lerp(0.25, 0.75, joy),
    tongue: joy * 0.8,
    tailWag: t * 4,
    tailWagAmount: lerp(0.3, 1, joy),
    bodySquash: -bonk * 0.18,
    hop: joy * Math.max(0, Math.sin((f - T.pancake) * 0.45)) * 0.03,
  };
};

const contentPose = (f: number): PancakePose => {
  const t = f / 30;
  const lick = clamp(Math.sin((f - B_END) * 0.32), 0, 1) * (f < T.enough + 6 ? 1 : 0.3);
  const sigh = smooth((f - T.enough) / 6);
  return {
    sit: 1,
    eyes: 'happy',
    earPerk: 0.35 - sigh * 0.4,
    headPitch: 0.22 + sigh * 0.12,
    headTilt: 0.18 * Math.sin(t * 2.2),
    mouthOpen: 0.35 + 0.3 * lick,
    tongue: 0.5 + 0.5 * lick,
    tailWag: t * 3.6,
    tailWagAmount: 0.8,
    bodySquash: 0.16 - 0.05 * Math.sin(t * 6) * sigh, // full round tummy, breathing
    blush: 1,
  };
};

// ------------------------------------------------------------------------------------------------ HUD
const PancakeExe: React.FC<{f: number}> = ({f}) => {
  const p = clamp((f - (A_END - 2)) / (T.enough - (A_END - 2)), 0, 1);
  const pct = Math.min(100, Math.floor(Math.pow(p, 0.8) * 100));
  const done = f >= T.enough;
  const inK = popIn(f, A_END + 2, 10);
  const doneK = popIn(f, T.enough, 8);
  return (
    <div style={{position: 'absolute', left: 1180, top: 84, transform: `scale(${1.3 * inK})`, transformOrigin: 'top left'}}>
      <Win title="Pancake.exe" width={520} height={done ? 196 : 170} icon="sparkle" sheen={lerp(-0.2, 1.2, clamp((f - T.enough) / 12, 0, 1))}>
        <div style={{padding: '14px 18px', fontFamily: FONTS.ui, fontSize: 19, color: '#1a1a2a'}}>
          <div style={{marginBottom: 10}}>{done ? 'Breakfast complete!' : 'Downloading breakfast...'}</div>
          <ProgressBar value={pct / 100} width={470} height={26} color="green" showPercent />
          {done ? (
            <div style={{marginTop: 10, fontSize: 16, color: '#0a6b1a', fontWeight: 700, transform: `scale(${doneK})`, transformOrigin: 'left center'}}>
              No subscription required.
            </div>
          ) : null}
        </div>
      </Win>
    </div>
  );
};

const Burp: React.FC<{f: number}> = ({f}) => {
  const k = popIn(f, T.enough + 2, 9);
  if (k <= 0) return null;
  const fade = 1 - clamp((f - (T.enough + 20)) / 6, 0, 1);
  return (
    <div style={{position: 'absolute', left: 330, top: 300, transform: `scale(${k}) rotate(-10deg)`, opacity: fade,
      fontFamily: FONTS.comic, fontSize: 84, fontWeight: 700, color: '#fff', WebkitTextStroke: '3px #8A4DFF',
      textShadow: '0 6px 0 #4a1d9a, 0 0 24px rgba(255,79,184,0.8)'}}>
      *burp*
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ shot
export const PancakeShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const seg = f < A_END ? 0 : f < B_END ? 1 : 2;

  let cam: {position: V3; target: V3; fov: number};
  let dog: React.ReactNode;
  let extra: React.ReactNode = null;
  let hideFront = false;

  if (seg === 0) {
    const pose = reactPose(f);
    const head = toWorld(PANCAKE_POS, PANCAKE_ROT, pancakeAnchor(pose, 'head'));
    const push = smooth((f - 65) / 16);
    cam = {
      position: toWorld(PANCAKE_POS, PANCAKE_ROT, [0.32 - 0.08 * push, 0.42, lerp(1.05, 0.88, push)]),
      target: [head[0], head[1] - 0.06, head[2]],
      fov: 46,
    };
    dog = <Pancake position={PANCAKE_POS} rotation={[0, PANCAKE_ROT, 0]} pose={pose} />;
    extra = (
      <>
        <KibbleField items={bonkItems(f, head)} />
        {f >= T.pancake - 2 ? (
          <SparkleField count={14} seed={9} area={[0.7, 0.4, 0.3]} position={[head[0], head[1] + 0.25, head[2]]} time={t} size={0.08} intensity={2} />
        ) : null}
      </>
    );
  } else if (seg === 1) {
    const pose = pancakeEat(t);
    const tail = toWorld(EAT_POS, EAT_ROT, pancakeAnchor(pose, 'tailBase'));
    const push = smooth((f - A_END) / (B_END - A_END));
    cam = {
      position: toWorld(EAT_POS, EAT_ROT, [lerp(0.42, 0.3, push), 0.11, lerp(1.05, 0.9, push)]),
      target: toWorld(EAT_POS, EAT_ROT, [-0.02, 0.3, -0.2]),
      fov: 56,
    };
    hideFront = true;
    dog = (
      <group position={EAT_POS} rotation={[0, EAT_ROT, 0]}>
        <Pancake pose={pose} />
        <KibblePile radius={0.11} height={0.035 * (1 - 0.6 * push)} seed={21} position={[0, 0, 0.47]} />
      </group>
    );
    extra = (
      <>
        <WagLines t={t} position={[tail[0], tail[1] + 0.12, tail[2]]} rotationY={EAT_ROT} size={1.1} />
      </>
    );
  } else {
    const pose = contentPose(f);
    const head = toWorld(EAT_POS, EAT_ROT, pancakeAnchor(pose, 'head'));
    const push = smooth((f - B_END) / 17);
    cam = {
      position: toWorld(EAT_POS, EAT_ROT, [0.42, lerp(0.46, 0.5, push), lerp(1.45, 1.26, push)]),
      target: [head[0], head[1] - 0.06, head[2]],
      fov: 44,
    };
    hideFront = true;
    const hk = popIn(f, T.enough - 1, 10);
    dog = <Pancake position={EAT_POS} rotation={[0, EAT_ROT, 0]} pose={pose} />;
    extra = (
      <>
        {[0, 1, 2].map((i) => {
          const fi = f - (T.enough - 1 + i * 4);
          if (fi < 0) return null;
          const rise = fi / 30;
          return (
            <Heart key={i} position={[head[0] + (i - 1) * 0.12, head[1] + 0.22 + rise * 0.35, head[2] + 0.05]}
              scale={0.07 * hk * (1 - 0.15 * i)} opacity={1 - clamp((fi - 14) / 10, 0, 1)} />
          );
        })}
        <Sparkle position={[head[0] + 0.18, head[1] + 0.15, head[2]]} size={0.12 * hk} time={t} />
      </>
    );
  }

  const keyPos: V3 = [cam.position[0] * 0.7 + EAT_POS[0] * 0.3, 1.4, cam.position[2] * 0.7 + EAT_POS[2] * 0.3];
  return (
    <AbsoluteFill>
      <Stage background={C.night} env="night" lens={{vignette: 0.42, grain: 0.04, saturation: 1.12}}>
        <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
        <RoomAfter f={f} cops={0.8} keyPos={keyPos} keyIntensity={2.3} hideFront={hideFront}>
          {dog}
          {extra}
        </RoomAfter>
      </Stage>
      {seg >= 1 ? <PancakeExe f={f} /> : null}
      {seg === 2 ? <Burp f={f} /> : null}
    </AbsoluteFill>
  );
};
