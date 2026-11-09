# Intro + Outro — progress log (one agent owns both; Outro reuses Intro/rtt.tsx + Intro/Void.tsx)

## Intro (frames 0–371, 0–12.38 s) — shot list (scene-local frame = song frame)
| shot | frames | song s | content | status |
|---|---|---|---|---|
| S1 | 0–72 | 0–2.42 | black -> CRT floats in Y2K void (stars, grid, chrome $ @ +), power-on line/flash on beat 1.30 (f39), boot screen "Y2K OS" | done |
| S2 | 73–138 | 2.42–4.64 | DB snap closer: desktop + "Loading your life..." 0->99 % (files bed.sub, pillow.sub...) | done |
| S3 | 139–205 | 4.64–6.85 | DB fisheye-ish close-up: dialog "Your subscription to EVERYTHING is now active [Buy Now]", cursor clicks on beat f189 -> white bloom -> THANK YOU card | done |
| S4 | 206–270 | 6.85–9.03 | DB wide: chrome "BUY NOW," bursts out of the screen letter by letter (strobe, flare) | done |
| S5 | 271–337 | 9.03–11.26 | DB "FOR NOW" slams from behind camera, swoosh, sunburst; TV channel-hops (static, f305) to dark bedroom 3:15 | done |
| S6 | 305–371 | 10.15–12.38 | TV channel-hops (static) to a camcorder REC feed: close-up of the red LED "3:15"; DB 11.26 title blows apart, speed lines, main camera dives into the glass while the in-TV camera cranes up/back over Pancake + the Guy and lands EXACTLY on V1Bedroom's opening camcorder wide (BedroomFeed.tsx; DIVE_K=0.88 calibrated by blending Intro f370 with V1 f0) | done — match cut verified |

## Outro (frames 6126–6600, local 0–474) — see src/scenes/Outro/index.tsx header
| shot | local | song s | content | status |
|---|---|---|---|---|
| O1 | 0–80 | 204.2–206.9 | camcorder PLAY: porch sunrise, Guy reading paper 1984, Pancake by empty bowl wagging | done |
| O2 | 81–146 | 206.9–209.1 | Pancake close-up into the camcorder, head tilt, tongue | done |
| O3 | 147–211 | 209.1–211.3 | two-shot: he holds up 1984 to the lens; Pancake happy | done |
| O4 | 212–276 | 211.3–213.4 | pull back: footage is on the CRT in the morning bedroom | done |
| O5 | 277–342 | 213.4–215.6 | BOOKEND of V1Bedroom's 3:15 AM opening wide (same camera + creep) at 7:15 AM dawn: Guy asleep smiling, Pancake asleep at the bed foot (tail thumps), Zzz, hammer on its hook (glow), smashed feeder + empty PANCAKE bowl on the feeder spot, TV still playing at frame right | done (R1) |
| O6 | 343–374 | 215.6–216.7 | PAUSE, CRT power-off line -> dot | done |
| O7 | 375–474 | 216.7–220 | end card: chrome BUY NOW, FOR NOW + "click to cancel" (callback to the last lyric), cursor clicks at 427 -> link turns lime "✓ cancelled" + ring (it works, for once), card collapses CRT-style 440 -> line -> dot -> black ~470 | done (R1) |

## Round log
- (resume) rendered --n=12 both scenes: all shots present and look good. Review rounds start now.
- R1 Intro: replaced the pink clock picture with BedroomFeed (V1 'wide' staging imported from V1Bedroom: bedPose, TalkPillow, Zzz; night env for the RT via new RenderToTexture env prop; REC OSD replica drawn into the picture). rtt.tsx now also hosts useOverlayScene (Porch re-exports it).

- R1 Outro: O5 restaged as V1 bookend; porch footage de-hazed (TV glow 0.8 while filling, SunFlare 0.2, warm fill 1.7); O3 zooms out a notch when the book goes up; end-card click payoff.
- R1 checks: Intro->V1 transition rendered in main comp (VHS cut) = seamless; motion triplets for both scenes OK.

- R2: bowl moved behind the feeder (was hidden / then blooming in the sunbeam); full-res perf: Intro <1.2 s/frame, Outro <0.9 s/frame.
- R3: --n=12 both scenes with overlays: finished end to end. Audio check: end-card slam 216.70 s is on an onset; click 218.43 s on the decaying tail; black by ~219.6 s.
- Neighbour previews were rendered into the scratchpad (never into other agents' .preview folders).

## TODO
- Outro start vs Final end: Final was still a stub during this work — once it exists, check its last frames flow into the sunrise camcorder porch (VHS cut).
- Intro imports V1Bedroom's bedPose / TalkPillow / Zzz (read-only) for the match cut: if V1Bedroom's wide shot changes, re-check Intro f370 vs V1 f0 (blend test, DIVE_K).
