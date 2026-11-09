/**
 * Book1984 — a physical paperback of *1984*: original plain red/cream cover (big "1984", "GEORGE ORWELL"), lettered spine,
 * cream page block with page-edge lines, and a title page revealed when the cover opens.
 *
 * <Book1984 open? {...groupProps}/>
 *   open  0 closed .. 1 front cover swung fully open (~170°) — the title page shows on the right
 * Origin: BASE CENTRE (bottom edge, middle of the thickness). Stands upright, front cover facing +Z, spine on the left (-X).
 * Size 0.108 × 0.178 × 0.022 m. BOOK1984: {size, coverCenter, spineX}.
 *
 * Example (held up, triumphant):
 *   <Book1984 position={[0.1, 1.35, 0.25]} rotation={[0, -0.3, 0.05]} scale={1.2} />
 *   <Book1984 open={ramp(f, 10, 30)} rotation={[-Math.PI / 2, 0, 0]} />   // lying on a table, opening
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {FONTS} from '../palette';
import {rand} from '../time';
import {GroupProps, Ink, PROP_INK, clamp01, makeGlossMat, smooth01, useCanvasTexture} from './Padlock';

const W = 0.108, H = 0.178, T = 0.022, CT = 0.0013; // cover thickness
const RED = '#C42A1E', CREAM = '#F3E7CB', INK = '#2A1A14';

export const BOOK1984 = {
  size: [W, H, T] as [number, number, number],
  /** centre of the front cover (closed) */
  coverCenter: [0, H / 2, T / 2] as [number, number, number],
  spineX: -W / 2,
};

const drawCover = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  // paper texture flecks
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(120,90,50,${0.04 + rand(`cf${i}`) * 0.06})`;
    ctx.fillRect(rand(`cfx${i}`) * w, rand(`cfy${i}`) * h, 2, 2);
  }
  // red field
  const top = h * 0.07, fh = h * 0.56, m = w * 0.07;
  ctx.fillStyle = RED;
  ctx.fillRect(m, top, w - 2 * m, fh);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 4;
  ctx.strokeRect(m + 14, top + 14, w - 2 * m - 28, fh - 28);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m + 22, top + 22, w - 2 * m - 44, fh - 44);
  // "1984"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${w * 0.29}px ${FONTS.serif}`;
  ctx.fillStyle = 'rgba(60,8,6,0.55)';
  ctx.fillText('1984', w / 2 + 6, top + fh * 0.5 + 7);
  ctx.fillStyle = CREAM;
  ctx.fillText('1984', w / 2, top + fh * 0.5);
  // small rule + stars
  ctx.font = `bold ${w * 0.05}px ${FONTS.serif}`;
  ctx.fillText('★  A NOVEL  ★', w / 2, top + fh * 0.82);
  // author
  ctx.fillStyle = RED;
  ctx.font = `bold ${w * 0.085}px ${FONTS.serif}`;
  const author = 'GEORGE ORWELL';
  // letterspaced
  const spacing = w * 0.012;
  const chars = author.split('');
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = w / 2 - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, top + fh + h * 0.11);
    x += widths[i] + spacing;
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.fillRect(w * 0.3, top + fh + h * 0.17, w * 0.4, 3);
  ctx.font = `italic ${w * 0.05}px ${FONTS.serif}`;
  ctx.fillText('a classic of the twentieth century', w / 2, top + fh + h * 0.22);
  // publisher mark (invented)
  ctx.font = `bold ${w * 0.04}px ${FONTS.verdana}`;
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.94, w * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.fillText('P', w / 2, h * 0.942);
  // wear: corner scuffs
  ctx.fillStyle = 'rgba(255,250,235,0.35)';
  ctx.fillRect(w - 10, 0, 10, h);
  ctx.fillRect(0, h - 8, w, 8);
};

const drawSpine = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${w * 0.5}px ${FONTS.serif}`;
  ctx.fillText('1984', -h * 0.22, 0);
  ctx.font = `bold ${w * 0.32}px ${FONTS.serif}`;
  ctx.fillText('GEORGE ORWELL', h * 0.14, 0);
  ctx.restore();
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, h * 0.04, w, 3);
  ctx.fillRect(0, h * 0.96, w, 3);
};

const drawBack = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, w, h * 0.06);
  ctx.fillRect(0, h * 0.94, w, h * 0.06);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = `bold ${w * 0.06}px ${FONTS.serif}`;
  ctx.fillText('NINETEEN EIGHTY-FOUR', w / 2, h * 0.14);
  ctx.fillStyle = 'rgba(42,26,20,0.55)';
  for (let i = 0; i < 16; i++) ctx.fillRect(w * 0.12, h * 0.2 + i * h * 0.03, w * (0.62 + rand(`bl${i}`) * 0.14), h * 0.011);
  // barcode
  ctx.fillStyle = '#fff';
  ctx.fillRect(w * 0.55, h * 0.78, w * 0.33, h * 0.11);
  ctx.fillStyle = INK;
  for (let i = 0; i < 34; i++) if (rand(`bc${i}`) > 0.35) ctx.fillRect(w * 0.57 + i * w * 0.0085, h * 0.795, w * 0.006, h * 0.07);
  ctx.font = `bold ${w * 0.045}px ${FONTS.verdana}`;
  ctx.fillText('$7.99', w * 0.25, h * 0.86);
};

const drawTitlePage = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#FBF5E6';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = `bold ${w * 0.075}px ${FONTS.serif}`;
  ctx.fillText('NINETEEN', w / 2, h * 0.2);
  ctx.fillText('EIGHTY-FOUR', w / 2, h * 0.27);
  ctx.font = `italic ${w * 0.05}px ${FONTS.serif}`;
  ctx.fillText('a novel by', w / 2, h * 0.36);
  ctx.font = `bold ${w * 0.06}px ${FONTS.serif}`;
  ctx.fillText('GEORGE ORWELL', w / 2, h * 0.42);
  ctx.fillRect(w * 0.42, h * 0.47, w * 0.16, 2);
  ctx.font = `bold ${w * 0.045}px ${FONTS.serif}`;
  ctx.fillText('PART ONE', w / 2, h * 0.58);
  ctx.fillStyle = 'rgba(42,26,20,0.5)';
  for (let i = 0; i < 9; i++) ctx.fillRect(w * 0.14, h * 0.64 + i * h * 0.031, w * (0.6 + rand(`tl${i}`) * 0.12) + (i === 8 ? -w * 0.3 : 0), h * 0.01);
  // handwritten ex-libris
  ctx.fillStyle = '#2B3F9E';
  ctx.font = `${w * 0.06}px "Marker Felt", ${FONTS.comic}`;
  ctx.save();
  ctx.translate(w * 0.7, h * 0.08);
  ctx.rotate(-0.08);
  ctx.fillText('mine. paid once.', 0, 0);
  ctx.restore();
};

/** page-edge lines: vertical (for the fore-edge, ±X faces) or horizontal (top/bottom, ±Y faces) */
const drawEdges = (vertical: boolean) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#F1E6CC';
  ctx.fillRect(0, 0, w, h);
  const n = vertical ? w : h;
  for (let i = 0; i < n; i += 3) {
    ctx.fillStyle = `rgba(150,120,80,${0.12 + rand(`pe${i}`) * 0.18})`;
    if (vertical) ctx.fillRect(i, 0, 1, h);
    else ctx.fillRect(0, i, w, 1);
  }
};
const drawEdgesV = drawEdges(true);
const drawEdgesH = drawEdges(false);

let bGeo: null | Record<string, THREE.BufferGeometry> = null;
const bookGeo = () => {
  if (bGeo) return bGeo;
  bGeo = {
    cover: new THREE.BoxGeometry(W, H, CT),
    spine: new THREE.BoxGeometry(CT, H, T),
    block: new THREE.BoxGeometry(W - 0.004, H - 0.005, T - 2 * CT),
  };
  return bGeo;
};

export type Book1984Props = GroupProps & {
  open?: number;
  outline?: number;
};

export const Book1984: React.FC<Book1984Props> = ({open = 0, outline = PROP_INK.thin, ...rest}) => {
  const g = bookGeo();
  const coverTex = useCanvasTexture(512, Math.round((512 * H) / W), drawCover, []);
  const spineTex = useCanvasTexture(96, 800, drawSpine, []);
  const backTex = useCanvasTexture(256, Math.round((256 * H) / W), drawBack, []);
  const titleTex = useCanvasTexture(256, Math.round((256 * H) / W), drawTitlePage, []);
  const edgeTex = useCanvasTexture(256, 32, drawEdgesV, []);
  const edgeHTex = useCanvasTexture(32, 256, drawEdgesH, []);
  const mats = useMemo(() => {
    const red = makeGlossMat(RED, {spec: 0.15, edge: 0.97});
    const inside = makeGlossMat('#EFE3C6', {spec: 0});
    const edges = makeGlossMat('#ffffff', {map: edgeTex, spec: 0});
    const edgesH = makeGlossMat('#ffffff', {map: edgeHTex, spec: 0});
    // box face order: +x, -x, +y, -y, +z, -z
    return {
      front: [red, red, red, red, makeGlossMat('#ffffff', {map: coverTex, spec: 0.22, edge: 0.975}), inside],
      back: [red, red, red, red, inside, makeGlossMat('#ffffff', {map: backTex, spec: 0.2, edge: 0.975})],
      spine: [red, makeGlossMat('#ffffff', {map: spineTex, spec: 0.2, edge: 0.975}), red, red, red, red],
      block: [edges, edges, edgesH, edgesH, makeGlossMat('#ffffff', {map: titleTex, spec: 0}), inside],
    };
  }, [coverTex, spineTex, backTex, titleTex, edgeTex, edgeHTex]);
  const ang = -Math.PI * 0.94 * smooth01(clamp01(open));
  return (
    <group {...rest}>
      <group position={[0, H / 2, 0]}>
        <Ink geometry={g.block} material={mats.block} position={[0.0012, 0, 0]} outline={outline * 0.7} />
        <Ink geometry={g.cover} material={mats.back} position={[0, 0, -T / 2 + CT / 2]} outline={outline} />
        <Ink geometry={g.spine} material={mats.spine} position={[-W / 2 + CT / 2, 0, 0]} outline={outline} />
        {/* front cover hinged at the spine */}
        <group position={[-W / 2, 0, T / 2 - CT / 2]} rotation={[0, ang, 0]}>
          <Ink geometry={g.cover} material={mats.front} position={[W / 2, 0, 0]} outline={outline} />
        </group>
      </group>
    </group>
  );
};

export default Book1984;
