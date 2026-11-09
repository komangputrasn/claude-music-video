/**
 * <KibbleSparks> — kibble as falling GOLD SPARKS (DESIGN-silhouette §4 Swing: "kibble falling like sparks").
 * The first owned food in the film: instanced HDR dawnGold nuggets, deterministic ballistic flight with a floor bounce,
 * then they slide into a heap and cool to a soft ember glow. dawnGold = owned/free: use ONLY from the hammer impact on.
 *
 *   <KibbleSparks progress={ramp(f, a, b, x => x)} origin?={[0, 0.66, 0.08]} count?={260} seed?={1} duration?={3.2}
 *                 pour?={0.4} velocity?={[0, 1.6, 1.1]} spread?={0.75} sourceRadius?={0.05} floorY?={0}
 *                 pile?={{center: [0, 0.65], radius: 0.2, height: 0.07}} size?={0.011} color?={S.dawnGold}
 *                 heat?={3} ember?={0.5} cool?={0.9} streak?={0.028} fog?={false} {...group}/>
 *
 *   progress      0..1 → simulated seconds 0..duration (linear). Feed a slowed value for bullet time. Pure function.
 *   origin        launch point (group space). Each nugget starts inside a ball of `sourceRadius` around it.
 *   pour          0..1 fraction of `duration` over which nuggets are released (0 = one burst, 0.4 = a stream).
 *   velocity      mean launch velocity [vx, vy, vz] m/s; `spread` = random extra speed (m/s) in a random direction.
 *   floorY        floor height in group space (nuggets bounce once, then slide).
 *   pile          after landing every nugget slides to a slot on a cone-shaped heap (later nuggets sit higher).
 *                 center [x, z] defaults to the mean landing point; radius m; height m. `false` = no heap (scatter).
 *   heat          HDR intensity in flight (blooms: reads as sparks); `ember` = intensity once settled (≈ under bloom);
 *                 `cool` = seconds to cool after the first landing. Gold above ~3 tone-maps toward pale yellow-white.
 *   streak        motion-blur length in seconds of travel (nuggets stretch along their velocity in flight).
 *   fog           sparks ignore fog by default (they glow through haze).
 * Origin: the group origin; everything is in group space. One draw call (InstancedMesh). The group is userData.silKeep,
 * so it keeps glowing inside a parent <Silhouette>.
 * KIBBLE_SPARKS = {size, defaults} (nugget radius and the default launch parameters).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {GroupProps, V3, hash} from './shared';

const G = 9.8;

export const KIBBLE_SPARKS = {
  /** nugget radius (m) — same as the Y2K kibble */
  size: 0.011,
  defaults: {count: 260, duration: 3.2, pour: 0.4, velocity: [0, 1.6, 1.1] as V3, spread: 0.75, heat: 3, ember: 0.5, cool: 0.9},
};

let nugget: THREE.BufferGeometry | null = null;
const nuggetGeo = () => {
  if (!nugget) {
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(0.92, 1, 0.62);
    g.deleteAttribute('uv');
    nugget = g;
  }
  return nugget;
};

type P = {
  t0: number; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  // phases
  t1: number; x1: number; z1: number; vx1: number; vy1: number; vz1: number; t2: number; x2: number; z2: number;
  tx: number; tz: number; ty: number; rx: number; ry: number; rz: number; hot: number;
};

export type KibbleSparksProps = GroupProps & {
  progress: number;
  origin?: V3;
  count?: number;
  seed?: number;
  duration?: number;
  pour?: number;
  velocity?: V3;
  spread?: number;
  sourceRadius?: number;
  floorY?: number;
  pile?: {center?: [number, number]; radius?: number; height?: number} | false;
  size?: number;
  color?: string;
  heat?: number;
  ember?: number;
  cool?: number;
  streak?: number;
  fog?: boolean;
};

export const KibbleSparks: React.FC<KibbleSparksProps> = ({
  progress, origin = [0, 0.66, 0.08], count = 260, seed = 1, duration = 3.2, pour = 0.4, velocity = [0, 1.6, 1.1], spread = 0.75,
  sourceRadius = 0.05, floorY = 0, pile = {}, size = KIBBLE_SPARKS.size, color = S.dawnGold, heat = 3, ember = 0.5, cool = 0.9,
  streak = 0.028, fog = false, ...group
}) => {
  const pileKey = pile === false ? 'none' : `${pile.center?.join(',')}|${pile.radius}|${pile.height}`;
  const parts = useMemo(() => {
    const arr: P[] = [];
    const rest = size * 0.75;
    for (let i = 0; i < count; i++) {
      const r = (k: number) => hash(i, k, seed);
      const t0 = pour * duration * Math.pow(i / Math.max(1, count - 1), 0.85) + r(0) * 0.03;
      // launch point in a small ball
      const a = r(1) * Math.PI * 2, c = r(2) * 2 - 1, rr = sourceRadius * Math.cbrt(r(3));
      const sxy = Math.sqrt(1 - c * c);
      const x = origin[0] + rr * sxy * Math.cos(a), y = origin[1] + rr * c, z = origin[2] + rr * sxy * Math.sin(a);
      // velocity = mean + random direction × spread
      const b = r(4) * Math.PI * 2, d = r(5) * 2 - 1, sp = spread * (0.25 + 0.75 * Math.sqrt(r(6)));
      const sd = Math.sqrt(1 - d * d);
      const vx = velocity[0] + sp * sd * Math.cos(b), vy = velocity[1] + sp * d * 0.8, vz = velocity[2] + sp * sd * Math.sin(b);
      // first floor hit
      const h = y - (floorY + rest);
      const t1 = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * G * Math.max(0, h)))) / G;
      const x1 = x + vx * t1, z1 = z + vz * t1;
      const vImp = vy - G * t1;
      const vy1 = -vImp * (0.22 + 0.16 * r(7));
      const vx1 = vx * 0.45, vz1 = vz * 0.45;
      const t2 = (2 * vy1) / G;
      const x2 = x1 + vx1 * t2, z2 = z1 + vz1 * t2;
      arr.push({t0, x, y, z, vx, vy, vz, t1, x1, z1, vx1, vy1, vz1, t2, x2, z2, tx: x2, tz: z2, ty: floorY + rest,
        rx: r(8) * 6.28, ry: r(9) * 6.28, rz: r(10) * 6.28, hot: r(11)});
    }
    if (pile !== false) {
      let mx = 0, mz = 0;
      for (const p of arr) {
        mx += p.x2;
        mz += p.z2;
      }
      mx /= Math.max(1, arr.length);
      mz /= Math.max(1, arr.length);
      const cx = pile.center?.[0] ?? mx, cz = pile.center?.[1] ?? mz;
      const R = pile.radius ?? 0.2, Hh = pile.height ?? 0.07;
      // heap slot: the angle comes from where it landed (so nuggets slide inward, not across), radius from a hash
      arr.forEach((p, i) => {
        const ang = Math.atan2(p.z2 - cz, p.x2 - cx) + (hash(i, 20, seed) - 0.5) * 0.9;
        const layer = Math.pow((i + 1) / arr.length, 0.6);
        const rad = R * Math.sqrt(hash(i, 21, seed)) * (1.05 - 0.45 * layer);
        p.tx = cx + Math.cos(ang) * rad;
        p.tz = cz + Math.sin(ang) * rad;
        p.ty = floorY + rest + Hh * Math.pow(Math.max(0, 1 - rad / R), 1.15) * layer;
      });
    }
    return arr;
  }, [count, seed, duration, pour, velocity[0], velocity[1], velocity[2], spread, sourceRadius, floorY, pileKey, origin[0], origin[1], origin[2], size]); // eslint-disable-line react-hooks/exhaustive-deps

  const mesh = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({color: '#ffffff', toneMapped: true, fog});
    const m = new THREE.InstancedMesh(nuggetGeo(), mat, Math.max(1, count));
    m.frustumCulled = false;
    m.userData.silKeep = true;
    const c = new THREE.Color(0, 0, 0);
    for (let i = 0; i < Math.max(1, count); i++) m.setColorAt(i, c);
    return m;
  }, [count, fog]);
  useLayoutEffect(() => () => {
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  useLayoutEffect(() => {
    const t = Math.max(0, progress) * duration;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Sc = new THREE.Vector3(), Pv = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    const base = new THREE.Color(color), hotC = new THREE.Color(S.bone), col = new THREE.Color();
    let n = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const tau = t - p.t0;
      if (tau <= 0) continue;
      let x: number, y: number, z: number, vx: number, vy: number, vz: number;
      let landed = 0;
      if (tau < p.t1) {
        x = p.x + p.vx * tau;
        y = p.y + p.vy * tau - 0.5 * G * tau * tau;
        z = p.z + p.vz * tau;
        vx = p.vx;
        vy = p.vy - G * tau;
        vz = p.vz;
      } else if (tau < p.t1 + p.t2) {
        const u = tau - p.t1;
        x = p.x1 + p.vx1 * u;
        y = floorY + size * 0.75 + p.vy1 * u - 0.5 * G * u * u;
        z = p.z1 + p.vz1 * u;
        vx = p.vx1;
        vy = p.vy1 - G * u;
        vz = p.vz1;
        landed = tau - p.t1;
      } else {
        const u = tau - p.t1 - p.t2;
        const k = 1 - Math.exp(-u / 0.16);
        x = p.x2 + (p.tx - p.x2) * k;
        z = p.z2 + (p.tz - p.z2) * k;
        y = floorY + size * 0.75 + (p.ty - floorY - size * 0.75) * Math.min(1, k * 1.15);
        const dk = Math.exp(-u / 0.16) / 0.16;
        vx = (p.tx - p.x2) * dk;
        vz = (p.tz - p.z2) * dk;
        vy = 0;
        landed = tau - p.t1;
      }
      const speed = Math.hypot(vx, vy, vz);
      // orientation: in flight align +Y with the velocity and stretch; at rest a fixed random tumble
      const stretch = Math.max(1, (speed * streak) / (size * 2));
      if (speed > 0.25) {
        dir.set(vx, vy, vz).normalize();
        Q.setFromUnitVectors(up, dir);
        Sc.set(size, size * stretch, size);
      } else {
        E.set(p.rx, p.ry, p.rz);
        Q.setFromEuler(E);
        Sc.setScalar(size);
      }
      Pv.set(x, y, z);
      M.compose(Pv, Q, Sc);
      mesh.setMatrixAt(n, M);
      // heat: hot in flight, cooling after the first landing, tiny per-nugget flicker
      const coolK = landed > 0 ? Math.exp(-landed / Math.max(0.05, cool)) : 1;
      const flick = 0.85 + 0.3 * hash(i, Math.floor(t * 18), seed + 5);
      const I = (ember + (heat - ember) * coolK) * (0.75 + 0.5 * p.hot) * (landed > 0 ? 1 : flick) / Math.max(1, stretch * 0.6);
      col.copy(base).lerp(hotC, 0.18 * coolK * p.hot).multiplyScalar(I);
      mesh.setColorAt(n, col);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group {...group} userData={{silKeep: true}}>
      <primitive object={mesh} />
    </group>
  );
};

export default KibbleSparks;
