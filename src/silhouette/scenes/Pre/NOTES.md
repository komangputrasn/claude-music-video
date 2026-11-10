# Pre — "leaving for one bag of food" (TERMS cut)

Absolute frames 1424–1732 (song 47.47–57.73 s, 30 fps; scene-local = absolute − 1424). The cut has two shots.
- **KNEEL** is intimate, in bone light: the last touch before he leaves.
- **PLAZA** is one continuous crane in TENURE red. It opens low and long behind him walking out across the whole wet,
  red-lit plaza, then rises in one calm, continuous move until he is lost among lease tags. The light builds into a
  pure-authRed whiteout that hands over to the chorus slam at 57.75.

Every sung line lives in the world through `<WorldLyric>`: light in the haze over the lintel, then light projected on
the plaza paving. Each paving line dissolves into a patch of tags when it ends.

Files:
- `index.tsx`: the shot switch (one `<SilStage>` keyed per shot) and the screen-space whiteout.
- `timing.ts`: the cut, word times and the whiteout curve.
- `pose.ts`: `guyKneelPat` (a local kneel-and-pat pose; the lib has no kneel; head pitch 0.26 kneeling, 0.32 with the
  hand out, so he looks down at the dog) and `pancakeWaitSit`. The arm keys (lift → hover
  → on the crown, front/mid/back of the stroke) were solved with a rig probe (`guyPoint 'gripR'` against
  `pancakeAnchor 'head'`). The grip centre sits about 0.3 cm above the skull line, so the hand never hovers and never
  sweeps through the dog's face.
- `ShotKneel.tsx`, `ShotPlaza.tsx`.
- `crane.ts`: the crane path as pure functions (monotone cubic Hermite in time, distance in log space). The lyric blocks
  are solved against it.
- `common.tsx`: glow card, instanced boxes, spill and paving-joint textures, easing.

| # | shot | local frames | song s | lyric / beat sync | camera | what reads in silhouette (sound off) |
|---|---|---|---|---|---|---|
| 1 | **KNEEL** (`ShotKneel`) | 0–85 | 47.47–50.30 | [8] "Hold on, buddy, I'll be right back,". He lowers onto one knee from 47.52 to 48.32, through "Hold on" (47.82). From 48.12, as he settles, he lifts his hand in front of his chest, carries it over the dog's head and lowers it onto the crown exactly on "buddy" (48.98): the palm overlaps the skull outline, so the two silhouettes merge. Then one slow stroke along the skull (about 4 cm back and forth) through "I'll be right back". Pancake's head dips into the hand and his ears flatten. The red iris's pupil breathes with the bass. | Symmetrical and frontal, at kneeling eye level (1.15 m). Visible fov 24. Slow push-in from 10.4 to 9.3 m. | A black wall with one wide doorway of soft bone light, with a trapezoid of light spilling over the floor toward us. In strict profile, a hooded man kneels and lays his hand on the head of a small floppy-eared dog sitting facing him. The dog's tail is still. The touch sits on the doorway's centre line. A tiny red TENURE eye watches from the wall beside the door, over a stencilled `LEASE 0315-77 / EXIT · ON PLAN`. The line hangs as soft light in the haze over the lintel in two explicit rows (`HOLD ON, BUDDY, / I'LL BE RIGHT BACK,`), drifting up like breath. |
| 2 | **PLAZA** (`ShotPlaza`) | 86–307 | 50.33–57.70 | Cut on the sung onset of "one" (50.34). [9] "one bag of food, and that's that." [10] "How hard can it be to buy one thing" (BUY a solid authRed letter, flashing on 53.68). [11] "in a world where you can't own anything?" Each line appears word by word, as sung. **Hand-off:** in the last 0.16 s before the next line's first word (52.42, 54.60) the outgoing words stutter out in sung order and are all gone on the frame the next first word appears, so two lines are never on screen together; the paving under them lights up with tags. [10]'s tag patch sinks back out (55.05–55.6) before [11]'s lower rows land on it. [11] dissolves over 0.5 s from 56.75. A second set of city tags lights up one by one from 54.4 to 57.0. The red tracking pool fades from 55.6 to 56.9, so he is lost. Mast pools, the plaza's red wash, ground tags and the TENURE screen pulse on the bass. The whiteout runs from 56.0 to 57.69 (opacity cubic: 0.07 at 56.68, about 0.45 at 57.3, 1.0 on the last frame). The chorus slam follows at 57.75. | One continuous crane, symmetrical on the plaza axis. Visible fov 22 throughout. It is anchored on him (he stays 6.6° to 3.6° below the frame centre). Keys (s / distance m / depression °): 50.33 / 45 / 16 → 52.42 / 50 / 21.5 → 54.60 / 95 / 33 → 56.68 / 240 / 44.5 → 57.75 / 470 / 51, a monotone cubic Hermite in time (distance in log space). The zoom-out rate d ln(dist)/dt only grows gently (0.05/s in the opening, 0.37 through [10], 0.45–0.51 through [11], 0.55–0.66 under the whiteout) and the tilt runs at a steady 2.4–6 °/s, with no jumps at the keys. (The old crane jumped from 0.47 to 1.05/s after 56.68: 235 → 760 m in about 1 s.) | Opening (from the first frame): seen from low behind him, an enormous wet plaza in TENURE red runs away to a red glow at its head. It shows a perspective grid of 6 m slabs, the dark granite axis lanes with the bone inlay line, rows of black bollards along the axis and black benches, each with a red lease tag, and black floodlight masts converging, their heads streaking in the wet paving. He is a black walking figure (110 px) in a red pool of light that follows him (TENURE tracking him). Everything is tagged: every paving slab, bollard, bench top and mast, and later every facade of the city. Ahead of him, each line lies on the paving in letters of light that grow with each line, stretched along the axis like road markings ([11] in letters 8.7 m long). Each line clears as the next begins and dissolves into a patch of red tags. The camera rises: he is 110 px tall, then 36 px, then 11 px, then gone. The frame becomes a grid of tags, then towers hatched with tags, the TENURE screen at the head of the plaza, and finally pure red. |

## Legibility (cap height on the 1080 frame)
Measured from the crane geometry with `three` projection (a scratch probe that replicates `crane.ts` and WorldLyric's
layout), not guessed. Each value runs from the line's first word to its last.
- [8]: about 38 → 42 px (em 0.34 m at about 11.9 → 10.8 m).
- [9]: 44 → 55 px (em 1.7 m, stretch 3.0, centre z 41, rows z 36–46).
- [10]: 35 → 45 px for the far row, 80 → 73 px for the near row (em 3.8 m, stretch 2.2, centre z 20, rows z 2–38).
- [11]: 58 → 46 px for the far row, 117 → 59 px for the near row (em 7.8 m, stretch 1.6, centre z 16, rows z −11–43).

Every row stays inside the 2.39:1 band. [10]'s first row starts 78 px below the top bar and [11]'s 37 px. The last
rows ("ONE THING", "ANYTHING?") stay above his head line. **The rows are explicit** (lib `rows`), so the break never
depends on the font: [9] `ONE BAG OF FOOD, / AND THAT'S THAT.`, [10] `HOW HARD / CAN IT BE / TO BUY / ONE THING`, [11]
`IN A WORLD / WHERE YOU / CAN'T OWN / ANYTHING?`. While its words are on screen, the widest row is at most 52 % of the
frame width with the Windows fallback font (49 % for [9]). That leaves more than 15 % margin for Futura's wider caps.
Each line lies further up the axis than the patch of tags the previous line dissolved into.

## Continuity
- His hood is up. Pancake is in profile with ears low and his tail still (`tailWagAmount 0`).
- There is no dawnGold anywhere. authRed appears only on control: the iris, the lease tags, the tracking pool, the mast
  lights, TENURE's wash over the plaza, BUY and the whiteout. The red-lit paving measures hue ≈ 354° (red, not orange or
  pink). BUY is drawn as a solid authRed letter (`redFill`), because additive red on the red paving tone-maps coral.
  No paving tag is placed under BUY (`buyFootprint`, measured at runtime with `measureLyric`): a tag lying in the U's
  counter read as a strike-through ("BɄY") for the whole time the word was up.
- The location is the city plaza (`Plaza`, `CityGrid`, four `Megablock`s on `PLAZA_SPOTS`, and a `TenureScreen`
  wordmark on the podium), at night.
- The last frame (1731) is pure `S.authRed` from a screen-space `AbsoluteFill`, not over-driven HDR. Chorus1 opens on
  its bright red BUY NOW slab.

## Cost
- About 1.2–1.5 s per frame in the GPU (`angle`) preview at scale 0.5.
- The city is 265 blocks and about 184k lease tags in two instanced draw calls. Ground and object tags add a few
  thousand more.
- There is one `WetGround`: the plaza paving. The Plaza's own dry paving plane is hidden so the two never z-fight. Its
  mirror pass re-renders the scene, so the plaza frames cost a little more than before. The lyric is `mirror={false}`.

## Preview
`node scripts/still.mjs sil Pre --times=47.5,48.4,49.4,50.4,51.4,52.36,52.43,53.73,54.5,54.6,55.4,56.3,56.9,57.2,57.45,57.69`
52.36 and 54.5 fall inside a hand-off. 52.43 and 54.6 are the frames where the next line starts: only the new word may
show. Cut into Chorus1: `node scripts/still.mjs silmain --times=57.3,57.6,57.75,57.9` (copy `.preview/out/silmain`
right away).

## Review fixes (independent review pass)
- **The touch now touches.** The hand used to stop about 6 cm above Pancake's head, leaving a visible gap of light
  between the two silhouettes. It now rests on the crown, with a torso lean of 0.48 and a bent arm. The reach starts
  at 48.12 instead of 48.44, so it is no longer a flick.
- **The hood no longer reads as a ponytail.** This fix is superseded. The lib hood is now one skinned cowl, so the
  local `HoodFill` neck sphere (which then poked out of the cowl as a bump at the nape) and the lowered head pitch were
  removed. See the second pass below.
- **The masts no longer cut through the lyrics.** The 14 m floodlight masts stand inside the [10] and [11] blocks
  and drew black bars through "IN", "WORLD", "CAN'T" and "ANYTHING?". `ProjectedLyric` now draws the lines without a
  depth test, as light from above landing on whatever stands in it. `OnTop` draws the walker last (SilGuy at opacity
  0.999 in the transparent pass, renderOrder 10), so the lines' light and his pool's haze never grey him.
- **`BoxRow` no longer rebuilds every frame.** The bollard and bench sizes were inline array literals, which rebuilt
  the instanced mesh on every frame. They are now module constants, and the mesh is disposed.

## Second pass (fix list)
- **Clean hand-offs.** At 52.42 and 54.60 the outgoing line used to stay on for 0.5 s under the new line's first words.
  It now stutters out in the last 0.16 s before the next line (`HANDOFF`, `handoffFx`; `until` = the next line's onset).
  It is gone on the frame the next first word appears: at 52.43 and 54.6 only HOW / IN show. Every word is still visible
  while it is sung, because the stutter falls inside the last word's sung time.
- **Calm crane.** The old Catmull-Rom used a uniform parameter per segment and jumped from 235 m to 760 m in about 1 s
  after "anything?". It is now a time-parameterised monotone Hermite through 5 keys, ending at 470 m. The rise is one
  continuous move whose rate only grows gently (numbers in the table). The whiteout is unchanged and still completes at
  57.69. silmain at 57.6 / 57.75 / 57.9 shows the red frame, then Chorus1's BUY NOW slab.
- **The opening reads as an enormous red-lit plaza from its first frame.** The camera opens at 45 m / 16° instead of
  27 m / 33°, so the plaza runs to the red glow at its head. The paving is wet (`WetGround`, reflectivity 0.62 → 0.35
  as the crane looks down, puddles 0.3). The full-strength mirror showed the whole tagged city and was too busy. Two
  local additions light the slabs: a 6 m joint grid (`JointGrid`, fades out as the crane rises) and a faint authRed
  wash over the plaza that breathes with the bass (`GlowCard` 0.11). The bollards, benches and masts now stand as black
  shapes on lit paving (opening YAVG 7 → 23). The bench tags now sit on the bench tops; they used to be at ground level,
  hidden inside the benches.
- **Font independence.** [8], [9], [10] and [11] use explicit rows (see Legibility). The `maxWidth`/`measureLyric`
  wrapping is gone.
- **Lib hood.** `HoodFill` is removed and the kneel's head pitch is relaxed to 0.26 / 0.32, so he looks down at the
  dog. In the 48.4 / 49.4 profile the cowl flows from a soft crown point into the shoulders, with no bump at the nape.
  The hand still rests on Pancake's crown.
- Kept as is (per the brief): the walker veiled by the bloom of ANYTHING?, and the screen-space red whiteout.
- Before/after frames: `.preview/ab/Pre/before/` and `.preview/ab/Pre/after/`.
