# BUY NOW, FOR NOW — "TERMS" (dystopian silhouette version) — design brief

A second, completely different cut of the same song, built in the same repo.
Same audio (`public/song.mp3`), lyrics, word timings (`src/data/lyrics.json`), beats (`src/data/audio.json`)
and edit points (`src/timeline.ts`). Everything else (look, tone, camera language, captions and staging) is new.
Do not reuse the Y2K version's visual vocabulary: no chrome WordArt, no pop-up windows, no candy plastic, no
cel-shading/ink outlines, no camcorder HUD, no blue skies, no comedy beats.

## 1. Concept

**The world is one subscription.** In this version the joke is the horror. A single, faceless provider called
**TENURE** ("Own nothing. Lack nothing.") owns every object, surface and minute in the city. Possessions are leases,
light is metered, and doors, beds and food dispensers answer only to the Plan. People are black shapes moving through
fog under enormous glowing terms and conditions.

The Guy and his dog Pancake are two small silhouettes in that machine. The story beats are the same (the 3:15 AM
wake-up, the locked printer, the vanished book, the locked feeder, the car that leaves, the hammer, the endless cancel,
the voice in the pillow). Each is now played as a **quiet act of resistance in a surveillance state**, not as a gag.

The emotional arc is **from total grey control to one patch of real colour**. The only warm, un-metered light in the
film arrives in the final chorus, on Pancake's bowl. That is the payoff.

Logline: *In a city where everything is rented, a man and his dog take back one breakfast.*

## 2. Visual language

### 2.1 Silhouette rule (the core of the look)
- **Every character and hero prop is a pure black silhouette.** There are no visible faces, textures or internal
  shading. The shape alone must carry the acting: posture, gesture, the angle of Pancake's ears, the arc of a tail.
- Silhouettes read because of what is **behind** them: fog lit from behind, giant emissive screens, light shafts,
  wet reflective ground and hard rim light. Stage every shot so the subject sits against something bright.
- One permitted exception: a **thin rim** (1–3 px equivalent) of the scene's light colour on the edges, never more.
- Faces never appear. Emotion comes from body language and framing (scale, distance, isolation, symmetry).

### 2.2 Palette: grey world, one controlling colour, one free colour
| token | hex | meaning |
|---|---|---|
| void | `#07080A` | silhouettes, deep shadow |
| ash | `#2B2E33` | architecture, mid fog |
| fog | `#8A9097` | lit fog, haze |
| bone | `#E9E6DF` | backlight, screens' white |
| **authRed** | `#FF2A1F` | **TENURE**: every lock, paywall, price, scanner beam, "BUY NOW". The system's only colour. |
| **dawnGold** | `#FFB54A` | **freedom**: forbidden until the Swing scene; used sparingly; floods the frame only in the final chorus |

Rules: no other hues. authRed means *control*, and dawnGold means *something you actually own*. Before the hammer
swing, gold appears at most once, faintly, as foreshadowing in the hammer's wooden handle, seen in V2Rain.

### 2.3 Light and atmosphere
Volumetric fog everywhere (layered fog planes plus `Fog`). Hard backlights, light shafts through slats and blinds.
Rain and wet ground with mirror reflections. Huge emissive slabs (TENURE screens) as the main light sources.
Scanner beams sweep (red planes or cones). Bloom is strong and controlled, with only the screens and beams glowing.
No environment-map chrome.

### 2.4 Framing and camera (the opposite of the Y2K cut)
- **Letterboxed 2.39:1** inside the 1920×1080 frame (black bars about 138 px top and bottom, drawn by the overlay).
- **Long lenses** (fov 18–35), **monumental scale** (a tiny figure against architecture 100× its size),
  **strict symmetry** and one-point perspective, and slow, deliberate dolly and crane moves.
- **Few cuts**: verses use 4–8 s shots, and choruses cut on downbeats only. No fisheye, whip-pans, strobe or split screens.
- Rhythm comes from **light** instead of cuts. Screens pulse, beams sweep and fog breathes on the beat, driven by
  `bassAt()` and `beatAt()`.

### 2.5 Typography and text
- System fonts only (never download fonts): **Futura** (Condensed/Medium, uppercase, wide tracking) for TENURE
  signage and captions, and **Andale Mono / Courier New** for terms, legal text and serial numbers.
- In-world text is **monumental and architectural**: terms of service the height of buildings, scrolling up facades.
  Price lines are projected on the fog. Lease numbers are stencilled on everything (e.g. `LEASE 0315-77`).
- Diegetic text is mostly bone or authRed and never decorative.

### 2.6 Lyrics live inside the world (no caption overlay)
There is no lower-third caption track in this cut. Every sung line is **staged diegetically** by the scene that owns
it, as part of the architecture and light: projected onto fog, glowing on a TENURE screen, stencilled on concrete,
printed on the halted page in the printer, fading from the e-reader as ash, carved into the "Iliad" wall, standing as
black letters against the dawn. Uppercase Futura, tracked +0.15em; bone by default. Words appear one at a time
(hard on, no wipe) exactly as they are sung, from `lyrics.json`. Words that name a price, plan or lock (buy, plan,
upgrade, cancel, locked, tier, Plus, patent, fee, declined) flash **authRed**. In the final chorus, "good", "own",
"paper", "bowl" and "ground" appear in **dawnGold**. Every line must be legible inside the 2.39:1 picture (cap height
at least ~26 px of the 1080 frame) for the time it is sung, and must feel like part of the world, never like a subtitle.
Use `<WorldLyric>` (`src/silhouette/lib/WorldLyric.tsx`). The letterbox is the only global overlay.

### 2.7 Sound-to-image rules
- Bass hits pulse TENURE screens (`bassAt`).
- The near-silence at about 162–166 s ("Is that you?") must be visually near-silent too: one light source, no motion
  except breath.
- The chorus entrances (57.75 s and 166.39 s) are the only moments where the whole frame changes brightness at once.

## 3. Cast and objects (silhouette designs)
- **The Guy**: reuse the existing rig (`lib/characters/Guy`) and its poses, rendered as a silhouette. Hood **up**
  for most of the film (a hooded shape reads instantly); the hood comes **down** in the final chorus.
- **Pancake**: reuse `lib/characters/Pancake`, rendered as a silhouette. His floppy-eared, curly-tailed outline is the
  most recognisable shape in the film; keep him in profile or three-quarter view for readability. His tail is the
  barometer of hope: still in the verses, wagging only after the hammer.
- **TENURE**: never a person. It is a **circular red iris** that reads as a logo, a camera and an eye at once,
  appearing on every device, door, screen and sky.
- **The feeder**: a monolithic black box with a red iris slot and the stencil `NUTRITION UNIT · PLUS ONLY`.
- **Grandpa's hammer**: the one object that is never black; its wooden handle catches dawnGold. It is the only owned
  thing.
- **The paper *1984***: a pale rectangle; when opened it is the brightest white in the frame.
- **The pillow**: a soft shape with a slowly opening red iris inside, the voice of TENURE in his bed.

## 4. Scene treatments (same cuts and timings as `src/timeline.ts`)
| Scene | frames | treatment |
|---|---|---|
| **Intro** | 0–371 | Black. A single red iris opens in the dark on the first beat, then pulls back to reveal it as one of thousands of irises on a city wall at night in the fog. The terms of service scroll up a skyscraper like credits. The title "BUY NOW, FOR NOW" appears letter by letter in Futura on a red screen; on the downbeat at 11.26 s the "BUY" dims and leaves "FOR NOW" alone. |
| **V1Bedroom** | 371–900 | A cell-like bedroom seen through vertical blinds, with red scanner light sliding across the wall. The bed lifts him upright like a mechanism on "sat me up". The red iris opens in the pillow: "SLEEP · METERED". The printer is a slab with a red slit; the page halts halfway out; "PAYMENT DECLINED" is stencilled in light across his silhouette. |
| **V1Feeder** | 900–1424 | The e-reader is a pale rectangle in his hands; its words drift off as ash and are pulled up into a ceiling vent with a red light. The feeder monolith's iris turns red: "PLUS ONLY". Pancake is a small silhouette in front of the huge box, ears lowered, looking up. A long, held, wide shot with no camera move: the loneliest frame in the film. |
| **Pre** | 1424–1732 | He kneels; two silhouettes touch (hand on head). He walks out the door into the city, a single figure crossing an enormous red-lit plaza where every object is tagged. On "can't own anything" the crane rises until he disappears among millions of lease tags glowing on the buildings. The light builds into a red whiteout. |
| **Chorus1** | 1732–2777 | The machine at full power. Monumental symmetrical frames: the house as a black cube inside a red laser cage with a floating price. "BUY NOW" in 30-storey red letters; on "for now" the letters' lease timers count down. Crowds of identical silhouettes stand still under the screens while he walks against them. "Upgrade to continue" are gates that close in sequence down a corridor. "Click to cancel" is a cancel button on a screen that recedes as he approaches. Pancake sits by the red-lit box in the rain. Cuts on downbeats only. |
| **V2Car** | 2777–3299 | A car as a black capsule on an elevated highway of red light lines. A frost-white seat glows "THERMAL TIER", and a speed governor holds the needle back. He crawls while other capsules stream past. At the gas station (a fuelling pillar under floodlights) he steps out and the empty capsule drives itself away into the fog. A patent drawing projects across the fog wall: "METHOD FOR REPOSSESSION IN MOTION". |
| **V2Rain** | 3299–3850 | Hard rain in sodium-free darkness lit by screens only. The house door is a red iris that won't open: "IDENTITY NOT ON PLAN". He climbs through the window as a silhouette against the screen glow outside. Searchlights from drones (red cones) sweep the room. Pancake waits with his nose on the monolith. Grandpa's hammer hangs on the wall, the only object with a faint warm edge. |
| **Swing** | 3850–4126 | Time slows. One overhead shot of the swing in silhouette; on impact (129.20 s) the red iris **shatters** and dawnGold light spills out of the broken box for the first time, with kibble falling like sparks. Pancake eats; his tail wags. He stands with the phone in one hand and the hammer in the other, backlit by gold. A wall of red lease tags behind him goes dark one by one, "every last thing on a plan". |
| **Cancel** | 4126–4678 | Legal architecture. "Click to Cancel" is a red button on a plinth in a vast hall; a court is a ring of tall black lecterns, and a single gavel strike blacks out the hall. "Page after page": he climbs an endless staircase of paper in a canyon of bureaucracy, where every landing is the same page. "Iliad": a colossal red-lit wall of carved Greek text (unreadable at scale), with the tiny figure at its foot. |
| **Hold** | 4678–4992 | Hold music as visible sound. Thin red waveforms ripple through fog over a black ocean; he floats, small. On "stopped" every light cuts out except one: the pillow's iris. In the near-silence it opens fully and asks "Is that you?" on screen, in a single line of bone text. Nothing moves except his breath. |
| **Final** | 4992–6126 | Liberation through colour. On the hit at 166.39 s the red screens fail city-wide, and dawnGold sunrise rises through the fog for the first time. The hood comes down. He holds up the paper *1984*, the brightest white page in the film. The giant red letters flicker and fall. The crowds of silhouettes look up. Pancake eats from a plain bowl on the ground in a pool of gold light (the hero shot), tail wagging. Final crane up: a black city with one warm window. |
| **Outro** | 6126–6600 | A static, symmetrical wide of the house at dawn: gold sky, black shapes of the man and the dog on the step, and the bowl. Holds as the music plays out. The last image: the TENURE iris on the doorframe opens one last time, flickers and closes for good. Fade to black by 220 s. |

## 5. Technical plan
- **Coexistence**: add a second composition, **`MainSilhouette`**, in `src/Root.tsx` alongside `Main`. Scenes live in
  `src/silhouette/scenes/<Id>/index.tsx` (same `SceneId`s and frame ranges from `src/timeline.ts`). The new version's
  shared pieces go in `src/silhouette/lib/`, and its overlay (the letterbox) in `src/silhouette/overlays/`.
  Do not modify the Y2K scenes.
- **Layout**: `src/Layout.tsx` currently always mounts the Y2K `GlobalOverlays`. Add a prop to choose the overlay set,
  e.g. `overlays?: 'y2k' | 'silhouette' | false`, and keep `Main`'s output identical.
- **Silhouette rendering**: write a `<Silhouette color rim?>` wrapper that, in `useLayoutEffect`, traverses its
  subtree and swaps every material for one shared unlit `MeshBasicMaterial` (void) and hides the inverted-hull outline
  meshes. Optionally add a fresnel rim shader for the thin edge light. Reuse the Guy and Pancake rigs and pose helpers
  as they are.
- **Render path**: still everything inside `<Stage>`, with `env="none"`, fog on, stronger bloom with a high
  threshold, and lens settings of low saturation and heavier grain. Volumetric look: stacked additive fog planes,
  `LightRays` cones, emissive slabs. No new dependencies are needed.
- **Determinism and project rules** (CLAUDE.md, DESIGN.md §5) still apply: frame-pure animation, `useLayoutEffect`
  mutations, no `useFrame`, no `Math.random`, no downloaded fonts or assets.
- **Preview**: extend `scripts/still.mjs` with a mode for the new scene folder (e.g. `node scripts/still.mjs sil <SceneId>`).
- **Render**: `remotion render src/index.ts MainSilhouette out/buy-now-for-now-terms.mp4 --gl=angle` (use `--gl=swangle`
  on a machine without a GPU).
- **Fonts on Linux/cloud**: Futura, Andale Mono and Courier New are macOS fonts and will fall back elsewhere. Do not
  download fonts. Accept the fallback when previewing in the cloud, and do the final render on the Mac.

## 6. Done means
- Every lyric line has a clear silhouette image; the story reads with the sound off.
- Every sung line is legible inside the world while it is sung (no caption overlay), placed where it belongs in the
  shot (on fog, screens, walls, paper), with authRed control words and dawnGold free words.
- No visible faces anywhere; every character beat reads from the outline alone.
- authRed only on control, dawnGold only after the swing (except the hammer-handle foreshadow), and grey everywhere
  else.
- A side-by-side of any frame from `Main` and `MainSilhouette` looks like a different film.
