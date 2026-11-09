// V1Bedroom local props: credit card, printer card-slot add-on, the blank "won't print a line" page, the macro ink-cartridge
// set (padlocked ink), pillow voice rings and floating Zzz. All pure functions of their props (frame-driven).
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {Billboard} from '@react-three/drei';
import {C, FONTS} from '../../lib/palette';
import {toonMat, outlineMat} from '../../lib/characters/toon';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Ink, PROP_INK, rbox, glossMat, candyMat, chromeMat, flatMat, useCanvasTexture, Padlock} from '../../lib/props';
import {noise1, clamp01} from '../../lib/time';

type G = Omit<ThreeElements['group'], 'children'> & {children?: React.ReactNode};

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// ===================================================================================================== credit card
/** ISO card 85.6 x 54 mm (scaled by `scale`), lying in the XY plane, face +Z, centred. Holographic gold "Y2K CARD". */
export const CARD = {w: 0.0856, h: 0.054, t: 0.0012};

const useCardTexture = () =>
  useCanvasTexture(
    512,
    323,
    (ctx, w, h) => {
      // gold -> pink -> aqua holographic sweep
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#ffe08a');
      g.addColorStop(0.35, '#f5b942');
      g.addColorStop(0.62, '#ff9ad5');
      g.addColorStop(1, '#7fe6ff');
      rr(ctx, 0, 0, w, h, 28);
      ctx.fillStyle = g;
      ctx.fill();
      // diagonal shine stripes
      ctx.save();
      rr(ctx, 0, 0, w, h, 28);
      ctx.clip();
      for (let i = -2; i < 8; i++) {
        ctx.fillStyle = `rgba(255,255,255,${i % 2 ? 0.12 : 0.22})`;
        ctx.beginPath();
        ctx.moveTo(i * 90, 0);
        ctx.lineTo(i * 90 + 40, 0);
        ctx.lineTo(i * 90 - 100, h);
        ctx.lineTo(i * 90 - 140, h);
        ctx.fill();
      }
      ctx.restore();
      // brand
      ctx.font = `italic 900 46px ${FONTS.heavy}`;
      ctx.fillStyle = '#1a2a80';
      ctx.fillText('Y2K', 30, 66);
      ctx.font = `italic bold 30px ${FONTS.web}`;
      ctx.fillText('CARD', 136, 64);
      ctx.font = `bold 18px ${FONTS.verdana}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PLATINUM+', 380, 50);
      // chip
      rr(ctx, 40, 110, 74, 56, 10);
      const cg = ctx.createLinearGradient(40, 110, 114, 166);
      cg.addColorStop(0, '#fff3c0');
      cg.addColorStop(1, '#c8962e');
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.strokeStyle = '#8a6420';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 138);
      ctx.lineTo(114, 138);
      ctx.moveTo(77, 110);
      ctx.lineTo(77, 166);
      ctx.stroke();
      // hologram sticker
      const hg = ctx.createRadialGradient(430, 140, 4, 430, 140, 44);
      hg.addColorStop(0, '#ffffff');
      hg.addColorStop(0.4, '#b8f4ff');
      hg.addColorStop(0.7, '#ff9ad5');
      hg.addColorStop(1, '#9b7bff');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(430, 140, 40, 0, Math.PI * 2);
      ctx.fill();
      // number + name (embossed)
      ctx.font = `bold 36px ${FONTS.mono}`;
      ctx.fillStyle = '#3a2a10';
      ctx.fillText('4000 1234 5678 0315', 32, 228);
      ctx.fillStyle = '#fff8e0';
      ctx.fillText('4000 1234 5678 0315', 30, 226);
      ctx.font = `bold 20px ${FONTS.mono}`;
      ctx.fillStyle = '#2a2050';
      ctx.fillText('VALID THRU 11/02', 30, 264);
      ctx.fillText("PANCAKE'S DAD", 30, 296);
    },
    [],
  );

export const CreditCard: React.FC<G & {glint?: number}> = ({glint = 0, ...g}) => {
  const tex = useCardTexture();
  const front = useMemo(() => new THREE.MeshToonMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.2}), [tex]);
  useLayoutEffect(() => {
    front.emissiveIntensity = 0.12 + glint * 0.18;
  });
  useLayoutEffect(() => () => front.dispose(), [front]);
  const body = rbox(CARD.w, CARD.h, CARD.t, 0.0005, 1);
  return (
    <group {...g}>
      <Ink geometry={body} material={glossMat('#f2c45a', {spec: 0.6, edge: 0.95})} outline={PROP_INK.thin} />
      <mesh position={[0, 0, CARD.t / 2 + 0.0002]} material={front}>
        <planeGeometry args={[CARD.w - 0.0004, CARD.h - 0.0004]} />
      </mesh>
      <mesh position={[0, 0.012, -CARD.t / 2 - 0.0002]} rotation={[0, Math.PI, 0]} material={flatMat('#15151c')}>
        <planeGeometry args={[CARD.w, 0.009]} />
      </mesh>
    </group>
  );
};

// ===================================================================================================== card slot add-on
/** Printer-local card slot (put inside <Printer>{...}</Printer>): bezel + slot + status LED + tiny label.
 *  Slot mouth centre at CARD_SLOT.mouth (printer-local); a card enters along -Z. */
export const CARD_SLOT = {mouth: [-0.158, 0.112, 0.153] as [number, number, number]};

export const CardSlot: React.FC<G & {led?: string; ledOn?: number}> = ({led = C.lime, ledOn = 1, ...g}) => {
  const label = useCanvasTexture(
    128,
    32,
    (ctx, w, h) => {
      ctx.fillStyle = '#2c3550';
      ctx.font = `bold 20px ${FONTS.ui}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAY HERE', w / 2, h / 2 + 1);
    },
    [],
  );
  const [x, y, z] = CARD_SLOT.mouth;
  return (
    <group {...g}>
      <Ink geometry={rbox(0.085, 0.034, 0.008, 0.004, 2)} material={glossMat('#aab2c4', {spec: 0.4})} position={[x, y, z - 0.002]} outline={PROP_INK.thin} />
      <mesh position={[x, y + 0.002, z + 0.0025]} material={flatMat('#07080d')}>
        <boxGeometry args={[0.062, 0.0045, 0.002]} />
      </mesh>
      <mesh position={[x + 0.034, y - 0.0095, z + 0.0026]}>
        <circleGeometry args={[0.0032, 12]} />
        <meshBasicMaterial color={new THREE.Color(led).multiplyScalar(0.25 + 2.6 * ledOn)} toneMapped={false} />
      </mesh>
      <mesh position={[x - 0.008, y - 0.0105, z + 0.0026]}>
        <planeGeometry args={[0.05, 0.0125]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
    </group>
  );
};

// ===================================================================================================== blank page
/** The page that "won't print a line": blank paper, faint watermark, red footer. Printer-local (put inside <Printer>).
 *  feed 0..1 (fraction of the page out of the slot, 0.26 m max). footer 0..1 reveals the red "0 lines printed" line. */
const SLOT: [number, number, number] = [0, 0.066, 0.16];
export const BlankPage: React.FC<{feed: number; footer?: number; shake?: number}> = ({feed, footer = 0, shake = 0}) => {
  const fd = Math.max(0, Math.min(1, feed));
  const showFooter = footer > 0.5;
  const tex = useCanvasTexture(
    256,
    362,
    (ctx, w, h) => {
      ctx.fillStyle = '#fbfbf6';
      ctx.fillRect(0, 0, w, h);
      // faint ruled ghost lines where the letter should be
      ctx.strokeStyle = 'rgba(150,170,220,0.22)';
      ctx.lineWidth = 1;
      for (let y = 70; y < 300; y += 18) {
        ctx.beginPath();
        ctx.moveTo(24, y);
        ctx.lineTo(w - 24, y);
        ctx.stroke();
      }
      // watermark
      ctx.save();
      ctx.translate(w / 2, h / 2 - 10);
      ctx.rotate(-0.5);
      ctx.font = `900 34px ${FONTS.heavy}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(226,35,26,0.2)';
      ctx.fillText('SUBSCRIBE', 0, -8);
      ctx.fillText('TO PRINT', 0, 30);
      ctx.restore();
      if (showFooter) {
        ctx.fillStyle = C.alertRed;
        ctx.font = `bold 15px ${FONTS.mono}`;
        ctx.textAlign = 'center';
        ctx.fillText('0 of 1 lines printed.', w / 2, h - 52);
        ctx.font = `bold 12px ${FONTS.ui}`;
        ctx.fillText('INK LOCKED BY INKSURE+', w / 2, h - 32);
      }
    },
    [showFooter],
  );
  const mat = useMemo(() => new THREE.MeshToonMaterial({map: tex, side: THREE.DoubleSide}), [tex]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    tex.repeat.set(1, Math.max(0.001, fd));
    tex.offset.set(0, 0);
  });
  if (fd < 0.002) return null;
  const len = fd * 0.26;
  return (
    <group position={SLOT} rotation={[0.16 + 0.12 * fd + shake * 0.05, 0, 0]}>
      <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, len / 2]} scale={[1, len, 1]}>
        <planeGeometry args={[0.21, 1]} />
      </mesh>
    </group>
  );
};

/** Dark cap over the printer's (always-on) lime power LED, to switch it "off". Printer-local. */
export const PowerLedOff: React.FC<{off: number}> = ({off}) =>
  off > 0.01 ? (
    <mesh position={[0.17, 0.1535, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.0075, 14]} />
      <meshBasicMaterial color="#10141c" transparent opacity={Math.min(1, off)} />
    </mesh>
  ) : null;

// ===================================================================================================== ink macro set
/** Macro "inside the printer" set, built at 5x scale (1 unit = 20 cm real) so a normal camera can get close.
 *  4 candy-translucent cartridges (C/M/Y/K, 100% full, ink sloshing + bubbles) in a carriage on a chrome rail,
 *  a chrome strap across their tops held shut by a big red padlock. Origin: carriage centre on the tray floor. */
const INKS = [
  {name: 'CYAN', color: '#12c8ff', label: 'C'},
  {name: 'MAGENTA', color: '#ff2fa8', label: 'M'},
  {name: 'YELLOW', color: '#ffe11a', label: 'Y'},
  {name: 'BLACK', color: '#2a2440', label: 'K'},
];
export const CART = {w: 0.26, h: 0.44, d: 0.32, gap: 0.05};
export const cartX = (i: number) => (i - 1.5) * (CART.w + CART.gap);

const CartLabel: React.FC<{i: number; level: number; pulse: number}> = ({i, level, pulse}) => {
  const ink = INKS[i];
  const pct = Math.round(level * 100);
  const tex = useCanvasTexture(
    192,
    256,
    (ctx, w, h) => {
      rr(ctx, 4, 4, w - 8, h - 8, 14);
      ctx.fillStyle = '#f4f6fb';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1b1030';
      ctx.stroke();
      // brand band
      ctx.fillStyle = '#1b2a6e';
      ctx.fillRect(8, 16, w - 16, 44);
      ctx.font = `italic 900 30px ${FONTS.heavy}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('INKSURE', w / 2 - 8, 50);
      ctx.fillStyle = C.alertRed;
      ctx.fillText('+', w / 2 + 70, 46);
      // colour swatch letter
      ctx.beginPath();
      ctx.arc(w / 2, 112, 34, 0, Math.PI * 2);
      ctx.fillStyle = ink.color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1b1030';
      ctx.stroke();
      ctx.font = `900 40px ${FONTS.heavy}`;
      ctx.fillStyle = i === 2 ? '#1b1030' : '#ffffff';
      ctx.fillText(ink.label, w / 2, 127);
      // level
      ctx.font = `bold 20px ${FONTS.ui}`;
      ctx.fillStyle = '#1b1030';
      ctx.fillText('INK LEVEL', w / 2, 178);
      ctx.font = `900 40px ${FONTS.heavy}`;
      ctx.fillStyle = '#18a018';
      ctx.fillText(`${pct}%`, w / 2, 224);
    },
    [pct],
  );
  const mat = useMemo(() => new THREE.MeshToonMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.25}), [tex]);
  useLayoutEffect(() => {
    mat.emissiveIntensity = 0.15 + 0.25 * pulse;
  });
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh material={mat} position={[0, CART.h * 0.47, CART.d / 2 + 0.006]}>
      <planeGeometry args={[CART.w * 0.78, CART.h * 0.55]} />
    </mesh>
  );
};

const Cartridge: React.FC<G & {i: number; frame: number; level: number; glow: number; pulse: number}> = ({i, frame, level, glow, pulse, ...g}) => {
  const ink = INKS[i];
  const inkH = (CART.h - 0.06) * level;
  const slosh = 0.06 * noise1(frame * 0.09 + i * 3.1, 40 + i);
  const inkMat = useMemo(
    () => new THREE.MeshToonMaterial({color: ink.color, emissive: new THREE.Color(ink.color), emissiveIntensity: 0.4, transparent: true, opacity: 0.92}),
    [ink.color],
  );
  useLayoutEffect(() => {
    inkMat.emissiveIntensity = 0.25 + 0.35 * glow;
  });
  useLayoutEffect(() => () => inkMat.dispose(), [inkMat]);
  const bubbles = [0, 1, 2, 3, 4].map((k) => {
    const sp = 0.5 + 0.5 * ((k * 37 + i * 11) % 7) / 7;
    const ph = ((frame * 0.012 * sp + k * 0.23 + i * 0.17) % 1 + 1) % 1;
    return {x: (((k * 53 + i * 29) % 9) / 9 - 0.5) * CART.w * 0.6, y: 0.04 + ph * (inkH - 0.06), z: (((k * 71 + i * 13) % 5) / 5 - 0.5) * CART.d * 0.5, r: 0.008 + 0.006 * (k % 3), a: ph};
  });
  return (
    <group {...g}>
      {/* ink volume */}
      <group position={[0, 0.03, 0]}>
        <mesh material={inkMat} position={[0, inkH / 2, 0]}>
          <boxGeometry args={[CART.w - 0.035, inkH, CART.d - 0.035]} />
        </mesh>
        {/* sloshing surface */}
        <mesh material={inkMat} position={[0, inkH, 0]} rotation={[0, 0, slosh]}>
          <boxGeometry args={[CART.w - 0.035, 0.02, CART.d - 0.035]} />
        </mesh>
        {bubbles.map((b, k) => (
          <mesh key={k} position={[b.x, b.y, b.z]}>
            <sphereGeometry args={[b.r, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.55 * Math.sin(b.a * Math.PI)} />
          </mesh>
        ))}
      </group>
      {/* candy shell */}
      <Ink geometry={rbox(CART.w, CART.h, CART.d, 0.03, 3)} material={candyMat(ink.color === '#2a2440' ? '#7a70a0' : ink.color, 0.32)} position={[0, CART.h / 2, 0]}
        outline={0.008} silhouette />
      {/* top cap */}
      <Ink geometry={rbox(CART.w + 0.01, 0.05, CART.d + 0.01, 0.015, 2)} material={glossMat('#2b3044', {spec: 0.5})} position={[0, CART.h + 0.01, 0]} outline={0.006} />
      <CartLabel i={i} level={level} pulse={pulse} />
    </group>
  );
};

export const InkMacroSet: React.FC<G & {frame: number; lidOpen: number; glow: number; pulse: number; lockShake: number; level?: number}> = ({
  frame, lidOpen, glow, pulse, lockShake, level = 1, ...g
}) => {
  const ribTex = useCanvasTexture(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#262b3e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2f3550';
      for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 14, h);
      ctx.fillStyle = 'rgba(25,198,255,0.35)';
      ctx.fillRect(0, h * 0.62, w, 3);
    },
    [],
  );
  useLayoutEffect(() => {
    ribTex.wrapS = THREE.RepeatWrapping;
    ribTex.repeat.set(6, 1);
    ribTex.needsUpdate = true;
  }, [ribTex]);
  const span = 4 * CART.w + 3 * CART.gap;
  return (
    <group {...g}>
      {/* back wall (ribbed plastic) + floor */}
      <mesh position={[0, 0.6, -0.55]}>
        <planeGeometry args={[6, 1.8]} />
        <meshToonMaterial map={ribTex} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 3]} />
        <meshToonMaterial color="#1c2030" />
      </mesh>
      {/* chrome rail + belt */}
      <mesh position={[0, 0.26, -0.36]} rotation={[0, 0, Math.PI / 2]} material={chromeMat('#e8ecf4', 0.12)}>
        <cylinderGeometry args={[0.035, 0.035, 6, 16]} />
      </mesh>
      <mesh position={[0, 0.12, -0.36]} material={toonMat('#11131c')}>
        <boxGeometry args={[6, 0.04, 0.02]} />
      </mesh>
      {/* carriage tray */}
      <Ink geometry={rbox(span + 0.12, 0.1, CART.d + 0.12, 0.02, 2)} material={glossMat('#4a5272', {spec: 0.35})} position={[0, -0.03, 0]} outline={0.008} />
      <Ink geometry={rbox(span + 0.12, 0.16, 0.08, 0.02, 2)} material={glossMat('#4a5272', {spec: 0.35})} position={[0, 0.06, -CART.d / 2 - 0.08]} outline={0.008} />
      {INKS.map((_, i) => (
        <Cartridge key={i} i={i} frame={frame} level={level} glow={glow} pulse={pulse} position={[cartX(i), 0.02, 0]} />
      ))}
      {/* chrome strap across the tops + hasp + padlock */}
      <mesh position={[0, CART.h + 0.06, 0.02]} material={chromeMat('#dfe6f2', 0.1)}>
        <boxGeometry args={[span + 0.2, 0.035, 0.09]} />
      </mesh>
      <mesh position={[0, CART.h + 0.02, CART.d / 2 + 0.03]} material={chromeMat('#dfe6f2', 0.1)}>
        <boxGeometry args={[0.1, 0.12, 0.02]} />
      </mesh>
      <Padlock position={[0, CART.h - 0.08, CART.d / 2 + 0.07]} scale={3.0} shake={lockShake} time={frame / 30} />
      {/* smoky lid (opens upward, hinge at the back) */}
      <group position={[0, CART.h + 0.16, -CART.d / 2 - 0.1]} rotation={[-lidOpen * 1.25, 0, 0]}>
        <Ink geometry={rbox(span + 0.5, 0.03, CART.d + 0.4, 0.015, 2)} material={candyMat('#55607e', 0.72)} position={[0, 0, CART.d / 2 + 0.2]}
          outline={0.008} silhouette />
      </group>
    </group>
  );
};

// ===================================================================================================== voice rings
/** Aqua sound rings expanding from the origin along +Z (the pillow's voice). `amount` 0..1, `frame` drives the waves. */
export const VoiceRings: React.FC<G & {frame: number; amount: number; count?: number; maxR?: number}> = ({frame, amount, count = 4, maxR = 0.55, ...g}) => {
  if (amount <= 0.01) return null;
  return (
    <group {...g}>
      {Array.from({length: count}, (_, k) => {
        const ph = (((frame / 20 + k / count) % 1) + 1) % 1;
        const r = 0.05 + ph * maxR;
        const op = amount * (1 - ph) * 0.9;
        return (
          <mesh key={k} position={[0, 0, ph * 0.12]} scale={[r, r, 1]}>
            <ringGeometry args={[1, 1.06, 48]} />
            <meshBasicMaterial color={new THREE.Color(C.aqua).multiplyScalar(2.2)} transparent opacity={op} depthWrite={false} toneMapped={false}
              blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

// ===================================================================================================== Zzz
const zTexCache: {t?: THREE.CanvasTexture} = {};
const zTex = () => {
  if (zTexCache.t) return zTexCache.t;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = `bold 108px ${FONTS.comic}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1b1030';
  ctx.strokeText('Z', 64, 68);
  ctx.fillStyle = '#bff3ff';
  ctx.fillText('Z', 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  zTexCache.t = t;
  return t;
};

/** Three cartoon Z's drifting up from the origin (sleeping). `fade` 0..1 multiplies opacity (pop them on wake). */
export const Zzz: React.FC<G & {frame: number; fade?: number; size?: number}> = ({frame, fade = 1, size = 0.16, ...g}) => {
  const tex = zTex();
  if (fade <= 0.01) return null;
  return (
    <group {...g}>
      {[0, 1, 2].map((k) => {
        const ph = (((frame / 45 + k / 3) % 1) + 1) % 1;
        const s = size * (0.55 + ph * 0.8);
        const op = fade * Math.min(1, ph * 5) * (1 - ph);
        return (
          <Billboard key={k} position={[0.12 * ph + 0.04 * Math.sin(ph * 9 + k), ph * 0.55, 0]}>
            <mesh rotation={[0, 0, 0.25 * Math.sin(ph * 6 + k)]}>
              <planeGeometry args={[s, s]} />
              <meshBasicMaterial map={tex} transparent opacity={op} depthWrite={false} />
            </mesh>
          </Billboard>
        );
      })}
    </group>
  );
};

// ===================================================================================================== talking pillow
/** Local re-implementation of the bedroom's smart pillow WITHOUT its built-in point light (that light sits inside the
 *  sitting Guy's chest and blows him out). Same puffy shape + aqua speaker grille; bigger, punchier waveform when talking.
 *  Put it in the bed's headSlot at PILLOW_LOCAL. */
const PW = 0.64, PH = 0.14, PD = 0.4;
let talkPillowGeo: THREE.BufferGeometry | null = null;
const makePuffyPillow = () => {
  let g: THREE.BufferGeometry = new THREE.BoxGeometry(PW, PH, PD, 12, 3, 8);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = x / (PW / 2), nz = z / (PD / 2);
    const puff = (1 - Math.pow(Math.abs(nx), 3)) * (1 - Math.pow(Math.abs(nz), 3));
    const ny = y / (PH / 2);
    p.setY(i, y * (0.28 + 0.72 * puff));
    const pinch = 1 - 0.06 * (1 - Math.abs(ny));
    p.setX(i, x * (1 - 0.05 * nz * nz) * pinch);
    p.setZ(i, z * (1 - 0.07 * nx * nx) * pinch);
  }
  g.computeVertexNormals();
  return g;
};

export const TalkPillow: React.FC<G & {talk: number; glow: number; frame: number}> = ({talk, glow, frame, ...g}) => {
  if (!talkPillowGeo) talkPillowGeo = makePuffyPillow();
  const tk = clamp01(talk);
  const fkey = tk > 0.001 ? Math.floor(frame) : -1;
  const tex = useCanvasTexture(
    256,
    112,
    (ctx, Wc, Hc) => {
      rr(ctx, 4, 4, Wc - 8, Hc - 8, 40);
      ctx.fillStyle = 'rgba(6,50,80,0.9)';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#7fe6ff';
      ctx.stroke();
      ctx.fillStyle = 'rgba(25,198,255,0.45)';
      for (let y = 22; y < Hc - 16; y += 14) for (let x = 30; x < Wc - 24; x += 14) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const n = 15;
      for (let i = 0; i < n; i++) {
        const u = (i - (n - 1) / 2) / ((n - 1) / 2);
        const env = 1 - u * u * 0.7;
        const a = tk > 0.001 ? tk * env * (0.3 + 0.7 * Math.abs(noise1(fkey * 0.45 + i * 1.7, 7))) : 0;
        const bh = 6 + a * (Hc - 30);
        const x = Wc / 2 + u * (Wc / 2 - 40);
        ctx.fillStyle = a > 0.35 ? '#f2fdff' : '#7fe6ff';
        rr(ctx, x - 5, Hc / 2 - bh / 2, 10, bh, 5);
        ctx.fill();
      }
    },
    [fkey, tk > 0.001 ? Math.round(tk * 20) : 0],
  );
  const pulse = tk * (0.5 + 0.5 * Math.sin(frame * 0.9));
  const gl = Math.max(0, glow) + tk * 0.8;
  const grilleMat = useMemo(() => new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: false}), [tex]);
  useLayoutEffect(() => {
    grilleMat.color.setScalar(0.5 + gl * 0.55);
  });
  const haloMat = useMemo(() => new THREE.MeshBasicMaterial({map: haloTex(), color: C.aqua, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}), []);
  useLayoutEffect(() => {
    haloMat.opacity = Math.min(1, 0.12 * gl + 0.35 * pulse);
  });
  useLayoutEffect(() => () => { grilleMat.dispose(); haloMat.dispose(); }, [grilleMat, haloMat]);
  const s = 1 + 0.03 * pulse;
  return (
    <group {...g}>
      <group scale={[s, 1 + 0.08 * pulse, s]}>
        <mesh geometry={talkPillowGeo} material={toonMat('#eef1fb')} />
        <mesh geometry={talkPillowGeo} material={outlineMat(0.011)} />
        <mesh material={grilleMat} rotation={[-Math.PI / 2 + 0.1, 0, 0]} position={[0, 0.069, 0.055]}>
          <planeGeometry args={[0.36, 0.157]} />
        </mesh>
        <mesh material={haloMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.074, 0.06]} scale={1 + 0.25 * pulse}>
          <planeGeometry args={[0.5, 0.34]} />
        </mesh>
      </group>
    </group>
  );
};

const haloCache: {t?: THREE.CanvasTexture} = {};
const haloTex = () => {
  if (haloCache.t) return haloCache.t;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  haloCache.t = new THREE.CanvasTexture(c);
  return haloCache.t;
};
