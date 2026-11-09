#!/usr/bin/env node
// Preview renderer: renders still frames of ONE scene (or a playground component, or the full video)
// and writes JPGs + a contact sheet you can look at.
//
//   node scripts/still.mjs scene <SceneId> [--frames=0,60,120] [--times=13.2,20] [--n=9] [--scale=0.5] [--no-overlays] [--cols=3]
//   node scripts/still.mjs play <PlaygroundName> [--frames=...] [--n=6]      (src/playground/<Name>.tsx, default export)
//   node scripts/still.mjs main [--times=...] [--frames=...]                  (whole video, absolute frames)
//   TERMS (dystopian silhouette cut, DESIGN-silhouette.md):
//   node scripts/still.mjs sil <SceneId> [--frames=..|--times=..|--n=9] [--no-overlays]   (src/silhouette/scenes/<Id>)
//   node scripts/still.mjs silplay <Name> [--frames=...]                  (src/silhouette/playground/<Name>.tsx)
//   node scripts/still.mjs silmain [--times=...] [--frames=...]           (whole MainSilhouette composition)
//
// Scene frames are LOCAL to the scene (0 = first frame of the scene). --times are song-absolute seconds.
// Each preview bundles ONLY the requested scene/playground, so a broken file elsewhere does not break you.
// Output: .preview/out/<key>/f<frame>.jpg and .preview/out/<key>/sheet.jpg (row-major in the printed order).
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdtempSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args[0];
const name = mode === 'main' ? 'Main' : mode === 'silmain' ? 'MainSilhouette' : args[1];
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
if (!['scene', 'play', 'main', 'sil', 'silplay', 'silmain'].includes(mode) || !name) {
  console.error('usage: node scripts/still.mjs scene <SceneId> | play <Name> | main | sil <SceneId> | silplay <Name> | silmain  [--frames=a,b] [--times=s,t] [--n=9] [--scale=0.5] [--no-overlays]');
  process.exit(2);
}
const FPS = 30;
// Browser + GL: on machines where Remotion cannot download its headless shell (e.g. sandboxed cloud boxes), point it at a
// local Chromium with STILL_BROWSER=/path/to/chrome (auto-detects /opt/pw-browsers/chromium). STILL_GL overrides the GL
// backend (default 'angle'; use 'swangle' on machines without a GPU).
const AUTO_BROWSER = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null;
const BROWSER = process.env.STILL_BROWSER || AUTO_BROWSER;
const GL = process.env.STILL_GL || (!process.env.STILL_BROWSER && AUTO_BROWSER ? 'swangle' : 'angle');
const scale = Number(opt.scale ?? 0.5);
const overlays = !opt['no-overlays'];

// ---- timeline lookup (parse src/timeline.ts without TS tooling)
const timelineSrc = readFileSync(join(ROOT, 'src/timeline.ts'), 'utf8');
const scenes = [...timelineSrc.matchAll(/\{id: '(\w+)',\s*from: (\d+),\s*to: (\d+)/g)].map((m) => ({id: m[1], from: +m[2], to: +m[3]}));

// ---- write entry
const entriesDir = join(ROOT, '.preview/entries');
mkdirSync(entriesDir, {recursive: true});
let key, entry, from = 0, duration;
if (mode === 'scene') {
  const s = scenes.find((x) => x.id === name);
  if (!s) { console.error(`Unknown scene ${name}. Known: ${scenes.map((x) => x.id).join(', ')}`); process.exit(2); }
  if (!existsSync(join(ROOT, `src/scenes/${name}/index.tsx`))) { console.error(`missing src/scenes/${name}/index.tsx`); process.exit(2); }
  key = `scene-${name}${overlays ? '' : '-raw'}`;
  from = s.from; duration = s.to - s.from;
  entry = `import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {Layout} from '../../src/Layout';
import {${name}} from '../../src/scenes/${name}';
const P: React.FC = () => <Layout scenes={{${name}}} overlays={${overlays}} />;
registerRoot(() => <Composition id="P" component={P} durationInFrames={6600} fps={30} width={1920} height={1080} />);
`;
} else if (mode === 'play') {
  const file = join(ROOT, `src/playground/${name}.tsx`);
  if (!existsSync(file)) { console.error(`missing ${file}`); process.exit(2); }
  key = `play-${name}`;
  const m = readFileSync(file, 'utf8').match(/export const duration\s*=\s*(\d+)/);
  duration = m ? +m[1] : 300;
  entry = `import React from 'react';
import {registerRoot, Composition} from 'remotion';
import C from '../../src/playground/${name}';
registerRoot(() => <Composition id="P" component={C} durationInFrames={${duration}} fps={30} width={1920} height={1080} />);
`;
} else if (mode === 'sil') {
  const s = scenes.find((x) => x.id === name);
  if (!s) { console.error(`Unknown scene ${name}. Known: ${scenes.map((x) => x.id).join(', ')}`); process.exit(2); }
  if (!existsSync(join(ROOT, `src/silhouette/scenes/${name}/index.tsx`))) { console.error(`missing src/silhouette/scenes/${name}/index.tsx`); process.exit(2); }
  key = `sil-${name}${overlays ? '' : '-raw'}`;
  from = s.from; duration = s.to - s.from;
  entry = `import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {Layout} from '../../src/Layout';
import {${name}} from '../../src/silhouette/scenes/${name}';
const P: React.FC = () => <Layout scenes={{${name}}} overlays={${overlays ? "'silhouette'" : 'false'}} />;
registerRoot(() => <Composition id="P" component={P} durationInFrames={6600} fps={30} width={1920} height={1080} />);
`;
} else if (mode === 'silplay') {
  const file = join(ROOT, `src/silhouette/playground/${name}.tsx`);
  if (!existsSync(file)) { console.error(`missing ${file}`); process.exit(2); }
  key = `silplay-${name}`;
  const m = readFileSync(file, 'utf8').match(/export const duration\s*=\s*(\d+)/);
  duration = m ? +m[1] : 300;
  entry = `import React from 'react';
import {registerRoot, Composition} from 'remotion';
import C from '../../src/silhouette/playground/${name}';
registerRoot(() => <Composition id="P" component={C} durationInFrames={${duration}} fps={30} width={1920} height={1080} />);
`;
} else if (mode === 'silmain') {
  key = 'silmain';
  duration = 6600;
  entry = `import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {RemotionRoot} from '../../src/Root';
registerRoot(RemotionRoot);
`;
} else {
  key = 'main';
  duration = 6600;
  entry = `import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {RemotionRoot} from '../../src/Root';
registerRoot(RemotionRoot);
`;
}
const entryFile = join(entriesDir, `${key}.tsx`);
writeFileSync(entryFile, entry);

// ---- frames (absolute within the composition)
let frames;
const sceneMode = mode === 'scene' || mode === 'sil';
if (opt.frames) frames = String(opt.frames).split(',').map(Number).map((f) => f + (sceneMode ? from : 0));
else if (opt.times) frames = String(opt.times).split(',').map(Number).map((t) => Math.round(t * FPS));
else {
  const n = Number(opt.n ?? 9);
  frames = Array.from({length: n}, (_, i) => from + Math.round(((i + 0.5) / n) * duration));
}
const maxF = sceneMode ? from + duration - 1 : duration - 1;
frames = frames.map((f) => Math.max(sceneMode ? from : 0, Math.min(maxF, f)));

// ---- concurrency slots (keeps the machine from drowning when several previews run at once)
const SLOTS = Number(process.env.PREVIEW_SLOTS || 3);
const lockDir = join(ROOT, '.preview/locks');
mkdirSync(lockDir, {recursive: true});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
const acquire = async () => {
  for (;;) {
    for (let i = 0; i < SLOTS; i++) {
      const d = join(lockDir, `slot-${i}`);
      try {
        if (existsSync(d) && Date.now() - statSync(d).mtimeMs > 6 * 60_000) rmSync(d, {recursive: true, force: true});
        mkdirSync(d);
        return d;
      } catch {}
    }
    await sleep(1500);
  }
};
const release = () => { if (slot) { try { rmSync(slot, {recursive: true, force: true}); } catch {} slot = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });
process.on('SIGTERM', () => { release(); process.exit(143); });

const outDir = join(ROOT, '.preview/out', key);
rmSync(outDir, {recursive: true, force: true});
mkdirSync(outDir, {recursive: true});
const bundleDir = mkdtempSync(join(tmpdir(), 'bnfn-bundle-'));

const t0 = Date.now();
let serveUrl;
try {
  serveUrl = await bundle({entryPoint: entryFile, outDir: bundleDir, enableCaching: false, publicDir: join(ROOT, 'public'),
    onProgress: () => {}});
} catch (e) {
  console.error('BUNDLE FAILED:\n' + (e?.message || e));
  rmSync(bundleDir, {recursive: true, force: true});
  process.exit(1);
}
const t1 = Date.now();
slot = await acquire();
const touch = setInterval(() => { try { if (slot) { const now = new Date(); import('node:fs').then((fs) => fs.utimesSync(slot, now, now)); } } catch {} }, 20_000);
const logs = [];
let browser;
let failed = 0;
try {
  browser = await openBrowser('chrome', {chromiumOptions: {gl: GL}, ...(BROWSER ? {browserExecutable: BROWSER} : {})});
  const comp = await selectComposition({serveUrl, id: mode === 'main' ? 'Main' : mode === 'silmain' ? 'MainSilhouette' : 'P', puppeteerInstance: browser, chromiumOptions: {gl: GL},
    onBrowserLog: (l) => logs.push(l)});
  for (const f of frames) {
    const file = join(outDir, `f${String(f).padStart(5, '0')}.jpg`);
    try {
      await renderStill({composition: comp, serveUrl, frame: f, output: file, imageFormat: 'jpeg', jpegQuality: 88, scale,
        puppeteerInstance: browser, chromiumOptions: {gl: GL}, timeoutInMilliseconds: 90_000, overwrite: true,
        onBrowserLog: (l) => logs.push({...l, frame: f})});
      const local = sceneMode ? ` (scene-local ${f - from})` : '';
      console.log(`frame ${f}${local}  t=${(f / FPS).toFixed(2)}s  -> ${file}`);
    } catch (e) {
      failed++;
      console.error(`frame ${f} FAILED: ${String(e?.message || e).split('\n').slice(0, 12).join('\n')}`);
    }
  }
} finally {
  clearInterval(touch);
  try { await browser?.close({silent: true}); } catch {}
  release();
  rmSync(bundleDir, {recursive: true, force: true});
}
const errs = logs.filter((l) => l.type === 'error' || l.type === 'warning');
const uniq = [...new Set(errs.map((l) => `[${l.type}] ${String(l.text).slice(0, 300)}`))].slice(0, 15);
if (uniq.length) console.log('Browser console (errors/warnings, deduped):\n  ' + uniq.join('\n  '));

// ---- contact sheet
const ok = frames.map((f) => join(outDir, `f${String(f).padStart(5, '0')}.jpg`)).filter((p) => existsSync(p));
if (ok.length > 1) {
  const cols = Number(opt.cols ?? (ok.length <= 4 ? 2 : 3));
  const rows = Math.ceil(ok.length / cols);
  const tmp = mkdtempSync(join(tmpdir(), 'bnfn-sheet-'));
  ok.forEach((p, i) => copyFileSync(p, join(tmp, `${String(i).padStart(3, '0')}.jpg`)));
  const sheet = join(outDir, 'sheet.jpg');
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, '%03d.jpg'), '-frames:v', '1',
      '-vf', `scale=640:360,pad=644:364:2:2:white,tile=${cols}x${rows}:color=white`, '-q:v', '3', sheet]);
    console.log(`contact sheet (${cols} cols, row-major in the order above): ${sheet}`);
  } catch (e) { console.error('sheet failed', e.message); }
  rmSync(tmp, {recursive: true, force: true});
}
console.log(`bundle ${((t1 - t0) / 1000).toFixed(1)}s, render ${((Date.now() - t1) / 1000).toFixed(1)}s`);
process.exit(failed ? 1 : 0);
