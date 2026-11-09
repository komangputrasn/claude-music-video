/**
 * <GiantLetters> — monumental letters ("BUY NOW" thirty storeys tall) as per-letter emissive slabs: a thin black
 * backing slab + a glowing LED face cut from a canvas glyph, so each letter can dim, flicker and FALL (rotate about its
 * base edge). Optional lease-timer readout under each letter (mono "00:00:12" counting down — "for now").
 * (DESIGN-silhouette §4 Chorus1, Final.)
 *
 *   <GiantLetters text="BUY NOW" height?={60} font?="futura" weight?={600} color?={S.authRed} intensity?={1.6}
 *                 spacing?={0.2} wordGap?={0.55} depth? margin?={0.12} backing?={true} time?={t}
 *                 perLetter?={(i, n, ch) => ({on, intensity, flicker, fall, fallDir, timer})}
 *                 timers?={false} timerSize?={0.11} grid?={0.28} unlit?={0.22} fog?={0.55} renderOrder? {...group}/>
 *
 *   text        the word(s). Spaces leave a gap (`wordGap` × height). Punctuation is drawn without a slab.
 *   height      CAP HEIGHT in metres (a storey ≈ 3.3 m → 30 storeys ≈ 100 m). Slabs add `margin` × height around.
 *   spacing     gap between slabs as a fraction of height.
 *   perLetter   per-letter state, called every render (pure function of i/n/char — derive from your frame):
 *                 on        0..1 lit (0 = an unlit grey glyph on its slab)          default 1
 *                 intensity multiplier of the global intensity                     default 1
 *                 flicker   0..1 failing flicker, deterministic from `time`         default 0
 *                 fall      0..1 progress of falling (gravity-eased; 1 = flat on the ground)   default 0
 *                 fallDir   1 = falls FORWARD toward +Z (face down; default), -1 = backward (face up to the sky)
 *                 timer     seconds remaining (number → "00:00:12", ceil) or any string of 0-9 : - . and space
 *   timers      reserve the timer band under each glyph (the readout shows only when perLetter returns `timer`).
 *   intensity   HDR multiplier (≤ 2 for red). The face has a soft halo baked in; bloom adds the rest.
 *   grid        LED-module grid contrast (anti-moiré, shows on closer shots). unlit: brightness of unlit glyphs.
 *
 * Origin: base centre of the whole word, letters face +Z, slabs span z ∈ [-depth, 0]. Letter i's base-centre x is
 * giantLettersLayout(text, {height, spacing, …}).letters[i].x (use it to place things at a letter's foot).
 * Emissive meshes are userData.silKeep. Also exported: formatLeaseTimer(s), giantLettersLayout().
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {TFont, fontCss, makeCanvas, canvasTexture, fogUniforms, TENURE_GLSL, TENURE_FOG_GLSL, BASIC_VERT, hashStr} from './shared';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

const CAP = 320;

type Glyph = {tex: THREE.CanvasTexture; w: number; h: number; inkL: number; inkR: number; asc: number; desc: number; ox: number; oy: number};
const glyphCache = new Map<string, Glyph>();

/** Canvas glyph (R = crisp, G = soft halo), cached per char/font/weight; shared, never disposed. */
const getGlyph = (ch: string, font: TFont, weight: number | string): Glyph => {
  const key = `${ch}|${font}|${weight}`;
  const hit = glyphCache.get(key);
  if (hit) return hit;
  const probe = makeCanvas(8, 8).getContext('2d')!;
  probe.font = fontCss(font, 100, weight);
  const capR = (probe.measureText('H').actualBoundingBoxAscent || 72) / 100;
  const px = CAP / capR;
  probe.font = fontCss(font, px, weight);
  const m = probe.measureText(ch);
  const inkL = -(m.actualBoundingBoxLeft ?? 0);
  const inkR = m.actualBoundingBoxRight ?? m.width;
  const asc = m.actualBoundingBoxAscent ?? CAP;
  const desc = Math.max(0, m.actualBoundingBoxDescent ?? 0);
  const pad = CAP * 0.22;
  const w = Math.ceil(inkR - inkL + pad * 2);
  const h = Math.ceil(asc + desc + pad * 2);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  ctx.font = fontCss(font, px, weight);
  ctx.textBaseline = 'alphabetic';
  const ox = pad - inkL;
  const oy = pad + asc;
  ctx.filter = `blur(${CAP * 0.05}px)`;
  ctx.fillStyle = 'rgb(0,150,0)';
  ctx.fillText(ch, ox, oy);
  ctx.filter = `blur(${CAP * 0.14}px)`;
  ctx.fillStyle = 'rgb(0,140,0)';
  ctx.fillText(ch, ox, oy);
  ctx.filter = 'none';
  ctx.fillStyle = 'rgb(255,0,0)';
  ctx.fillText(ch, ox, oy);
  const g: Glyph = {tex: canvasTexture(c, {srgb: false}), w, h, inkL, inkR, asc, desc, ox, oy};
  glyphCache.set(key, g);
  return g;
};

// ---- digit atlas for the lease timers
const TIMER_CHARS = '0123456789:-. ';
let timerAtlas: THREE.CanvasTexture | null = null;
const getTimerAtlas = () => {
  if (timerAtlas) return timerAtlas;
  const cw = 64;
  const ch = 100;
  const c = makeCanvas(cw * TIMER_CHARS.length, ch);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.font = fontCss('mono', 84, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < TIMER_CHARS.length; i++) {
    ctx.filter = 'blur(7px)';
    ctx.fillStyle = 'rgb(0,160,0)';
    ctx.fillText(TIMER_CHARS[i], i * cw + cw / 2, ch / 2 + 3);
    ctx.filter = 'none';
    ctx.fillStyle = 'rgb(255,0,0)';
    ctx.fillText(TIMER_CHARS[i], i * cw + cw / 2, ch / 2 + 3);
  }
  timerAtlas = canvasTexture(c, {srgb: false});
  return timerAtlas;
};

/** 12.2 → "00:00:13" (ceil, clamps at 0). */
export const formatLeaseTimer = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

// ---- shaders
const FACE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor, uUnlit;
uniform float uLit, uFog, uGrid;
uniform vec2 uCells;
varying vec2 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
${TENURE_GLSL}
${TENURE_FOG_GLSL}
void main() {
  vec3 t = texture2D(uMap, vUv).rgb;
  float g = tPixelGrid(vUv * uCells, uGrid);
  // the baked halo only shows OUTSIDE the crisp glyph (1 - t.r): the core stays at ~intensity (≤ 2) — stacking the halo
  // on top of it pushed authRed to ~2.3× and ACES turned it orange
  vec3 col = uColor * uLit * (t.r * g + t.g * 0.42 * (1.0 - 0.85 * t.r)) + uUnlit * t.r * (1.0 - clamp(uLit, 0.0, 1.0));
  col *= 1.0 - tFogF() * uFog;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const TIMER_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uChars[12];
uniform float uN, uFog;
varying vec2 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
${TENURE_FOG_GLSL}
void main() {
  float idx = floor(vUv.x * uN);
  float fx = fract(vUv.x * uN);
  float ci = ${TIMER_CHARS.length - 1}.0;
  for (int i = 0; i < 12; i++) { if (float(i) == idx) ci = uChars[i]; }
  vec3 t = texture2D(uMap, vec2((ci + fx) / ${TIMER_CHARS.length}.0, vUv.y)).rgb;
  vec3 col = uColor * (t.r + t.g * 0.4 * (1.0 - 0.85 * t.r)) * (1.0 - tFogF() * uFog);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type LetterState = {on?: number; intensity?: number; flicker?: number; fall?: number; fallDir?: 1 | -1; timer?: number | string};

type LetterLayout = {ch: string; x: number; glyph: Glyph | null; slab: boolean; boxW: number};

export type GiantLettersLayoutOpts = {height?: number; font?: TFont; weight?: number | string; spacing?: number; wordGap?: number; margin?: number};

/** Letter positions (base-centre x of each slab) and the total width. Spaces have glyph null. */
export const giantLettersLayout = (text: string, o: GiantLettersLayoutOpts = {}) => {
  const H = o.height ?? 60;
  const font = o.font ?? 'futura';
  const weight = o.weight ?? 600;
  const spacing = (o.spacing ?? 0.2) * H;
  const margin = (o.margin ?? 0.12) * H;
  const s = H / CAP;
  const items: LetterLayout[] = [];
  let x = 0;
  for (const ch of Array.from(text)) {
    if (ch === ' ') {
      items.push({ch, x: x + ((o.wordGap ?? 0.55) * H) / 2, glyph: null, slab: false, boxW: 0});
      x += (o.wordGap ?? 0.55) * H;
      continue;
    }
    const g = getGlyph(ch, font, weight);
    const slab = /[A-Z0-9$]/i.test(ch);
    const inkW = (g.inkR - g.inkL) * s;
    const boxW = slab ? inkW + 2 * margin : inkW;
    items.push({ch, x: x + boxW / 2, glyph: g, slab, boxW});
    x += boxW + spacing;
  }
  const total = Math.max(0, x - spacing);
  for (const it of items) it.x -= total / 2;
  return {letters: items, width: total};
};

const PLANE = new THREE.PlaneGeometry(1, 1);

type LetterProps = {
  L: LetterLayout;
  i: number;
  H: number;
  st: LetterState;
  color: string;
  intensity: number;
  time: number;
  depth: number;
  margin: number;
  timers: boolean;
  timerSize: number;
  grid: number;
  unlit: number;
  fog: number;
  backing: boolean;
  renderOrder?: number;
  boxMat: THREE.Material;
};

const GiantLetter: React.FC<LetterProps> = ({L, i, H, st, color, intensity, time, depth, margin, timers, timerSize, grid, unlit, fog, backing, renderOrder, boxMat}) => {
  const g = L.glyph!;
  const s = H / CAP;
  const faceMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uMap: {value: null},
          uColor: {value: new THREE.Color()},
          uUnlit: {value: new THREE.Color()},
          uLit: {value: 1},
          uFog: {value: 0.55},
          uGrid: {value: 0.28},
          uCells: {value: new THREE.Vector2(10, 10)},
        },
        vertexShader: BASIC_VERT,
        fragmentShader: FACE_FRAG,
        fog: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const timerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uMap: {value: getTimerAtlas()},
          uColor: {value: new THREE.Color()},
          uChars: {value: new Array(12).fill(TIMER_CHARS.length - 1)},
          uN: {value: 8},
          uFog: {value: 0.55},
        },
        vertexShader: BASIC_VERT,
        fragmentShader: TIMER_FRAG,
        fog: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useLayoutEffect(() => () => {
    faceMat.dispose();
    timerMat.dispose();
  }, [faceMat, timerMat]);

  // deterministic per-letter flicker
  const fl = st.flicker ?? 0;
  let flick = 1;
  if (fl > 0) {
    const k = Math.floor(time * 18 + i * 3.7);
    const h1 = (Math.sin(k * 12.9898 + i * 78.233) * 43758.5453) % 1;
    const h2 = (Math.sin(k * 4.1414 + i * 11.7) * 24634.6345) % 1;
    const on = Math.abs(h1) > fl * 0.8 ? 0.6 + 0.4 * Math.abs(h2) : 0.04;
    flick = 1 - fl + fl * on;
  }
  const lit = (st.on ?? 1) * flick;
  const timerStr = st.timer === undefined ? '' : typeof st.timer === 'number' ? formatLeaseTimer(st.timer) : st.timer;
  const band = timers ? timerSize * H : 0;
  const bottomPad = timers ? 0.07 * H : margin;
  const baseline = bottomPad + (timers ? band + 0.07 * H : 0);
  const boxH = baseline + g.asc * s + margin;
  const fw = g.w * s;
  const fh = g.h * s;
  // canvas centre relative to the ink centre (ink is centred on the slab), and to the baseline (canvas y grows down)
  const faceX = (g.w / 2 - (g.ox + (g.inkL + g.inkR) / 2)) * s;
  const faceY = baseline + (g.oy - g.h / 2) * s;

  useLayoutEffect(() => {
    const u = faceMat.uniforms;
    u.uMap.value = g.tex;
    u.uColor.value.set(color).multiplyScalar(intensity * (st.intensity ?? 1));
    u.uUnlit.value.set(S.fog).multiplyScalar(unlit * 0.12);
    u.uLit.value = lit;
    u.uFog.value = fog;
    u.uGrid.value = grid;
    const cell = H * 0.025;
    u.uCells.value.set(fw / cell, fh / cell);
    const t = timerMat.uniforms;
    t.uColor.value.set(color).multiplyScalar(Math.min(2, intensity * 0.9) * Math.max(lit, 0.15));
    const arr = t.uChars.value as number[];
    const chars = Array.from(timerStr).slice(0, 12);
    for (let k = 0; k < 12; k++) {
      const ix = k < chars.length ? TIMER_CHARS.indexOf(chars[k]) : -1;
      arr[k] = ix < 0 ? TIMER_CHARS.length - 1 : ix;
    }
    t.uN.value = Math.max(1, chars.length);
    t.uFog.value = fog;
  });

  const fall = Math.max(0, Math.min(1, st.fall ?? 0));
  const dir = st.fallDir ?? 1;
  const ang = dir * (Math.PI / 2) * fall * fall;
  const twist = ((hashStr(`gl${i}`) % 1000) / 1000 - 0.5) * 0.3 * fall;
  const pivotZ = dir > 0 ? 0 : -depth;
  const tn = Math.max(1, Array.from(timerStr).length);
  const charW = band * 0.6;
  const tw = Math.min(L.boxW * 0.92, tn * charW);
  const th = (tw / (tn * charW)) * band;
  return (
    <group position={[L.x, 0, pivotZ]} rotation={[ang, twist, 0]}>
      <group position={[0, 0, -pivotZ]}>
        {backing && L.slab ? <mesh material={boxMat} position={[0, boxH / 2, -depth / 2]} scale={[L.boxW, boxH, depth]} geometry={BOX} renderOrder={renderOrder} /> : null}
        <mesh
          geometry={PLANE}
          material={faceMat}
          position={[faceX, faceY, Math.max(0.05, H * 0.01)]}
          scale={[fw, fh, 1]}
          renderOrder={(renderOrder ?? 0) + 1}
          userData={{silKeep: true}}
        />
        {timers && timerStr ? (
          <mesh
            geometry={PLANE}
            material={timerMat}
            position={[0, bottomPad + band / 2, Math.max(0.05, H * 0.01)]}
            scale={[tw, th, 1]}
            renderOrder={(renderOrder ?? 0) + 1}
            userData={{silKeep: true}}
          />
        ) : null}
      </group>
    </group>
  );
};

const BOX = new THREE.BoxGeometry(1, 1, 1);

export type GiantLettersProps = GroupProps & {
  text: string;
  height?: number;
  font?: TFont;
  weight?: number | string;
  color?: string;
  intensity?: number;
  spacing?: number;
  wordGap?: number;
  depth?: number;
  margin?: number;
  backing?: boolean;
  time?: number;
  perLetter?: (i: number, n: number, ch: string) => LetterState;
  timers?: boolean;
  timerSize?: number;
  grid?: number;
  unlit?: number;
  fog?: number;
  renderOrder?: number;
};

export const GiantLetters: React.FC<GiantLettersProps> = ({
  text, height = 60, font = 'futura', weight = 600, color = S.authRed, intensity = 1.6, spacing = 0.2, wordGap = 0.55, depth: depthProp,
  margin = 0.12, backing = true, time = 0, perLetter, timers = false, timerSize = 0.11, grid = 0.28, unlit = 0.22, fog = 0.55,
  renderOrder, ...group
}) => {
  const layout = useMemo(() => giantLettersLayout(text, {height, font, weight, spacing, wordGap, margin}), [text, height, font, weight, spacing, wordGap, margin]);
  // the slab is pushed back in depth (polygonOffset) so the glowing face never z-fights it at 500 m+ (depth precision)
  const boxMat = useMemo(() => new THREE.MeshBasicMaterial({color: S.void, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8}), []);
  useLayoutEffect(() => () => boxMat.dispose(), [boxMat]);
  const depth = depthProp ?? height * 0.07;
  const letters = layout.letters.filter((l) => l.glyph);
  const n = letters.length;
  return (
    <group {...group}>
      {letters.map((L, i) => (
        <GiantLetter
          key={`${i}-${L.ch}`}
          L={L}
          i={i}
          H={height}
          st={perLetter ? perLetter(i, n, L.ch) : {}}
          color={color}
          intensity={intensity}
          time={time}
          depth={depth}
          margin={margin * height}
          timers={timers}
          timerSize={timerSize}
          grid={grid}
          unlit={unlit}
          fog={fog}
          backing={backing}
          renderOrder={renderOrder}
          boxMat={boxMat}
        />
      ))}
    </group>
  );
};
