/**
 * Bedroom furniture & decor. Every piece: origin at its base centre (wall pieces: centre of the back face), faces +Z.
 *
 *   <Nightstand />                      0.54 w x 0.42 d x 0.56 h, birch, one drawer + CD cubby. NIGHTSTAND_TOP = 0.56
 *   <Lamp on={0..1} />                  bedside lamp (tangerine gourd base, cream cone shade); on -> warm light + glowing shade.
 *                                       LAMP_BULB = bulb position (local).
 *   <Desk clutter />                    1.2 w x 0.62 d x 0.74 h white laminate + chrome legs + birch drawer pedestal.
 *   <DeskChair />                       aqua swivel chair, seat height 0.48 (CHAIR_SEAT).
 *   <Dresser />                         1.1 w x 0.52 d x 0.82 h birch, candy-coloured knobs. DRESSER_TOP = 0.82
 *   <LavaLamp frame on />               chrome base, bubblegum lava blobs (frame-driven, deterministic).
 *   <DogBed />                          round tangerine cushion bed (r 0.36) + rope bone toy.
 *   <HammerRack />                      wall plaque (walnut) with two brass pegs along X; HAMMER_RACK_REST = top of pegs (local).
 *   <Poster texture w h />              taped wall poster (plane in XY, faces +Z).
 *   <Rug />                             round shag rug decal (r 1 m, scale it).
 *   <GlowStars intensity points />      glow-in-the-dark ceiling/wall stars.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {toonMat, TOON_GRADIENT} from '../../characters/toon';
import {C, FONTS} from '../../palette';
import {TBox, TCyl, TSphere, geo, chromeMat, hullMat, useGlowMat, makeCanvas, canvasTex} from './ink';
import {glowTexture, rugTexture} from './textures';

type G = Omit<ThreeElements['group'], 'children'> & {children?: React.ReactNode};

const BIRCH = '#e0ae6e';
const BIRCH_DARK = '#c58e50';

// ------------------------------------------------------------------ nightstand
export const NIGHTSTAND_TOP = 0.56;
export const Nightstand: React.FC<G> = ({children, ...g}) => {
  const w = 0.54, d = 0.42, h = NIGHTSTAND_TOP;
  return (
    <group {...g}>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <TCyl key={`${sx}${sz}`} args={[0.02, 0.016, 0.06, 8]} color={BIRCH_DARK} position={[sx * (w / 2 - 0.05), 0.03, sz * (d / 2 - 0.05)]} ink={0.005} />
      )))}
      <TBox size={[w, h - 0.095, d]} r={0.012} color={BIRCH} position={[0, 0.06 + (h - 0.095) / 2, 0]} />
      <TBox size={[w + 0.03, 0.035, d + 0.025]} r={0.012} color={BIRCH} position={[0, h - 0.0175, 0.005]} />
      {/* drawer */}
      <TBox size={[w - 0.06, 0.15, 0.02]} r={0.01} color="#eabd80" position={[0, h - 0.13, d / 2 + 0.005]} ink={0.006} />
      <TSphere radius={0.022} color={C.bubblegum} position={[0, h - 0.13, d / 2 + 0.03]} ink={0.004} />
      {/* cubby with CDs */}
      <TBox size={[w - 0.06, 0.2, 0.02]} r={0.004} color="#5a3a22" position={[0, 0.2, d / 2 - 0.01]} ink={false} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <TBox key={i} size={[0.012, 0.13, 0.13]} r={0.002} color={[C.aqua, '#e8ecf4', C.grape, C.lime, C.tangerine, '#e8ecf4'][i]}
          position={[-0.15 + i * 0.022, 0.165, d / 2 - 0.06]} ink={0.003} rotation={[0, 0, i === 5 ? -0.35 : 0]} />
      ))}
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ lamp
export const LAMP_BULB: [number, number, number] = [0, 0.33, 0];
export const Lamp: React.FC<G & {on?: number}> = ({on = 0, children, ...g}) => {
  const o = Math.max(0, Math.min(1, on));
  const shade = useMemo(() => new THREE.MeshToonMaterial({color: '#fff1d6', gradientMap: TOON_GRADIENT}), []);
  const inner = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffcf8a', side: THREE.BackSide}), []);
  const halo = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), color: '#ffb35a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}),
    [],
  );
  useLayoutEffect(() => {
    shade.emissive.set('#ffb255');
    shade.emissiveIntensity = 0.05 + 0.85 * o;
    inner.color.set('#ffcf8a').multiplyScalar(0.25 + 2.4 * o);
    halo.opacity = 0.3 * o;
  });
  useLayoutEffect(() => () => { shade.dispose(); inner.dispose(); halo.dispose(); }, [shade, inner, halo]);
  const bulb = useGlowMat('#fff2cf', 0.6 + 4 * o);
  return (
    <group {...g}>
      <TCyl args={[0.075, 0.085, 0.02, 16]} color="#e8ecf4" position={[0, 0.01, 0]} ink={0.005} />
      <TSphere radius={0.085} segs={[14, 10]} color={C.tangerine} position={[0, 0.1, 0]} scale={[1, 0.95, 1]} ink={0.008} />
      <TCyl args={[0.035, 0.05, 0.06, 12]} color={C.tangerine} position={[0, 0.2, 0]} ink={0.006} />
      <mesh geometry={geo.cyl(0.008, 0.008, 0.1, 6)} material={chromeMat()} position={[0, 0.27, 0]} />
      <mesh geometry={geo.sphere(0.03, 10, 8)} position={LAMP_BULB} material={bulb} />
      {/* cone shade */}
      <group position={[0, 0.355, 0]}>
        <mesh geometry={geo.cyl(0.095, 0.165, 0.17, 20, true)} material={shade} />
        <mesh geometry={geo.cyl(0.094, 0.164, 0.17, 20, true)} material={inner} />
        <mesh geometry={geo.cyl(0.106, 0.176, 0.19, 20, true)} material={hullMat()} />
      </group>
      <mesh geometry={geo.plane(0.75, 0.75)} material={halo} position={[0, 0.36, 0]} />
      <pointLight color="#ffb768" position={[0.15, 0.4, 0.45]} intensity={1.5 * o} distance={6} decay={1.3} />
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ desk + chair
export const DESK_TOP = 0.74;
export const Desk: React.FC<G & {clutter?: boolean}> = ({clutter = true, children, ...g}) => {
  const w = 1.2, d = 0.62, h = DESK_TOP;
  return (
    <group {...g}>
      <TBox size={[w, 0.035, d]} r={0.012} color="#eef0f7" position={[0, h - 0.0175, 0]} />
      <mesh geometry={geo.box(w - 0.01, 0.01, 0.01)} material={toonMat(C.aqua)} position={[0, h - 0.02, d / 2 + 0.002]} />
      {/* chrome legs on the left, drawer pedestal on the right */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={geo.cyl(0.018, 0.018, h - 0.035, 10)} material={chromeMat()} position={[-w / 2 + 0.06, (h - 0.035) / 2, sz * (d / 2 - 0.06)]} />
      ))}
      <TBox size={[0.4, h - 0.035, d - 0.04]} r={0.01} color={BIRCH} position={[w / 2 - 0.21, (h - 0.035) / 2, 0]} />
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <TBox size={[0.36, 0.2, 0.02]} r={0.008} color="#eabd80" position={[w / 2 - 0.21, 0.13 + i * 0.22, d / 2 - 0.01]} ink={0.005} />
          <TBox size={[0.1, 0.018, 0.02]} r={0.008} color="#e8ecf4" position={[w / 2 - 0.21, 0.17 + i * 0.22, d / 2 + 0.01]} ink={0.004} />
        </group>
      ))}
      {clutter ? (
        <group position={[0, h, 0]}>
          {/* pen cup */}
          <TCyl args={[0.04, 0.035, 0.11, 12]} color={C.grape} position={[-0.45, 0.055, -0.15]} ink={0.005} />
          {[[-0.012, 0.15, '#ffd23f'], [0.015, 0.16, C.aqua], [0, 0.14, C.alertRed]].map(([x, l, c], i) => (
            <mesh key={i} geometry={geo.cyl(0.006, 0.006, l as number, 6)} material={toonMat(c as string)}
              position={[-0.45 + (x as number), 0.1 + (l as number) / 2 - 0.04, -0.15]} rotation={[0.1 * (i - 1), 0, 0.15 * (i - 1)]} />
          ))}
          {/* CD stack */}
          {[0, 1, 2, 3].map((i) => (
            <TBox key={i} size={[0.142, 0.01, 0.125]} r={0.002} color={[C.aqua, '#e8ecf4', C.bubblegum, '#e8ecf4'][i]}
              position={[-0.38, 0.005 + i * 0.011, 0.12]} rotation={[0, 0.15 * i, 0]} ink={0.003} />
          ))}
          {/* sticky notes */}
          <TBox size={[0.075, 0.004, 0.075]} color="#fff36a" position={[0.12, 0.002, 0.2]} rotation={[0, 0.3, 0]} ink={0.002} />
          <TBox size={[0.075, 0.004, 0.075]} color="#ffb0e0" position={[0.2, 0.002, 0.22]} rotation={[0, -0.2, 0]} ink={0.002} />
        </group>
      ) : null}
      {children}
    </group>
  );
};

export const CHAIR_SEAT = 0.48;
export const DeskChair: React.FC<G & {color?: string}> = ({color = '#1aa6e0', children, ...g}) => (
  <group {...g}>
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return (
        <group key={i} rotation={[0, a, 0]}>
          <TBox size={[0.04, 0.03, 0.28]} r={0.01} color="#2c3142" position={[0, 0.06, 0.14]} ink={0.005} />
          <TSphere radius={0.028} color="#14161f" position={[0, 0.028, 0.27]} ink={0.004} />
        </group>
      );
    })}
    <mesh geometry={geo.cyl(0.025, 0.025, 0.36, 10)} material={chromeMat()} position={[0, 0.25, 0]} />
    <TBox size={[0.46, 0.08, 0.44]} r={0.035} color={color} position={[0, CHAIR_SEAT - 0.04, 0]} />
    <mesh geometry={geo.box(0.04, 0.3, 0.03)} material={chromeMat()} position={[0, CHAIR_SEAT + 0.12, -0.2]} />
    <TBox size={[0.44, 0.38, 0.07]} r={0.035} color={color} position={[0, CHAIR_SEAT + 0.36, -0.23]} rotation={[-0.12, 0, 0]} />
    {children}
  </group>
);

// ------------------------------------------------------------------ dresser
export const DRESSER_TOP = 0.82;
export const Dresser: React.FC<G> = ({children, ...g}) => {
  const w = 1.1, d = 0.52, h = DRESSER_TOP;
  const knobs = [C.aqua, C.lime, C.tangerine, C.bubblegum];
  return (
    <group {...g}>
      <TBox size={[w - 0.04, 0.06, d - 0.04]} r={0.01} color={BIRCH_DARK} position={[0, 0.03, 0]} ink={0.006} />
      <TBox size={[w, h - 0.09, d]} r={0.015} color={BIRCH} position={[0, 0.06 + (h - 0.09) / 2, 0]} />
      <TBox size={[w + 0.03, 0.035, d + 0.03]} r={0.012} color={BIRCH} position={[0, h - 0.0175, 0.005]} />
      {/* top row: two small drawers */}
      {[-1, 1].map((s, i) => (
        <group key={s}>
          <TBox size={[w / 2 - 0.05, 0.16, 0.02]} r={0.01} color="#eabd80" position={[s * (w / 4), h - 0.14, d / 2 + 0.005]} ink={0.006} />
          <TSphere radius={0.022} color={knobs[i]} position={[s * (w / 4), h - 0.14, d / 2 + 0.03]} ink={0.004} />
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={i}>
          <TBox size={[w - 0.07, 0.22, 0.02]} r={0.01} color="#eabd80" position={[0, 0.2 + i * 0.25, d / 2 + 0.005]} ink={0.006} />
          {[-1, 1].map((s) => (
            <TSphere key={s} radius={0.022} color={knobs[2 + i]} position={[s * 0.25, 0.2 + i * 0.25, d / 2 + 0.03]} ink={0.004} />
          ))}
        </group>
      ))}
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ lava lamp
export const LavaLamp: React.FC<G & {frame?: number; on?: number}> = ({frame = 0, on = 1, children, ...g}) => {
  const o = Math.max(0, Math.min(1, on));
  const glass = useMemo(() => new THREE.MeshBasicMaterial({color: '#ff4fb8', transparent: true, opacity: 0.55, depthWrite: false}), []);
  useLayoutEffect(() => {
    glass.color.set('#c0308a').multiplyScalar(0.35 + 1.0 * o);
  });
  const blob = useGlowMat('#ffd23f', 0.5 + 1.6 * o);
  const blobs = [0, 1, 2, 3].map((i) => {
    const t = frame / 30;
    const y = 0.13 + 0.09 * (0.5 + 0.5 * Math.sin(t * (0.35 + i * 0.11) + i * 1.9));
    const s = 0.022 + 0.008 * Math.sin(t * 0.7 + i);
    return {y, s, x: 0.012 * Math.sin(i * 2.1 + t * 0.2)};
  });
  return (
    <group {...g}>
      <TCyl args={[0.045, 0.075, 0.1, 14]} color="#cfd5e2" position={[0, 0.05, 0]} ink={0.005} />
      <group position={[0, 0.1, 0]}>
        {blobs.map((b, i) => (
          <mesh key={i} geometry={geo.sphere(1, 10, 8)} material={blob} position={[b.x, b.y - 0.1, 0]} scale={[b.s, b.s * 1.4, b.s]} />
        ))}
        <mesh geometry={geo.cyl(0.03, 0.05, 0.22, 16)} material={glass} position={[0, 0.11, 0]} />
      </group>
      <TCyl args={[0.015, 0.032, 0.06, 14]} color="#cfd5e2" position={[0, 0.35, 0]} ink={0.005} />
      <pointLight color="#ff4fb8" position={[0, 0.25, 0.1]} intensity={0.6 * o} distance={1.8} decay={1.6} />
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ inflatable chair
const TorusInk: React.FC<{r: number; tube: number; color: string; position?: [number, number, number]; rotation?: [number, number, number]}> = ({r, tube, color, ...p}) => (
  <group {...p}>
    <mesh geometry={geo.torus(r, tube, 10, 22)} material={toonMat(color, {opacity: 0.86})} />
    <mesh geometry={geo.torus(r, tube + 0.01, 10, 22)} material={hullMat()} />
  </group>
);
/** Translucent blow-up chair (very 1999). ~0.9 wide, seat height 0.3. */
export const InflatableChair: React.FC<G & {color?: string}> = ({color = '#9a5cff', children, ...g}) => (
  <group {...g}>
    <TorusInk r={0.3} tube={0.13} color={color} position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]} />
    <TCyl args={[0.3, 0.3, 0.12, 20]} color={color} position={[0, 0.2, 0]} ink={0.008} />
    <TorusInk r={0.27} tube={0.12} color={color} position={[0, 0.56, -0.24]} rotation={[-0.25, 0, 0]} />
    {[-1, 1].map((s) => (
      <TorusInk key={s} r={0.17} tube={0.09} color={color} position={[s * 0.33, 0.36, -0.02]} rotation={[0, Math.PI / 2, 0]} />
    ))}
    <mesh geometry={geo.sphere(0.04, 8, 6)} material={toonMat('#ffffff', {opacity: 0.7})} position={[-0.12, 0.72, -0.12]} scale={[1, 0.5, 0.4]} />
    {children}
  </group>
);

// ------------------------------------------------------------------ dog bed
export const DogBed: React.FC<G> = ({children, ...g}) => (
  <group {...g}>
    <mesh geometry={geo.torus(0.29, 0.085, 10, 24)} material={toonMat(C.tangerine)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.085, 0]} />
    <mesh geometry={geo.torus(0.29 + 0.01, 0.085 + 0.012, 10, 24)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.085, 0]}>
      <meshBasicMaterial color="#1b1030" side={THREE.BackSide} />
    </mesh>
    <TCyl args={[0.3, 0.3, 0.07, 24]} color="#fff0d2" position={[0, 0.05, 0]} ink={0.008} />
    {/* rope bone toy */}
    <group position={[0.42, 0.025, 0.12]} rotation={[0, 0.7, 0]}>
      <mesh geometry={geo.cyl(0.018, 0.018, 0.16, 8)} material={toonMat('#ffffff')} rotation={[0, 0, Math.PI / 2]} />
      {[-1, 1].map((s) => [-1, 1].map((t) => (
        <TSphere key={`${s}${t}`} radius={0.024} color="#ffffff" position={[s * 0.085, 0, t * 0.018]} ink={0.004} />
      )))}
    </group>
    {children}
  </group>
);

// ------------------------------------------------------------------ hammer rack
const plateCache: {t?: THREE.CanvasTexture} = {};
const plateTex = () => {
  if (plateCache.t) return plateCache.t;
  const {c, ctx} = makeCanvas(320, 68);
  ctx.clearRect(0, 0, 320, 68);
  ctx.font = `bold 40px ${FONTS.serif}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,240,190,0.6)';
  ctx.fillText('GRANDPA', 161, 37);
  ctx.fillStyle = '#5a3a10';
  ctx.fillText('GRANDPA', 160, 35);
  plateCache.t = canvasTex(c);
  return plateCache.t;
};
/** Rest point on top of the pegs (rack-local): handle of a horizontally hung hammer rests here, axis along local X. */
export const HAMMER_RACK_REST: [number, number, number] = [0, 0.012, 0.065];
export const HammerRack: React.FC<G & {glow?: number}> = ({glow = 0, children, ...g}) => {
  const halo = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), color: '#ffd76a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}),
    [],
  );
  useLayoutEffect(() => {
    halo.opacity = Math.min(1, glow);
  });
  return (
    <group {...g}>
      <mesh geometry={geo.plane(1.4, 0.9)} material={halo} position={[0, 0, 0.004]} />
      <TBox size={[0.66, 0.24, 0.03]} r={0.012} color="#6e4024" position={[0, 0, 0.015]} />
      <TBox size={[0.6, 0.18, 0.012]} r={0.008} color="#8a5530" position={[0, 0, 0.033]} ink={false} />
      {/* brass nameplate */}
      <TBox size={[0.16, 0.038, 0.006]} r={0.003} color="#e8b84a" position={[0, -0.075, 0.04]} ink={0.003} />
      <mesh geometry={geo.plane(0.15, 0.032)} position={[0, -0.075, 0.0435]}>
        <meshBasicMaterial map={plateTex()} transparent />
      </mesh>
      {/* pegs 0.24 m apart (HAMMER_RACK.pegSpacing) so grandpa's 0.35 m hammer can rest across both */}
      {[-0.12, 0.12].map((x) => (
        <group key={x} position={[x, 0, 0.03]}>
          <mesh geometry={geo.cyl(0.012, 0.012, 0.085, 10)} material={toonMat('#e8b84a')} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.0425]} />
          <TSphere radius={0.017} color="#e8b84a" position={[0, 0.006, 0.085]} ink={0.004} />
        </group>
      ))}
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ poster
export const Poster: React.FC<G & {texture: THREE.Texture; w: number; h: number; tilt?: number}> = ({texture, w, h, tilt = 0, children, ...g}) => {
  const mat = useMemo(() => new THREE.MeshToonMaterial({map: texture, gradientMap: TOON_GRADIENT}), [texture]);
  return (
    <group {...g}>
      <group rotation={[0, 0, tilt]}>
        <mesh geometry={geo.plane(w + 0.016, h + 0.016)} material={toonMat('#1b1030')} position={[0, 0, 0.001]} />
        <mesh geometry={geo.plane(w, h)} material={mat} position={[0, 0, 0.003]} />
        {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy], i) => (
          <mesh key={i} geometry={geo.plane(0.07, 0.025)} material={toonMat('#f3efd8')}
            position={[sx * (w / 2 - 0.01), sy * (h / 2 - 0.01), 0.005]} rotation={[0, 0, sx * sy * 0.7]} />
        ))}
      </group>
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ rug
export const Rug: React.FC<G> = ({children, ...g}) => {
  const mat = useMemo(() => new THREE.MeshToonMaterial({map: rugTexture(), gradientMap: TOON_GRADIENT, transparent: true, alphaTest: 0.5}), []);
  return (
    <group {...g}>
      <mesh geometry={geo.circle(1.0, 48)} material={toonMat('#3a1a6a')} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} scale={1.015} />
      <mesh geometry={geo.plane(2, 2)} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} />
      {children}
    </group>
  );
};

// ------------------------------------------------------------------ glow-in-the-dark stars
const starGeo = (() => {
  let g: THREE.ShapeGeometry | null = null;
  return () => {
    if (g) return g;
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const r = i % 2 ? 0.4 : 1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i) s.lineTo(x, y);
      else s.moveTo(x, y);
    }
    s.closePath();
    g = new THREE.ShapeGeometry(s);
    return g;
  };
})();
/** Stars lying in their local XY plane (face +Z). points = [x, y, size, rotation][] */
export const GlowStars: React.FC<G & {intensity?: number; points: [number, number, number, number][]}> = ({intensity = 1, points, children, ...g}) => {
  const mat = useGlowMat('#d9ff8a', 0.25 + 1.6 * Math.max(0, intensity));
  return (
    <group {...g}>
      {points.map(([x, y, s, r], i) => (
        <mesh key={i} geometry={starGeo()} material={mat} position={[x, y, 0]} scale={s} rotation={[0, 0, r]} />
      ))}
      {children}
    </group>
  );
};
