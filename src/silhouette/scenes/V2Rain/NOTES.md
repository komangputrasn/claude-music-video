# V2Rain — verse 2b, "walk home in the rain" (TERMS cut)

Absolute frames 3299–3850 (song 109.97–128.34 s, 551 frames). Scene-local frame = absolute − 3299. Five shots; every
cut sits on a beat (`timing.ts` snaps them to `BEATS`). Lyrics owned (`sceneLyricLines(109.97, 128.34)`): 23 (tail:
"way." 110.00), 24, 25, 26, 27, 28 ("One" 128.26, 0.08 s before the cut, handed over to Swing).

Files: `index.tsx` (shot switch) · `timing.ts` (cuts + word times) · `Shot*.tsx` (one per shot) · `LyricBlock.tsx`
(local helper: a lyric line split into explicit rows/blocks via `<WorldLyric perWord>`, so a line can flank a window,
a slit or a door symmetrically; same glyphs, timing, colours as WorldLyric) · `SilOver.tsx` (local helper, shot 3:
re-skins a silhouette with a flat void material drawn AFTER additive volumes, with an optional world clip plane).

| # | shot | local frames | song s | syncs to | camera | what reads in silhouette | lyric lives… |
|---|---|---|---|---|---|---|---|
| 1 | STREET | 0–80 | 109.97–112.66 | "way." 110.00, "I" 110.40, "walked" 110.90, "rain" 112.02, "doorbell" 112.60 → cut on the beat 112.66 | low (1.05 m), long lens (visible fov 16), dead-centre one-point perspective down a black avenue, slow dolly in 2.4 m | tiny hooded figure walking AWAY from us down the axis, black against a giant bone TENURE screen at the avenue's end and its long reflection in the wet road (WetGround); a red iris on the screen right above him; two TENURE banners with red irises flank the axis; hard rain (SilRain) dark over the screen | as black letters ON the giant screen ("dark" mode, rain-streaked; mirrored in the wet road): line 23 tail "WAY." alone (110.00–110.40; V2Car's patent claim already showed "FORD FILED A PATENT FOR THAT BY THE" up to the cut, so the line completes here instead of repeating), then line 24 word by word in the same top-centre slot |
| 2 | DOOR | 81–145 | 112.66–114.82 | "said" 113.02; "Who?" 113.44 → iris snaps to a pinpoint, red scan line runs down the door, IDENTITY NOT ON PLAN lights; "so" 114.04 → he turns away left toward the window | symmetrical, low (1.55 m), long lens (visible fov 19.5), slow push-in; the house a black cube against the haze of two distant screens; wet ground | the cube's door is a pale TENURE panel with a big red iris (the doorbell); he stands on the step, a black cut-out against it, his hood cutting into the bottom of the eye; then turns and walks off left | projected as light across the facade above the door, under the roof lip: "I WALKED HOME / IN THE RAIN, / AND THE DOORBELL / SAID, "WHO?"", then "SO"; the doorbell's answer IDENTITY NOT ON PLAN in red mono over the lintel |
| 3 | CLIMB | 146–275 | 114.82–119.17 | "climbed" 115.24 knee up, "window" 115.82 through, lands crouched by "cops" 116.86 → two red drone cones fade in (0.4 s, no flash) and criss-cross the floor through the window; "came too" | inside the cell, symmetrical on the window (back wall removed, bed hidden), visible fov 23, tiny push-in | the window (blinds bunched aside) full of rain and city glow; he climbs in as a black shape against it (guyClimb), lands crouched; the red LightShaft cones enter at the top of the window, pass behind him (he is drawn after them: clean black cut-out) and pool on the floor; the bone glow under the sill becomes their red spill; a red band runs through the window light | two light blocks in the haze of the room flanking the window: "SO I CLIMBED / THROUGH MY / WINDOW," left, "AND THE COPS / CAME TOO." right |
| 4 | WAITING | 276–405 | 119.17–123.48 | "Pancake" 119.20 (cut on the beat 119.17); "nose" 121.22 he presses in; "box" 121.96 the Monolith's eye contracts on him | floor level (0.36 m), long lens (visible fov 16), three-quarter from the front-right of the cell toward the back-left corner, slow push-in | Pancake in profile, nose on the Monolith's face (pancakeAtMonolith), ears low (earPerk −0.75), tail STILL; the red eye on the box's brow right above his head; both black against the hammer-slit light spilling over the wall; striped window light on the back wall behind his tail | in the dark haze above them: "PANCAKE WAS WAITING / WITH HIS NOSE ON THE BOX," |
| 5 | HAMMER | 406–550 | 123.48–128.34 | "grandpa's" 124.18, "old hammer" 125.10/125.46, "care" 126.56, "about locks" 126.92/127.48 → a red TENURE scan line crosses the wall behind the hammer; "One" 128.26; cut into Swing 128.34 | dead-on, symmetrical, slow decelerating push-in (camera 6.3 → 4.0 m from the wall, visible fov 11) | the vertical light slit with grandpa's hammer across it on two pegs — a black cross; the wooden handle's top edge carries a faint dawnGold line (warmth 0.3, the ONLY gold before the impact); everything else grey/red | painted faintly on the concrete, flanking the hammer: "AND MY / GRANDPA'S / OLD HAMMER" · "DOESN'T / CARE ABOUT / LOCKS." and "ONE" under it in the last 2 frames |

Continuity: hood up throughout; Pancake ears low, tail still (`tailWagAmount: 0`); gold only on the hammer handle
(warmth 0.3) and the hammer hangs on its pegs in every cell shot (3, 4, 5); the Monolith at `CELL_SPOTS.feeder`;
the house = `HouseCube`, the cell = `CellRoom`; night, rain, screens are the only light. Rhythm from light: the end
screen, distant screens, window glow, wall glow and slit breathe with `bassAt`; the Monolith pupil with `beatAt`.

Staging lessons (for the next person in this folder):
- The HouseCube roof parapet lip stands 8 cm proud of the facade from y 7.5: facade text must stay below ~7.4.
- Lyric planes face +Z: a camera looking toward +Z (shot 3) needs `rotation-y={π}` or the text is back-face culled.
- LightShaft through a window: the beam's cross-section must clear the sill and the jambs (keep the beam centre at
  |x| ≲ 0.5, mid-height of the opening), or the rays whose back faces sit behind the wall drop and leave black "bites".
  Splitting the beam at the wall makes it worse (rays exit through the open start). Lift `ground` 2 cm above the
  floor (coplanar hull = z-fight = black footprint), and keep beams off furniture (the bed cut black holes → hidden).
- A Backlight card near cell walls gets clipped hard; lay glow cards FLAT on the walls behind the subject instead.
- An additive volume (LightShaft) that lies BETWEEN the camera and a silhouette paints over it (the "clean cut-out"
  only holds where the beam's back faces are behind the figure). Shot 3's cones land on the floor in front of him, so
  he is wrapped in `<SilOver>` (drawn in the transparent pass after the shafts, depth written).
- Shot 3 beam geometry: lamps at y 4.4, z 9, |x| ≤ 0.45 → the beam centre crosses the wall at y 1.5–1.75 (r ≈ 0.3),
  clear of the sill (1.0) and jambs (±0.85). With the lamps at 3.45 the beam's bottom clipped the sill and the dropped
  rays left a black bite in the window's lower corner.
- guyClimb (lib pose) swings the rising knee THROUGH the 0.2 m wall under the sill (p ≈ 0.12–0.35): from inside, a foot
  floats out of the wall. `<SilOver clipBelow>` clips him at the sill until p 0.34, then lowers the plane to the floor
  by p 0.40 (the leg reads as coming over the sill).
- Red over a bone glow reads salmon/pink: fade bone glows out (or turn them red) where red cones cross them.
