// Shots A1–B2: the "Click to Cancel" monument rises on a hilltop plaza (PASSED!), then the court's giant gavel smashes it.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {CameraRig, ChromeText, Confetti, LensFlare, SparkleField, Glow, gelButtonMat} from '../../lib/three';
import {SkyDome, ExteriorLights, RollingHills, hillsHeight, Cloud} from '../../lib/sets/Exterior';
import {Guy, guyPhoneToEar, guyIdle, mergePose, guyPoint, GuyPose} from '../../lib/characters/Guy';
import {Cursor3D} from '../../lib/ui';
import {HeldHammer, HeldPhone, FlipPhone, FLIPPHONE} from '../../lib/props';
import {toonMat, outlineMat} from '../../lib/characters/toon';
import {popIn, rand, noise1, lerp} from '../../lib/time';
import {C} from '../../lib/palette';
import {W, SHOT} from './times';
import {Solid, boxGeo, cylGeo, sphGeo, icoGeo, coneGeo, V3, lin, smooth, easeOutBack, easeInCubic, easeOutCubic, shake, addV, lerpV, clamp01} from './kit';

// ------------------------------------------------------------------ timing (local frames)
export const RISE_A = 4; // monument starts rising (A1)
export const RISE_B = 40; // fully risen (lands just before "passed")
export const PASSED_F = Math.round(W.passed) - 2; // PASSED! slam + confetti
export const WORD_F: [number, number, number] = [W.click - 3, W.to - 3, W.cancel - 3];
export const IMPACT = 145; // gavel hits (between the beat at 143 and the sung "no" at 147)
const GAVEL_IN = SHOT.B1; // 127

// ------------------------------------------------------------------ monument geometry
const PILL_R = 1.35;
const PILL_LEN = 6.9;
const PILL_Z = 0.62; // depth squash
const PED_H = 1.0;
const PILL_Y = PED_H + PILL_R;
export const PILL_TOP: V3 = [0, PILL_Y + PILL_R, 0];
const TEXT = 'CLICK TO CANCEL';
export const PILL_COLOR = '#0a8cf0';
const wordOf = (i: number) => (i < 5 ? 0 : i < 7 ? 1 : 2);
const wordStart = [0, 5, 7];

const PILL_VS = `varying vec3 vN; varying vec3 vP; varying vec3 vVN;
void main(){ vN = normalize(normal); vP = position; vVN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PILL_FS = `uniform vec3 uDeep, uMid, uGlow; uniform float uHalfLen, uR, uBright;
varying vec3 vN; varying vec3 vP; varying vec3 vVN;
float ss(float a, float b, float x) { return a < b ? smoothstep(a, b, x) : 1.0 - smoothstep(b, a, x); }
void main(){
  float ny = clamp(vN.y, -1.0, 1.0);
  vec3 c = mix(uMid, uDeep, ss(-0.15, 0.95, ny));
  c = mix(c, uGlow, ss(-0.25, -0.95, ny));
  float fres = pow(clamp(1.0 - abs(vVN.z), 0.0, 1.0), 2.2);
  c *= 1.0 - 0.45 * fres;
  float ex = ss(uHalfLen + uR * 0.62, uHalfLen - uR * 0.05, abs(vP.x));
  float g = ss(0.30, 0.62, ny) * ss(0.999, 0.80, ny) * ex;
  c = mix(c, vec3(1.0), g * 0.88);
  float glint = ss(0.035, 0.0, abs(ny - 0.2)) * ex * 0.25;
  c += glint;
  gl_FragColor = vec4(max(c * uBright, vec3(0.0)), 1.0);
}`;
const pillMatCache = new Map<number, THREE.ShaderMaterial>();
/** Mac-OS-X-style aqua gel: deep blue top, white gloss cap inset from the ends, glowing cyan bottom. Light-independent. */
const aquaPillMat = (bright = 1) => {
  const key = Math.round(bright * 20) / 20;
  let m = pillMatCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      vertexShader: PILL_VS, fragmentShader: PILL_FS, toneMapped: false,
      uniforms: {
        uDeep: {value: new THREE.Color('#021c7a')}, uMid: {value: new THREE.Color('#0757d6')}, uGlow: {value: new THREE.Color('#38c8ff')},
        uHalfLen: {value: PILL_LEN / 2}, uR: {value: PILL_R}, uBright: {value: key},
      },
    });
    pillMatCache.set(key, m);
  }
  return m;
};

const pillGeo = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (!g) {
      g = new THREE.CapsuleGeometry(PILL_R, PILL_LEN, 12, 40);
      g.rotateZ(Math.PI / 2);
      g.scale(1, 1, PILL_Z);
    }
    return g;
  };
})();

/** The giant glossy aqua "CLICK TO CANCEL" gel button on its pedestal. */
export const Monument: React.FC<{f: number; rise: number; shatterT: number; glow?: number}> = ({f, rise, shatterT, glow = 1}) => {
  const y = -5.2 * (1 - easeOutBack(rise, 1.2));
  const broken = shatterT >= 0;
  const t = f / 30;
  return (
    <group position={[0, y, 0]}>
      {/* pedestal: white marble plinth with a chrome band and a gold plaque */}
      <Solid geometry={boxGeo(11.2, PED_H, 3.0)} color="#eef1f8" position={[0, PED_H / 2, 0]} ink={0.04} />
      <Solid geometry={boxGeo(11.5, 0.18, 3.3)} color="#dfe6f3" position={[0, 0.09, 0]} ink={0.03} />
      <mesh position={[0, PED_H - 0.08, 0]} material={gelButtonMat('#9fb6d8')}>
        <boxGeometry args={[11.3, 0.12, 3.1]} />
      </mesh>
      {!broken ? (
        <group>
          <mesh geometry={pillGeo()} position={[0, PILL_Y, 0]} material={aquaPillMat(0.55 + 0.45 * glow)} />
          <mesh geometry={pillGeo()} position={[0, PILL_Y, 0]} material={outlineMat(0.05)} />
          <Glow position={[0, PILL_Y, -0.6]} size={13} color={C.aqua} intensity={0.55 * glow} squash={2.4} />
        </group>
      ) : null}
      <ChromeText text={TEXT} font="ArialBlack" size={0.56} anchor="center" position={[0, PILL_Y - 0.02, PILL_R * PILL_Z + 0.1]}
        outline={{thickness: 0.055, color: '#030a2e'}} shine={lin(f, WORD_F[2] + 4, WORD_F[2] + 26)} brightness={1.22}
        perLetter={(i) => {
          const w = wordOf(i);
          const k = popIn(f, WORD_F[w] + (i - wordStart[w]) * 1.2, 9);
          if (!broken) return {scale: Math.max(0.001, k), position: [0, (1 - Math.min(1, k)) * 0.9, 0]};
          const s = (n: string) => rand(`ltr-${i}-${n}`);
          const tau = shatterT;
          const vx = (i - 7) * 0.55 + (s('x') - 0.5) * 3;
          const vy = 4 + s('y') * 5;
          const vz = 3 + s('z') * 5;
          const yy = Math.max(-PILL_Y + 0.3, vy * tau - 4.9 * tau * tau);
          return {position: [vx * tau, yy, vz * tau], rotation: [tau * (s('a') - 0.5) * 9, tau * (s('b') - 0.5) * 9, tau * (s('c') - 0.5) * 7]};
        }} />
      {broken ? <Shards tau={shatterT} /> : null}
      <SparkleField count={14} seed={5} area={[9, 3, 1]} position={[0, PILL_Y + 0.3, 0.9]} time={t} size={0.55} intensity={broken ? 0 : 2.2 * glow} />
    </group>
  );
};

/** instanced gel shards of the broken button */
const SHARDS = 90;
const Shards: React.FC<{tau: number}> = ({tau}) => {
  const ref = React.useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({length: SHARDS}, (_, i) => {
        const r = (k: string) => rand(`shard-${i}-${k}`);
        const x = (r('x') * 2 - 1) * (PILL_LEN / 2 + PILL_R * 0.7);
        const a = r('a') * Math.PI * 2;
        const p = new THREE.Vector3(x, PILL_Y + Math.sin(a) * PILL_R * 0.9, Math.cos(a) * PILL_R * PILL_Z * 0.9);
        const dir = p.clone().sub(new THREE.Vector3(0.4, PILL_Y + PILL_R, 0)).normalize();
        const sp = 3 + r('s') * 7;
        const v = new THREE.Vector3(dir.x * sp, Math.abs(dir.y) * sp * 0.5 + 2 + r('u') * 5, dir.z * sp + 2.5 + r('w') * 4);
        const axis = new THREE.Vector3(r('ax') - 0.5, r('ay') - 0.5, r('az') - 0.5).normalize();
        return {p, v, axis, w: (r('w2') - 0.5) * 18, s: 0.5 + r('sz') * 1.1};
      }),
    [],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    seeds.forEach((s, i) => {
      // bounce once on the ground (y = 0.15 relative to plaza) with damping
      let y = s.p.y + s.v.y * tau - 4.9 * tau * tau;
      let tt = tau;
      const floor = 0.12;
      if (y < floor) {
        // time of first contact
        const a = -4.9, b = s.v.y, c = s.p.y - floor;
        const t1 = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        const vb = Math.abs(s.v.y - 9.8 * t1) * 0.3;
        const t2 = tau - t1;
        y = floor + Math.max(0, vb * t2 - 4.9 * t2 * t2);
        tt = t1 + t2 * 0.35;
      }
      pos.set(s.p.x + s.v.x * tt, y, s.p.z + s.v.z * tt);
      q.setFromAxisAngle(s.axis, s.w * tt);
      sc.set(s.s, s.s * 0.45, s.s * 0.8);
      M.compose(pos, q, sc);
      m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[icoGeo(0.42, 0), gelButtonMat(PILL_COLOR), SHARDS]} frustumCulled={false} />;
};

/** cartoon dust puffs: grow then shrink (no transparency) */
export const Puffs: React.FC<{p: number; count?: number; radius?: [number, number]; size?: number; seed?: number; color?: string; bottom?: string; y?: number;
  spreadZ?: number; zOff?: number} & {
  position?: V3;
}> = ({p, count = 16, radius = [1, 5], size = 1, seed = 1, color = '#f6efe2', bottom = '#c9b9a4', y = 0.3, spreadZ = 1, zOff = 0, position}) => {
  if (p <= 0 || p >= 1) return null;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => rand(`puff-${seed}-${i}-${k}`);
    const a = r('a') * Math.PI * 2;
    const d = lerp(radius[0], radius[1], easeOutCubicLocal(p) * (0.6 + 0.4 * r('d')));
    const s = size * (0.5 + r('s') * 0.8) * Math.sin(Math.PI * Math.min(1, p * (1 + r('k') * 0.4))) ;
    if (s <= 0.01) continue;
    items.push(
      <Cloud key={i} seed={1 + Math.floor(r('g') * 6)} puffs={4} position={[Math.cos(a) * d, y + p * 0.8 * r('y') + s * 0.25, Math.sin(a) * d * spreadZ + zOff]}
        scale={[s * 1.3, s, s]} rotation={[0, r('ry') * 6, 0]} top={color} bottom={bottom} emissive={0.22} />,
    );
  }
  return <group position={position}>{items}</group>;
};
const easeOutCubicLocal = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

// ------------------------------------------------------------------ the gavel
const WOOD = '#8b4a1f', WOOD_HEAD = '#9b5426', WOOD_DARK = '#3a2210', WOOD_END = '#c88a4f';
const HANDLE = 6.2;
/** Giant low-poly wooden gavel. Origin = pivot at the handle's butt; handle along -X; head axis vertical at theta = 0. */
export const Gavel: React.FC<{theta: number} & {position?: V3}> = ({theta, position}) => (
  <group position={position} rotation={[0, 0, theta]}>
    <Solid geometry={cylGeo(0.26, 0.3, HANDLE, 12)} color={WOOD} rotation={[0, 0, Math.PI / 2]} position={[-HANDLE / 2, 0, 0]} ink={0.04} />
    <Solid geometry={sphGeo(0.42, 12, 8)} color={WOOD_DARK} position={[0.1, 0, 0]} ink={0.04} />
    <group position={[-HANDLE, 0, 0]}>
      <Solid geometry={cylGeo(1.0, 1.0, 2.6, 18)} color={WOOD_HEAD} ink={0.05} />
      <Solid geometry={cylGeo(1.05, 1.05, 0.22, 18)} color={WOOD_DARK} position={[0, 0.85, 0]} ink={0.03} />
      <Solid geometry={cylGeo(1.05, 1.05, 0.22, 18)} color={WOOD_DARK} position={[0, -0.85, 0]} ink={0.03} />
      <Solid geometry={cylGeo(0.85, 1.0, 0.18, 18)} color={WOOD_END} position={[0, 1.38, 0]} ink={0.03} />
      <Solid geometry={cylGeo(1.0, 0.85, 0.18, 18)} color={WOOD_END} position={[0, -1.38, 0]} ink={0.03} />
      <group rotation={[0, 0, Math.PI / 2]} position={[0, 0, 1.04]}>
        <ChromeText text="COURT" font="GeorgiaBold" size={0.3} anchor="center" material="gold" depth={0.06} />
      </group>
    </group>
  </group>
);

// ------------------------------------------------------------------ capitol (background, legislature)
export const Capitol: React.FC<{position?: V3; scale?: number}> = ({position, scale = 1}) => {
  const cols: React.ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    cols.push(<Solid key={i} geometry={cylGeo(0.42, 0.48, 6, 10)} color="#f7f4ee" position={[-8.1 + i * 1.8, 4.2, 6.3]} ink={0.06} />);
  }
  return (
    <group position={position} scale={scale}>
      <Solid geometry={boxGeo(34, 7.5, 12)} color="#efe9df" position={[0, 3.75, 0]} ink={0.08} />
      <Solid geometry={boxGeo(19, 1.2, 4)} color="#f4f0e8" position={[0, 0.6, 6.4]} ink={0.06} />
      {cols}
      <Solid geometry={boxGeo(19.5, 1.2, 1.6)} color="#f7f4ee" position={[0, 7.8, 6.4]} ink={0.06} />
      <Solid geometry={cylGeo(6.8, 7.2, 4.2, 16)} color="#f4f0e8" position={[0, 9.6, -0.5]} ink={0.08} />
      <Solid geometry={cylGeo(6.0, 6.4, 1.0, 16)} color="#dcd5c8" position={[0, 12.1, -0.5]} ink={0.06} />
      <mesh position={[0, 12.5, -0.5]} material={toonMat('#f9f7f2')}>
        <sphereGeometry args={[6.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Solid geometry={cylGeo(0.9, 1.1, 2.4, 10)} color="#f4f0e8" position={[0, 19.2, -0.5]} ink={0.05} />
      <Solid geometry={coneGeo(1.2, 1.4, 10)} color="#cfc6b5" position={[0, 21.1, -0.5]} ink={0.05} />
      <mesh position={[0, 23.3, -0.5]} material={toonMat('#b9b2a5')}>
        <cylinderGeometry args={[0.07, 0.07, 3.2, 6]} />
      </mesh>
      <mesh position={[0.9, 24.3, -0.5]} material={toonMat(C.alertRed)}>
        <boxGeometry args={[1.7, 1.0, 0.05]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ world
const CAP_Z = -62;
export const PlazaWorld: React.FC<{t: number; dim?: number}> = ({t, dim = 0}) => (
  <>
    <SkyDome preset="day" time={t} clouds={10} sunDir={[0.25, 0.78, 0.58]} />
    <ExteriorLights preset="day" intensity={1 - 0.45 * dim} />
    <RollingHills palette="day" avoid={[]} grass={1600} flowers={400} />
    {/* white marble plaza with a blue inlay ring */}
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toonMat('#f2f4fa')}>
      <circleGeometry args={[11, 48]} />
    </mesh>
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toonMat('#4f86ff')}>
      <ringGeometry args={[7.2, 7.6, 48]} />
    </mesh>
    <Capitol position={[6, hillsHeight(6, CAP_Z) - 0.5, CAP_Z]} scale={1} />
  </>
);

// ------------------------------------------------------------------ Guy poses
const holdPhoneFront = (t: number): GuyPose => ({
  armR: {shoulderX: 0.5, shoulderZ: 0.1, shoulderY: 0.35, elbow: 1.2, twist: -0.6, wrist: 0.2, wristZ: 0.5, grip: 1, swing: 0},
  headPitch: 0.42,
  headYaw: 0.06,
  t,
});

const GUY_A: V3 = [-2.4, 0.02, 6.0];
const SKIN = '#F7C9A3';

const GuyWithKit: React.FC<{pose: GuyPose; position: V3; rotY: number; phoneLines?: string[]; outlineScale?: number}> = ({pose, position, rotY, phoneLines,
  outlineScale = 1}) => (
  <Guy position={position} rotation={[0, rotY, 0]} pose={pose} outlineScale={outlineScale}
    rightHand={<HeldPhone open={1} screenLines={phoneLines ?? ['OmniStore', 'CANCEL ALL?', '> YES']} screenColor="#8FD3FF" />}
    leftHand={<HeldHammer glow={0.25} />} />
);

/** Guy-local point -> world (group at `pos`, rotated rotY about Y) */
const toWorld = (p: V3, pos: V3, rotY: number): V3 => {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  return [pos[0] + p[0] * c + p[2] * s, pos[1] + p[1], pos[2] - p[0] * s + p[2] * c];
};

// ------------------------------------------------------------------ the giant hand cursor that goes for the button
export const CURSOR_CLICK = SHOT.B1 + 3; // it never gets there: the gavel lands first
const cursorPos = (f: number): V3 => {
  const k = smooth(lin(f, SHOT.A3 - 4, SHOT.B1 + 2));
  const bob = Math.sin(f * 0.25) * 0.12 * (1 - k);
  return lerpV([13, 9, 3.5], [2.7, PILL_Y + 0.25, PILL_R * PILL_Z + 0.5], k).map((v, i) => (i === 1 ? v + bob : v)) as V3;
};

// ------------------------------------------------------------------ shots
type ShotProps = {f: number; t: number};

/** A1 — medium on the Guy (phone at ear, hammer in hand); the ground rumbles and the monument rises behind him. */
export const ShotA1: React.FC<ShotProps> = ({f, t}) => {
  const rise = smooth(lin(f, RISE_A, RISE_B));
  // rumble: builds while the monument pushes up through the plaza
  const rumble = lin(f, RISE_A, RISE_A + 5) * (1 - 0.6 * lin(f, 24, 34));
  const r = (s: string) => noise1(f * 0.9, s === 'x' ? 31 : s === 'y' ? 32 : 33);
  const sh: V3 = [r('x') * 0.03 * rumble, r('y') * 0.025 * rumble, 0];
  const look = smooth(lin(f, 5, 14));
  const pose = mergePose(guyPhoneToEar(t), {
    expression: 'determined', expression2: 'shock', expressionMix: look,
    mouthOpen: 0.15 + 0.35 * look,
    headPitch: lerp(0.06, -0.32, look),
    headYaw: lerp(0.05, 0.62, look),
    headTilt: lerp(-0.14, 0.04, look),
    eyesY: 0.7 * look,
    eyesX: 0.75 * look,
    torsoTwist: 0.28 * look,
    lean: -0.05 * look,
    blink: 0,
  });
  // low 3/4 front angle: Guy on the left third, the button monument rises behind him on the right; camera tilts up with it
  const k = smooth(lin(f, 0, 34));
  const cam: V3 = addV(lerpV([-1.1, 0.75, 8.7], [-1.3, 0.62, 8.4], k), sh);
  const tgt: V3 = lerpV([-1.25, 1.5, 4.0], [-1.05, 1.95, 3.6], smooth(lin(f, 8, 34)));
  return (
    <>
      <CameraRig position={cam} target={tgt} fov={50} roll={0.035} />
      <PlazaWorld t={t} />
      <Monument f={f} rise={rise} shatterT={-1} />
      <Puffs p={lin(f, RISE_A, RISE_A + 40)} count={22} radius={[5.0, 7.2]} size={0.75} seed={2} spreadZ={0.22} zOff={-0.6} color="#fffaf0"
        bottom="#cdbda6" />
      <GuyWithKit pose={pose} position={GUY_A} rotY={0.38} />
      <pointLight position={[GUY_A[0] + 1.6, 1.9, GUY_A[2] + 2.6]} intensity={0.7} distance={5} decay={1.4} color="#ffe6c8" />
    </>
  );
};

/** A2 — wide hero of the monument: PASSED! slam, confetti, the words light up. */
export const ShotA2: React.FC<ShotProps> = ({f, t}) => {
  const k = lin(f, SHOT.A2, SHOT.A3);
  const rise = smooth(lin(f, RISE_A, RISE_B));
  const slam = lin(f, PASSED_F - 6, PASSED_F);
  const after = Math.max(0, f - PASSED_F);
  const sh = shake(f, PASSED_F, 0.1, 6, 5);
  const cam: V3 = addV(lerpV([2.6, 0.9, 14.2], [1.8, 1.1, 11.8], smooth(k)), sh);
  const pose = mergePose(guyIdle(t), {
    expression: 'shock', expression2: 'happy', expressionMix: lin(f, PASSED_F + 4, PASSED_F + 14),
    headPitch: -0.35, mouthOpen: 0.35,
  });
  const passedScale = f < PASSED_F - 6 ? 0 : lerp(4, 1, easeInCubic(slam)) * (1 + 0.08 * Math.exp(-after / 4));
  return (
    <>
      <CameraRig position={cam} target={[-0.3, 3.9, 0]} fov={50} />
      <PlazaWorld t={t} />
      <Monument f={f} rise={rise} shatterT={-1} />
      <GuyWithKit pose={pose} position={GUY_A} rotY={Math.PI - 0.35} outlineScale={1.5} />
      <Confetti progress={lin(f, PASSED_F, PASSED_F + 110)} position={[0, PILL_TOP[1] + 0.2, 0.6]} count={240} power={2.1} spread={1.0} size={3.2} duration={3.6}
        seed={4} />
      <Confetti progress={lin(f, PASSED_F + 3, PASSED_F + 110)} position={[-5, 1.2, 1.5]} count={140} power={1.6} spread={0.6} size={3} duration={3.6} seed={9} />
      <Confetti progress={lin(f, PASSED_F + 3, PASSED_F + 110)} position={[5, 1.2, 1.5]} count={140} power={1.6} spread={0.6} size={3} duration={3.6} seed={10} />
      {passedScale > 0 ? (
        <group position={[0.0, 5.95, 3.4]} rotation={[0, 0, 0.08]} scale={passedScale * 0.86}>
          <ChromeText text="PASSED!" font="Impact" size={1.3} anchor="center" material="gold" outline={{thickness: 0.05, color: '#3a1600'}}
            shine={lin(f, PASSED_F + 2, PASSED_F + 22)} />
          <LensFlare position={[2.6, 0.8, 0.6]} intensity={0.8 * Math.exp(-after / 10) + 0.12} rotation={t * 0.5} scale={0.7} />
          <SparkleField count={16} seed={21} area={[6, 2, 0.6]} time={t} size={0.6} position={[0, 0, 0.4]} />
        </group>
      ) : null}
    </>
  );
};

/** A3 — profile low angle: a giant hand cursor drifts in to CLICK the button... then the gavel's shadow falls over everything. */
export const ShotA3: React.FC<ShotProps> = ({f, t}) => {
  const k = lin(f, SHOT.A3, SHOT.B1);
  const dark = smooth(lin(f, W.and - 2, SHOT.B1));
  const cam: V3 = lerpV([2.0, 0.45, 11.6], [1.6, 0.4, 10.9], smooth(k));
  const gpos: V3 = [-1.3, 0.02, 8.3];
  const pose = mergePose(guyIdle(t), {
    expression: dark > 0.35 ? 'shock' : 'happy',
    headPitch: lerp(-0.5, -0.65, dark),
    headYaw: lerp(-0.25, 0.1, dark),
    mouthOpen: 0.25 + 0.4 * dark,
    eyesY: 0.7,
    armL: {shoulderX: lerp(0.1, 0.9, smooth(lin(f, SHOT.A3 + 4, SHOT.A3 + 18)))},
  });
  return (
    <>
      <CameraRig position={cam} target={[-0.6, 3.4, 2.0]} fov={56} roll={-0.05} />
      <PlazaWorld t={t} dim={dark} />
      <Monument f={f} rise={1} shatterT={-1} glow={1 - 0.5 * dark} />
      <Confetti progress={lin(f, PASSED_F, PASSED_F + 110)} position={[0, PILL_TOP[1] + 0.2, 0.6]} count={320} power={2.1} spread={1.0} size={3.2} duration={3.6}
        seed={4} />
      <Cursor3D kind="hand" size={2.6} position={cursorPos(f)} rotation={[0, -0.15, 0.25]} look="gloss" />
      <GuyWithKit pose={pose} position={gpos} rotY={Math.PI - 0.95} />
      {/* the gavel's shadow sweeping in */}
      <mesh position={[lerp(9, 1.0, dark), 0.05, lerp(-2, 3.5, dark)]} rotation={[-Math.PI / 2, 0, 0.4]} scale={[lerp(2, 8, dark), lerp(1.2, 3.8, dark), 1]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#0a0a30" transparent opacity={0.5 * dark} depthWrite={false} />
      </mesh>
      <pointLight position={[3.5, 2.2, 11]} intensity={1.3} distance={8} decay={1.2} color="#fff0dc" />
    </>
  );
};

/** gavel angle: wind-up, slam at IMPACT, small rebound */
export const gavelTheta = (f: number) => {
  // swings in from overhead on "court" (head falls in from above the frame), then cocks back for the slam
  if (f < GAVEL_IN + 7) return lerp(-1.75, -1.0, easeOutBack(lin(f, GAVEL_IN - 1, GAVEL_IN + 7), 1.4));
  if (f < IMPACT - 11) return lerp(-1.0, -1.38, smooth(lin(f, GAVEL_IN + 7, IMPACT - 11)));
  if (f < IMPACT) return lerp(-1.38, 0, Math.pow(lin(f, IMPACT - 11, IMPACT), 2.1));
  const k = f - IMPACT;
  return -0.16 * Math.sin(Math.min(Math.PI, (k / 9) * Math.PI)) * Math.exp(-k / 14);
};
const GAVEL_PIVOT: V3 = [0.9 + HANDLE, PILL_TOP[1] + 1.3, 0.2];

/** B1 — "a court said no": the giant gavel slams the button to pieces. */
const gavelPos = (f: number): V3 => addV(GAVEL_PIVOT, [0, 6 * (1 - easeOutCubic(lin(f, GAVEL_IN - 1, GAVEL_IN + 6))), 0]);
export const ShotB1: React.FC<ShotProps> = ({f, t}) => {
  const tau = f >= IMPACT ? (f - IMPACT) / 30 : -1;
  const sh = shake(f, IMPACT, 0.5, 7, 7);
  const cam: V3 = addV(lerpV([-5.0, 0.7, 11.8], [-4.6, 0.75, 11.0], lin(f, SHOT.B1, SHOT.B2)), sh);
  const pose = mergePose(guyIdle(t), {
    expression: 'shock', headPitch: -0.5, mouthOpen: 0.8,
    armL: {shoulderX: 1.6, shoulderZ: 0.5, elbow: 1.6},
    lean: f > IMPACT ? -0.08 : 0,
  });
  const cur = cursorPos(f);
  const flee = lin(f, IMPACT - 3, IMPACT + 12);
  return (
    <>
      <CameraRig position={cam} target={addV([0.9, 4.9, 0], [sh[0] * 0.5, sh[1] * 0.5, 0])} fov={54} roll={0.09} />
      <PlazaWorld t={t} dim={0.75} />
      <Monument f={f} rise={1} shatterT={tau} glow={0.5} />
      <Gavel theta={gavelTheta(f)} position={gavelPos(f)} />
      {flee < 1 ? (
        <Cursor3D kind="hand" size={2.6} position={addV(cur, [flee * 9, flee * 2, flee * 3])} rotation={[0, -0.15, 0.25 + flee * 1.5]} look="gloss" />
      ) : null}
      <Puffs p={lin(f, IMPACT, IMPACT + 34)} count={20} radius={[1.2, 5.5]} size={1.15} seed={7} y={PILL_TOP[1] - 0.4} spreadZ={0.4} color="#ffffff" />
      <Puffs p={lin(f, IMPACT + 2, IMPACT + 40)} count={18} radius={[4, 8]} size={1.0} seed={8} y={0.2} spreadZ={0.6} color="#f4f1ff" />
      <GuyWithKit pose={pose} position={GUY_A} rotY={Math.PI - 0.35} outlineScale={1.5} />
    </>
  );
};

const B2_POS: V3 = [-1.2, 0.02, 9.2];
const B2_ROT = 0.12;
const b2Pose = (f: number, t: number): GuyPose =>
  mergePose(mergePose(guyIdle(t), holdPhoneFront(t)), {
    expression: f < 166 ? 'shock' : 'sad',
    mouthOpen: f < 166 ? 0.45 : 0.08,
    eyesY: -0.7,
    blink: 0,
  });

/** B2 — front medium on the Guy among the wreckage, looking down at his phone. */
export const ShotB2: React.FC<ShotProps> = ({f, t}) => {
  const tau = (f - IMPACT) / 30;
  const pose = b2Pose(f, t);
  const k = lin(f, SHOT.B2, SHOT.B2b);
  const cam: V3 = lerpV([B2_POS[0] + 0.7, 1.35, B2_POS[2] + 2.9], [B2_POS[0] + 0.55, 1.4, B2_POS[2] + 2.5], smooth(k));
  return (
    <>
      <CameraRig position={cam} target={[B2_POS[0] - 0.1, 1.45, B2_POS[2]]} fov={36} />
      <PlazaWorld t={t} dim={0.5} />
      <Monument f={f} rise={1} shatterT={tau} glow={0.4} />
      <Gavel theta={gavelTheta(f)} position={GAVEL_PIVOT} />
      <Puffs p={lin(f, IMPACT + 2, IMPACT + 40)} count={18} radius={[4, 8]} size={1.0} seed={8} y={0.2} spreadZ={0.6} color="#f4f1ff" />
      <GuyWithKit pose={pose} position={B2_POS} rotY={B2_ROT} phoneLines={['CANCEL PLAN', 'PAGE 1 OF 999+', '  NEXT >']} />
      <pointLight position={[B2_POS[0] + 0.8, 2.2, B2_POS[2] + 2]} intensity={1.6} distance={5} decay={1.2} color="#fff0dc" />
    </>
  );
};

/** B2b — POV insert: his phone screen "PAGE 1 OF ∞ · NEXT >", push in until the green LCD fills the frame. */
export const ShotB2b: React.FC<ShotProps> = ({f, t}) => {
  const tau = (f - IMPACT) / 30;
  const push = Math.pow(lin(f, SHOT.B2b + 1, SHOT.C1 - 1), 1.7);
  // phone in front of the camera, tilted back toward his eyes; the camera looks down at it from his eye line
  const phone: V3 = [B2_POS[0] + 0.05, 1.12, B2_POS[2] + 0.42];
  // screen centre and normal in world space (phone group is tilted back by -0.5 rad about X)
  const sc = FLIPPHONE.screenCenterOpen;
  const ca = Math.cos(-0.5), sa = Math.sin(-0.5);
  const scr: V3 = addV(phone, [sc[0], sc[1] * ca - sc[2] * sa, sc[1] * sa + sc[2] * ca]);
  const camA: V3 = addV(phone, [0.03, 0.25, 0.21]);
  const camB: V3 = lerpV(scr, camA, 0.62); // dolly down the line of sight (stay outside the 0.1 m near plane) + snap zoom
  const cam = lerpV(camA, camB, push);
  const sway = Math.sin(f * 0.21) * 0.004 * (1 - push);
  return (
    <>
      <CameraRig position={addV(cam, [sway, 0, 0])} target={lerpV(addV(phone, [0, 0.06, 0]), scr, push)} fov={lerp(44, 13, push)} roll={0.06 * (1 - push)} />
      <PlazaWorld t={t} dim={0.5} />
      <Monument f={f} rise={1} shatterT={tau} glow={0.4} />
      <group position={phone} rotation={[-0.5, 0, 0]}>
        <FlipPhone open={1} screenLines={['CANCEL PLAN', 'PAGE 1 OF \u221e', '', 'NEXT >']} softKeys={['Back', 'Next']} screenColor="#8FD3FF" />
        {/* his hand: palm behind the keypad, fingertips curling round the left edge, thumb on the right, hoodie cuff below */}
        <mesh position={[0.0, -0.01, -0.035]} material={toonMat(SKIN)}>
          <boxGeometry args={[0.07, 0.085, 0.04]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-0.031, 0.02 - i * 0.021, -0.006]} rotation={[0, 0, Math.PI / 2]} material={toonMat(SKIN)}>
            <capsuleGeometry args={[0.0095, 0.012, 4, 8]} />
          </mesh>
        ))}
        <mesh position={[0.034, -0.012, 0.004]} rotation={[0, 0, -0.45]} material={toonMat(SKIN)}>
          <capsuleGeometry args={[0.011, 0.038, 4, 8]} />
        </mesh>
        <mesh position={[0.0, -0.085, -0.045]} rotation={[0.35, 0, 0]} material={toonMat(C.tangerine)}>
          <cylinderGeometry args={[0.048, 0.056, 0.09, 14]} />
        </mesh>
        <mesh position={[0.0, -0.04, -0.03]} rotation={[0.35, 0, 0]} material={toonMat('#9BFF3A')}>
          <cylinderGeometry args={[0.041, 0.043, 0.02, 14]} />
        </mesh>
      </group>
      <pointLight position={[B2_POS[0] + 0.3, 2.0, B2_POS[2] + 1.2]} intensity={1.6} distance={4} decay={1.2} color="#fff0dc" />
    </>
  );
};
