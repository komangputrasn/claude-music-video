# Hold — TERMS (silhouette cut) · frames 4678–4992 (song 155.93–166.40 s)

Bridge: hold music, then the voice. The quietest scene in the film, and **one take**. Lines owned
(`sceneLyricLines(155.95, 166.39)`): **[36]** "Then the hold music stopped, and the voice came through," and **[37]** "the one
from my pillow, and it said, 'Is that you?'". Plus the **tail word of [35]**: "had." (Cancel's line) is still being sung for
the first 0.27 s (155.80–156.20), so Hold shows that one word (only it: Cancel already showed the rest of the line up to its cut).
Scene-local frame = absolute − 4678. Sync points are in `timing.ts` (all from `wordTime`).

## The image
A black ocean runs to the horizon under a low band of lit fog. Over the sea hangs **the pillow, the size of a building**: the
same soft black rectangle with concave sides and a red eye that V1Bedroom showed propped on the bed, now an eclipse against
the haze, with TENURE's eye closed as a thin red seam. **The hold music is visible sound.** Thin authRed waveform traces ripple through
the air at every depth (8 of them, from 30 m to 270 m). Their shape is the song's spectrum at that frame (16 bands become 8 partials,
smoothed over 3 frames) scrolling sideways, and the swell mirrors them. **He** stands on the water, small and dead centre, with his
back to us and the hood up. His phone is at his **left** ear and grandpa's hammer hangs head-down from his **right** hand (warmth
0.14: the faint edge is the only gold allowed).

## Shot list
| # | scene-local frames | song s | syncs to | camera | what reads in silhouette |
|---|---|---|---|---|---|
| 1a · ON HOLD | 0–55 | 155.93–157.80 | [35] tail "had." to 156.20 (f0–7); [36] "Then" 156.20 (f8), "hold" 156.88 (f28), "music" 157.20 (f38); beats 155.94/156.48/157.04/157.62 pulse the haze and traces | one take: dolly z 31.5 → 25 m and zoom 22° → 17.5° visible fov down the axis (man → eye), eased 155.93 → 162.0; level, pitch 5.1° → 4.9°, height 1.05 → 1.0 m | Tiny hooded man on the black mirror sea, his elbow up (phone at his ear), cut out of the horizon haze, with his reflection broken by the swell. The black pillow eclipses a halo of fog. Red traces ripple across the whole sky. From the cut, **"HAD."** (dim bone, alone) lies on the nearest trace, centred; it goes as "THEN" arrives. **"THEN THE HOLD MUSIC"** in bone light rides the nearest trace word by word, each word bobbing and tilting with the wave. |
| 1b · STOPPED | 45–56 | 157.42–157.80 | the music decays (rms falls) | (push continues) | The traces flatten into straight lines, and the words settle flat on the line. |
| 1c · THE BLACKOUT | 56–128 | 157.80–160.24 | **"stopped" 157.80 (abs 4734)**: EVERY light cuts at once (haze, traces, phone screen, his rim; the scene fog goes to void); "voice" 159.00 (f92) | push continues in the dark (only the seam grows) | Black. Only the pillow's **red seam** (the closed eye) is left, high in the frame. **"STOPPED, AND THE VOICE CAME THROUGH,"** lies in dim bone just above the black water, in front of where he stands (he is invisible now). Its reflection, broken by the swell, is the only proof the sea is still there. On "voice came through" the seam crackles like a voice on the line (talk 0.55, brighter). |
| 1d · THE EYE OPENS | 129–181 | 160.24–162.00 | [37] "the" 160.24 (f129, a beat), "one" 161.12 (f156): the lids part | camera eases to rest at 162.0 (f182) | **"THE ONE FROM MY PILLOW, AND IT SAID,"** appears in the same place, smaller (paint, bone). The eye's lids part. Its red light lights the haze round the pillow (its puffy edges glow: it reads as a cushion) and falls in a column to the sea behind him. He comes back out of the dark as a black cut-out with a hairline red rim on the hood, and his reflection lies below him. |
| 1e · NEAR-SILENCE | 182–313 | 162.00–166.39 | "pillow" 162.24 (f189); fully open 163.45 (f226); narration leaves 163.92 (f240); **"Is" 164.18 (f247)**, "that" 164.24, "you" 164.50 (f257) to 164.94 (f270) | **locked** | One light source (the eye, its corona, its column, its reflection). Nothing moves: world time slows to 10 % (no swell, no haze drift, no iris scan) and the sea calms. Only **his breath** (a slow shoulder rise, ~0.21 Hz) and the eye's breath (slow pupil swell) move. On 164.18 the eye speaks: the pupil dilates on three syllable pulses, and **"IS THAT YOU?"**, one small line of bone (cap ≈ 29 px measured, centred at x ≈ 957), centred between the eye and him, holds to the cut. |

Cut to Final at 166.39: the red dies and the gold rises. Final opens on him from behind, centred, on a wet plain, so the cut is a
match cut (dark red eye world → gold dawn world, same man, same back view).

## Lyric placement (all `<WorldLyric>`, via the local `LyricRows`)
- `TEXT_POS` (8 m beyond him, 3.3 m up, between his hood and the pillow) carries the music and then the voice.
- [35] word 8 only ("HAD.", sung 155.80–156.20 across the cut from Cancel): `LyricRows rows={[[8]]}` at `TEXT_POS`, centred,
  `light` mode, dim bone (intensity 0.6, halo 0.14), em = 0.9 × [36]'s (≈ 41 px, cap ≈ 29 px), riding the carrier like [36]
  but with its whole tilted baseline kept clear of the wave (`ride(xc, lift, halfW, clear)`: crests under the word's ends no
  longer cut through the letters). Window = line 35's default (ends 156.20 exactly when "THEN" appears). Sits at y ≈ 549–599
  px, ≈ 21 px under the pillow's bottom edge.
- [36] words 0–3: `light` mode, bone, em ≈ 46 px (cap ≈ 32 px), offset per word by `waveY()` (the CPU twin of the trace shader),
  tilted with the slope (clamped ±0.22 rad). At 157.77 the trace is a flatline under them; they die with the light at 157.80.
- [36] words 4–9 (blackout): `WATER_TEXT_POS`, 1.2 m in front of him, 8 cm above the sea. `light` mode, dim bone (0.62).
  Sized for the camera AT "stopped" (still far: em 40 px, cap ≈ 28–29 px measured at 157.83) and held at 40 → 42 px em by a
  group scale while the push continues in the dark. (Sized for mid-blackout it was only ≈ 22 px cap on "stopped".)
  Reflected by `BlackSea` (the treatment's "reflected on the black ocean").
- [37] words 0–7: `paint` mode, bone 0.72, em 44 px at the settled framing (≈ 40 px at 160.24 while the camera settles;
  cap 28–32 px measured), hidden from 163.92 so the question is alone.
  Words 8–10 ("IS THAT YOU?"): paint, bone 0.9, centred, held to the scene end (`until` 166.59).
- Inside the 2.39:1 band: [37] sits at y ≈ 590–620 px of 1080, and the water line of [36] at ≈ 790–830 px (its reflection ends just
  above the bottom bar). In the settled frame the pillow top is at ≥ 165 px and his feet at ≈ 885 px. Checked with
  `--no-overlays`: only the reflections of the lit-phase text fall under the bar.

## Colour / light
- Grey world plus authRed control only: the traces, the seam, the eye, its corona. Bone is used for the fog band, the eclipse halo,
  the text, his rim in the lit phase, and the phone screen until the blackout. Gold appears only as the hammer handle edge (warmth
  0.14).
- Red stays red: the traces are thin cores (≤ 1.2 HDR); the corona is ≤ 0.24, the column 0.16 and the outer haze 0.045 (no salmon).
  The traces are premultiplied-alpha blended with a per-trace `cover`: the three near traces (and the far low one) cross the
  bright horizon haze, and with `cover` 1 their core occludes the grey instead of adding to it, so they stay authRed there
  (additive red on grey measured pink, sat 0.52; now hue ≈ 1°, sat 0.68 at full res).
- The eye: `intensity` 1.6 while it is the closed seam (the only light in the blackout), coming down to ≈ 1.1 as the iris opens
  (speech pulses capped at 1.4). At 1.6–1.95 the open iris body tone-mapped salmon (246,137,105); now ≈ (240,88,74), the same
  as the verified Intro iris (244,86,66).
- Brightness: the lit phase is moderate (black top corners, a halo, a low haze band), so the blackout at 157.80 is the beat the
  treatment asks for. The near-silence is visually near-silent.

## Files
- `index.tsx`: `Hold` (one `<SilStage>`; fog g1 → void at the blackout).
- `ShotHold.tsx`: the take (camera, light, traces, text).
- `timing.ts`: sync points, music level, eye state, speech envelope, still-time.
- `common.tsx`: world layout, `HoldGuy` (still pose plus breath, phone at the left ear, hanging hammer), `PillowEye` (`PillowIris`
  scaled ×30, puffed ×2.4, tilted 0.26 rad toward him, soft red fabric rim, corona + light column), `LyricRows`.
- `BlackSea.tsx`: **local variant** of `atmos/WetGround` (same Reflector path) with an ocean shader: analytic swell, Fresnel,
  vertical "moon-path" displacement, fine waves fading with distance.
- `HoldWaves.tsx`: the visible hold music (ribbon traces displaced in the vertex shader, AA-safe cores, a fog veil along their length)
  plus `waveY`/`waveSlope` on the CPU.

## Lib notes (no lib edits)
- SilGuy's hood is now the lib's skinned cowl (checked 155.93–166.39): from behind it reads as a hood flowing into the shoulders,
  the phone hand at the left ear is a small knob at the hood's side with the elbow out, and the hanging hammer is a clean T in
  the right fist. No scene-side hood workaround is needed (none was used).
- `LyricRows` (common.tsx) predates the lib's native `rows` prop on `<WorldLyric>`; it is now redundant and could be swapped
  for `<WorldLyric rows=… anchor="top">` (perWord info gives x/width/row), but it renders correctly and is kept as is.
- `PillowIris` is used as is. Its speech envelope (`talk`) runs at syllable rate from `time`; in the near-silence time is slowed,
  so "Is that you?" is driven through `pupil`/`intensity` with a hand-timed 3-syllable envelope (`speech()` in `timing.ts`).
- `PillowIris` orientation: a positive angle about X turns the eye (+Y) toward +Z (the lib doc now says `rotation-x={+1.1}`);
  this scene uses `π/2 + tilt`.
