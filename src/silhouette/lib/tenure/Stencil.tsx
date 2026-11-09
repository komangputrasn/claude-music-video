/**
 * <Stencil> — spray-stencilled decal text for surfaces: "LEASE 0315-77", "NUTRITION UNIT · PLUS ONLY"
 * (DESIGN-silhouette §2.5: lease numbers are stencilled on everything). An alpha plane with a canvas texture:
 * stencil bridges in the closed letters, soft overspray, and seeded wear (mottled fade, chips, scratches).
 *
 *   <Stencil text="LEASE 0315-77" font?="futura" weight?={700} size?={0.3} color?={S.bone} intensity?={0.55}
 *            opacity?={1} wear?={0.35} seed? bridges?={true} overspray?={0.5} tracking?={0.14} anchor?="center"
 *            lineSpacing?={1.45} glow?={false} renderOrder? {...group}/>
 *
 *   text        one or more lines ('\n'). Uppercase it yourself (stencils are uppercase).
 *   font        'futura' (signage, default) | 'mono' (serials) | 'futuraCond'.
 *   size        CAP HEIGHT in metres (the plane is larger: padding for overspray).
 *   color       S.bone (paint on black monoliths, default), S.authRed (control markings), S.void / GREYS.g2 (dark paint on
 *               bright walls). No other hues.
 *   intensity   colour multiplier. Paint ≈ 0.4–0.7 (does NOT glow). Light-stencils (text projected as light) 1.2–2.
 *   wear        0..1 (0 = fresh, 1 = mostly gone). seed varies the wear pattern (default: hash of the text).
 *   anchor      'center' (default) | 'left' | 'right' — horizontal origin; vertically the origin is the text's centre.
 *   glow        true: additive blending (stencilled LIGHT, e.g. "PAYMENT DECLINED" projected across a silhouette).
 *
 * Faces +Z. Place it ~1 cm in front of a surface (it also uses polygonOffset against z-fighting).
 * Also exported: makeStencilCanvas(text, opts) → {canvas, aspect, capFrac}, stencilSize(text, {size,font,tracking,weight})
 * → [w, h] metres of the plane.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {TFont, fontCss, makeCanvas, trackedWidth, drawTracked, canvasTexture, stream, hashStr} from './shared';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

const CAP_PX = 120;
/** characters that get stencil bridges (closed counters) */
const BRIDGED = new Set(Array.from('ABDOPQR0689'));

export type StencilCanvasOpts = {
  font?: TFont;
  weight?: number | string;
  tracking?: number;
  wear?: number;
  seed?: number | string;
  bridges?: boolean;
  overspray?: number;
  lineSpacing?: number;
};

const fontFor = (font: TFont, weight: number | string | undefined, capPx: number) => {
  // find the font px that yields the requested cap height
  const c = makeCanvas(8, 8).getContext('2d')!;
  c.font = fontCss(font, 100, weight);
  const r = (c.measureText('H').actualBoundingBoxAscent || 72) / 100;
  return capPx / r;
};

export const makeStencilCanvas = (text: string, o: StencilCanvasOpts = {}) => {
  const font = o.font ?? 'futura';
  const weight = o.weight ?? 700;
  const tracking = o.tracking ?? 0.14;
  const wear = Math.max(0, Math.min(1, o.wear ?? 0.35));
  const overspray = o.overspray ?? 0.5;
  const lineSpacing = o.lineSpacing ?? 1.45;
  const rnd = stream(o.seed ?? hashStr(text));
  const px = fontFor(font, weight, CAP_PX);
  const lines = text.split('\n');
  const probe = makeCanvas(8, 8).getContext('2d')!;
  probe.font = fontCss(font, px, weight);
  const track = px * tracking;
  const widths = lines.map((l) => trackedWidth(probe, l, track));
  const pad = CAP_PX * 0.45;
  const W = Math.ceil(Math.max(...widths, CAP_PX) + pad * 2);
  const lineH = CAP_PX * lineSpacing;
  const H = Math.ceil(CAP_PX + lineH * (lines.length - 1) + pad * 2);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.font = fontCss(font, px, weight);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  const baseOf = (i: number) => pad + CAP_PX + i * lineH;
  const drawAll = () => lines.forEach((l, i) => drawTracked(ctx, l, W / 2, baseOf(i), track, 'center'));

  // 1. overspray haze
  if (overspray > 0) {
    ctx.save();
    ctx.filter = `blur(${CAP_PX * 0.07}px)`;
    ctx.globalAlpha = 0.3 * overspray;
    drawAll();
    ctx.filter = `blur(${CAP_PX * 0.02}px)`;
    ctx.globalAlpha = 0.35 * overspray;
    drawAll();
    ctx.restore();
  }
  // 2. crisp paint
  ctx.globalAlpha = 1;
  drawAll();
  // 3. bridges (cut through closed letters at the top and bottom stroke)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  if (o.bridges !== false) {
    const bw = CAP_PX * 0.065;
    lines.forEach((l, i) => {
      let x = W / 2 - widths[i] / 2;
      const base = baseOf(i);
      for (const ch of Array.from(l)) {
        const cw = ctx.measureText(ch).width;
        if (BRIDGED.has(ch)) {
          const off = 'BDPR'.includes(ch) ? cw * 0.06 : 0;
          const cx = x + cw / 2 + off;
          ctx.fillRect(cx - bw / 2, base - CAP_PX * 1.12, bw, CAP_PX * 0.36);
          if (ch !== 'A' && ch !== 'P') ctx.fillRect(cx - bw / 2, base - CAP_PX * 0.26, bw, CAP_PX * 0.36);
        }
        x += cw + track;
      }
    });
  }
  // 4. wear: mottled fade, chips, scratches
  if (wear > 0) {
    const nx = Math.max(4, Math.ceil(W / (CAP_PX * 0.28)));
    const ny = Math.max(2, Math.ceil(H / (CAP_PX * 0.28)));
    const n = makeCanvas(nx, ny);
    const nc = n.getContext('2d')!;
    const img = nc.createImageData(nx, ny);
    for (let i = 0; i < nx * ny; i++) {
      const v = Math.pow(rnd(), 2.2) * wear * 1.25;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = Math.round(Math.min(1, v) * 255);
    }
    nc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1;
    ctx.drawImage(n, 0, 0, W, H);
    const chips = Math.round(wear * Math.max(...lines.map((l) => l.length)) * lines.length * 5);
    for (let i = 0; i < chips; i++) {
      const r = CAP_PX * (0.015 + 0.06 * Math.pow(rnd(), 2));
      ctx.globalAlpha = 0.6 + 0.4 * rnd();
      ctx.beginPath();
      ctx.ellipse(pad * 0.5 + rnd() * (W - pad), pad * 0.6 + rnd() * (H - pad * 1.2), r * (1 + rnd()), r, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    const scratches = Math.round(wear * 6 * lines.length);
    ctx.lineCap = 'round';
    for (let i = 0; i < scratches; i++) {
      ctx.globalAlpha = 0.5 + 0.5 * rnd();
      ctx.lineWidth = CAP_PX * (0.008 + 0.014 * rnd());
      const x0 = rnd() * W;
      const y0 = pad + rnd() * (H - pad * 2);
      const len = CAP_PX * (0.6 + 2.2 * rnd());
      const a = (rnd() - 0.5) * 0.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  ctx.restore();
  // 5. a few overspray speckles
  if (overspray > 0) {
    ctx.save();
    const dots = Math.round(overspray * (W * H) / 1800);
    for (let i = 0; i < dots; i++) {
      ctx.globalAlpha = 0.08 + 0.25 * rnd();
      const r = CAP_PX * (0.004 + 0.01 * rnd());
      ctx.beginPath();
      ctx.arc(pad * 0.4 + rnd() * (W - pad * 0.8), pad * 0.5 + rnd() * (H - pad), r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  return {canvas: c, aspect: W / H, capFrac: CAP_PX / H};
};

/** [width, height] in metres of the Stencil plane for `text` at cap height `size`. */
export const stencilSize = (text: string, o: {size?: number; font?: TFont; weight?: number | string; tracking?: number; lineSpacing?: number} = {}): [number, number] => {
  const font = o.font ?? 'futura';
  const weight = o.weight ?? 700;
  const px = fontFor(font, weight, CAP_PX);
  const probe = makeCanvas(8, 8).getContext('2d')!;
  probe.font = fontCss(font, px, weight);
  const lines = text.split('\n');
  const pad = CAP_PX * 0.45;
  const W = Math.max(...lines.map((l) => trackedWidth(probe, l, px * (o.tracking ?? 0.14))), CAP_PX) + pad * 2;
  const H = CAP_PX + CAP_PX * (o.lineSpacing ?? 1.45) * (lines.length - 1) + pad * 2;
  const s = (o.size ?? 0.3) / CAP_PX;
  return [W * s, H * s];
};

export type StencilProps = GroupProps &
  StencilCanvasOpts & {
    text: string;
    size?: number;
    color?: string;
    intensity?: number;
    opacity?: number;
    anchor?: 'center' | 'left' | 'right';
    glow?: boolean;
    renderOrder?: number;
  };

const PLANE = new THREE.PlaneGeometry(1, 1);

export const Stencil: React.FC<StencilProps> = ({
  text, font = 'futura', weight = 700, size = 0.3, color = S.bone, intensity = 0.55, opacity = 1, wear = 0.35, seed, bridges = true,
  overspray = 0.5, tracking = 0.14, anchor = 'center', lineSpacing = 1.45, glow = false, renderOrder, ...group
}) => {
  const st = useMemo(() => {
    const r = makeStencilCanvas(text, {font, weight, tracking, wear, seed, bridges, overspray, lineSpacing});
    return {...r, tex: canvasTexture(r.canvas, {srgb: false})};
  }, [text, font, weight, tracking, wear, seed, bridges, overspray, lineSpacing]);
  useLayoutEffect(() => () => st.tex.dispose(), [st]);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.map = st.tex;
    mat.color.set(color).multiplyScalar(intensity);
    mat.opacity = opacity;
    const b = glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (mat.blending !== b) {
      mat.blending = b;
      mat.needsUpdate = true;
    }
  });
  const h = size / st.capFrac;
  const w = h * st.aspect;
  const x = anchor === 'left' ? w / 2 : anchor === 'right' ? -w / 2 : 0;
  return (
    <group {...group}>
      <mesh geometry={PLANE} material={mat} position={[x, 0, 0]} scale={[w, h, 1]} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};
