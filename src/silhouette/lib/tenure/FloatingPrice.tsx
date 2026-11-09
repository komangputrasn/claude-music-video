/**
 * <FloatingPrice> — a price line projected onto fog: soft additive text with a haze glow, faint drifting scan lines,
 * and uneven density (the fog it lands on is never uniform). Three stacked layers in depth give it volume.
 * (DESIGN-silhouette §2.5 "price lines are projected on the fog"; Chorus1: the floating price over the house cube.)
 *
 *   <FloatingPrice text?="$4.99 / NIGHT" size?={2.4} color?={S.authRed} intensity?={1.5} time?={t} font?="futura"
 *                  weight?={500} tracking?={0.12} haze?={0.8} scan?={0.35} breakup?={0.55} depth? flicker?={0.1}
 *                  fog?={0.6} opacity?={1} renderOrder? {...group}/>
 *
 *   text       the price line (uppercase; "$4.99 / NIGHT", "$0.40 / MINUTE", "SLEEP · METERED").
 *   size       CAP HEIGHT in metres. The plane is wider/taller (glow padding). Origin: CENTRE of the text, faces +Z.
 *   color      S.authRed (prices are control) — or S.bone for neutral projected information. Nothing else.
 *   intensity  HDR multiplier (≤ 2 for red).
 *   haze       0..1 the soft glow cloud around the letters (light scattering in the fog).
 *   scan       0..1 projector scan-line contrast (lines ~ size/9 apart, drifting slowly; anti-moiré).
 *   breakup    0..1 how much drifting fog density modulates the projection.
 *   depth      spread (m) of the two extra haze layers in front/behind (default 0.5 × size).
 *   flicker    0..1 projector instability (subtle brightness jitter, deterministic from `time`).
 *
 * Additive, depthWrite off, userData.silKeep. Put it in front of something dark or mid-grey fog: on bone-bright fog
 * additive red mostly disappears (that is physically right; stage it against ash).
 * Also exported: makePriceCanvas(text, opts) → {canvas, aspect, capFrac}.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {TFont, fontCss, makeCanvas, trackedWidth, drawTracked, canvasTexture, fogUniforms, TENURE_GLSL, TENURE_FOG_GLSL, BASIC_VERT} from './shared';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

const CAP = 150;

/** R = crisp text, G = mid halo, B = wide haze (linear mask). */
export const makePriceCanvas = (text: string, o: {font?: TFont; weight?: number | string; tracking?: number} = {}) => {
  const font = o.font ?? 'futura';
  const weight = o.weight ?? 500;
  const probe = makeCanvas(8, 8).getContext('2d')!;
  probe.font = fontCss(font, 100, weight);
  const capR = (probe.measureText('H').actualBoundingBoxAscent || 72) / 100;
  const px = CAP / capR;
  probe.font = fontCss(font, px, weight);
  const track = px * (o.tracking ?? 0.12);
  const tw = trackedWidth(probe, text, track);
  const padX = CAP * 1.1;
  const padY = CAP * 1.0;
  const W = Math.ceil(tw + padX * 2);
  const H = Math.ceil(CAP + padY * 2);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.font = fontCss(font, px, weight);
  ctx.textBaseline = 'alphabetic';
  const base = padY + CAP;
  const pass = (blur: number, style: string) => {
    ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
    ctx.fillStyle = style;
    drawTracked(ctx, text, W / 2, base, track, 'center');
  };
  pass(CAP * 0.1, 'rgb(0,200,0)');
  pass(CAP * 0.035, 'rgb(0,90,0)');
  pass(CAP * 0.42, 'rgb(0,0,255)');
  pass(CAP * 0.2, 'rgb(0,0,120)');
  pass(0, 'rgb(255,0,0)');
  ctx.filter = 'none';
  return {canvas: c, aspect: W / H, capFrac: CAP / H};
};

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uTime, uLayer, uHaze, uScan, uScanPitch, uBreakup, uFog, uOpacity, uNoise;
varying vec2 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
${TENURE_GLSL}
${TENURE_FOG_GLSL}
void main() {
  vec3 t = texture2D(uMap, vUv).rgb;
  vec2 w = vWorld.xy * uNoise;
  float n = tNoise(w + vec2(uTime * 0.11, uTime * 0.04) + uLayer * 3.1) * 0.6 + tNoise(w * 2.7 - vec2(uTime * 0.07, -uTime * 0.03)) * 0.4;
  // density only thins the projection (never > 1): the red core must stay at ~intensity (≤ 2) or ACES turns it orange
  float dens = mix(1.0, 0.4 + 0.6 * n, uBreakup);
  float sc = tScan(vWorld.y / uScanPitch - uTime * 0.35, uScan);
  // halos live OUTSIDE the crisp letters (1 - t.r), so the stacked layers never pile up on the core
  float outside = 1.0 - 0.85 * t.r;
  float m;
  if (uLayer < 0.5) m = t.r * sc + (t.g * 0.55 + t.b * uHaze * 0.55) * outside;
  else m = (t.g * 0.25 + t.b * uHaze * 0.7) * 0.6 * outside;
  vec3 col = uColor * m * dens * uOpacity * (1.0 - tFogF() * uFog);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type FloatingPriceProps = GroupProps & {
  text?: string;
  size?: number;
  color?: string;
  intensity?: number;
  time?: number;
  font?: TFont;
  weight?: number | string;
  tracking?: number;
  haze?: number;
  scan?: number;
  breakup?: number;
  depth?: number;
  flicker?: number;
  fog?: number;
  opacity?: number;
  renderOrder?: number;
};

const PLANE = new THREE.PlaneGeometry(1, 1);

const makeMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uMap: {value: null},
      uColor: {value: new THREE.Color()},
      uTime: {value: 0},
      uLayer: {value: 0},
      uHaze: {value: 0.6},
      uScan: {value: 0.35},
      uScanPitch: {value: 0.3},
      uBreakup: {value: 0.45},
      uFog: {value: 0.6},
      uOpacity: {value: 1},
      uNoise: {value: 0.3},
    },
    vertexShader: BASIC_VERT,
    fragmentShader: FRAG,
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

export const FloatingPrice: React.FC<FloatingPriceProps> = ({
  text = '$4.99 / NIGHT', size = 2.4, color = S.authRed, intensity = 1.5, time = 0, font = 'futura', weight = 500, tracking = 0.12,
  haze = 0.8, scan = 0.35, breakup = 0.55, depth, flicker = 0.1, fog = 0.6, opacity = 1, renderOrder, ...group
}) => {
  const pc = useMemo(() => {
    const r = makePriceCanvas(text, {font, weight, tracking});
    return {...r, tex: canvasTexture(r.canvas, {srgb: false})};
  }, [text, font, weight, tracking]);
  useLayoutEffect(() => () => pc.tex.dispose(), [pc]);
  const mats = useMemo(() => [makeMat(), makeMat(), makeMat()], []);
  useLayoutEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  // projector instability: deterministic, subtle
  const k = Math.floor(time * 15);
  const h = Math.abs((Math.sin(k * 12.9898) * 43758.5453) % 1);
  const jitter = 1 - flicker * 0.25 * h - (h > 0.93 ? flicker * 0.5 : 0);
  useLayoutEffect(() => {
    mats.forEach((m, i) => {
      const u = m.uniforms;
      u.uMap.value = pc.tex;
      u.uColor.value.set(color).multiplyScalar(intensity * jitter);
      u.uTime.value = time;
      u.uLayer.value = i;
      u.uHaze.value = haze;
      u.uScan.value = scan;
      u.uScanPitch.value = size / 9;
      u.uBreakup.value = breakup;
      u.uFog.value = fog;
      u.uOpacity.value = opacity;
      u.uNoise.value = 1.4 / size;
    });
  });
  const hgt = size / pc.capFrac;
  const wid = hgt * pc.aspect;
  const dz = depth ?? size * 0.5;
  return (
    <group {...group}>
      <mesh geometry={PLANE} material={mats[1]} position={[0, 0, -dz]} scale={[wid * 1.06, hgt * 1.1, 1]} renderOrder={renderOrder} userData={{silKeep: true}} />
      <mesh geometry={PLANE} material={mats[0]} scale={[wid, hgt, 1]} renderOrder={renderOrder} userData={{silKeep: true}} />
      <mesh geometry={PLANE} material={mats[2]} position={[0, 0, dz]} scale={[wid * 0.97, hgt * 0.94, 1]} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};
