# V2Car — "TERMS" verse 2a: the car (absolute frames 2777–3299, song 92.56–109.97 s)

Night on an elevated highway of red light lines. The car is a smooth black capsule (a superellipsoid pod with a
wrap-around glass band, a gull-wing door, no wheels or brand cues) built locally in `Capsule.tsx`. It has a seat that
glows frost-white, and the red TENURE iris on its tail is the governor. Four shots, every cut on a beat (`timing.ts`).
Each line lives somewhere different in the world: projected light in the haze, the governor gantry's own panel, black
stencil letters on a fuel lightbox, and the claim text of a projected patent.

The Guy is `SilGuy`, hood up throughout. Pancake is not in this scene. Red is used only for control: the lane lines,
the governor's forbidden arc, the irises, the THERMAL TIER readout, and the words TIER and PATENT. There is no gold.

Files: `index.tsx` (shot switch), `timing.ts` (cuts and word times), `Capsule.tsx` (the pod), `Highway.tsx` (deck,
red lines, parapets, skyline, horizon band), `Governor.tsx` (the speed-governor gantry and dial), `Patent.tsx` (the
patent sheet canvas and projector shader), and one file per shot: `ShotThermal`, `ShotGovernor`, `ShotPillar`,
`ShotPatent`. Every explicit word layout uses the lib's `<WorldLyric rows anchor="baseline">` (the local `lyric.ts`
placeWords helper is gone).

| # | shot | local frames | song s | lyric / beat sync | camera | what reads in silhouette (sound off) |
|---|---|---|---|---|---|---|
| 1 | **THERMAL** (`ShotThermal`) | 0–146 | 92.56–97.48 | [20] "The car seats went cold, 'cause the heat is a tier,". The THERMAL TIER readout on the nose blinks on with "seats" (94.30). On "cold" (94.84) the seat flares from dim to frost-white over 0.3 s, frost crystals hang in the cabin, the glass frosts at grazing angles, and he hunches into a shiver (`guyShiver` blended over 0.7 s). TIER flashes red on 97.32. The lane lines pulse on the bass. | Head-on and dead-centre, long lens (visible fov 19), 1.36 m high. A slow push from 8.9 m to 8.0 m. The capsule is held still while the world streams away behind it at 12 m/s (dashes recede and the text drifts back). | A black pod with two slit headlights coming at us down a highway of red lines that converge behind it. Through the glass dome, his black hooded head and shoulders sit against the glowing white seat. A black skyline stands against the bright horizon band. The line is projected light in the haze high over the vanishing point, in two rows, mirrored in the wet deck. |
| 2 | **GOVERNOR** (`ShotGovernor`) | 147–293 | 97.48–102.35 | [21] "and the speed is a tier, so I crawled in first gear." Words light on the gantry as sung: AND THE SPEED / IS A TIER, to the left of the dial and SO I CRAWLED / IN FIRST GEAR. to the right. The needle trembles against the red stop at 20 and sags to about 12 on "crawled" (100.22). One capsule streaks past on every beat, alternating lanes. The dial's red arc, the beam line and the lane lines pulse on the bass. | One-point perspective from behind and above his capsule: 3 m high, 17 m back, visible fov 22. The camera tracks his crawl at 1.6 m/s, so the gantry grows slowly from 69 m to 61 m. | A monumental black beam across the highway carries a giant round dial whose arc is almost all red. His small black pod, with the red iris on its tail, creeps up the centre lane; through the rear glass his black hooded head and shoulders stand against the cold white light filling the front of the cabin, over the glowing top of a low seat back. Other black pods with long white light trails stream past on both sides and vanish under the gantry. |
| 3 | **PILLAR** (`ShotPillar`) | 294–423 | 102.35–106.70 | [22] "I stopped to get gas, and the car drove away,". The capsule rolls to a stop beside the pillar (stopped 102.44). The gull-wing door lifts and he rises out (102.79–103.5). He reaches for the red iris fuel socket, which opens on "gas" (103.54). On "car" (104.62) the door slams, the tail iris flares open and he turns his head. On "drove away" (105.10) the empty capsule accelerates (14 m/s²) down the lane into the fog cards. He takes one step after it. | Low (1.45 m) and static apart from a 0.8 m creep back, directly behind the car's lane (visible fov 24), looking slightly up. The pillar sits left of centre and the lane recedes dead-centre. | He is first seen seated in the pod through the rear glass (head and shoulders against the glowing cabin, as in shot 2). A tall fuel lightbox with the line in black stencil letters (I STOPPED / TO GET GAS, / AND THE CAR / DROVE AWAY,). A hard white floodlight falls from a black arm in a cone of dust onto the wet apron beside the car. His black figure stands against the lightbox, reaching for the red socket. The capsule leaves into the fog, its frost-white empty seat and red eye shrinking, and the cone is left empty. |
| 4 | **PATENT** (`ShotPatent`) | 424–521 | 106.70–109.97 | [23] "Ford filed a patent for that, by the way." The projector fades on with "Ford" (107.04, 0.32 s). The claim text appears word by word in the patent's mono type, with PATENT in solid red (108.24). The sheet breathes slightly on the bass. "way." is sung at 110.00, after the cut, and V2Rain's street screen carries the line on. | Low (1.0 m) and dead-centre, visible fov 20, a 2.6 m push-in. The sheet is 95 m away and he stands 30 m away. | A patent sheet thrown in bone light across the fog wall where the car vanished. It reads METHOD FOR REPOSSESSION IN MOTION, and FIG. 1 shows the pod driving away (callouts 10–18), a pillar (30) and a lessee (40). He stands tiny and black on the wet road directly under the drawn lessee, looking up at the drawing of what just happened to him. The sheet and the red lines mirror in the wet road. |

## Legibility (cap height on the 1080 frame, from the camera geometry: cap = 0.7 em)
1. Line 20: about 49 px when the first word appears, shrinking to about 41 px as it recedes. It sits at y ≈ 250–400.
2. The gantry rows: about 31 px, rising to about 36 px as the camera closes in. They sit at y ≈ 330–470.
   The dial's TIER 1 is about 27 px.
3. The lightbox rows: about 32–34 px (letter size fitted at runtime, see below), at y ≈ 245–445.
4. The claim rows: about 39–40 px, at y ≈ 450–560.

All lyric text is inside the 2.39:1 band.

## Review fixes (independent review pass)
- Shot 1: the windshield frost veiled his head grey (head p10 ≈ 57/255 after "cold"). The glass shader now keeps a
  clear strip down the front-centre of the canopy (frost + sheen masked there), so he stays a black shape against the
  frost-white seat (p10 ≈ 43; the remaining lift is lens grain and the text's bloom). The seat peaks at 0.82 linear,
  under the 0.86 bloom threshold.
- Shots 1–2: puddles lowered (0.4 → 0.2, 0.38 → 0.18) and streak raised, so the deck still reads wet but the lyric and
  gantry text no longer mirror as sharp backward text at the bottom of frame.
- Shot 3: he stands ON the island plinth (y = 0.24) instead of sinking 0.24 m into it. The monolith's black frame
  around the lightbox is thin (0.06 m) and the floodlight hangs beyond the car's far side (x = CAR_X + 2.0,
  cone base r 2.1; it was CAR_X + 1.1 until the verify pass below), so neither the black border nor the cone's haze
  sits between the camera and his path from the door to the socket (he was lost black-on-black, then veiled grey, at
  103.0–103.4 s).

## Fix pass (TERMS fix run)
- Shot 2: from behind, the full seat back + headrest glowed white in front of him and hid him completely. The pod now
  takes `seatBack={0.5}` (a low back, no headrest; its top is below his shoulders) and `frontGlow={1}` (a soft
  frost-white panel just behind the yoke, facing the tail, 0.95 linear, under bloom through the ×0.78 rear glass). His
  hooded bust reads black against it through the rear glass for the whole shot; the dial, its text and the streaks are
  unchanged. Shot 3 uses the same seat, so he is seen seated in the pod at 102.35–102.8 before he climbs out, and the
  empty departing pod still glows. Shot 1 keeps the full seat with headrest (the frontal backdrop behind his head).
- Font independence: the lightbox rows' letter size is measured at runtime (`measureLyric` with the rows):
  min(0.43 m, 80% of the 3.7 m box ÷ widest row). Here (fallback font) that is ≈ 0.40 m; on the Mac it is fitted
  from the real Futura the same way (never above 0.43, the widest row never above 80% of the box). The patent claim rows start right of the CLAIM labels as measured in the
  installed mono font (`claimLabelRight()`, ≥ x −22) and their size is min(2.3 m, 85% of the room to the inner
  margin ÷ widest row): 2.3 here. Canvas texts in fixed boxes (the lightbox header/footer, the patent title) pass a
  `fillText` maxWidth so a wider font squeezes instead of overflowing. The gantry already sized its beam from the
  measured rows (now `measureLyric(…, {rows}).rowWidths`).
- Red: additive red on bright haze read coral/pink (line 20's TIER flash ≈ rgb 255,144,128; PATENT ≈ 249,138,130).
  Both lyric blocks now pass `redFill` (solid authRed letters: TIER 0.7 because it is always at its onset flash in
  this shot, PATENT 0.85) → TIER ≈ 250,80,70 on the haze, PATENT ≈ 238,29,12. The THERMAL TIER readout ran at 1.15
  linear, which ACES desaturated to ≈ 240,100,85; it now runs at 0.78 (flash ×1.2 on "tier") → ≈ 250,65,60.
- Lib hood (skinned cowl) checked: shot 1 frontal (hooded head flowing into the shoulders against the seat, before and
  after the shiver), shot 2 from behind, shot 3 climbing out and standing at the socket. No local hood workarounds.

## Verify pass (independent check of the fix pass)
- Shot 3: once the pod had stopped (≈ 102.55 s), his seated bust sat behind the floodlight cone's back face as seen
  from the camera (which looks down the car's lane, x = CAR_X), and the cone's haze veiled him grey (head luma ≈ 115
  instead of ≈ 37) until he was out of the pod (≈ 103.05). The lamp moved from x = CAR_X + 1.1 to CAR_X + 2.0. The cone
  (r ≈ 1.8 m at the glass band's height) now clears his bust at every height of the glass, so he stays black (luma ≈ 36–42) from
  the cut through the climb-out, and the departing empty pod is a crisp black shell around its white cabin and black
  yoke instead of a grey-veiled one. The cone still stands right of the car over the apron.
- Line 20's TIER, measured at the stroke cores at 97.37 s, is ≈ 228,120,112 (not 250,80,70): the surrounding white
  words' bloom lies over it. It reads as a light red. It is far redder than before (≈ 250,170,165 pink) and is on
  screen for only 0.15 s (97.32 → cut at 97.47). Left as is.

## Continuity
- The hood stays up. He is small in frame in shots 2–4.
- Night throughout. The skyline and horizon band match across all four shots, and so does the deck: red lane lines,
  parapets with red light lines on top, and wet concrete.
- The capsule's red tail iris appears in shot 2 (the governor). Shot 3 shows it waking fully when TENURE takes the car,
  and it is the last thing visible in the fog.
- Shot 4 ends on the figure under the patent. V2Rain opens on a street screen that holds "…BY THE WAY."

## Preview
`node scripts/still.mjs sil V2Car --times=93.6,94.9,96.8,97.4,98.5,100.6,102.6,103.1,103.6,105.4,106.5,107.4,108.6,109.9`
(add `--scale=1` to read his bust in the pod in shot 2).
