# V1Feeder: "TERMS" cut, verse 1b. The vanished book and the locked feeder

Absolute frames 900–1424 (song 30.00–47.47 s, 30 fps; scene-local = absolute − 900). There are four shots, one sung line
each. Every cut lands on the first sung word of the next line (`timing.ts` → `CUTS`).

The location is the `CellRoom` at night. The city's slatted screen light comes through the blinds, and the cell's TENURE
scanner (a red band sliding through the slats once per bar, `scanAt`) continues V1Bedroom's at half its rate. The scene
uses greys and authRed only, with no gold. Grandpa's hammer hangs black (warmth 0) on its pegs wherever that wall is in
frame.

The Guy is `SilGuy` with the hood UP throughout. Pancake is `SilPancake`: ears down (earPerk −0.85…−1), tail STILL
(`tailWagAmount: 0`), and seen in profile. Every line is a `<WorldLyric>` (or the local `RowLyric` wrapper) inside the 3D
world. The letterbox is the only overlay.

| shot | scene-local frames | song s | lyric / beat it syncs to | camera | what reads in silhouette |
|---|---|---|---|---|---|
| **PAGE** | 0–125 (abs 900–1025) | 30.00–34.20 | [4] "My Kindle's got Orwell, at least for today,". The words print on the page as sung ("MY" is already there at frame 0: sung 29.88). The red scan crosses the floor once per bar (downbeats 31.09 / 33.25). | Insert over his right shoulder, face-on to the page (the verified SilProps over-the-shoulder direction, roll computed so the text reads upright). Long lens (9.6° visible), very slow push-in from 1.02 to 0.92 m. | A pale page in a black device in his black fist, his hooded shoulder a black mass below. The page is the brightest thing in the frame and reads "1984 · GEORGE ORWELL" with the sung line printed in ink, then a hairline rule and "LICENSED · NOT OWNED" on the left, clear of his fist (which covers the page's bottom-right corner). Beyond it, slatted city light lies on the floor, crossed by TENURE's red scan. |
| **VENT** | 126–262 (abs 1026–1162) | 34.20–38.77 | [5] "Amazon took it back once, and they can take it away." The book's words peel off as ash from "took" (34.98); 70 % are gone by "once" and the rest by "take it" (37.72), so the page is blank through "take it away" (`bookLoss`). On "and they can" (36.77–37.72, `lift`) he raises the emptying reader overhead toward the vent and looks up at it (`look`); it is up and blank from "take" to the cut. The vent glow and red funnel breathe with `bassAt`. | Frontal, symmetrical, inside the cell (front wall removed), slow push-in with a slight crane up (z 5.4 → 4.85, y 1.62 → 1.74), 21° visible. | He stands back three-quarter before the slatted back wall, bowed over the light in his hands (head pitch 0.3 + a little torso lean; the lib's skinned cowl holds the bow), with a thin bone rim from above (`dir [0, 1]`, strength 0.5, power 7) on the hood's crown and shoulders. A faint red funnel hangs from the ceiling vent. Ash flakes stream up into it and turn red. The sung words rise from the page's light row by row, converge on the grille, shrink and go red. On "take it away" the blank pale page (≈ 37 × 48 px, nearly face-on) is held up just above his hood against the dark wall over the slat light; its small glow outlines his raised black arm, and the red funnel bends down toward it, stopping ~0.17 m above it (no red on the page). |
| **FEEDER** | 263–401 (abs 1163–1301) | 38.77–43.40 | [6] "The feeder said, 'Breakfast is Plus members only,'". The eye opens on "feeder" (39.54). On "Plus" (41.38) the red PLUS ONLY lights on the box's face, the food-slot lock glows and Pancake lifts his head to the eye. On "only" (42.62) he gives up: he turns his back on the box (a 0.8 s U-turn to his left, 42.42–43.24, with shuffling steps; his rear passes the camera side) and lies down (42.74–43.36) facing screen left, on LONELY's spot and heading (`DOG_LIE`); the camera tilts down after him. | Dog's-eye, floor level (0.2 m), from the room's open right side, square to the box face. Slow push (x 1.85 → 1.6), 30° visible, a gentle tilt down at the end (0.07 m target drop, so the projected line's first row stays clear of the top bar). | The feeder Monolith towers black against low backlit haze, its red eye on the brow (a sleeping pinpoint, then open with a red halo). Pancake stands beside it, behind its front plane, his nose toward it, then turns away from it and lies down facing screen left (toward the man, who is not in frame yet). The machine's sentence is projected in red light on the dark wall above it, word by word. |
| **LONELY** | 402–523 (abs 1302–1423) | 43.40–47.47 | [7] "and Pancake looked up at me, hungry and lonely." On "looked up" (44.58–45.22) he lifts his head and chest from the floor toward the man and holds there. Everything else is still except breath and the eye's pupil on the beat. | Held wide with NO camera move. Floor level: camera (2.6, 0.2, 1.3) → (−1.6, 0.95, 0.5), 30° visible. The camera is much closer to the box (≈ 2.9 m) than to the dog (≈ 3.9 m) and the man (≈ 4.5 m), so the box looms by perspective. It sits toward the door side so the man's back still lands on the lit left wall and the box's edge clears the dog's tail. | The loneliest frame: Pancake lies small beside the box, behind its front plane, exactly where and as FEEDER left him (`DOG_LIE`, facing screen left); the box is ≈ 2.8× his lying height, with its open red eye. The man is a tall black figure at the left of the frame, fully inside a pale column of haze, leaning toward the dog. Low haze sits behind the dog and the box, with deep dark negative space on the right third and above. The line is small, quiet and left-aligned in the dark above the dog, beside the man's head. |

## Lyrics in the world (where each line lives)
- **[4]** is printed on the e-reader page itself as dark ink (`mode="paint"`, Futura). The page header is a local canvas:
  "1984 / GEORGE ORWELL / rule". Under the text, on the left, a hairline rule and "LICENSED · NOT OWNED" (bold mono,
  canvas y 474 / 504, ≈ 350 of the 424 px body width), then "LOC 12 / 4212" bottom-left: his fist covers the page's
  bottom-right corner (canvas y ≳ 520 right of x ≈ 300), so nothing sits there. The em size is fitted at runtime
  (`fitPageLyric`) to the body block, which ends 14 canvas px above the license rule, so the line can never run into it
  whatever the font's metrics; the cap height is ≈ 40 px.
- **[5]** is bone light rising from the page's light in rows ("AMAZON / TOOK IT / BACK ONCE, / AND THEY / CAN TAKE / IT AWAY.").
  Each row emerges when its first word is sung and rises slowly (legible while sung), then accelerates up. It is drawn
  to the vent as one piece, turns authRed (a second, red copy of the line; a quick, staggered handover, so the white
  is nearly gone before the red is up and the row never sits in a pink white + red mix), shrinks and fades into the grille.
  The em is 0.114 m (cap ≈ 30 px).
- **[6]** is projected in authRed light on the dark upper wall behind the box (the machine's voice). PLUS flashes on its
  onset. The red light-stencil "PLUS ONLY" on the box face is the readout. The em is 0.112 m (cap ≈ 30 px).
- **[7]** is bone light, dimmed (intensity 0.74), in the dark above the dog: three left-aligned rows ("AND PANCAKE LOOKED /
  UP AT ME / HUNGRY AND LONELY"), so no row sits off-centre while it is still being sung. The em comes from
  `metresForPx` (cap ≈ 28–30 px).

## Files
- `index.tsx`: `V1Feeder` (one `<SilStage>`, which picks the shot by absolute frame; fog per shot).
- `timing.ts`: cuts, word onsets (`wordTime`), `scanAt` (red scanner once per bar), `bookLoss` (e-reader ash progress).
- `common.ts`: his reading spot and pose (`readPose`: the verified `guyHoldUp(0)` + head bowed), the feeder spot, and
  `DOG_LIE` / `DOG_LIE_YAW` (where Pancake lies across the FEEDER → LONELY cut).
- `parts.tsx`: local variants and helpers.
  - `gripMatrix` / `readerMatrix` / `readerPage`: the world frame of his right fist and of the held e-reader (the lib's
    `HELD_SILEREADER.read` grip; `readerMatrix` takes an optional extra turn in the fist, as VENT's `<group quaternion>`).
  - `rollToUp`: camera roll that keeps the page's text upright.
  - `InsertReader`: the insert e-reader, which carries the sung line on its page.
  - `RowLyric`: `<WorldLyric>` with explicit rows and a per-row slot.
- `ShotPage.tsx`, `ShotVent.tsx`, `ShotFeeder.tsx`, `ShotLonely.tsx`: the four shots.

## Notes / continuity
- **The page.** The insert uses the local `InsertReader` (written before the lib `<SilEReader>` gained `subtitle` and a
  page content slot; kept because it works and carries the insert's own 78 px letter-spaced title and license line): the
  same device dimensions and grip, with "GEORGE ORWELL" and the sung line on the page. VENT uses the lib
  `<HeldSilEReader>` for the ash, with `vent` = the CellRoom vent and flakeSize 2.6.
- **Pancake's size.** The Monolith is 0.85 m and Pancake's head top is 0.75 m. The lib box is used unscaled in every other
  scene, so it is not scaled here either. It reads "huge" because of the floor-level cameras, because Pancake stands
  behind its front plane (FEEDER), and in LONELY because the camera is about 1 m nearer the box than the lying dog
  (≈ 2.8× his height on screen).
- **Pancake's pose across the cut.** On "only" he turns his back on the box and lies down facing screen left, on
  `DOG_LIE`; LONELY opens on the same spot, heading and pose (lying, chin down), so his screen direction is continuous
  (both cameras look along −X, screen right = −Z). He then lifts his head to the man on "looked up". This sets up Pre:
  "He kneels; hand on head".
- **Hidden cell pieces.** FEEDER and LONELY hide the bed, pillow, blanket, printer and page, as V2Rain's feeder shot does.
  They also hide the door iris, so the feeder's eye is the only red eye in frame. The hammer slit is dark (`slit 0`).
- **The page's light.** In the wide (VENT) the page is a small light source: a small bone `GlowBillboard` behind the page
  that follows it (tighter and a little brighter once raised, so it outlines his arm without veiling the hood). While
  he reads, the screen faces up toward his eyes and the frontal camera sees it edge-on; that is why "take it away" is
  played with the reader raised: `raiseTurn` turns it in his fist so the page faces halfway between his eyes and the
  camera (cos ≈ 0.95 to the camera; the 'read' grip alone never gets above 0.15 at any `guyHoldUp` blend).
- **The hood.** VENT now bows the head (the old "head level, no rim" workaround for the rigid hood's drape is gone). LONELY
  still bows him mostly from the shoulders (unchanged, it reads).
- **No gold anywhere.** The hammer is warmth 0. Red appears only on TENURE things: the vent, its funnel, the scanner band,
  the eye, the slot, PLUS ONLY, the machine's sentence, and the swallowed words.
