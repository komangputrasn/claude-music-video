// TERMS — Cancel: canvas textures for this scene (drawn once, cached at module level; system fonts only).
//   pageTexture()   the landing page of the paper stair: the SAME page on every landing (form header, fine print, a red
//                   CONTINUE button, "PAGE 1 OF 1"); the sung line is laid over it by <WorldLyric mode="paint">.
//   buttonGlowTexture() that page's CONTINUE pill as a mask (label cut out) for the beat glow laid over it.
//   drawerTexture() the canyon walls: endless filing drawers with pale label cards (4 × 4 m per repeat).
//   treadTexture()  a stair tread: a sheet of paper with faint ruled print.
//   edgeTexture()   the edge of a ream: stacked sheets (landing fronts).
//   iliadMap()      the Iliad wall: Greek capitals cut stoichedon into ashlar blocks, as a PRE-LIT relief map
//                   (DataTexture: r = the cold top light, g = how much a texel faces DOWN (toward the trench light),
//                   b = how much it faces the viewer (0 on up-facing cut walls), a = height; 1 = face, 0 = cut bottom).
//                   Both lights lie in the wall's y-z plane, so the lighting is linear in these channels and survives
//                   mip filtering: the carving still reads as a fine red grain when the crane is 100 m+ away.
import * as THREE from 'three';
import {SFONTS} from '../../lib/palette';
import {tenureClauses} from '../../lib/tenure';
import {canvasTexture, hash} from './common';

const mk = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return {c, g: c.getContext('2d')!};
};
const setSpacing = (g: CanvasRenderingContext2D, px: number) => {
  (g as unknown as {letterSpacing: string}).letterSpacing = `${px}px`;
};

// ------------------------------------------------------------------------------------------------ the page
export const PAGE_ASPECT = 2048 / 1448; // A-series landscape
/** the red CONTINUE button on the page canvas (px of the 2048 × 1448 page) */
export const PAGE_BUTTON_PX = {bx: 2048 - 92 - 400, by: 1448 - 128, bw: 400, bh: 78};
/** where the lyric block sits on the page (fractions of the page, from the far/top edge) */
export const PAGE_LAYOUT = {lyricTop: 0.17, lyricBottom: 0.72};
/**
 * The button's printed red is a DIM authRed (linear ×0.6): the beat glow in ShotPages adds up to full authRed on top
 * without overshooting (brighter authRed tone-maps toward orange under ACES).
 */
const BUTTON_RED = '#cb1f15';
const buttonLabel = (g: CanvasRenderingContext2D, cx: number, baseline: number) => {
  g.font = `600 34px ${SFONTS.futura}`;
  setSpacing(g, 7);
  g.textAlign = 'center';
  g.fillText('CONTINUE  ›', cx, baseline);
};
let _page: THREE.Texture | null = null;
export const pageTexture = () => {
  if (_page) return _page;
  const W = 2048, H = 1448;
  const {c, g} = mk(W, H);
  // paper: warm-free bone, faint fibre noise
  g.fillStyle = '#e9e6df';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const x = hash(i, 1) * W, y = hash(i, 2) * H;
    g.fillStyle = `rgba(40,42,46,${0.012 + 0.02 * hash(i, 3)})`;
    g.fillRect(x, y, 1 + 3 * hash(i, 4), 1);
  }
  const ink = '#2a2c30';
  const M = 92;
  // header
  g.fillStyle = ink;
  g.font = `500 34px ${SFONTS.mono}`;
  setSpacing(g, 4);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillText('TENURE  ·  CANCELLATION REQUEST  ·  FORM 14-C', M, 120);
  g.textAlign = 'right';
  g.fillText('LEASE 0315-77', W - M, 120);
  g.fillRect(M, 146, W - 2 * M, 4);
  g.fillRect(M, 156, W - 2 * M, 1.5);
  // fine print under the lyric block
  g.textAlign = 'left';
  g.font = `400 21px ${SFONTS.mono}`;
  setSpacing(g, 1);
  g.fillStyle = 'rgba(42,44,48,0.72)';
  const clauses = tenureClauses(14, 12);
  let y = H * PAGE_LAYOUT.lyricBottom + 70;
  for (const cl of clauses) {
    if (y > H - 190) break;
    const words = cl.split(' ');
    let line = '';
    for (const wd of words) {
      const next = line ? `${line} ${wd}` : wd;
      if (g.measureText(next).width > W - 2 * M) {
        g.fillText(line, M, y);
        y += 31;
        line = wd;
        if (y > H - 190) break;
      } else line = next;
    }
    if (y <= H - 190 && line) {
      g.fillText(line, M, y);
      y += 40;
    }
  }
  // footer: rule, initials box, page number, the red CONTINUE button
  g.fillStyle = ink;
  g.fillRect(M, H - 150, W - 2 * M, 2);
  g.font = `500 30px ${SFONTS.mono}`;
  setSpacing(g, 3);
  g.textAlign = 'left';
  g.fillText('INITIAL HERE  ______', M, H - 84);
  g.textAlign = 'center';
  g.fillText('PAGE 1 OF 1', W / 2, H - 84);
  const {bx, by, bw, bh} = PAGE_BUTTON_PX;
  g.fillStyle = BUTTON_RED;
  g.beginPath();
  g.roundRect(bx, by, bw, bh, bh / 2);
  g.fill();
  g.fillStyle = '#e9e6df';
  buttonLabel(g, bx + bw / 2, by + bh / 2 + 12);
  // a thin printed border
  g.strokeStyle = 'rgba(42,44,48,0.35)';
  g.lineWidth = 2;
  g.strokeRect(36, 36, W - 72, H - 72);
  _page = canvasTexture(c);
  return _page;
};

let _btn: THREE.Texture | null = null;
/**
 * The CONTINUE button as a glow mask, 1:1 with PAGE_BUTTON_PX: the white pill with its label cut out (same font and
 * position as the printed label). The beat glow lies exactly over the printed pill, so no red spills onto the white
 * paper or the label (red added to white reads pink).
 */
export const buttonGlowTexture = () => {
  if (_btn) return _btn;
  const {bw, bh} = PAGE_BUTTON_PX;
  const {c, g} = mk(bw, bh);
  g.fillStyle = '#fff';
  g.beginPath();
  g.roundRect(0, 0, bw, bh, bh / 2);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  buttonLabel(g, bw / 2, bh / 2 + 12);
  _btn = canvasTexture(c);
  return _btn;
};

// ------------------------------------------------------------------------------------------------ filing drawers
export const DRAWER_TILE = 4; // metres per repeat
let _drawer: THREE.Texture | null = null;
export const drawerTexture = () => {
  if (_drawer) return _drawer;
  const N = 1024;
  const {c, g} = mk(N, N);
  const ppm = N / DRAWER_TILE;
  g.fillStyle = '#0d0e10';
  g.fillRect(0, 0, N, N);
  const cols = 5, rows = 8;
  const cw = N / cols, rh = N / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = k * cw, y = r * rh;
      const v = 0.85 + 0.3 * hash(k, r, 9);
      g.fillStyle = `rgb(${Math.round(34 * v)},${Math.round(36 * v)},${Math.round(40 * v)})`;
      g.fillRect(x + 5, y + 5, cw - 10, rh - 10);
      // top bevel catch-light and bottom shadow
      g.fillStyle = 'rgba(160,165,172,0.12)';
      g.fillRect(x + 5, y + 5, cw - 10, 3);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x + 5, y + rh - 9, cw - 10, 4);
      // label card holder
      const lw = 0.2 * ppm, lh = 0.075 * ppm;
      const lx = x + cw / 2 - lw / 2, ly = y + rh * 0.3;
      const pale = 0.22 + 0.18 * hash(k, r, 3);
      g.fillStyle = `rgba(233,230,223,${pale})`;
      g.fillRect(lx, ly, lw, lh);
      g.fillStyle = 'rgba(30,32,36,0.8)';
      for (let q = 0; q < 3; q++) g.fillRect(lx + 6, ly + 6 + q * 6, lw * (0.4 + 0.5 * hash(k, r, q)), 2);
      // handle
      g.fillStyle = '#050607';
      g.fillRect(x + cw / 2 - 0.12 * ppm, y + rh * 0.62, 0.24 * ppm, 0.035 * ppm);
    }
  }
  _drawer = canvasTexture(c, true);
  return _drawer;
};

// ------------------------------------------------------------------------------------------------ stair paper
let _tread: THREE.Texture | null = null;
export const treadTexture = () => {
  if (_tread) return _tread;
  const H = 128;
  const {c, g} = mk(1024, H);
  g.fillStyle = '#e9e6df';
  g.fillRect(0, 0, 1024, H);
  // ruled print lines (each step is a sheet)
  for (let i = 0; i < 5; i++) {
    let x = 30;
    while (x < 990) {
      const w = 18 + 70 * hash(x, i, 5);
      g.fillStyle = 'rgba(42,44,48,0.22)';
      g.fillRect(x, 30 + i * 14, w, 4);
      x += w + 10;
    }
  }
  // canvas top = the tread's far edge = the NOSING (convex, catches the light from above)
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(0, 0, 1024, 5);
  g.fillStyle = 'rgba(42,44,48,0.35)';
  g.fillRect(0, 5, 1024, 2);
  // canvas bottom = the near edge = the inside corner under the next riser: soft occlusion
  const gr = g.createLinearGradient(0, H * 0.55, 0, H);
  gr.addColorStop(0, 'rgba(20,22,26,0)');
  gr.addColorStop(1, 'rgba(20,22,26,0.62)');
  g.fillStyle = gr;
  g.fillRect(0, H * 0.55, 1024, H * 0.45);
  _tread = canvasTexture(c);
  return _tread;
};

let _edge: THREE.Texture | null = null;
export const edgeTexture = () => {
  if (_edge) return _edge;
  const {c, g} = mk(64, 256);
  for (let y = 0; y < 256; y++) {
    const v = 120 + 70 * hash(y, 7);
    g.fillStyle = `rgb(${v},${v},${v + 4})`;
    g.fillRect(0, y, 64, 1);
  }
  _edge = canvasTexture(c, true);
  return _edge;
};

// ------------------------------------------------------------------------------------------------ the Iliad wall
/** Iliad I.1–32 in Greek capitals, no accents (as carved: scriptio continua with word dots). */
const ILIAD =
  'ΜΗΝΙΝ ΑΕΙΔΕ ΘΕΑ ΠΗΛΗΙΑΔΕΩ ΑΧΙΛΗΟΣ ΟΥΛΟΜΕΝΗΝ Η ΜΥΡΙ ΑΧΑΙΟΙΣ ΑΛΓΕ ΕΘΗΚΕ ΠΟΛΛΑΣ Δ ΙΦΘΙΜΟΥΣ ΨΥΧΑΣ ΑΙΔΙ ΠΡΟΙΑΨΕΝ ' +
  'ΗΡΩΩΝ ΑΥΤΟΥΣ ΔΕ ΕΛΩΡΙΑ ΤΕΥΧΕ ΚΥΝΕΣΣΙΝ ΟΙΩΝΟΙΣΙ ΤΕ ΠΑΣΙ ΔΙΟΣ Δ ΕΤΕΛΕΙΕΤΟ ΒΟΥΛΗ ΕΞ ΟΥ ΔΗ ΤΑ ΠΡΩΤΑ ΔΙΑΣΤΗΤΗΝ ΕΡΙΣΑΝΤΕ ' +
  'ΑΤΡΕΙΔΗΣ ΤΕ ΑΝΑΞ ΑΝΔΡΩΝ ΚΑΙ ΔΙΟΣ ΑΧΙΛΛΕΥΣ ΤΙΣ Τ ΑΡ ΣΦΩΕ ΘΕΩΝ ΕΡΙΔΙ ΞΥΝΕΗΚΕ ΜΑΧΕΣΘΑΙ ΛΗΤΟΥΣ ΚΑΙ ΔΙΟΣ ΥΙΟΣ Ο ΓΑΡ ' +
  'ΒΑΣΙΛΗΙ ΧΟΛΩΘΕΙΣ ΝΟΥΣΟΝ ΑΝΑ ΣΤΡΑΤΟΝ ΩΡΣΕ ΚΑΚΗΝ ΟΛΕΚΟΝΤΟ ΔΕ ΛΑΟΙ ΟΥΝΕΚΑ ΤΟΝ ΧΡΥΣΗΝ ΗΤΙΜΑΣΕΝ ΑΡΗΤΗΡΑ ΑΤΡΕΙΔΗΣ ' +
  'Ο ΓΑΡ ΗΛΘΕ ΘΟΑΣ ΕΠΙ ΝΗΑΣ ΑΧΑΙΩΝ ΛΥΣΟΜΕΝΟΣ ΤΕ ΘΥΓΑΤΡΑ ΦΕΡΩΝ Τ ΑΠΕΡΕΙΣΙ ΑΠΟΙΝΑ ΣΤΕΜΜΑΤ ΕΧΩΝ ΕΝ ΧΕΡΣΙΝ ΕΚΗΒΟΛΟΥ ' +
  'ΑΠΟΛΛΩΝΟΣ ΧΡΥΣΕΩ ΑΝΑ ΣΚΗΠΤΡΩ ΚΑΙ ΛΙΣΣΕΤΟ ΠΑΝΤΑΣ ΑΧΑΙΟΥΣ ΑΤΡΕΙΔΑ ΔΕ ΜΑΛΙΣΤΑ ΔΥΩ ΚΟΣΜΗΤΟΡΕ ΛΑΩΝ ΑΤΡΕΙΔΑΙ ΤΕ ' +
  'ΚΑΙ ΑΛΛΟΙ ΕΥΚΝΗΜΙΔΕΣ ΑΧΑΙΟΙ ΥΜΙΝ ΜΕΝ ΘΕΟΙ ΔΟΙΕΝ ΟΛΥΜΠΙΑ ΔΩΜΑΤ ΕΧΟΝΤΕΣ ΕΚΠΕΡΣΑΙ ΠΡΙΑΜΟΙΟ ΠΟΛΙΝ ΕΥ Δ ΟΙΚΑΔ ' +
  'ΙΚΕΣΘΑΙ ΠΑΙΔΑ Δ ΕΜΟΙ ΛΥΣΑΙΤΕ ΦΙΛΗΝ ΤΑ Δ ΑΠΟΙΝΑ ΔΕΧΕΣΘΑΙ ΑΖΟΜΕΝΟΙ ΔΙΟΣ ΥΙΟΝ ΕΚΗΒΟΛΟΝ ΑΠΟΛΛΩΝΑ ΕΝΘ ΑΛΛΟΙ ΜΕΝ ' +
  'ΠΑΝΤΕΣ ΕΠΕΥΦΗΜΗΣΑΝ ΑΧΑΙΟΙ ΑΙΔΕΙΣΘΑΙ Θ ΙΕΡΗΑ ΚΑΙ ΑΓΛΑΑ ΔΕΧΘΑΙ ΑΠΟΙΝΑ ΑΛΛ ΟΥΚ ΑΤΡΕΙΔΗ ΑΓΑΜΕΜΝΟΝΙ ΗΝΔΑΝΕ ΘΥΜΩ ' +
  'ΑΛΛΑ ΚΑΚΩΣ ΑΦΙΕΙ ΚΡΑΤΕΡΟΝ Δ ΕΠΙ ΜΥΘΟΝ ΕΤΕΛΛΕ ΜΗ ΣΕ ΓΕΡΟΝ ΚΟΙΛΗΣΙΝ ΕΓΩ ΠΑΡΑ ΝΗΥΣΙ ΚΙΧΕΙΩ Η ΝΥΝ ΔΗΘΥΝΟΝΤ Η ' +
  'ΥΣΤΕΡΟΝ ΑΥΤΙΣ ΙΟΝΤΑ ΜΗ ΝΥ ΤΟΙ ΟΥ ΧΡΑΙΣΜΗ ΣΚΗΠΤΡΟΝ ΚΑΙ ΣΤΕΜΜΑ ΘΕΟΙΟ ΤΗΝ Δ ΕΓΩ ΟΥ ΛΥΣΩ ';
/** a Greek-capable sans (lapidary capitals are monoline); Futura has no Greek, so it is not in this stack */
const GREEK_FONT = '"Helvetica Neue", "Helvetica", "Arial", "DejaVu Sans", sans-serif';

export const ILIAD_TILE = {w: 24, h: 24}; // metres per repeat of the carved map
/** stoichedon grid of the carved map (cells per tile), so a shader can offset tiles by whole letters / courses */
export const ILIAD_GRID = (() => {
  const ppm = 2048 / ILIAD_TILE.w;
  return {cols: Math.floor(2048 / (0.46 * ppm)), rows: Math.floor(2048 / (0.62 * ppm)), course: 4};
})();
let _iliad: THREE.DataTexture | null = null;
export const iliadMap = () => {
  if (_iliad) return _iliad;
  const N = 2048;
  const ppm = N / ILIAD_TILE.w;
  const cellW = 0.46 * ppm; // stoichedon grid cell (m → px)
  const cellH = 0.62 * ppm;
  const cols = Math.floor(N / cellW);
  const rows = Math.floor(N / cellH);
  const cw = N / cols, rh = N / rows; // exact fit so the tile repeats seamlessly
  const {c, g} = mk(N, N);
  // height: 1 = the dressed face
  g.fillStyle = '#fff';
  g.fillRect(0, 0, N, N);
  // weathering: low-frequency pitting on the face
  for (let i = 0; i < 2600; i++) {
    const x = hash(i, 11) * N, y = hash(i, 12) * N, r = 2 + 9 * hash(i, 13);
    g.fillStyle = `rgba(0,0,0,${0.05 + 0.08 * hash(i, 14)})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // ashlar joints: courses every 4 text rows, blocks staggered
  g.fillStyle = 'rgba(0,0,0,0.75)';
  const course = 4;
  for (let r = 0; r <= rows; r += course) {
    const y = r * rh - rh * 0.12;
    g.fillRect(0, y - 2, N, 4);
    const off = (r / course) % 2 ? 0.5 : 0;
    const blockCols = 9;
    for (let k = 0; k < cols / blockCols + 1; k++) {
      const x = (k + off) * blockCols * cw;
      g.fillRect(x - 2, y, 4, course * rh);
    }
  }
  // the letters: cut into the face, one per grid cell, word dots between words
  g.fillStyle = '#000';
  g.font = `500 ${Math.round(cellH * 0.66)}px ${GREEK_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const text = ILIAD.replace(/ +/g, '·');
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const ch = text[k % text.length];
      k++;
      const cx = col * cw + cw / 2;
      const by = r * rh + rh * 0.74;
      if (ch === '·') {
        g.beginPath();
        g.arc(cx, by - cellH * 0.25, cellH * 0.05, 0, Math.PI * 2);
        g.fill();
      } else g.fillText(ch, cx, by);
    }
  }
  // soften the cut walls (a V-cut chisel profile) before taking the gradient
  const {g: g2} = mk(N, N);
  g2.filter = `blur(${Math.max(1, cellH * 0.035).toFixed(2)}px)`;
  g2.drawImage(c, 0, 0);
  const src = g2.getImageData(0, 0, N, N).data;
  const out = new Uint8Array(N * N * 4);
  const hAt = (x: number, y: number) => src[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  const strength = 5.5;
  for (let y = 0; y < N; y++) {
    const oy = N - 1 - y; // DataTexture row 0 = bottom (v = 0)
    for (let x = 0; x < N; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * strength;
      const dy = (hAt(x, y - 1) - hAt(x, y + 1)) * strength; // +v is up (canvas y is down)
      const l = Math.hypot(dx, dy, 1);
      const ny = -dy / l, nz = 1 / l; // +y = up on the wall (the x component is not needed: both lights have x = 0)
      const h = hAt(x, y);
      // the cold light from far above, direction normalize(0, 1, 0.25)
      const sd = Math.max(0, ny * 0.9701 + nz * 0.2425);
      const sky = Math.min(1, Math.pow(sd, 6) * (1 - h) + 0.06 * sd * sd);
      const down = Math.max(0, -ny);
      const up = Math.min(1, Math.max(0, ny) / 0.3);
      const face = nz * (1 - up * up * (3 - 2 * up));
      const o = (oy * N + x) * 4;
      out[o] = Math.round(sky * 255);
      out[o + 1] = Math.round(down * 255);
      out[o + 2] = Math.round(face * 255);
      out[o + 3] = Math.round(h * 255);
    }
  }
  const t = new THREE.DataTexture(out, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  _iliad = t;
  return t;
};
