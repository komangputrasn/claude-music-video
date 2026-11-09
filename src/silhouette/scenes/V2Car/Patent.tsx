/**
 * <PatentProjection> — a patent sheet projected as bone-white light onto the fog: double border, header, the title
 * METHOD FOR REPOSSESSION IN MOTION, and FIG. 1 — the capsule in side elevation (hidden lines dashed, numbered
 * callouts) driving away from a fuelling pillar (30) and the lessee (40) it has just left. The lyric is set by the
 * scene in the same mono type in the claim band (SHEET.claim). Local to V2Car.
 *
 *   <PatentProjection time on? {...group}/>  Origin: the sheet's centre; faces +Z; SHEET.w × SHEET.h metres.
 *   on   0..1 projector brightness
 * The canvas is drawn once (module cache); the projector's breakup, halo and drift run in the shader.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, SFONTS} from '../../lib/palette';
import {atmosNoise} from '../../lib/atmos';
import {capsuleHalfLength, capsuleProfile, CAPSULE} from './Capsule';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

export const SHEET = {
  w: 60,
  h: 24,
  /** claim band: baselines (sheet-local y, m) of the two lyric rows and the em size */
  claim: {em: 2.3, row0: 4.6, row1: 4.6 - 1.18 * 2.3, x: 3},
};

const PPM = 68; // canvas px per metre
const ls = (g: CanvasRenderingContext2D, px: number) => ((g as unknown as {letterSpacing: string}).letterSpacing = `${px}px`);

const drawSheet = () => {
  const Wc = Math.round(SHEET.w * PPM);
  const Hc = Math.round(SHEET.h * PPM);
  const c = document.createElement('canvas');
  c.width = Wc;
  c.height = Hc;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, Wc, Hc);
  // sheet metres → canvas px (origin at the sheet centre, y up)
  const X = (x: number) => Wc / 2 + x * PPM;
  const Y = (y: number) => Hc / 2 - y * PPM;
  const hw = SHEET.w / 2, hh = SHEET.h / 2;
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const line = (pts: [number, number][], w = 0.1, dash: number[] | null = null, close = false) => {
    g.lineWidth = w * PPM;
    g.setLineDash(dash ? dash.map((d) => d * PPM) : []);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    if (close) g.closePath();
    g.stroke();
    g.setLineDash([]);
  };
  const text = (s: string, x: number, y: number, cap: number, align: CanvasTextAlign = 'left', track = 0.12, weight = 400) => {
    const px = (cap / 0.72) * PPM;
    g.font = `${weight} ${px}px ${SFONTS.mono}`;
    ls(g, track * px);
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    g.fillText(s, X(x), Y(y));
  };
  // border
  line([[-hw + 0.5, -hh + 0.5], [hw - 0.5, -hh + 0.5], [hw - 0.5, hh - 0.5], [-hw + 0.5, hh - 0.5]], 0.14, null, true);
  line([[-hw + 0.85, -hh + 0.85], [hw - 0.85, -hh + 0.85], [hw - 0.85, hh - 0.85], [-hw + 0.85, hh - 0.85]], 0.05, null, true);
  // header
  text('TENURE MOBILITY SYSTEMS', -hw + 1.8, hh - 1.9, 0.5);
  text('PATENT No. 0315-77     SHEET 1 OF 9', hw - 1.8, hh - 1.9, 0.5, 'right');
  line([[-hw + 1.6, hh - 2.4], [hw - 1.6, hh - 2.4]], 0.05);
  // title
  text('METHOD FOR REPOSSESSION IN MOTION', 0, hh - 4.6, 1.45, 'center', 0.14, 500);

  // ---------------------------------------------------------------- FIG. 1
  const k = 3.1; // drawing scale (sheet m per pod m)
  const cx = 14, gy = -8.6; // pod centre x, ground line y (sheet m)
  const P = (z: number, y: number): [number, number] => [cx + z * k, gy + y * k];
  // ground line, long, with hatch ticks
  line([[-hw + 2.5, gy], [hw - 2.5, gy]], 0.08);
  for (let x = -hw + 3; x < hw - 3; x += 0.9) line([[x, gy], [x - 0.45, gy - 0.45]], 0.04);
  // the pod (side elevation)
  const prof = capsuleProfile(140).map(([z, y]) => P(z, y));
  line(prof, 0.13, null, true);
  // canopy: belt and roof lines, glass dashed inside
  const belt = capsuleHalfLength(CAPSULE.belt);
  const roof = capsuleHalfLength(CAPSULE.roof);
  line([P(-belt * 0.97, CAPSULE.belt), P(belt * 0.97, CAPSULE.belt)], 0.07);
  line([P(-roof * 0.9, CAPSULE.roof), P(roof * 0.85, CAPSULE.roof)], 0.07);
  // the door seam
  line([P(-0.95, 0.32), P(-0.95, CAPSULE.roof)], 0.06);
  line([P(0.9, 0.32), P(0.9, CAPSULE.roof)], 0.06);
  // the empty seat (hidden lines)
  line([P(-0.42, 0.32), P(0.14, 0.32), P(0.14, 0.46), P(-0.4, 0.46)], 0.05, [0.35, 0.22]);
  line([P(-0.4, 0.46), P(-0.62, 1.32), P(-0.48, 1.36), P(-0.28, 0.5)], 0.05, [0.35, 0.22]);
  // hidden wheels
  for (const z of [-1.35, 1.35]) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (2 * Math.PI * i) / 40;
      pts.push(P(z + 0.3 * Math.cos(a), 0.3 + 0.3 * Math.sin(a)));
    }
    line(pts, 0.05, [0.3, 0.2]);
  }
  // the iris on the tail
  const tail = P(-CAPSULE.length / 2, CAPSULE.tail[1]);
  g.lineWidth = 0.07 * PPM;
  g.beginPath();
  g.arc(X(tail[0] - 0.12), Y(tail[1]), 0.42 * PPM, 0, Math.PI * 2);
  g.stroke();
  // motion: speed lines behind it, a direction arrow ahead
  for (const [y, l] of [[0.55, 3.2], [0.95, 4.6], [1.35, 2.6]] as [number, number][]) {
    const a = P(-CAPSULE.length / 2 - 0.4, y);
    line([a, [a[0] - l, a[1]]], 0.06, [0.6, 0.35]);
  }
  const ah = P(CAPSULE.length / 2 + 0.6, 0.85);
  line([ah, [ah[0] + 5.2, ah[1]]], 0.09);
  line([[ah[0] + 4.4, ah[1] + 0.6], [ah[0] + 5.2, ah[1]], [ah[0] + 4.4, ah[1] - 0.6]], 0.09);
  // the fuelling pillar (30) and the lessee (40), left behind
  const px = -5.2;
  line([[px - 1.1, gy], [px - 1.1, gy + 9.2], [px + 1.1, gy + 9.2], [px + 1.1, gy]], 0.11);
  line([[px - 0.8, gy + 0.6], [px + 0.8, gy + 0.6], [px + 0.8, gy + 8.6], [px - 0.8, gy + 8.6]], 0.05, null, true);
  // lessee: a plain outline figure, standing
  const fx = 0, fs = 1.95;
  const F = (x: number, y: number): [number, number] => [fx + x * fs, gy + y * fs];
  g.lineWidth = 0.08 * PPM;
  g.beginPath();
  g.arc(X(F(0, 1.58)[0]), Y(F(0, 1.58)[1]), 0.16 * fs * PPM, 0, Math.PI * 2);
  g.stroke();
  line([F(-0.2, 1.38), F(-0.24, 0.85), F(-0.1, 0.85), F(-0.12, 0), F(0.0, 0), F(0.02, 0.75), F(0.04, 0), F(0.16, 0), F(0.12, 0.85),
    F(0.26, 0.85), F(0.22, 1.38), F(-0.2, 1.38)], 0.07);
  // dimension line: the distance opened between lessee and vehicle
  const dy = gy - 1.2;
  line([[fx + 0.6, dy], [cx - CAPSULE.length / 2 * k, dy]], 0.05);
  for (const x of [fx + 0.6, cx - (CAPSULE.length / 2) * k]) line([[x, dy - 0.4], [x, dy + 0.4]], 0.05);
  text('d(t) → ∞', (fx + cx - (CAPSULE.length / 2) * k) / 2 + 0.3, dy + 0.35, 0.45, 'center');
  // callouts: number + leader line
  const call = (n: string, from: [number, number], to: [number, number]) => {
    line([from, to], 0.045);
    g.beginPath();
    g.arc(X(to[0]), Y(to[1]), 0.09 * PPM, 0, Math.PI * 2);
    g.fill();
    text(n, from[0] + (from[0] < to[0] ? -0.25 : 0.25), from[1] - 0.25, 0.55, from[0] < to[0] ? 'right' : 'left');
  };
  call('10', [cx + 9.0, gy + 6.6], P(1.5, 0.5));
  call('12', [cx + 6.8, gy + 7.6], P(0.6, 1.3));
  call('14', [cx - 1.5, gy + 7.9], P(-0.45, 1.0));
  call('16', [cx - 6.2, gy + 7.9], [tail[0] - 0.2, tail[1] + 0.35]);
  call('18', [cx + 3.2, gy + 8.3], P(-0.95, 1.2));
  call('30', [px - 3.0, gy + 7.6], [px - 1.1, gy + 6.6]);
  call('40', [fx - 2.2, gy + 7.7], F(-0.22, 1.1));
  text('FIG. 1', -hw + 3.2, gy + 0.6, 0.75, 'left', 0.2, 500);
  // the claim band
  line([[-hw + 1.6, 0.9], [hw - 1.6, 0.9]], 0.05);
  text('CLAIM 1.', -hw + 1.8, SHEET.claim.row0, 0.55);
  text('WHAT IS CLAIMED IS:', -hw + 1.8, SHEET.claim.row0 - 0.85, 0.42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};
let sheetTex: THREE.CanvasTexture | null = null;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
uniform sampler2D uMap, uNoise;
uniform float uOn, uTime;
uniform vec3 uCol;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  vec3 halo = texture2D(uMap, vUv, 3.5).rgb;
  vec2 q = vUv * vec2(2.5, 1.0);
  float n = texture2D(uNoise, q + vec2(uTime * 0.012, 0.0)).r;
  float n2 = texture2D(uNoise, q * 2.6 - vec2(uTime * 0.02, uTime * 0.006)).g;
  float breakup = mix(0.62, 1.08, smoothstep(0.15, 0.85, n * 0.65 + n2 * 0.35));
  // projector falloff: a touch brighter in the middle of the throw
  vec2 d = (vUv - 0.5) * vec2(1.0, 1.6);
  float throwK = 1.0 - 0.28 * dot(d, d);
  vec3 col = (c + halo * 0.45) * breakup * throwK;
  gl_FragColor = vec4(uCol * col * uOn, 1.0);
}`;

export const PatentProjection: React.FC<GroupProps & {time: number; on?: number}> = ({time, on = 1, ...group}) => {
  sheetTex ??= drawSheet();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: {value: sheetTex}, uNoise: {value: atmosNoise(5)}, uOn: {value: 0}, uTime: {value: 0},
          uCol: {value: new THREE.Color(S.bone)},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.uniforms.uOn.value = on * 0.95;
    mat.uniforms.uTime.value = time;
  });
  return (
    <group {...group}>
      <mesh material={mat}>
        <planeGeometry args={[SHEET.w, SHEET.h]} />
      </mesh>
    </group>
  );
};
