/**
 * Shared bedroom staging for V2Rain: the room (night, rain on the window), the feeder + Pancake "waiting" spot, the
 * hung hammer, a fixed light rig (character key + gold "legendary" light + lightning) so the light COUNT never changes
 * between shots, and the rainy night outside when the window's built-in backdrop has to go (the Guy climbs through it).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Bedroom, BEDROOM_SPOTS as S, BedroomPiece} from '../../lib/sets/Bedroom';
import {Rain} from '../../lib/three';
import {canvasTex} from '../../lib/sets/exterior/common';

type V3 = [number, number, number];

/** the feeder sits by the window, LCD facing the desk side (+X); Pancake waits on its bed side, facing +X, chin on the lid */
export const FEEDER_POS: V3 = [1.15, 0, -0.42];
export const FEEDER_ROT = Math.PI / 2;
export const PANCAKE_POS: V3 = [0.56, 0, -0.42];
export const PANCAKE_ROT = Math.PI / 2;
/** where the Guy's climb root stands outside the window (guyClimb: sill top ~1.0 m, outer face +0.25 m) */
export const CLIMB_ROOT: V3 = [S.window[0], 0.92 - 1.0, -2.12 - 0.25];
export const HOOK = S.hammerHook;

let _night: THREE.Texture | null = null;
const nightTex = () => {
  if (_night) return _night;
  _night = canvasTex(1024, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#060a2c');
    g.addColorStop(0.55, '#16205a');
    g.addColorStop(0.75, '#2a2a6a');
    g.addColorStop(1, '#0c0c26');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // distant rooftops
    c.fillStyle = '#0a0b22';
    const roofs = [[0, 330, 180, 70], [170, 310, 220, 90], [380, 345, 160, 60], [560, 300, 240, 100], [800, 330, 224, 80]];
    for (const [x, y, rw, rh] of roofs) {
      c.beginPath();
      c.moveTo(x, h);
      c.lineTo(x, y + rh * 0.5);
      c.lineTo(x + rw / 2, y);
      c.lineTo(x + rw, y + rh * 0.5);
      c.lineTo(x + rw, h);
      c.fill();
    }
    // warm windows
    c.fillStyle = '#ffc66a';
    for (const [x, y] of [[60, 410], [250, 400], [300, 430], [620, 395], [700, 420], [880, 415], [930, 440]]) c.fillRect(x, y, 22, 18);
    // a street lamp glow
    const lg = c.createRadialGradient(470, 300, 0, 470, 300, 120);
    lg.addColorStop(0, 'rgba(255,190,110,0.9)');
    lg.addColorStop(1, 'rgba(255,190,110,0)');
    c.fillStyle = lg;
    c.fillRect(330, 170, 280, 260);
  });
  return _night;
};

/** rainy night beyond the window (used when the Bedroom's own 'outside' backdrop is hidden) */
export const OutsideNight: React.FC<{f: number; flash: number}> = ({f, flash}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: nightTex(), fog: false}), []);
  useLayoutEffect(() => {
    mat.color.setScalar(0.85 + flash * 2.4);
  });
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return (
    <group>
      <mesh material={mat} position={[S.window[0], 1.4, -7]}>
        <planeGeometry args={[11, 5.5]} />
      </mesh>
      <Rain time={f / 30} count={700} area={[5, 5, 4]} position={[S.window[0], -1.5, -4.3]} color="#bcd0ff" intensity={0.75 + flash}
        speed={10} wind={[0.6, 1.2]} length={0.45} width={0.007} splashes={0} />
    </group>
  );
};

export type RoomProps = {
  f: number;
  cop?: number;
  windowOpen?: number;
  hideOutside?: boolean;
  hammerGlow?: number;
  moon?: number;
  lamp?: number;
  /** warm character key near the camera */
  keyLight?: {pos: V3; intensity: number; color?: string; distance?: number};
  /** golden "legendary item" light at the hammer */
  gold?: number;
  goldPos?: V3;
  /** lightning flash 0..1 (outside) */
  flash?: number;
  hide?: BedroomPiece[];
  children?: React.ReactNode;
};

export const Room: React.FC<RoomProps> = ({
  f, cop = 0, windowOpen = 0, hideOutside = false, hammerGlow = 0, moon = 0.55, lamp = 0, keyLight: key, gold = 0, goldPos, flash = 0, hide = [], children,
}) => {
  const gp: V3 = goldPos ?? [HOOK[0] + 0.45, HOOK[1] + 0.25, HOOK[2] + 0.1];
  return (
    <Bedroom time="night" frame={f} moon={moon} lamp={lamp} copLights={cop} windowOpen={windowOpen} rainOnWindow
      hammerGlow={hammerGlow} clock={{text: '4:47'}} hide={[...(hideOutside ? (['outside'] as BedroomPiece[]) : []), ...hide]}>
      <pointLight position={key?.pos ?? [0.6, 1.7, 1.5]} color={key?.color ?? '#ffe2c4'} intensity={key?.intensity ?? 0} distance={key?.distance ?? 3.2} decay={1.4} />
      <pointLight position={gp} color="#ffc65a" intensity={gold} distance={4.5} decay={1.3} />
      <directionalLight position={[S.window[0] - 1, 4, -6]} color="#dfe8ff" intensity={flash * 3} />
      {hide.includes('lights') ? <hemisphereLight args={['#4a56b8', '#120a2a', 0.42]} /> : null}
      {hideOutside ? <OutsideNight f={f} flash={flash} /> : null}
      {children}
    </Bedroom>
  );
};
