// V1Feeder local parts (no lib changes):
//   readerMatrix()  world matrix of the e-reader held in 'read' mode (same grip as the lib's <HeldSilEReader>)
//   rollToUp()      CameraRig roll that turns a world direction (the page's text-up) to screen-up
//   <InsertReader>  the e-reader for the close insert: pale page with "1984 · GEORGE ORWELL" and the sung line printed on it
//   <RowLyric>      a <WorldLyric> with explicit rows and a per-word fx that gets the word's row slot (rising rows)
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, SFONTS, hdr} from '../../lib/palette';
import {WorldLyric, WorldLyricProps, WordFx, WordInfo, measureLyric} from '../../lib/WorldLyric';
import {LINES} from '../../../lib/lyrics';
import {guyJointMatrix, GuyPose} from '../../../lib/characters/Guy';
import {rbox} from '../../../lib/props/Padlock';

export type V3 = [number, number, number];
export const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ------------------------------------------------------------------------------------------------ e-reader geometry
// Same numbers as src/silhouette/lib/props/SilEReader.tsx (device 0.122 × 0.172 × 0.0095, screen 0.09 × 0.12 at y 0.013)
export const RD = {w: 0.122, h: 0.172, d: 0.0095, sw: 0.09, sh: 0.12, sy: 0.013} as const;
/** <HeldSilEReader mode='read'> grip transform (copied: the lib does not export it) */
const basisEuler = (x: V3, y: V3, z: V3): V3 => {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z));
  const e = new THREE.Euler().setFromRotationMatrix(m);
  return [e.x, e.y, e.z];
};
export const READ_POS: V3 = [-0.07, -0.012, 0.012];
export const READ_ROT: V3 = basisEuler([0, 1, 0], [-1, 0, 0], [0, 0, 1]);

/** World matrix of the e-reader device centre for a Guy at `pos` / `rotY` holding it in 'read' mode in his right hand. */
export const readerMatrix = (pose: GuyPose, pos: V3, rotY: number) => {
  const g = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(1, 1, 1));
  const grip = guyJointMatrix(pose, 'gripR', {R: true});
  const held = new THREE.Matrix4().compose(new THREE.Vector3(...READ_POS), new THREE.Quaternion().setFromEuler(new THREE.Euler(...READ_ROT)), new THREE.Vector3(1, 1, 1));
  return g.multiply(grip).multiply(held);
};
/** page centre, normal and text-up direction (world) of a reader matrix */
export const readerPage = (m: THREE.Matrix4) => {
  const c = new THREE.Vector3(0, RD.sy, RD.d / 2).applyMatrix4(m);
  const n = new THREE.Vector3(0, 0, 1).transformDirection(m);
  const up = new THREE.Vector3(0, 1, 0).transformDirection(m);
  return {center: c.toArray() as V3, normal: n.toArray() as V3, up: up.toArray() as V3};
};

/** CameraRig roll that turns the world direction `dir` to screen-up for a camera at pos looking at target. */
export const rollToUp = (pos: V3, target: V3, dir: V3) => {
  const f = new THREE.Vector3(...target).sub(new THREE.Vector3(...pos)).normalize();
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  const u = new THREE.Vector3().crossVectors(r, f);
  const d = new THREE.Vector3(...dir);
  return -Math.atan2(d.dot(r), d.dot(u));
};

// ------------------------------------------------------------------------------------------------ InsertReader
const CW = 512, CH = 683;
/** body block of the page (device-local): top-left corner and width, from the header layout above */
export const PAGE_BODY = {
  x0: -RD.sw / 2 + (44 / CW) * RD.sw,
  yTop: RD.sy + RD.sh / 2 - (206 / CH) * RD.sh,
  width: RD.sw * (1 - 88 / CW),
  height: RD.sh * ((620 - 206) / CH),
};

/** fit a lyric line into the page body: the largest em size (m) whose balanced wrap fits the block */
export const fitPageLyric = (line: number) => {
  let s = 0.0125;
  for (; s > 0.004; s -= 0.0002) {
    const m = measureLyric(line, s, PAGE_BODY.width);
    if (m.width <= PAGE_BODY.width && m.height <= PAGE_BODY.height * 0.92 && m.rows <= 4) break;
  }
  return s;
};

/**
 * The e-reader in his right hand for the insert (replaces <HeldSilEReader> in shot PAGE): a black device, a pale page
 * (bone × pale, under bloom) with the header "1984 · GEORGE ORWELL", and the sung line printed on it as ink, word by word.
 */
export const InsertReader: React.FC<{time: number; line: number; pale?: number; ink?: string; until?: number}> = ({
  time, line, pale = 0.84, ink = GREYS.g2, until,
}) => {
  const header = useMemo(() => pageHeader(), []);
  const size = useMemo(() => fitPageLyric(line), [line]);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({map: header, transparent: true, depthWrite: false}), [header]);
  useLayoutEffect(() => {
    screenMat.color.copy(hdr(S.bone, pale));
    headMat.color.set(ink);
  });
  useLayoutEffect(() => () => {
    screenMat.dispose();
    headMat.dispose();
  }, [screenMat, headMat]);
  const z = RD.d / 2;
  return (
    <group position={READ_POS} rotation={READ_ROT}>
      <mesh geometry={rbox(RD.w, RD.h, RD.d, 0.006, 3)}>
        <meshBasicMaterial color={S.void} />
      </mesh>
      <group userData={{silKeep: true}}>
        <mesh position={[0, RD.sy, z + 0.0006]} material={screenMat}>
          <planeGeometry args={[RD.sw, RD.sh]} />
        </mesh>
        <mesh position={[0, RD.sy, z + 0.0009]} material={headMat} renderOrder={2}>
          <planeGeometry args={[RD.sw, RD.sh]} />
        </mesh>
        <WorldLyric line={line} time={time} mode="paint" color={ink} intensity={1} fog={false} size={size} maxWidth={PAGE_BODY.width}
          align="left" anchor="top" position={[PAGE_BODY.x0, PAGE_BODY.yTop, z + 0.0013]} until={until} renderOrder={3} />
      </group>
    </group>
  );
};
// module-level cache for the header texture (one page design; drawn once with the system fonts)
let headerTex: THREE.CanvasTexture | null = null;
const pageHeader = () => (headerTex ??= buildHeader());
function buildHeader() {
  const c = document.createElement('canvas');
  c.width = CW;
  c.height = CH;
  const g = c.getContext('2d')!;
  const ls = (px: number) => ((g as unknown as {letterSpacing: string}).letterSpacing = `${px}px`);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `600 78px ${SFONTS.futura}`;
  ls(10);
  g.fillText('1984', CW / 2 + 5, 104);
  g.font = `500 21px ${SFONTS.futura}`;
  ls(6);
  g.fillText('GEORGE ORWELL', CW / 2 + 3, 146);
  g.fillRect(CW * 0.38, 170, CW * 0.24, 2);
  g.globalAlpha = 0.55;
  g.font = `15px ${SFONTS.mono}`;
  ls(2);
  g.textAlign = 'left';
  g.fillText('LOC 12 / 4212', 40, 654);
  g.textAlign = 'right';
  g.fillText('LICENSED · NOT OWNED', CW - 40, 654);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------------------------------------------ RowLyric
const SPACE = 0.42; // em — WorldLyric's word gap
const CAP = 0.7;
export type RowSlot = {x: number; y: number; row: number; rowStart: number; width: number; rowCx: number; rowWidth: number};
export type RowLyricProps = Omit<WorldLyricProps, 'perWord' | 'maxWidth' | 'align' | 'anchor' | 'line' | 'text'> & {
  line: number;
  /** word indices per row, e.g. [[0, 1, 2], [3, 4]] */
  rows: number[][];
  align?: 'left' | 'right' | 'center';
  anchor?: 'top' | 'center' | 'bottom';
  /** per-word animation on top of the row slot; gets the slot (x, y, row, onset of the row's first word) */
  fx?: (i: number, info: WordInfo, slot: RowSlot) => WordFx;
};

/** <WorldLyric> with explicit row breaks (each word still appears exactly when sung). */
export const RowLyric: React.FC<RowLyricProps> = ({
  line, rows, align = 'center', anchor = 'top', fx, size = 0.5, font = SFONTS.futura, weight = 500, tracking = 0.15,
  lineHeight = 1.18, ...rest
}) => {
  const slots = useMemo(() => {
    const words = LINES[line].words;
    const width = (i: number) => measureLyric(words[i].text, size, undefined, {font, weight, tracking}).width;
    const H = ((rows.length - 1) * lineHeight + CAP) * size;
    const top = anchor === 'top' ? 0 : anchor === 'bottom' ? H : H / 2;
    const map = new Map<number, RowSlot>();
    rows.forEach((row, r) => {
      const ws = row.map(width);
      const rowW = ws.reduce((a, w) => a + w, 0) + SPACE * size * Math.max(0, row.length - 1);
      let x = align === 'left' ? 0 : align === 'right' ? -rowW : -rowW / 2;
      const y = top - CAP * size - r * lineHeight * size;
      const rowStart = words[row[0]].start;
      const rowCx = x + rowW / 2;
      row.forEach((wi, k) => {
        map.set(wi, {x, y, row: r, rowStart, width: ws[k], rowCx, rowWidth: rowW});
        x += ws[k] + SPACE * size;
      });
    });
    return map;
  }, [line, rows, align, anchor, size, font, weight, tracking, lineHeight]);

  const perWord = (i: number, info: WordInfo): WordFx => {
    const s = slots.get(i);
    if (!s) return {visible: false};
    const e = fx ? fx(i, info, s) : {};
    const o = e.offset ?? [0, 0, 0];
    return {...e, offset: [s.x - info.x + o[0], s.y - info.y + o[1], o[2]]};
  };
  return (
    <WorldLyric line={line} size={size} font={font} weight={weight} tracking={tracking} lineHeight={lineHeight}
      align="left" anchor="top" perWord={perWord} {...rest} />
  );
};
