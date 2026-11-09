/**
 * <ChromeText> — extruded, bevelled 3D WordArt titles (the "BUY NOW, FOR NOW" chrome look).
 *
 * Fonts are LOCAL three.js typeface JSON converted from system fonts (src/assets/fonts): ArialBlack (default), Impact,
 * TrebuchetBoldItalic, VerdanaBold, GeorgiaBold. ASCII + a few symbols, no emoji. Nothing is downloaded.
 *
 * Geometry is cached per glyph (font, depth, bevel, segments) and per text layout, so re-rendering every frame is cheap.
 * Each letter is its own mesh, pivoted at its centre, so scenes can animate letters individually via `perLetter`.
 *
 * Coordinates: metres, text faces +Z, depth is centred on z=0. `size` is the CAP HEIGHT in metres (so all fonts look the
 * same height). Default anchor 'baseline': the last line's baseline sits on y=0, centred on x=0 (align='center').
 *
 * Props (plus any <group> props: position, rotation, scale, visible...)
 *   text: string                     use '\n' for multiple lines
 *   font?: ChromeFont                'ArialBlack' | 'Impact' | 'TrebuchetBoldItalic' | 'VerdanaBold' | 'GeorgiaBold'
 *   size?: number = 1                cap height (m)
 *   depth?: number = 0.32*size       extrusion depth (m)
 *   bevel?: number | boolean = true  bevel size (m); true = 0.045*size; false/0 = none
 *   bevelSegments?: 3  curveSegments?: 7
 *   material?: Y2KPreset | THREE.Material = 'chrome'   face + bevel material ('chrome' 'gold' 'blue' 'ruby' 'sunset'
 *                                    'candy' 'aqua' 'iridescent', or any THREE.Material)
 *   sideMaterial?: Y2KPreset | THREE.Material          extrusion sides (default = material)
 *   color?: string                   tint for metals (animatable), base colour for 'candy' / 'aqua' (bakes a texture —
 *                                    keep it constant)
 *   align?: 'left'|'center'|'right'  anchor?: 'baseline'|'center'|'top'
 *   letterSpacing?: number = 0.02    extra advance in em      lineHeight?: number = 1.05 (em)
 *   perLetter?: (i, n, info) => {position?, rotation?, scale?, visible?}   i counts visible glyphs only (spaces
 *                                    skipped); position offsets are metres, rotation radians around the letter centre.
 *   outline?: boolean | {thickness?: m, color?: css, glow?: number}   dark ink stroke (default navy) or neon aura (glow>1)
 *   shine?: number                   0..1 position of a WordArt glint sweeping left->right (undefined = none)
 *   shineAmount?: number = 1.3       glint brightness (HDR; lower for a subtler sweep)
 *   brightness?: number = 1   opacity?: number = 1   rim?: css fresnel rim colour   iriPhase?: number (iridescent shimmer)
 *   castShadow?: boolean
 *
 * Helpers: measureChromeText(text, opts) -> {width, height, capHeight, frontZ, letters[{char,i,line,x,y,center}]}
 *          (same layout math, metres, for placing sparkles / flares on letters); CHROME_FONTS.
 *
 * Usage
 *   <Stage env="chrome" background="#1E5BFF">
 *     <ChromeText text={'BUY NOW,\nFOR NOW'} size={0.8} anchor="center" shine={ramp(f, 20, 50)}
 *       perLetter={(i, n) => ({position: [0, (1 - popIn(f, i * 2)) * 3, 0], rotation: [0, 0, 0]})} />
 *     <ChromeText text="FOR NOW" font="Impact" material="gold" sideMaterial="ruby" position={[0, -1, 0]} />
 *   </Stage>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {FontLoader, Font} from 'three/examples/jsm/loaders/FontLoader.js';
import {toCreasedNormals, mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import ArialBlack from '../../assets/fonts/ArialBlack.typeface.json';
import Impact from '../../assets/fonts/Impact.typeface.json';
import TrebuchetBoldItalic from '../../assets/fonts/TrebuchetBoldItalic.typeface.json';
import VerdanaBold from '../../assets/fonts/VerdanaBold.typeface.json';
import GeorgiaBold from '../../assets/fonts/GeorgiaBold.typeface.json';
import {createY2KMat, setY2KUniforms, isMetalPreset, Y2KPreset} from './materials';

export type ChromeFont = 'ArialBlack' | 'Impact' | 'TrebuchetBoldItalic' | 'VerdanaBold' | 'GeorgiaBold';
export const CHROME_FONTS: readonly ChromeFont[] = ['ArialBlack', 'Impact', 'TrebuchetBoldItalic', 'VerdanaBold', 'GeorgiaBold'];

type GlyphData = {ha: number; x_min: number; x_max: number; o?: string};
type FontJSON = {glyphs: Record<string, GlyphData>; resolution: number; ascender: number; descender: number};
const FONT_JSON: Record<ChromeFont, unknown> = {ArialBlack, Impact, TrebuchetBoldItalic, VerdanaBold, GeorgiaBold};

type FontEntry = {font: Font; data: FontJSON; capHeight: number};
const fonts = new Map<ChromeFont, FontEntry>();
const getFont = (name: ChromeFont): FontEntry => {
  let e = fonts.get(name);
  if (!e) {
    const data = FONT_JSON[name] as FontJSON;
    const font = new FontLoader().parse(data as never);
    let cap = 0;
    for (const s of font.generateShapes('H', 1)) for (const p of s.getPoints(4)) cap = Math.max(cap, p.y);
    e = {font, data, capHeight: cap || 0.72};
    fonts.set(name, e);
  }
  return e;
};

// ------------------------------------------------------------------------------------------------ glyph geometry
type GlyphGeo = {geo: THREE.BufferGeometry; hull?: THREE.BufferGeometry; cx: number};
const glyphCache = new Map<string, GlyphGeo | null>();
const BUILD = 100; // build at 100 units/em: toCreasedNormals quantises positions to 0.01

const buildGlyph = (fontName: ChromeFont, ch: string, depthEm: number, bevelEm: number, bevelSegments: number, curveSegments: number) => {
  const key = `${fontName}|${ch}|${depthEm.toFixed(4)}|${bevelEm.toFixed(4)}|${bevelSegments}|${curveSegments}`;
  if (glyphCache.has(key)) return glyphCache.get(key) ?? null;
  const {font, capHeight} = getFont(fontName);
  const shapes = font.generateShapes(ch, BUILD);
  if (!shapes.length) {
    glyphCache.set(key, null);
    return null;
  }
  const bevel = bevelEm > 0;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: depthEm * BUILD,
    curveSegments,
    bevelEnabled: bevel,
    bevelThickness: bevelEm * BUILD * 0.9,
    bevelSize: bevelEm * BUILD,
    bevelOffset: -bevelEm * BUILD * 0.45,
    bevelSegments,
  });
  geo.deleteAttribute('uv');
  toCreasedNormals(geo, 0.9); // ~52deg: smooth curves + rounded bevel, crisp letter corners
  // caps get perfectly flat normals so the WordArt face gradient is clean
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const zMid = (depthEm * BUILD) / 2;
  for (const g of geo.groups) {
    if (g.materialIndex !== 0) continue;
    for (let i = g.start; i < g.start + g.count; i++) nor.setXYZ(i, 0, 0, pos.getZ(i) > zMid ? 1 : -1);
  }
  geo.scale(1 / BUILD, 1 / BUILD, 1 / BUILD);
  const gy = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) gy[i] = pos.getY(i) / capHeight;
  geo.setAttribute('aGradY', new THREE.BufferAttribute(gy, 1));
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const out: GlyphGeo = {geo, cx: (bb.min.x + bb.max.x) / 2};
  glyphCache.set(key, out);
  return out;
};

const hullOf = (g: GlyphGeo) => {
  if (!g.hull) {
    const h = new THREE.BufferGeometry();
    h.setAttribute('position', g.geo.attributes.position.clone());
    const m = mergeVertices(h, 1e-4);
    m.computeVertexNormals();
    g.hull = m;
  }
  return g.hull;
};

// ------------------------------------------------------------------------------------------------ layout
export type ChromeLayoutOpts = {
  font?: ChromeFont;
  size?: number;
  depth?: number;
  bevel?: number | boolean;
  letterSpacing?: number;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  anchor?: 'baseline' | 'center' | 'top';
};
type LayoutLetter = {char: string; i: number; line: number; xEm: number; yEm: number; adv: number};
type Layout = {letters: LayoutLetter[]; widthEm: number; minXEm: number; topEm: number; bottomEm: number; capEm: number; lines: number};

const layoutText = (text: string, o: ChromeLayoutOpts): Layout => {
  const {data, capHeight} = getFont(o.font ?? 'ArialBlack');
  const res = data.resolution;
  const ls = o.letterSpacing ?? 0.02;
  const lh = o.lineHeight ?? 1.05;
  const lines = text.split('\n');
  const letters: LayoutLetter[] = [];
  let minX = Infinity, maxX = -Infinity, vi = 0;
  const widths = lines.map((ln) => {
    let w = 0;
    const chars = Array.from(ln);
    chars.forEach((c, k) => {
      const g = data.glyphs[c] ?? data.glyphs['?'];
      w += (g ? g.ha / res : 0.5) + (k < chars.length - 1 ? ls : 0);
    });
    return w;
  });
  lines.forEach((ln, li) => {
    const w = widths[li];
    let x = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2;
    const y = -li * lh;
    for (const c of Array.from(ln)) {
      const g = data.glyphs[c] ?? data.glyphs['?'];
      const adv = g ? g.ha / res : 0.5;
      if (c.trim() !== '' && g?.o) {
        letters.push({char: c, i: vi++, line: li, xEm: x, yEm: y, adv});
        minX = Math.min(minX, x + g.x_min / res);
        maxX = Math.max(maxX, x + g.x_max / res);
      }
      x += adv + ls;
    }
  });
  const top = capHeight, bottom = -(lines.length - 1) * lh;
  let dy = 0;
  const anchor = o.anchor ?? 'baseline';
  if (anchor === 'baseline') dy = -bottom;
  else if (anchor === 'center') dy = -(top + bottom) / 2;
  else dy = -top;
  for (const L of letters) L.yEm += dy;
  if (!letters.length) {
    minX = 0;
    maxX = 0;
  }
  return {letters, widthEm: Math.max(1e-6, maxX - minX), minXEm: minX, topEm: top + dy, bottomEm: bottom + dy, capEm: capHeight, lines: lines.length};
};

const resolveDims = (o: ChromeLayoutOpts) => {
  const size = o.size ?? 1;
  const {capHeight} = getFont(o.font ?? 'ArialBlack');
  const em = size / capHeight;
  const depth = o.depth ?? 0.32 * size;
  const bevel = o.bevel === false ? 0 : o.bevel === true || o.bevel === undefined ? 0.045 * size : o.bevel;
  return {size, em, depthEm: depth / em, bevelEm: bevel / em};
};

export type ChromeTextMetrics = {
  width: number;
  height: number;
  capHeight: number;
  /** z of the front face (m) */
  frontZ: number;
  /** metres per em */
  em: number;
  letters: {char: string; i: number; line: number; x: number; y: number; center: [number, number, number]}[];
};

/** Measure a ChromeText layout (text-local metres, same anchor/alignment as the component). */
export const measureChromeText = (text: string, o: ChromeLayoutOpts = {}): ChromeTextMetrics => {
  const L = layoutText(text, o);
  const {em, depthEm, bevelEm} = resolveDims(o);
  const {data} = getFont(o.font ?? 'ArialBlack');
  return {
    width: L.widthEm * em,
    height: (L.topEm - L.bottomEm) * em,
    capHeight: L.capEm * em,
    frontZ: (depthEm / 2 + bevelEm * 0.9) * em,
    em,
    letters: L.letters.map((l) => {
      const g = data.glyphs[l.char];
      const cx = g ? (g.x_min + g.x_max) / 2 / data.resolution : l.adv / 2;
      return {char: l.char, i: l.i, line: l.line, x: l.xEm * em, y: l.yEm * em, center: [(l.xEm + cx) * em, (l.yEm + L.capEm / 2) * em, 0]};
    }),
  };
};

// per-text letter geometries: share the glyph's GPU attributes, add aGradX (position across the whole text)
type TextGeo = {letters: (LayoutLetter & {geo: THREE.BufferGeometry; glyph: GlyphGeo})[]; layout: Layout};
const textCache = new Map<string, TextGeo>();
const buildText = (text: string, o: ChromeLayoutOpts, bevelSegments: number, curveSegments: number): TextGeo => {
  const fontName = o.font ?? 'ArialBlack';
  const {depthEm, bevelEm} = resolveDims(o);
  const key = `${fontName}|${text}|${depthEm.toFixed(4)}|${bevelEm.toFixed(4)}|${bevelSegments}|${curveSegments}|${o.letterSpacing ?? ''}|${o.lineHeight ?? ''}|${o.align ?? ''}|${o.anchor ?? ''}`;
  let t = textCache.get(key);
  if (t) return t;
  const layout = layoutText(text, o);
  const letters: TextGeo['letters'] = [];
  for (const L of layout.letters) {
    const glyph = buildGlyph(fontName, L.char, depthEm, bevelEm, bevelSegments, curveSegments);
    if (!glyph) continue;
    const src = glyph.geo;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', src.attributes.position);
    geo.setAttribute('normal', src.attributes.normal);
    geo.setAttribute('aGradY', src.attributes.aGradY);
    const p = src.attributes.position as THREE.BufferAttribute;
    const gx = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) gx[i] = (L.xEm + p.getX(i) - layout.minXEm) / layout.widthEm;
    geo.setAttribute('aGradX', new THREE.BufferAttribute(gx, 1));
    for (const g of src.groups) geo.addGroup(g.start, g.count, g.materialIndex);
    geo.boundingBox = src.boundingBox;
    geo.boundingSphere = src.boundingSphere ?? (src.computeBoundingSphere(), src.boundingSphere);
    letters.push({...L, geo, glyph});
  }
  t = {letters, layout};
  textCache.set(key, t);
  return t;
};

// ------------------------------------------------------------------------------------------------ component
export type LetterTransform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  visible?: boolean;
};
export type ChromeTextProps = Omit<ThreeElements['group'], 'children'> &
  ChromeLayoutOpts & {
    text: string;
    bevelSegments?: number;
    curveSegments?: number;
    material?: Y2KPreset | THREE.Material;
    sideMaterial?: Y2KPreset | THREE.Material;
    color?: string;
    perLetter?: (i: number, n: number, info: {char: string; line: number}) => LetterTransform | void | undefined;
    outline?: boolean | {thickness?: number; color?: string; glow?: number};
    shine?: number;
    shineAmount?: number;
    brightness?: number;
    opacity?: number;
    rim?: string;
    iriPhase?: number;
    castShadow?: boolean;
  };

const usePresetMat = (m: Y2KPreset | THREE.Material | undefined, color: string | undefined) => {
  // metals: colour is a tint uniform (set per frame below), so only candy/aqua rebuild on colour change
  const bakeColor = typeof m === 'string' && !isMetalPreset(m) ? color : undefined;
  const mat = useMemo(() => (m instanceof THREE.Material ? m : m ? createY2KMat(m, {text: true, color: bakeColor}) : null), [m, bakeColor]);
  useLayoutEffect(() => () => {
    if (mat && !(m instanceof THREE.Material)) mat.dispose();
  }, [mat, m]);
  return mat;
};

export const ChromeText: React.FC<ChromeTextProps> = ({
  text, font = 'ArialBlack', size = 1, depth, bevel, bevelSegments = 3, curveSegments = 7, letterSpacing, lineHeight,
  align = 'center', anchor = 'baseline', material = 'chrome', sideMaterial, color, perLetter, outline, shine, shineAmount = 1.3,
  brightness = 1, opacity = 1, rim, iriPhase, castShadow, ...group
}) => {
  const lo: ChromeLayoutOpts = {font, size, depth, bevel, letterSpacing, lineHeight, align, anchor};
  const {em, depthEm} = resolveDims(lo);
  const tg = buildText(text, lo, bevelSegments, curveSegments);
  const faceMat = usePresetMat(material, color)!;
  const sideMatRaw = usePresetMat(sideMaterial, color);
  const mats = useMemo(() => (sideMatRaw ? [faceMat, sideMatRaw] : faceMat), [faceMat, sideMatRaw]);

  const oc = outline ? (outline === true ? {} : outline) : null;
  const hull = useMemo(() => {
    if (!oc) return null;
    const glow = oc.glow ?? 1;
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {uT: {value: 0}, uC: {value: new THREE.Color()}, uO: {value: 1}}]),
      vertexShader: `#include <common>
        #include <fog_pars_vertex>
        uniform float uT;
        void main(){ vec4 mvPosition = modelViewMatrix * vec4(position + normalize(normal) * uT, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `#include <common>
        #include <fog_pars_fragment>
        uniform vec3 uC; uniform float uO;
        void main(){ gl_FragColor = vec4(uC, uO);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        }`,
    });
    m.uniforms.uC.value.set(oc.color ?? (glow > 1 ? '#19C6FF' : '#0a1240')).multiplyScalar(glow);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!oc, oc?.color, oc?.glow]);
  useLayoutEffect(() => () => hull?.dispose(), [hull]);

  useLayoutEffect(() => {
    for (const m of [faceMat, sideMatRaw]) {
      if (m && (m as THREE.ShaderMaterial).uniforms?.uBright && !(m === material || m === sideMaterial)) {
        const preset = (m === faceMat ? material : sideMaterial) as Y2KPreset;
        const tint = isMetalPreset(preset) ? (color ? {tint: color, tintAmount: 0.65} : {tintAmount: 0}) : {};
        setY2KUniforms(m as THREE.ShaderMaterial, {brightness, opacity, shine: shine ?? -1, shineAmount, rim, phase: iriPhase, ...tint});
      }
    }
    if (hull && oc) {
      hull.uniforms.uT.value = (oc.thickness ?? 0.035 * size) / em;
      hull.uniforms.uO.value = opacity;
      hull.transparent = opacity < 1;
    }
  });

  const n = tg.letters.length;
  const capEm = tg.layout.capEm;
  return (
    <group {...group}>
      <group scale={em}>
        {tg.letters.map((L) => {
          const tr = perLetter?.(L.i, n, {char: L.char, line: L.line}) || {};
          const p = tr.position;
          const s = tr.scale ?? 1;
          const zero = typeof s === 'number' ? Math.abs(s) < 1e-5 : s.some((v) => Math.abs(v) < 1e-5);
          return (
            <group
              key={`${L.i}-${L.char}`}
              position={[L.xEm + L.glyph.cx + (p ? p[0] / em : 0), L.yEm + capEm / 2 + (p ? p[1] / em : 0), p ? p[2] / em : 0]}
              rotation={tr.rotation ?? [0, 0, 0]}
              scale={zero ? 1 : s}
              visible={(tr.visible ?? true) && !zero}
            >
              <mesh geometry={L.geo} material={mats} position={[-L.glyph.cx, -capEm / 2, -depthEm / 2]} castShadow={castShadow} />
              {hull ? <mesh geometry={hullOf(L.glyph)} material={hull} position={[-L.glyph.cx, -capEm / 2, -depthEm / 2]} /> : null}
            </group>
          );
        })}
      </group>
    </group>
  );
};

export default ChromeText;
