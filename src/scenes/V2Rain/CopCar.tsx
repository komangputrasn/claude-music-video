/**
 * <CopCar> — the shared hatchback re-dressed as a "POLICE+" cruiser (subscription policing, naturally): dark navy paint,
 * white door panels with a POLICE+ decal, a chunky roof light bar (red | blue) with glow sprites and two real point
 * lights that strobe with the Bedroom's copFlash(frame) pattern so the room and the street flash in sync.
 * Faces +Z like <Car>; origin on the ground between the axles.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Car} from '../../lib/props/Car';
import {Glow} from '../../lib/three';
import {toonMat} from '../../lib/characters/toon';
import {canvasTex} from '../../lib/sets/exterior/common';

type GroupProps = React.ComponentProps<'group'>;

let _decal: THREE.Texture | null = null;
const decalTex = () => {
  if (_decal) return _decal;
  _decal = canvasTex(512, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f2f4fa';
    c.beginPath();
    c.roundRect(4, 4, w - 8, h - 8, 26);
    c.fill();
    c.fillStyle = '#0a1a5a';
    c.font = 'italic 900 92px "Arial Black", Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('POLICE', w / 2 - 34, h / 2 - 8);
    c.fillStyle = '#E2231A';
    c.font = '900 110px "Arial Black", Arial, sans-serif';
    c.fillText('+', w - 66, h / 2 - 10);
    c.fillStyle = '#1E5BFF';
    c.font = 'bold 22px Tahoma, Verdana, sans-serif';
    c.fillText('PREMIUM RESPONSE  ·  $29.99/mo', w / 2, h - 26);
  });
  return _decal;
};

/** fuller light-bar pattern than the room's copFlash: one side is always lit (double-pulse), alternating every 8 frames */
export const barFlash = (frame: number) => {
  const p = ((Math.floor(frame) % 16) + 16) % 16;
  const k = p % 8;
  const on = k === 2 || k === 6 ? 0.35 : k === 7 ? 0.15 : 1;
  return p < 8 ? {red: on, blue: 0.08} : {red: 0.08, blue: on};
};

export type CopCarProps = GroupProps & {
  frame: number;
  /** 0..1 light bar on */
  bar?: number;
  wheelSpin?: number;
  bodyPitch?: number;
  bodyRoll?: number;
  headlights?: number;
  /** real point-light strength multiplier */
  lightPower?: number;
  lightDistance?: number;
};

export const CopCar: React.FC<CopCarProps> = ({frame, bar = 1, wheelSpin = 0, bodyPitch = 0, bodyRoll = 0, headlights = 1, lightPower = 1, lightDistance = 22, ...g}) => {
  const cop = barFlash(frame);
  const red = cop.red * bar;
  const blue = cop.blue * bar;
  const decalMat = useMemo(() => new THREE.MeshBasicMaterial({map: decalTex(), color: new THREE.Color(0.62, 0.62, 0.66), transparent: true, toneMapped: true}), []);
  const redMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ff2030'}), []);
  const blueMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#3060ff'}), []);
  useLayoutEffect(() => {
    redMat.color.set('#ff2030').multiplyScalar(0.35 + 3.5 * red);
    blueMat.color.set('#3060ff').multiplyScalar(0.35 + 3.8 * blue);
  });
  useLayoutEffect(() => () => {
    decalMat.dispose();
    redMat.dispose();
    blueMat.dispose();
  }, [decalMat, redMat, blueMat]);
  return (
    <group {...g}>
      <group rotation={[bodyPitch, 0, bodyRoll]}>
        <Car paint="#2c3c86" plate="POLICE+" headlights={headlights} wheelSpin={wheelSpin} interior={false} beams={headlights > 0.5} />
        {/* door decals */}
        <mesh material={decalMat} position={[0.875, 0.72, 0.12]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.05, 0.33]} />
        </mesh>
        <mesh material={decalMat} position={[-0.875, 0.72, 0.12]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.05, 0.33]} />
        </mesh>
        {/* light bar */}
        <group position={[0, 1.5, -0.15]}>
          <mesh material={toonMat('#20232e')} position={[0, 0.03, 0]}>
            <boxGeometry args={[1.1, 0.06, 0.26]} />
          </mesh>
          <mesh material={redMat} position={[0.3, 0.1, 0]}>
            <boxGeometry args={[0.46, 0.1, 0.22]} />
          </mesh>
          <mesh material={blueMat} position={[-0.3, 0.1, 0]}>
            <boxGeometry args={[0.46, 0.1, 0.22]} />
          </mesh>
          <mesh material={toonMat('#e8ecf4')} position={[0, 0.1, 0]}>
            <boxGeometry args={[0.12, 0.1, 0.23]} />
          </mesh>
          <Glow position={[0.3, 0.12, 0]} size={2.4} color="#ff2a3a" intensity={2.4 * red} />
          <Glow position={[-0.3, 0.12, 0]} size={2.4} color="#3a6aff" intensity={2.8 * blue} />
          <Glow position={[0.3, 0.12, 0]} size={7} color="#ff2a3a" intensity={0.5 * red} squash={2.4} />
          <Glow position={[-0.3, 0.12, 0]} size={7} color="#3a6aff" intensity={0.6 * blue} squash={2.4} />
          <pointLight color="#ff1a2a" position={[0.5, 0.4, 0]} intensity={red * 60 * lightPower} distance={lightDistance} decay={1.6} />
          <pointLight color="#2a5bff" position={[-0.5, 0.4, 0]} intensity={blue * 70 * lightPower} distance={lightDistance} decay={1.6} />
        </group>
      </group>
    </group>
  );
};
