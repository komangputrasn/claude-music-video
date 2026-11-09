# BUY NOW, FOR NOW — music video design bible

A 3:40 (220 s) 3D music video rendered with **Remotion 4 + three.js (react-three-fiber)** at **1920×1080, 30 fps (6600 frames)**.
Song: `public/song.mp3` (~112.3 BPM, 4/4). Lyrics: `lyrics.txt`. Word-level timings: `src/data/lyrics.json`.
Per-frame audio features (rms, bass, onset, 16-band spectrum) + beats/downbeats: `src/data/audio.json`.

## 1. Concept

A sleepy guy is woken at 3:15 AM by his smart bed — and discovers everything he "bought" is actually rented:
the pillow charges a sleep fee, the printer is locked, the e-book vanishes, and his dog **Pancake**'s smart feeder
says breakfast is for Plus members only. He goes out to buy one bag of dog food, the subscription world
fights him at every step (tiered seat-heat, tiered speed, a self-driving car that leaves without him, a doorbell that
won't recognize him, cops), and he finally comes home and smashes the feeder open with **grandpa's old hammer** —
the one thing he truly owns. He cancels everything, wades through an endless "Iliad" of cancel pages, and wins:
a paper copy of *1984* and Pancake eating breakfast from a plain bowl on the floor.

**Treatment: an early-2000s (Y2K, 1999–2004) MTV-era music video**, rendered as if made on a 2002 workstation:
low-poly PS2/Dreamcast-style 3D dioramas, glossy chrome WordArt titles with lens flares, candy-translucent plastic gadgets,
"Y2K OS" desktop pop-ups and banner ads, fisheye push-ins on the beat, bullet-time, camcorder home-video moments.
Tone: funny, satirical, warm. Pancake is the heart of it. The ending is a genuine triumph.

## 2. Look & feel — what makes it read as "early 2000s"

Use these deliberately (mix per scene; not every scene needs every one):
- **Low-poly 3D**: chunky primitives, `flatShading`, low segment counts (spheres 8–16 segs), vertex-colour/solid-colour materials,
  saturated coloured key lights + rim lights. Characters look like a 2001 console game cutscene: cute, simple, readable.
- **Chrome & gloss**: chrome extruded 3D text (Arial Black / Impact), bevelled, with bloom glints and 4-point star sparkles.
  Glossy gel "aqua" buttons, iridescent/holographic accents, translucent candy plastics (Bondi-blue, tangerine, grape, lime).
- **Y2K desktop UI** (original designs, evoking the era — do NOT replicate a real OS pixel-for-pixel or show real logos):
  rounded windows with blue gradient title bars, beige/silver window bodies, bevelled grey buttons, red ✕ close buttons,
  error/warning icons, green-block progress bars, hourglass & arrow cursors, "CLICK HERE!!!" banner ads, spinning @ / $ icons,
  "You are visitor #0000001", sparkle GIF stars, marquee tickers, hit counters, Comic Sans for jokes.
- **Camera language of the era**: wide-angle/fisheye close-ups (fov 70–100 close to subject), snap push-ins/zooms on downbeats,
  dutch angles, 360° bullet-time orbits with slowed time, whip-pans, split screens (2–4 panels), strobe white flashes on hits,
  lens flares, speed lines, letterbox bars for "cinematic" moments.
- **Home video / DV camcorder**: REC ●, timecode, battery icon, date stamp "NOV 09 2002", slight softness — like the single's cover art.
- **Post look** (built into `<Stage>`): bloom glow, mild chromatic aberration, vignette, film grain, optional CRT scanlines.

Avoid: modern flat UI, dark-mode minimalism, photorealism, real brand logos / trade dress (HP, Amazon, Kindle, Ford names
appear only in the lyric captions — in-scene use invented stand-ins like "INKSURE+", "OmniStore", "e-Reader", "FeedMe Plus",
"MOTORCO"), copying any real music video, game, or OS wallpaper photo exactly.

### Palette (`src/lib/palette.ts`)
| token | hex | use |
|---|---|---|
| y2kBlue | `#1E5BFF` | title bars, chrome tint, chorus sky |
| titleA→titleB | `#0A3FD8`→`#4B9BFF` | window title-bar gradient |
| aqua | `#19C6FF` | glows, gel buttons, pillow voice |
| ice | `#BFF3FF` | highlights |
| bubblegum | `#FF4FB8` | accents, chorus |
| tangerine | `#FF8A1E` | Guy's hoodie, warm accents |
| lime | `#9BFF3A` | progress bars, "OK" |
| grape | `#8A4DFF` | hold-music limbo, iridescence |
| chrome | `#E8ECF4` | metals |
| night | `#050A2A` | 3 AM bedroom, night skies |
| windowBeige | `#ECE9D8` | window bodies |
| alertRed | `#E2231A` | errors, padlocks, CANCELLED |
| pancakeGold / pancakeCream | `#E9B25E` / `#FFF0D2` | the dog |
| sodium | `#FFB347` | street lamps |

### Typography — SYSTEM FONTS ONLY (never download fonts)
CSS/canvas families (installed on this Mac): `Tahoma` (UI chrome), `Verdana`, `Trebuchet MS` (web-2001 headlines),
`Arial Black`, `Impact` (banners), `Comic Sans MS` (jokes), `Papyrus` (the "Iliad" joke), `Courier New` / `Andale Mono`
(legal / patents / LCDs), `Georgia`, `Futura`, `Chalkboard`, `Copperplate`, `Herculanum`.
3D extruded text: three.js typeface JSON converted from local fonts in `src/assets/fonts/`:
`ArialBlack`, `Impact`, `TrebuchetBoldItalic`, `VerdanaBold`, `GeorgiaBold` (ASCII + a few symbols; no emoji).

## 3. Cast & recurring props (keep consistent across scenes — use the shared lib components)
- **The Guy** (protagonist, `lib/characters/Guy`): early-20s, low-poly, spiky frosted-tip hair (brown with bleached tips),
  oversized tangerine hoodie with a white stripe, baggy blue cargo jeans, chunky white skate shoes, wristband. Expressive
  simple face (eyes, brows, mouth shapes). Pyjama-ish at 3 AM is fine to skip — same outfit throughout for readability.
- **Pancake** (the dog, `lib/characters/Pancake`): round, fluffy, pancake-golden medium dog, cream muzzle/chest/paws,
  floppy ears, curly tail, big glossy puppy eyes, red collar with a bone-shaped tag. The emotional core: make him adorable.
- **Smart feeder** ("the box on the ground"): chunky white/translucent-blue plastic box with an LCD panel and a red padlock.
- **Grandpa's hammer**: old wooden handle, dark iron head with rust, wrapped tape on grip. Treated like a legendary item.
- **Pillow**: white pillow with a glowing aqua speaker grille; its "voice" is an aqua waveform/speech bubble.
- **Flip phone** (silver, external LCD, green-backlit internal screen), **paper 1984 book** (plain red/cream cover),
  **dog bowl** (simple ceramic, "PANCAKE" painted on it), **dog-food bag**, **e-reader**, **printer**, **LED alarm clock** (3:15).
- **The house**: low-poly suburban two-storey on a rolling green hill under a saturated blue sky (Y2K wallpaper energy).
- **The car**: chunky silver early-2000s hatchback (generic).

## 4. Captions
Global karaoke captions (lower third) are drawn by `src/overlays/` for the whole song from `src/data/lyrics.json`.
**Scenes must keep the bottom ~230 px free of important action and text.** Scenes may ALSO stage "hero words" in-world
(e.g. a 3D chrome BUY NOW on the sung word) — sync them to word times via `wordTime(line, word)`.

## 5. Technical rules (non-negotiable)
1. **Deterministic, frame-driven**: everything is a pure function of `useCurrentFrame()` (scene-local) or `useSongTime()`
   (song-absolute seconds, from `lib/time`). No `useFrame` for animation, no `Date`, no `Math.random` (use `rand(seed)` /
   `noise1()` from `lib/time`), no animated drei helpers that keep their own clock (Float, Sparkles, Cloud, Wobble/Distort materials).
2. **Per-frame mutation only in `useLayoutEffect`** or via JSX props. (Remotion advances three.js in a passive effect that
   runs before your `useEffect`s → `useEffect` mutations lag one frame.)
3. **All 3D goes through `<Stage>`** (`lib/three/Stage`) — it provides canvas, env map, bloom, lens FX. Animate the camera with
   `<CameraRig position target fov roll/>`. Do NOT use `@react-three/postprocessing` (renders black here). No `drei <Environment>`
   / HDR downloads / remote assets / network. No `drei <Text>` (troika, async). For text in 3D use extruded TextGeometry via the
   lib's ChromeText, or canvas textures (canvas 2D can use the system fonts above synchronously).
4. Allowed drei: `RoundedBox`, `Edges`, `Line`, `QuadraticBezierLine`, `Billboard`, `Center`, simple geometry helpers.
   drei `<Outlines>` does NOT render here — for ink outlines use `<InkMesh>` (`lib/characters/InkMesh`) / `outlineMat()`.
   Characters & hero props share the cel-shaded look: `toonMat(color)` + ink outline (`lib/characters/toon`).
   Avoid `Html` (DOM inside canvas); put 2D UI in HTML layers above/below the `<Stage>` with `AbsoluteFill`.
5. **Performance**: build geometries/materials/canvas textures in `useMemo`; only redraw a CanvasTexture when its content changes
   (set `needsUpdate` in `useLayoutEffect`). Keep each frame well under ~1 s to render. Instanced meshes for particles (rain,
   kibble, confetti). Mind the lower 230 px caption zone.
6. **Units**: metres. Characters stand on y=0, face +Z by default. Guy ≈ 1.8 m tall, Pancake ≈ 0.55 m at the shoulder.
7. **File ownership**: only edit files you own (your scene folder / your lib module + its playground file). Never edit
   another agent's files, `src/timeline.ts`, `src/Root.tsx`, `src/Layout.tsx`, `src/lib/time.ts`, `src/lib/lyrics.ts`,
   `src/lib/three/Stage.tsx`. Need something changed in shared code? Make a local variant in your own folder and report it.
8. **Preview & verify** (you can SEE frames — use it, iterate until it looks great):
   - `node scripts/still.mjs scene <SceneId> [--n=9 | --frames=0,40,80 (scene-local) | --times=13.2,20 (song s)] [--no-overlays]`
   - `node scripts/still.mjs play <Name>` renders `src/playground/<Name>.tsx` (default-export component; optional
     `export const duration = N`). Output JPGs + `sheet.jpg` contact sheet under `.preview/out/…` — open them with the Read tool.
   - Typecheck your files: `npx tsc --noEmit -p . 2>&1 | grep -E "<your path>"` (other agents' WIP may have errors; ignore those).
   - The preview script prints browser console errors — fix any that come from your code.

## 6. Edit list & beat sheet
Cuts are on beats; frames are absolute (scene-local frame = absolute − `from`). Song seconds × 30 = absolute frame.
Lyric line indexes `[n]` refer to `src/data/lyrics.json` (`wordTime(n, 'word')` gives the second a word is sung).

| Scene | frames | song s | lyrics |
|---|---|---|---|
| Intro | 0–371 | 0–12.38 | instrumental (beat from 1.3 s, downbeats 2.42, 4.64, 6.85, 9.03, 11.26) |
| V1Bedroom | 371–900 | 12.38–30.0 | [0]–[3] bed / pillow fee / printer / card declined |
| V1Feeder | 900–1424 | 30.0–47.46 | [4]–[7] e-reader Orwell / taken back / feeder Plus only / Pancake lonely |
| Pre | 1424–1732 | 47.46–57.75 | [8]–[11] hold on buddy / one bag / how hard / can't own anything |
| Chorus1 | 1732–2777 | 57.75–92.56 | [12]–[19] |
| V2Car | 2777–3299 | 92.56–109.97 | [20]–[23] |
| V2Rain | 3299–3850 | 109.97–128.34 | [24]–[27] |
| Swing | 3850–4126 | 128.34–137.53 | [28]–[31] |
| Cancel | 4126–4678 | 137.53–155.95 | [32]–[35] |
| Hold | 4678–4992 | 155.95–166.39 | [36]–[37] |
| Final | 4992–6126 | 166.39–204.20 | [38]–[45] |
| Outro | 6126–6600 | 204.20–220.0 | instrumental outro, loud until ~218 s then fade |

### Key word times (seconds)
- [0] bed 13.26 · sat 13.60 · up 14.20 · quarter 15.32 · three 16.56
- [1] voice 17.74 · pillow 18.56 · "Sleep 19.82 · fee" 20.82
- [2] ink 22.30 · printer 22.90 · won't 24.06 · print 24.56 · line 25.30
- [3] HP 26.08 · shuts 26.50 · off 27.48 · card 28.48 · declined 29.34
- [4] Kindle's 30.90 · Orwell 31.74 · today 33.66
- [5] Amazon 34.20 · took 34.98 · back 35.92 · take 37.42 · away 38.14
- [6] feeder 39.54 · "Breakfast 40.46 · Plus 41.38 · members 41.84 · only" 42.62
- [7] Pancake 44.00 · looked up 44.58 · hungry 45.86 · lonely 47.12
- [8] Hold on 47.82 · buddy 48.98 · right back 49.70
- [9] one bag 50.34 · food 51.36 · that's that 51.98
- [10] How hard 52.42 · buy 53.68 · one thing 53.94
- [11] world 54.92 · can't 55.46 · own 55.80 · anything 56.02 (chorus slams in at 57.75)
- [12] said 58.58 · "Buy 58.94 · now" 59.20 · meant 60.28 · "for 60.70 · now" 61.10
- [13] whole house 63.06 · plan 64.66 · somehow 65.10
- [14] done 66.90 · "upgrade 67.48 · continue" 68.72
- [15] click 69.48 · cancel 71.14 · cancelling 72.40 · you 73.92
- [16] "Buy 76.34 · now" 76.60 · "for 78.14 · now" 78.50
- [17] dog's breakfast 79.62 · locked 80.72 · box 81.84 · ground 82.88
- [18] done 84.28 · "upgrade 84.86 · continue" 86.16
- [19] click 87.30 · cancel 88.52 · cancelling 89.96 · you 91.44
- [20] car seats 94.10 · cold 94.84 · heat 95.90 · tier 97.32
- [21] speed 98.06 · tier 99.26 · crawled 100.22 · first gear 101.14
- [22] stopped 102.44 · gas 103.54 · car 104.62 · drove away 105.10
- [23] Ford 107.04 · patent 108.24 · by the way 109.46
- [24] walked home 110.90 · rain 112.02 · doorbell 112.60 · "Who?" 113.44
- [25] climbed 115.24 · window 115.82 · cops 116.86 · too 118.10
- [26] Pancake 119.20 · waiting 120.10 · nose 121.22 · box 121.96
- [27] grandpa's 124.18 · old hammer 125.10 · care 126.56 · locks 127.48
- [28] One swing 128.26/129.20 · lid 129.86 · flew off 130.06
- [29] Pancake 130.82 · ate 131.46 · enough 132.40
- [30] picked up 133.02 · phone 133.62 · hammer 134.18 · hand 134.72
- [31] cancelling 135.28 · every last thing 135.82 · plan 136.86
- [32] passed 138.96 · "Click to Cancel" 139.48 · court 141.74 · said no 142.02
- [33] page after page 143.64 · nowhere 145.62 · go 146.86
- [34] Amazon 147.34 · named 148.34 · cancel page 149.34 · "Iliad" 151.22
- [35] most honest 151.96 · name 153.34 · cancel page 154.74 · had 155.80
- [36] hold music 156.88 · stopped 157.80 · voice 159.00 · came through 159.40
- [37] one from my pillow 161.12–162.24 · "Is that you?" 164.18 (energy dips ~162–166 — near-silence moment)
- [38] "Buy 167.66 · now" 167.94 · good 169.10 · for now 169.42
- [39] paper 171.22 · 1984 171.90 · can't take down 173.42
- [40] done 175.60 · "upgrade 176.24 · continue" 177.52
- [41] click 178.24 · cancel 179.88 · cancelled 181.26 · you 182.72
- [42] "Buy 185.12 · now" 185.40 · good 186.52 · for now 186.86
- [43] Pancake 188.10 · eats 188.84 · breakfast 189.22 · bowl 190.56 · ground 191.64
- [44] done 193.06 · "upgrade 193.58 · continue" 194.88
- [45] click 195.66 · cancel 197.26 · cancelled ~198–200 · you (held to ~204)

### Scene treatments (starting points — elaborate, but keep the story beats)
- **Intro** — CRT TV in a starfield/blue void powers on (line → bloom). A "Y2K OS" boot: progress bar "Loading your life… 99%",
  a dialog "Your subscription to EVERYTHING is now active. [Buy Now]". On downbeats: chrome 3D **BUY NOW, FOR NOW** title slams in
  with lens flare + sparkles, then the camera dives into the CRT screen → cut to the bedroom.
- **V1Bedroom** — 3:15 AM, moonlit low-poly bedroom, red LED clock 3:15. The smart bed motor-tilts him upright on "sat me up".
  The pillow glows; a pop-up "SLEEP HAS A FEE — $4.99/night [Buy Now] [Maybe Later (disabled)]". Printer: a page tries to feed,
  stops; red error dialog "CARD DECLINED · Printing disabled by INKSURE+", ink cartridge padlocked. Camcorder-ish wide shots, fisheye
  close-ups on gadgets, push-ins on downbeats.
- **V1Feeder** — The e-reader shows *1984* by George Orwell; on "took it back" the pages disintegrate into pixels and get sucked up
  into a cloud-shaped "OmniStore" vortex ("This title is no longer available"). The feeder's LCD: "BREAKFAST IS FOR PLUS MEMBERS ONLY",
  padlock clamps shut. Pancake looks up at camera — big wet eyes, ears droop, slow push-in (heart of the video).
- **Pre** — Guy pats Pancake ("hold on buddy"), grabs keys; a hero spin of a 3D dog-food bag ("one bag of food"). Then pull back
  hard: the house/world is wrapped in price tags, padlocks and "RENTED" stickers ("can't own anything"); build-up with speed lines,
  rising progress bar, beat-accelerating cuts, white-out into the chorus.
- **Chorus1** — Maximal Y2K: blue sky, rolling green hills, the house with a giant "$9.99/mo" price tag and a subscription ribbon.
  Chrome 3D **BUY NOW** flips to **FOR NOW** on the words. A storm/tunnel of 3D pop-up windows ("UPGRADE TO CONTINUE", "Are you sure?")
  flying at camera on the beat. Cursor tries to click CANCEL; the button runs away. Second half: Pancake beside the locked box on the
  ground. Split screens, fisheye, bullet flashes.
- **V2Car** — Night. Low-poly hatchback; seats frost over ("SEAT HEAT: PLATINUM TIER"); speedometer needle stuck behind a padlock
  ("SPEED PACK REQUIRED"); crawling in 1st gear while a snail overtakes. Neon gas station canopy; he gets out with the nozzle and the
  car drives off by itself. A blueprint "PATENT" document (white lines on blue) flies in.
- **V2Rain** — Rain (instanced streaks), sodium street lights, he trudges home. Doorbell-cam fisheye POV: "WHO?" / "FACE NOT RECOGNIZED —
  upgrade to Face Plus". He climbs through the window; red/blue cop lights wash the room. Pancake waits, nose on the locked box.
  Grandpa's hammer on the wall glows like a legendary item (god-rays, sparkles, slow push-in) on "doesn't care about locks".
- **Swing** — Bullet-time: frozen hammer mid-swing, camera orbits 270°, then real-time SMASH on "One swing" (white flash, shake),
  lid flips off, kibble explodes in slow motion, Pancake eats happily (tail a blur). Flip phone in one hand, hammer in the other;
  a scrolling list of subscriptions each getting CANCELLED.
- **Cancel** — A gavel slams "DENIED" on a giant "Click to Cancel" button which shatters. "Page after page": camera flies down an
  infinite corridor of web pages ("Are you sure?", "Really sure?", "Here's 10% off!", "Page 37 of ∞"). Then the epic: the cancel page
  "ILIAD" as a marble Greek temple of web UI with a scroll that never ends (Papyrus font joke), golden god-rays.
- **Hold** — Hold-music limbo: dreamy purple space, floating MIDI notes, rotating hourglass, "Your call is important to us",
  position-in-queue counter. On "stopped": everything freezes and drains to black/silence. Only the pillow glows; aqua waveform:
  "Is that you?" — intimate, quiet, sync to the energy dip.
- **Final** — Liberation: sunrise gold/pink/blue over the hills. He holds up a paper *1984* (chrome sparkle "CAN'T TAKE DOWN").
  Red CANCELLED stamps slam onto pop-ups that shatter into confetti/sparkles. Chrome **BUY NOW → GOOD FOR NOW**. Pancake eats
  from a plain bowl on the ground (hero shot). Big final cursor click and everything explodes into stars.
- **Outro** — Warm camcorder home-video: Guy and Pancake on the porch at sunrise, Pancake's tail wagging, empty bowl. Pull back to
  reveal it's on a CRT TV in the cleaned-up bedroom; the TV switches off (classic CRT collapse to a dot). End card text
  (e.g. "BUY NOW, FOR NOW" + "click to cancel") then black at 220 s.
