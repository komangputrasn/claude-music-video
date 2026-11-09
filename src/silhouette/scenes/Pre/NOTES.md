# Pre — "leaving for one bag of food" (TERMS cut)

Absolute frames 1424–1732 (song 47.47–57.73 s, 30 fps; scene-local = absolute − 1424). The cut has two shots.
- **KNEEL** is intimate, in bone light: the last touch before he leaves.
- **PLAZA** is one continuous crane in TENURE red. It starts close over him walking out, then rises until he is lost
  among lease tags. The light builds into a pure-authRed whiteout that hands over to the chorus slam at 57.75.

Every sung line lives in the world through `<WorldLyric>`: light in the haze over the lintel, then light projected on
the plaza paving. Each paving line dissolves into a patch of tags when it ends.

Files:
- `index.tsx`: the shot switch (one `<SilStage>` keyed per shot) and the screen-space whiteout.
- `timing.ts`: the cut, word times and the whiteout curve.
- `pose.ts`: `guyKneelPat` (a local kneel-and-pat pose; the lib has no kneel) and `pancakeWaitSit`. The arm keys (lift → hover
  → on the crown, front/mid/back of the stroke) were solved with a rig probe (`guyPoint 'gripR'` against
  `pancakeAnchor 'head'`). The grip centre sits about 0.3 cm above the skull line, so the hand never hovers and never
  sweeps through the dog's face.
- `ShotKneel.tsx`, `ShotPlaza.tsx`.
- `crane.ts`: the crane path as pure functions. The lyric blocks are solved against it.
- `common.tsx`: glow card, instanced boxes, spill texture and easing.

| # | shot | local frames | song s | lyric / beat sync | camera | what reads in silhouette (sound off) |
|---|---|---|---|---|---|---|
| 1 | **KNEEL** (`ShotKneel`) | 0–85 | 47.47–50.30 | [8] "Hold on, buddy, I'll be right back,". He lowers onto one knee from 47.52 to 48.32, through "Hold on" (47.82). From 48.12, as he settles, he lifts his hand in front of his chest, carries it over the dog's head and lowers it onto the crown exactly on "buddy" (48.98): the palm overlaps the skull outline, so the two silhouettes merge. Then one slow stroke along the skull (about 4 cm back and forth) through "I'll be right back". Pancake's head dips into the hand and his ears flatten. The red iris's pupil breathes with the bass. | Symmetrical and frontal, at kneeling eye level (1.15 m). Visible fov 24. Slow push-in from 10.4 to 9.3 m. | A black wall with one wide doorway of soft bone light, with a trapezoid of light spilling over the floor toward us. In strict profile, a hooded man kneels and lays his hand on the head of a small floppy-eared dog sitting facing him. The dog's tail is still. The touch sits on the doorway's centre line. A tiny red TENURE eye watches from the wall beside the door, over a stencilled `LEASE 0315-77 / EXIT · ON PLAN`. The line hangs as soft light in the haze over the lintel in two rows, drifting up like breath. |
| 2 | **PLAZA** (`ShotPlaza`) | 86–307 | 50.33–57.70 | Cut on the sung onset of "one" (50.34). [9] "one bag of food, and that's that." [10] "How hard can it be to buy one thing" (BUY in authRed, flashing on 53.68). [11] "in a world where you can't own anything?" Each line appears word by word, as sung. At the next line's first word (52.42 and 54.60), and at 56.75 for [11], its words stutter out over 0.5 s and the paving under them lights up with tags. The crane starts to rise on "How" (52.42), accelerates through [11], and accelerates again after "anything?" ends (56.68). A second set of city tags lights up one by one from 54.4 to 57.0. The red tracking pool fades from 55.6 to 56.9, so he is lost. Mast pools, ground tags and the TENURE screen pulse on the bass. The whiteout runs from 56.0 to 57.69 (opacity cubic: 0.07 at 56.68, about 0.45 at 57.3, 1.0 on the last frame). The chorus slam follows at 57.75. | One continuous crane, symmetrical on the plaza axis. Visible fov 22 throughout. It is anchored on him (he stays 7° to 3° below the frame centre). The distance goes 27 → 32 → 78 → 235 → 430 → 760 m, and the depression angle from 33° to 57° (keys 50.33 / 52.42 / 54.60 / 56.68 / 57.20 / 57.75, Catmull-Rom with distance interpolated in log space). | He walks alone up the bone axis line of an enormous dark plaza, seen from above and behind. He is a black walking figure in a red pool of light that follows him (TENURE tracking him). Everything is tagged: a red lease tag on every paving slab, on every bollard, bench top and floodlight mast, and later on every facade of the city. Ahead of him, each line lies on the paving in letters of light that grow with each line, stretched along the axis like road markings. [11] is in letters 6 m tall. Each line dissolves into a patch of red tags. The camera rises: he is 130 px tall, then 38 px, then 10 px, then gone. The frame becomes a grid of tags, then towers hatched with tags, the TENURE screen at the head of the plaza, and finally pure red. |

## Legibility (cap height on the 1080 frame)
Measured from the crane geometry with `three` projection (scratch probe), not guessed. Each value runs from the line's
first word to its last.
- [8]: about 38 → 42 px (em 0.34 m at about 11.9 → 10.8 m).
- [9]: 42–45 px (em 1.3 m, stretch 1.5).
- [10]: 54 → 38 px (em 2.49 m, stretch 1.35).
- [11]: 67 → 38 px (em 7.02 m, stretch 1.22).

Every row stays inside the 2.39:1 band. The first rows of [10] and [11] start at least 35 px below the top bar.
The last rows ("THING", "ANYTHING?") reach down to about his head line: by then he is a figure of 10–38 px
walking up to the words, and at most he clips the foot of a letter. `WorldLyric`'s balanced wrap sets [10] and [11] in 4 rows. `maxWidth` comes from
`measureLyric` at runtime, so the wrap follows the Mac's Futura metrics.

## Continuity
- His hood is up. Pancake is in profile with ears low and his tail still (`tailWagAmount 0`).
- There is no dawnGold anywhere. authRed appears only on control: the iris, the lease tags, the tracking pool, the mast
  lights, BUY and the whiteout.
- The location is the city plaza (`Plaza`, `CityGrid`, four `Megablock`s on `PLAZA_SPOTS`, and a `TenureScreen`
  wordmark on the podium), at night.
- The last frame (1731) is pure `S.authRed` from a screen-space `AbsoluteFill`, not over-driven HDR. Chorus1 opens on
  its bright red BUY NOW slab.

## Cost
- About 1.2–1.5 s per frame in the GPU (`angle`) preview at scale 0.5.
- The city is 265 blocks and about 184k lease tags in two instanced draw calls. Ground and object tags add a few
  thousand more.
- There is no WetGround.

## Preview
`node scripts/still.mjs sil Pre --times=47.5,48.4,49.4,50.4,51.9,52.45,53.7,54.65,55.5,56.3,56.68,57.15,57.4,57.69`

## Review fixes (independent review pass)
- **The touch now touches.** The hand used to stop about 6 cm above Pancake's head, leaving a visible gap of light
  between the two silhouettes. It now rests on the crown, with a torso lean of 0.48 and a bent arm. The reach starts
  at 48.12 instead of 48.44, so it is no longer a flick.
- **The hood no longer reads as a ponytail.** In strict profile the shared hood's back drape stood off the neck as a
  separate point. The fix has two parts: the head pitch is lowered to 0.10–0.14, and `HoodFill` in `ShotKneel.tsx`
  adds a local black cowl volume on the neck joint, so the hood flows into the shoulders. The lib is untouched.
- **The masts no longer cut through the lyrics.** The 14 m floodlight masts stand inside the [10] and [11] blocks
  and drew black bars through "IN", "WORLD", "CAN'T" and "ANYTHING?". `ProjectedLyric` now draws the lines without a
  depth test, as light from above landing on whatever stands in it. `OnTop` draws the walker last (SilGuy at opacity
  0.999 in the transparent pass, renderOrder 10), so the lines' light and his pool's haze never grey him.
- **`BoxRow` no longer rebuilds every frame.** The bollard and bench sizes were inline array literals, which rebuilt
  the instanced mesh on every frame. They are now module constants, and the mesh is disposed.

