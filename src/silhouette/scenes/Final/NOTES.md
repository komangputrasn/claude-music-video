# Final — "Liberation through colour" (TERMS cut)

Absolute frames 4992–6126 (scene-local 0–1134), song 166.39–204.20 s, 30 fps. Seven shots; every cut is on a downbeat
(computed from `DOWNBEATS` in `timing.ts`, `SHOTS`). Lyrics [38]–[45] are all staged in the world (WorldLyric / the local
variant FinalLyric, used for EVERY line in the scene). Red after 166.39 only ever dies: control words appear authRed exactly
when sung — as SOLID red letters (`FinalLyric redFill`; additive red on the gold haze reads orange) — hold ~0.6–0.9 s,
stutter, then fall out of the line in ~0.65 s (`lyricFx.dyingRed`; gone before reaching the row below) — or, on the failing screen and in the very last line, lose
their red and stay readable (`FinalLyric glow` + `redGlowDies`). GOOD / PAPER / BOWL / GROUND are dawnGold.

Files: `index.tsx` (shot switch), `timing.ts` (shot list, dawn / red-failure curves), `Dawn.tsx` (painted sky card with
the rising sun, warm fog colours, gold rim), `City.tsx` (skyline band + city-wide dying lease tags, dying screens/irises),
`lyricFx.ts` (dying red words, split-gap, glow death), `frame.ts` (place things inside the 2.39:1 picture),
`FinalLyric.tsx` (local WorldLyric variant), `shots/*.tsx`.

| # | shot | scene-local frames | song s | lyric / beat sync | camera | what reads in silhouette |
|---|------|-------------------|--------|-------------------|--------|--------------------------|
| S1 | **THE HIT** (`Hit.tsx`) | 0–99 | 166.39–169.72 | hit 166.39 (frame 0) · [38] "You said 'Buy now,' but I'm good for now" (Buy 167.66, good 169.10) · hood down 168.35–168.95 | low (1.0 m), dead-centre behind him, fov 17 visible, slow push 12.5 → 9.9 m | Frame 0 is the red night city: TENURE screens, irises and ~thousands of lease tags. They stutter and die (irises → black discs) over 0.5–1.2 s while the dawn floods the haze and its mirror on the wet plain (the whole-frame brightness change). He stands black against the gold, right hand reaching back; the hood folds down to the spiky-hair outline. [38] stands on the plain as monumental black letters split around him ("YOU SAID BUY NOW," left · "BUT I'M GOOD FOR NOW," right); BUY glows red, stutters, falls; GOOD has a gold glow. |
| S2 | **THE PAPER 1984** (`Book.tsx`) | 99–231 | 169.72–174.10 | [38] tail · [39] paper 171.22 (book raised 170.92–171.47), 1984 171.90 (book opens 171.78–172.20) | frontal, low (0.95 m), fov 21, slow push 7.4 → 6.6 m | He faces us, hood down, sun low to the right; raises the paper 1984 overhead and it opens: the brightest white in the film (blooms). Pancake sits beside him in profile, head lifting toward the book, tail going. The lines hang as bone light in the dim upper haze (PAPER gold). |
| S3 | **THE LETTERS FALL** (`Letters.tsx`) | 231–362 | 174.10–178.47 | [39] tail · [40] upgrade 176.24 · [41] "click" 178.24 · one letter falls per beat (174.6 → 177.7), red pulses with `bassAt` | low (1.1 m), symmetrical, fov 18, slow push (the word is sized once and fixed in the world) | TENURE's 30-storey red "BUY NOW" across the plain (red reflections in the wet ground); man + dog small in the word gap. The letters stutter and fall backwards one by one, outside in (B, W, U, O, Y, N); the low sun hides behind the O (the skyline opens a lane behind it) and shows when the O falls (~177.6, on "continue"). [40] hangs above as bone light; UPGRADE red, falls out. |
| S4 | **THE CROWD LOOKS UP** (`CrowdUp.tsx`) | 362–493 | 178.47–182.83 | [41] click 178.24, cancel 179.88, cancelled 181.26, you 182.72 · look-up wave 179.2–182.6 · screen red dies 181.4 → 182.3 | eye level (1.62 m), side-on, fov 16, slow truck | Rows of hooded silhouettes in profile against the gold band, layered in haze (front row black, each row behind paler); the Guy just in front of the front row in a cleared gap (only paler rows behind him), the only bare head, already looking up. High left: the last TENURE screen carries the line; its iris and red haze stutter out on "cancelled" (black disc), CANCEL/CANCELLED drain from red to bone; the crowd's heads tilt up in a wave, gold rim strengthening. |
| S5 | **HOME IN THE GOLD** (`Walk.tsx`) | 493–623 | 182.83–187.18 | [41] "you." tail · [42] "You said 'Buy now,' but I'm good for now" (Buy 185.12, good 186.52) | low (1.05 m) from behind-right, travelling with them at walking speed, fov 19 | Man and dog walk side by side across the wet plain toward the house: a black cube with its door open on gold light and one warm window; its iris lock is a dead disc. [42] hangs as bone light above the house where TENURE's price used to float; BUY red, falls; GOOD gold. |
| S6 | **HERO: THE BOWL** (`Bowl.tsx`) | 623–818 | 187.18–193.68 | [42] tail · [43] Pancake 188.10, eats 188.84, breakfast 189.22, bowl 190.56, ground 191.64 · [44] "I'm done with" 192.16 | at bowl height (0.3 m), long lens fov 17, held, very slow creep | Pancake in profile eating from the plain bowl on the ground in a pool of gold light, tail curled and wagging, gold motes; the man's legs stand at the right edge. [43] stands on the ground beside the bowl as black letters against the gold haze (BOWL / GROUND glow gold behind). |
| S7 | **THE CRANE** (`Crane.tsx`) | 818–1134 | 193.68–204.20 | [44] upgrade 193.58, continue 194.88 · [45] click 195.66, cancel 197.26, cancelled 199.46, you 203.02 · last red lease tags blink out 196.2–200.6 | crane from 5.5 m / 42 m out to 84 m / 440 m, fov 22 → 23, eased, ends on the cut to Outro | Starts on the house: the man on the step in the gold doorway, the dog at his bowl in the gold pool, one warm window. Rises up and back: a black city parted toward the sunrise, standing in a flooded mirror plain (WetGround puddles=1) that carries the gold between the blocks, layered haze, the house a single warm point. The last scatter of red lease tags dies. [44]/[45] stand as black letters far out on the horizon against the dawn; UPGRADE falls; in [45] CANCEL/CANCELLED lose their red glow but stay, so the last image reads "CLICK TO CANCEL, / I CANCELLED YOU." |

## Continuity
- Guy: SilGuy, hood up at frame 0, down from 168.95 s on (Final/Outro). Pancake: tail wagging throughout, profile / 3/4.
- Colour: red only dying/falling after 166.39; gold is the light (sky, rim ≤ 0.5 strength, pool, door, warm window).
- The house cube + bowl + man on the step at the start of S7 hand over to the Outro's static house at dawn.
- Rhythm from light: the sun's halo breathes on `beatAt`, the giant letters pulse with `bassAt`, the last iris's pupil on the beat.

## Workarounds / notes
- `PlainBowl` haze shaft (`shaft > 0`, its SoftCone) turns the whole frame black from a 0.3 m camera (NaN through the
  bloom chain). Used `shaft={0}` + atmos `LightPool` + `Motes` instead.
- `WetGround` at high crane angles shows a visible tiled puddle pattern with partial puddles; the crane uses
  `puddles={1}` (one flooded mirror, no pattern) at reflectivity 0.55. Its lyrics pass `mirror={false}` so their
  mirror image does not land between the buildings.
- Lyrics hanging high in the sky (S2, S3, S5 light mode, S7) pass `mirror={false}`: their reflection in the wet plain
  otherwise pokes up, cut, at the bottom edge of the picture. Text standing ON the plain (S1, S6) keeps its reflection.
- `FinalLyric.tsx` is a local copy of `lib/WorldLyric` with extra props: `glow` (drain a control word's red without
  removing the word), `redFill` (control words as solid authRed letters in light/dark modes, default on: the lib's
  additive red / red glow tone-maps ORANGE on the gold haze), `goldGlow` (hotter gold glow behind BOWL/GROUND on the
  bright sky, S6), `mirror` (hide from WetGround reflections). Candidates to upstream into WorldLyric.
- Hood pull (S1): the elbow stays folded until the shoulder is down, so the hand never swings back above the head
  (it read as a wave).
- Text far away (≥ 1 km) must use `fog={false}` or the black letters turn into haze.
