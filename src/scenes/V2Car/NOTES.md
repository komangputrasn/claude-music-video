# V2Car — progress log

Scene frames 2777–3299 (local 0–522), song 92.56–109.97 s, lyric lines [20]–[23].
Word times (local frames): car 46 · seats 52 · cold 68 · heat 100 · tier 143 · speed 165 · tier 201 · crawled 230 ·
first 257 · gear 269 · stopped 296 · gas 329 · car 362 · drove 376 · away 389 · Ford 434 · filed 447 · patent 470 ·
that 492 · by 507 · way 523 (just past the end).
All key frames live in `timing.ts` (W = words, B = beat-snapped cuts/hits).

## Shot list (current)
| shot | file | local frames | song s | lyric | content | status |
|---|---|---|---|---|---|---|
| S1 ignition | ShotIgnition.tsx | 0–48 | 92.56–94.16 | (pickup) "The" | night street, sodium lamps; headlights SNAP on (flares) on beat 16; push-in ends on his face behind the windscreen | done |
| S2 cold seats | ShotCabin.tsx | 48–98 | 94.16–95.83 | car seats went cold | passenger-side; frost creeps over the seats, snap-zoom + shiver + breath on "cold" | done |
| S3 heat tier | ShotCabin.tsx | 98–163 | 95.83–98.01 | 'cause the heat is a tier | frontal wide-angle from the dash; SEAT HEAT pop-up on "heat"; chrome PLATINUM TIER + gold $7.99/mo + flare on "tier", he stares down the lens | done |
| S4 speed tier | ShotDash.tsx | 163–228 | 98.01–100.17 | and the speed is a tier | driver POV on the gauges: speed lines + needle surge on "speed"; red PADLOCK slams on downbeat 180; SPEED PACK $12.99/mo tag swings in on "tier" | done |
| S5a crawl | ShotCrawl.tsx | 228–261 | 100.17–101.27 | so I crawled in | low side tracking shot, exhaust putt-putt, racing snail overtakes; RaceHUD POS 1/2 | done |
| S5b first gear | ShotCrawl.tsx | 261–293 | 101.27–102.35 | first gear | telephoto snail hero shot, car looming behind; HUD POS 2/2 + OVERTAKEN! | done |
| S6a stopped | ShotGas.tsx | 293–326 | 102.35–103.44 | I stopped to | exterior establishing: neon canopy, PREMIUM+ $9.99/mo sign, sodium lamp; brake lights on "stopped" | done |
| S6b gas | ShotGas.tsx | 326–359 | 103.44–104.54 | get gas, and the | pump two-shot: price races, GALLONS 0.000; deadpan look to camera | done |
| S6c car | ShotGas.tsx + GasDialog.tsx | 359–375 | 104.54–105.07 | car | low front: headlights snap on by themselves (flares), red dash; 2D "Lease payment late... returning to the dealer" dialog | done |
| S7a drove | ShotGas.tsx | 375–391 | 105.07–105.60 | drove | from behind him: empty car lurches off, nozzle rips out (splash + sparkle) | done |
| S7b away | ShotGas.tsx | 391–424 | 105.60–106.70 | away | he turns to the lens, deadpan, nozzle drooping; the car's taillights sweep away behind | done |
| S8 patent | ShotPatent.tsx + blueprint.ts | 424–522 | 106.70–109.97 | Ford filed a patent for that, by the way | scroll whooshes in, unrolls, lands on downbeat 440; header types on; FIG.1 draws; PATENT PENDING stamp on "patent"; FIG.1 car drives off the sheet on "by the way"; rain starts (-> V2Rain) | done |

## Review log
### Round 1 (resume #1)
- S2: key light moved away from the hanging CD (its string bloomed into a white streak); "cold" zoom reframed via aimAt
  (hair no longer cropped, CD at the right edge); breath blows toward camera-left.
- S3: NEW frontal 3/4 camera from the dash top (wide fov 74->68, Y2K wide-angle); he looks at the pop-up, then straight
  down the lens on "tier". Pop-up/WordArt placed with ndcPoint(); pop-up wrapped in <OnTop noDepth> (it intersected the
  instrument binnacle + car glass drew over it).
- S4: speed-line burst on "speed" that dies on the padlock slam; padlock raised so the LCD reads SPEED PACK REQUIRED.
- S5: split: S5a 228-261 side tracking (exhaust puffs, snail overtakes), S5b 261-293 telephoto snail hero shot with the car
  looming behind. RaceHUD.tsx (2D PS2 racing HUD: POS 1/2 -> 2/2 + OVERTAKEN! banner at 261, TIME, GEAR 1, 2 MPH).

- S6/S7: ShotGas rewritten with 5 setups (see table) + GasDialog.tsx; car path = straight 5 m then R=3 right turn (clears
  the store front); nozzle droops in S7b (per-phase nozzle pitch).
- S1: push-in ends frontal + higher so his face reads through the windscreen; flares toned down.
- S8: fly-in re-choreographed (old one swung the tube across the screen in 2 frames); patent title enlarged.

### Round 2-3
- captions-on pass at every key word (94.30 ... 109.50): all illustrated, faces/text above CAPTION_ZONE.
- motion triplets: padlock slam 176-182, nozzle rip 377-383, patent fly-in 424-441 (re-choreographed) all smooth.
- first/last 10 frames: glitch-in from Chorus1 night snap works (car parked, lights off); ending = rain + FIG.1 car
  leaving the sheet under the global VHS cut into V2Rain (whose first shot is his car splashing him in the rain).
- typecheck clean; browser console: only the known THREE.Clock deprecation warning.
- perf: 8 full-res frames rendered in 5.0 s incl. startup (~0.6 s/frame).

## Status: DONE (all shots final). Known minor issues
- S3: the gold "$7.99/mo" can overlap a lit house window outside (reads as a yellow box behind "mo").
- S5b: from the low angle only his hair shows over the dash (face is in S5a).
- S6c: he is partly hidden behind the pump column.
- OnTop noDepth mutates the Popup3D's own per-instance materials (safe; never use it on cached materials).
