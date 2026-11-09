# Intro — "TERMS" cut, instrumental: the eye, the terms, the title

Absolute frames 0–371 (song 0–12.37 s, 30 fps; scene-local frame = absolute frame). Three shots, both cuts on downbeats
(`timing.ts`: `CUT_TERMS` = 206 at 6.85 s, `CUT_TITLE` = 271 at 9.033 s). Night. Greys + authRed only (no gold). One
`<SilStage>` in `index.tsx`; fog changes per shot. The letterbox is the global overlay (not drawn here).

**Lyrics:** `sceneLyricLines(0, 12.37)` is empty. The first sung word ("The", 12.50 s) belongs to V1Bedroom. The only
text the Intro owns is the title, "BUY NOW, FOR NOW", typed on the TENURE slab. The terms of service are TENURE
texture, not lyrics.

Rhythm comes from light: the iris clicks open on the first three beats; from ~4.4 s, when the bass enters, every iris on
the wall breathes with `bassAt()` (pupil dilation + brightness), and the red mist pulses with it. The crowning iris in
shot B and the title slab (`pulse`) breathe the same way.

| shot | scene-local frames | song s | syncs to | camera | what reads in silhouette |
|---|---|---|---|---|---|
| **A — the eye / the wall** | 0–205 | 0–6.85 | 0–0.75 s black; 0.75–1.25 a red standby pinpoint fades in; the iris **clicks open on the beats 1.30 / 1.86 / 2.415** (36 % / 70 % / 100 %); its pupil focuses (contracts) on the first downbeat 2.415, when the pull-back starts; the bass (≈4.4 s) makes the whole wall breathe | dead centre, visible fov 24°. Extreme close at 5.4 m (iris radius 1.1 m): the iris fills the 2.39:1 band. From 2.415 s, a pull-back to 360 m: exponential while close (a constant-feeling pull, eased in over 0.9 s so the focused eye holds a moment), then capped at ~126 m/s so the regular iris grid never strobes (≤ 0.7 pitch/frame at the frame edge), easing to rest over the last second; it descends from the iris's height (35.5 m) to 3.2 m above the wet avenue | a single red iris in the dark → the irises around it open just as each enters the frame (the opening wave rides 86 % of the frame half-width, so they all wake as we see them) → a field of ~3 650 irises (3 m pitch), the wide reached as the bass enters → the black skyline of a city rises from the bottom (we fly backward over its roofs, along a clear avenue) against the red wall, which runs past both frame edges; a grey night-glow band above the wall's crown; red mist between the city rows; the wet avenue mirrors the wall; three tiny hooded passers-by cross the avenue against the red reflection. The hero iris keeps a pin-glint at the centre of the wide, like a star |
| **B — the terms** | 206–270 | 6.85–9.03 | cut on the downbeat 6.85; the crowning iris pulses with the bass | one-point perspective up the face of a black skyscraper (visible fov 32°), dead centre. One slow crane DOWN the facade (camera y 9 → 1.3 m, z 66 → 61 m, looking at y 25.5 → 15.2 m; smoothstep over 6.85–9.38 s, so it is still drifting at the cut). The facade drifts up ≈ 3–4 px/frame; the clauses scroll up at 3.6 m/s on top of that, so on screen the text always rises (≈ 6 px/frame at 1080), like credits | opens on the red TENURE iris crowning a column of terms (`TermsScroll`, bone mono clauses, §-headers, 11.5–37 m); the credits rise past it and it leaves the top of the frame; the lit doorway rises into the bottom of the frame and, in the last ~0.8 s, tiny hooded figures cross it (scale); two slits of sky light between the towers converge upward |
| **C — the title** | 271–370 | 9.03–12.37 | cut on the downbeat 9.033. "BUY NOW," types on one letter every 0.1 s from 9.133 s; a beat of silence; "FOR NOW" types on from the beat at 10.147 s; **on the downbeat 11.262 "BUY NOW," goes dark (14 %)** and "FOR NOW" stays alone until the cut to V1Bedroom at 12.37 s; the slab's light pulses with the bass | dead centre, low (1.2 m), visible fov 20°; slow push-in z 152 → 132 m | a monumental full-red TENURE slab (66 × 22.5 m) alone on a wet black plaza, its red mirrored in the puddles; void Futura letters on red (cap ≈ 50–60 px of the 1080 frame); a man (hood up, looking up) and his dog (sitting, in profile toward him, tail still) stand small and black against the red at its foot; a black city stands on a faint fog-lit horizon at both frame edges |

## Files
- `index.tsx`: `Intro`. It picks the shot by absolute frame and holds one `<SilStage>` with fog per shot. The wide uses a
  near-black red fog (`#160A09`): the irises' light in the haze.
- `timing.ts`: beats, cuts and title timings (`IRIS_CLICKS`, `PULL_FROM/TO`, `TITLE_A/B/DIM`, `TYPE_STEP`), plus easing.
- `ShotIris.tsx`: shot A. `IrisWall` 131 × 28 at a 3 m pitch (393 m: wider than the 365 m frame at the end of the pull-back) with the hero cell skipped and a hero `<Iris>` in its place. (Review fix: the first version used 241 × 56 at 1.5 m with a smootherstep-in-log pull; edge irises moved up to 2.8 pitches per frame — temporal aliasing of the grid — and the field stopped ~1% short of both frame edges. The pull profile `pullDist()` is a precomputed table, solved once at module load.) The wave front
  is driven per frame (`start = t − R`, `speed = 1`), so its radius tracks the camera's frame width. The wall stands on
  a concrete `Block`, with two `CityGrid` rows, two additive red `FogLayers` mists, `WetGround`, red/grey `Backlight`s
  and `Walkers`.
- `ShotTerms.tsx`: shot B. A `TermsScroll` on a concrete tower between two others, `Backlight` slits, a crowning `Iris`,
  a doorway, `Walkers` and `WetGround`. (Review fix: the first version tilted ~38° in 2.2 s — the text slid DOWN the
  screen at ~19 px/frame and strobed; it is now a slow descending crane, so the credits rise.)
- `ShotTitle.tsx`: shot C. A `TenureScreen` (`background="red"`, spans with `opacity` for the dim, `reveal` from a
  letter schedule that skips spaces), `SilGuy`, `SilPancake`, a distant `CityGrid` with a horizon `Backlight`, and
  `WetGround`.
- `common.tsx`: `Ground`, `Block` (a static concrete box), `Walkers` (hooded passers-by) and the rim presets.

## Continuity
- The Guy has his hood up and Pancake's tail is still (`tailWagAmount 0`, ears slightly low). Both are small in frame.
- No gold anywhere. Red is only TENURE: the irises, their light in the mist, and the title slab.
- The last frame is a red slab with "FOR NOW", which cuts to V1Bedroom's dark facade and window at 12.37 s.
