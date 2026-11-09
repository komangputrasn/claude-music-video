/**
 * <PaperBook> — the paper *1984* of the TERMS cut (DESIGN-silhouette §3, §4 Final): a physical book he actually owns.
 * Closed it is a PALE BONE RECTANGLE (flat, unlit, under bloom — not glowing). Opened, its pages are the BRIGHTEST WHITE
 * in the frame (HDR bone that blooms), with faint printed lines and "1984" on the title page.
 *
 *   <PaperBook open?={0} brightness?={2.6} cover?={0.66} halo?={0.6} title?="1984" {...group}/>
 *   <HeldPaperBook open? brightness? cover? halo?/>            // <SilGuy rightHand={…} pose={guyHoldUp(p, t)}/>
 *
 *   open        0 closed … 1 front cover swung fully open (~170° about the spine); the pages brighten as it opens.
 *   brightness  HDR multiplier of the open pages (2.6 ≈ 2× the bloom threshold: the brightest white in the film).
 *               Keep every other bone surface in the shot below ~1.0 so the pages win.
 *   cover       flat brightness of the closed cover/edges (0.66 = pale bone, safely under bloom). Use ~0.4 in dim rooms.
 *   halo        extra soft bone glow around the open pages (0 = bloom only).
 *   title       big word on the title page.
 * The whole book is userData.silKeep: it stays pale inside <SilGuy>/<Silhouette> (it is NOT a silhouette).
 *
 * Frame (same as the Y2K Book1984): origin = BASE CENTRE (bottom edge, middle of the thickness), standing upright, front
 * cover facing +Z, spine on the left (−X). 0.108 × 0.178 × 0.022 m. PAPERBOOK = {size, coverCenter, pageCenter, spineX}.
 * pageCenter = centre of the opened spread's right page (title page) — use it for a camera target / glow.
 *
 * <HeldPaperBook>: the Y2K HeldBook grip — the fist holds the book's bottom edge; at guyHoldUp(1) (trophy pose) the cover
 * (and, when open, the pages) face the camera in front of him. guyHoldUp(0) = the book across his chest.
 *   <SilGuy pose={guyHoldUp(ramp(f, a, a + 12), t)} hood={0} rightHand={<HeldPaperBook open={ramp(f, a + 14, a + 26)}/>}/>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {GREYS, S, SFONTS} from '../palette';
import {GRIP, GlowBillboard, GroupProps, V3, clamp01, hash, smooth01, useCanvasTex} from './shared';

const W = 0.108, H = 0.178, T = 0.022, CT = 0.0014;

export const PAPERBOOK = {
  size: [W, H, T] as V3,
  /** centre of the front cover (closed) */
  coverCenter: [0, H / 2, T / 2] as V3,
  /** centre of the title page when open (book-local) */
  pageCenter: [0.0012, H / 2, T / 2 - CT] as V3,
  spineX: -W / 2,
};

/** printed text lines (grey on white) + optional big title. Lines are kept dark enough to survive the HDR (~0.35). */
const drawPage = (ctx: CanvasRenderingContext2D, w: number, h: number, title: string | null, seed: number) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const mx = w * 0.13, top = h * 0.09;
  if (title) {
    ctx.fillStyle = 'rgb(70,72,76)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(w * 0.24)}px ${SFONTS.futura}`;
    (ctx as unknown as {letterSpacing: string}).letterSpacing = `${Math.round(w * 0.02)}px`;
    ctx.fillText(title, w / 2, h * 0.3);
    ctx.font = `${Math.round(w * 0.045)}px ${SFONTS.futura}`;
    (ctx as unknown as {letterSpacing: string}).letterSpacing = `${Math.round(w * 0.012)}px`;
    ctx.fillStyle = 'rgb(110,112,116)';
    ctx.fillText('A NOVEL', w / 2, h * 0.41);
    ctx.fillRect(w * 0.42, h * 0.45, w * 0.16, Math.max(1, h * 0.002));
    // a few lines lower on the page (the imprint / epigraph)
    ctx.fillStyle = 'rgb(150,152,156)';
    for (let i = 0; i < 4; i++) {
      const lw = (w - 2 * mx) * (0.35 + 0.3 * hash(i, 1, seed));
      ctx.fillRect(w / 2 - lw / 2, h * (0.72 + i * 0.035), lw, Math.max(1.5, h * 0.006));
    }
    return;
  }
  // body text: rows of word-blocks
  ctx.fillStyle = 'rgb(120,122,126)';
  const lh = h * 0.034;
  let y = top;
  let row = 0;
  while (y < h * 0.92) {
    let x = mx + (row % 9 === 0 ? w * 0.05 : 0);
    const end = row % 9 === 8 ? mx + (w - 2 * mx) * (0.3 + 0.4 * hash(row, 2, seed)) : w - mx;
    let k = 0;
    while (x < end) {
      const ww = w * (0.025 + 0.075 * hash(row, k + 10, seed));
      ctx.fillRect(x, y, Math.min(ww, end - x), Math.max(1.5, lh * 0.32));
      x += ww + w * 0.018;
      k++;
    }
    y += lh;
    row++;
  }
};

/** closed cover: pale, with a faint debossed 1984 */
const drawCover = (ctx: CanvasRenderingContext2D, w: number, h: number, title: string) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.09)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(w * 0.27)}px ${SFONTS.futura}`;
  (ctx as unknown as {letterSpacing: string}).letterSpacing = `${Math.round(w * 0.02)}px`;
  ctx.fillText(title, w / 2, h * 0.36);
  ctx.fillRect(w * 0.2, h * 0.5, w * 0.6, Math.max(2, h * 0.004));
};

let bookGeo: null | Record<string, THREE.BufferGeometry> = null;
const getGeo = () => {
  if (bookGeo) return bookGeo;
  const block = new THREE.BoxGeometry(W - CT - 0.002, H - 0.004, T - 2 * CT);
  const cover = new THREE.BoxGeometry(W, H, CT);
  const spine = new THREE.BoxGeometry(CT, H, T);
  bookGeo = {block, cover, spine};
  return bookGeo;
};

export type PaperBookProps = GroupProps & {
  open?: number;
  brightness?: number;
  cover?: number;
  halo?: number;
  title?: string;
};

export const PaperBook: React.FC<PaperBookProps> = ({open = 0, brightness = 2.6, cover = 0.66, halo = 0.6, title = '1984', ...group}) => {
  const g = getGeo();
  const titleTex = useCanvasTex(384, Math.round((384 * H) / W), (ctx, w, h) => drawPage(ctx, w, h, title, 3), [title]);
  const leftTex = useCanvasTex(384, Math.round((384 * H) / W), (ctx, w, h) => drawPage(ctx, w, h, null, 5), []);
  const coverTex = useCanvasTex(256, Math.round((256 * H) / W), (ctx, w, h) => drawCover(ctx, w, h, title), [title]);
  const mats = useMemo(() => {
    const flat = (map?: THREE.Texture, fog = true) => new THREE.MeshBasicMaterial({color: '#ffffff', map: map ?? null, fog});
    const titlePage = flat(titleTex, false);
    const leftPage = flat(leftTex, false);
    const coverOut = flat(coverTex);
    const edge = flat();
    // box face order: +x, −x, +y, −y, +z, −z
    return {
      titlePage, leftPage, coverOut, edge,
      block: [edge, edge, edge, edge, titlePage, edge],
      front: [edge, edge, edge, edge, coverOut, leftPage],
      back: [edge, edge, edge, edge, edge, edge],
    };
  }, [titleTex, leftTex, coverTex]);
  useLayoutEffect(() => () => {
    for (const m of [mats.titlePage, mats.leftPage, mats.coverOut, mats.edge]) m.dispose();
  }, [mats]);
  const o = smooth01(clamp01(open));
  useLayoutEffect(() => {
    const bone = new THREE.Color(S.bone);
    const page = cover + (brightness - cover) * o;
    mats.titlePage.color.copy(bone).multiplyScalar(page);
    mats.leftPage.color.copy(bone).multiplyScalar(page * 0.96);
    mats.coverOut.color.copy(bone).multiplyScalar(cover);
    mats.edge.color.set(GREYS.g8).multiplyScalar(cover * 1.05);
  });
  const ang = -Math.PI * 0.94 * o;
  return (
    <group {...group}>
      <group userData={{silKeep: true}}>
        <group position={[0, H / 2, 0]}>
          <mesh geometry={g.block} material={mats.block} position={[0.0012, 0, 0]} />
          <mesh geometry={g.cover} material={mats.back} position={[0, 0, -T / 2 + CT / 2]} />
          <mesh geometry={g.spine} material={mats.edge} position={[-W / 2 + CT / 2, 0, 0]} />
          <group position={[-W / 2, 0, T / 2 - CT / 2]} rotation={[0, ang, 0]}>
            <mesh geometry={g.cover} material={mats.front} position={[W / 2, 0, 0]} />
          </group>
        </group>
        {halo > 0 && o > 0.01 ? (
          <GlowBillboard position={[-0.01, H / 2, T / 2 + 0.02]} color={S.bone} intensity={halo * o * 0.55} size={0.2} falloff={2.2} />
        ) : null}
      </group>
    </group>
  );
};

export type HeldPaperBookProps = PaperBookProps;
/** Paper 1984 for guyHoldUp(): held by its bottom edge; cover/pages toward the camera at guyHoldUp(1). */
export const HeldPaperBook: React.FC<HeldPaperBookProps> = (props) => (
  <group position={[0, 0.04, 0]} rotation={GRIP.book}>
    <PaperBook {...props} />
  </group>
);

export default PaperBook;
