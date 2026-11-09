# Cancel scene — progress log

Scene: frames 4126–4678 (local 0–552), song 137.53–155.95 s, lyric lines [32]–[35].
Files: index.tsx (shot switch + Stage), times.ts (W = word frames, B = beats, SHOT = cuts), kit.tsx (geo cache, Solid, easing),
Plaza.tsx (A/B shots: monument, gavel, capitol), Corridor.tsx (C shots), Naming.tsx (D 3D backdrop), Overlays2D.tsx
(news ticker, DENIED, Page Properties dialog, internal flashes), Temple.tsx (E shots), textures.ts (canvas textures).

Key local frames: passed 42.8 · click 58.4 · cancel 81.8 · court 126.2 · no 146.6 · page 183.2 · after 201.8 · page 211.4 ·
nowhere 242.6 · go 279.8 · amazon 294.2 · named 324.2 · cancel page 354.2 · iliad 410.6 · most 432.8 · honest 449.6 · name 474.2 ·
cancel 516.2 · had 548. Downbeats: 0, 63, 127, 187, 249, 309, 374, 438, 504.

## Shot list (local frames)
| shot | frames | lyric | content | status |
|---|---|---|---|---|
| A1 | 0–32 | (end of [31]) / intro | medium on Guy (phone + hammer), ground rumbles, monument rises behind | done (resumed run) |
| A2 | 32–79 | "They passed Click to Cancel" | wide hero, PASSED! gold slam + confetti, letters pop per word, news ticker | done |
| A3 | 79–127 | "Cancel, and a" | low 3/4, giant hand cursor drifts in to click, gavel shadow | done |
| B1 | 127–157 | "court said no" | gavel slam at 145, shatter, DENIED, dust | done |
| B2 | 157–172 | "so it's" | front medium Guy in wreckage looking at phone | done |
| B2b | 172–187 | "page" | POV phone insert push-in | done |
| C1 | 187–249 | "page after page with nowhere" | SIGNATURE 1: POV corridor of page gates, cursor clicks Next, lunges on beats | done |
| C2 | 249–294 | "nowhere to go" | Guy sprinting on page treadmill, stops on "go", fisheye push | done |
| D1 | 294–326 | "Amazon" | chrome OmniStore logo slam on sunburst | done |
| D2 | 326–374 | "named its cancel page" | Page Properties dialog | done |
| D3 | 374–410 | "cancel page" | zoom on Title field, I-L-I-A-D typed on beats | done |
| E1 | 410–472 | "Iliad, the most honest" | SIGNATURE 2: ILIAD temple reveal at sunset + tilt up | done |
| E2 | 472–504 | "name" | pediment hero with halo | done |
| E3 | 504–552 | "that a cancel page had" | papyrus scroll toward camera, Guy, pull back | done |

## Log
- (resume, round 1) All 14 shots render; no NOTES existed. Starting review rounds.
- round 1 fixes: A1 recomposed (low 3/4, Guy left third looking up at the rising button, rumble shake, dust puffs only behind,
  less over-exposed key); Puffs now take top/bottom colours + zOff. B2 phone pose lowered to chest (was at his nose).
  B2b: camera closer, dolly along line of sight + snap zoom (camera near plane is 0.1 m — never get closer than ~0.15 m).
  C2: head up while running so the face reads. Temple: gold capitals/bases + architrave band, darker warm marble, contrasty
  sunset key/rim lights, marble plaza texture floating on a flattened cloud sea (CloudSea), door god-rays, halo is now a
  full ellipse in front of the tympanum just above ILIAD; E2 reframed so the title-bar frieze clears the captions.

- round 2: PASSED! moved forward/lower (clear of the ticker, less confetti occlusion), monument letters thicker outline;
  gavel now drops in from above on "court" then cocks back; D2 logo lowered; temple scroll now has a giant Y2K
  scrollbar (track grows with the unrolled paper, tiny aqua thumb by the door, up-arrow button); 2D "Cancelling
  OmniStore Plus..." progress window in C1–C2 whose bar goes BACKWARDS on every beat (42% -> 3%, ETA 2 minutes -> ∞ + 1).
  Full-res perf: ~0.9 s/frame worst case (incl. shader warm-up).

- round 3: D3 letters land with a zoom punch on each beat; motion triplets checked (PASSED slam 40-46, gavel 141-145,
  C1 lunge 203-209, D3 zoom 374-378) — smooth, no popping. tsc clean for src/scenes/Cancel. Final --n=12 pass OK.

## Status: COMPLETE (all 14 shots final). Known issues / notes
- Tiny background Guy dips into the caption zone in B1 (gavel wide) and during the E1 tilt-up (deliberate, he is a speck).
- D2/D3 (Page Properties dialog) are 2D-UI shots (~2.8 s) over the 3D sunburst backdrop — intentional "screen" moment.
- Stage camera near plane is 0.1 m: B2b uses a snap zoom (fov 44 -> 13) instead of dollying into the LCD.
- B2b hand is a local box/capsule hand (POV insert), not the Guy rig.
- Optional polish ideas: more web-UI on the temple (door as a disabled aqua Cancel button), stronger god-rays.
