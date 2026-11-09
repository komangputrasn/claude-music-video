/**
 * <Keys> — the Guy's key ring: chrome split ring, two keys (silver + brass) and a candy-aqua Y2K fob with a star.
 * Origin = the ring (put it in the Guy's grip slot); keys dangle along -Y, faces +Z. `jingle` (rad) swings them.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {chromeMat as envChrome, glossMat, candyMat} from '../../lib/props';

type GroupProps = Omit<ThreeElements['group'], 'children'>;

const keyShape = () => {
  const s = new THREE.Shape();
  // bow (round head) + blade with teeth, in metres, hanging down from y=0
  s.absarc(0, -0.016, 0.014, Math.PI * 0.5, Math.PI * 2.5, false);
  const h = new THREE.Path();
  h.absarc(0, -0.009, 0.004, 0, Math.PI * 2, true);
  s.holes.push(h);
  const blade = new THREE.Shape();
  blade.moveTo(-0.0045, -0.026);
  blade.lineTo(0.0045, -0.026);
  blade.lineTo(0.0045, -0.068);
  blade.lineTo(0.0, -0.072);
  blade.lineTo(-0.0045, -0.068);
  blade.lineTo(-0.0045, -0.062);
  blade.lineTo(-0.009, -0.058);
  blade.lineTo(-0.0045, -0.054);
  blade.lineTo(-0.009, -0.049);
  blade.lineTo(-0.0045, -0.045);
  blade.lineTo(-0.009, -0.04);
  blade.lineTo(-0.0045, -0.036);
  blade.closePath();
  return [s, blade];
};

export const Keys: React.FC<GroupProps & {jingle?: number}> = ({jingle = 0, ...g}) => {
  const geo = useMemo(() => {
    const k = new THREE.ExtrudeGeometry(keyShape(), {depth: 0.003, bevelEnabled: true, bevelSize: 0.0008, bevelThickness: 0.0008, bevelSegments: 1, curveSegments: 10});
    k.translate(0, 0, -0.0015);
    const ring = new THREE.TorusGeometry(0.017, 0.0022, 6, 20);
    const fob = new THREE.CapsuleGeometry(0.012, 0.03, 4, 10);
    const star = new THREE.OctahedronGeometry(0.008, 0);
    return {k, ring, fob, star};
  }, []);
  const silver = envChrome('#e8ecf4', 0.18);
  const brass = envChrome('#f0c060', 0.22);
  const fob = candyMat('#19C6FF', 0.85);
  const starM = glossMat('#FF4FB8', {emissive: '#FF4FB8', emissiveIntensity: 0.6});
  const a = jingle;
  return (
    <group {...g}>
      <mesh geometry={geo.ring} material={silver} rotation={[0, Math.PI / 2, 0]} />
      <group position={[0, -0.014, 0]} rotation={[0, 0, 0.35 + 0.25 * Math.sin(a)]}>
        <mesh geometry={geo.k} material={silver} />
      </group>
      <group position={[0, -0.014, 0.003]} rotation={[0, 0.3, -0.3 + 0.3 * Math.sin(a + 1.3)]}>
        <mesh geometry={geo.k} material={brass} scale={0.9} />
      </group>
      <group position={[0, -0.014, -0.004]} rotation={[0, 0, 0.05 + 0.2 * Math.sin(a + 2.4)]}>
        <mesh geometry={geo.fob} material={fob} position={[0, -0.03, 0]} />
        <mesh geometry={geo.star} material={starM} position={[0, -0.03, 0.012]} scale={[1, 1, 0.4]} />
      </group>
    </group>
  );
};
