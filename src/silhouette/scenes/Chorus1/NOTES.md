# Chorus1 — "The machine at full power" (TERMS cut)

Absolute frames 1732–2777 (song 57.75–92.56 s, 30 fps; scene-local = absolute − 1732). Eight monumental, symmetrical
shots, cut on downbeats only (the first frame at or after 61.56, 65.90, 70.24, 74.61, 78.95, 83.31, 87.63). Each shot
holds 2 bars. Rhythm comes from light: every screen, iris, cage, gate strip and the red dot pulses with `bassAt()`.
Every sung line lives in the world through `<WorldLyric>`: projected, stencilled, carved in light, on screens, standing
on the causeway. Control words are authRed and there is no gold anywhere. The Guy is `SilGuy`, hood up. Pancake is
`SilPancake` in profile, ears down, tail still.

Files: `index.tsx` (shot table, one `<SilStage>` keyed per shot), `common.tsx` (staging helpers: `CancelButton`,
`FacadeWithOpening`, `Slab`, `BoxRow`, `GlowCard`), one file per shot `Shot*.tsx`. Explicit line breaks use the lib's
native `<WorldLyric rows anchor="baseline">` (the old local `rowsPerWord` helper is gone).

| # | shot | local frames | song s | lyric / beat sync | camera | what reads in silhouette (sound off) |
|---|---|---|---|---|---|---|
| A | **BUY NOW** (`ShotBuyNow`) | 0–114 | 57.75–61.56 | [12] "You said 'Buy now,' but you meant 'for now,'". Opens hard on the 57.75 slam: bright high-contrast frame from frame 0. B-U-Y flare on "Buy" 58.94, N-O-W on "now" 59.20. On "for" 60.70 the lease timers under every letter drop from 23:59:xx to seconds and race down (00:00:09 → 00:00:06). | Low (5.5 m), dead-centre, long lens (visible fov 24), slow push-in (4.5%). Distance fitted at runtime so the word fills ~80% of the width on any font. | 30-storey red BUY NOW on black slabs at the far end of a wet black plaza; a crowd of identical hooded figures stands still facing it, black against the letters' red reflection. Towers with terms scrolling up their faces and red lease tags frame it. The line is light projected on the cloud deck above the sign. |
| B | **Whole house plan** (`ShotHouse`) | 115–244 | 61.56–65.90 | [13] "you put my whole house on a plan somehow." Laser cage builds bottom → top from "put" 62.62 to "house" 63.63. On "plan" 64.66 the price snaps on with a projector stutter. Cage packets pulse on the bass. | Low (0.85 m), symmetrical, looking up at the cube (fov 30), slow push-in. | The house: a black cube backlit by city haze on wet ground, inside a red laser cage. The line is stencilled in bone paint on its face like a repossession notice, in four fixed rows (YOU PUT MY / WHOLE HOUSE / ON A PLAN / SOMEHOW), so the block cannot rewrap on another font. "$9.99 / MO" plus "WHOLE HOUSE PLAN · AUTO-RENEW" floats in the fog above it, clear of the cage's top edge (no laser line through the text). He stands small at the side, facing his caged house. |
| C | **Upgrade to continue** (`ShotCorridor`) | 245–375 | 65.90–70.24 | [14] "I'm done with 'upgrade to continue,'" plus [15] "click" 69.48. Gates shut far → near: g7 on "upgrade" 67.48, then g6/g5 every 0.24 s, g4 on "to" 68.44, g3 on "continue" 68.72, g2 at 69.04. Red strips pulse on the bass. | Eye-level centre (3.9 m), one-point perspective into the slot (fov 26), slow push-in. | A monumental wall of dark board-formed concrete (self-lit just enough to read) with one tall slot: a corridor of gates to a doorway of light, and him small in its mouth, black against the lit floor and a pool of light. The line is cut in light into the wall on both sides of the slot: I'M DONE / WITH, then UPGRADE TO / CONTINUE. "CLICK" lights over the lintel just before the cut. The gates close in sequence and the far light dies bay by bay. |
| D | **Click to cancel: the receding screen** (`ShotCancel`) | 376–506 | 70.24–74.61 | [15] "click to cancel, I'm cancelling you." Words appear on the screen as sung. The button and screen pulse on the bass. | Follows him at walking pace from 24 m behind, low (1.45 m), fov 24. | An endless colonnade on wet stone: pillars at ±23 m flank the screen, black against lit haze seen through the gaps. At its end a TENURE screen with a red CANCEL button floats over a band of light. He walks toward it, black against the light band and the button's red reflection. The screen slides away faster than he walks (92 → 128 m from the camera) while the pillars keep coming. Rows: CLICK TO CANCEL, / I'M CANCELLING YOU. |
| E | **Against the crowd** (`ShotCrowd`) | 507–636 | 74.61–78.95 | [16] "You said 'Buy now,' but you meant 'for now,'". Screens, red slabs and the iris band pulse on the bass. An iris-wall pulse ripples from 75.2. | Low (1.25 m), frontal, fov 24, slow pull toward him as he approaches. | Hundreds of identical hooded silhouettes stand still, all facing a wall of screens: the line on the great screen, BUY / NOW on two red slabs, irises above. He is the one figure walking the other way, toward us, out of a lane through them, with a pool of light behind him and a bone rim. |
| F | **Dog's breakfast** (`ShotPancake`) | 637–767 | 78.95–83.31 | [17] "and my dog's breakfast is locked in a box on the ground." LOCKED flashes red at 80.72 (flash capped at ~1.1× with `glow`: the default 1.45× red paint tone-mapped orange for 0.22 s). The iris pulses on the bass. | Floor level (0.32 m), long lens (fov 18), slow creep in. | Rain. A clean wet mirror (puddles 0.92). Pancake sits alone beside the black feeder box (red iris on its brow), ears down, tail still, looking up at it. Both are black against a pale lit concrete wall, and the red iris and its pool mirror in the wet stone. The line is stencilled in dark paint high on the wall above them (high enough that its mirror image falls below the frame). |
| G | **Upgrade screens** (`ShotUpgrade`) | 768–896 | 83.31–87.63 | [18] "I'm done with 'upgrade to continue,'": six giant screens, dark until their word is sung. Each slams on with a flash on its word (83.56 I'M · 84.28 DONE · 84.52 WITH · 84.86 UPGRADE · 85.64 TO · 86.16 CONTINUE), then they all breathe on the bass. An iris band pulse on the 85.47 downbeat. [19] "click" 87.30 wakes the small screen over the entrance. | Street level (1.3 m) looking up at the facade, symmetrical (fov 30), slow push-in. | A black monumental facade: a 3 × 2 grid of screens lighting one word at a time (UPGRADE red), a band of irises above, terms scrolling up the piers. He stands small at the foot, black against the lit entrance. |
| H | **The endless axis** (`ShotAxis`) | 897–1044 | 87.63–92.56 | [19] "click to cancel, I'm cancelling you." Words appear as sung, in two rows. The crane rises until the 92.00 downbeat, where the red dot pulses once (+50% scale, halo and glow) and the frame holds to the cut into V2Car. | High crane (33 → 36.5 m) looking down the axis (fov 26), horizon about 0.4 above centre. | The widest frame: a raised black causeway with runway lights runs dead-centre through a canyon of red-tagged towers to the vanishing point, where the CANCEL button is a single red dot. He is a speck in a pool of light, walking toward it. The sentence stands on the causeway as light: CLICK TO CANCEL, far down the axis near the button, then I'M CANCELLING YOU. nearer, sized so both read the same. The words stand on clean ground: every runway light, and the stretch of axis line, seen BEHIND a row goes dark as the word it is seen through lights up: a 0.2 s fade from 0.15 s before the word's onset to 0.05 s after it, so each hard-on word lands on clean ground (16% left on its first frame, none on the next). CLICK's lights are dark from the cut; YOU's stay lit until ~91.3. Lights between and beyond the rows stay on, so the converging lines still run to the dot. |

## Legibility (cap height on the 1080 frame, from `metresForPx` geometry)
A about 43 px · B about 28–30 px (measured) · C about 47 px (CLICK about 38) · D 40 → 28 px at the end of the recession · E about 38 px ·
F about 43 px · G about 34 px (CLICK about 30) · H about 33 px. All text is inside the 2.39:1 band.

Font independence (previews here use Trebuchet MS; the Mac render uses Futura). Every size that has to fit is measured at
runtime with `measureLyric` and only ever shrinks, so these fallback-font previews are unchanged:
- D / E screens: em = min(2.75 / 3.05, the em at which the wider row fills 85% of the face width). Trebuchet fills ~83-84%.
- G screens: word em = min(3.35, the em at which the widest word fills 75% of a 30 m face). CLICK: min(2.9, 75% of 17 m).
  Trebuchet: CONTINUE ~65%, CLICK ~55%.
- C wall: em = min(1.15, the em at which the widest half reaches 13 m from the axis, ~84% of the visible half-width at
  the end of the push). Trebuchet: UPGRADE TO ends ~12.5 m.
- B: fixed rows (see above). A sizes from `metresForPx` and fits the sign at runtime (unchanged). F wraps by maxWidth on
  an 80 m wall. H is free-standing.
- Verified by forcing the limits (FIT 0.6 / 0.45, EDGE 10): every block shrinks and stays centred on its screen, and C
  pulls in toward the slot (`.preview/ab/Chorus1/fittest/`).

## Review fixes (independent pass)
- `CancelButton` is now an opaque, normal-blended red pill with CANCEL in void (red capped at 1.5). The additive version
  sat on the grey screen face and read salmon (s ≈ 0.59).
- A and H use a larger near plane (1 m, 2 m) for depth precision at 0.7–1.5 km (the button is 0.6 m in front of the far
  screen). The axis line in H sits 0.06 m above the causeway. A's timers are 0.15 of cap height and the letters run at 1.3.

## Fix pass (after the lib updates: rows API, skinned hood, crowd look-up)
- H: the runway lights and the axis line no longer run through the words (see the shot row). The gaps are computed from the
  crane geometry: ground seen behind each row, from its foot to its cap top plus halo, from any crane position, plus one
  light in front. Which word darkens each light is measured at runtime. (Verify pass: the fade now runs from 0.15 s before
  the onset to 0.05 s after it. Before, it ran from the onset to 0.2 s after, so a fading line still crossed each word,
  which comes on hard, for its first ~4 frames.)
- D, E, G, C, B: runtime font fit (see Legibility). A, D, E, H now use native `rows` + `anchor="baseline"`. The frames are
  byte-identical to before on this machine (B and D differ only by float rounding, PSNR 85-95 dB).
- F: LOCKED's onset flash is capped (red hue 9° → 5° during the flash; steady 3.5°).
- Re-checked after the lib changes: A (crowd at lookUp 0 is unchanged; he is a speck at its front), D (walking, back view:
  the cowl reads as a hood flowing into the shoulders), E (walking toward us out of the lane, separated from the ~560
  figures by the pool of light and the rim), H (a speck). No fixes needed.

## Continuity notes
- Hood up throughout. Pancake's tail is still (`tailWagAmount: 0`) and his ears are low. No dawnGold.
- The city here (Megablocks, TermsScroll facades, LeaseTags, IrisWall bands, the GiantLetters BUY NOW, the black cube)
  is the city that Final fails. The GiantLetters use `spacing 0.14`, `wordGap 0.5`, cap 80 m, and timers on.
- The last shot ends on a red dot in a dark canyon, which cuts at 92.56 into V2Car's night highway.

## Preview
`node scripts/still.mjs sil Chorus1 --times=57.75,59.4,61.3,63.6,65.5,67.6,69.7,72.6,74.55,76.7,80.8,82.95,85.6,87.45,89,91.6`
