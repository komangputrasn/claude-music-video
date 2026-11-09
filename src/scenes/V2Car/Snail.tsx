// <Snail> — a cute low-poly racing snail (scene-local prop). Faces +Z, origin on the ground under the foot, ~0.32 m long.
// Lime body, big glossy eyes on wobbly stalks, bubblegum candy shell coiled as a tube spiral with a racing "1" roundel,
// and a tiny spoiler on the shell (matching the car's). `t` drives the foot ripple, eye wobble and blink.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {toonMat, outlineMat} from '../../lib/characters/toon';
import {glossMat} from '../../lib/props';
import {canvasTex} from '../../lib/sets/Exterior';
import {C} from '../../lib/palette';

type GroupProps = ThreeElements['group'];
const INK = 0.004;

const useSnailGeo = () =>
  useMemo(() => {
    // foot: flattened capsule along Z
    const foot = new THREE.CapsuleGeometry(0.045, 0.2, 6, 12).rotateX(Math.PI / 2);
    foot.scale(1, 0.62, 1);
    foot.translate(0, 0.028, 0);
    // neck/head rising at the front
    const neck = new THREE.CapsuleGeometry(0.038, 0.07, 6, 12);
    neck.rotateX(-0.55);
    neck.translate(0, 0.075, 0.13);
    // coiled shell: a tube along a shrinking spiral in the YZ plane, stacked slightly along X
    const pts: THREE.Vector3[] = [];
    const turns = 2.4;
    const N = 70;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = u * turns * Math.PI * 2;
      const r = 0.085 * Math.pow(1 - u, 1.15) + 0.004;
      pts.push(new THREE.Vector3(-0.012 + u * 0.03, Math.cos(a) * r, -Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const shell = new THREE.TubeGeometry(curve, 140, 1, 10, false);
    // taper the tube radius along its length (TubeGeometry has constant radius -> scale ring vertices toward the curve)
    const pos = shell.getAttribute('position') as THREE.BufferAttribute;
    const rings = 141, radial = 11;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < rings; i++) {
      const u = i / (rings - 1);
      const c = curve.getPointAt(u);
      const rad = 0.052 * Math.pow(1 - u, 1.05) + 0.006;
      for (let j = 0; j < radial; j++) {
        const k = i * radial + j;
        tmp.set(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).multiplyScalar(rad).add(c);
        pos.setXYZ(k, tmp.x, tmp.y, tmp.z);
      }
    }
    shell.computeVertexNormals();
    shell.translate(0, 0.14, -0.035);
    return {foot, neck, shell};
  }, []);

const spiralTex = () =>
  canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.lineCap = 'round';
    const cx = w / 2, cy = h / 2;
    const draw = (col: string, lw: number, off: number) => {
      c.strokeStyle = col;
      c.lineWidth = lw;
      c.beginPath();
      for (let i = 0; i <= 220; i++) {
        const u = i / 220;
        const a = u * Math.PI * 2 * 2.6 + off;
        const r = 112 * (1 - u) + 6;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    };
    draw('rgba(120,10,80,0.95)', 10, 0);
    draw('rgba(255,220,245,0.85)', 4, 0.35);
  });

const roundelTex = () =>
  canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#1b1030';
    c.lineWidth = 8;
    c.stroke();
    c.fillStyle = '#1E5BFF';
    c.font = `italic 900 92px "Arial Black", Impact, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('1', w / 2 - 2, h / 2 + 6);
  });

const Eye: React.FC<{side: number; t: number; blink: number}> = ({side, t, blink}) => {
  const wob = Math.sin(t * 5.3 + side) * 0.12;
  return (
    <group position={[side * 0.022, 0.1, 0.155]} rotation={[-0.35 + wob * 0.5, 0, side * (0.25 + wob)]}>
      <mesh position={[0, 0.035, 0]} material={toonMat('#c8ec5a')}>
        <cylinderGeometry args={[0.0065, 0.009, 0.07, 6]} />
      </mesh>
      <group position={[0, 0.078, 0.004]}>
        <mesh material={toonMat('#ffffff')} scale={[1, 1 - 0.85 * blink, 1]}>
          <sphereGeometry args={[0.021, 14, 10]} />
          <mesh material={outlineMat(INK)}>
            <sphereGeometry args={[0.021, 14, 10]} />
          </mesh>
        </mesh>
        {blink < 0.6 ? (
          <>
            <mesh position={[0, -0.002, 0.014]} material={toonMat('#1b1030')}>
              <sphereGeometry args={[0.0115, 12, 8]} />
            </mesh>
            <mesh position={[0.004, 0.004, 0.024]} material={toonMat('#ffffff', {emissive: '#ffffff', emissiveIntensity: 1})}>
              <sphereGeometry args={[0.0035, 8, 6]} />
            </mesh>
          </>
        ) : null}
      </group>
    </group>
  );
};

export const Snail: React.FC<GroupProps & {t: number; trail?: number}> = ({t, trail = 1, ...g}) => {
  const G = useSnailGeo();
  const roundel = useMemo(() => roundelTex(), []);
  const roundelMat = useMemo(() => new THREE.MeshBasicMaterial({map: roundel, transparent: true}), [roundel]);
  const spiralMat = useMemo(() => new THREE.MeshBasicMaterial({map: spiralTex(), transparent: true, depthWrite: false}), []);
  const body = toonMat('#b9f04a');
  const shellMat = glossMat(C.bubblegum, {spec: 0.25, edge: 0.985, rim: 0.3, rimColor: '#ffd0f0'});
  const ripple = Math.sin(t * 9) * 0.04;
  const blinkPh = (t * 0.6) % 1;
  const blink = blinkPh > 0.94 ? Math.sin(((blinkPh - 0.94) / 0.06) * Math.PI) : 0;
  return (
    <group {...g}>
      <group scale={[1, 1 - ripple * 0.5, 1 + ripple]}>
        <mesh geometry={G.foot} material={body}>
          <mesh geometry={G.foot} material={outlineMat(INK)} />
        </mesh>
        <mesh geometry={G.neck} material={body}>
          <mesh geometry={G.neck} material={outlineMat(INK)} />
        </mesh>
        {/* smile + blush */}
        <mesh position={[0, 0.088, 0.183]} rotation={[0.35, 0, Math.PI]} material={toonMat('#1b1030')}>
          <torusGeometry args={[0.012, 0.0025, 4, 10, Math.PI]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.026, 0.092, 0.172]} rotation={[0.3, s * 0.5, 0]} material={toonMat('#ff8fc8')}>
            <circleGeometry args={[0.007, 10]} />
          </mesh>
        ))}
        <Eye side={-1} t={t} blink={blink} />
        <Eye side={1} t={t + 0.7} blink={blink} />
      </group>
      {/* shell (bobs a little) */}
      <group position={[0, Math.abs(Math.sin(t * 4.5)) * 0.006, 0]}>
        <mesh geometry={G.shell} material={shellMat}>
          <mesh geometry={G.shell} material={outlineMat(INK)} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.062, 0.14, -0.035]} rotation={[0, (s * Math.PI) / 2, 0]} material={spiralMat}>
              <circleGeometry args={[0.085, 24]} />
            </mesh>
            <mesh position={[s * 0.064, 0.205, -0.07]} rotation={[0, (s * Math.PI) / 2, 0]} material={roundelMat}>
              <circleGeometry args={[0.02, 16]} />
            </mesh>
          </group>
        ))}
        {/* spoiler */}
        <group position={[0, 0.22, -0.11]} rotation={[0.25, 0, 0]}>
          <mesh material={toonMat('#e8ecf4')}>
            <boxGeometry args={[0.1, 0.008, 0.03]} />
            <mesh material={outlineMat(INK * 0.6)}>
              <boxGeometry args={[0.1, 0.008, 0.03]} />
            </mesh>
          </mesh>
          {[-0.035, 0.035].map((x) => (
            <mesh key={x} position={[x, -0.018, 0.004]} material={toonMat('#2a2d36')}>
              <boxGeometry args={[0.006, 0.03, 0.012]} />
            </mesh>
          ))}
        </group>
      </group>
      {/* glittery slime trail */}
      {trail > 0 ? (
        <mesh position={[0, 0.002, -0.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 1.0]} />
          <meshBasicMaterial color={C.aqua} transparent opacity={0.35 * trail} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};
