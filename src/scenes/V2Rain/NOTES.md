# V2Rain — progress log

Scene frames 3299–3850 (local 0–551), song 109.97–128.34 s, lyric lines [24]–[27].
Word times (local): walked 28 · home 37 · rain 62 · doorbell 79 · said 92 · who 104 · climbed 158 · window 176 ·
cops 207 · came 220 · too 244 · Pancake 277 · waiting 304 · nose 338 · box 360 · grandpa's 426 · old 454 ·
hammer 465 · doesn't 479 · care 498 · about 509 · locks 525 · (Swing "One" 549).
Beats (local): 0 16 32 49 65 81 97 114 130 146 161 178 194 210 226 243 259 276 291 308 324 341 357 373 389 405 421 438
454 470 486 501 518 535 551. Downbeats: 49 114 178 243 308 373 438 501.
All timing in `timing.ts` (W = words, SHOTS = shot ranges).

## Shot list
| shot | file | local frames | lyric | status |
|---|---|---|---|---|
| streetWide | shots/StreetShots.tsx | 0–49 | walked home | built: wet street, his car splashes him |
| streetClose | shots/StreetShots.tsx | 49–79 | in the rain | built: dolly close-up, lightning on "rain" |
| doorbell | shots/DoorbellShot.tsx + Fisheye.tsx | 79–146 | doorbell said "Who?" | built: real fisheye POV, WHO?, FACE NOT RECOGNIZED, 911 |
| climb | shots/BedroomShots.tsx | 146–207 | climbed through my window | built |
| copsOut | shots/CopsOutShot.tsx (CopCar.tsx) | 207–243 | and the cops came | built (resume #1): POLICE+ cruiser slides in, strobe on house, dispatch pop-up on 'came' |
| copsIn | shots/BedroomShots.tsx | 243–276 | too | built: strobe, hands up |
| pancake | shots/BedroomShots.tsx | 276–338 | Pancake was waiting | built; reframed above captions (resume #1) |
| nose | shots/BedroomShots.tsx | 338–373 | nose on the box | built; LCD LOCKED framed above captions |
| pat | shots/BedroomShots.tsx | 373–406 | (gap) | built; reframed, gold light-leak + sparkles on the look-up |
| reveal | shots/HammerShots.tsx | 406–454 | grandpa's | built; glow toned down, tighter push |
| hammer | shots/HammerShots.tsx + ItemCard.tsx | 454–501 | old hammer doesn't care | built; chrome text removed here (was cropped) |
| reach | shots/HammerShots.tsx | 501–551 | about locks | REBUILT (resume #1): face CU → crash zoom out on beat 518 → right fist clamps handle on 'locks' → lift → white-out |

## TODOs (resume #1)
- [x] build copsOut
- [x] fix reach shot (face + hand on the handle + whiteout into Swing)
- [x] tone down reveal glow; reframe hammer orbit
- [x] caption-safe check (pancake, nose, pat fixed)
- [x] typecheck clean
- [x] polish: street splash now pale-blue droplets (Water.tsx lenScale/widScale); cop car lighter paint + fill light + fuller barFlash
- [x] pat shot: gold light-leak overlay + sparkles motivate the look-up toward the hammer wall
- [x] final --n=12 pass with overlays (resume #1) — looks finished end to end; full-res ~0.9–1.0 s/frame
- known: the lib hammer's glow shell looks glassy/golden (library look); indoor rain gust streaks near lens in climb
