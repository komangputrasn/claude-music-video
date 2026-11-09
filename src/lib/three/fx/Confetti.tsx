/**
 * <Confetti> — instanced, tumbling paper confetti in Y2K colours plus little chrome stars. Pure function of
 * `progress` (burst) or `time` (fall): instance matrices are rebuilt in useLayoutEffect, no clocks.
 *
 * Modes
 *  - 'burst' (default): everything launches from the group origin upward in a cone, flutters with air drag and falls.
 *    progress 0..1 maps to `duration` seconds of flight (pieces shrink away over the last 12%). progress <= 0 hides it.
 *  - 'fall': continuous confetti rain through `area` [w,h,d] (origin = base centre), wrapping; driven by `time` (s).
 *
 * Props (+ group props)
 *   progress?: 0..1   time?: s (fall mode)   mode?: 'burst' | 'fall'   count?: 220   seed?: 1   duration?: 3.2 (s, burst)
 *   power?: 1 (launch speed multiplier)   spread?: 0.75 (cone half-angle, rad)   gravity?: 9.8   size?: 1 (piece scale)
 *   area?: [8, 6, 4] (fall)   colors?: css[] (Y2K palette)   stars?: 0.14 (fraction that are stars)
 *   starMaterial?: Y2KPreset | THREE.Material = 'chrome'
 *
 * Usage
 *   <Confetti progress={ramp(f, 30, 126, t => t)} position={[0, 0.5, 0]} />        // pop!
 *   <Confetti mode="fall" time={t} area={[10, 7, 5]} count={300} />
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {rand} from '../../time';
import {y2kMat, Y2KPreset} from '../materials';
import {GroupProps} from './shared';

const DEFAULT_COLORS = ['#FF4FB8', '#19C6FF', '#9BFF3A', '#FF8A1E', '#8A4DFF', '#FFE14D', '#1E5BFF', '#FFFFFF'];

let paperGeo: THREE.BufferGeometry | null = null;
const getPaperGeo = () => {
  if (!paperGeo) {
    const g = new THREE.PlaneGeometry(0.1, 0.055, 4, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / 0.1) * Math.PI) * 0.01); // slight curl
    g.computeVertexNormals();
    paperGeo = g;
  }
  return paperGeo;
};
let starGeo: THREE.BufferGeometry | null = null;
const getStarGeo = () => {
  if (!starGeo) {
    const s = new THREE.Shape();
    const R = 0.07, r = 0.03;
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r : R;
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2});
    g.translate(0, 0, -0.006);
    g.computeVertexNormals();
    starGeo = g;
  }
  return starGeo;
};
let paperMat: THREE.MeshStandardMaterial | null = null;
const getPaperMat = () => {
  if (!paperMat) {
    paperMat = new THREE.MeshStandardMaterial({side: THREE.DoubleSide, roughness: 0.42, metalness: 0.15, envMapIntensity: 1.1});
    // a bit of self-illumination from the instance colour so confetti stays poppy in dim scenes
    paperMat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance += vColor * 0.28;\n#endif',
      );
    };
  }
  return paperMat;
};

type Piece = {v: THREE.Vector3; k: number; flutA: number; flutW: number; flutP: number; rotAxis: THREE.Vector3; rotW: number; rotP: number; base: THREE.Vector3; fall: number; scale: number};

export type ConfettiProps = GroupProps & {
  progress?: number;
  time?: number;
  mode?: 'burst' | 'fall';
  count?: number;
  seed?: number | string;
  duration?: number;
  power?: number;
  spread?: number;
  gravity?: number;
  size?: number;
  area?: [number, number, number];
  colors?: readonly string[];
  stars?: number;
  starMaterial?: Y2KPreset | THREE.Material;
};

export const Confetti: React.FC<ConfettiProps> = ({
  progress = 0, time = 0, mode = 'burst', count = 220, seed = 1, duration = 3.2, power = 1, spread = 0.75, gravity = 9.8, size = 1,
  area = [8, 6, 4], colors = DEFAULT_COLORS, stars = 0.14, starMaterial = 'chrome', ...group
}) => {
  const nStar = Math.round(count * stars);
  const nPaper = count - nStar;
  const paperRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.InstancedMesh>(null);
  const pieces = useMemo(() => {
    const out: Piece[] = [];
    for (let i = 0; i < count; i++) {
      const r = (k: string) => rand(`conf|${seed}|${i}|${k}`);
      const th = Math.sqrt(r('th')) * spread, ph = r('ph') * Math.PI * 2;
      const sp = (4.5 + 5 * r('sp')) * power;
      out.push({
        v: new THREE.Vector3(Math.sin(th) * Math.cos(ph) * sp, Math.cos(th) * sp, Math.sin(th) * Math.sin(ph) * sp),
        k: 2.6 + 1.6 * r('k'),
        flutA: 0.12 + 0.25 * r('fa'),
        flutW: 3 + 4 * r('fw'),
        flutP: r('fp') * 6.28,
        rotAxis: new THREE.Vector3(r('ax') - 0.5, r('ay') - 0.5, r('az') - 0.5).normalize(),
        rotW: (5 + 9 * r('rw')) * (r('rs') > 0.5 ? 1 : -1),
        rotP: r('rp') * 6.28,
        base: new THREE.Vector3(r('bx') - 0.5, r('by'), r('bz') - 0.5),
        fall: 0.7 + 0.8 * r('fs'),
        scale: (0.75 + 0.5 * r('sc')) * size,
      });
    }
    return out;
  }, [count, seed, spread, power, size]);

  // colours (set once per mesh/config)
  useLayoutEffect(() => {
    const m = paperRef.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < nPaper; i++) {
      c.set(colors[Math.floor(rand(`conf|${seed}|${i}|col`) * colors.length)]);
      m.setColorAt(i, c);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [nPaper, seed, colors]);

  useLayoutEffect(() => {
    const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const tDur = progress * duration;
    const hide = mode === 'burst' && progress <= 0;
    const shrink = mode === 'burst' ? 1 - THREE.MathUtils.smoothstep(progress, 0.88, 1) : 1;
    const place = (i: number) => {
      const P = pieces[i];
      let t: number;
      if (mode === 'burst') {
        t = tDur;
        const e = Math.exp(-P.k * t);
        const vt = -gravity / P.k;
        pos.set(P.v.x * (1 - e) / P.k, vt * t + (P.v.y - vt) * (1 - e) / P.k, P.v.z * (1 - e) / P.k);
        const fl = Math.min(1, t * 1.2);
        pos.x += Math.sin(t * P.flutW + P.flutP) * P.flutA * fl;
        pos.z += Math.cos(t * P.flutW * 0.8 + P.flutP) * P.flutA * fl;
      } else {
        t = time;
        const H = area[1];
        const y = H - (((P.base.y * H + t * P.fall) % H) + H) % H;
        pos.set(P.base.x * area[0] + Math.sin(t * P.flutW * 0.5 + P.flutP) * P.flutA, y, P.base.z * area[2] + Math.cos(t * P.flutW * 0.4 + P.flutP) * P.flutA);
      }
      q.setFromAxisAngle(P.rotAxis, P.rotP + P.rotW * t);
      const s = hide ? 0 : P.scale * shrink;
      scl.set(s, s, s);
      tmpM.compose(pos, q, scl);
      return tmpM;
    };
    const pm = paperRef.current, sm = starRef.current;
    if (pm) {
      for (let i = 0; i < nPaper; i++) pm.setMatrixAt(i, place(i));
      pm.instanceMatrix.needsUpdate = true;
    }
    if (sm) {
      for (let j = 0; j < nStar; j++) sm.setMatrixAt(j, place(nPaper + j));
      sm.instanceMatrix.needsUpdate = true;
    }
  });

  const sMat = starMaterial instanceof THREE.Material ? starMaterial : y2kMat(starMaterial, {side: THREE.DoubleSide});
  return (
    <group {...group}>
      {nPaper > 0 ? <instancedMesh key={`p${nPaper}`} ref={paperRef} args={[getPaperGeo(), getPaperMat(), nPaper]} frustumCulled={false} /> : null}
      {nStar > 0 ? <instancedMesh key={`s${nStar}`} ref={starRef} args={[getStarGeo(), sMat, nStar]} frustumCulled={false} /> : null}
    </group>
  );
};
