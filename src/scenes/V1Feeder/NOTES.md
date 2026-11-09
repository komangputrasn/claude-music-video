# V1Feeder — progress log (frames 900–1424, 30.0–47.46 s)

Files: index.tsx (shot switcher + word frames W + CUT), common.tsx (staging, NightRoom w/ constant 3 point lights),
ReaderShots.tsx (A–F2), FeederShots.tsx (G–L), FeederLcd.tsx (typed LCD), Vortex.tsx (OmniStore cloud + letter stream),
ui2d.tsx (balloon, lock dialog, vignette, letterbox). Pre shares common.tsx helpers.

## Shot list (local frames)
| shot | frames | words | status |
|---|---|---|---|
| A  medium, Guy on swivel chair reading, wakes on "Kindle's" | 0–33 | My Kindle's | done |
| B  POV insert e-reader "1984 George Orwell", sparkle on Orwell | 33–98 | got Orwell, at least | done (hands look like blobs?) |
| C  3/4 close, happy, balloon "license expires TODAY" | 98–131 | for today | done |
| D  face CU: he looks UP into the aqua light, letters drift up | 131–164 | Amazon took | done (reframed) |
| E  SIGNATURE low over-shoulder orbit, letters spiral up into the OmniStore cloud | 164–212 | it back once, and they can | done (reframed) |
| F1 POV blank screen + banner "no longer available" | 212–229 | take | done |
| F2 vortex closes w/ flare, tilt down to his sad face | 229–263 | it away | done (reframed) |
| G  low establishing feeder + Pancake hopeful | 263–311 | The feeder said | done |
| H  LCD insert typing + gold PLUS+ | 311–361 | Breakfast is Plus members | check PLUS |
| I  fisheye push to padlock CLAMP + red dialog (LCD framed above captions) | 361–410 | only | done |
| J  dog-eye medium, ears droop | 410–440 | and Pancake | done |
| K  Guy POV down, Pancake looks up | 440–475 | looked up at me | done |
| L  SIGNATURE ECU push-in, tear, room falls away | 475–524 | hungry and lonely | done |


## Status (final pass done)
- Typecheck clean for src/scenes/{V1Feeder,Pre}. Only console line is the harmless THREE.Clock deprecation.
- Perf: ~1 s/frame full-res steady state (8 consecutive frames ~7-8 s incl. JPEG write).
- Known nits: Pre P2 POV has the Guy's patting arm as a big foreground shape (intentional "pat the lens");
  P3 bag whip strobes for the first ~4 frames (no motion blur); P1 shows the Guy mostly in profile/back (Pancake is the focus).
