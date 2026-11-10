# Final — "Liberation through colour" (TERMS cut)

Absolute frames 4992–6126 (scene-local 0–1134), song 166.39–204.20 s, 30 fps. Seven shots; every cut is on a downbeat
(computed from `DOWNBEATS` in `timing.ts`, `SHOTS`). Lyrics [38]–[45] are all staged in the world with the lib
`<WorldLyric redFill={1}>` (every line in the scene). Red after 166.39 only ever dies: control words appear authRed
exactly when sung — as SOLID red letters (`redFill`; additive red on the gold haze reads orange) — hold ~0.6–0.9 s,
stutter, then fall out of the line in ≤ 0.65 s (`lyricFx.dyingRed`; `maxDrop` caps the fall where something must stay
clean below) — or, on the failing screen and in the very last line, lose their red and stay readable (`glow` +
`redGlowDies`). GOOD / PAPER / BOWL / GROUND are dawnGold.

**Font independence.** Every lyric block uses explicit `rows` (no `maxWidth` wrap), and its size goes through
`frame.fitEm`: the em is the shot's design size unless the measured block, grown by 15 % (the Mac's Futura may set
wider than a preview machine's fallback), would leave its allotted width (≤ 94 % of the picture from the block centre;
S1: 92 % of each half beside the gap). Only the size adapts to the font; the line breaks never change.

Files: `index.tsx` (shot switch), `timing.ts` (shot list, dawn / red-failure curves), `Dawn.tsx` (painted sky card with
the rising sun, warm fog colours, gold rim), `City.tsx` (skyline band + city-wide dying lease tags, dying screens/irises),
`lyricFx.ts` (dying red words, glow death), `frame.ts` (place things inside the 2.39:1 picture; `halfWidthAt`,
`fitEm`), `shots/*.tsx`.

| # | shot | scene-local frames | song s | lyric / beat sync | camera | what reads in silhouette |
|---|------|-------------------|--------|-------------------|--------|--------------------------|
| S1 | **THE HIT** (`Hit.tsx`) | 0–99 | 166.39–169.72 | hit 166.39 (frame 0) · [38] "You said 'Buy now,' but I'm good for now" (Buy 167.66, good 169.10) · hood pull 168.0–169.55 (hood down 168.35–168.95) | low (1.0 m), dead-centre behind him, fov 17 visible, slow push 12.5 → 9.9 m | Frame 0 is the red night city: TENURE screens, irises and ~thousands of lease tags. They stutter and die (irises → black discs) over 0.5–1.2 s while the dawn floods the haze and its mirror on the wet plain (the whole-frame brightness change). He opens in Hold's pose (match cut: phone at his left ear, grandpa's hammer hanging from his right fist); the call is over on the hit and the phone comes down to his side (166.45–167.4), the hammer hangs on through the shot. He stands black against the gold and pulls his hood back: the left hand comes up to the crown with the elbow up and out, draws the hood back over the head and down to the nape (the cowl folds down to the spiky-hair outline), slides down the back of the neck, and the arm drops at his side; his head lifts a little to the dawn. [38] stands on the plain as monumental black letters in two blocks either side of him ("YOU SAID / BUY NOW," right-aligned on the left · "BUT I'M GOOD / FOR NOW," left-aligned on the right; the blocks span ~25 %–83 % of the width); BUY glows red, stutters, falls; GOOD has a gold glow. |
| S2 | **THE PAPER 1984** (`Book.tsx`) | 99–231 | 169.72–174.10 | [38] tail · [39] paper 171.22 (book raised 170.92–171.47), 1984 171.90 (book opens 171.78–172.20) | frontal, low (0.95 m), fov 21, slow push 7.4 → 6.6 m | He faces us, hood down, sun low to the right; raises the paper 1984 overhead and it opens: the brightest white in the film (blooms). Pancake sits beside him in profile, head lifting toward the book, tail going. The lines hang as bone light in the dim upper haze to the right of the raised book, in short rows (PAPER gold): [38] "YOU SAID / BUY NOW, / BUT I'M GOOD / FOR NOW," · [39] "I GOT A PAPER / 1984 / THEY CAN'T / TAKE DOWN." |
| S3 | **THE LETTERS FALL** (`Letters.tsx`) | 231–362 | 174.10–178.47 | [39] tail · [40] upgrade 176.24 · [41] "click" 178.24 · one letter falls per beat (174.6 → 177.7), red pulses with `bassAt` | low (1.1 m), symmetrical, fov 18, slow push (the word stands ~950 m out, fixed in the world) | TENURE's 30-storey red "BUY NOW" across the plain (red reflections in the wet ground): Chorus1's sign letter for letter (`GiantLetters` cap 80 m, spacing 0.14, word gap 0.5, lease timers, timerSize 0.15; placed at runtime so the word spans 80 % of the frame). Man + dog small in the word gap (centred on the axis between the Y and N slabs). Each letter's lease timer counts down to 00:00:00 on its beat, then the letter stutters and falls backwards, one per beat, outside in (B, W, U, O, Y, N); the low sun hides behind the O (the skyline, moved back to z −1500, opens a lane behind it) and shows when the O falls (~177.6, on "continue"). [39]/[40] hang above the slabs as bone light in two rows; UPGRADE red, falls out. |
| S4 | **THE CROWD LOOKS UP** (`CrowdUp.tsx`) | 362–493 | 178.47–182.83 | [41] click 178.24, cancel 179.88, cancelled 181.26, you 182.72 · look-up wave 179.2–182.6 · screen red dies 181.4 → 182.3 | low (0.8 m) and close (front row ~9.5 m), side-on, pitch +4.2°, fov 16, slow truck | Rows of hooded silhouettes in profile, layered in haze (front row black, each row behind paler and lower); every head stands above the horizon against the gold sky (front-row heads ≈ y 500, far rows ≈ 655, horizon ≈ 750; the skyline is kept low, 10–30 m, so it stays under the heads). The Guy just in front of the front row in a cleared gap (only paler rows behind him), the only bare head, already looking up. High left, clear above the heads: the last TENURE screen carries the line in two rows (sized to the measured text); its iris and red haze stutter out on "cancelled" (black disc), CANCEL/CANCELLED drain from red to bone; the crowd's heads tip back in a wave (chin/nose profiles to the sky, lib `Crowd lookUp`), gold rim strengthening. |
| S5 | **HOME IN THE GOLD** (`Walk.tsx`) | 493–623 | 182.83–187.18 | [41] "you." tail · [42] "You said 'Buy now,' but I'm good for now" (Buy 185.12, good 186.52) | low (1.05 m) from behind-right, travelling with them at walking speed, fov 19 | Man and dog walk side by side across the wet plain toward the house: a black cube with its door open on gold light and one warm window; its iris lock is a dead disc. [42] hangs as bone light above the house where TENURE's price used to float ("YOU SAID BUY NOW, / BUT I'M GOOD FOR NOW,"); BUY red, stutters and drops only ~0.9 em (`maxDrop`), gone before the row below and well clear of the house roof; GOOD gold. |
| S6 | **HERO: THE BOWL** (`Bowl.tsx`) | 623–818 | 187.18–193.68 | [42] tail · [43] Pancake 188.10, eats 188.84, breakfast 189.22, bowl 190.56, ground 191.64 · [44] "I'm done with" 192.16 | at bowl height (0.3 m), long lens fov 17, held, very slow creep | Pancake in profile eating from the plain bowl on the ground in a pool of gold light, tail curled and wagging, gold motes; the man's legs stand at the right edge. [43] stands on the ground beside the bowl as black letters against the gold haze in four rows (AND PANCAKE / EATS BREAKFAST / FROM A BOWL / ON THE GROUND.; BOWL / GROUND glow gold behind); [42]'s tail uses S1's four short rows, left of the sun. |
| S7 | **THE CRANE** (`Crane.tsx`) | 818–1134 | 193.68–204.20 | [44] upgrade 193.58, continue 194.88 · [45] click 195.66, cancel 197.26, cancelled 199.46, you 203.02 · last red lease tags blink out 196.2–200.6 | crane from 5.5 m / 42 m out to 84 m / 440 m, fov 22 → 23, eased, ends on the cut to Outro | Starts on the house: the man on the step in the gold doorway, the dog at his bowl in the gold pool, one warm window; the sun is hidden behind the house and crests its roof as the crane rises (~194.6). Rises up and back: a black city parted toward the sunrise, standing in a flooded mirror plain (WetGround puddles=1) that carries the gold between the blocks, layered haze, the house a single warm point. The sun sits dead centre on the axis (azimuth 0, elevation 0.6° → 1.1°), low in the gap at the end of the parted city. The last scatter of red lease tags dies. [44]/[45] stand as black letters far out over the horizon, centred above the sun with clear sky between ("I'M DONE WITH / UPGRADE TO CONTINUE," · "CLICK TO CANCEL, / I CANCELLED YOU."); UPGRADE falls; in [45] CANCEL/CANCELLED lose their red glow but stay. Last frame: the sun centred at y ≈ 390, where the Outro's wide has its sun behind the house (y ≈ 330–384): the cut matches (`silmain --times=204.1,204.2`, YAVG 87.9 → 83.6). |

## Continuity
- Guy: SilGuy, hood up at frame 0, down from 168.95 s on (Final/Outro). Pancake: tail wagging throughout, profile / 3/4.
- Hold → S1 is a match cut: S1 opens in Hold's end pose (`PHONE_L` / `HAMMER_ARM`, copied from Hold/common.tsx), the
  dead phone (screen 0) in the left hand and the hammer hanging from the right through all of S1, so the hood pull is
  the left hand's. From S2 on he carries neither (cut-away cheat: S2 is a new angle with the book).
- Colour: red only dying/falling after 166.39; gold is the light (sky, rim ≤ 0.5 strength, pool, door, warm window).
- The house cube + bowl + man on the step at the start of S7 hand over to the Outro's static house at dawn; the sun is
  centred on the axis at the end of S7, as it is in the Outro's opening wide.
- S3's giant letters are Chorus1's `BUY NOW` sign (same size, spacing, word gap and lease timers): the old system falls.
- Rhythm from light: the sun's halo breathes on `beatAt`, the giant letters pulse with `bassAt`, the last iris's pupil on the beat.

## Workarounds / notes
- `PlainBowl` haze shaft (`shaft > 0`, its SoftCone) turns the whole frame black from a 0.3 m camera (NaN through the
  bloom chain). Used `shaft={0}` + atmos `LightPool` + `Motes` instead.
- `WetGround` at high crane angles shows a visible tiled puddle pattern with partial puddles; the crane uses
  `puddles={1}` (one flooded mirror, no pattern) at reflectivity 0.55. Its lyrics pass `mirror={false}` so their
  mirror image does not land between the buildings.
- Lyrics hanging high in the sky (S2, S3, S5 light mode, S7) pass `mirror={false}`: their reflection in the wet plain
  otherwise pokes up, cut, at the bottom edge of the picture. Text standing ON the plain (S1, S6) keeps its reflection.
- The local `FinalLyric.tsx` is gone: its extras are now in the lib `<WorldLyric>` (`glow`, `redFill`, `goldGlow`,
  `mirror`). Every call passes `redFill={1}` (FinalLyric's default; additive red on the gold haze tone-maps ORANGE).
  The swap rendered byte-identically (9 frames over all seven shots, `.preview/ab/Final/migrate`).
- Hood pull (S1): the LEFT arm (the right hand holds the hammer) follows forward-kinematics keys (`PULL` in `Hit.tsx`,
  solved against `guyPoint` 'gripR'/'elbowR' relative to the head; the rig mirrors arm parameters, so they serve the left) through a Catmull–Rom spline: brim/crown (168.35) → behind the head (168.65)
  → nape (168.92, the hood is down) → down the back of the neck to the shoulder (169.2) → idle (169.55). The last key
  is the idle arm one turn round (shoulderX + 2π), so the arm comes down behind him and never swings back up over his
  head (a raised open hand above the head read as a wave). The lib's skinned cowl folds back over the nape; the spiky
  hair shows from ~168.7.
- Text far away (≥ 1 km) must use `fog={false}` or the black letters turn into haze.
- `Dawn.tsx` shader: the cloud strata square their signed distance as `q * q` (never `pow()` of a base that can be
  negative: NaN under ANGLE/D3D11 or Metal blacks out the frame through the bloom). Rendered identically here.
- S5: with explicit rows [42] is 2 rows (the old wrap was 3), so the block centre is raised (`LY` 0.68 in `Walk.tsx`)
  to keep the first two rows where they were: the bottom row stays ~80 px (of 1080) above the house roof.
- DawnSky in the WetGround mirror: the sky card is ~2 km out, so a sun placed for the main camera's eye reflected
  ~2·eye/distance too low from the mirrored camera. On the 84 m crane (S7) that put a second small pale sun ~5° below
  the horizon, in the gap of the parted city. The shader now offsets the sun by `cameraPosition.y − uHorizon` (exactly 0
  in the main pass, since every shot passes eye = camera height), so the reflected sun lands below the ground plane and
  is clipped, as a real one would be at that depression.
