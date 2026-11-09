# Chorus1 — progress log

Scene: frames 1732–2777 (local 0–1045), song 57.75–92.56 s, lines [12]–[19].
Local frame = song s × 30 − 1732. Downbeats (local): 49,115,180,245,310,375,441,506,572,636,702,767,832,897,962,1028.

## Shot list (local frames) — status
| id | frames | lyric | shot | status |
|---|---|---|---|---|
| S01-open | 0–49 | You said "Buy now" | white-out → crane down on house, chrome BUY NOW pops letter by letter on "Buy"/"now" | done |
| S02-heroFlip | 49–115 | but you meant "for now" | low orbit under sign, shiver on "meant", flip to gold FOR NOW on "for" + strobe, fine print | done |
| S03-houseWrap | 115–180 | you put my whole house | push-in on house; ribbon wraps on "whole", bow+$9.99/mo tag on "house" | done |
| S04-planShrug | 180–245 | on a plan somehow | Guy in yard, billing pop-up on "plan", shrug on "somehow" | done |
| S05-doneClose | 245–291 | I'm done with | fisheye close-up, pop-ups invade | done |
| S06-tunnel1 | 291–352 | "upgrade to continue" | pop-up tunnel, hero dialog per beat | done |
| S07-chase1 | 352–440 | click to cancel | Cursor3D vs runaway CANCEL button | done |
| S08-point1 | 440–510 | I'm cancelling you | point at lens, beat push-ins, "you" slam | done |
| S09-split | 510–572 | You said "Buy now" | split screen: Guy / chrome BUY NOW turntable | done |
| S10-roofSign | 572–636 | but you meant "for now" | rooftop sign flips letter by letter | done |
| S11-dogBeg | 636–702 | and my dog's breakfast is locked | Pancake + feeder on lawn, lock clamps on "locked" | done |
| S12-pedestal | 702–735 | in a box | feeder on museum pedestal under spotlight | done |
| S13-overhead | 735–767 | on the ground | top-down crane-up | done |
| S14-highAngle | 767–832 | I'm done with "upgrade | fisheye from above, pop-ups pile up | done |
| S15-tunnel2 | 832–881 | to continue" | Guy sprints through pop-up tunnel on neon grid | done |
| S16-chase2 | 881–962 | click to cancel | chase #2 with Pancake | done |
| S17-point2 | 962–1028 | I'm cancelling you | point #2 | done |
| S18-nightSnap | 1028–1045 | (tail) | "Daylight trial has ended" → night, bridge to V2Car | done |

## Log
- (run 2) resumed: all 18 shots exist, typecheck clean. Starting review/polish rounds.
- (run 2) PointShot (S08/S17) redesigned: beat-stepped camera keys (stepCam) that slide onto his right-shoulder line,
  hard snap + SpeedLines + strobe on "you"; arm aimed via solvePointArm (Performer.tsx, iterative IK with guyPoint) at the
  lens direction swung ~10 deg outward (end-on points vanish into the mitten fist); PointFinger enlarged + seated on the fist.
  Variant 2 starts at dog height with Pancake barking on the beats (out of frame for the close-up).
- (run 2) S09 split right panel = home-shopping turntable with a mini price-tagged House model, BUY/NOW above, purple stage.
- (run 2) S12 pedestal restaged (Pancake in profile gazing up at the exhibit, rope below the box, dimmer light).
- (run 2) S13 overhead: telestrator gag (Telestrator.tsx: MarkerCircle/MarkerLabel ground decals) — BREAKFAST (locked),
  PANCAKE (hungry), THE GROUND circled on "ground". Pancake lies nose-to-box, face up to camera.
- (run 2) S04 billing dialog moved right so it no longer hides the price tag.
- (run 2) S07/S16: Y2K starburst "MISS!/NOPE!/ERROR" pops projected onto the cursor tip at every missed click
  (projectPx in shots/common.tsx mirrors CameraRig; chase cameras factored into cam1/cam2).
- (run 2) S02 + point-shot sunbursts pushed far behind the hills (no more hazy blue hills).
- (run 2) S15 tunnel2 camera tighter. Perf: ~1.0 s/frame at full res incl. the dual-Stage split. tsc clean, no console errors.
- (run 2) Final --n=12 pass looks finished end to end. STATUS: DONE.

## TODO / known nits
- CANCEL button label glare: top half of the gel highlight blooms a bit (still readable).
- S15 pop-ups read slightly pale against the pink sunburst.
- dev/PoseTest.tsx is a dev harness only (DEV_TEST=false in index.tsx; TEST shot range is negative, never shown).
