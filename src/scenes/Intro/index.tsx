/**
 * INTRO (frames 0–371, 0–12.38 s, instrumental) — the CRT bookend.
 *
 *   S1   0– 72  black -> a silver CRT floats in a Y2K void (stars, neon grid, chrome $ @ + % glyphs). Power-on (dot ->
 *               line -> picture) on the first beat (1.30 s) with an anamorphic flare; the "Y2K OS" boot screen.
 *   S2  73–138  DB 2.42: snap closer. Desktop + "Loading your life..." progress to 99 % (files: bed.sub, pillow.sub ...)
 *   S3 139–205  DB 4.64: fisheye close-up. Dialog "Your subscription to EVERYTHING is now active. [Buy Now]"; the cursor
 *               glides over and clicks Buy Now on the beat (6.32 s) -> the screen blooms white.
 *   S4 206–270  DB 6.85: chrome "BUY NOW," bursts out of the screen letter by letter while the camera pulls back (flash, flare).
 *   S5 271–337  DB 9.03: "FOR NOW" slams in from behind camera (strobe, flare, swoosh, sunburst); shine sweep; the TV
 *               channel-hops through static (10.15 s) to a camcorder REC feed: close-up of the red LED "3:15".
 *   S6 338–371  DB 11.26: the title letters blow apart, speed lines, the camera dives into the CRT while the in-TV camcorder
 *               cranes up/back over the sleeping Pancake + Guy and lands EXACTLY on V1Bedroom's opening wide (BedroomFeed.tsx),
 *               REC OSD included -> the VHS cut into V1Bedroom is a match cut.
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Stage, CameraRig, ChromeText, measureChromeText} from '../../lib/three';
import {LensFlare, SparkleField, Sparkle, Swoosh, SpeedLines, Glow} from '../../lib/three/fx';
import {BEATS, ramp, popIn, lerp, clamp01, noise1} from '../../lib/time';
import {CRTTV, CRT_SCREEN} from '../../lib/props/CRTTV';
import {clickAt} from '../../lib/ui';
import {renderDLCanvas} from '../../lib/ui';
import {VoidBackdrop} from './Void';
import {RenderToTexture, useRenderTarget, useLiveCanvasTexture, useLiveCanvas, useOverlayScene, V3} from './rtt';
import {BedroomFeedScene, feedCamera, drawRecOSD, FEED_BG, CUT, BW} from './BedroomFeed';
import {bootDL, loadingDL, dialogScreenDL, thanksDL, offerButtonCenter, SCR_W, SCR_H} from './screens';

// ------------------------------------------------------------------------------------------------ timing (local = song frames)
const bf = (i: number) => Math.round(BEATS[i] * 30);
const POWER = bf(0); // 39   1.30 s first beat
const DB1 = bf(2); // 73     2.42
const DB2 = bf(6); // 139    4.64
const CLICK = bf(9); // 189  6.32
const DB3 = bf(10); // 206   6.85  BUY NOW,
const DB4 = bf(14); // 271   9.03  FOR NOW
const TUNE = bf(16); // 305  10.15 channel change
const DB5 = bf(18); // 338   11.26 dive
const END = 371;
const DIVE_END = 366; // picture fills the frame (then holds: the in-TV camcorder keeps moving)

// ------------------------------------------------------------------------------------------------ title layout
const L1 = 'BUY NOW,';
const L2 = 'FOR NOW';
const CAP = 0.3;
const M1 = measureChromeText(L1, {size: CAP, anchor: 'baseline'});
const M2 = measureChromeText(L2, {size: CAP, anchor: 'baseline'});
const Y1 = 0.93; // baseline of line 1
const Y2 = 0.44;
const TZ = 0.32;
const SCREEN_W: V3 = [0, 0, CRT_SCREEN.center[2] + 0.02]; // screen centre in world when the TV is at rest
const TV_BASE_Y = -CRT_SCREEN.center[1];

const ease = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

type Cam = {p: V3; t: V3; fov: number; roll?: number};
const mixV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** horizontal-fill distance (picture width fills the 16:9 frame) */
/** calibration of the dive end distance against V1Bedroom's first frame (glass bulge etc.) */
const DIVE_K = 0.88;
const fillW = (fov: number) => CRT_SCREEN.width / 2 / (Math.tan((fov * Math.PI) / 360) * (16 / 9));

const cameraAt = (f: number): Cam => {
  const t = f / 30;
  const hx = noise1(t * 0.7, 3) * 0.02, hy = noise1(t * 0.6, 4) * 0.015;
  if (f < DB1) {
    const k = ramp(f, 0, DB1, easeOut);
    const kick = Math.exp(-Math.max(0, f - POWER) / 5) * (f >= POWER ? 1 : 0);
    return {p: mixV([1.55, 0.72, 4.0], [0.75, 0.3, 2.35], k), t: [0, 0.06, 0], fov: 36 - 2.5 * kick, roll: lerp(-0.07, -0.025, k)};
  }
  if (f < DB2) {
    const k = ramp(f, DB1, DB2, (x) => x);
    const kick = Math.exp(-(f - DB1) / 4);
    return {p: [lerp(-0.44, -0.3, k) + hx, 0.12 + hy, lerp(1.17, 1.07, k) + 0.25 * kick], t: [0.0, -0.005, 0.28], fov: 38, roll: -0.035};
  }
  if (f < DB3) {
    const k = ramp(f, DB2, DB3, (x) => x);
    const kick = Math.exp(-(f - DB2) / 4);
    const punch = f >= CLICK ? Math.exp(-(f - CLICK) / 6) : 0;
    const d = 0.37 + 0.14 * kick - 0.05 * punch - 0.02 * k;
    return {p: [0.05 + hx * 0.5, 0.012 + hy * 0.5, SCREEN_W[2] + d], t: [0.012, 0.0, 0.0], fov: 58, roll: lerp(0.03, 0.015, k)};
  }
  if (f < DB4) {
    // hard cut on the downbeat to the wide hero; tiny settle + slow drift while the letters burst out of the screen
    const k1 = ramp(f, DB3, DB3 + 14, easeOut);
    const k2 = ramp(f, DB3 + 10, DB4, (x) => x);
    const p1: V3 = [0, 0.5, 3.05];
    const p2: V3 = [0.3, 0.55, 2.9];
    return {p: mixV(p1, p2, k2), t: [0, 0.46, 0], fov: lerp(43, 40, k1), roll: lerp(0.03, 0, k1) + 0.01 * Math.sin(t * 0.8)};
  }
  const p5a: V3 = [-0.3, 0.34, 3.3];
  const p5b: V3 = [0.1, 0.42, 3.42];
  const punch = Math.exp(-(f - DB4) / 5);
  const k5 = ramp(f, DB4, DB5, (x) => x);
  const c5: Cam = {p: mixV(p5a, p5b, k5), t: [0, 0.38, 0], fov: 40 - 4 * punch, roll: -0.02 * (1 - k5)};
  if (f < DB5) return c5;
  // S6 dive into the screen: ends square-on, at the distance where the central BW of the picture width fills the frame
  const fovEnd = 50;
  const dEnd = fillW(fovEnd) * BW * DIVE_K;
  const k = ramp(f, DB5, DIVE_END, Easing.inOut(Easing.cubic));
  const end: V3 = [0, 0, SCREEN_W[2] + dEnd];
  const fov = lerp(c5.fov, fovEnd, k);
  return {p: mixV(c5.p, end, k), t: mixV(c5.t, [0, 0, 0], ramp(f, DB5, DB5 + 14, easeOut)), fov, roll: 0};
};

// ------------------------------------------------------------------------------------------------ TV screen picture
const useScreenTexture = (f: number) => {
  // state key -> only redraw when the picture changes
  let key: string;
  let make: () => ReturnType<typeof bootDL>;
  if (f < DB1) {
    const q = f - POWER;
    key = `boot${q}`;
    make = () => bootDL(q, ramp(f, POWER + 6, POWER + 20, easeOut));
  } else if (f < DB2) {
    const p = Math.min(0.99, ramp(f, DB1 + 2, DB2 - 14, Easing.out(Easing.quad)) * 0.99);
    const pct = Math.floor(p * 100);
    const rot = f >= DB2 - 14 ? Math.floor((f - DB2) / 2) * 30 : 0;
    key = `load${pct}|${rot}`;
    make = () => loadingDL(p, f, {kind: 'hourglass', x: 505, y: 330, hourglassRot: rot});
  } else if (f < CLICK + 7) {
    const pop = popIn(f, DB2 - 1, 8);
    const b = offerButtonCenter();
    const mv = ramp(f, DB2 + 12, CLICK - 6, ease);
    const x = lerp(590, b.x + 6, mv) + Math.sin(mv * Math.PI) * -20;
    const y = lerp(440, b.y + 4, mv) - Math.sin(mv * Math.PI) * 40;
    const hover = mv > 0.9;
    const click = clickAt(f, CLICK, 12);
    const pressed = f >= CLICK && f < CLICK + 5;
    const glow = ramp(f, CLICK + 1, CLICK + 7, (u) => u);
    key = `dlg${f}`;
    make = () => dialogScreenDL({pop, hover, pressed, cursor: {kind: hover ? 'hand' : 'arrow', x, y, click}, glow});
  } else {
    const rot = Math.floor(f / 2) * 1.2;
    const k = popIn(f, CLICK + 7, 10);
    key = `thx${rot}|${k.toFixed(3)}`;
    make = () => thanksDL(rot, k);
  }
  const pr = 2;
  return useLiveCanvasTexture(SCR_W * pr, SCR_H * pr, key, (ctx, canvas) => {
    renderDLCanvas(make(), SCR_W, SCR_H, pr, canvas);
    void ctx;
  });
};

// ------------------------------------------------------------------------------------------------ bedroom feed (RT)
const BedroomPicture: React.FC<{f: number; rt: THREE.WebGLRenderTarget}> = ({f, rt}) => {
  const hudFrame = f - CUT + 1590; // V1Bedroom's CamcorderHUD frame at the same moment
  const hud = useLiveCanvas(rt.width, rt.height, `rec${hudFrame}`, (ctx, c) => drawRecOSD(ctx, c.width, c.height, hudFrame));
  const overlay = useOverlayScene(hud.tex, 1.7);
  return (
    <RenderToTexture target={rt} camera={feedCamera(f)} background={FEED_BG} env="night" overlay={overlay} beforeRender={hud.update}>
      <BedroomFeedScene f={f} />
    </RenderToTexture>
  );
};

// ------------------------------------------------------------------------------------------------ 3D world
const World: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const cam = cameraAt(f);
  const screenTex = useScreenTexture(f);
  const rt = useRenderTarget(1440, 1080);
  const showBedroom = f >= TUNE + 3;

  // TV float: settle to rest for the dive
  const settle = 1 - ramp(f, DB5 - 6, DB5 + 12, ease);
  const yaw = (f < DB1 ? lerp(0.62, 0.12, ramp(f, 0, DB1, easeOut)) : 0.06 * Math.sin(t * 0.9)) * settle;
  const bob = 0.025 * Math.sin(t * 1.6) * settle;
  const power = f < POWER ? 0 : ramp(f, POWER, POWER + 18, (x) => x);
  const glowBoost = f >= CLICK ? 1 + 0.3 * Math.exp(-(f - CLICK - 3) * (f - CLICK - 3) / 8) : 1;
  const stat = f >= TUNE - 2 && f < TUNE + 12 ? clamp01(1 - (f - TUNE - 6) / 6) * (f < TUNE ? 0.5 : 1) : 0;
  const fade = ramp(f, 4, 30, (x) => x);
  const lit = f < POWER - 2 ? 0 : ramp(f, POWER - 2, POWER + 8, easeOut);
  const litFlash = f >= POWER ? Math.exp(-(f - POWER) / 6) : 0;
  const burst = ramp(f, DB3, DB3 + 10) * 0.6 + ramp(f, DB4, DB4 + 8) * 0.4;
  const inside = ramp(f, DIVE_END - 6, DIVE_END + 2);

  // title animation
  const titleOn = f >= DB3;
  const explode = ramp(f, DB5, DB5 + 16, Easing.in(Easing.quad));
  const slot = (M: typeof M1, Y: number, i: number): V3 => {
    const L = M.letters.find((l) => l.i === i) ?? M.letters[0];
    return [L.center[0], Y + L.center[1], TZ];
  };
  const blow = (c: V3): {position: V3; rotation: V3} => {
    const dx = c[0], dy = c[1] - 0.2;
    const n = Math.hypot(dx, dy) || 1;
    const e = explode;
    return {position: [(dx / n) * e * 2.8, (dy / n) * e * 2.2 + e * 0.6, e * 2.2], rotation: [e * 1.5 * Math.sign(dy), e * 2 * Math.sign(dx), e * 0.8]};
  };
  const line1 = (i: number) => {
    const c = slot(M1, Y1, i);
    const k = popIn(f, DB3 - 1 + i * 1.3, 14);
    const from: V3 = [SCREEN_W[0] - c[0], SCREEN_W[1] - c[1] + bob, SCREEN_W[2] - c[2]];
    const b = blow(c);
    return {
      position: [from[0] * (1 - k) + b.position[0], from[1] * (1 - k) + b.position[1], from[2] * (1 - k) + b.position[2]] as V3,
      rotation: [(1 - k) * 1.3 + b.rotation[0], (1 - k) * 0.5 + b.rotation[1], (1 - k) * -0.4 + b.rotation[2]] as V3,
      scale: Math.max(0.001, 0.12 + 0.88 * k),
      visible: k > 0.001,
    };
  };
  const line2 = (i: number) => {
    const c = slot(M2, Y2, i);
    const k = popIn(f, DB4 - 5 + i * 1.0, 12);
    const b = blow(c);
    return {
      position: [b.position[0], b.position[1] + (1 - k) * 0.4, (1 - k) * 6 + b.position[2]] as V3,
      rotation: [(1 - k) * 1.5 + b.rotation[0], (1 - k) * 0.4 + b.rotation[1], b.rotation[2]] as V3,
      scale: Math.max(0.001, 0.4 + 0.6 * k),
      visible: k > 0.001,
    };
  };
  const shine = f < DB4 ? ramp(f, DB3 + 8, DB3 + 34) : ramp(f, DB4 + 20, DB4 + 52);
  const flare1 = f >= DB3 ? 0.35 + 1.1 * Math.exp(-(f - DB3) / 7) : 0;
  const flare2 = f >= DB4 ? 0.25 + 1.3 * Math.exp(-(f - DB4) / 7) : 0;
  const titleFade = 1 - ramp(f, DB5 + 8, DB5 + 18);
  const powerFlare = f >= POWER && f < POWER + 24 ? Math.sin(clamp01((f - POWER) / 22) * Math.PI) : 0;
  const tvPos: V3 = [0, TV_BASE_Y + bob, 0];
  const scr = new THREE.Vector3(...CRT_SCREEN.center).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(...tvPos));

  return (
    <>
      <CameraRig position={cam.p} target={cam.t} fov={cam.fov} roll={cam.roll} />
      <VoidBackdrop t={t} fade={fade * (1 - inside)} burst={burst * (1 - inside)} sky={0.3 + 0.7 * lit + 0.4 * litFlash} grid={lit + 0.8 * litFlash}
        stars={0.55 + 0.45 * lit} glyphs={lit} />
      <hemisphereLight args={['#a9c0ff', '#2a1050', 0.85]} />
      <directionalLight position={[2.2, 3, 4]} intensity={1.5} color="#eef3ff" />
      <directionalLight position={[-3, 1.4, -2]} intensity={2.2} color="#FF4FB8" />
      <directionalLight position={[3, 0.6, -2.2]} intensity={2.0} color="#19C6FF" />

      <group position={tvPos} rotation={[0, yaw, 0]}>
        <CRTTV screen={showBedroom ? rt.texture : f >= POWER ? screenTex : null} power={power} glow={glowBoost} static={stat} frame={f}
          light={1.2} lightColor="#8fc0ff" />
      </group>
      {/* soft halo behind the set once it is on */}
      <Glow position={[0, 0.0, -0.4]} size={2.6} color="#3a6cff" intensity={0.55 * power * fade * (1 - inside)} />
      {/* power-on anamorphic streak */}
      {powerFlare > 0 ? <LensFlare position={[scr.x, scr.y, scr.z + 0.05]} intensity={powerFlare * 1.1} scale={0.9} streak={1.6} ghosts={false} rotation={t * 0.5} /> : null}

      {titleOn && titleFade > 0 ? (
        <>
          <ChromeText text={L1} size={CAP} position={[0, Y1, TZ]} outline={{thickness: 0.018, color: '#06103a'}} shine={shine}
            perLetter={(i) => line1(i)} opacity={titleFade} />
          {f >= DB4 - 6 ? (
            <ChromeText text={L2} size={CAP} position={[0, Y2, TZ]} outline={{thickness: 0.018, color: '#06103a'}} shine={shine}
              sideMaterial="gold" perLetter={(i) => line2(i)} opacity={titleFade} />
          ) : null}
          <SparkleField count={30} seed={9} area={[M1.width + 1.2, 1.1, 0.8]} position={[0, (Y1 + Y2) / 2 + 0.12, TZ + 0.2]} time={t} size={0.2}
            intensity={2.6 * ramp(f, DB3 + 4, DB3 + 14) * titleFade} />
          <Sparkle position={[M1.width / 2 + 0.05, Y1 + CAP + 0.06, TZ + 0.3]} size={0.75 * flare1} time={t} intensity={3} />
          <LensFlare position={[M1.width / 2 - 0.25, Y1 + CAP * 0.9, TZ + 0.3]} intensity={flare1 * titleFade} rotation={t * 0.4} scale={0.9} />
          {f >= DB4 ? (
            <>
              <LensFlare position={[-M2.width / 2 + 0.1, Y2 + 0.05, TZ + 0.3]} intensity={flare2 * 0.8 * titleFade} rotation={-t * 0.3} scale={0.7} ghosts={false} />
              <Swoosh position={[0, Y2 - 0.02, TZ + 0.25]} radius={[M1.width * 0.55, 0.12]} arc={[-2.85, -0.3]} width={0.06} progress={ramp(f, DB4 + 2, DB4 + 22)}
                intensity={1.6 * titleFade} />
            </>
          ) : null}
        </>
      ) : null}
      <SpeedLines intensity={ramp(f, DB5 + 2, DB5 + 10) * (1 - ramp(f, DIVE_END - 8, DIVE_END - 2))} time={t} inner={0.4} />
      {showBedroom ? <BedroomPicture f={f} rt={rt} /> : null}
    </>
  );
};

export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  // white strobes on the title slams
  const strobe = (at: number, s: number) => (f >= at ? s * Math.exp(-(f - at) / 2.2) : 0);
  const flash = Math.min(0.9, strobe(DB3, 0.75) + strobe(DB4, 0.9) + strobe(DB5, 0.25));
  const black = 1 - ramp(f, 0, 12, (x) => x);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Stage background="#000" env="chrome" camera={{fov: 40, near: 0.02}} bloom={{strength: 0.7, radius: 0.45, threshold: 0.88}}>
        <World f={f} />
      </Stage>
      {flash > 0.002 ? <AbsoluteFill style={{background: '#fff', opacity: flash, mixBlendMode: 'screen'}} /> : null}
      {black > 0 ? <AbsoluteFill style={{background: '#000', opacity: black}} /> : null}
    </AbsoluteFill>
  );
};

// keep useMemo import referenced (handy while iterating)
void useMemo;
