// A Y2K dialog that gets a CANCELLED stamp and then SHATTERS into glassy shards (with its own texture on every shard),
// plus a confetti/star burst. Pure: `stampAt` / `shatterAt` / `f` are frames (any clock, same units).
//   <ShatterPopup spec={...} width={2.4} f={lf} stampAt={300} shatterAt={306} position={[0, 0, -2]} />
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {Popup3D, Stamp3D, popupSize, useDialogTexture} from '../../lib/ui';
import type {DialogSpec} from '../../lib/ui';
import {Confetti, SparkleField, Glow} from '../../lib/three/fx';
import {rand, clamp01} from '../../lib/time';

type V3 = [number, number, number];

type Shard = {geo: THREE.BufferGeometry; c: V3; dir: V3; spin: V3; speed: number};

const COLS = 7, ROWS = 5;

/** jittered grid -> two triangles per cell, each triangle centred on its own centroid */
const buildShards = (w: number, h: number, seed: string): Shard[] => {
  const P: [number, number][][] = [];
  for (let j = 0; j <= ROWS; j++) {
    P.push([]);
    for (let i = 0; i <= COLS; i++) {
      const edgeX = i === 0 || i === COLS, edgeY = j === 0 || j === ROWS;
      const jx = edgeX ? 0 : (rand(`${seed}x${i}-${j}`) - 0.5) * 0.7;
      const jy = edgeY ? 0 : (rand(`${seed}y${i}-${j}`) - 0.5) * 0.7;
      P[j].push([((i + jx) / COLS - 0.5) * w, ((j + jy) / ROWS - 0.5) * h]);
    }
  }
  const out: Shard[] = [];
  let n = 0;
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++) {
      const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i + 1], d = P[j + 1][i];
      const flip = rand(`${seed}f${i}-${j}`) > 0.5;
      const tris = flip ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const tri of tris) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const pos = new Float32Array(9), uv = new Float32Array(6);
        tri.forEach((p, k) => {
          pos[k * 3] = p[0] - cx;
          pos[k * 3 + 1] = p[1] - cy;
          pos[k * 3 + 2] = 0;
          uv[k * 2] = p[0] / w + 0.5;
          uv[k * 2 + 1] = p[1] / h + 0.5;
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.computeVertexNormals();
        const r = (k: string) => rand(`${seed}-${n}-${k}`);
        const len = Math.hypot(cx, cy) + 1e-3;
        out.push({
          geo,
          c: [cx, cy, 0],
          dir: [cx / len + (r('dx') - 0.5) * 0.6, cy / len + (r('dy') - 0.5) * 0.6 + 0.25, 0.5 + r('dz') * 1.3],
          spin: [(r('sx') - 0.5) * 9, (r('sy') - 0.5) * 9, (r('sz') - 0.5) * 7],
          speed: 0.6 + r('sp') * 1.1,
        });
        n++;
      }
    }
  return out;
};

export type ShatterPopupProps = Omit<ThreeElements['group'], 'children'> & {
  spec: DialogSpec;
  width?: number;
  f: number;
  stampAt: number;
  shatterAt: number;
  /** frames the shards fly */
  dur?: number;
  stampText?: string;
  stampWidth?: number;
  seed?: string;
  pr?: number;
  sheen?: number;
  /** blast strength multiplier */
  power?: number;
  confetti?: boolean;
  /** show the CANCELLED stamp (false: the dialog just bursts) */
  stamp?: boolean;
};

export const ShatterPopup: React.FC<ShatterPopupProps> = ({spec, width = 2.4, f, stampAt, shatterAt, dur = 30, stampText = 'CANCELLED', stampWidth,
  seed = 'sh', pr = 3, sheen, power = 1, confetti = true, stamp = true, ...group}) => {
  const tex = useDialogTexture(spec, {pr});
  const S = popupSize(spec, width);
  const shards = useMemo(() => buildShards(S.w, S.h, seed), [S.w, S.h, seed]);
  useLayoutEffect(() => () => shards.forEach((s) => s.geo.dispose()), [shards]);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({map: tex, side: THREE.DoubleSide, toneMapped: false, transparent: true}),
    [tex],
  );
  const stampP = clamp01((f - stampAt) / 14);
  const sp = (f - shatterAt) / dur; // 0..1 shard flight
  const broken = f >= shatterAt;
  const opacity = broken ? 1 - clamp01((sp - 0.6) / 0.4) : 1;
  useLayoutEffect(() => {
    mat.opacity = opacity;
  });
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  const flash = broken ? Math.exp(-(f - shatterAt) / 3) : 0;
  return (
    <group {...group}>
      {!broken ? (
        <Popup3D spec={spec} width={width} pr={pr} sheen={sheen} saturation={1.35}>
          {/* squash the slam's lift along Z so the stamp never flies through a close camera */}
          {stamp ? (
            <group position={[0, -0.02 * width, S.frontZ + 0.01]} scale={[1, 1, 0.22]}>
              <Stamp3D text={stampText} progress={stampP} width={stampWidth ?? width * 0.72} />
            </group>
          ) : null}
        </Popup3D>
      ) : (
        <>
          {sp < 1
            ? shards.map((s, i) => {
                const u = Math.max(0, sp);
                const d = (1 - Math.pow(1 - u, 2)) * s.speed * width * 0.9 * power;
                const g = u * u * width * 0.9;
                return (
                  <mesh key={i} geometry={s.geo} material={mat}
                    position={[s.c[0] + s.dir[0] * d, s.c[1] + s.dir[1] * d - g, s.c[2] + s.dir[2] * d + 0.02]}
                    rotation={[s.spin[0] * u, s.spin[1] * u, s.spin[2] * u]} scale={1 - 0.35 * u} />
                );
              })
            : null}
          {/* the stamp itself pops off toward the lens */}
          {stamp && sp < 0.35 ? (
            <group position={[0, -sp * width * 0.5, S.frontZ + 0.05 + sp * width * 0.3]} rotation={[0, 0, sp * 1.5]} scale={1 + sp * 0.4}>
              <Stamp3D text={stampText} progress={1} width={stampWidth ?? width * 0.72} opacity={1 - sp / 0.35} />
            </group>
          ) : null}
          <Glow size={width * 0.9 * (0.6 + flash)} color="#fff4d0" intensity={0.45 * flash} />
          {confetti ? (
            <Confetti progress={clamp01((f - shatterAt) / 60)} count={90} power={1.1 * power} spread={1.5} size={width * 0.38} duration={2.2}
              seed={seed.length * 7 + 3} stars={0.2} position={[0, 0, 0.1]} />
          ) : null}
          <SparkleField count={14} seed={seed.length + 11} area={[S.w * 1.4, S.h * 1.4, 0.6]} time={f / 30} size={width * 0.12}
            intensity={3 * Math.exp(-(f - shatterAt) / 12)} />
        </>
      )}
    </group>
  );
};
