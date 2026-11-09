# TERMS — silhouette cut: library + scene-builder reference

Read `DESIGN-silhouette.md` first (story, palette rules, scene treatments). This file is the **API contract** for
everything under `src/silhouette/`. The Y2K cut (`src/scenes`, `src/lib`, `DESIGN.md`) is a different film: reuse only
the rigs, poses, time/lyrics helpers and `<Stage>`/`<CameraRig>`; never its look (no chrome, pop-ups, toon/ink, HUDs).

## 0. Layout, commands, ownership

```
src/silhouette/
  INDEX.md                 this file
  lib/                     shared pieces of the TERMS cut
    palette.ts             S tokens, GREYS, hdr(), SFONTS, LETTERBOX, cameraFovForVisible(), RED_WORDS/GOLD_WORDS, CHORUS_HITS, SILENCE, IMPACT_T
    Silhouette.tsx         <Silhouette>, <SilKeep>, makeSilhouetteMaterial(), applySilhouette()
    SilCast.tsx            <SilGuy hood>, <SilPancake>
    Iris.tsx               <Iris>, IRIS_GLSL, makeIrisMaterial(), setIrisUniforms()
    SilStage.tsx           <SilStage>, CameraRig (re-export), SIL_BLOOM, SIL_LENS
    atmos/  tenure/  sets/  props/    (modules: see §3–§6)
  overlays/SilOverlays.tsx <Letterbox>, <SilCaptions>, <SilOverlays> (mounted by Layout overlays="silhouette")
  scenes/<Id>/index.tsx    one folder per scene (named export <Id>), plus NOTES.md shot list
  scenes/index.ts          SIL_SCENES map used by the MainSilhouette composition (src/Root.tsx)
  playground/<Name>.tsx    look-dev playgrounds (default export, optional `export const duration = N`)
```

- Scene preview: `node scripts/still.mjs sil <SceneId> [--frames=a,b (scene-local) | --times=s,t (song s) | --n=9] [--no-overlays]`
  → `.preview/out/sil-<SceneId>/f<abs frame>.jpg` + `sheet.jpg`. Open them with the Read tool.
- Playground preview: `node scripts/still.mjs silplay <Name> --frames=…` → `.preview/out/silplay-<Name>/`.
- Whole cut: `node scripts/still.mjs silmain --times=…` (absolute song seconds).
- On the cloud box the script auto-uses the local Chromium with software GL (`swangle`): ~3–15 s per frame. Render only the
  frames you need (6–9 per pass), at the default `--scale=0.5`.
- Typecheck your files: `npx tsc --noEmit -p . 2>&1 | grep silhouette/<your path>`.
- Final render (on the Mac): `npm run render:terms` → `out/buy-now-for-now-terms.mp4`.
- **Ownership:** only edit files in the folder you were given (plus your own playground). Never edit `src/lib/**`,
  `src/scenes/**`, `src/overlays/**`, `src/timeline.ts`, `src/Root.tsx`, `src/Layout.tsx`, or another agent's folder.
  Need a change in shared code? Make a local variant in your folder and report it.

## 1. Rules that every piece must obey (from DESIGN-silhouette.md)

1. **Silhouettes:** every character and hero prop is pure flat black (`S.void`) — no faces, textures, internal shading.
   Use `<SilGuy>`, `<SilPancake>`, or wrap any mesh tree in `<Silhouette>`. A thin rim (`rim={{color, dir}}`) is the
   only allowed edge light. Silhouettes must sit against something BRIGHT (lit fog, a screen, a light shaft, wet
   reflective ground) or they disappear: stage every shot for that.
2. **Colour:** grey world (`S.void/ash/fog/bone`, `GREYS`), **authRed = control only** (locks, paywalls, prices,
   scanners, irises, "BUY NOW"), **dawnGold = owned/free** — forbidden before the hammer impact at 129.2 s except one
   faint foreshadow on the hammer handle in V2Rain; floods only in Final/Outro. No other hues, ever.
3. **Brightness/bloom:** `<SilStage>` blooms anything above ~0.86 after tone mapping. Big backlit fog walls and haze
   must stay at or BELOW bloom (≈0.6–0.85 of bone) or the bloom washes the silhouettes grey. Only screens, beams,
   irises, and the gold spill go above. Red above ~2× intensity turns ORANGE under ACES (reads as gold) — keep red ≤ 2.
4. **Framing:** letterboxed 2.39:1 — only y ∈ [138, 942] px is visible. Compose inside that band; keep the lower-left
   ~1250×60 px of the picture free of key action (captions). Long lenses (fov 18–35), monumental scale, symmetry,
   slow dolly/crane. No fisheye, whip-pans, strobe, split screens. Few cuts (verses 4–8 s shots; chorus cuts on
   downbeats only). Rhythm comes from LIGHT: pulse screens/beams/fog with `bassAt()`/`beatAt()`.
5. **Text:** system fonts only (`SFONTS.futura` for signage, `SFONTS.mono` for legal/serials), uppercase, wide
   tracking, bone or authRed, architectural scale. Canvas textures (2D canvas can use the system fonts synchronously).
   No drei `<Text>`. Fonts fall back on Linux (that's fine for previews).
6. **Determinism / perf (CLAUDE.md, DESIGN.md §5):** animate only from `useCurrentFrame()`/`useSongTime()`; per-frame
   mutation only in `useLayoutEffect`; no `useFrame`, `useEffect` for animation, `Math.random`, `Date`. Seeded
   randomness via `rand(seed)`/`noise1()` from `src/lib/time`. Build geometry/materials/textures in `useMemo`;
   redraw canvas textures only when content changes; instance repeated things. Every 3D shot inside `<SilStage>`.
7. **Sound-to-image:** bass pulses TENURE screens; the near-silence 162–166.39 s ("Is that you?") is visually near-silent
   (one light source, no motion except breath); the chorus entrances 57.75 s and 166.39 s are the only moments the
   whole frame changes brightness at once.

## 2. Core API (`src/silhouette/lib`)

Imports from a scene file (`src/silhouette/scenes/<Id>/index.tsx`):
```ts
import {S, GREYS, hdr, SFONTS, LETTERBOX, cameraFovForVisible, CHORUS_HITS, SILENCE, IMPACT_T} from '../../lib/palette';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {Silhouette, SilKeep} from '../../lib/Silhouette';
import {SilGuy, SilPancake} from '../../lib/SilCast';
import {Iris} from '../../lib/Iris';
// shared engine pieces from the Y2K repo (rigs, poses, time, lyrics):
import {useSongTime, useAbsoluteFrame, beatAt, bassAt, rmsAt, ramp, lerp, clamp01, rand, noise1, sec} from '../../../lib/time';
import {wordTime, LINES} from '../../../lib/lyrics';
import {guyIdle, guyWalk, guySleepyWake, guyHammerSwing, guyClimb, guyPatDog, guyHoldUp, guyPhoneToEar, guySitOn,
        mergePose, mixPose, keyPoses, guyJointMatrix, guyPoint, GUY} from '../../../lib/characters/Guy';
import {pancakeIdle, pancakeWalk, pancakeBeg, pancakeEat, pancakeHappy, pancakeSad, pancakeLie, pancakeAnchor,
        PANCAKE} from '../../../lib/characters/Pancake';
```
(Pose helper details: `src/lib/INDEX.md` §3 — same rigs, same anchors, same units: metres, characters face +Z, feet on y=0.)

### `<SilStage>` — every 3D shot
`<SilStage fog?={{color, near, far}|null} background?={S.void} bloom?={…} lens?={…} camera?={{fov, position}} exposure?>`
env none, ACES, bloom `{strength .85, radius .6, threshold .86}`, lens `{aberration .0007, vignette .55, grain .075,
saturation .92}` (objects you pass are merged over these). Drive the camera with `<CameraRig position target fov roll/>`.
`cameraFovForVisible(v)` converts a desired visible (letterboxed) vertical fov to the camera fov.

### `<Silhouette>` / `<SilKeep>`
`<Silhouette color?={S.void} rim?={{color, strength=1, power=5, dir:[x,y], dirMix=1}} fog?={true} opacity? hide?>`
Swaps every mesh material in its subtree for one flat unlit material each render; hides BackSide (ink hull) meshes.
`userData.silKeep = true` (or wrap in `<SilKeep>`) keeps an object's own material (glowing irises, the hammer's gold
edge). `userData.silHide = true` hides it. `fog` lets far silhouettes fade into the fog colour (depth for crowds).
Always pass `rim.dir` (screen-space vector toward the backlight) — without it the rim outlines every edge (cartoon look).

### `<SilGuy>` / `<SilPancake>`
`<SilGuy pose hood?={1} rim? color? fog? opacity? rightHand? leftHand? {...group}/>` — hood 1 = up (default; most of the
film), 0 = down (Final chorus reveals the spiky-hair outline), in between folds it back. Hand props become silhouettes
too (unless silKeep). `<SilPancake pose rim? color? {...group}/>` — keep him in profile / three-quarter; tail still
(`tailWagAmount: 0`) until after the hammer. Verified: `.preview/out/silplay-Core/` (`silplay Core`).

### `<Iris>` — the TENURE mark
`<Iris open?={1} pupil?={0.32} radius?={0.5} intensity?={1.5} color?={S.authRed} time? housing?={true} flicker?={0}
glint?={true} opacity? {...group}/>` — flat disc facing +Z. `open` 0→1 opens it from a pinpoint; `pupil` dilates;
`time` drives blade rotation + a slow scan sweep; `flicker` 0..1 = failing (Final). `IRIS_GLSL` exports the drawing
function `vec4 irisLayers(vec2 p, float open, float pupil, float time)` for instanced iris walls.

### Overlays (already global — scenes draw neither bars nor captions)
`<Letterbox/>` (138 px bars), `<SilCaptions/>` (lower-left Futura, words appear as sung; red/gold word colouring),
`silCaptionLineAt(t)`, `silWordColor(word, section, since)`.
