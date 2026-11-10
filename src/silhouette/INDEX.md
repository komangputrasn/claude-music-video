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
    Crowd.tsx              <Crowd> instanced crowds of identical hooded silhouettes, crowdLayout(), CROWD_LOOKUP
    WorldLyric.tsx         <WorldLyric> the lyrics staged INSIDE the world; sceneLyricLines(), metresForPx(), lyricWindow()
    atmos/  tenure/  sets/  props/    (modules: see §3; each has its own INDEX.md API reference)
  overlays/SilOverlays.tsx <Letterbox> (the only global overlay), <SilOverlays>; <SilCaptions> = unmounted debug tool
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
4. **Framing:** letterboxed 2.39:1 — only y ∈ [138, 942] px is visible. Compose inside that band. Long lenses (fov 18–35), monumental scale, symmetry,
   slow dolly/crane. No fisheye, whip-pans, strobe, split screens. Few cuts (verses 4–8 s shots; chorus cuts on
   downbeats only). Rhythm comes from LIGHT: pulse screens/beams/fog with `bassAt()`/`beatAt()`.
5. **Lyrics live in the world:** there is NO caption overlay. Each scene stages every line it owns
   (`sceneLyricLines(t0, t1)`) with `<WorldLyric>` as part of the shot — projected on fog, on screens, stencilled,
   printed, carved, black against the dawn — legible (cap height ≥ ~26 px; use `metresForPx`) for as long as it is sung,
   words appearing as sung, red control words, gold free words in the final chorus.
6. **Text:** system fonts only (`SFONTS.futura` for signage, `SFONTS.mono` for legal/serials), uppercase, wide
   tracking, bone or authRed, architectural scale. Canvas textures (2D canvas can use the system fonts synchronously).
   No drei `<Text>`. Fonts fall back on Linux (that's fine for previews).
7. **Determinism / perf (CLAUDE.md, DESIGN.md §5):** animate only from `useCurrentFrame()`/`useSongTime()`; per-frame
   mutation only in `useLayoutEffect`; no `useFrame`, `useEffect` for animation, `Math.random`, `Date`. Seeded
   randomness via `rand(seed)`/`noise1()` from `src/lib/time`. Build geometry/materials/textures in `useMemo`;
   redraw canvas textures only when content changes; instance repeated things. Every 3D shot inside `<SilStage>`.
8. **Sound-to-image:** bass pulses TENURE screens; the near-silence 162–166.39 s ("Is that you?") is visually near-silent
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
- **The hood is one cowl, skinned to the rig.** It is a single closed, double-sided loft rebuilt on the CPU every render.
  The crown, brim and face part ride the HEAD joint, the nape blends head → neck → chest, and the hem lies on the upper
  back and shoulders (chest joint). So the back of the hood is always one continuous line from the crown into the back,
  and nothing can swing off the neck (the old "ponytail"). Checked from 8 yaws at head pitch −0.3 / 0.15 / 0.6, in the
  walk, kneel, climb, sit and bed poses, with the phone at the ear and with the hammer (held and swung). A soft point at
  the back of the crown and a brim ~3 cm proud of the forehead make it read as a hood, not a helmet. You no longer need
  to keep his head pitch low or move a bow into the torso: look down with `headPitch` freely (≤ ~0.6).
- **Hood 1 → 0:** the hood flattens, shrinks and swings back over the nape until it lies on the upper back. Below 0.5 the
  hair (and the rig's own hood-down collar) appears and the hood bunches toward the nape; at ≤ 0.02 it is gone. Animate
  it over ~0.6 s. It reads cleanly from behind and in front (Final's pull at 168.35–168.95). In strict profile, around
  hood 0.4–0.5 the falling hood shows for a few frames as a flap behind the neck.
- Props held at the head (the phone at the ear) sit at the side of the hood and partly overlap it. The hand and elbow
  still carry the gesture.
- The hood is not a `LatheGeometry` and not the rig's `hoodBack`/`hoodRing`. Do not hide or extend it from scene code.
  The old local fixes are now redundant and should go: V1Bedroom's `CellGuy` drape (harmless, but plain `SilGuy` now
  does the job) and Pre's `HoodFill` neck sphere (it now pokes out of the cowl as a bump at the nape).
- `<SilPancake>` adds a small knot at the joint between the rig's two tail tubes, which used to show as a V notch in the
  curl from the rear three-quarter (V2Rain WAITING, V1Feeder).

### `<Iris>` — the TENURE mark
`<Iris open?={1} pupil?={0.32} radius?={0.5} intensity?={1.5} color?={S.authRed} time? housing?={true} flicker?={0}
glint?={true} opacity? {...group}/>` — flat disc facing +Z. `open` 0→1 opens it from a pinpoint; `pupil` dilates;
`time` drives blade rotation + a slow scan sweep; `flicker` 0..1 = failing (Final). The bone `glint` in the pupil
fades with `intensity` below 1 (full at ≥ 1, gone at 0), so an iris dimmed to `intensity={0}` is a plain black housing
disc (a dead eye / "black sun") without `glint={false}`. `IRIS_GLSL` exports the drawing function
`vec4 irisLayers(vec2 p, float open, float pupil, float time)` for instanced iris walls (`IrisWall` and `PillowIris`
draw their own glint: it does not follow this rule).

### `<Crowd>` — identical hooded silhouettes (Chorus1, Final)
`<Crowd count?={200} seed? area?={[30,40]} spacing?={1.3} facing?={0} facingJitter?={0.15} time? sway?={1} lookUp?={0}
lookUpSpread?={0.6} hood?={1} exclude?={[[x,z,r]]} rim? color? fog? {...group}/>` — instanced (a handful of draw calls
for hundreds), jittered grid over `area` centred on the origin, everyone faces `facing` (0 = +Z). `exclude` clears
circles (a lane for the Guy walking against them — give him a rim or a light behind him so he separates from the mass).
`crowdLayout(props)` returns the slots. Verified:
`.preview/out/silplay-CrowdTest/` (`silplay CrowdTest`; f150/f195 show a red iris failing above a crowd — a dead iris
leaves its black housing disc: a "black sun").
- `lookUp` 0..1 makes the figures look UP in a staggered wave (Final). The upper body arches back 0.08 rad about the
  waist. The head tilts back 0.8 rad (a quarter at the base of the neck, the rest about the skull base, so the head
  stays over the shoulders). The hood slides 0.35 rad back off the brow and a chin-and-nose profile points at the sky
  (`CROWD_LOOKUP` exports the angles). It reads best side-on (Final's CrowdUp), well from a low front, and least from
  behind. `lookUp={0}` renders byte-identically to the crowd before this feature (checked against HEAD, hooded and bare).

### `<WorldLyric>` — the lyrics, inside the world
`<WorldLyric line={i} time={songT} size?={0.5 /*em, metres*/} mode?='light'|'screen'|'paint'|'dark' maxWidth? align?
anchor?='center'|'top'|'bottom'|'baseline' color? intensity? from? until? reveal?='word'|'line' halo? fog? opacity?
flicker? perWord? font? weight? lineHeight?={1.18} tracking?={0.15} rows? rowScale? verbatim?={false} glow?
redFill?={0} goldGlow?={1} mirror?={true} {...group}/>`
- Words appear one at a time exactly when sung; control words authRed (flash on onset), final-chorus free words dawnGold.
- `light` = additive light projected into haze/onto walls (soft halo, ignores fog); `screen` = emissive letters on a
  TENURE screen; `paint` = matte print/stencil on a surface (fog, no bloom); `dark` = black letters against a bright
  sky/backlight (control/free words get a coloured glow behind them).
- Default window: first sung word → next line's first word. Override with `from`/`until` (e.g. keep a line on a wall
  until the cut). `perWord(i, info)` animates individual words (ash drift, falling letters, flicker per word).
- Anchor: `'center'` (default) | `'top'` (row 0's cap line) | `'bottom'` (last row's baseline) | `'baseline'` (row 0's
  baseline at the origin). Baselines step down by `lineHeight·size`; cap height = 0.7·size.
- Helpers: `sceneLyricLines(t0, t1)` (the lines your scene must stage), `lyricWindow(i)`, `metresForPx(px, dist, fov)`,
  `measureLyric(i|text, size, maxWidth?, {font, weight, tracking, lineHeight, rows, rowScale, verbatim})` →
  `{width, height, rows, rowWidths, rowWords}` (`rowWords` = the balanced wrap's word indices per row, ready to edit and
  pass back as `rows`), `lyricWordColor()`, `displayWord()`.
- Verified: `.preview/out/silplay-Lyrics/` (`silplay Lyrics`): f0 light on fog, f1 screen, f2 paint, f3 dark vs gold,
  f4 per-word ash drift.

**Opt-in extras.** Each default renders byte-identically to the plain component; this was checked against
`silplay Lyrics`, V2Rain, Cancel, Chorus1 and V1Feeder.
- `rows={[[0, 1, 2], [3, 4]]}`: explicit line breaks, word indices per row. Words you don't list are hidden, and
  `maxWidth` is ignored. Rows use the same 0.42 em word gap, `align`/`anchor`/`lineHeight`/`tracking`/`size` and baseline
  convention as the balanced wrap. `rows` equal to the wrap renders byte-identically. Timing is untouched: each word still
  appears when sung, and with `reveal='line'` the block appears at the line's first sung word even if that word is
  hidden. To split one line around a door, dial or slit, use several instances that each list a subset:
  ```tsx
  <WorldLyric line={25} time={t} rows={[[0, 1, 2], [3, 4, 5]]} align="right" size={0.3} position={[-1.1, 2, 0]} />
  <WorldLyric line={25} time={t} rows={[[6, 7, 8], [9, 10]]} align="left" size={0.3} position={[1.1, 2, 0]} />
  ```
  This replaces the local `LyricBlock` (V2Rain), `LyricRows` (Swing, Hold), `RowLyric` (V1Feeder), `rowsPerWord`
  (Chorus1, Cancel) and `placeWords` (V2Car). Their "row 0 baseline at the origin" convention is `anchor="baseline"`.
  The local helpers' `rowGap` is `lineHeight`.
- `rowScale={[1, 1, 2.1]}` (with `rows`): a size multiplier per row, default 1. Row pitch is `lineHeight·size·max(the
  two rows' scales)`. `'top'`/`'baseline'` use row 0's scaled cap height. Glyphs render at the row's size, so no
  `perWord` scale compensation is needed (Cancel's ILIAD row):
  `<WorldLyric line={34} time={t} rows={[[0, 1, 2], [3, 4], [5]]} rowScale={[1, 1, 2.1]} anchor="baseline" …/>`
- `perWord(i, info)` / `glow(i, info)`: `i` is always the word's index in the line, or in `text`, even with `rows`.
  `info` (type `RowWordInfo`) = `{text, start, since, row, x, y, width}` plus the row slot `{col, rowX, rowWidth,
  rowStart}`. `x, y` are the word's left baseline point. `rowX`/`rowWidth` are the row's left edge and width in metres.
  `rowStart` is the onset of the row's first word. Callbacks typed with plain `WordInfo` still fit. V1Feeder's
  `slot.rowCx` = `info.rowX + info.rowWidth / 2`.
- `verbatim` (default false): custom `text` is drawn exactly as given, keeping case and every character. By default
  `displayWord()` upper-cases and strips straight and curly double quotes and `,` `.` `;` `:`, so "03:15" would read
  "0315". Write the case you want.
  Ignored for sung `line`s:
  `<WorldLyric text="$4.99 / NIGHT" verbatim time={t} mode="screen" font={SFONTS.mono} size={0.45} …/>`
- `glow={(i, info) => 0..1}`: the colour of each control/free (red/gold) word, called for those words only. 1 = full
  colour. Values in between scale its flash/glow down. 0 = the word loses its colour but stays visible: a plain black
  letter in `dark`, the base colour in the other modes. Use it to let the last red die without removing the word:
  `glow={(i, w) => (w.since < 0.9 ? 1 : 0)}`.
- `redFill` (default 0 = off): in `'light'`/`'dark'` modes, values > 0 draw control words as SOLID authRed letters at
  this brightness (×0.8 in dark). They use normal blending and keep only a faint red halo (light: `halo×0.45`; dark:
  glow ×0.3). Use it on gold or bright haze, where additive red, or a red glow behind a black letter, tone-maps
  ORANGE: `<WorldLyric line={41} time={t} mode="light" redFill={1} …/>`.
- `goldGlow` (default 1): in `'dark'` mode, a multiplier on the gold glow behind gold words. At 1 the glow is capped
  at 2× gold, which fades on a bright gold sky; values > 1 burn hotter: `goldGlow={1.4}` (Final's BOWL/GROUND).
- `mirror` (default true): `false` makes the words invisible to every camera except the scene's default camera, so
  they don't appear in WetGround's reflection or in render targets. Use it for text high in the sky whose mirror image
  would land somewhere unrelated: `<WorldLyric … mirror={false} />`.
- **Final migration:** `scenes/Final/FinalLyric.tsx` = lib `<WorldLyric redFill={1} />`. Its code default is
  `redFill = 1`; the header comment's "0.9" is stale, and no Final call passes `redFill`. Keep every other prop as is
  (`glow`, `goldGlow={1.4}`, `mirror={false}` are the same props). Verified byte-identical: lib vs FinalLyric with
  redFill 1 + glow drain + goldGlow 1.4 + mirror false over a WetGround on gold, in dark/light/screen modes.
  The lib's `WordInfo`, `WordFx` and helpers are the same, so `lyricFx.ts` keeps working.

### Overlay (already global — scenes never draw it)
`<Letterbox/>` (138 px bars). No captions: see `<WorldLyric>`.

## 3. Modules (each folder has a full API reference in its own `INDEX.md`, with verified preview frames)

| module | import (from a scene) | what's in it | look test |
|---|---|---|---|
| `lib/atmos` | `'../../lib/atmos'` | `Backlight`, `FogLayers`, `LightShaft` (ray-marched volume), `ScannerSweep`, `ScanLine`, `BlindsLight`, `BlindShafts`, `SilRain`, `WetGround` (Reflector), `Motes`, `LightPool` | `silplay Atmos` |
| `lib/tenure` | `'../../lib/tenure'` | `TenureScreen` (+ presets), `TermsScroll`, `Stencil`, `LeaseTags`, `IrisWall`, `GiantLetters`, `FloatingPrice`, clause/lease-code generators | `silplay Tenure` |
| `lib/sets` | `'../../lib/sets'` | `CellRoom` (+ `CELL_SPOTS`, `CELL_CAMERAS`, bed tilt synced to `guySleepyWake`), `Megablock`, `CityGrid`, `Plaza`, `HouseCube` (+ `HOUSE_SPOTS`), `Corridor`, `LaserLines`, concrete materials | `silplay Sets` |
| `lib/props` | `'../../lib/props'` | `Monolith` (feeder: iris, shatter, gold spill, kibble; `monolithSwing`, `pancakeAtMonolith`), `SilHammer`/`HeldSilHammer`/`HungSilHammer`, `PaperBook`/`HeldPaperBook`, `PillowIris`, `PlainBowl`, `SilPhone`/`HeldSilPhone`, `SilEReader`/`HeldSilEReader`, `KibbleSparks` | `silplay SilProps` |

### Hard-won lessons from the module verifiers (read before staging a shot)
- **Never put haze in front of a hero.** A FogLayers card / additive glow between camera and a silhouette turns it
  grey. Start fog BEHIND the subject.
- **Bloom veils silhouettes.** Anything above the bloom threshold directly behind a figure (a Backlight `core`, a
  window seen down a shaft) spreads grey over it. Keep big surfaces behind figures ≤ ~0.85×bone.
- **Red stays red only when it's not over-driven and not on bright grey.** HDR red > ~1.5 tone-maps coral/orange; red
  added on top of bright grey haze desaturates to salmon/pink. For red beams keep intensity ≤ ~1.1 and the haze behind
  them dim. Get presence from spread (halos, haze), not intensity. Iris rings are soft-capped in `IRIS_GLSL`.
- **Silhouettes need a bright ground or background.** A black figure on a black floor below the horizon disappears:
  use low cameras against the backlight, WetGround reflections, LightPools, or a lit wall.
- **Gold rims must stay thin** (strength ≤ 0.6, power ≥ 6) or the figure reads brown, not black.
- **City wides:** SilStage far is 3000 m; for all-distant shots raise `near` (1–5 m) for depth precision.
- **Point lights** in sets are real and global (CellRoom 5, Corridor 1/gate, HouseCube 2): keep the count constant
  within a shot.
- **The Monolith (0.85 m) only reads "huge" next to Pancake from a low (0.2–0.35 m) long-lens camera** with Pancake at
  or behind its front plane; use `pancakeAtMonolith` / `monolithSwing` for the V2Rain nose and the Swing impact.
- **WetGround** costs an extra scene render: one per shot.
