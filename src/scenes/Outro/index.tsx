/**
 * OUTRO (frames 6126–6600, 204.2–220.0 s, instrumental) — the CRT bookend.
 *
 *   O1   0– 80  Home video (camcorder PLAY OSD, NOV 09 2002): sunrise porch, the Guy reading his paper 1984 on the top step,
 *               Pancake sitting by his licked-clean bowl, wagging. Rocker-zoom steps on the beats.
 *   O2  81–146  DB 206.91: Pancake close-up looking into the camcorder, head tilts, tongue out. The Guy glances over.
 *   O3 147–211  DB 209.10: two-shot: he closes the book and holds the paper 1984 up to the lens, grinning; Pancake hops.
 *   O4 212–276  DB 211.28: PULL BACK — it is all playing on the CRT in the tidy morning bedroom (sunrise in the window).
 *   O5 277–342  DB 213.44: BOOKEND of V1Bedroom's 3:15 AM opening camcorder wide (same camera + slow creep), now 7:15 AM
 *               dawn: the Guy asleep smiling, Pancake asleep at the foot of the bed, grandpa's hammer back on its hook (glow),
 *               the smashed FeedMe + the empty PANCAKE bowl on the feeder spot, the TV still playing at frame right.
 *   O6 343–374  DB 215.64: the tape freezes (PAUSE), the CRT switches off: picture collapses to a line, then a dot.
 *   O7 375–474  final hit 216.70: end card in the Intro's void — chrome "BUY NOW, / FOR NOW", "click to cancel" link (the
 *               last lyric); the cursor clicks it (218.43) -> "✓ cancelled" (it works, for once), then the whole card
 *               collapses like a CRT to a dot -> black by ~219.6 s.
 * The porch footage is rendered live into a 4:3 render target (Intro/rtt) shown on the bedroom CRT, so the reveal is one
 * continuous camera move.
 */
import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../../lib/three';
import {BEATS, ramp, lerp, noise1} from '../../lib/time';
import {Bedroom, BEDROOM_SPOTS} from '../../lib/sets/Bedroom';
import {Guy, guySleepyWake, mergePose, guyPoint} from '../../lib/characters/Guy';
import {Pancake, pancakeLie} from '../../lib/characters/Pancake';
import {Feeder, HungHammer, KibblePile, DogBowl} from '../../lib/props';
import {Zzz} from '../V1Bedroom/props';
import {CRT_SCREEN} from '../../lib/props/CRTTV';
import {Cursor, clickAt} from '../../lib/ui';
import {RenderToTexture, useRenderTarget, useLiveCanvas, V3} from '../Intro/rtt';
import {PorchFootage, porchCamera, PORCH_RT, BAND, drawCamcorderOSD, useOverlayScene, OsdMode} from './Porch';
import {EndCard3D} from './EndCard';

const FROM = 6126;
const LB = BEATS.filter((b) => b >= 204.1).map((b) => Math.round(b * 30) - FROM); // local beat frames
const O4 = 212; // DB 211.28 pull back
const O5 = 277; // DB 213.44 room
const O6 = 343; // DB 215.64 TV off
const OFF0 = O6 + 6; // power-off starts
const O7 = 375; // final hit: end card
const CLICK = O7 + 52; // 218.4 s: the cursor clicks "click to cancel" (it works, for once): link -> "cancelled"
const COLLAPSE = CLICK + 13; // then the whole card switches off like a CRT; black from ~219.6 s

// ------------------------------------------------------------------------------------------------ TV geometry (room space)
const S = BEDROOM_SPOTS;
const SCR: V3 = S.tvScreen;
const N: V3 = S.tvNormal;
const R: V3 = [N[2], 0, -N[0]]; // camera-right when looking at the screen = (n.z, 0, -n.x)
const GLASS = 0.004; // glass bulge in front of tvScreen
const FILL_K = (BAND * CRT_SCREEN.height) / (CRT_SCREEN.width * (9 / 16)); // visible picture width fraction when filling
const fillDist = (fov: number) => (CRT_SCREEN.width * FILL_K) / 2 / (Math.tan((fov * Math.PI) / 360) * (16 / 9));
const at = (d: number, r = 0, u = 0): V3 => [SCR[0] + N[0] * d + R[0] * r, SCR[1] + u, SCR[2] + N[2] * d + R[2] * r];
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const PANCAKE_BED: V3 = [-1.06, 0.7, -0.4];
const mixV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

type Cam = {p: V3; t: V3; fov: number; roll?: number};
const roomCamera = (lf: number): Cam => {
  const t = lf / 30;
  if (lf < O4) return {p: at(GLASS + fillDist(40)), t: SCR, fov: 40};
  if (lf < O5) {
    const k = ramp(lf, O4, O5 + 4, Easing.inOut(Easing.cubic));
    const k2 = ramp(lf, O4 + 8, O5 + 4, Easing.inOut(Easing.quad));
    const d = lerp(GLASS + fillDist(40), 1.95, k);
    return {p: at(d, lerp(0, 0.3, k2), lerp(0, 0.16, k2)), t: at(0, lerp(0, -0.42, k2), lerp(0, -0.1, k2)), fov: lerp(40, 44, k2), roll: lerp(0, -0.02, k2)};
  }
  if (lf < O6) {
    // bookend: EXACTLY V1Bedroom's 3:15 AM opening wide (same camera + creep), now at 7:15 in the morning, peaceful
    const g = lf - O5;
    const k = ramp(g, 0, 66, (x) => x);
    const hand = (f: number, amp: number, seed: number): V3 => [amp * noise1(f * 0.05, seed), amp * 0.7 * noise1(f * 0.06, seed + 1), amp * 0.5 * noise1(f * 0.045, seed + 2)];
    const ad = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    return {p: ad(mixV([0.85, 1.72, 1.9], [0.62, 1.58, 1.55], k), hand(g, 0.02, 3)), t: ad(mixV([-0.35, 0.78, -1.05], [-0.45, 0.85, -1.05], k), hand(g + 40, 0.025, 4)),
      fov: 58, roll: 0.015 * noise1(g * 0.03, 5) + 0 * t};
  }
  const k = ramp(lf, O6, O7, Easing.out(Easing.quad));
  return {p: mixV(at(0.85, -0.42, 0.06), at(0.6, -0.3, 0.03), k), t: at(0, 0.02, -0.02), fov: 38};
};

// ------------------------------------------------------------------------------------------------ bedroom world
const RoomWorld: React.FC<{lf: number}> = ({lf}) => {
  const t = lf / 30;
  const rt = useRenderTarget(PORCH_RT.w, PORCH_RT.h);
  const frozen = lf >= O6;
  const footLf = frozen ? O6 - 1 : lf;
  const mode: OsdMode = frozen ? 'pause' : 'play';
  const osdKey = `${mode}|${frozen ? Math.floor(lf / 15) % 2 : footLf}`;
  const hud = useLiveCanvas(1024, 768, osdKey, (ctx, c) => {
    drawCamcorderOSD(ctx, c.width, c.height, footLf, mode);
    if (frozen && Math.floor(lf / 15) % 2 === 1) ctx.clearRect(0, 0, c.width * 0.45, c.height * 0.4); // blink PAUSE
  });
  const overlay = useOverlayScene(hud.tex, 1.6);
  const cam = roomCamera(lf);
  // power: hold 1, collapse to a line and a lingering dot, then off
  const power = lf < OFF0 ? 1 : lf < OFF0 + 12 ? lerp(1, 0.075, ramp(lf, OFF0, OFF0 + 12, Easing.in(Easing.quad))) : lerp(0.075, 0, ramp(lf, OFF0 + 14, OFF0 + 24));
  // VHS pause jitter on the frozen frame
  const stat = frozen ? 0.06 + 0.05 * Math.abs(noise1(lf * 0.7, 9)) : 0.015;
  const flicker = 1 + 0.15 * noise1(lf * 0.9, 21);
  const porchCam = porchCamera(footLf, LB);
  const sleeper = mergePose(guySleepyWake(0), {expression: 'happy', blink: 1, mouthOpen: 0.04 + 0.04 * Math.max(0, Math.sin(t * 2.6)), headTilt: 0.2});
  const showFootage = lf < OFF0 + 16;
  return (
    <>
      <CameraRig position={cam.p} target={cam.t} fov={cam.fov} roll={cam.roll} />
      <Bedroom time="dawn" frame={lf} moon={1.1} lamp={0} hammerGlow={0.5}
        bed={{tilt: 0, glow: 0, blanket: 1}} pillow={{glow: 0, talk: 0}} clock={{text: '7:15', brightness: 0.8}}
        tv={{screen: showFootage ? rt.texture : null, power, glow: lerp(0.8, 1.05, ramp(lf, O4, O4 + 30)), static: stat, light: 0.9 * flicker, lightColor: '#bcd8ff'}}>
        {/* character key (warm, distance-limited) so the sleepers read */}
        <pointLight position={[0.9, 1.9, 0.6]} color="#ffe2c4" intensity={1.1} distance={3.6} decay={1.4} />
        <Guy position={S.guyLieInBed} pose={sleeper} shadow={false} outlineScale={1.5} />
        <Zzz frame={lf} fade={0.9} position={add3(add3(S.guyLieInBed, guyPoint(sleeper, 'eyes') as V3), [0.12, 0.12, 0.05])} size={0.15} />
        {/* Pancake asleep at the foot of the bed, exactly where he slept at 3:15 AM; sleepy tail thumps */}
        <group position={PANCAKE_BED} rotation={[0, 0.55, 0]}>
          <Pancake pose={{...pancakeLie(t, true), tailWag: t * 0.9, tailWagAmount: 0.25, earPerk: -0.5 + 0.25 * Math.max(0, Math.sin(t * 1.7)) ** 8}}
            outlineScale={1.3} shadow={false} />
        </group>
        <Zzz frame={lf + 20} fade={0.85} position={add3(PANCAKE_BED, [0.1, 0.3, 0.3])} size={0.08} />
        <HungHammer position={S.hammerHook} glow={0.6} />
        {/* what's left of the FeedMe PLUS on its old spot + the plain bowl, licked clean */}
        <group position={S.feeder} rotation={[0, -0.5, 0]}>
          <Feeder smashed={1} lid={1.6} locked={false} lcdText="ERR" lcdColor="#ff5a4a" kibbleFill={0} time={t} />
        </group>
        <DogBowl position={[0.36, 0, -0.98]} rotation={[0, 0.7, 0]} fill={0} />
      </Bedroom>
      {showFootage ? (
        <RenderToTexture target={rt} camera={porchCam} background="#ffb36b" overlay={overlay} beforeRender={hud.update}>
          <PorchFootage lf={footLf} />
        </RenderToTexture>
      ) : null}
    </>
  );
};

// ------------------------------------------------------------------------------------------------ end card 2D layers
const LINK_Y = 800;
const LinkAndCursor: React.FC<{ef: number}> = ({ef}) => {
  const show = ramp(ef, 16, 24);
  const cx = 960;
  const mv = ramp(ef, 26, 46, Easing.inOut(Easing.cubic));
  const away = ramp(ef + O7, CLICK + 4, CLICK + 12, Easing.out(Easing.quad)); // after the click the hand drifts off the word
  const x = lerp(1500, cx + 70, mv) + Math.sin(mv * Math.PI) * 40 + 120 * away;
  const y = lerp(1010, LINK_Y + 6, mv) - Math.sin(mv * Math.PI) * 60 + 50 * away;
  const hover = mv > 0.92;
  const click = clickAt(ef + O7, CLICK, 12);
  const lf = ef + O7;
  const done = lf >= CLICK + 2;
  const ring = done ? ramp(lf, CLICK + 2, CLICK + 14, Easing.out(Easing.cubic)) : 0;
  const pop = done ? 1 + 0.18 * Math.exp(-(lf - CLICK - 2) / 3) : 1;
  const col = done ? '#9BFF3A' : hover ? '#FF7AD0' : '#BFF3FF';
  const glow = done ? 'rgba(155,255,58,0.95)' : hover ? 'rgba(255,79,184,0.9)' : 'rgba(25,198,255,0.9)';
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {done ? (
        <div style={{position: 'absolute', left: 960 - 40 - 260 * ring, top: LINK_Y - 12 - 60 * ring, width: 80 + 520 * ring, height: 24 + 120 * ring,
          borderRadius: '50%', border: `${3 + 3 * (1 - ring)}px solid rgba(155,255,58,${(1 - ring) * 0.9})`, boxShadow: `0 0 24px rgba(155,255,58,${(1 - ring) * 0.8})`}} />
      ) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: LINK_Y - 30, textAlign: 'center', opacity: show, transform: `translateY(${(1 - show) * 14}px) scale(${pop})`}}>
        <span style={{
          fontFamily: 'Verdana, Tahoma, sans-serif', fontSize: 40, fontWeight: 700, letterSpacing: 1,
          color: col, textDecoration: done ? 'none' : 'underline', textDecorationThickness: 3, textUnderlineOffset: 7,
          textShadow: `0 0 14px ${glow}, 0 2px 0 rgba(0,0,40,0.9)`,
        }}>
          {done ? '\u2713 cancelled' : 'click to cancel'}
        </span>
      </div>
      {ef >= 28 ? <Cursor kind={hover ? 'hand' : 'arrow'} x={x} y={y} click={click} size={64} /> : null}
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => {
  const lf = useCurrentFrame();
  const t = lf / 30;
  const ef = lf - O7;
  // CRT-style collapse of the end card after the click
  const c0 = COLLAPSE;
  const sy = lf < c0 ? 1 : lerp(1, 0.004, ramp(lf, c0, c0 + 7, Easing.in(Easing.cubic)));
  const sx = lf < c0 + 7 ? 1 : lerp(1, 0.004, ramp(lf, c0 + 7, c0 + 13, Easing.in(Easing.cubic)));
  const bright = lf < c0 ? 1 : 1 + 2.5 * ramp(lf, c0, c0 + 7);
  const beam = lf < c0 + 3 ? 0 : ramp(lf, c0 + 3, c0 + 7) * (1 - ramp(lf, c0 + 7, c0 + 13));
  const dot = lf < c0 + 10 ? 0 : ramp(lf, c0 + 10, c0 + 13) * (1 - ramp(lf, c0 + 15, c0 + 32));
  const cardVisible = sx > 0.006;
  // white strobe on the end-card slam
  const strobe = ef >= 0 && ef < 8 ? 0.7 * Math.exp(-ef / 2.2) : 0;
  const showRoom = lf < O7;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {showRoom || cardVisible ? (
        <AbsoluteFill style={{transform: showRoom ? undefined : `scale(${sx}, ${sy})`, filter: bright > 1 ? `brightness(${bright})` : undefined}}>
          <Stage background="#000" env="sunset" camera={{fov: 40, near: 0.02}} bloom={{strength: 0.65, radius: 0.45, threshold: 0.88}}>
            {showRoom ? <RoomWorld lf={lf} /> : <EndCard3D ef={ef} t={t} />}
          </Stage>
          {!showRoom ? <LinkAndCursor ef={ef} /> : null}
        </AbsoluteFill>
      ) : null}
      {beam > 0 ? (
        <div style={{position: 'absolute', left: 960 - 960 * sx, width: 1920 * sx, top: 537, height: 6, background: '#fff', opacity: beam,
          boxShadow: '0 0 18px 6px rgba(190,240,255,0.9)'}} />
      ) : null}
      {dot > 0 ? (
        <div style={{position: 'absolute', left: 960 - 40, top: 540 - 40, width: 80, height: 80, borderRadius: 40, opacity: dot,
          background: 'radial-gradient(circle, #ffffff 0%, #e8f8ff 18%, rgba(140,200,255,0.55) 36%, rgba(60,120,255,0) 70%)'}} />
      ) : null}
      {strobe > 0.002 ? <AbsoluteFill style={{background: '#fff', opacity: strobe, mixBlendMode: 'screen'}} /> : null}
    </AbsoluteFill>
  );
};

