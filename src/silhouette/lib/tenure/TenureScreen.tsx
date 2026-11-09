/**
 * <TenureScreen> — a monumental TENURE screen: a thin black-framed slab with an emissive, canvas-textured face
 * (DESIGN-silhouette §1, §2.3, §2.5). The main light source of most shots: silhouettes stand in front of it.
 *
 *   <TenureScreen width?={16} height?={9} content?="wordmark" background?="black" ink? intensity?={1.3} pulse?={0}
 *                 time?={t} frame?={true} reveal? haze?={0.35} hazeColor? grid?={0.22} pixel? depth? border?
 *                 resolution?={2048} fog?={0.55} flicker?={0} irisOpen?={1} irisFlicker? renderOrder? {...group}/>
 *
 *   width/height  size of the glowing FACE in metres (the frame adds `border` around it).
 *   content       a preset name, a custom {lines, iris?, chrome?, header?, footer?}, or string[] (first line big Futura,
 *                 the rest small mono). Presets (SCREEN_PRESETS):
 *                   'wordmark'  red iris + TENURE + "OWN NOTHING. LACK NOTHING."   'title'   "BUY NOW, FOR NOW" on full red
 *                   'price'     "$4.99 / NIGHT" + "SLEEP · METERED"                'sleep'   "SLEEP · METERED"
 *                   'declined'  "PAYMENT DECLINED"   'plusOnly' "PLUS ONLY"   'identity' "IDENTITY NOT ON PLAN"
 *                   'thermal'   "THERMAL TIER"       'upgrade'  "UPGRADE TO CONTINUE"
 *                 Line objects: {text | spans:[{text, ink?, opacity?}], size (font px as a fraction of the face height),
 *                 font 'futura'|'futuraCond'|'mono', weight, ink, opacity, tracking (em), gap (space above, fraction of H)}.
 *                 Lines auto-shrink to fit the width. `iris: 0.3` reserves a slot above the lines (diameter = 0.3 H)
 *                 where a live <Iris> is drawn. `chrome` adds the system furniture (corner mark, lease no., rules, footer).
 *   background    'black' (default; red/bone ink on black) | 'red' (full-red slab, void ink — the Intro title).
 *   ink           override every line's ink: 'red' | 'bone' | 'void'.
 *   intensity     HDR multiplier of the face (default 1.3; bone > ~1.1 blooms, red never exceeds ~2 → keep ≤ 2).
 *   pulse         0..1 brightens face, iris and haze — drive it with bassAt(absFrame) on the beat.
 *   time          seconds: refresh-band roll, iris blades, flicker.
 *   reveal        draw only the first N characters (across all lines, in order) — letter-by-letter titles. Letters
 *                 appear in their final place. The texture is redrawn ONLY when content/ink/background/reveal change.
 *   flicker       0..1 failure flicker of the whole screen (Final: the red screens fail). Deterministic from `time`.
 *   haze          0..1 soft glow of lit fog around/in front of the screen (additive, kept below the bloom threshold).
 *   grid / pixel  LED-grid contrast (0..1) and cell size in metres (default max(w,h)/420). Anti-moiré: fades out when
 *                 cells get smaller than ~3 px, so it only shows on closer shots; scanlines likewise.
 *   fog           0..1 how much the stage fog veils the face (emissive light punches through haze; frame fogs fully).
 *
 * Origin: bottom centre of the BACK of the slab (mount it flush on a facade at the facade's surface). Faces +Z.
 * The face spans x ∈ [-w/2, w/2], y ∈ [border, border + h], at z = depth. screenFacePoint(u, v, props) gives a point on it.
 * The emissive meshes are userData.silKeep, so the screen survives inside a <Silhouette> wrapper.
 *
 * Also exported: SCREEN_PRESETS, resolveScreenContent(), drawTenureScreen(canvas, resolved, reveal) (reuse the exact
 * screen drawing on any canvas, e.g. a phone or a door panel), screenDims(props).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, hdr} from '../palette';
import {Iris} from '../Iris';
import {TFont, fontCss, makeCanvas, trackedWidth, drawTracked, canvasTexture, fogUniforms, TENURE_GLSL, TENURE_FOG_GLSL, BASIC_VERT} from './shared';
import {TENURE_SLOGAN, leaseCode} from './terms';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

export type ScreenInk = 'red' | 'bone' | 'void';
export type ScreenBackground = 'black' | 'red';
export type ScreenSpan = {text: string; ink?: ScreenInk; opacity?: number};
export type ScreenLineSpec = {
  text?: string;
  spans?: ScreenSpan[];
  size?: number;
  font?: TFont;
  weight?: number | string;
  ink?: ScreenInk;
  opacity?: number;
  tracking?: number;
  gap?: number;
};
export type ScreenLine = string | ScreenLineSpec;
export type ScreenContent = {
  lines: ScreenLine[];
  /** iris slot diameter as a fraction of the face height (0 / undefined = none) */
  iris?: number;
  /** draw the system furniture (corner iris mark + TENURE, lease no., rules, footer). Default true except title/wordmark. */
  chrome?: boolean;
  header?: string;
  footer?: string;
};
export type ScreenPreset = 'wordmark' | 'title' | 'price' | 'sleep' | 'declined' | 'plusOnly' | 'identity' | 'thermal' | 'upgrade';
export type ScreenPresetDef = ScreenContent & {background?: ScreenBackground; ink?: ScreenInk};

const mono = (text: string, extra: Partial<ScreenLineSpec> = {}): ScreenLineSpec => ({text, font: 'mono', size: 0.052, tracking: 0.28, ...extra});

export const SCREEN_PRESETS: Record<ScreenPreset, ScreenPresetDef> = {
  wordmark: {
    iris: 0.36,
    chrome: false,
    lines: [
      {text: 'TENURE', size: 0.2, tracking: 0.62, ink: 'bone'},
      {text: TENURE_SLOGAN, size: 0.05, tracking: 0.46, ink: 'red', gap: 0.07},
    ],
  },
  title: {background: 'red', chrome: false, lines: [{text: 'BUY NOW, FOR NOW', size: 0.2, tracking: 0.2, ink: 'void'}]},
  price: {
    lines: [
      {text: '$4.99 / NIGHT', size: 0.25, tracking: 0.08, ink: 'red'},
      mono('SLEEP · METERED', {ink: 'bone', gap: 0.08, size: 0.065, tracking: 0.42}),
    ],
  },
  sleep: {
    iris: 0.22,
    lines: [
      {text: 'SLEEP · METERED', size: 0.15, tracking: 0.22, ink: 'red'},
      mono('$4.99 / NIGHT · BILLED PER MINUTE', {ink: 'bone', gap: 0.06}),
    ],
  },
  declined: {
    lines: [
      {text: 'PAYMENT', size: 0.19, tracking: 0.32, ink: 'red'},
      {text: 'DECLINED', size: 0.19, tracking: 0.32, ink: 'red', gap: 0.045},
      mono('CODE 402 · LEASE 0315-77 SUSPENDED', {ink: 'bone', gap: 0.08}),
    ],
  },
  plusOnly: {
    iris: 0.24,
    lines: [
      {text: 'PLUS ONLY', size: 0.19, tracking: 0.3, ink: 'red'},
      mono('NUTRITION UNIT · UPGRADE TO TENURE PLUS', {ink: 'bone', gap: 0.07}),
    ],
  },
  identity: {
    lines: [
      {text: 'IDENTITY', size: 0.17, tracking: 0.32, ink: 'red'},
      {text: 'NOT ON PLAN', size: 0.17, tracking: 0.32, ink: 'red', gap: 0.045},
      mono('ACCESS REVOKED · DOOR 0315 · LEASE 0315-77', {ink: 'bone', gap: 0.08}),
    ],
  },
  thermal: {
    lines: [
      {text: 'THERMAL TIER', size: 0.18, tracking: 0.3, ink: 'bone'},
      mono('SEAT HEAT ON PLUS ONLY · CABIN 2°C', {ink: 'red', gap: 0.08}),
    ],
  },
  upgrade: {
    lines: [
      {text: 'UPGRADE', size: 0.2, tracking: 0.34, ink: 'red'},
      {text: 'TO CONTINUE', size: 0.11, tracking: 0.5, ink: 'red', gap: 0.05},
      mono('YOUR PLAN DOES NOT INCLUDE THIS', {ink: 'bone', gap: 0.08}),
    ],
  },
};

export type ResolvedScreen = {background: ScreenBackground; content: ScreenContent; ink?: ScreenInk};

/** Resolve a preset / custom content + overrides into what drawTenureScreen() draws. */
export const resolveScreenContent = (
  content: ScreenPreset | ScreenContent | string[] = 'wordmark',
  background?: ScreenBackground,
  ink?: ScreenInk,
): ResolvedScreen => {
  if (typeof content === 'string') {
    const p = SCREEN_PRESETS[content] ?? SCREEN_PRESETS.wordmark;
    const bg = background ?? p.background ?? 'black';
    return {background: bg, ink: ink ?? p.ink, content: {...p, chrome: p.chrome ?? true}};
  }
  if (Array.isArray(content)) {
    const lines: ScreenLine[] = content.map((t, i) => (i === 0 ? {text: t, size: 0.17, tracking: 0.3} : mono(t, {gap: i === 1 ? 0.08 : 0.03})));
    return {background: background ?? 'black', ink, content: {lines, chrome: true}};
  }
  return {background: background ?? 'black', ink, content: {chrome: true, ...content}};
};

const inkCss = (ink: ScreenInk) => (ink === 'red' ? S.authRed : ink === 'bone' ? S.bone : S.void);
const rgba = (hex: string, a: number) => {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
};

export type ScreenLayout = {irisCx: number; irisCy: number; irisD: number; hazeInk: ScreenInk};

/**
 * Draw a TENURE screen into `c` (full canvas). Returns the iris slot (fractions of canvas width/height, from top-left).
 * Pure function of its inputs (no time) — call only when the content changes.
 */
export const drawTenureScreen = (c: HTMLCanvasElement, r: ResolvedScreen, reveal = Infinity): ScreenLayout => {
  const ctx = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  const red = r.background === 'red';
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = red ? S.authRed : '#0A0B0D';
  ctx.fillRect(0, 0, W, H);
  if (red) {
    // big emissive panels are never perfectly even: a gentle hot centre
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(255,60,45,0.0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.textBaseline = 'alphabetic';
  const defInk: ScreenInk = r.ink ?? (red ? 'void' : 'red');
  const chrome = r.content.chrome !== false;
  const chromeInk: ScreenInk = red ? 'void' : 'bone';
  const left = W * 0.05;
  const right = W * 0.95;
  const unit = Math.min(H, W * 0.5);

  // ---- system furniture (functional signage, never decoration)
  if (chrome) {
    const hy = H * 0.085;
    const ir = unit * 0.026;
    // corner iris mark
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = red ? S.void : S.authRed;
    ctx.lineWidth = ir * 0.16;
    ctx.beginPath();
    ctx.arc(left + ir, hy, ir, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = red ? S.void : rgba(S.authRed, 0.55);
    ctx.beginPath();
    ctx.arc(left + ir, hy, ir * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = red ? S.authRed : '#000';
    ctx.beginPath();
    ctx.arc(left + ir, hy, ir * 0.24, 0, Math.PI * 2);
    ctx.fill();
    // TENURE + lease number
    const px = unit * 0.034;
    ctx.font = fontCss('mono', px, 700);
    ctx.fillStyle = inkCss(chromeInk);
    ctx.globalAlpha = red ? 0.8 : 0.6;
    drawTracked(ctx, r.content.header ?? 'TENURE', left + ir * 2.8, hy + px * 0.36, px * 0.5);
    ctx.font = fontCss('mono', px * 0.9);
    ctx.globalAlpha = red ? 0.7 : 0.42;
    drawTracked(ctx, leaseCode(), right, hy + px * 0.33, px * 0.3, 'right');
    // rules
    ctx.globalAlpha = red ? 0.5 : 0.22;
    ctx.fillRect(left, H * 0.14, right - left, Math.max(1, unit * 0.003));
    ctx.fillRect(left, H * 0.86, right - left, Math.max(1, unit * 0.003));
    // footer
    ctx.globalAlpha = red ? 0.65 : 0.36;
    ctx.font = fontCss('mono', px * 0.78);
    drawTracked(ctx, r.content.footer ?? 'TENURE PLAN SERVICES · TERMS 14.3(b) · NON-TRANSFERABLE · NO REFUNDS', left, H * 0.925, px * 0.26);
    ctx.globalAlpha = 1;
  }

  // ---- measure lines
  type L = {spans: ScreenSpan[]; px: number; font: TFont; weight?: number | string; track: number; w: number; cap: number; gap: number; ink: ScreenInk; opacity: number};
  const maxW = W * (chrome ? 0.86 : 0.88);
  const lines: L[] = r.content.lines.map((ln, i) => {
    const o: ScreenLineSpec = typeof ln === 'string' ? {text: ln} : ln;
    const font = o.font ?? 'futura';
    const size = o.size ?? (i === 0 ? 0.17 : 0.06);
    let px = size * H;
    const tracking = o.tracking ?? 0.2;
    const spans = o.spans ?? [{text: o.text ?? ''}];
    const full = spans.map((s) => s.text).join('');
    ctx.font = fontCss(font, px, o.weight);
    let w = trackedWidth(ctx, full, px * tracking);
    if (w > maxW) {
      px *= maxW / w;
      ctx.font = fontCss(font, px, o.weight);
      w = trackedWidth(ctx, full, px * tracking);
    }
    const cap = ctx.measureText('H').actualBoundingBoxAscent || px * 0.72;
    return {
      spans, px, font, weight: o.weight, track: px * tracking, w, cap,
      gap: i === 0 ? 0 : (o.gap ?? size * 0.4) * H,
      ink: r.ink ?? o.ink ?? defInk,
      opacity: o.opacity ?? 1,
    };
  });
  const irisD = (r.content.iris ?? 0) * H;
  const irisGap = irisD > 0 ? H * 0.075 : 0;
  const block = irisD + irisGap + lines.reduce((a, l) => a + l.cap + l.gap, 0);
  const areaTop = chrome ? H * 0.14 : 0;
  const areaBot = chrome ? H * 0.86 : H;
  let y = (areaTop + areaBot) / 2 - block / 2;
  const irisCy = y + irisD / 2;
  y += irisD + irisGap;

  // ---- draw lines (glow pass + crisp pass), honouring `reveal`
  let count = 0;
  for (const l of lines) {
    const base = y + l.cap;
    ctx.font = fontCss(l.font, l.px, l.weight);
    for (const pass of [0, 1]) {
      let x = W / 2 - l.w / 2;
      let k = count;
      for (const sp of l.spans) {
        const ink = r.ink ?? sp.ink ?? l.ink;
        const op = l.opacity * (sp.opacity ?? 1);
        const glow = pass === 0;
        if (glow && ink === 'void') {
          x += trackedWidth(ctx, sp.text, l.track) + l.track;
          k += Array.from(sp.text).length;
          continue;
        }
        ctx.globalAlpha = glow ? op * 0.75 : op;
        ctx.fillStyle = inkCss(ink);
        ctx.shadowColor = glow ? rgba(inkCss(ink), 0.9) : 'rgba(0,0,0,0)';
        ctx.shadowBlur = glow ? l.px * 0.22 : 0;
        drawTracked(ctx, sp.text, x, base, l.track, 'left', Math.max(0, reveal - k));
        x += trackedWidth(ctx, sp.text, l.track) + l.track;
        k += Array.from(sp.text).length;
      }
      if (pass === 1) count = k;
    }
    ctx.shadowBlur = 0;
    y = base + 0;
    y += lines[lines.indexOf(l) + 1]?.gap ?? 0;
  }
  ctx.restore();
  const hazeInk: ScreenInk = red ? 'red' : (lines[0]?.ink ?? defInk) === 'void' ? 'bone' : lines[0]?.ink ?? defInk;
  return {irisCx: 0.5, irisCy: irisCy / H, irisD: irisD / H, hazeInk};
};

// ------------------------------------------------------------------------------------------------ shaders
const FACE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uIntensity, uPulse, uTime, uGrid, uScan, uLift, uFog, uFlicker;
uniform vec2 uCells;
varying vec2 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
${TENURE_GLSL}
${TENURE_FOG_GLSL}
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  float g = tPixelGrid(vUv * uCells, uGrid) * tScan(vUv.y * uCells.y, uScan);
  // slow refresh band rolling down the panel
  float band = 1.0 + 0.06 * exp(-pow((fract(vUv.y + uTime * 0.11) - 0.5) * 8.0, 2.0));
  vec2 q = vUv - 0.5;
  float fall = 1.0 - 0.22 * dot(q, q) * 2.0;
  float fl = 1.0;
  if (uFlicker > 0.0) {
    float s = floor(uTime * 22.0);
    float on = step(uFlicker * 0.8, tHash(s * 1.37 + 0.5)) * (0.55 + 0.45 * tHash(s + 9.1));
    fl = mix(1.0, on, clamp(uFlicker, 0.0, 1.0));
  }
  float k = uIntensity * (1.0 + 0.6 * uPulse) * band * fall * fl;
  vec3 col = c * k * g + vec3(uLift) * (1.0 + uPulse) * fl;
  #ifdef USE_FOG
  col = mix(col, fogColor, tFogF() * uFog);
  #endif
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const HAZE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uSize, uHalf;
uniform float uFall, uInner;
varying vec2 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
${TENURE_FOG_GLSL}
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 d = abs(p) - uHalf;
  float o = length(max(d, 0.0));
  float inside = step(max(d.x, d.y), 0.0);
  float g = exp(-o / uFall) * 0.7 + exp(-o / (uFall * 3.0)) * 0.3;
  g = mix(g, uInner, inside);
  vec2 e = abs(vUv - 0.5) * 2.0;
  g *= 1.0 - smoothstep(0.75, 1.0, max(e.x, e.y));
  vec3 col = uColor * g * (1.0 - 0.6 * tFogF());
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type TenureScreenProps = GroupProps & {
  width?: number;
  height?: number;
  content?: ScreenPreset | ScreenContent | string[];
  background?: ScreenBackground;
  ink?: ScreenInk;
  intensity?: number;
  pulse?: number;
  time?: number;
  frame?: boolean;
  reveal?: number;
  haze?: number;
  hazeColor?: string;
  grid?: number;
  pixel?: number;
  depth?: number;
  border?: number;
  resolution?: number;
  fog?: number;
  flicker?: number;
  irisOpen?: number;
  irisFlicker?: number;
  renderOrder?: number;
};

/** Frame dimensions for a given props set (border, depth, overall size). */
export const screenDims = (p: {width?: number; height?: number; frame?: boolean; border?: number; depth?: number}) => {
  const w = p.width ?? 16;
  const h = p.height ?? 9;
  const border = p.frame === false ? 0 : (p.border ?? Math.max(0.03, Math.min(w, h) * 0.018));
  const depth = p.depth ?? Math.max(0.06, Math.max(w, h) * 0.022);
  return {w, h, border, depth, outerW: w + 2 * border, outerH: h + 2 * border};
};

/** World-local point on the face: u,v ∈ [0,1] from the bottom-left of the glowing face. */
export const screenFacePoint = (u: number, v: number, p: {width?: number; height?: number; frame?: boolean; border?: number; depth?: number}): [number, number, number] => {
  const d = screenDims(p);
  return [(u - 0.5) * d.w, d.border + v * d.h, d.depth];
};

const PLANE = new THREE.PlaneGeometry(1, 1);

export const TenureScreen: React.FC<TenureScreenProps> = ({
  width = 16, height = 9, content = 'wordmark', background, ink, intensity = 1.3, pulse = 0, time = 0, frame = true,
  reveal, haze = 0.35, hazeColor, grid = 0.22, pixel, depth: depthProp, border: borderProp, resolution = 2048, fog = 0.55,
  flicker = 0, irisOpen = 1, irisFlicker, renderOrder, ...group
}) => {
  const {w, h, border, depth} = screenDims({width, height, frame, border: borderProp, depth: depthProp});
  const aspect = w / h;
  const cw = aspect >= 1 ? resolution : Math.round(resolution * aspect);
  const ch = aspect >= 1 ? Math.round(resolution / aspect) : resolution;

  const canv = useMemo(() => {
    const c = makeCanvas(cw, ch);
    return {c, tex: canvasTexture(c)};
  }, [cw, ch]);
  useLayoutEffect(() => () => canv.tex.dispose(), [canv]);

  const resolved = resolveScreenContent(content, background, ink);
  const key = JSON.stringify([resolved, reveal ?? -1]);
  const layout = useMemo(() => {
    const L = drawTenureScreen(canv.c, resolved, reveal ?? Infinity);
    canv.tex.needsUpdate = true;
    return L;
  }, [canv, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const faceMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uMap: {value: null},
          uIntensity: {value: 1},
          uPulse: {value: 0},
          uTime: {value: 0},
          uGrid: {value: 0.2},
          uScan: {value: 0.1},
          uLift: {value: 0.01},
          uFog: {value: 0.5},
          uFlicker: {value: 0},
          uCells: {value: new THREE.Vector2(400, 200)},
        },
        vertexShader: BASIC_VERT,
        fragmentShader: FACE_FRAG,
        fog: true,
      }),
    [],
  );
  const hazeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uColor: {value: new THREE.Color()},
          uSize: {value: new THREE.Vector2(1, 1)},
          uHalf: {value: new THREE.Vector2(0.5, 0.5)},
          uFall: {value: 1},
          uInner: {value: 0.1},
        },
        vertexShader: BASIC_VERT,
        fragmentShader: HAZE_FRAG,
        fog: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const frameMat = useMemo(() => new THREE.MeshBasicMaterial({color: S.void}), []);
  useLayoutEffect(() => () => {
    faceMat.dispose();
    hazeMat.dispose();
    frameMat.dispose();
  }, [faceMat, hazeMat, frameMat]);

  const pix = pixel ?? Math.max(w, h) / 420;
  const ext = Math.min(w, h) * 0.7;
  const hz = hazeColor ?? (layout.hazeInk === 'red' ? S.authRed : S.bone);
  useLayoutEffect(() => {
    const u = faceMat.uniforms;
    u.uMap.value = canv.tex;
    u.uIntensity.value = intensity;
    u.uPulse.value = pulse;
    u.uTime.value = time;
    u.uGrid.value = grid;
    u.uScan.value = grid * 0.5;
    u.uLift.value = background === 'red' || resolved.background === 'red' ? 0 : 0.012;
    u.uFog.value = fog;
    u.uFlicker.value = flicker;
    u.uCells.value.set(w / pix, h / pix);
    const hu = hazeMat.uniforms;
    // red carries little luminance: give it more haze so the glow reads, bone less (stays below bloom)
    const hk = haze * (hz === S.authRed ? 0.55 : 0.32) * (1 + 0.8 * pulse) * (flicker > 0 ? 1 - 0.6 * flicker : 1);
    hu.uColor.value.set(hz).multiplyScalar(hk);
    hu.uSize.value.set(w + 2 * ext, h + 2 * ext);
    hu.uHalf.value.set(w / 2, h / 2);
    hu.uFall.value = ext * 0.22;
    hu.uInner.value = 0.16;
  });

  const lip = border * 0.6;
  const faceZ = depth;
  const cy = border + h / 2;
  const irisR = (layout.irisD * h) / 2;
  return (
    <group {...group}>
      {/* slab body */}
      <mesh position={[0, cy, (depth - border * 0.4) / 2]} material={frameMat} renderOrder={renderOrder}>
        <boxGeometry args={[w + 2 * border, h + 2 * border, depth - border * 0.4]} />
      </mesh>
      {frame ? (
        <group>
          <mesh position={[0, border / 2, depth - border * 0.2 + lip / 2]} material={frameMat}>
            <boxGeometry args={[w + 2 * border, border, border * 0.4 + lip]} />
          </mesh>
          <mesh position={[0, border * 1.5 + h, depth - border * 0.2 + lip / 2]} material={frameMat}>
            <boxGeometry args={[w + 2 * border, border, border * 0.4 + lip]} />
          </mesh>
          <mesh position={[-(w + border) / 2, cy, depth - border * 0.2 + lip / 2]} material={frameMat}>
            <boxGeometry args={[border, h, border * 0.4 + lip]} />
          </mesh>
          <mesh position={[(w + border) / 2, cy, depth - border * 0.2 + lip / 2]} material={frameMat}>
            <boxGeometry args={[border, h, border * 0.4 + lip]} />
          </mesh>
        </group>
      ) : null}
      {/* emissive face */}
      <mesh geometry={PLANE} material={faceMat} position={[0, cy, faceZ]} scale={[w, h, 1]} renderOrder={renderOrder} userData={{silKeep: true}} />
      {irisR > 0 ? (
        <Iris
          position={[0, border + h * (1 - layout.irisCy), faceZ + Math.max(0.01, h * 0.004)]}
          radius={irisR}
          open={irisOpen}
          time={time}
          intensity={Math.min(2, 1.45 * (intensity / 1.3) * (1 + 0.3 * pulse))}
          pupil={0.3 + 0.07 * pulse}
          flicker={irisFlicker ?? flicker}
          renderOrder={renderOrder}
        />
      ) : null}
      {haze > 0 ? (
        <mesh
          geometry={PLANE}
          material={hazeMat}
          position={[0, cy, faceZ + Math.max(0.02, h * 0.01)]}
          scale={[w + 2 * ext, h + 2 * ext, 1]}
          renderOrder={(renderOrder ?? 0) + 1}
          userData={{silKeep: true}}
        />
      ) : null}
    </group>
  );
};

/** Convenience: HDR colour of a screen ink (for matching spill light elsewhere). */
export const screenInkColor = (ink: ScreenInk, intensity = 1) => hdr(inkCss(ink), intensity);
