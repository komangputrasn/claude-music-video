// Canvas textures for the Cancel scene (cached; drawn once with system fonts).
import * as THREE from 'three';
import {C, FONTS} from '../../lib/palette';
import {makeDialogTexture, POPUP_MESSAGES} from '../../lib/ui';
import type {DialogSpec} from '../../lib/ui';

const cache = new Map<string, THREE.CanvasTexture>();
const make = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
};

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const vgrad = (ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
};

/** glossy aqua pill button */
export const drawAqua = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, base = '#1d74f0', font = FONTS.ui) => {
  ctx.save();
  ctx.shadowColor = 'rgba(0,30,120,0.35)';
  ctx.shadowBlur = h * 0.25;
  ctx.shadowOffsetY = h * 0.08;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, '#0b3fae'], [0.45, base], [1, '#7fe4ff']]);
  ctx.fill();
  ctx.restore();
  rr(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = '#0a2c80';
  ctx.lineWidth = Math.max(2, h * 0.05);
  ctx.stroke();
  rr(ctx, x + h * 0.25, y + h * 0.07, w - h * 0.5, h * 0.42, h * 0.21);
  ctx.fillStyle = vgrad(ctx, y + h * 0.07, y + h * 0.5, [[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0.12)']]);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(h * 0.46)}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,20,90,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(label, x + w / 2, y + h * 0.54);
  ctx.shadowBlur = 0;
};

const bevelBtn = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, size = 22) => {
  rr(ctx, x, y, w, h, 5);
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, '#ffffff'], [1, '#d9d5c6']]);
  ctx.fill();
  ctx.strokeStyle = '#1c3f7e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#101010';
  ctx.font = `${size}px ${FONTS.ui}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
};

export type PageSpec = {heading: string; body: string[]; page: string; progress: number; kind?: 'offer' | 'form' | 'hold' | 'plain'; step: number};

export const PAGES: PageSpec[] = [
  {step: 1, heading: 'Are you sure?', body: ['Cancelling means losing everything', 'you never actually owned.'], page: 'Page 1 of ∞', progress: 0.42},
  {step: 2, heading: 'Really sure?', body: ['Really, really sure?', 'Like, sure sure?'], page: 'Page 2 of ∞', progress: 0.37},
  {step: 3, heading: "WAIT! Here's 10% off!", body: ['Stay subscribed and save 10%', 'on all fees.*'], page: 'Page 3 of ∞', progress: 0.31, kind: 'offer'},
  {step: 4, heading: "Tell us why you're leaving", body: ['(required)'], page: 'Page 4 of ∞', progress: 0.26, kind: 'form'},
  {step: 7, heading: 'Please hold...', body: ['Your cancellation is important to us.', 'Estimated wait: 9 business years.'], page: 'Page 7 of ∞', progress: 0.18,
    kind: 'hold'},
  {step: 12, heading: 'Are you sure you\'re sure?', body: ['We noticed you clicked Next.', 'Did you mean Stay?'], page: 'Page 12 of ∞', progress: 0.12},
  {step: 19, heading: 'Almost there!', body: ['Only ∞ steps remaining.', 'Please do not refresh.'], page: 'Page 19 of ∞', progress: 0.07},
  {step: 37, heading: 'Page 37 of ∞', body: ['Thank you for your patience.', 'Please go back to page 1.'], page: 'Page 37 of ∞', progress: 0.03},
];

/** A Y2K web browser window showing one cancel-flow page. 1400x900 px. */
export const pageTexture = (i: number) => {
  const P = PAGES[((i % PAGES.length) + PAGES.length) % PAGES.length];
  return make(`page-${i % PAGES.length}`, 1400, 900, (ctx, w, h) => {
    // window frame + title bar
    rr(ctx, 0, 0, w, h, 18);
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#0a3fd8'], [1, '#3b86f6']]);
    ctx.fill();
    ctx.fillStyle = vgrad(ctx, 0, 54, [[0, '#4b9bff'], [0.5, '#1557e6'], [1, '#0a3fd8']]);
    rr(ctx, 0, 0, w, 56, 18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 28px ${FONTS.ui}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,14,80,0.85)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(`OmniStore - Cancel Membership - Step ${P.step} - Web Navigator`, 60, 29);
    ctx.shadowColor = 'transparent';
    // globe icon
    ctx.beginPath();
    ctx.arc(32, 28, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#7fe4ff';
    ctx.fill();
    ctx.strokeStyle = '#0a2c80';
    ctx.lineWidth = 2;
    ctx.stroke();
    // controls
    ['_', '□', '✕'].forEach((g, k) => {
      const x = w - 150 + k * 46;
      rr(ctx, x, 10, 38, 36, 6);
      ctx.fillStyle = k === 2 ? vgrad(ctx, 10, 46, [[0, '#ff9b7a'], [1, '#e2231a']]) : vgrad(ctx, 10, 46, [[0, '#8ec0ff'], [1, '#2f6deb']]);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold 24px ${FONTS.ui}`;
      ctx.textAlign = 'center';
      ctx.fillText(g, x + 19, 29);
    });
    // body
    const bx = 8, by = 56, bw = w - 16, bh = h - 64;
    ctx.fillStyle = C.windowBeige;
    ctx.fillRect(bx, by, bw, bh);
    // toolbar
    const tbH = 64;
    ['◀ Back', 'Forward ▶', 'Stop', 'Refresh', 'Home'].forEach((g, k) => {
      ctx.fillStyle = k === 1 ? '#a8a492' : '#101010';
      ctx.font = `22px ${FONTS.ui}`;
      ctx.textAlign = 'left';
      ctx.fillText(g, 30 + k * 150, by + tbH / 2);
    });
    // address bar
    const ay = by + tbH;
    ctx.fillStyle = '#101010';
    ctx.font = `20px ${FONTS.ui}`;
    ctx.fillText('Address', 24, ay + 22);
    ctx.fillStyle = '#fff';
    ctx.fillRect(110, ay + 4, bw - 230, 36);
    ctx.strokeStyle = '#7f9db9';
    ctx.lineWidth = 2;
    ctx.strokeRect(110, ay + 4, bw - 230, 36);
    ctx.fillStyle = '#101010';
    ctx.font = `21px ${FONTS.ui}`;
    ctx.fillText(`http://www.omnistore.com/account/cancel/step${P.step}.html`, 122, ay + 23);
    bevelBtn(ctx, bw - 108, ay + 4, 96, 36, 'Go', 20);
    // page area (white)
    const py = ay + 50;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 10, py, bw - 20, h - py - 50);
    // header band
    ctx.fillStyle = vgrad(ctx, py, py + 80, [[0, '#ffb347'], [1, '#ff8a1e']]);
    ctx.fillRect(bx + 10, py, bw - 20, 80);
    ctx.fillStyle = '#fff';
    ctx.font = `italic bold 50px ${FONTS.web}`;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(120,40,0,0.6)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('OmniStore', 40, py + 42);
    ctx.shadowColor = 'transparent';
    ctx.font = `bold 22px ${FONTS.verdana}`;
    ctx.textAlign = 'right';
    ctx.fillText('Your Account  |  Cancel Center  |  Help (closed)', w - 40, py + 42);
    // heading
    ctx.textAlign = 'center';
    ctx.fillStyle = P.kind === 'offer' ? C.alertRed : '#0a2c80';
    let hs = 78;
    ctx.font = `bold ${hs}px ${FONTS.verdana}`;
    while (ctx.measureText(P.heading).width > bw - 120 && hs > 30) {
      hs -= 4;
      ctx.font = `bold ${hs}px ${FONTS.verdana}`;
    }
    ctx.fillText(P.heading, w / 2, py + 170);
    ctx.fillStyle = '#222';
    ctx.font = `34px ${FONTS.verdana}`;
    P.body.forEach((ln, k) => ctx.fillText(ln, w / 2, py + 250 + k * 46));
    if (P.kind === 'offer') {
      // starburst
      ctx.save();
      ctx.translate(w - 230, py + 300);
      ctx.beginPath();
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2, r = k % 2 ? 80 : 110;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffe14a';
      ctx.fill();
      ctx.strokeStyle = C.alertRed;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.rotate(-0.25);
      ctx.fillStyle = C.alertRed;
      ctx.font = `bold 46px ${FONTS.heavy}`;
      ctx.fillText('10%', 0, -8);
      ctx.font = `bold 26px ${FONTS.heavy}`;
      ctx.fillText('OFF!', 0, 30);
      ctx.restore();
      ctx.fillStyle = '#777';
      ctx.font = `18px ${FONTS.verdana}`;
      ctx.fillText('*fees not included. Offer expires when you blink.', w / 2, py + 360);
    }
    if (P.kind === 'form') {
      const opts = ['Too expensive', 'I found my grandpa\'s hammer', 'I want to own something', 'Other (explain in 5,000 words)'];
      ctx.textAlign = 'left';
      ctx.font = `28px ${FONTS.verdana}`;
      opts.forEach((o, k) => {
        const yy = py + 320 + k * 44;
        ctx.beginPath();
        ctx.arc(420, yy, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#1c3f7e';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#222';
        ctx.fillText(o, 445, yy + 1);
      });
      ctx.textAlign = 'center';
    }
    if (P.kind === 'hold') {
      // hourglass
      ctx.save();
      ctx.translate(w / 2, py + 380);
      ctx.fillStyle = '#e9b25e';
      ctx.beginPath();
      ctx.moveTo(-34, -46);
      ctx.lineTo(34, -46);
      ctx.lineTo(0, 0);
      ctx.lineTo(34, 46);
      ctx.lineTo(-34, 46);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3a2210';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    // progress bar (going backwards)
    const pbY = h - 205;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#222';
    ctx.font = `bold 22px ${FONTS.ui}`;
    ctx.fillText(`Cancellation progress: ${Math.round(P.progress * 100)}%  (was ${Math.round((P.progress + 0.06) * 100)}%)`, 250, pbY - 22);
    ctx.fillStyle = '#fff';
    ctx.fillRect(250, pbY, 900, 34);
    ctx.strokeStyle = '#7f9db9';
    ctx.strokeRect(250, pbY, 900, 34);
    const segs = Math.round(P.progress * 36);
    for (let k = 0; k < segs; k++) {
      ctx.fillStyle = vgrad(ctx, pbY, pbY + 34, [[0, '#d6ffb0'], [0.5, '#6fd23a'], [1, '#3a9a18']]);
      ctx.fillRect(254 + k * 25, pbY + 4, 21, 26);
    }
    // buttons: < Back | Next >
    bevelBtn(ctx, 300, h - 140, 220, 62, '< Back', 28);
    drawAqua(ctx, 760, h - 146, 340, 76, 'Next  >');
    // footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = `bold 24px ${FONTS.ui}`;
    ctx.fillText(P.page, w / 2, h - 34);
  });
};

/** corridor wall: a long strip of tiled dialogs (repeats along U) */
export const wallTexture = (seed: number) =>
  make(`wall-${seed}`, 2048, 1024, (ctx, w, h) => {
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#dfeaff'], [1, '#b8cdf5']]);
    ctx.fillRect(0, 0, w, h);
    // faint grid
    ctx.strokeStyle = 'rgba(30,91,255,0.18)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const specs: DialogSpec[] = [
      POPUP_MESSAGES[1], POPUP_MESSAGES[18], POPUP_MESSAGES[19], POPUP_MESSAGES[11], POPUP_MESSAGES[3], POPUP_MESSAGES[10], POPUP_MESSAGES[5],
      POPUP_MESSAGES[2], POPUP_MESSAGES[14], POPUP_MESSAGES[20],
    ];
    const slots: [number, number, number][] = [
      [30, 40, 0.95], [560, 120, 0.9], [1080, 30, 1.0], [1560, 150, 0.85], [120, 520, 0.9], [640, 600, 1.0], [1160, 520, 0.88], [1640, 640, 0.8],
    ];
    slots.forEach(([x, y, s], k) => {
      const spec = specs[(k + seed * 3) % specs.length];
      const tex = makeDialogTexture(spec, {pr: 1});
      const img = tex.image as HTMLCanvasElement;
      const dw = img.width * 0.95 * s, dh = img.height * 0.95 * s;
      ctx.save();
      ctx.shadowColor = 'rgba(0,20,90,0.35)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(img, x, y, dw, dh);
      ctx.restore();
    });
  }, true);

/** sterile floor tiles */
export const floorTexture = () =>
  make('floor', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f4f8ff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#9fbaf0';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(30,91,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, w - 32, h - 32);
  }, true);

/** ceiling light panel strip */
export const ceilTexture = () =>
  make('ceil', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8eefc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 30, w - 80, h - 60);
    ctx.strokeStyle = '#b8c8ee';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 30, w - 80, h - 60);
  }, true);

// ------------------------------------------------------------------ the ILIAD scroll (papyrus fine print, Papyrus font)
export const SCROLL_TILE_M = 21; // metres of scroll per texture tile (texture repeats along the scroll)
const SCROLL_BOOKS = ['I', 'II', 'III'];
const FINE = [
  'By reading this sentence you agree to keep reading.',
  'Cancellation shall take effect upon the heat death of the universe.',
  'Your membership will be paused, not cancelled, until further notice.',
  'Before you go, have you considered staying?',
  'Each page of this scroll is a separate page of this page.',
  'To cancel by phone, please write a letter.',
  'To cancel by letter, please call.',
  'Rage, O Customer, is not a valid reason (see Book XIX).',
  'Fees for reading the fees are listed in Book XXIII.',
  'This clause intentionally left long.',
  'The Member, son of Plus, may depart only upon 24 Books of notice.',
  'Swift-footed users are limited to one page per hour.',
  'Your feedback is important to us and will be ignored in order received.',
  'Hector, tamer of horses, also could not find the cancel button.',
];
export const scrollTexture = () =>
  make('scroll', 768, 6144, (ctx, w, h) => {
    // parchment
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#f3e2b6'], [0.5, '#eed7a2'], [1, '#f3e2b6']]);
    ctx.fillRect(0, 0, w, h);
    // edge burn + fibres
    const eg = ctx.createLinearGradient(0, 0, w, 0);
    eg.addColorStop(0, 'rgba(150,95,30,0.45)');
    eg.addColorStop(0.06, 'rgba(150,95,30,0)');
    eg.addColorStop(0.94, 'rgba(150,95,30,0)');
    eg.addColorStop(1, 'rgba(150,95,30,0.45)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(160,110,40,0.10)';
    ctx.lineWidth = 2;
    for (let y = 7; y < h; y += 13) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + ((y * 37) % 9) - 4);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const seg = h / SCROLL_BOOKS.length;
    SCROLL_BOOKS.forEach((bk, b) => {
      let y = b * seg + 120;
      // ornamental rule
      const rule = (yy: number) => {
        ctx.strokeStyle = '#7a4a12';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(90, yy);
        ctx.lineTo(w - 90, yy);
        ctx.stroke();
        ctx.fillStyle = '#7a4a12';
        ctx.beginPath();
        ctx.arc(w / 2, yy, 9, 0, Math.PI * 2);
        ctx.fill();
      };
      ctx.fillStyle = '#5a2e06';
      if (b === 0) {
        ctx.font = `bold 120px ${FONTS.papyrus}`;
        ctx.fillText('THE ILIAD', w / 2, y + 40);
        y += 110;
        ctx.font = `bold 34px ${FONTS.papyrus}`;
        ctx.fillText('OmniStore Membership Cancellation', w / 2, y);
        y += 46;
        ctx.fillText('Terms & Conditions', w / 2, y);
        y += 50;
      }
      rule(y);
      y += 90;
      ctx.font = `bold 72px ${FONTS.papyrus}`;
      ctx.fillStyle = '#8a2a06';
      ctx.fillText(`BOOK ${bk} of XXIV`, w / 2, y);
      y += 40;
      rule(y);
      y += 80;
      ctx.fillStyle = '#3a2008';
      ctx.font = `italic bold 40px ${FONTS.papyrus}`;
      const opening = b === 0
        ? ['Sing, O Goddess, of the', 'cancellation of the Member,', 'son of Plus, that brought', 'countless pages upon the', 'customers...']
        : b === 1 ? ['Of the Catalogue of Fees,', 'and the ships of surcharges', 'that sailed to the Account...'] : ['Of the Wrath of Customer', 'Service, and the Hold Music', 'that lasted ten years...'];
      opening.forEach((ln) => {
        ctx.fillText(ln, w / 2, y);
        y += 54;
      });
      y += 30;
      ctx.font = `25px ${FONTS.papyrus}`;
      ctx.fillStyle = '#4a2a0a';
      let n = 0;
      while (y < (b + 1) * seg - 60) {
        const sect = `§ ${b + 1}.${n + 1}  `;
        const txt = FINE[(n + b * 5) % FINE.length];
        // wrap to width
        const words = (sect + txt).split(' ');
        let line = '';
        for (const wd of words) {
          const test = line ? line + ' ' + wd : wd;
          if (ctx.measureText(test).width > w - 150) {
            ctx.fillText(line, w / 2, y);
            y += 34;
            line = wd;
          } else line = test;
        }
        if (line) {
          ctx.fillText(line, w / 2, y);
          y += 34;
        }
        y += 14;
        n++;
      }
    });
  }, true);

/** frieze title bar: "ILIAD.html" window title in a Y2K blue gradient (2048x96) */
export const friezeTexture = () =>
  make('frieze', 2048, 96, (ctx, w, h) => {
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#4b9bff'], [0.5, '#1557e6'], [1, '#0a3fd8']]);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 4, w, 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 52px ${FONTS.ui}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,14,80,0.9)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('OmniStore  -  Cancel Membership  -  ILIAD.html', 110, h / 2 + 2);
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(55, h / 2, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#7fe4ff';
    ctx.fill();
    ctx.strokeStyle = '#0a2c80';
    ctx.lineWidth = 4;
    ctx.stroke();
    ['_', '□', '✕'].forEach((g, k) => {
      const x = w - 260 + k * 84;
      rr(ctx, x, 12, 72, 72, 10);
      ctx.fillStyle = k === 2 ? vgrad(ctx, 12, 84, [[0, '#ff9b7a'], [1, '#e2231a']]) : vgrad(ctx, 12, 84, [[0, '#8ec0ff'], [1, '#2f6deb']]);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold 46px ${FONTS.ui}`;
      ctx.textAlign = 'center';
      ctx.fillText(g, x + 36, 50);
    });
  });

/** plaque over the temple door */
export const plaqueTexture = () =>
  make('plaque', 1024, 256, (ctx, w, h) => {
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#f6ecd4'], [1, '#e6d4ac']]);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a07a2a';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#6a3a0a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 92px ${FONTS.papyrus}`;
    ctx.fillText('BOOK I of XXIV', w / 2, h / 2 - 18);
    ctx.font = `bold 40px ${FONTS.papyrus}`;
    ctx.fillText('(cancel page 1 of 15,693 lines)', w / 2, h / 2 + 62);
  });

/** warm marble plaza tiles (one texture over the whole Olympus disc, radial + square pattern) */
export const plazaTexture = () =>
  make('plaza', 2048, 2048, (ctx, w, h) => {
    ctx.fillStyle = '#f2e2cc';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    // big concentric rings of slabs
    for (let r = 40; r < w / 2; r += 58) {
      ctx.strokeStyle = 'rgba(160,110,80,0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      const n = Math.max(8, Math.round((2 * Math.PI * r) / 90));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + (r % 3) * 0.1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a) * (r + 58), cy + Math.sin(a) * (r + 58));
        ctx.stroke();
      }
    }
    // gold inlay rings
    [990].forEach((r) => {
      ctx.strokeStyle = '#d9a441';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    // soft veining
    for (let i = 0; i < 70; i++) {
      const x = ((i * 733) % w), y = ((i * 397) % h);
      ctx.strokeStyle = 'rgba(190,150,120,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 60, y + 30, x + 120, y - 40, x + 200, y + 10);
      ctx.stroke();
    }
  });

/** Y2K scrollbar track (repeats along V): dithered light-blue track with bevelled edges */
export const scrollbarTexture = () =>
  make('scrollbar', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e9effb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b9c8ea';
    for (let y = 0; y < h; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < w; x += 8) ctx.fillRect(x, y, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 10, h);
    ctx.fillStyle = '#6f86c4';
    ctx.fillRect(w - 10, 0, 10, h);
    ctx.fillStyle = '#1b2f8f';
    ctx.fillRect(0, 0, 3, h);
    ctx.fillRect(w - 3, 0, 3, h);
  }, true);
