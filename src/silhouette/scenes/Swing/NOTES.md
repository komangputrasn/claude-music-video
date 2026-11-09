# Swing: bridge, "One swing." (TERMS cut)

Absolute frames 3850–4126 (song 128.333–137.533 s, 276 frames). Scene-local frame = absolute − 3850. This is the turning
point of the film: the first gold. There are three shots, and every cut sits on a beat (`timing.ts` snaps them to
`BEATS`). The scene owns these lyric lines (`sceneLyricLines(128.34, 137.53)`):
- 28: "One" at 128.26 falls 0.08 s before the scene starts, so it belongs to this scene.
- 29, 30, 31.

The hammer impact falls at exactly **129.20 s = abs 3876 = local 26**. At that frame `monolithSwing(0.5)` puts the
striking face on the iris, and the shatter, spill and kibble clocks start.

Files:
- `index.tsx`: the shot switch.
- `timing.ts`: cuts, word times, and `boxState(abs)`, the box clocks. They are continuous across the cuts: the swing phase,
  shatter, spill, kibble and hammer warmth.
- `common.tsx`: the Monolith at `CELL_SPOTS.feeder` and the room-space anchors. It also holds the lease-tag wall, which
  sits on the left wall in a wall-local frame so that LeaseTags' `'centre'` order works.
- `Shot*.tsx`: one file per shot.
- `LyricRows.tsx`: a local helper. It splits a lyric line into explicit rows or blocks through `<WorldLyric perWord>`.
- `GoldSpill.tsx`: a local, NaN-safe copy of the Monolith's spill (see the workaround below).

| # | shot | local frames | song s | syncs to | camera | what reads in silhouette | where the lyric lives |
|---|---|---|---|---|---|---|---|
| 1 | SWING (God's-eye) | 0–80 | 128.33–131.03 | "One" 128.26 (the hammer drawn back); the slow descent; **"swing," 129.20 is the impact** (iris shatters, bone flash, red glass); "lid" 129.86 / "flew off" 130.06–130.32: the panels fall, the gold floods out and kibble sparks fountain at the lens; "Pancake" 130.82: the dog pads into the gold and starts eating at the heap. The cut falls on the **downbeat 131.03** | high above and behind him, ~20° off vertical (ceiling removed), long lens (visible fov 15.5), slow crane down 8.6 → 7.6 m | The black box at the top of frame, its red TENURE eye looking straight up at the lens. Below it is his hooded back with the hammer raised. The floor is barred by the cold window light, and a red scan slides along the bars. Pancake lies on the bars beside him, tail still. After the blow: gold pours out of the open front toward us, the man straightens and steps back, and Pancake rises (ears up, the first tail wag) and goes to the glowing heap | As light on the concrete floor, split around the blow: "ONE / SWING," on the left of the eye and "AND THE LID / FLEW OFF," on the right. "ONE" shows in the cold bone light; from the impact frame every word is gold. "PANCAKE" (line 29) then lights up in gold on the floor where he lay waiting |
| 2 | PANCAKE (floor level) | 81–129 | 131.03–132.63 | "ate" 131.46, "enough." 132.40. The cut falls on the beat 132.66 | 0.3 m high, long lens (visible fov 16), square into the broken front of the box, slow lateral drift | Pancake in profile with his head down in the glowing kibble heap, the box blazing gold behind him, sparks still falling. **His tail wags**: a black curl against the gold. The bone hammer slit is on the right, and TENURE's door eye is dimmed at the top left | Gold light rising in the warm air over the box, "PANCAKE ATE / TILL HE'D HAD ENOUGH." Each word drifts upward like an ember (3 cm/s) |
| 3 | STAND (the cell cut open) | 130–275 | 132.67–137.53 | "I" 132.72. "picked" 133.02: the phone comes up to his ear and the bare wall lights up with red lease tags in a wave, TENURE listing his account (to "phone" +0.3). "hand," 134.72. "cancelling" 135.28: the tags die one by one, outward from behind him. "plan." 136.86: the door's red eye fails and dies, leaving a black sun. The cut to Cancel falls at 137.53 | Dead-on from beyond the removed right wall: a symmetrical dollhouse with the door on the left and the hammer slit on the right. Long lens (visible fov 16), slow push-in 10.8 → 9.6 m | He stands square to us with the broken box directly behind him, so its gold rises around him like a corona (a radial gold haze card behind him): wide at the cut, continuing shot 2's gold; squeezed to a narrow column while the red tags are lit, so gold and red sit side by side instead of mixing to orange; widening and brightening as the tags die, so that at "plan." he stands black in a gold field. A thin gold rim lights his edges. The hammer slit is dimmed (0.26) so its cold line does not compete with him. Grandpa's hammer hangs head-down from his right hand (gold edge), and the flip phone is at his left ear (its light leaks around the hood). Pancake eats at his feet, tail going. The red wall dies, and he is left black in gold | Gold light on the concrete above the tag field. Line 30 is centred over him; its second row needs the full wall width. Line 31 is centred at z 0.58, a little toward the door, so "PLAN." ends before the slit's light line. Line 30 runs "I PICKED UP THE PHONE / WITH THE HAMMER IN MY HAND,". At "I'm", line 31 replaces it in the same band, "I'M CANCELLING / EVERY LAST THING ON A PLAN.", with CANCELLING and PLAN in authRed |

Continuity:
- **Hood:** up throughout.
- **Pancake's tail:** still (wag 0) until the impact frame, then wagging. Ears low before, up after.
- **Gold:**
  - Before 129.20 the only gold is the hammer handle at warmth 0.3, the V2Rain foreshadow.
  - From the impact on there is the spill, the kibble, the hammer at warmth 1, the thin gold rims, the gold lyrics and
    the corona.
  - Red stays TENURE throughout: the iris, the scan, the door eye, the lease tags, CANCELLING and PLAN.
- **Location:** the CellRoom, with the Monolith at `CELL_SPOTS.feeder` as in V2Rain.
  - The bed is hidden in all three shots, as in V2Rain's cell shots.
  - The hammer pegs on the slit are empty: the hammer is in his hand.
  - The left wall is bare until he dials (shot 3), so V2Rain's hammer-wall shot and this scene's shots 1 and 2 agree.
- **Hands:** the hammer is in his right hand and the phone in his left.
- **Light rhythm:** the window bars, the gold aura and the corona breathe with `bassAt`, and the tags flicker.

Staging lessons:
- **Bloom veil.** The gold is the brightest thing in the film. With the default wide bloom (radius 0.6) it spread over the
  figures standing in it and turned them brown (RGB 40-67) instead of void. Shot 1 uses bloom `{strength 0.8,
  radius 0.35}`, held constant over the whole shot. Shot 2, where the blazing interior card sits right behind Pancake's
  head, uses `{strength 0.6, radius 0.12}`. Measured on the dog's body: 11-41.
- **The impact frame.** The shatter clock starts ON the contact frame (`(a + 1) / 66`). The Monolith treats shatter 0
  as intact, so `a / 66` put the bone flash one frame after the hammer touched.
- **The overhead.** A pure top-down makes the Guy an unreadable blob. About 20° off vertical, from behind him, works
  better:
  - the arms and hammer read;
  - the brow's iris (normal up and +X) looks straight at the lens.
  - The floor is the backdrop, so steer the window cookie (`windowLight.dir` [0, −0.8, −1]) to bar the floor under the
    action.
- **Separation after the blow.** From behind and above, his body projects over the kibble heap. He has to step back and
  aside (a pose blend plus a root slide) before Pancake eats there, or the two merge.
- **Cell dollhouse.** With a long lens and a full-length figure, the 4.5 m wall can't fill a 2.39:1 frame: the camera is
  far, so the wall is ~1.3× farther than him. Accept the dollhouse and centre the axis between the door and the slit for
  symmetry.

**Lib workaround (reported, not edited):** the `<Monolith spill>` group renders NaN pixels on the Windows/ANGLE (D3D11)
preview path, and bloom then smears them over the whole frame.
- Every frame after the impact went black, and `silplay SilProps` f101/f125/f165 show the same failure on this machine.
- The cause is that `SoftCone` (`pow(vK, uFall)`) and the `FloorGlow` wedge (`pow(1.0 - k, 1.6)`) take `pow()` of an
  interpolated base that can dip below 0, and HLSL `pow(negative)` returns NaN.
- The fix: `GoldSpill.tsx` redraws the same spill with clamped bases, and the scene passes `spill={0}` to the Monolith.
- The suggested lib fix is to clamp those two pow bases (`max(x, 0.0)`) in `src/silhouette/lib/props/shared.tsx`.
