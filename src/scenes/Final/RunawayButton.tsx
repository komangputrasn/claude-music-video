// A glossy red "CANCEL" gel button with stubby legs, sneakers and googly eyes that runs away from the cursor.
// Origin on the ground under the button, faces +Z. Pure: pose by props.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {glossMat} from '../../lib/props';
import {toonMat, outlineMat} from '../../lib/characters/toon';
import {InkMesh} from '../../lib/characters/InkMesh';
import {FONTS} from '../../lib/palette';

const BW = 1.5, BH = 0.56, BD = 0.42, LEG = 0.34;

let labelTex: THREE.CanvasTexture | null = null;
const label = () => {
  if (labelTex) return labelTex;
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 384;
  const c = cv.getContext('2d')!;
  // glossy gel highlight
  const g = c.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(40, 18, 944, 170, 85);
  c.fill();
  c.font = `bold 190px ${FONTS.ui}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 18;
  c.strokeStyle = '#7a0010';
  c.strokeText('CANCEL', 512, 212);
  c.fillStyle = '#FFFFFF';
  c.fillText('CANCEL', 512, 212);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  labelTex = t;
  return t;
};

export type RunawayButtonProps = Omit<ThreeElements['group'], 'children'> & {
  /** run-cycle phase (cycles) */
  run?: number;
  /** 0..1 how much the legs run */
  runAmount?: number;
  /** -1 squash .. 1 stretch */
  squash?: number;
  /** body lift above the legs' rest (m) for hops */
  hop?: number;
  /** eye look direction -1..1 (x) */
  look?: number;
  /** 0..1 pressed in (the click finally lands) */
  pressed?: number;
};

export const RunawayButton: React.FC<RunawayButtonProps> = ({run = 0, runAmount = 0, squash = 0, hop = 0, look = 0, pressed = 0, ...g}) => {
  const tex = label();
  const red = glossMat('#E8122A', {spec: 0.6, edge: 0.96, rim: 0.35, rimColor: '#ffb0c0'});
  const shoe = toonMat('#ffffff');
  const leg = toonMat('#1b1030');
  const sy = 1 + 0.25 * squash, sxz = 1 - 0.15 * squash;
  const legs = [-1, 1].map((s) => {
    const ph = run * Math.PI * 2 + (s > 0 ? Math.PI : 0);
    const swing = Math.sin(ph) * 0.7 * runAmount;
    const lift = Math.max(0, Math.cos(ph)) * 0.08 * runAmount;
    return {s, swing, lift};
  });
  const eye = useMemo(() => new THREE.SphereGeometry(0.1, 14, 10), []);
  const pupil = useMemo(() => new THREE.SphereGeometry(0.05, 10, 8), []);
  return (
    <group {...g}>
      {legs.map(({s, swing, lift}) => (
        <group key={s} position={[s * 0.36, LEG + hop, 0]} rotation={[swing, 0, 0]}>
          <mesh position={[0, -LEG / 2 + lift / 2, 0]} material={leg}>
            <cylinderGeometry args={[0.035, 0.035, LEG - lift, 6]} />
          </mesh>
          <InkMesh material={shoe} outline={0.012} position={[0, -LEG + lift + 0.04, 0.05]}>
            <boxGeometry args={[0.13, 0.08, 0.22]} />
          </InkMesh>
        </group>
      ))}
      <group position={[0, LEG + hop + BH / 2, 0]} scale={[sxz, sy * (1 - 0.18 * pressed), sxz]}>
        <RoundedBox args={[BW, BH, BD]} radius={0.2} smoothness={3} material={red} />
        <RoundedBox args={[BW, BH, BD]} radius={0.2} smoothness={3} material={outlineMat(0.022)} />
        <mesh position={[0, 0, BD / 2 + 0.004]}>
          <planeGeometry args={[BW * 0.92, BW * 0.92 * (384 / 1024)]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} />
        </mesh>
        {/* googly eyes on top */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.24, BH / 2 + 0.06, BD * 0.2]}>
            <InkMesh geometry={eye} color="#ffffff" outline={0.012} />
            <mesh geometry={pupil} position={[0.045 * look, 0.0, 0.07]} material={leg} />
          </group>
        ))}
      </group>
    </group>
  );
};
