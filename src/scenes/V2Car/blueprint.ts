// Blueprint "U.S. PATENT" sheet drawn on a canvas (white line art on blueprint blue, Courier text). Generic, no logos.
// drawBlueprint(ctx, p): p 0..1 = draw-on progress (frame + header, then the FIG. 1 strokes, then labels type on).
// drawPatentCar(ctx): the little line-art car from FIG. 1 on a transparent canvas (it drives off the sheet at the end).
import {FONTS} from '../../lib/palette';

export const SHEET = {w: 2048, h: 1280};
/** where FIG. 1's car sits on the sheet (px, centre) and its drawn size (px) */
export const FIG_CAR = {x: 1290, y: 775, w: 520, h: 230, pad: 70};
/** logical canvas size of the car layer (drawn at 2x) */
export const CAR_CANVAS = {w: FIG_CAR.w + FIG_CAR.pad + 10, h: FIG_CAR.h};

type Pt = [number, number];
type Stroke = {pts: Pt[]; dash?: number[]; width?: number};

const MONO = FONTS.mono;
const INK = '#f4fbff';

const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
const circle = (cx: number, cy: number, r: number, n = 28, a0 = 0, a1 = Math.PI * 2): Pt[] =>
  Array.from({length: n + 1}, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });

// ---------------------------------------------------------------- FIG. 1 strokes (sheet px)
const GROUND = 950;
const PUMP_X = 300;
const MAN_X = 560;
const strokes: Stroke[] = [
  // ground line
  {pts: [[150, GROUND], [1880, GROUND]], width: 3},
  // fuel pump (16)
  {pts: rect(PUMP_X - 70, GROUND - 330, 140, 330)},
  {pts: rect(PUMP_X - 50, GROUND - 300, 100, 70)},
  {pts: rect(PUMP_X - 85, GROUND - 360, 170, 30)},
  {pts: [[PUMP_X - 40, GROUND - 190], [PUMP_X + 40, GROUND - 190]]},
  {pts: [[PUMP_X - 40, GROUND - 160], [PUMP_X + 40, GROUND - 160]]},
  // hose: pump -> nozzle in the man's hand
  {pts: [[PUMP_X + 70, GROUND - 250], [PUMP_X + 120, GROUND - 200], [PUMP_X + 150, GROUND - 120], [PUMP_X + 190, GROUND - 90], [PUMP_X + 240, GROUND - 120],
    [MAN_X + 40, GROUND - 330]], width: 4},
  // former owner (12): head, body, legs, arm holding the nozzle (14)
  {pts: circle(MAN_X, GROUND - 470, 38)},
  {pts: [[MAN_X, GROUND - 432], [MAN_X, GROUND - 400]]},
  {pts: rect(MAN_X - 45, GROUND - 400, 90, 190)},
  {pts: [[MAN_X - 25, GROUND - 210], [MAN_X - 35, GROUND]]},
  {pts: [[MAN_X + 25, GROUND - 210], [MAN_X + 35, GROUND]]},
  {pts: [[MAN_X - 45, GROUND - 380], [MAN_X - 70, GROUND - 290], [MAN_X - 55, GROUND - 220]]},
  {pts: [[MAN_X + 45, GROUND - 380], [MAN_X + 90, GROUND - 330]]},
  // the nozzle
  {pts: [[MAN_X + 70, GROUND - 345], [MAN_X + 130, GROUND - 330], [MAN_X + 150, GROUND - 300], [MAN_X + 75, GROUND - 315], [MAN_X + 70, GROUND - 345]]},
  {pts: [[MAN_X + 150, GROUND - 300], [MAN_X + 190, GROUND - 285]], width: 4},
  // fuel drops
  {pts: circle(MAN_X + 200, GROUND - 255, 7, 10)},
  {pts: circle(MAN_X + 212, GROUND - 215, 6, 10)},
  // direction of departure (18): dashed arrow from the man to the car and beyond
  {pts: [[MAN_X + 260, GROUND + 40], [1830, GROUND + 40]], dash: [26, 16], width: 3},
  {pts: [[1800, GROUND + 22], [1840, GROUND + 40], [1800, GROUND + 58]], width: 3},
];

// labels (appear after the strokes): [text, x, y, leader target?]
const LABELS: [string, number, number, Pt?][] = [
  ['16', PUMP_X - 170, GROUND - 300, [PUMP_X - 70, GROUND - 250]],
  ['12', MAN_X - 170, GROUND - 450, [MAN_X - 45, GROUND - 470]],
  ['14', MAN_X + 220, GROUND - 400, [MAN_X + 135, GROUND - 330]],
  ['18', 1700, GROUND + 100, [1680, GROUND + 44]],
  ['10', FIG_CAR.x + 140, FIG_CAR.y - 210, [FIG_CAR.x + 80, FIG_CAR.y - 110]],
];

const strokeLen = (s: Stroke) => {
  let L = 0;
  for (let i = 1; i < s.pts.length; i++) L += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
  return L;
};
const TOTAL = strokes.reduce((a, s) => a + strokeLen(s), 0);

const drawStrokes = (c: CanvasRenderingContext2D, list: Stroke[], amount: number) => {
  let budget = amount;
  for (const s of list) {
    if (budget <= 0) break;
    c.setLineDash(s.dash ?? []);
    c.lineWidth = s.width ?? 3.5;
    c.beginPath();
    c.moveTo(s.pts[0][0], s.pts[0][1]);
    for (let i = 1; i < s.pts.length; i++) {
      const [x0, y0] = s.pts[i - 1], [x1, y1] = s.pts[i];
      const L = Math.hypot(x1 - x0, y1 - y0);
      if (budget >= L) {
        c.lineTo(x1, y1);
        budget -= L;
      } else {
        const k = budget / L;
        c.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
        budget = 0;
        break;
      }
    }
    c.stroke();
  }
  c.setLineDash([]);
};

const typeText = (c: CanvasRenderingContext2D, text: string, x: number, y: number, k: number) => {
  const n = Math.floor(text.length * Math.max(0, Math.min(1, k)));
  if (n > 0) c.fillText(text.slice(0, n), x, y);
};

/** p: 0..1 overall draw-on progress */
export const drawBlueprint = (c: CanvasRenderingContext2D, p: number) => {
  const {w, h} = SHEET;
  const seg = (a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  // paper
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1452b8');
  g.addColorStop(1, '#0b3486');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // grid
  c.lineWidth = 1;
  for (let x = 0; x <= w; x += 32) {
    c.strokeStyle = x % 160 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  }
  for (let y = 0; y <= h; y += 32) {
    c.strokeStyle = y % 160 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
  // paper wear
  const v = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,10,40,0.35)');
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);

  c.strokeStyle = INK;
  c.fillStyle = INK;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // double border
  c.lineWidth = 5;
  c.strokeRect(36, 36, w - 72, h - 72);
  c.lineWidth = 2;
  c.strokeRect(50, 50, w - 100, h - 100);

  // header
  const hk = seg(0.0, 0.22);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  c.font = `bold 78px ${MONO}`;
  typeText(c, 'UNITED STATES PATENT', 96, 150, hk * 1.4);
  c.font = `bold 32px ${MONO}`;
  typeText(c, 'Patent No.: US 9,999,999 B2', 100, 202, hk * 1.4 - 0.2);
  typeText(c, 'Date of Patent: Nov. 9, 2002', 100, 244, hk * 1.4 - 0.3);
  c.textAlign = 'right';
  typeText(c, 'Sheet 1 of 1', w - 100, 150, hk * 1.6 - 0.2);
  c.font = `bold 30px ${MONO}`;
  typeText(c, 'Assignee: MOTORCO Holdings', w - 100, 202, hk * 1.4 - 0.25);
  c.textAlign = 'left';
  c.lineWidth = 3;
  if (hk > 0.2) {
    c.beginPath();
    c.moveTo(96, 272);
    c.lineTo(96 + (w - 192) * Math.min(1, (hk - 0.2) / 0.5), 272);
    c.stroke();
  }
  // title
  c.font = `bold 46px ${MONO}`;
  typeText(c, '(54) SELF-REPOSSESSING VEHICLE AND METHOD', 96, 336, seg(0.12, 0.3));
  typeText(c, '     OF LEAVING A FORMER OWNER AT THE PUMP', 96, 394, seg(0.18, 0.34));

  // FIG. 1 strokes
  c.strokeStyle = INK;
  drawStrokes(c, strokes, TOTAL * seg(0.22, 0.82));

  // labels + leaders
  const lk = seg(0.78, 0.98);
  c.font = `bold 40px ${MONO}`;
  LABELS.forEach(([t, x, y, to], i) => {
    const k = Math.max(0, Math.min(1, lk * LABELS.length - i));
    if (k <= 0) return;
    c.globalAlpha = k;
    c.fillText(t, x, y);
    if (to) {
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 26, y + 8);
      c.quadraticCurveTo(x + 40, to[1] - 10, to[0], to[1]);
      c.stroke();
    }
    c.globalAlpha = 1;
  });
  // FIG. 1
  const fk = seg(0.8, 0.95);
  if (fk > 0) {
    c.globalAlpha = fk;
    c.font = `italic bold 64px ${MONO}`;
    c.fillText('FIG. 1', 860, 1112);
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(860, 1126);
    c.lineTo(1100, 1126);
    c.stroke();
    c.globalAlpha = 1;
  }
};

/** FIG. 1's car (ref. 10): white line art on transparent, FIG_CAR.w x FIG_CAR.h logical px drawn into a 2x canvas */
export const drawPatentCar = (c: CanvasRenderingContext2D, p: number) => {
  c.clearRect(0, 0, CAR_CANVAS.w * 2, CAR_CANVAS.h * 2);
  c.save();
  c.scale(2, 2);
  c.strokeStyle = INK;
  c.lineWidth = 3.5;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // hatchback profile facing right
  const body: Pt[] = [[40, 180], [30, 150], [44, 110], [120, 98], [175, 40], [330, 36], [410, 92], [480, 110], [500, 150], [490, 180]];
  const parts: Stroke[] = [
    {pts: body},
    {pts: [[40, 180], [92, 180]]},
    {pts: [[178, 180], [372, 180]]},
    {pts: [[458, 180], [490, 180]]},
    {pts: circle(135, 182, 40, 24)},
    {pts: circle(135, 182, 16, 12)},
    {pts: circle(415, 182, 40, 24)},
    {pts: circle(415, 182, 16, 12)},
    {pts: [[188, 50], [250, 48], [250, 96], [140, 98], [188, 50]]},
    {pts: [[268, 48], [326, 46], [388, 94], [268, 96], [268, 48]]},
    {pts: [[258, 100], [258, 170]]},
    {pts: [[300, 120], [325, 120]]},
    // headlight + motion lines
    {pts: circle(486, 128, 9, 10)},
    {pts: [[8, 70], [-30, 70]], width: 3},
    {pts: [[4, 110], [-50, 110]], width: 3},
    {pts: [[8, 150], [-24, 150]], width: 3},
  ];
  const total = parts.reduce((a, s) => a + strokeLen(s), 0);
  c.translate(FIG_CAR.pad, 0);
  drawStrokes(c, parts, total * Math.max(0, Math.min(1, p)));
  c.restore();
};
