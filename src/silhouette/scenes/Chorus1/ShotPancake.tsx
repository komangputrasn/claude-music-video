// Chorus1 · shot F — 78.95 → 83.31. Line 17: "and my dog's breakfast is locked in a box on the ground."
// Low, long lens, in the rain: Pancake sits beside the black feeder box on wet ground, alone, ears down, tail still,
// looking up at its red eye. Both are black against a pale lit concrete wall; the red iris and its pool mirror in the
// wet stone. The line is stencilled in dark paint across the wall above them (LOCKED in red).
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilPancake} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {Backlight, WetGround, SilRain, LightPool} from '../../lib/atmos';
import {Monolith} from '../../lib/props';
import {concreteTex} from '../../lib/sets';
import {bassAt, lerp} from '../../../lib/time';
import {pancakeBeg} from '../../../lib/characters/Pancake';
import {ShotProps, prog, easeOut} from './common';

export const SHOT_F = {t0: 78.95, t1: 83.31};
export const FOG_F = {color: GREYS.g2, near: 30, far: 160};

const WALL_Z = -7;

/** The wall: board-formed concrete washed with light from below (bright at its foot, fading up into the dark). */
const LitWall: React.FC = () => {
  const {mat, geo, wash, tex} = useMemo(() => {
    const W = 80, H = 30;
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgb(150,150,150)');
    gr.addColorStop(0.12, 'rgb(130,130,130)');
    gr.addColorStop(0.35, 'rgb(84,84,84)');
    gr.addColorStop(0.7, 'rgb(34,34,34)');
    gr.addColorStop(1, 'rgb(10,10,10)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 8, 256);
    const wash = new THREE.CanvasTexture(c);
    wash.colorSpace = THREE.SRGBColorSpace;
    const tex = concreteTex().clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(W / 4.8, H / 4.8);
    tex.needsUpdate = true;
    const geo = new THREE.PlaneGeometry(W, H);
    geo.translate(0, H / 2, 0);
    // second UV set not needed: the wash is applied through a tiny onBeforeCompile (vUv for the wash, scaled uv for concrete)
    const mat = new THREE.MeshBasicMaterial({map: tex, color: new THREE.Color(GREYS.g9), fog: true});
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWash = {value: wash};
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uWash;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb *= texture2D(uWash, vec2(0.5, vMapUv.y / ' + (H / 4.8).toFixed(4) + ')).rgb;');
    };
    return {mat, geo, wash, tex};
  }, []);
  useLayoutEffect(() => () => {
    mat.dispose();
    geo.dispose();
    wash.dispose();
    tex.dispose();
  }, [mat, geo, wash, tex]);
  return <mesh geometry={geo} material={mat} position={[0, 0, WALL_Z]} />;
};

export const ShotPancake: React.FC<ShotProps> = ({t, f}) => {
  const u = prog(t, SHOT_F.t0, SHOT_F.t1);
  const bass = bassAt(f);
  const beg = pancakeBeg(t, 2);
  return (
    <>
      <CameraRig position={[0, 0.32, lerp(19.5, 17.8, easeOut(u))]} target={[0, 1.6, WALL_Z]} fov={cameraFovForVisible(18)} />
      <WetGround size={[120, 120]} reflectivity={0.9} puddles={0.92} streak={0.6} ripple={0.7} time={t} color={GREYS.g1} />
      <LitWall />
      {/* light washing the foot of the wall (behind them: they stay black) */}
      <Backlight position={[0, 1.4, WALL_Z + 0.4]} size={[60, 5]} shape="slab" softness={0.9} intensity={0.32} time={t} />
      {/* LOCKED's onset flash is capped at ~1.1× (the default 1.45× red paint tone-maps orange for its 0.22 s) */}
      <WorldLyric line={17} time={t} mode="paint" color={GREYS.g1} intensity={1} size={0.6} maxWidth={12.5} position={[0, 3.6, WALL_Z + 0.03]} until={SHOT_F.t1 + 0.05}
        glow={(i, w) => (w.since < 0.22 ? 0.76 : 1)} />
      <LightPool position={[0.25, 0, -0.9]} radius={1.3} color={S.authRed} intensity={0.75} haze={0.55} hazeHeight={1.4} />
      <Monolith position={[0.42, 0, 0]} time={t} intensity={1.35 + 0.25 * bass} irisGlow={0.5} />
      <SilPancake
        pose={{...beg, tailWag: 0, tailWagAmount: 0, earPerk: -0.85, headPitch: 0.5, headYaw: 0.1}}
        position={[-0.32, 0, 0.05]}
        rotation-y={Math.PI / 2 - 0.12}
        rim={{color: S.authRed, strength: 0.5, power: 6, dir: [0.6, 0.5]}}
      />
      <SilRain time={t} area={[18, 9, 18]} position={[0, 0, 2]} count={3000} intensity={0.5} speed={11} wind={[-0.9, 0]} />
    </>
  );
};
