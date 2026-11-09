/**
 * <TermsScroll> — monumental terms of service scrolling up a facade like film credits (DESIGN-silhouette §2.5, Intro).
 * Numbered clauses in mono ("14.3(b) LESSEE ACKNOWLEDGES THAT SLEEP IS PROVIDED AS A SERVICE…"), section headers,
 * hanging indents. One canvas texture (drawn once per seed/layout) scrolled by texture offset in the shader — no
 * per-frame redraw. Fades out at the top and bottom of the facade.
 *
 *   <TermsScroll width?={30} height?={80} speed?={1.2} time?={t} fontSize?={0.9} color?={S.bone} intensity?={1.0}
 *                opacity?={1} seed?={0} columns?={1} align?="left" fade?={0.14} blend?="add" fog?={0.85}
 *                lineSpacing?={1.55} renderOrder? {...group}/>
 *
 *   width, height  facade area covered (metres). Origin: BOTTOM CENTRE, faces +Z (put it 0.05 m in front of a facade).
 *   speed          metres per second the text rises (credits pace: ~1–2 m/s on a skyscraper).
 *   time           seconds (song time or scene time) — the scroll position is speed × time.
 *   fontSize       em size of the text in metres (line pitch = fontSize × lineSpacing). 0.6–1.5 m reads at city scale.
 *   color          S.bone (default; terms as projected light) or S.authRed (control). Nothing else.
 *   intensity      HDR multiplier (bone > ~1.1 blooms; keep ~0.7–1.0 on big facades so it doesn't wash silhouettes).
 *   seed           which clauses / numbering (tenureClauses(seed)); columns get seed+column.
 *   columns        1–3 text columns (contract layout on very wide facades).
 *   blend          'add' (light projected on a dark facade, default) | 'normal' (opaque paint-like text on bright walls).
 *   fog            0..1 how much stage fog dims it (default 0.85).
 *
 * The texture period is ~60–70 lines; it repeats seamlessly (with a blank section gap at the seam).
 * Emissive mesh is userData.silKeep.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {fontCss, makeCanvas, drawTracked, canvasTexture, fogUniforms, TENURE_GLSL, TENURE_FOG_GLSL, BASIC_VERT} from './shared';
import {tenureClauseItems} from './terms';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

const MAX_TEX_H = 4096;
const MAX_TEX_W = 2048;

type Row = {kind: 'clause' | 'cont' | 'head' | 'blank'; num?: string; text: string};

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxW: number) => {
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
};

/** Build the rows of one text column (until `maxRows`, ending on a clause boundary). */
const columnRows = (ctx: CanvasRenderingContext2D, seed: number | string, textW: number, maxRows: number) => {
  const items = tenureClauseItems(seed, 60);
  const rows: Row[] = [];
  for (const it of items) {
    const block: Row[] = [];
    if (it.sectionTitle) {
      if (rows.length) block.push({kind: 'blank', text: ''});
      block.push({kind: 'head', text: `§ ${it.section}  ${it.sectionTitle}`});
    }
    const lines = wrap(ctx, it.text, textW);
    lines.forEach((l, i) => block.push({kind: i === 0 ? 'clause' : 'cont', num: i === 0 ? it.num : undefined, text: l}));
    block.push({kind: 'blank', text: ''});
    if (rows.length + block.length > maxRows) break;
    rows.push(...block);
  }
  while (rows.length < maxRows) rows.push({kind: 'blank', text: ''});
  return rows;
};

export type TermsLayout = {canvas: HTMLCanvasElement; periodM: number};

/** Draw the terms canvas (white on black mask). widthM/fontSize in metres. */
export const drawTermsCanvas = (o: {widthM: number; fontSize: number; seed: number | string; columns: number; lineSpacing: number; align: 'left' | 'center'}): TermsLayout => {
  let pxPerEm = 46;
  if ((o.widthM / o.fontSize) * pxPerEm > MAX_TEX_W) pxPerEm = (MAX_TEX_W * o.fontSize) / o.widthM;
  const W = Math.max(64, Math.round((o.widthM / o.fontSize) * pxPerEm));
  const linePx = pxPerEm * o.lineSpacing;
  const rowsN = Math.max(24, Math.floor(MAX_TEX_H / linePx));
  const H = Math.round(rowsN * linePx);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const cols = Math.max(1, Math.min(3, Math.round(o.columns)));
  const gapPx = pxPerEm * 2.2;
  const colW = (W - gapPx * (cols - 1)) / cols;
  ctx.font = fontCss('mono', pxPerEm);
  const charW = ctx.measureText('M').width;
  const gutter = charW * 9;
  ctx.textBaseline = 'alphabetic';
  for (let k = 0; k < cols; k++) {
    const x0 = k * (colW + gapPx);
    ctx.font = fontCss('mono', pxPerEm);
    const rows = columnRows(ctx, `${o.seed}-${k}`, colW - gutter, rowsN);
    rows.forEach((r, i) => {
      const base = (i + 0.78) * linePx;
      ctx.shadowColor = 'rgba(255,255,255,0.55)';
      ctx.shadowBlur = pxPerEm * 0.12;
      if (r.kind === 'head') {
        ctx.font = fontCss('mono', pxPerEm, 700);
        ctx.fillStyle = 'rgb(255,255,255)';
        if (o.align === 'center') drawTracked(ctx, r.text, x0 + colW / 2, base, pxPerEm * 0.3, 'center');
        else drawTracked(ctx, r.text, x0, base, pxPerEm * 0.3);
      } else if (r.kind !== 'blank') {
        ctx.font = fontCss('mono', pxPerEm);
        if (o.align === 'center') {
          const t = r.num ? `${r.num}  ${r.text}` : r.text;
          ctx.fillStyle = 'rgb(225,225,225)';
          drawTracked(ctx, t, x0 + colW / 2, base, 0, 'center');
        } else {
          if (r.num) {
            ctx.fillStyle = 'rgb(150,150,150)';
            drawTracked(ctx, r.num, x0, base, 0);
          }
          ctx.fillStyle = 'rgb(232,232,232)';
          drawTracked(ctx, r.text, x0 + gutter, base, 0);
        }
      }
    });
  }
  ctx.shadowBlur = 0;
  return {canvas: c, periodM: (H / pxPerEm) * o.fontSize};
};

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uRep, uScroll, uFade, uOpacity, uFog, uNormal;
varying vec2 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
${TENURE_GLSL}
${TENURE_FOG_GLSL}
void main() {
  float v = vUv.y * uRep - uScroll;
  float m = texture2D(uMap, vec2(vUv.x, v)).r;
  float f = smoothstep(0.0, uFade, vUv.y) * smoothstep(0.0, uFade * 0.8, 1.0 - vUv.y);
  float a = m * f * uOpacity * (1.0 - tFogF() * uFog);
  if (a < 0.002) discard;
  if (uNormal > 0.5) {
    gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
  } else {
    gl_FragColor = vec4(uColor * a, 1.0);
  }
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type TermsScrollProps = GroupProps & {
  width?: number;
  height?: number;
  speed?: number;
  time?: number;
  fontSize?: number;
  color?: string;
  intensity?: number;
  opacity?: number;
  seed?: number | string;
  columns?: number;
  align?: 'left' | 'center';
  fade?: number;
  blend?: 'add' | 'normal';
  fog?: number;
  lineSpacing?: number;
  renderOrder?: number;
};

const PLANE = new THREE.PlaneGeometry(1, 1);

export const TermsScroll: React.FC<TermsScrollProps> = ({
  width = 30, height = 80, speed = 1.2, time = 0, fontSize = 0.9, color = S.bone, intensity = 1.0, opacity = 1, seed = 0,
  columns = 1, align = 'left', fade = 0.14, blend = 'add', fog = 0.85, lineSpacing = 1.55, renderOrder, ...group
}) => {
  const tex = useMemo(() => {
    const L = drawTermsCanvas({widthM: width, fontSize, seed, columns, lineSpacing, align});
    return {t: canvasTexture(L.canvas, {srgb: false, repeatY: true}), periodM: L.periodM};
  }, [width, fontSize, seed, columns, lineSpacing, align]);
  useLayoutEffect(() => () => tex.t.dispose(), [tex]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uMap: {value: null},
          uColor: {value: new THREE.Color()},
          uRep: {value: 1},
          uScroll: {value: 0},
          uFade: {value: 0.14},
          uOpacity: {value: 1},
          uFog: {value: 0.85},
          uNormal: {value: 0},
        },
        vertexShader: BASIC_VERT,
        fragmentShader: FRAG,
        fog: true,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uMap.value = tex.t;
    u.uColor.value.set(color).multiplyScalar(intensity);
    u.uRep.value = height / tex.periodM;
    // keep the scroll value small (precision): wrap it to the texture period
    u.uScroll.value = (((speed * time) / tex.periodM) % 1 + 1) % 1;
    u.uFade.value = fade;
    u.uOpacity.value = opacity;
    u.uFog.value = fog;
    u.uNormal.value = blend === 'normal' ? 1 : 0;
    const add = blend !== 'normal';
    if (mat.blending !== (add ? THREE.AdditiveBlending : THREE.NormalBlending)) {
      mat.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending;
      mat.needsUpdate = true;
    }
  });
  return (
    <group {...group}>
      <mesh geometry={PLANE} material={mat} position={[0, height / 2, 0]} scale={[width, height, 1]} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};
