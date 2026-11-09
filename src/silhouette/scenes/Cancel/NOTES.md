# Cancel — shot list (TERMS silhouette cut)

Absolute frames 4126–4678 (song 137.53–155.93 s, 30 fps; scene-local frame = absolute − 4126). Bridge: legal
architecture. Three shots, hard cuts on the line onsets ("so" 142.86, "Amazon" 147.33, which is also a beat). Cut to
Hold at 155.93. All sync points are in `timing.ts` (from `wordTime`, so they follow `lyrics.json`).

Lines owned (`sceneLyricLines(137.53, 155.95)`): 32, 33, 34, 35. Each is staged in the world with `<WorldLyric>`.

| shot | local frames | song s | lyric / beat sync | camera | what reads in silhouette |
|---|---|---|---|---|---|
| **A · Court** (`ShotCourt.tsx`) | 0–159 | 137.53–142.86 | [32] "They passed 'Click to Cancel,' and a court said no," — button lights on **passed** 138.96, throbs on **Click** 139.48 / **Cancel** 140.26; lecterns' irises open centre-out on **and** 141.00; gavel lowers out of the dark until **court** 141.74; blow 141.93 → **impact frame 4261 (142.03, onset of "said")**; **blackout 4262 (142.06)**; "SAID" / "NO," (142.42) burn alone in the black | From the gallery, dead on the axis, fov 24 (visible), slow push-in 41 → 33 m; held still from the blow on | A vast dark court: a portal of bright haze; a RING of eight tall black lecterns (faceless judges: high-backed seats as wide as their desks, so they never read as crosses, with red iris eyes) on a floor inlaid with light circles; a black plinth with one red button in a pool of light. He walks up the axis (back to us, hammer in his right hand; he starts just off the plinth's line of sight so the two silhouettes never merge) and reaches across for the button, his hand over the red dome. A colossal gavel (barrel head, flared faces) lowers out of the dark, winds up and slams down onto the button, inches from his hand. Every light in the hall dies (hard, no flash). |
| **B · Pages** (`ShotPages.tsx`) | 160–293 | 142.86–147.33 | [33] "so it's page after page with nowhere to go." — printed word by word on every landing at once; he steps onto the landing exactly on **nowhere** 145.62; looks up at the next flight around **go** 146.86; every page's red CONTINUE button pulses on the beat (bass is out here) | Hangs above the stair on the axis looking down it at ~30° (just steeper than the stair's 22°), so its vanishing point sits in the upper third: one-point perspective, fov 26 visible; drifts slowly up and back | A canyon of bureaucracy: two endless walls of filing drawers falling into the dark. A staircase of white paper climbs out of the abyss; every landing is the SAME page (TENURE form 14-C, "PAGE 1 OF 1", red CONTINUE) with the sung line printed on it, receding page after page into blackness. The flights fall behind each landing's brink, so the stair reads as a terrace of identical pages shrinking into the dark. He climbs toward us and rises over the brink of the hero page (a black shape against the next page), steps onto it, stops, lifts his head to the next flight. Loose giant pages tumble down the canyon beside the stair. |
| **C · Iliad** (`ShotIliad.tsx`) | 294–552 | 147.33–155.93 | [34] "Amazon named its cancel page 'Iliad,'" cut in light at his scale, **ILIAD** (151.22) a larger title row; [35] "the most honest name that a cancel page had." cut high on the wall from **the** 151.70; bass (back at 147.84) pulses the red trench light; extra swell on **honest** 152.52; line 34 stays carved to the cut | Holds low on him at the foot of the wall, then (from ~148.5) a slow crane up and back, 37 → 128 m, eye 1.35 → 13.5 m, to the whole wall | A colossal wall of Greek capitals cut stoichedon into ashlar (Iliad I.1–32, unreadable at scale), raked by a red light trench at its foot: every chisel cut catches red, the face stays dark. The relief map is pre-lit per channel (see `textures.ts`), so from 100 m+ the carving still reads as a fine red grain fading up into the dark instead of going flat. He stands tiny and black against the red glow, hammer hanging from his right hand, and looks up. The sung lines are carved among the Greek in Latin capitals filled with light. The crane reveals the wall going on forever above him. |

## Lyric placement
- **[32]** the court's frieze inscription over the portal (light inlaid in stone, 2 rows); "CANCEL" red. After the blow
  the earlier words dim and the verdict "SAID NO," burns alone in the dark.
- **[33]** printed (paint, dark ink, em 0.78) on every landing page at once, 4 rows: the same page, everywhere.
- **[34]** cut in light into the Iliad wall above him; "ILIAD," set 2.1× as a title row; "CANCEL" red.
- **[35]** cut in light high on the wall (em 3.5 m), revealed by the crane; "CANCEL" red.
- Cap heights at full res: frieze ≈ 31–36 px, hero page ≈ 28–40 px (far rows → near rows), line 34 ≈ 60 px (start) →
  ~36 px at "ILIAD" (that row ~80 px) → small rows ~16 px at the cut (no longer sung), line 35 ≈ 45 → 34 px.

## Continuity
- Hood up throughout; grandpa's hammer in his RIGHT hand (`HeldSilHammer warmth` 0.18–0.22: only a faint gold edge,
  the only gold in the scene). Pancake is not in this scene (he is at home eating, after Swing).
- authRed only on control: the cancel button, the judges' irises, CONTINUE buttons, "CANCEL" words, the Iliad wall's
  light (TENURE's cancel page). Greys elsewhere.

## Notes / deviations
- The blackout at 142.06 is a whole-frame brightness change outside the chorus entrances: it is the story beat the
  treatment asks for ("a single gavel strike blacks out the hall"). It is a hard cut of the lights, not a flash.
- The camera in B looks down the stair a little more steeply than the stair descends, so every flight is hidden behind
  the brink of the landing above it: the stair reads as a terrace of identical pages receding to a vanishing point, and
  his feet stay hidden by the brink until he steps onto the hero page on "nowhere".

## Files
`index.tsx` (shot switch) · `timing.ts` (sync points) · `common.tsx` (helpers, `rowsPerWord`) · `textures.ts` (page,
drawers, treads, ream edge, the Iliad pre-lit relief map) · `ShotCourt.tsx` · `ShotPages.tsx` · `ShotIliad.tsx`.

Preview: `node scripts/still.mjs sil Cancel --times=139.6,141.85,142.03,142.6,143.9,145.9,148.6,151.45,155.9`.
