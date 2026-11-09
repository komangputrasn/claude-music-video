# `lib/tenure`: TENURE iconography and monumental typography (TERMS cut)

TENURE is the faceless provider ("Own nothing. Lack nothing."). Its mark is the red `<Iris>` (core lib). This module
covers its in-world text and signage: giant screens, terms of service scrolling up facades, stencilled lease numbers,
fields of lease tags, walls of irises, 30-storey letters, and prices projected on fog (DESIGN-silhouette §1, §2.5, §3, §4).

All diegetic text is **bone or authRed** (paint can also be a dark grey on bright walls). It is uppercase, set in Futura
(`SFONTS.futura`) for signage and Andale Mono/Courier (`SFONTS.mono`) for legal text and serials, and drawn into
canvas textures. No other hues, no decoration, no downloads.

```ts
// from src/silhouette/scenes/<Id>/index.tsx
import {
  TenureScreen, SCREEN_PRESETS, screenDims, screenFacePoint, drawTenureScreen, resolveScreenContent, screenInkColor,
  TermsScroll, tenureClauses, tenureClauseItems, leaseCode, leaseNumber, TENURE_CLAUSES, TENURE_SLOGAN,
  Stencil, stencilSize, makeStencilCanvas,
  LeaseTags, leaseTagGrid, leaseTagBox, leaseTagScatter, mergeTagSets, leaseTagsLit, LEASE_TAG_ASPECT,
  IrisWall, irisWallCell, irisWallSize,
  GiantLetters, giantLettersLayout, formatLeaseTimer,
  FloatingPrice,
} from '../../lib/tenure';
```

Conventions: units are metres, +Y is up, everything faces **+Z**, and every component takes group props (`position`,
`rotation`, `scale`, …). Pass **`time` in seconds** (song or scene time). Without it the scroll, flicker, blades and
timers freeze. Every emissive mesh is `userData.silKeep`, so it keeps glowing inside a `<Silhouette>` wrapper.

Verified look-dev: `src/silhouette/playground/Tenure.tsx` (`node scripts/still.mjs silplay Tenure --frames=…`); the frames
are listed in §8.

---

## 1. `<TenureScreen>`: monumental emissive slab

```tsx
<TenureScreen width?={16} height?={9} content?="wordmark" background?="black" ink? intensity?={1.3} pulse?={0}
              time?={t} frame?={true} reveal? flicker?={0} haze?={0.35} hazeColor? grid?={0.22} pixel?
              depth? border? resolution?={2048} fog?={0.35} irisOpen?={1} irisFlicker? renderOrder? {...group}/>
```
- **Origin:** bottom centre of the slab's **back** face, so it can be mounted flush on a facade (`position` = the facade
  surface). The glowing face spans x ∈ [-w/2, w/2], y ∈ [border, border+h], z = depth. `screenDims(props)` returns
  `{w, h, border, depth, outerW, outerH}`, and `screenFacePoint(u, v, props)` returns a local point on the face
  (u, v ∈ 0..1 from bottom-left).
- `width/height` set the size of the glowing face; the black frame adds `border` (default 1.8% of the short side).
- `content` takes a preset name (`SCREEN_PRESETS`):

  | preset | what | default colours |
  |---|---|---|
  | `'wordmark'` | live red iris + **TENURE** + "OWN NOTHING. LACK NOTHING." | bone wordmark, red slogan |
  | `'title'` | "BUY NOW, FOR NOW" on a **full-red slab** (Intro) | void ink on red |
  | `'price'` | "$4.99 / NIGHT" + "SLEEP · METERED" | red / bone |
  | `'sleep'` | iris + "SLEEP · METERED" + billing line | red / bone |
  | `'declined'` | "PAYMENT DECLINED" + code line | red / bone |
  | `'plusOnly'` | iris + "PLUS ONLY" + "NUTRITION UNIT · UPGRADE TO TENURE PLUS" | red / bone |
  | `'identity'` | "IDENTITY NOT ON PLAN" + "ACCESS REVOKED …" | red / bone |
  | `'thermal'` | "THERMAL TIER" + seat-heat line | bone / red |
  | `'upgrade'` | "UPGRADE TO CONTINUE" + "YOUR PLAN DOES NOT INCLUDE THIS" | red / bone |

  You can also pass `string[]` (the first line is big Futura, the rest small mono) or a custom
  `{lines, iris?, chrome?, header?, footer?}`. A line is `{text | spans: [{text, ink?, opacity?}], size (font px as a
  fraction of face height), font: 'futura'|'futuraCond'|'mono', weight, ink, opacity, tracking (em), gap (space above,
  fraction of H)}`. Lines auto-shrink to fit the width. `iris: 0.3` reserves a slot above the lines where a live `<Iris>`
  is drawn. `chrome` adds the system furniture: a corner iris mark with "TENURE", the lease number, rules and a footer.
  It defaults to on, except for `wordmark` and `title`.
- `background: 'black' | 'red'`; `ink: 'red' | 'bone' | 'void'` overrides the ink of every line (for example a bone-on-black
  `declined`). Ink that would vanish flips: red ink prints **void on a red slab** and void ink prints bone on black, so
  every preset has a full-red variant (`content="declined" background="red"`, verified f00815).
- `screenInkColor(ink, intensity)` returns the HDR colour of an ink, for matching spill light elsewhere.
- `reveal={n}` draws only the first n characters across all lines. Letters appear in their final positions, which gives
  the letter-by-letter title.
- `pulse` (0..1, drive it with `bassAt(absFrame)`) brightens the face, iris and haze without redrawing. The face is
  capped at 2× on black screens and 1.6× on a full-red slab (unless `intensity` itself is set higher): a whole slab of
  authRed above ~1.6× already reads salmon under ACES. `flicker` (0..1) makes the whole screen fail (Final).
  `intensity` should stay ≤ ~1.6 for red.
- `haze` is an additive glow of lit fog around and in front of the screen. It stays below bloom, and figures standing in
  front occlude it. `grid` sets LED-cell contrast; the cells and scanlines fade out when smaller than ~3 px (no moiré).
- **The canvas is redrawn only when `content/background/ink/reveal` change** (compared as JSON, so inline object literals
  are fine). Do not animate a span's opacity continuously, because every change redraws a 2048-px canvas. Use hard switches
  such as the "BUY NOW," dim on the downbeat, or `intensity`/`pulse`.
- `drawTenureScreen(canvas, resolveScreenContent(content, bg, ink), reveal)` puts the exact same drawing on any canvas
  (a phone, a door panel or a printer slit display).

Recipe (Intro title): `content={{chrome: false, lines: [{spans: [{text: 'BUY NOW, ', opacity: t >= 11.26 ? 0.16 : 1},
{text: 'FOR NOW'}], size: 0.3, tracking: 0.2, ink: 'void'}]}} background="red" reveal={…}`.

## 2. `<TermsScroll>`: terms of service scrolling up a facade like credits

```tsx
<TermsScroll width?={30} height?={80} speed?={1.2} time?={t} fontSize?={1.2} color?={S.bone} intensity?={1.0}
             opacity?={1} seed?={0} columns?={1} align?="left" fade?={0.14} blend?="add" fog?={0.85}
             lineSpacing?={1.4} renderOrder? {...group}/>
```
- **Origin:** bottom centre of the covered area; it faces +Z. Place it ~0.1–0.3 m in front of the facade.
- The text is numbered mono clauses with hanging indents and `§ 14  CONTINUITY OF SERVICE` section headers. One canvas
  (≤ 2048×4096) is drawn once per `seed/width/fontSize/columns`, and the scroll comes from the texture offset in the
  shader (no per-frame redraw). The text fades in at the bottom and out at the top. The loop repeats seamlessly, with
  at least 3 blank rows at the seam, so the restart of the numbering reads as a page break.
- `speed` is in m/s (credits pace on a skyscraper is ~1.5–2.5). `fontSize` is the em size in metres: 1.2–1.6 m reads at
  city scale. Very wide facades at small font sizes hit the 2048-px width cap and soften.
- `color`: bone (projected terms) or authRed (control). `blend: 'add'` (light on a dark facade) or `'normal'`
  (paint-like on bright walls).
- Data: `tenureClauses(seed, n)` returns `["14.3(b) LESSEE ACKNOWLEDGES …", …]`; `tenureClauseItems(seed, n)` returns
  `{num, text, section, sectionTitle?}`. `TENURE_CLAUSES` is the pool of 44 cold clauses (sleep as a service, metered
  light, doors answer to the Plan, the dog is a dependent of the Plan, repossession in motion, "DAWN IS NOT INCLUDED IN
  ANY PLAN", …). `leaseCode()` returns **"LEASE 0315-77"** (the Guy's lease, 3:15 AM); `leaseCode(seed)` returns a seeded
  code; `leaseNumber()` returns "0315-77". `TENURE_SLOGAN` is the slogan.

## 3. `<Stencil>`: spray-stencilled decal text

```tsx
<Stencil text="LEASE 0315-77" font?="futura" weight?={700} size?={0.3} color?={S.bone} intensity?={0.55}
         opacity?={1} wear?={0.35} seed? bridges?={true} overspray?={0.5} tracking?={0.14} anchor?="center"
         lineSpacing?={1.45} glow?={false} renderOrder? {...group}/>
```
- `size` is the **cap height** in metres. The plane is bigger to make room for overspray padding;
  `stencilSize(text, {size, font, tracking})` returns `[w, h]`, so you can fit text to a surface. The origin is the centre
  of the text block, and `anchor` sets the horizontal origin.
- Multi-line text uses `'\n'`. The stencil look comes from bridges in closed letters (`ABDOPQR0689`), soft overspray and
  speckles, plus seeded `wear`: mottled fade, chips and scratches. The default seed is a hash of the text.
- Paint uses `intensity` 0.4–0.7 (it does not glow). With `glow` it blends additively at 1.2–2 for light-stencils (for
  example "PAYMENT DECLINED" stencilled in light across his silhouette).
- Place it ~1 cm in front of the surface; it already uses a negative polygonOffset.
- Recipe (feeder): `<Stencil text={'NUTRITION UNIT\nPLUS ONLY'} size={0.085}/>` and
  `<Stencil text={leaseCode()} font="mono" size={0.1}/>` on a 1.5 m-wide face.

## 4. `<LeaseTags>`: thousands of glowing lease tags in one draw call

```tsx
<LeaseTags positions?={Float32Array|number[]|[x,y,z][]} facing?={yaw[]} grid?={{width, height, cols, rows, fill, jitter}}
           scatter?={{size: [w, h, d]}} count?={500} seed?={0} time?={t}
           offFrom?={∞} offTo? offOrder?="random" offJitter?={0.25} onFrom?={-∞} onTo?
           flicker?={0.15} intensity?={1.6} size?={0.6} minPx?={1.6} billboard?={false} color?={S.authRed}
           fog?={0.75} outDur?={0.45} renderOrder? {...group}/>
```
- Each tag is a small red rectangle with an iris dot, a lease number and a bar code, taken from a shared 4×8 atlas.
  `size` is the width in metres; the aspect is 4:1 (`LEASE_TAG_ASPECT`).
- Placement, in this priority order:
  - `positions`, with optional per-tag `facing` yaw.
  - `grid`: a building face on the plane z=0, origin at base centre, x ∈ [-w/2, w/2], y ∈ [0, h].
  - `scatter` + `count`: a box, best with `billboard`.
- Helpers: `leaseTagGrid(opts)`; `leaseTagBox({width, depth, height, density, fill, seed, x, z})` gives all 4 facades of
  a block with yaw; `leaseTagScatter`; `mergeTagSets(...sets)` returns `{positions, facing}`. Merge a whole city into ONE
  `<LeaseTags>` (the verified city shot is ~200k tags on 52 blocks in one call). **Memoise computed position arrays** (`useMemo`), because the
  geometry is rebuilt when the array identity changes.
- **Going dark one by one:** each tag dies at a deterministic time in `[offFrom, offTo]` (same clock as `time`). The order
  comes from `offOrder` (`'random' | 'left' | 'right' | 'up' | 'down' | 'centre'`) mixed with `offJitter`. A tag stutters
  for `outDur` s, then leaves a short afterglow. `onFrom/onTo` light tags up one by one with a stutter.
  `leaseTagsLit(time, offFrom, offTo, onFrom?, onTo?)` returns the lit fraction (0..1); use it to dim the haze or spill
  that belongs to the wall.
- `minPx` keeps far tags as glowing dots of at least that many pixels (energy-scaled), so a city reads as a field of red
  points instead of shimmering away. All animation runs in the shader from uniforms, with no per-frame uploads.

## 5. `<IrisWall>`: a city wall of irises in one draw call

```tsx
<IrisWall cols?={60} rows?={34} spacing?={1.6} radius?={0.55} time?={t} open?={1} pupil?={0.3} intensity?={1.4}
          wave?={{center: [x, y], start, speed: 12, width: 6, mode: 'open' | 'pulse'}} blink?={0.06} dead?={0.02}
          seed?={0} hex?={false} skip?={[[col, row]]} wall?={S.void} housing?={true} flicker?={0} fog?={1}
          renderOrder? {...group}/>
```
- It uses the exact `<Iris>` drawing (`IRIS_GLSL` from `../Iris`), with per-instance pupil, blade phase and brightness.
  **Origin:** base centre of the wall; it faces +Z.
- `irisWallCell(col, row, {cols, rows, spacing, hex})` returns the local `[x, y, 0]` of an iris, and `irisWallSize(...)`
  returns `[w, h]`.
- **Intro recipe (pull-back):** put a hero `<Iris>` at `irisWallCell(c, r)` with z +0.02, `skip={[[c, r]]}` that cell, and
  set `wave={{center: [heroX, heroY], start: t0, speed: 26, width: 10, mode: 'open'}}`. The wall's irises stay closed
  (red pinpoints) until the front reaches them, then open, while the camera pulls back.
- `mode: 'pulse'` sends a bass hit rippling over open irises: they flare and dilate as the ring passes (the flare is
  capped at 2× authRed overall, `intensity × brightness ≤ 2`, so it never turns orange; the pupil dilation carries the
  hit). `blink` is the
  fraction of irises that blink sparsely and deterministically; `dead` is the fraction of dim dead irises; `flicker`
  (0..1) makes them fail out of sync (Final).
- Small on screen, the shader swaps the fine blade detail for a soft averaged ring (anti-moiré LOD). The backing `wall`
  plane uses polygonOffset, so it never z-fights at range.

## 6. `<GiantLetters>`: 30-storey letters that dim, flicker and fall

```tsx
<GiantLetters text="BUY NOW" height?={60} font?="futura" weight?={600} color?={S.authRed} intensity?={1.6}
              spacing?={0.2} wordGap?={0.55} depth? margin?={0.12} backing?={true} time?={t}
              perLetter?={(i, n, ch) => ({on, intensity, flicker, fall, fallDir, timer})}
              timers?={false} timerSize?={0.11} grid?={0.28} unlit?={0.22} fog?={0.55} renderOrder? {...group}/>
```
- `height` is the **cap height** in metres (a storey is ≈ 3.3 m; 30 storeys ≈ 100 m). Each letter is a thin black slab
  (z ∈ [-depth, 0]) with an additive LED face cut from a cached canvas glyph (crisp core plus a baked soft halo). Red
  barely trips bloom, so the halo is in the texture; it only shows outside the crisp glyph, so the core stays at
  `intensity` (≤ 2).
- **Origin:** base centre of the whole word. `giantLettersLayout(text, {height, spacing, …})` returns
  `{letters: [{ch, x, boxW}], width}`; use it to put things at a letter's foot or to fit the word to the frame.
- `perLetter` is called every render; derive its values from your frame:
  - `on` (0..1): 0 shows an unlit grey glyph.
  - `intensity`: multiplier on the global intensity.
  - `flicker` (0..1): deterministic from `time`.
  - `fall` (0..1): the letter rotates about its **base edge**, gravity-eased, with a slight seeded twist; at 1 it lies
    flat.
  - `fallDir`: 1 falls forward, face down onto the plaza; -1 falls backward, face up to the sky.
  - `timer`: seconds as a number gives "00:00:12" (ceil); a string of `0-9 : - .` and space is shown as is.
- `timers` reserves the readout band under each glyph. The digits come from a digit-atlas shader, so counting down
  costs **no canvas redraws**. Spaces leave a `wordGap`, and punctuation draws without a slab.

## 7. `<FloatingPrice>`: a price line projected on fog

```tsx
<FloatingPrice text?="$4.99 / NIGHT" size?={2.4} color?={S.authRed} intensity?={1.5} time?={t} font?="futura"
               weight?={500} tracking?={0.12} haze?={0.8} scan?={0.35} breakup?={0.55} depth? flicker?={0.1}
               fog?={0.6} opacity?={1} renderOrder? {...group}/>
```
- `size` is the cap height in metres. The origin is the centre of the text; it faces +Z and is double-sided.
- It is soft additive text: a crisp core with a mid halo and a wide haze cloud, faint scanlines drifting upward
  (anti-moiré), and drifting value-noise "fog density" breakup (it only thins the projection). Three stacked layers
  (± `depth`, default 0.5×size) give it volume; the halos sit outside the crisp letters, so the core peaks at about
  1.2 × `intensity` (≈ 1.8 at the default 1.5). The projector's slight instability is deterministic from `time`.
- Put it in front of **ash or dark fog**. Additive red on bone-bright fog mostly disappears, and on mid-grey fog it reads
  pinkish (red light + grey), which is physically right.
  For neutral projected info, use bone at intensity ~1.
- Recipe (Chorus1 house): a black 11 m cube with `<FloatingPrice text="$4.99 / NIGHT" size={1.9}/>` ~4 m above it and
  `<FloatingPrice text="SLEEP · METERED" font="mono" size={0.55} color={S.bone} intensity={1}/>` under it.

## 8. Verified preview frames (`.preview/out/silplay-Tenure/`)

| frame | shot | shows |
|---|---|---|
| `f00040.jpg` | A | `TenureScreen` wordmark on a facade at 155 m; Guy + Pancake against ground fog |
| `f00100.jpg` | B | full-red `title` slab mid-`reveal` ("BUY NOW,"), with bone `declined` and red `upgrade` flanking it |
| `f00150.jpg` | B | the same after the hard dim: "BUY NOW," at 16%, "FOR NOW" full; silhouette against the red slab |
| `f00200.jpg` | C | `TermsScroll` up a 230 m tower (fontSize 1.5, speed 2.4); tiny figure in the lit entrance |
| `f00280.jpg` | D | `Stencil`s on the feeder monolith (bridges, wear, mono lease line) + iris slot; Pancake silhouette looking up |
| `f00350.jpg` | E | `LeaseTags` grid wall behind the Guy (~3.3k tags), starting to go dark |
| `f00385.jpg` | E | the same wall ~90% dark (random order), haze dimmed with `leaseTagsLit` |
| `f00440.jpg` | F | ~200k `LeaseTags` on 52 blocks (`leaseTagBox` + `mergeTagSets`), figure in a red plaza pool |
| `f00495.jpg` | G | `IrisWall` close on the hero iris, with the open-wave spreading through closed pinpoints |
| `f00540.jpg` | G | pulled back: thousands of irises (96×40) on the wall at night in fog, figure at its foot |
| `f00600.jpg` | H | `GiantLetters` "BUY NOW" (cap 75 m) with lease timers; crowd silhouettes at the base |
| `f00628.jpg` | H | letters flickering and falling (B/U/Y flat, N/O tilting, one falling backward) |
| `f00690.jpg` | I | `FloatingPrice` "$4.99 / NIGHT" + bone "SLEEP · METERED" over the black house cube |
| `f00760.jpg` | J | every status preset on one facade (price, sleep, plusOnly, identity, thermal, wordmark) |
| `f00815.jpg` | K | edge paths: full-red `declined` (red ink → void) at `pulse={1}` (capped), glow `Stencil` "PAYMENT DECLINED", 2-column centred `TermsScroll`, hex `IrisWall` with a `'pulse'` ripple, scattered `billboard` `LeaseTags` starting to light up (`onFrom/onTo`) |
| `f00845.jpg` | K | the same 1 s later: most scattered tags lit, the pulse ring near the iris wall's edge |

## 9. Caveats for scene builders

- **Fonts:** Futura and Andale Mono fall back on Linux (DejaVu Sans / DejaVu Sans Mono), so widths differ on the Mac
  render. Screens auto-fit their lines. For Stencil and GiantLetters, compute sizes at runtime (`stencilSize`,
  `giantLettersLayout`) instead of hard-coding widths.
- **Red and bloom:** authRed carries little luminance, so it only blooms above ~3× and ACES turns it orange above ~2×.
  These components bake their glow into the textures (halo channels) and cap red at ≤ 2. Do not crank `intensity` to
  get glow; use `haze`.
- **Fog:** emissive pieces are attenuated by fog (`fog` prop) instead of turning grey; frames and slabs fog like any
  surface. Big screens use `fog` 0.35 by default, so a far screen's black still lifts slightly toward the fog colour.
- **Depth at range:** faces sit in front of their slabs, and the slabs use polygonOffset. This is verified at 580 m
  (GiantLetters) with the stage's near plane of 0.1. If you add your own geometry right behind a face, give it a
  positive polygonOffset too.
- **Transparency order:** screen haze, terms, tags, letter faces and prices are additive with `depthWrite` off.
  Silhouettes in front occlude them correctly. Against other transparent fog planes (the atmos module), set
  `renderOrder` when sorting looks wrong.
- **Redraw costs:** TenureScreen redraws its canvas only on content change; TermsScroll, Stencil and FloatingPrice draw
  once per text or layout. GiantLetters glyphs, the lease-tag atlas and the timer atlas are module-level caches that are
  shared and never disposed.
- `LeaseTags` reads the viewport height via `useThree`, so it must be inside `<SilStage>` (like every 3D piece).
- Colour discipline is the scene's job: these components accept a `color`, but only `S.authRed`, `S.bone` (or greys for
  paint) belong here. dawnGold is never TENURE.
- No core files were changed and no local variants of core files were needed.
