# V1Bedroom — "TERMS" cut, verse 1a: 3:15 AM in the cell

Absolute frames 371–900 (song 12.37–30.00 s, 30 fps; scene-local = absolute − 371). Four shots, every cut on a beat
(`timing.ts` → `CUTS`). Location: the `CellRoom` (cell bedroom) at night; the only light is the city's screen glow thrown
through the vertical blinds (the CellRoom cookie), plus TENURE's red (scanner band, clock, pillow iris, printer slit,
the final red flood). Greys + authRed only; no gold. The Guy is `SilGuy` with the hood UP throughout; Pancake is not in
this scene. All lyrics are `<WorldLyric>` (or TENURE text) inside the 3D world; the letterbox is the only overlay.

Rhythm comes from light, not cuts: the red scanner band slides through the slats once per half bar (2 beats),
ping-pong, eased (`scanAt`); the window light breathes ≤ 10 % with `bassAt` (`cityPulse`).

| shot | scene-local frames | song s | lyric / beat it syncs to | camera | what reads in silhouette |
|---|---|---|---|---|---|
| **A** | 0–131 (abs 371–502) | 12.37–16.77 | [0] "The bed sat me up at a quarter past three," — he rises on "sat me up" (13.60–14.20); the clock brightens on "quarter" (15.32) | outside on the access deck, dead-centre through the window and the vertical blinds; slow dolly-in z 11.0 → 8.4, long lens (14° visible) | a barred window in a black facade; behind the bars a wall of light stripes; the bed's back-board lifts a hooded black figure upright into the stripes like a mechanism; a red scan band crosses the slats; small red "03:15" TENURE clock left of the stripes |
| **B** | 132–264 (abs 503–635) | 16.77–21.20 | [1] "and a voice in the pillow said, 'Sleep has a fee.'" — the iris starts opening on "voice" (17.74), fully open by "said" (18.98), talks (pupil pulses) through "Sleep has a fee"; red "SLEEP / METERED" lights on "Sleep" (19.82), "$4.99 / NIGHT" on "fee" (20.82) | inside, frontal and symmetrical (front wall removed, door iris off), long lens 15.2°, framed low (target y 1.36) so his whole hunched seated body is in the band; slow descending push (y 1.60 → 1.48, z 7.3 → 6.8) | the empty raised back-board stands like an altar, the pillow on it with a red eye opening in the fabric; he sits hunched over his knees on the bed's edge in profile, his back to it; on "pillow" his head lifts and turns back toward the voice; the stripe field (light nudged right, `DIR_B`) sits behind both; red price/meter labels flank the light |
| **C** | 265–396 (abs 636–767) | 21.20–25.60 | [2] "There's ink in the printer, but it won't print a line," — the page feeds from "printer" (22.90) and HALTS with a dying stutter on "won't" (24.06); he reaches on "won't print"; the slit blinks error from "print" (24.56) | from the left (left wall removed), looking at the printer wall from above eye level (camera y 2.15, so the halted page shows its pale face, not a sliver); slow lateral track toward the printed words (z −0.12 → 0.32) | the city light has swung onto the printer wall: he stands against the stripes, a black slab with a red slit at his side, a pale page stuck half out; his arm reaches for it |
| **D** | 397–528 (abs 768–899) | 25.60–30.00 | [3] "'cause HP shuts it off when my card gets declined." — the slit light dies on "shuts it off" (fades out 27.28–27.63); on "declined" (29.34) the window light turns red and PAYMENT DECLINED is stencilled in red light across him and the wall; [4] "My…" (29.88) appears on the wall in the last frames | same side, low and close (camera 0.98 m, looking up a little, target y 1.36 so the printer slit sits clear of the bottom bar), nearly held (x −3.1 → −3.0) | the man looms against the stripes, back three-quarter, the dead printer at his feet; then the room turns red, a thin red rim outlines him, and the red stencil crosses his chest |

## Lyrics in the world (where each line lives)
- **[0]** bone light on the back wall above the stripes, seen through the window and the blinds. Futura 600, em 0.17 m
  (cap ≈ 30–37 px). Wrapped in `<Unoccluded>` (depth test off): the words keep the wall's depth, scale and parallax, but
  the slats no longer blank whole stems (they did: "BED" read "EED"). Safe because, from this camera, the text block
  stays inside the window opening for the whole dolly. The "03:15" clock gets the same treatment. The last 0.2 s
  ("…three,") stays on the same wall in shot B (a match cut) until "and".
- **[1]** bone light in the dark band above the stripes, inside the room (em 0.135 m, cap ≈ 31 px); FEE (authRed) falls
  onto its own third row.
  TENURE's red mono `FloatingPrice` labels flank the light: SLEEP / METERED and $4.99 / NIGHT.
- **[2]** typewriter-mono light "printed" on the dark part of the printer wall, beside the stripes (left aligned, top
  anchored, em 0.112 m, cap ≈ 28 px), like the printer's output that never comes.
- **[3]** bone light projected across his head and shoulders and the striped wall (below bloom so he stays black);
  DECLINED in red. Then `<Stencil glow>` "PAYMENT DECLINED" in red across his chest and the wall.
- **[4]** "MY" (29.88 s, 3 frames) on the wall at lower right, left aligned; the line continues in V1Feeder.

## Files
- `index.tsx` — `V1Bedroom` (picks the shot by absolute frame; one `<SilStage>`).
- `shots.tsx` — `ShotA`–`ShotD`.
- `timing.ts` — cuts, key word times (`wordTime`), `scanAt` (scanner rhythm), ramps.
- `parts.tsx` — `BedClock` (red "03:15" canvas readout; `<WorldLyric>` strips ':' from words, so it is drawn locally);
  `CellGuy` (SilGuy with a fixed hood drape, see below); `Unoccluded` (depth-test-off wrapper for shot A's wall text).

## Notes / continuity
- The bed's back-board stays raised in B (the bed sat him up, then he moved to its edge); it is down in C/D.
- The window light direction changes between B and C (`DIR_BACK` → `DIR_RIGHT`) so the stripes land on the printer wall:
  "the city's screens re-aim". The blinds are slightly more shut in C/D (0.86 vs 0.92).
- The printer page stays halted at 0.5 through D; the slit and status dot die on "off".
- **The Guy is `CellGuy`, not `SilGuy`.** SilCast's `buildHood()` lathes the hood's back drape top → bottom, so its faces
  point inward. Under the FrontSide silhouette material only the drape's far inner strip renders, and when he looks down
  in profile or back views it sticks out of the back of the hood like a ponytail or a stick (B/C/D). `CellGuy` hides that
  drape (the Guy's only LatheGeometry, via `userData.silHide`) and hangs a slimmer, outward-wound one from the NECK joint,
  so the hood's back stays a cowl on his shoulders. Lib fix suggested: reverse `drapePts` in `buildHood()` (and consider
  parenting the drape to the neck).
