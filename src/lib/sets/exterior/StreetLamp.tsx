/**
 * <StreetLamp> — sodium "cobra-head" street light: tapered pole, curved arm reaching toward local +Z, glowing amber lens,
 * soft additive light cone, warm pool decal on the ground and (optionally) a real point light. Base at y=0.
 *
 *   <StreetLamp on={1} position={[-4.7, 0.15, 0]} rotation={[0, Math.PI / 2, 0]} />   // arm points to +X (over the road)
 *   props: on 0..1 (brightness; animate for flicker), color (default C.sodium), height (7.5), arm (2.3),
 *          cone (true), pool (true), light (true: real pointLight), groundY (pool height relative to base, default 0),
 *          coneLength (default reaches ground)
 *   STREETLAMP.lens = local position of the bulb ([0, 7.2, 2.3] for defaults) — handy for flares / reflections.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {C} from '../../palette';
import {Ink, Glow, boxGeo, canvasTex, lightConeMat} from './common';

type GroupProps = ThreeElements['group'];

export const STREETLAMP = {height: 7.5, arm: 2.3, lens: [0, 7.2, 2.3] as [number, number, number]};

let _pool: THREE.Texture | null = null;
const poolTex = () => {
  if (_pool) return _pool;
  _pool = canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, {srgb: false});
  return _pool;
};

export type StreetLampProps = GroupProps & {
  on?: number;
  color?: string;
  height?: number;
  arm?: number;
  cone?: boolean;
  pool?: boolean;
  light?: boolean;
  groundY?: number;
  coneLength?: number;
  poleColor?: string;
};

export const StreetLamp: React.FC<StreetLampProps> = ({
  on = 1, color = C.sodium, height = STREETLAMP.height, arm = STREETLAMP.arm, cone = true, pool = true, light = true, groundY = 0,
  coneLength, poleColor = '#4a5560', ...g
}) => {
  const poleGeo = useMemo(() => new THREE.CylinderGeometry(0.075, 0.13, height, 8), [height]);
  const armGeo = useMemo(() => {
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, height - 0.6, 0),
      new THREE.Vector3(0, height + 0.15, 0),
      new THREE.Vector3(0, height + 0.05, arm * 0.4),
      new THREE.Vector3(0, height - 0.15, arm - 0.3),
    );
    return new THREE.TubeGeometry(curve, 16, 0.055, 6, false);
  }, [height, arm]);
  const headGeo = useMemo(() => {
    const s = new THREE.SphereGeometry(0.42, 12, 8);
    s.scale(0.62, 0.32, 1.1);
    return s;
  }, []);
  const lensY = height - 0.3;
  const len = coneLength ?? lensY - groundY;
  const coneR = len * 0.52;
  const coneGeo = useMemo(() => {
    const c = new THREE.CylinderGeometry(0.22, coneR, len, 28, 1, true);
    return c;
  }, [len, coneR]);
  const coneMat = useMemo(() => lightConeMat(color, 0.3), [color]);
  const lensMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
  const poolMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: poolTex(), color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}),
    [],
  );
  useLayoutEffect(() => {
    coneMat.uniforms.uI.value = 0.22 * on;
    lensMat.color.set(color).multiplyScalar(0.25 + on * 4.5);
    poolMat.color.set(color).multiplyScalar(0.55 * on);
  });

  return (
    <group {...g}>
      <Ink geometry={boxGeo(0.4, 0.5, 0.4)} color="#5a646e" outline={0.02} position={[0, 0.25, 0]} />
      <Ink geometry={poleGeo} color={poleColor} outline={0.025} position={[0, height / 2, 0]} />
      <Ink geometry={armGeo} color={poleColor} outline={0.02} />
      <group position={[0, height - 0.18, arm]} rotation={[0.08, 0, 0]}>
        <Ink geometry={headGeo} color="#6a747e" outline={0.025} />
        <mesh position={[0, -0.1, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[0.6, 1, 1]} material={lensMat}>
          <circleGeometry args={[0.3, 16]} />
        </mesh>
      </group>
      <Glow position={[0, lensY - 0.05, arm]} size={1.4 + on * 1.6} color={color} opacity={0.75 * on} />
      {cone && on > 0.01 ? <mesh geometry={coneGeo} material={coneMat} position={[0, lensY - len / 2, arm]} renderOrder={5} /> : null}
      {pool && on > 0.01 ? (
        <mesh position={[0, groundY + 0.025, arm]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat} renderOrder={4}>
          <planeGeometry args={[coneR * 2.6, coneR * 2.6]} />
        </mesh>
      ) : null}
      {light && on > 0.01 ? <pointLight position={[0, lensY - 0.4, arm]} color={color} intensity={on * 14} distance={16} decay={1.4} /> : null}
    </group>
  );
};
