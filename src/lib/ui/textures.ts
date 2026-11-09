/**
 * Y2K UI kit — CanvasTextures for 3D, drawn from the SAME display lists as the 2D components (so they look identical).
 * Textures are cached by content key (LRU, ~400 entries) and only redrawn when the content changes.
 * Canvas text uses system fonts by CSS name (drawn synchronously). Default pixel ratio 2 (crisp at 1080p); use pr 3-4 for
 * full-screen hero close-ups.
 *
 * API
 *   makeDrawingTexture(key, () => Drawing, {pr?, anisotropy?}) -> THREE.CanvasTexture   generic (any display list)
 *   makeDialogTexture(spec: DialogSpec, {pr?}) -> THREE.CanvasTexture
 *   useDialogTexture(spec, {pr?}) -> THREE.CanvasTexture             (memoised hook)
 *   makeBannerTexture(variant, {label?, sub?, frame, w?, h?}, {pr?}) -> THREE.CanvasTexture   (GIF-tick quantised)
 *   makeStampTexture({text?, color?, seed?, size?}, {pr?}) -> THREE.CanvasTexture
 *   makeWindowTexture(spec: WindowSpec, {pr?}) -> THREE.CanvasTexture   custom window (body = display-list prims)
 *   texSize(tex) -> {w, h, aspect}   size in px of the drawing a texture was made from (tex.userData)
 *
 * Usage
 *   const tex = useDialogTexture({kind: 'error', title: 'OmniStore', message: 'Error 402', buttons: ['OK']});
 *   <mesh><planeGeometry args={[1.6, 1.6 / texSize(tex).aspect]}/><meshBasicMaterial map={tex} transparent/></mesh>
 */
import {useMemo} from 'react';
import * as THREE from 'three';
import type {Drawing} from './dl';
import {renderDLCanvas} from './dl';
import {DialogSpec, dialogDL, dialogSpecKey, windowDL, WindowSpec} from './widgets';
import {BannerOpts, BannerVariant, bannerDL, bannerTick} from './ads';
import {StampOpts, stampDL} from './stampArt';

export type TexOpts = {pr?: number; anisotropy?: number};

const cache = new Map<string, THREE.CanvasTexture>();
const MAX = 400;

export const makeDrawingTexture = (key: string, make: () => Drawing, o: TexOpts = {}): THREE.CanvasTexture => {
  const pr = o.pr ?? 2;
  const k = `${key}|pr${pr}`;
  const hit = cache.get(k);
  if (hit) {
    cache.delete(k);
    cache.set(k, hit);
    return hit;
  }
  const d = make();
  const canvas = renderDLCanvas(d.dl, d.w, d.h, pr);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = o.anisotropy ?? 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.userData = {w: d.w, h: d.h, aspect: d.w / d.h, key: k};
  t.needsUpdate = true;
  cache.set(k, t);
  if (cache.size > MAX) {
    const first = cache.keys().next().value as string;
    const old = cache.get(first);
    cache.delete(first);
    old?.dispose();
  }
  return t;
};

export const texSize = (tex: THREE.Texture): {w: number; h: number; aspect: number} => {
  const u = tex.userData as {w?: number; h?: number; aspect?: number};
  const img = tex.image as {width?: number; height?: number} | undefined;
  const w = u.w ?? img?.width ?? 1, h = u.h ?? img?.height ?? 1;
  return {w, h, aspect: u.aspect ?? w / h};
};

export const makeDialogTexture = (spec: DialogSpec, o: TexOpts = {}) =>
  makeDrawingTexture(`dlg:${dialogSpecKey(spec)}`, () => dialogDL(spec, {shadow: false}), o);

export const useDialogTexture = (spec: DialogSpec, o: TexOpts = {}) => {
  const key = dialogSpecKey(spec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => makeDialogTexture(spec, o), [key, o.pr, o.anisotropy]);
};

export const makeBannerTexture = (variant: BannerVariant, b: BannerOpts, o: TexOpts = {}) => {
  const tick = bannerTick(b.frame);
  return makeDrawingTexture(
    `ban:${variant}|${b.label ?? ''}|${b.sub ?? ''}|${b.w ?? 468}x${b.h ?? 60}|${tick}`,
    () => bannerDL(variant, {...b, frame: tick * 3}),
    o,
  );
};

export const makeStampTexture = (s: StampOpts = {}, o: TexOpts = {}) =>
  makeDrawingTexture(`stamp:${s.text ?? 'CANCELLED'}|${s.color ?? ''}|${s.seed ?? 1}|${s.size ?? 44}|${s.fontFamily ?? ''}`, () => stampDL(s), {pr: 3, ...o});

export const makeWindowTexture = (spec: WindowSpec, o: TexOpts = {}) => makeDrawingTexture(`win:${JSON.stringify(spec)}`, () => windowDL(spec, {shadow: false}), o);
