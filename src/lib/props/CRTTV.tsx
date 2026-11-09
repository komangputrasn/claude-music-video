/**
 * CRTTV — chunky early-2000s CRT television (silver plastic, curved glass, rabbit-ear antenna) whose screen shows any
 * THREE.Texture through a CRT shader (barrel curve, scanlines, vignette, TV snow, and the classic power-on / power-off:
 * bright dot -> horizontal line -> picture opens vertically; reverse it for the collapse-to-a-dot switch-off).
 *
 * Origin: base centre on the floor/furniture top; faces +Z. Footprint ~0.66 w x 0.52 d, height 0.61 (+ antenna).
 *
 * API
 *   <CRTTV screen={tex} power={0..1} glow={1} static={0} frame={f} antenna light={1} {...groupProps} />
 *     screen   any THREE.Texture (CanvasTexture / VideoTexture / render-target texture). null = black picture.
 *     power    0 = off (dark glass), 1 = on. Animate 0->1 over ~12-20 frames for power-on, 1->0 for power-off.
 *              0..0.1 dot appears · 0.08..0.4 dot stretches into a horizontal line · 0.38..0.8 picture opens · ->1 settles.
 *     glow     picture brightness multiplier (1 normal, 1.5+ blooms hard). static 0..1 TV snow. frame drives snow/roll.
 *     light    intensity of the coloured light the screen casts into the room (0 disables); lightColor tints it.
 *   CRT_SCREEN = {width, height, center:[x,y,z]} in TV-local metres (center is ON the glass) — for flying into the screen:
 *     camera at [cx, cy, cz + d] looking at center with fov = 2*atan(height/2/d) fills the frame with the picture.
 *   CRT_SIZE = {width, height, depth}
 *   makeTestPatternTexture(label?) — cached colour-bar test card CanvasTexture (640x480, system fonts).
 *   crtFillCamera(fovDeg, aspect?) -> distance from the glass at which the picture exactly fills a camera of that fov.
 *
 * Usage
 *   const bars = useMemo(() => makeTestPatternTexture(), []);
 *   <CRTTV position={[0, 0.8, 0]} screen={bars} power={ramp(f, 10, 30)} static={0.1} frame={f} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {TBox, TCyl, TSphere, TFrustum, chromeMat, glowMat, makeCanvas, canvasTex, geo} from '../sets/bedroom/ink';
import {toonMat} from '../characters/toon';
import {FONTS} from '../palette';

export const CRT_SIZE = {width: 0.66, height: 0.61, depth: 0.52} as const;
export const CRT_SCREEN = {width: 0.46, height: 0.345, center: [0, 0.375, 0.283] as [number, number, number]} as const;

/** Distance from the glass at which the 4:3 picture exactly fills the frame vertically for a camera of `fovDeg`. */
export const crtFillCamera = (fovDeg: number) => CRT_SCREEN.height / 2 / Math.tan((fovDeg * Math.PI) / 360);

export type CRTTVProps = Omit<ThreeElements['group'], 'children' | 'static'> & {
  screen?: THREE.Texture | null;
  power?: number;
  glow?: number;
  static?: number;
  frame?: number;
  /** body plastic colour (default silver) */
  color?: string;
  antenna?: boolean;
  /** cast-light intensity (0 = no light) */
  light?: number;
  lightColor?: string;
  children?: React.ReactNode;
};

// ---------------------------------------------------------------- test pattern
const patternCache = new Map<string, THREE.CanvasTexture>();
/** Classic colour-bar test card (cached per label). */
export const makeTestPatternTexture = (label = 'TELEVOX'): THREE.CanvasTexture => {
  const hit = patternCache.get(label);
  if (hit) return hit;
  const W = 640, H = 480;
  const {c, ctx} = makeCanvas(W, H);
  const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  const bw = W / 7;
  bars.forEach((b, i) => {
    ctx.fillStyle = b;
    ctx.fillRect(Math.round(i * bw), 0, Math.ceil(bw), H * 0.66);
  });
  const rev = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
  rev.forEach((b, i) => {
    ctx.fillStyle = b;
    ctx.fillRect(Math.round(i * bw), H * 0.66, Math.ceil(bw), H * 0.08);
  });
  const low = [['#00214c', 1.25], ['#ffffff', 1.25], ['#32006a', 1.25], ['#131313', 1.25], ['#090909', 0.33], ['#131313', 0.34], ['#1d1d1d', 0.33], ['#131313', 1]] as const;
  let x = 0;
  low.forEach(([col, w]) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), H * 0.74, Math.ceil(w * bw), H * 0.26);
    x += w * bw;
  });
  // centre circle + label plate
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.4, H * 0.27, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - H * 0.27, H * 0.4);
  ctx.lineTo(W / 2 + H * 0.27, H * 0.4);
  ctx.moveTo(W / 2, H * 0.13);
  ctx.lineTo(W / 2, H * 0.67);
  ctx.stroke();
  ctx.fillStyle = '#101010';
  ctx.fillRect(W / 2 - 150, H * 0.4 - 32, 300, 64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(W / 2 - 150, H * 0.4 - 32, 300, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 40px ${FONTS.ui}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, W / 2, H * 0.4 + 2);
  const t = canvasTex(c);
  patternCache.set(label, t);
  return t;
};

// ---------------------------------------------------------------- screen shader
const screenVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const screenFrag = /* glsl */ `
  uniform sampler2D uMap; uniform float uHasMap, uPower, uGlow, uStatic, uFrame;
  varying vec2 vUv;
  float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
  float sdRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 p = vUv - 0.5;
    vec2 pa = p * vec2(1.3333, 1.0);                       // aspect-space (x: -0.667..0.667)
    float dImg = sdRR(pa, vec2(0.640, 0.475), 0.07);        // picture area (rounded CRT corners)
    float inImg = 1.0 - smoothstep(-0.006, 0.004, dImg);
    vec2 q = p * (1.0 + 0.09 * dot(pa, pa));               // barrel curve

    float pw = clamp(uPower, 0.0, 1.0);
    float aDot = smoothstep(0.0, 0.10, pw);
    float aX = smoothstep(0.08, 0.40, pw);
    float aY = smoothstep(0.38, 0.80, pw);
    float aS = smoothstep(0.78, 1.0, pw);
    float r = 0.016 * aDot;
    float hx = mix(r, 0.70, aX);
    float hy = mix(mix(r, 0.0045, aX), 0.52, aY * aY);
    float dOut = sdRR(pa, vec2(hx, hy), min(hx, hy));
    float inside = 1.0 - smoothstep(-0.0015, 0.0025, dOut);

    // vertical deflection collapses -> the picture squashes into the line
    vec2 iuv = vec2(q.x + 0.5, q.y * (0.52 / max(hy, 0.002)) + 0.5);
    vec3 img = uHasMap > 0.5 ? texture2D(uMap, clamp(iuv, 0.0, 1.0)).rgb : vec3(0.015, 0.02, 0.035);

    // TV snow + rolling band
    vec2 cell = floor(vUv * vec2(240.0, 180.0));
    float n = hash(cell + vec2(uFrame * 7.13, uFrame * 3.71));
    float band = 0.75 + 0.35 * smoothstep(0.0, 0.25, fract(vUv.y * 1.3 + uFrame * 0.037)) * (1.0 - smoothstep(0.25, 0.45, fract(vUv.y * 1.3 + uFrame * 0.037)));
    float tear = step(0.985, hash(vec2(floor(vUv.y * 90.0), uFrame)));
    vec3 snow = vec3(n * band) + tear * 0.4;
    img = mix(img, snow, clamp(uStatic, 0.0, 1.0));

    // scanlines + vignette
    img *= 0.80 + 0.20 * sin(vUv.y * 3.14159 * 2.0 * 160.0);
    img *= 1.0 - 0.6 * pow(clamp(length(pa * vec2(0.82, 1.08)), 0.0, 1.0), 2.4);

    float white = clamp(1.0 - (0.8 * aY + 0.2 * aS), 0.0, 1.0);
    vec3 beam = vec3(0.80, 0.93, 1.0) * mix(3.4, 1.2, aY);
    vec3 lit = mix(img * uGlow, beam, white);
    float halo = exp(-max(dOut, 0.0) * 55.0) * (1.0 - aY) * aDot;

    // dark glass + reflections
    vec3 glass = vec3(0.007, 0.011, 0.012) + vec3(0.010, 0.013, 0.015) * (0.5 + p.y);
    vec3 col = glass;
    col += lit * inside * inImg * aDot;
    col += vec3(0.55, 0.8, 1.0) * halo * 0.9 * inImg;
    float spec = smoothstep(0.32, 0.0, length((p - vec2(-0.25, 0.26)) * vec2(1.0, 2.4)));
    float rim = smoothstep(0.10, 0.0, abs(dImg + 0.035)) * smoothstep(0.0, 0.4, p.y + 0.1);
    col += vec3(0.75, 0.85, 1.0) * (0.075 * spec + 0.03 * rim);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const makeScreenGeometry = () => {
  const {width: w, height: h} = CRT_SCREEN;
  const g = new THREE.PlaneGeometry(w, h, 24, 18);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
    p.setZ(i, 0.016 * (1 - 0.5 * x * x - 0.5 * y * y));
  }
  g.computeVertexNormals();
  return g;
};
let screenGeo: THREE.BufferGeometry | null = null;

// ---------------------------------------------------------------- badge
const badgeCache: {t?: THREE.CanvasTexture} = {};
const badgeTexture = () => {
  if (badgeCache.t) return badgeCache.t;
  const {c, ctx} = makeCanvas(512, 96);
  ctx.clearRect(0, 0, 512, 96);
  ctx.font = `italic 900 64px ${FONTS.heavy}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('TELEVOX', 258, 52);
  const g = ctx.createLinearGradient(0, 20, 0, 80);
  g.addColorStop(0, '#5b6375');
  g.addColorStop(1, '#262a35');
  ctx.fillStyle = g;
  ctx.fillText('TELEVOX', 256, 49);
  badgeCache.t = canvasTex(c);
  return badgeCache.t;
};

// ---------------------------------------------------------------- component
export const CRTTV: React.FC<CRTTVProps> = ({
  screen = null, power = 1, glow = 1, static: staticAmt = 0, frame = 0, color = '#c4cad6', antenna = true,
  light = 1, lightColor = '#9cc4ff', children, ...group
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: {value: null as THREE.Texture | null}, uHasMap: {value: 0}, uPower: {value: 1}, uGlow: {value: 1},
          uStatic: {value: 0}, uFrame: {value: 0},
        },
        vertexShader: screenVert,
        fragmentShader: screenFrag,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uMap.value = screen;
    u.uHasMap.value = screen ? 1 : 0;
    u.uPower.value = power;
    u.uGlow.value = glow * 1.12;
    u.uStatic.value = staticAmt;
    u.uFrame.value = frame;
  });
  if (!screenGeo) screenGeo = makeScreenGeometry();

  const [cx, cy, cz] = CRT_SCREEN.center;
  const p = Math.max(0, Math.min(1, power));
  const litAmt = p < 0.08 ? 0 : Math.min(1, (p - 0.08) / 0.6);
  const on = p > 0.5;
  const back = '#8f97a6';
  const dark = '#2f3440';

  return (
    <group {...group}>
      {/* plinth */}
      <TBox size={[0.46, 0.03, 0.36]} r={0.01} color={dark} position={[0, 0.015, -0.03]} />
      {/* back housing (tube) */}
      <TFrustum front={[0.6, 0.5]} back={[0.36, 0.3]} depth={0.34} yShiftBack={0.02} color={back} position={[0, 0.33, -0.07]} />
      {/* back vents */}
      {[-0.06, -0.02, 0.02, 0.06].map((y) => (
        <mesh key={y} geometry={geo.box(0.22, 0.012, 0.005)} material={toonMat(dark)} position={[0, 0.35 + y, -0.243]} />
      ))}
      {/* front bezel */}
      <TBox size={[0.66, 0.58, 0.17]} r={0.04} seg={3} color={color} position={[0, 0.32, 0.18]} />
      {/* screen surround (dark recess) */}
      <TBox size={[0.535, 0.415, 0.02]} r={0.009} color={dark} ink={false} position={[cx, cy, 0.257]} />
      {/* glass */}
      <mesh geometry={screenGeo} material={mat} position={[cx, cy, 0.268]} />
      {/* brand badge */}
      <mesh geometry={geo.plane(0.13, 0.024)} position={[0, 0.157, 0.2655]}>
        <meshBasicMaterial map={badgeTexture()} transparent toneMapped={false} />
      </mesh>
      {/* speaker slits (left of chin) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={geo.box(0.15, 0.006, 0.004)} material={toonMat('#5a606e')} position={[-0.2, 0.065 + i * 0.016, 0.2655]} />
      ))}
      {/* buttons (right of chin) */}
      {[0, 1, 2, 3].map((i) => (
        <TBox key={i} size={[0.026, 0.016, 0.012]} r={0.005} color="#9aa2b2" ink={0.003} position={[0.11 + i * 0.034, 0.085, 0.268]} />
      ))}
      <TCyl args={[0.017, 0.017, 0.016, 16]} color="#e8ecf4" ink={0.003} rotation={[Math.PI / 2, 0, 0]} position={[0.27, 0.085, 0.27]} />
      <mesh geometry={geo.circle(0.006, 12)} position={[0.27, 0.125, 0.2665]} material={on ? glowMat('#5dff6a', 3) : glowMat('#ff2a1a', 2.2)} />
      {/* rabbit-ear antenna */}
      {antenna ? (
        <group position={[0, 0.5, -0.1]}>
          <TSphere radius={0.055} segs={[14, 8]} color={dark} scale={[1, 0.55, 1]} />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.02, 0.02, 0]} rotation={[-0.22, 0, -s * 0.42]}>
              <mesh geometry={geo.cyl(0.0035, 0.005, 0.46, 6)} material={chromeMat('#9aa3b6', 0.4)} position={[0, 0.23, 0]} />
              <mesh geometry={geo.sphere(0.009, 8, 6)} material={chromeMat('#9aa3b6', 0.4)} position={[0, 0.46, 0]} />
            </group>
          ))}
        </group>
      ) : null}
      {/* light cast by the picture */}
      <pointLight position={[cx, cy + 0.1, cz + 0.8]} color={lightColor} intensity={light * litAmt * glow * 1.4} distance={4.5} decay={1.4} />
      {children}
    </group>
  );
};
