# Hold — progress log

Scene frames 4678–4992 (local 0–314), song 155.95–166.39 s, lyric lines [36]–[37].
Key local frames (common.ts `T`): hold 28.4 · music 38 · stopped 56 · voice 92 · came 104 · through 116.6 · one 155.6 ·
pillow 189.2 · said 221 · Is 247.4 · that 249.2 · you 257. Final chorus hits at 314.

## Files
- index.tsx — the single Stage + 2D layers
- common.ts — timing (T, SHOT), layout, drainAt
- shots.ts — pure staging: Guy float pose, camera per shot (shared with 2D anchoring)
- Notes.tsx — floating 3D music notes (freeze + fall)
- HUD.tsx — "OmniStore Customer Care" hold window (EQ, marquee, caller #2,147,483,647), pillow speech bubble, projectPx, PauseOSD (VCR ❚❚ PAUSE on "stopped")
- Pillow.tsx — HoldPillow: upright puffy SOMNIA+ pillow, self-lit white body, aqua grille waveform = its mouth

## Shot list (local frames)
| shot | frames | lyric | content | status |
|---|---|---|---|---|
| wide | 0–33 | Then the hold music | grape limbo, notes, hourglass, chrome "YOUR CALL IS IMPORTANT TO US", grid, hold window | built |
| bored | 33–55 | (music) | medium: sleepy face, phone at ear | built |
| stopped | 55–91 | stopped | freeze + VCR '❚❚ PAUSE' OSD, EQ dies, drain to dark, notes + hourglass drop; his phone's green glow is the last light | DONE |
| voice | 91–129 | voice came through | close: aqua light + rings reach his face, eyes open | built |
| reveal | 129–161 | the one from | two-shot: him + glowing pillow in the dark, voice rings | DONE (HoldPillow) |
| push | 161–280 | my pillow, and it said, "Is that you?" | slow push on the pillow alone (Guy hidden), typing dots at 'said', words pop on Is/that/you | DONE |
| face | 280–314 | (dip) | his face in aqua, soft smile, warm dawn glint | built |

## Log
- resume #1: NOTES created; everything renders; starting review rounds.
- resume #1 r1: HoldPillow replaces lib Pillow; voice light moved to the pillow side + purple fill after the drain (face no
  longer flat teal); PauseOSD; phone glow in the silence; notes cleared from the slogan sight line; close-ups framed higher.
- resume #1 r2–r5: push shot re-framed on the pillow (Guy hidden 161–280 so his hand never pokes in); notes also cleared
  from the camera→Guy sight line in the wide; first/last frames checked (VHS cut in, warm dawn smile out); caption-safe
  pass with overlays OK; typecheck clean. Final --n=12 sheet reviewed: finished end to end. ~0.65 s / full-res frame.

## TODO
- [x] caption-safe pass; typecheck; final --n=12 pass
