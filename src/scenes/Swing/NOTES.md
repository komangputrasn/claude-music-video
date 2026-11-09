# Swing — progress log

Scene frames 3850–4126 (local 0–276), song 128.34–137.53 s, lyric lines [28]–[31].
Key local frames (common.ts `T`): swing 26 · lid 45.8 · flew 51.8 · off 59.6 · Pancake 74.6 · ate 93.8 · enough 122 ·
picked 140.6 · phone 158.6 · hammer 175.4 · hand 191.6 · cancelling 208.4 · every 224.6 · last 231.2 · thing 239.6 · on 248 ·
plan 255.8.

## Files
- index.tsx — shot switch (one Stage per shot)
- common.ts — timing (T, SHOT), room layout constants
- Room.tsx — `RoomAfter` (smashed feeder + kibble, shared by shots 2–4), `toWorld`
- SmashShot.tsx — shot 1 (bullet time + SMASH)
- PancakeShot.tsx — shot 2 (Pancake eats; Pancake.exe window; *burp*)
- PhoneShot.tsx — shot 3 (phone + hammer hero)
- EarPhone.tsx — flip phone at the ear that reads from the front (+ screen glow position)
- CancelShot.tsx — shot 4 (MY PLANS LCD + CANCELLED stamps; "Are you sure?")

## Shot list (local frames)
| shot | frames | lyric | content | status |
|---|---|---|---|---|
| 1 smash | 0–65 | One swing, and the lid flew off | bullet-time: frozen mid-leap, letterbox, speed lines, orbit 130°→312° (behind → his right → front-left) 0–26; drop 20–26 with swoosh smear locked to the hammer head; SMASH 26 (white flash, shake, padlock pops off and tumbles to the floor); slow-mo 0.3x, speed-ramp 50–62 (simAfter), lid rips off on 'lid' (44) and lands on 'off' | DONE (resume #1) |
| 2a react | 65–81 | Pancake | kibble rains, bonk, happy eyes | built, good |
| 2b eat | 81–114 | ate till | floor-level eating, wag lines, Pancake.exe download | built, good |
| 2c content | 114–131 | he'd had enough | sits back, hearts, *burp*, 100% | built, good |
| 3a phone | 131–146 | I picked up the phone | flip phone snaps open in front of face | built |
| 3b hero | 146–208 | phone with the hammer in my hand | low 3/4 medium; EarPhone (bigger, turned so its back/ext LCD faces camera); golden sunburst halo + glint on 'hammer'; snap push-in + shake on 'hand' | DONE (resume #1) |
| 4 cancel | 208–276 | I'm cancelling every last thing on a plan | Guy left + giant MY PLANS LCD right, 7 CANCELLED stamps on beats/words, $0.00, "Are you sure?" | built, good |

## Log
- resume #1: NOTES created; all shots render; starting review rounds.
- resume #1 r1: SmashShot rebuilt (orbit/framing/key light/flash/smear/padlock/time remap in common.simAfter); kibble params shared
  (KIBBLE_BURST) so RoomAfter matches; RoomAfter shows the landed padlock. PhoneShot hero re-staged; EarPhone.tsx added
  (lib phone-at-ear is edge-on from the front, invisible).
- resume #1 r2–r5: golden Sunburst halo behind the hammer on 'hammer'; CancelShot uses EarPhone + screen glow; green spill
  toned down (face blew out); Pancake content shot re-framed (head no longer cropped) and *burp* moved off the window; lid
  rip ramp on 'lid'; first/last frames checked (flash into bullet time, "Are you sure?" into the Cancel glitch);
  caption-safe pass OK; typecheck clean. Final --n=12 sheet reviewed: finished end to end. ~0.65 s / full-res frame.

## TODO
- [x] caption-safe pass with overlays; first/last 8 frames; typecheck; final --n=12 pass
