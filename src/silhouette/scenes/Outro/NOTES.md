# Outro: "the house at dawn" (TERMS cut)

Absolute frames 6126–6600 (scene-local 0–474), song 204.20–220.00 s, 30 fps. Instrumental: `sceneLyricLines(204.2, 220)`
is empty (the last sung word, "you." of [45], starts at 203.02 and belongs to Final), so no `<WorldLyric>` is staged here.
The music is loud from the downbeat at 204.75 to about 214.3. It drops to a hush (almost no bass) from 214.3 to 216.0,
comes back in at 216.18 for the last bars, and fades from about 219.

Two shots, one cut on a downbeat (213.44). Then a fade to black (`timing.ts` `fadeBlack`: 218.3 → 219.5, fully black
after 219.5).

Files:
- `index.tsx`: shot switch and the fade.
- `timing.ts`: the cut, the sun track and the iris curves (`IRIS`, `irisOpen`, `irisPower`, `irisAttention`).
- `cameras.ts`: both camera set-ups and `sunElev()`.
- `World.tsx`: the shared environment: sky, wet plain, far city and ground haze.
- `Sky.tsx`: `OutroSky`, a local variant of the Final's painted dawn sky with the sun centred, a corona and faint
  crepuscular rays.
- `Porch.tsx`: the man, Pancake and the bowl, shared by both shots so the cut matches.
- `ShotHouse.tsx` and `ShotDoor.tsx`: the two shots.

| # | shot | scene-local frames | song s | sync | camera | what reads in silhouette |
|---|------|--------------------|--------|------|--------|--------------------------|
| O1 | **THE HOUSE AT DAWN** (`ShotHouse.tsx`) | 0–276 | 204.20–213.44 | Cut in from Final's crane. The sun rises straight up behind the house: its corona and rays burn round the roof line, the upper limb crests the roof at about 208.5 s, and it is about 60 % clear at the cut (`sunOverRoof`). The corona breathes on every beat (`beatAt`). | Static, dead-centre and symmetrical. Low: 0.9 m high, 60 m out, visible fov 16, pitch +3°. Roof line at y ≈ 331, horizon y ≈ 693, cube base y ≈ 739 of the 1080 frame. | A black cube on a wet mirror plain under a gold sky. The door is open on gold light and the one warm window (left) glows; both are mirrored in the puddles. On the step: the man, **hood down** (spiky-hair outline), with his arm round Pancake. Pancake is turned toward him and his curled tail wags on the gold at the doorway's right edge. The bowl sits in its gold pool in front. A low black city lies far off in the haze on both sides. Subtle life only: fog drift, breath, tail, the rising sun. |
| O2 | **THE LAST IMAGE** (`ShotDoor.tsx`) | 277–474 | 213.44–220.00 | Cut on the downbeat 213.44. The iris wakes at 213.98 (a pinpoint, on the beat 214.02). It opens from 214.05 to 214.75 and stares (scan sweep, pupil on the bass). It fails with a growing stutter from 215.2, closes to a pinpoint from 215.66 (beat 215.64) to 216.12, and dies for good at 216.18 as the music comes back in. Pancake's attention runs 214.13 → 214.75 and lets go 216.43 → 217.33; the wag returns. Fade 218.3 → 219.5. | Low (0.75 m), symmetrical, visible fov 19, pitch +4.8°, with a very slow creep in from 19.5 m to 17.6 m (eased over the shot). | The house fills the middle as a black slab with the dawn at both sides. The tall gold doorway holds the man and Pancake (one connected shape: his arm round the dog). The warm window is left, and "UNIT 0315" is faintly stencilled above the door (no "LEASED"). On the right jamb, TENURE's iris (r 0.22) wakes red, about 60 px with its halo. Pancake shifts round on his haunches and his head swings up toward it, the muzzle in clean profile pointing at the eye, and his tail stops. The man does not look; he only draws the dog in a little. The eye stutters, closes and dies: a black jamb again. The dog turns back to his man and the wag returns. The gold holds, then black. |

## Continuity
- **Guy.** `SilGuy` with `hood={0}` throughout. He came down in Final, and the same rig is used.
- **Pancake.** `SilPancake`, sitting, three-quarter. His tail is wagging (`tailWagAmount` 0.62, 0.92 after the iris).
  It goes still (0.05) only while the iris has his attention. While it does, his body turns by `DOG_TURN` (0.35 rad)
  and his head goes to `headYaw` 2.1 / `headPitch` 0.72 so the muzzle reads in profile pointing up at the jamb
  (review sweep: a frontal head with flared ears read as a blob, a nose straight up as a teddy bear).
- **Colour.**
  - dawnGold is the light: the sky, the sun, the doorway and the warm window, the bowl's pool, and thin gold rims on
    the figures (strength ≤ 0.4, power 7).
  - The only red is the iris's last flicker. It is capped at 1.45 HDR with a pure-red halo and a red spill light on the
    jamb (`irisLight`), and it ends dead.
  - Everything else is grey or black.
- **Final.** The house cube, open gold door, warm window, bowl and man on the step continue from the start of Final's
  crane (S7). In Final the door's iris lock is a dead disc; here it wakes one last time and dies. Final's sky colours
  are matched by `OutroSky`/`dawnHaze`, which use the same recipe as the Final's `DawnSky`/`fogAt` at full dawn.
- **Brightness.** There is no whole-frame brightness change except the final fade to black. The cut from Final's aerial
  city to the wide matches in brightness (checked with `silmain --times=204.1,204.2`).

## Workarounds / notes
- **Iris size.** HouseCube's `doorIris` props spread after its own `radius`, so `doorIris={{radius: 0.22, …}}`
  enlarges the jamb iris (default 0.16) to read in the medium shot. Nothing in the lib is edited.
- **Iris glint.** It is drawn even when `intensity` is 0, so a dead iris showed a stray white dot. The fix is
  `glint: false` in O1 and `glint: power > 0.5` in O2. A dead iris is drawn with `open ≈ 0`, `intensity 0`, `glow 0`.
- **Doorway width.** The 1.2 m doorway is too narrow for two clean profiles, hence the arm-round-the-dog staging. The
  arm pose was found with an FK search over `guyPoint(…, 'gripL')`, so his hand lands on the dog's neck and shoulders.
- **Step bounce light.** `Porch` adds one dawnGold point light (`BOUNCE` 3.5) low in front of the step, as the gold
  pool's bounce. It lights the step's front face just enough that his shins read as black down to his feet; on a
  black step the feet floated on the lit ground, cut off from the body.
- **The bowl in the wide.** At O1's scale the bowl is ~4 px tall against the dark step base, so it does not read there;
  it reads in O2 as a dish in its gold pool in front of the step.
- **PlainBowl.** It is used with `shaft={0}`, following Final's note that the shaft can NaN the bloom from a low camera.
- **Fade.** It is a full-frame black `AbsoluteFill` with animated opacity: a fade, not text over the picture. The
  `SilStage` is unmounted once the frame is fully black.
