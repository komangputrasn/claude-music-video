// TENURE module look-dev: every component of src/silhouette/lib/tenure staged as a real shot of the film
// (fog, backlight, long lens, tiny silhouettes for scale, letterbox). One component per shot, 80 frames each:
//   0 TenureScreen wordmark   80 TenureScreen variants   160 TermsScroll   240 Stencil   320 LeaseTags wall going dark
//   400 LeaseTags city        480 IrisWall               560 GiantLetters  640 FloatingPrice
//   720 TenureScreen presets wall (price, sleep, plusOnly / identity, thermal, wordmark)
//   800 edge paths: full-red 'declined' at full pulse, glow Stencil, 2-column centred TermsScroll, hex IrisWall 'pulse'
//       ripple, scattered billboard LeaseTags lighting up (onFrom/onTo)
//   node scripts/still.mjs silplay Tenure --frames=40,100,150,200,280,350,385,440,495,540,600,628,690,760,815,845
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {SilStage, CameraRig} from '../lib/SilStage';
import {SilGuy, SilPancake} from '../lib/SilCast';
import {Iris} from '../lib/Iris';
import {S, GREYS, hdr, cameraFovForVisible} from '../lib/palette';
import {Letterbox} from '../overlays/SilOverlays';
import {guyIdle, guyWalk} from '../../lib/characters/Guy';
import {pancakeSad, pancakeIdle, pancakeWalk} from '../../lib/characters/Pancake';
import {bassAt, lerp, ramp} from '../../lib/time';
import {
  TenureScreen, TermsScroll, Stencil, LeaseTags, leaseTagBox, mergeTagSets, IrisWall, irisWallCell, GiantLetters, FloatingPrice,
  leaseCode, TagSet, leaseTagsLit,
} from '../lib/tenure';

export const duration = 880;
const SHOT = 80;

// ---------------------------------------------------------------------------------------------- staging helpers
const radialTex = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
/** vertical band: bright at the bottom edge, fading up (ground fog lit from behind) */
const bandTex = () => {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 256, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const Glow: React.FC<{color?: string; intensity?: number; scale?: [number, number]; position?: [number, number, number]; rotation?: [number, number, number]; band?: boolean}> = ({
  color = S.bone, intensity = 0.7, scale = [20, 12], position = [0, 0, 0], rotation = [0, 0, 0], band = false,
}) => {
  const tex = useMemo(() => (band ? bandTex() : radialTex()), [band]);
  return (
    <mesh position={position} rotation={rotation} scale={[scale[0], scale[1], 1]}>
      <planeGeometry />
      <meshBasicMaterial map={tex} color={hdr(color, intensity)} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

const Ground: React.FC<{size?: number; color?: string}> = ({size = 2000, color = S.void}) => (
  <mesh rotation-x={-Math.PI / 2}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

const Block: React.FC<{size: [number, number, number]; position?: [number, number, number]; color?: string}> = ({size, position = [0, 0, 0], color = GREYS.g1}) => (
  <mesh position={[position[0], position[1] + size[1] / 2, position[2]]}>
    <boxGeometry args={size} />
    <meshBasicMaterial color={color} />
  </mesh>
);

const RIM = {color: S.bone, strength: 0.9, dir: [0, 1] as [number, number]};
const RIM_RED = {color: S.authRed, strength: 0.8, dir: [0, 1] as [number, number]};

// ---------------------------------------------------------------------------------------------- city layout (shot F)
const CITY: {x: number; z: number; w: number; d: number; h: number}[] = (() => {
  const out: {x: number; z: number; w: number; d: number; h: number}[] = [];
  for (let i = -4; i <= 4; i++) {
    for (let j = -5; j <= 1; j++) {
      if (Math.abs(i) <= 1 && j >= -1) continue; // the plaza (open toward the camera)
      if (j === 1 && Math.abs(i) <= 2) continue; // keep the camera's line of sight into the plaza clear
      const k = (i + 4) * 7 + (j + 5);
      const h = 40 + ((k * 37) % 90);
      out.push({x: i * 44, z: j * 44, w: 30 + ((k * 13) % 8), d: 30 + ((k * 7) % 8), h});
    }
  }
  return out;
})();

export default function Tenure() {
  const f = useCurrentFrame();
  const shot = Math.min(10, Math.floor(f / SHOT));
  const lf = f - shot * SHOT; // shot-local frame
  const t = f / 30;
  const lt = lf / 30;
  const pulse = Math.min(1, bassAt(1732 + f * 2) * 1.2);

  const citySet = useMemo<TagSet>(
    () => mergeTagSets(...CITY.map((b, i) => leaseTagBox({width: b.w, depth: b.d, height: b.h, density: 0.4, seed: i, x: b.x, z: b.z}))),
    [],
  );

  let fog: {color: string; near: number; far: number} = {color: S.ash, near: 20, far: 200};
  let body: React.ReactNode = null;

  if (shot === 0) {
    // ---- A. TENURE wordmark on a facade; the Guy and Pancake walk toward it through ground fog
    fog = {color: S.ash, near: 40, far: 320};
    body = (
      <>
        <CameraRig position={[0, 1.7, 75 - lt * 1.2]} target={[0, 17, -75]} fov={cameraFovForVisible(17)} />
        <Ground />
        <Block size={[150, 95, 10]} position={[0, 0, -85]} />
        <TenureScreen position={[0, 9, -80]} width={46} height={19.5} content="wordmark" time={t} pulse={pulse} />
        <Glow band color={S.fog} intensity={0.75} scale={[220, 16]} position={[0, 7, -62]} />
        <Glow color={S.bone} intensity={0.25} scale={[260, 120]} position={[0, 40, -95]} />
        <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[-0.8, 0, 18 - lt * 1.1]} rim={RIM} />
        <SilPancake pose={{...pancakeWalk(t), tailWagAmount: 0}} rotation-y={Math.PI} position={[0.4, 0, 17.6 - lt * 1.1]} rim={RIM} />
      </>
    );
  } else if (shot === 1) {
    // ---- B. Variants: full-red title slab ("BUY NOW," dimmed), bone-on-black and red-on-black status screens
    fog = {color: S.ash, near: 25, far: 200};
    // Intro title: letter by letter, then "BUY NOW," dims hard on the downbeat leaving "FOR NOW"
    const dim = lf >= 52 ? 0.16 : 1;
    const reveal = Math.floor(lf / 2.4);
    body = (
      <>
        <CameraRig position={[0, 1.6, 42]} target={[0, 7, -50]} fov={cameraFovForVisible(19)} />
        <Ground />
        <Block size={[34, 0.3, 4]} position={[0, 0, -52]} color={S.void} />
        <TenureScreen
          position={[0, 0.3, -52]}
          width={30}
          height={12.6}
          background="red"
          content={{chrome: false, lines: [{spans: [{text: 'BUY NOW, ', opacity: dim}, {text: 'FOR NOW'}], size: 0.3, tracking: 0.2, ink: 'void'}]}}
          intensity={1.15}
          time={t}
          reveal={reveal}
          pulse={pulse * 0.5}
        />
        <TenureScreen position={[-24.5, 0.6, -45]} rotation-y={0.4} width={14} height={7.9} content="declined" ink="bone" time={t} pulse={pulse} haze={0.25} />
        <TenureScreen position={[24.5, 0.6, -45]} rotation-y={-0.4} width={14} height={7.9} content="upgrade" time={t} pulse={pulse} haze={0.25} />
        <SilGuy pose={guyIdle(t)} rotation-y={Math.PI} position={[-0.4, 0, -40]} rim={RIM_RED} />
        <SilPancake pose={{...pancakeSad(t), tailWagAmount: 0}} rotation-y={Math.PI / 2 + 0.5} position={[0.8, 0, -39.6]} rim={RIM_RED} />
      </>
    );
  } else if (shot === 2) {
    // ---- C. Terms of service scrolling up a skyscraper like credits; tiny figure at the lit entrance
    fog = {color: S.ash, near: 60, far: 420};
    body = (
      <>
        <CameraRig position={[0, 1.6, 118]} target={[0, 21, 0]} fov={cameraFovForVisible(26)} />
        <Ground />
        <Glow color={S.bone} intensity={0.55} scale={[420, 300]} position={[0, 60, -160]} />
        <Block size={[56, 230, 40]} position={[0, 0, -20]} />
        <Block size={[40, 150, 30]} position={[-75, 0, -170]} color={GREYS.g2} />
        <Block size={[40, 190, 30]} position={[80, 0, -190]} color={GREYS.g2} />
        <TermsScroll position={[0, 10, 0.2]} width={50} height={190} fontSize={1.5} speed={2.4} time={t} intensity={0.9} seed={3} />
        <mesh position={[0, 4.5, 0.15]}>
          <planeGeometry args={[7, 9]} />
          <meshBasicMaterial color={hdr(S.bone, 0.8)} />
        </mesh>
        <Glow color={S.bone} intensity={0.35} scale={[26, 16]} position={[0, 4.5, 0.4]} />
        <SilGuy pose={guyWalk(t)} rotation-y={Math.PI} position={[0.6, 0, 7 - lt * 1.0]} rim={RIM} />
      </>
    );
  } else if (shot === 3) {
    // ---- D. Stencils on the feeder monolith (NUTRITION UNIT · PLUS ONLY / LEASE 0315-77); Pancake looks up
    fog = {color: S.ash, near: 8, far: 60};
    body = (
      <>
        <CameraRig position={[3.4, 0.36, 9.0]} target={[-0.35, 1.5, 0]} fov={cameraFovForVisible(22)} />
        <Ground />
        <Glow color={S.bone} intensity={0.8} scale={[30, 15]} position={[-4, 2.2, -9]} />
        <Glow band color={S.fog} intensity={0.55} scale={[60, 4]} position={[0, 0.6, -6]} />
        <Block size={[1.5, 3.4, 1.0]} position={[0, 0, -0.5]} color={S.void} />
        <Stencil text={'NUTRITION UNIT\nPLUS ONLY'} size={0.085} position={[0, 2.86, 0.006]} wear={0.25} seed={2} />
        <Stencil text={leaseCode()} font="mono" size={0.1} position={[0, 0.55, 0.006]} wear={0.5} />
        <Stencil text={'TENURE PROPERTY \u00B7 DO NOT OPEN'} font="mono" weight={400} size={0.035} position={[0, 2.42, 0.006]} wear={0.6} intensity={0.35} seed={9} />
        <Iris position={[0, 1.62, 0.01]} radius={0.2} time={t} pupil={0.28} intensity={1.6} />
        <SilPancake pose={{...pancakeSad(t), headPitch: 0.42, tailWagAmount: 0}} rotation-y={Math.PI / 2 - 0.15} position={[-1.55, 0, 0.9]} rim={RIM} />
      </>
    );
  } else if (shot === 4) {
    // ---- E. A wall of lease tags goes dark one by one behind him (Swing: "every last thing on a plan")
    fog = {color: S.ash, near: 12, far: 110};
    const t0 = (shot * SHOT) / 30;
    body = (
      <>
        <CameraRig position={[0, 1.3, 20]} target={[0, 3.2, -12]} fov={cameraFovForVisible(24)} />
        <Ground />
        <mesh position={[0, 15, -12.1]}>
          <planeGeometry args={[90, 30]} />
          <meshBasicMaterial color={S.void} />
        </mesh>
        <Glow color={S.authRed} intensity={0.08 + 0.26 * leaseTagsLit(t, t0 + 0.4, t0 + 2.4)} scale={[34, 14]} position={[0, 4, -11.9]} />
        <LeaseTags position={[0, 0, -12]} grid={{width: 46, height: 24, cols: 58, rows: 72, fill: 0.8, jitter: 0.12}} size={0.56} time={t} offFrom={t0 + 0.4} offTo={t0 + 2.4} intensity={1.7} seed={4} />
        <SilGuy pose={guyIdle(t)} position={[-0.3, 0, 0]} rim={RIM_RED} />
        <SilPancake pose={{...pancakeIdle(t), tailWagAmount: 0}} rotation-y={Math.PI / 2 - 0.3} position={[0.9, 0, 0.3]} rim={RIM_RED} />
      </>
    );
  } else if (shot === 5) {
    // ---- F. Crane over the plaza: every building tagged (~200k tags on 52 blocks, one draw call)
    fog = {color: S.ash, near: 50, far: 360};
    const up = ramp(lf, 0, SHOT - 1);
    body = (
      <>
        <CameraRig position={[0, lerp(40, 75, up), 190]} target={[0, lerp(14, 4, up), -40]} fov={cameraFovForVisible(28)} />
        <Ground />
        <Glow color={S.authRed} intensity={0.3} scale={[46, 46]} position={[0, 0.2, 12]} rotation={[-Math.PI / 2, 0, 0]} />
        <Glow band color={S.fog} intensity={0.35} scale={[900, 70]} position={[0, 20, -260]} />
        {CITY.map((b, i) => (
          <Block key={i} size={[b.w, b.h, b.d]} position={[b.x, 0, b.z]} color={S.void} />
        ))}
        <LeaseTags positions={citySet.positions} facing={citySet.facing} size={1.1} time={t} intensity={1.9} minPx={1.8} flicker={0.2} seed={7} />
        <SilGuy pose={guyWalk(t)} rotation-y={Math.PI - 0.3} position={[2, 0, 12 - lt * 1.2]} rim={RIM_RED} />
      </>
    );
  } else if (shot === 6) {
    // ---- G. Intro pull-back: one of thousands of irises on a city wall at night in fog (wave opens them)
    fog = {color: S.ash, near: 30, far: 260};
    const t0 = (shot * SHOT) / 30;
    const layout = {cols: 96, rows: 40, spacing: 1.45};
    const hero = irisWallCell(48, 8, layout);
    const back = ramp(lf, 0, SHOT - 1);
    body = (
      <>
        <CameraRig position={[hero[0], lerp(hero[1], 6, back), lerp(-28, 70, back)]} target={[hero[0], lerp(hero[1], 18, back), -40]} fov={cameraFovForVisible(24)} />
        <Ground />
        <IrisWall position={[0, 0, -40]} {...layout} radius={0.52} time={t} wave={{center: [hero[0], hero[1]], start: t0 + 0.2, speed: 26, width: 10}} skip={[[48, 8]]} blink={0.05} seed={1} />
        <Iris position={[hero[0], hero[1], -39.98]} radius={0.52} time={t} open={ramp(lf, 0, 12)} pupil={0.3 + 0.05 * pulse} intensity={1.6} />
        <Glow band color={S.fog} intensity={0.55} scale={[200, 6]} position={[0, 1.5, -30]} />
        <SilGuy pose={guyIdle(t)} rotation-y={Math.PI} position={[-6, 0, -20]} rim={RIM} />
      </>
    );
  } else if (shot === 7) {
    // ---- H. "BUY NOW" in monumental letters; lease timers count down, then the letters flicker and fall (Final)
    fog = {color: S.ash, near: 120, far: 1000};
    const H = 75;
    body = (
      <>
        <CameraRig position={[0, 0.55, 330]} target={[0, 42, -250]} fov={cameraFovForVisible(32)} />
        <Ground />
        <Glow color={S.bone} intensity={0.4} scale={[1300, 520]} position={[0, 110, -330]} />
        <Glow band color={S.fog} intensity={0.5} scale={[900, 30]} position={[0, 10, -150]} />
        <GiantLetters
          text="BUY NOW"
          position={[0, 0, -250]}
          height={H}
          time={t}
          timers
          perLetter={(i) => {
            const st0 = 0.9 + i * 0.22;
            const fall = ramp(lf, 34 + i * 4, 60 + i * 4, (x) => x);
            return {
              timer: Math.max(0, 9 + i * 4 - lt * 3),
              flicker: lf > 26 ? Math.min(1, (lt - st0) * 1.2) * (fall < 1 ? 1 : 0) : 0,
              fall,
              fallDir: i % 3 === 1 ? -1 : 1,
            };
          }}
        />
        {[-34, -22, -12, 9, 20, 31, 44].map((x, k) => (
          <SilGuy key={k} pose={guyIdle(t + k * 1.7, k)} rotation-y={Math.PI} position={[x * 0.42, 0, 292 - (k % 3) * 5]} rim={RIM_RED} />
        ))}
        <SilGuy pose={guyWalk(t)} position={[1.5, 0, 286 + lt * 1.2]} rim={RIM_RED} />
      </>
    );
  } else if (shot === 10) {
    // ---- K. Paths the film shots above don't cover: a status preset's full-red variant at a full bass pulse (capped at
    //      2x), a light-stencil (glow), a two-column centred TermsScroll, a hex IrisWall with a 'pulse' ripple, and
    //      scattered billboard LeaseTags lighting up one by one (onFrom/onTo)
    fog = {color: S.ash, near: 25, far: 220};
    const t0 = (shot * SHOT) / 30;
    body = (
      <>
        <CameraRig position={[0, 1.2, 34]} target={[0, 3, -40]} fov={cameraFovForVisible(22)} />
        <Ground />
        <Block size={[110, 40, 4]} position={[0, 0, -44]} />
        <Glow band color={S.fog} intensity={0.45} scale={[160, 5]} position={[0, 1.2, -39]} />
        <TenureScreen position={[0, 0.4, -42]} width={15} height={8.4} content="declined" background="red" time={t} pulse={1} haze={0.3} />
        <Stencil text="PAYMENT DECLINED" glow color={S.authRed} intensity={1.5} size={1.1} position={[0, 12.4, -41.9]} wear={0.3} />
        <TermsScroll position={[-24, 0.5, -41.8]} width={20} height={16} columns={2} align="center" fontSize={0.55} speed={1.2} time={t} seed={11} intensity={0.85} />
        <IrisWall position={[24, 0.5, -41.9]} cols={13} rows={12} spacing={1.5} hex radius={0.55} time={t} wave={{start: t0 + 0.2, speed: 9, width: 2.5, mode: 'pulse'}} blink={0.04} seed={3} />
        <LeaseTags position={[0, 0, -24]} scatter={{size: [60, 2.5, 8]}} count={500} billboard size={0.5} time={t} onFrom={t0 + 0.1} onTo={t0 + 2.4} seed={12} />
        <SilGuy pose={guyIdle(t)} rotation-y={Math.PI} position={[0, 0, -36]} rim={RIM_RED} />
      </>
    );
  } else if (shot === 9) {
    // ---- J. Every status preset on one facade (a wall of screens); bone and red variants, pulsing on the bass
    fog = {color: S.ash, near: 30, far: 260};
    const presets = ['price', 'sleep', 'plusOnly', 'identity', 'thermal', 'wordmark'] as const;
    body = (
      <>
        <CameraRig position={[0, 1.5, 70]} target={[0, 15, -40]} fov={cameraFovForVisible(24)} />
        <Ground />
        <Block size={[90, 60, 6]} position={[0, 0, -46]} />
        {presets.map((p, k) => (
          <TenureScreen
            key={p}
            position={[(k % 3 - 1) * 25, k < 3 ? 17.5 : 4.5, -43]}
            width={22}
            height={11.5}
            content={p}
            time={t + k}
            pulse={pulse * (k % 2 ? 1 : 0.6)}
            haze={0.2}
          />
        ))}
        <Glow band color={S.fog} intensity={0.55} scale={[160, 6]} position={[0, 1.5, -30]} />
        <SilGuy pose={guyWalk(t)} rotation-y={-Math.PI / 2} position={[4 - lt * 1.1, 0, -14]} rim={RIM} />
      </>
    );
  } else {
    // ---- I. The house as a black cube under a floating price projected on fog
    fog = {color: S.ash, near: 15, far: 160};
    body = (
      <>
        <CameraRig position={[0, 1.4, 34]} target={[0, 8, -30]} fov={cameraFovForVisible(24)} />
        <Ground />
        <Glow color={S.fog} intensity={0.45} scale={[160, 70]} position={[0, 14, -60]} />
        <Glow band color={S.fog} intensity={0.5} scale={[160, 5]} position={[0, 1.2, -22]} />
        <Block size={[11, 11, 11]} position={[0, 0, -32]} color={S.void} />
        <FloatingPrice text="$4.99 / NIGHT" size={1.9} position={[0, 15.2, -32]} time={t} />
        <FloatingPrice text={'SLEEP · METERED'} font="mono" size={0.55} position={[0, 12.9, -32]} time={t} intensity={1.0} haze={0.3} color={S.bone} />
        <SilGuy pose={guyIdle(t)} rotation-y={Math.PI} position={[-0.6, 0, -6]} rim={RIM} />
        <SilPancake pose={{...pancakeSad(t), headPitch: 0.35, tailWagAmount: 0}} rotation-y={Math.PI / 2 + 0.3} position={[0.6, 0, -6.2]} rim={RIM} />
      </>
    );
  }

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <SilStage fog={fog}>{body}</SilStage>
      <Letterbox />
    </AbsoluteFill>
  );
}
