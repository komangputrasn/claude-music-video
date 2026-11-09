/**
 * EReader — slim grey "e-Reader" with a 600×800 e-ink screen (canvas), side page-turn bars and a tiny 5-way pad.
 * The page can break apart into pixels that fly off the screen (`dissolve`) and a system banner can pop over it.
 *
 * <EReader title? author? page? dissolve? banner? particles? {...groupProps}/>
 *   title, author  header + chapter heading (default '1984' / 'George Orwell')
 *   page           lines of body text (auto word-wrapped). Default: a short original filler passage.
 *   dissolve       0..1 the page text breaks into pixel blocks top→bottom; blocks fly out of the screen as 3D pixels
 *   banner         e.g. 'This title is no longer available' — drawn as a bold e-ink dialog box over the page
 *   particles      emit 3D pixel particles while dissolving (default true)
 * Origin: CENTRE of the device; screen faces +Z, upright (+Y). Size 0.122 × 0.172 × 0.0095 m.
 * EREADER: {size, screenCenter, screenSize} — screenCenter is in device space (useful as a vortex/particle origin).
 *
 * Example:
 *   <EReader position={[0, 1.1, 0.3]} rotation={[-0.4, 0, 0]} dissolve={ramp(f, 30, 75)} banner={f > 80 ? 'This title is no longer available' : undefined} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {FONTS} from '../palette';
import {rand} from '../time';
import {GroupProps, Ink, PROP_INK, clamp01, glossMat, makeGlossMat, rbox, rrectShape, useCanvasTexture} from './Padlock';

const W = 0.122, H = 0.172, D = 0.0095;
const SW = 0.09, SH = 0.12, SY = 0.013;
const CW = 600, CH = 800, BLOCK = 20;
const COLS = CW / BLOCK, ROWS = CH / BLOCK;

export const EREADER = {
  size: [W, H, D] as [number, number, number],
  screenCenter: [0, SY, D / 2 + 0.0006] as [number, number, number],
  screenSize: [SW, SH] as [number, number],
};

const DEFAULT_PAGE = [
  'The posters were on every wall, and the eyes in them followed him all the way down the stairs.',
  'He told himself he did not mind. He owned very little, and what he owned he had paid for, twice.',
  'Somewhere a clock struck the hour, and somewhere a server decided what he was allowed to remember.',
];

/** erase threshold for a block: top rows go first, with noise */
const blockThr = (c: number, r: number) => 0.04 + 0.62 * (r / ROWS) + 0.3 * rand(`er-${c}-${r}`);

const PAPER = '#E4E3DA';

const drawPage = (
  ctx: CanvasRenderingContext2D, w: number, h: number, title: string, author: string, page: string[], dissolve: number, banner?: string,
) => {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  // e-ink speckle
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(80,80,70,${0.05 + rand(`sp${i}`) * 0.06})`;
    ctx.fillRect(rand(`spx${i}`) * w, rand(`spy${i}`) * h, 2, 2);
  }
  const ink = '#1F1F1C';
  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  // header
  ctx.font = `14px ${FONTS.verdana}`;
  ctx.fillStyle = '#55554E';
  ctx.fillText(`${title} — ${author}`.slice(0, 48), 30, 34);
  // battery
  ctx.strokeStyle = '#55554E';
  ctx.lineWidth = 2;
  ctx.strokeRect(w - 64, 20, 30, 15);
  ctx.fillStyle = '#55554E';
  ctx.fillRect(w - 61, 23, 18, 9);
  ctx.fillRect(w - 34, 24, 3, 7);
  ctx.fillRect(30, 46, w - 60, 1);
  // chapter heading
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `bold 64px ${FONTS.serif}`;
  ctx.fillText(title, w / 2, 140);
  ctx.font = `italic 28px ${FONTS.serif}`;
  ctx.fillText(author, w / 2, 182);
  ctx.font = `bold 20px ${FONTS.serif}`;
  ctx.fillText('— PART ONE —', w / 2, 236);
  ctx.textAlign = 'left';
  // body text (wrapped)
  ctx.font = `25px ${FONTS.serif}`;
  const maxW = w - 70;
  let y = 290;
  for (const para of page) {
    const words = para.split(/\s+/);
    let line = '';
    let first = true;
    for (const wd of words) {
      const test = line ? `${line} ${wd}` : wd;
      if (ctx.measureText(test).width > maxW - (first ? 30 : 0) && line) {
        ctx.fillText(line, first ? 65 : 35, y);
        first = false;
        line = wd;
        y += 36;
      } else line = test;
      if (y > h - 90) break;
    }
    if (y > h - 90) break;
    ctx.fillText(line, first ? 65 : 35, y);
    y += 50;
  }
  // footer
  ctx.fillStyle = '#55554E';
  ctx.font = `14px ${FONTS.verdana}`;
  ctx.fillText('Location 1 of 3,840', 30, h - 26);
  ctx.textAlign = 'right';
  ctx.fillText('0%', w - 30, h - 26);
  ctx.textAlign = 'left';
  ctx.fillRect(30, h - 48, w - 60, 2);
  ctx.fillRect(30, h - 52, 18, 10);

  // dissolve into blocks
  if (dissolve > 0.001) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const thr = blockThr(c, r);
        if (dissolve >= thr) {
          ctx.fillStyle = PAPER;
          ctx.fillRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
        } else if (dissolve > thr - 0.1) {
          // about to go: block turns into a solid "pixel" (dark or mid grey), slightly shifted
          const k = rand(`gl-${c}-${r}`);
          ctx.fillStyle = PAPER;
          ctx.fillRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
          ctx.fillStyle = k > 0.55 ? '#23231F' : k > 0.25 ? '#77776E' : '#B5B4AA';
          const off = Math.round((k - 0.5) * 8);
          ctx.fillRect(c * BLOCK + off + 2, r * BLOCK - off + 2, BLOCK - 4, BLOCK - 4);
        }
      }
  }

  // banner dialog
  if (banner) {
    ctx.fillStyle = 'rgba(228,227,218,0.6)';
    ctx.fillRect(0, 0, w, h);
    const bw = w - 90, bx = 45;
    ctx.font = `bold 34px ${FONTS.verdana}`;
    const words = banner.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const wd of words) {
      const test = line ? `${line} ${wd}` : wd;
      if (ctx.measureText(test).width > bw - 60 && line) {
        lines.push(line);
        line = wd;
      } else line = test;
    }
    lines.push(line);
    const bh = 170 + lines.length * 44;
    const by = h / 2 - bh / 2;
    ctx.fillStyle = '#1F1F1C';
    ctx.fillRect(bx + 8, by + 8, bw, bh);
    ctx.fillStyle = '#F2F1EA';
    ctx.fillRect(bx, by, bw, bh);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1F1F1C';
    ctx.strokeRect(bx, by, bw, bh);
    // icon
    ctx.beginPath();
    ctx.arc(w / 2, by + 52, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#1F1F1C';
    ctx.fill();
    ctx.fillStyle = '#F2F1EA';
    ctx.font = `bold 38px ${FONTS.verdana}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', w / 2, by + 66);
    ctx.fillStyle = '#1F1F1C';
    ctx.font = `bold 34px ${FONTS.verdana}`;
    lines.forEach((ln, i) => ctx.fillText(ln, w / 2, by + 122 + i * 44));
    // OK button
    const okY = by + bh - 62;
    ctx.lineWidth = 4;
    ctx.strokeRect(w / 2 - 70, okY, 140, 44);
    ctx.font = `bold 24px ${FONTS.verdana}`;
    ctx.fillText('OK', w / 2, okY + 31);
    ctx.textAlign = 'left';
  }
};

const drawBezel = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const k = w / W;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, w, h);
  // logo
  ctx.fillStyle = '#4A505C';
  ctx.font = `italic bold ${0.0068 * k}px ${FONTS.web}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('e-Reader', w / 2, h - 0.0115 * k);
  // page-turn arrows printed beside the side bars
  ctx.font = `bold ${0.006 * k}px ${FONTS.ui}`;
  ctx.fillText('‹', 0.0058 * k, h / 2 + 0.03 * k);
  ctx.fillText('›', w - 0.0058 * k, h / 2 + 0.03 * k);
};

let eGeo: null | Record<string, THREE.BufferGeometry> = null;
const ereaderGeo = () => {
  if (eGeo) return eGeo;
  const frameS = rrectShape(SW + 0.008, SH + 0.008, 0.002);
  frameS.holes.push(rrectShape(SW - 0.0004, SH - 0.0004, 0.0005) as unknown as THREE.Path);
  const frame = new THREE.ExtrudeGeometry(frameS, {depth: 0.0008, bevelEnabled: false});
  const pad = new THREE.CylinderGeometry(0.0052, 0.0056, 0.0014, 18);
  pad.rotateX(Math.PI / 2);
  eGeo = {
    body: rbox(W, H, D, 0.0085, 3),
    face: new THREE.PlaneGeometry(W - 0.004, H - 0.004),
    screen: new THREE.PlaneGeometry(SW, SH),
    frame,
    bar: rbox(0.004, 0.034, 0.0032, 0.0014, 2),
    pad,
    pixel: new THREE.BoxGeometry(1, 1, 0.4),
  };
  return eGeo;
};

const N_PART = 260;

export type EReaderProps = GroupProps & {
  title?: string;
  author?: string;
  page?: string[];
  dissolve?: number;
  banner?: string;
  particles?: boolean;
  outline?: number;
};

export const EReader: React.FC<EReaderProps> = ({
  title = '1984', author = 'George Orwell', page = DEFAULT_PAGE, dissolve = 0, banner, particles = true, outline = PROP_INK.thin, ...rest
}) => {
  const g = ereaderGeo();
  const dq = Math.round(clamp01(dissolve) * 60) / 60;
  const pageKey = page.join('\n');
  const screenTex = useCanvasTexture(CW, CH, (ctx, w, h) => drawPage(ctx, w, h, title, author, page, dq, banner), [title, author, pageKey, dq, banner]);
  const bezelTex = useCanvasTexture(512, Math.round((512 * H) / W), drawBezel, []);
  const mats = useMemo(
    () => ({
      // unlit so the page reads in any scene light; kept below the bloom threshold
      screen: new THREE.MeshBasicMaterial({map: screenTex, color: '#c9c9c9'}),
      bezel: makeGlossMat('#ffffff', {map: bezelTex, transparent: true, spec: 0, depthWrite: false, polygonOffset: 2}),
    }),
    [screenTex, bezelTex],
  );
  const body = glossMat('#9AA0AA', {spec: 0.25, edge: 0.978});
  const darkGrey = glossMat('#5E646F', {spec: 0.4});
  const frameMat = glossMat('#3A3F48', {spec: 0.3});

  // ---- 3D pixel particles (instanced)
  const parts = useMemo(() => {
    const arr: {c: number; r: number; thr: number; dx: number; spin: number; shade: number}[] = [];
    for (let i = 0; i < N_PART; i++) {
      const c = Math.floor(rand(`pp-c${i}`) * COLS), r = Math.floor(rand(`pp-r${i}`) * ROWS);
      arr.push({c, r, thr: blockThr(c, r), dx: rand(`pp-dx${i}`) - 0.5, spin: rand(`pp-s${i}`) * 10, shade: rand(`pp-sh${i}`)});
    }
    return arr;
  }, []);
  const inst = useMemo(() => {
    const m = new THREE.InstancedMesh(g.pixel, glossMat('#ffffff', {spec: 0}), N_PART);
    m.frustumCulled = false;
    const c = new THREE.Color();
    parts.forEach((p, i) => m.setColorAt(i, c.set(p.shade > 0.55 ? '#23231F' : p.shade > 0.25 ? '#6E6E66' : '#B9B8AE')));
    return m;
  }, [g.pixel, parts]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const px = SW / COLS;
    let n = 0;
    const d = clamp01(dissolve);
    parts.forEach((pt) => {
      const qq = (d - pt.thr) / 0.32;
      if (!particles || qq <= 0 || qq >= 1) return;
      const x0 = -SW / 2 + (pt.c + 0.5) * px, y0 = SY + SH / 2 - (pt.r + 0.5) * px;
      p.set(x0 + pt.dx * 0.05 * qq + Math.sin(qq * 6 + pt.spin) * 0.006 * qq, y0 + 0.16 * qq * qq + 0.01 * qq, D / 2 + 0.002 + 0.07 * qq);
      e.set(pt.spin * qq, pt.spin * 0.7 * qq, 0);
      q.setFromEuler(e);
      sc.setScalar(px * 1.15 * (1 - qq * 0.5));
      m.compose(p, q, sc);
      inst.setMatrixAt(n++, m);
    });
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  });
  useLayoutEffect(() => () => inst.dispose(), [inst]);

  return (
    <group {...rest}>
      <Ink geometry={g.body} material={body} outline={outline} />
      <mesh geometry={g.face} material={mats.bezel} position={[0, 0, D / 2 + 0.0002]} />
      <mesh geometry={g.frame} material={frameMat} position={[0, SY, D / 2 - 0.0004]} />
      <mesh geometry={g.screen} material={mats.screen} position={[0, SY, D / 2 + 0.0003]} />
      {/* page-turn bars */}
      {[-1, 1].map((sx) => (
        <Ink key={sx} geometry={g.bar} material={darkGrey} position={[sx * (W / 2 - 0.0045), SY - 0.012, D / 2]} outline={PROP_INK.hair} />
      ))}
      <Ink geometry={g.pad} material={darkGrey} position={[0, -H / 2 + 0.024, D / 2 + 0.0004]} outline={PROP_INK.hair} />
      <primitive object={inst} />
    </group>
  );
};

export default EReader;
