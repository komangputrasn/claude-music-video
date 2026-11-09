# `lib/props`: the silhouette hero props (TERMS cut)

These are the story objects of DESIGN-silhouette §3. Each one is a pure-black silhouette, made flat by its own
`<Silhouette>` or by the parent `<SilGuy>`, except for the exceptions the brief grants:

- **red** (`authRed`, control): the Monolith's iris, food slot, iris shards and halo; the pillow's iris; red control words on the phone; the ash as the vent swallows it.
- **gold** (`dawnGold`, owned or free): the hammer's handle edge; the spill and kibble from the broken box; the bowl's pool.
- **bone** (pale): the paper book; the phone and e-reader screens.

Read `src/silhouette/INDEX.md` §1 for the rules first. Every component is a pure function of its props. Pass
**song seconds as `time`** wherever there is one, and put everything inside `<SilStage>`.

## Import (from a scene file `src/silhouette/scenes/<Id>/index.tsx`)
```ts
import {
  Monolith, MONOLITH, monolithSwing, pancakeAtMonolith,          // the smart feeder (V1Feeder, V2Rain, Swing)
  SilHammer, HeldSilHammer, HungSilHammer, SIL_HAMMER, HELD_SIL, HUNG_SIL,   // grandpa's hammer
  PaperBook, HeldPaperBook, PAPERBOOK,                          // the paper 1984 (Final)
  PillowIris, PILLOW, pillowSpeech,                             // TENURE in the pillow (V1Bedroom, Hold)
  PlainBowl, PLAINBOWL,                                         // Pancake's bowl in the gold pool (Final, Outro)
  SilPhone, HeldSilPhone, SILPHONE, SILPHONE_DEFAULT_LINES,     // flip phone (Swing, Cancel, Hold)
  SilEReader, HeldSilEReader, SILEREADER, SILEREADER_TEXT,      // the e-reader losing 1984 (V1Feeder)
  KibbleSparks, KIBBLE_SPARKS,                                  // gold-spark kibble (used by Monolith; standalone too)
  GlowBillboard, FloorGlow, SoftCone, GRIP,                     // small helpers (see "Helpers" below)
} from '../../lib/props';
```
**Conventions:**
- Units are metres, +Y is up, and objects face **+Z**.
- Unless stated otherwise, an object's origin is at its base centre. Every component takes group props.
- **Held variants** use the Y2K grip frame (`src/lib/props/Held.tsx`), so the existing pose helpers line up unchanged:
  `guyHammerSwing`/`monolithSwing`, `guyHoldUp`, and `guyPhoneToEar`.
- **Glowing parts** are tagged `userData.silKeep`, so they keep glowing inside a parent `<Silhouette>`/`<SilGuy>`.

---

## `<Monolith>`: the smart feeder
```tsx
<Monolith open?={1} pupil?={0.32} intensity?={1.5} time? flicker?={0} irisGlow?={0.35} slit?={0.9}
          stencil?={true | 'TEXT' | false} stencilColor?={GREYS.g5}
          shatter?={0} spill?={0} kibble?={0} kibbleCount?={260} seed?={1}
          rim?={null} color?={S.void} fog?={true} {...group}/>
```
**The box:** a black monolithic box, 0.60 w × 0.85 h × 0.45 d.
- Origin is the floor centre, and the front faces +Z.
- The top-front edge is a 45° **brow** (a 0.16 m chamfer). The red `<Iris>` sits on it (r 0.082), so the eye reads
  from Pancake's eye level, from a standing camera and from the overhead Swing camera alike.
- The front carries the stencil **"NUTRITION UNIT · PLUS ONLY"** above "LEASE 0315-77 · DISPENSES ON PLAN". It is
  subtle matte ash paint.
- A thin red **food-slot line** (`slit`, the lock) sits low on the front.

**Iris props:** `open`, `pupil`, `intensity`, `time` and `flicker` go to the `<Iris>`. Red is capped at 2. `irisGlow` is a
red halo in the haze.

**`shatter`** (0..1 = 1.6 simulated seconds after the impact; deterministic, seeded):
- A bone **flash** fires at the impact.
- The iris bursts into **42 red glass shards**. They fly outward and die to black.
- The brow **caves in** around a jagged hole. 88 black fragments fly off: 60% fall into the box and 40% fly out.
- The **front panel cracks in two**, and both halves fall forward flat onto the floor. They take the stencil and slot with them.

Drive it linearly, for example `ramp(f, a, a + 40, x => x)`, or slower for slow motion.

**`spill`** (0..1), dawnGold from inside the box, after the impact only:
- The interior back wall glows.
- A gold halo shows behind the box, around the broken outline.
- A soft light cone goes up through the hole, and another goes forward through the open front.
- A wedge of light lies on the floor in front.

**`kibble`** (0..1) is the progress of `<KibbleSparks>`: gold sparks fountain out of the hole and settle in a glowing
heap at `MONOLITH.pileCenter`, on the fallen panels. It covers 3.4 simulated seconds, and 45% of that is the pour.

**`MONOLITH` anchors** (Monolith-local):

| anchor | value | use |
|---|---|---|
| `size` | [0.6, 0.85, 0.45] | |
| `frontZ`, `top`, `browY` | 0.225, 0.85, 0.69 | front face; top; top edge of the vertical front |
| `irisCenter` / `irisNormal` / `irisRadius` | [0, 0.77, 0.145] / [0, .707, .707] / 0.082 | the eye on the brow |
| `noseTouch` | [0, 0.578, 0.225] | front face at standing-Pancake nose height |
| `impactPoint` | [0, 0.77, 0.145] (= irisCenter) | where the striking face lands |
| `swingContact` | 0.4608 | `guyHammerSwing` phase at which the HELD_SIL face reaches the brow |
| `guySwingSpot` | `{position: [-0.166, 0, 1.091], rotationY: π}` | the Guy's root for the swing (facing the box) |
| `kibbleOrigin`, `pileCenter`, `spillFloor` | [0, 0.68, 0.1], [0.02, 0.62] (x, z), [0, 0, 0.225] | kibble launch point / heap / start of the floor wedge |

**The swing: `monolithSwing(p)` → `GuyPose`** (verified in `f00072.jpg`):
- This is `guyHammerSwing` re-timed so the `<HeldSilHammer>` striking face touches `impactPoint` **exactly at p = 0.5**,
  provided the Guy stands at `guySwingSpot`, inside the Monolith's group.
- p = 0 is the wind-up and p ≈ 0.33 is overhead.
- After 0.5 the hammer recoils (~9 cm by p ≈ 0.62) and then rests on the broken brow. It does **not** pass through.
- **Do not** use plain `guyHammerSwing(0.5)` here: its face ends 0.38 m above the floor, which is inside this 0.85 m box.
```tsx
const p = ramp(f, a, a + 24, x => x);                    // contact at frame a + 12 (129.2 s)
<group position={spot} rotation-y={yaw}>
  <Monolith time={t} shatter={ramp(f, a + 12, a + 52, x => x)} spill={ramp(f, a + 13, a + 42)} kibble={ramp(f, a + 13, a + 83, x => x)}/>
  <SilGuy position={MONOLITH.guySwingSpot.position} rotation-y={MONOLITH.guySwingSpot.rotationY}
          pose={monolithSwing(p)} rightHand={<HeldSilHammer warmth={1}/>}/>
</group>
```
- **Exact striking point:** `new THREE.Vector3(...HELD_SIL.hammerFace).applyMatrix4(guyJointMatrix(pose, 'gripR', {R: true}))`.
  Rotate it by π about Y and add `guySwingSpot.position` to get Monolith-local coordinates.
- **Camera:** side and 3/4 cameras read best. In a pure side view the brow faces up-forward and the hit lands on it.

**`pancakeAtMonolith(pose, x = 0, yaw = π)` → `{position, rotationY, nose}`** places Pancake (Monolith-local) so that his
nose rests on the front face at `x`, wherever `pancakeAnchor(pose, 'nose')` puts it for that pose.
- `yaw = π` is square on.
- `π − 0.78` approaches at 45°, which keeps him in profile for a 3/4 camera that also sees the iris. `f00038.jpg` shows this.

## `<SilHammer>` / `<HeldSilHammer>` / `<HungSilHammer>`: grandpa's hammer
```tsx
<SilHammer warmth?={0} light?={[0.35, 1]} rim?={null} {...group}/>
<HeldSilHammer warmth? light? slide?={0.05}/>                 // <SilGuy rightHand={…}/>
<HungSilHammer warmth? light? head?='right'|'left' pegs?={true} hook?={false} {...group}/>
```
**The hammer:** the head and claw are a clean silhouette. The **wooden handle is the one never-black object**: its edge
catches dawnGold.
- **`warmth`** sets the gold edge:
  - 0 = plain black.
  - **0.15–0.3** = the faint V2Rain foreshadow, the only gold before the impact: a thin warm line on the lit edge of
    the handle, the core stays black (`f00052.jpg`, `f00056.jpg`).
  - 0.6–1 = from the Swing on: a bright gold edge that blooms. Above 0.3 the wood core also warms to a deep amber.
- **Edge brightness** is capped at about 2.2. Hotter gold tone-maps to cream.
- **`light`** is the screen-space direction toward the light.
- The gold handle is `silKeep`, so a parent `<SilGuy>` does not flatten it. At warmth 0 it flattens like any other hand prop.

**Frames:**
- **`SilHammer`** uses the Y2K Hammer frame. The origin is the grip point, the handle runs along +Y, the striking face
  points +X and the claw −X. Length 0.353.
  `SIL_HAMMER = {length, headOffset [0,0.262,0], faceOffset [0.066,0.262,0], clawTip, buttY, topY, gripHalf, woodY}`.
- **`HeldSilHammer`** uses the Y2K `HeldHammer` grip: the handle along grip +Z and the face toward grip −Y.
  `HELD_SIL.hammerHead` is [0, 0, 0.312] and `HELD_SIL.hammerFace` is [0, −0.066, 0.312], both grip-frame points.
- **`HungSilHammer`** has two frames.
  - **Default (wall frame, draws its own pegs):** the origin is the **wall surface point between the two pegs, at the
    pegs' top**. The wall is the local XY plane (normal +Z). The pegs stick out 6 cm along +Z. The handle lies
    horizontally along X, with the claw **up** and the striking face **down**. `head='right'` points the head toward +X;
    `'left'` points it toward −X. For other walls, rotate about Y (a wall facing +X with the head toward +Z is
    `rotation-y={Math.PI / 2} head="left"`, origin still on the wall surface).
  - **`hook` (for sets that draw their own pegs, e.g. `CellRoom`):** the Y2K `<HungHammer>` frame, so it drops straight
    onto a `hammerHook` anchor. The origin is the **rest point on top of the pegs**; the handle runs along +Z with the
    head toward +Z, claw up, face down, wall on −X. No pegs are drawn and `head` is ignored (rotate the group instead).
    ```tsx
    <HungSilHammer hook position={CELL_SPOTS.hammerHook} rotation-y={CELL_SPOTS.hammerRotY} warmth={0.25}/>
    ```
    Verified on the CellRoom's peg layout in `f00056.jpg`. (The default frame does **not** fit `hammerHook`: its origin
    is the wall, and it adds a second pair of pegs. For the wall frame in the CellRoom use the set's own wall anchor,
    `<HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false}/>`.)
  - `HUNG_SIL = {pegX [-0.105, 0.075], pegLength 0.06, handleZ 0.034, headCenter, hookLift 0.012}`.

## `<PaperBook>` / `<HeldPaperBook>`: the paper 1984
```tsx
<PaperBook open?={0} brightness?={2.6} cover?={0.66} halo?={0.6} title?="1984" {...group}/>
<HeldPaperBook {...same}/>                                    // <SilGuy pose={guyHoldUp(p, t)} rightHand={…}/>
```
**Closed:** a **pale bone rectangle**. It is flat and unlit at 0.66 bone, under bloom, with a faint debossed "1984".

**Open** (0..1; the cover swings about 170° about the spine): the pages become the **brightest white in the frame**.
- The pages are `brightness` × bone in HDR and bloom.
- `halo` adds a soft bone glow.
- The pages carry faint printed lines, and the title page reads "1984 · A NOVEL".

**Rules:**
- The whole book is `silKeep`, so it is never black.
- Keep other bone surfaces in the shot at or below 1.0, so that the book wins.

**Frame:** the same as the Y2K `Book1984`. The origin is the base centre, standing upright, with the cover toward +Z and
the spine toward −X. It measures 0.108 × 0.178 × 0.022. `PAPERBOOK = {size, coverCenter, pageCenter, spineX}`.

**Held:** `HeldPaperBook` is the Y2K `HeldBook` grip. At `guyHoldUp(1)` the cover (or the pages, when open) faces the camera
in front of him.

## `<PillowIris>`: TENURE in the pillow
```tsx
<PillowIris open?={0} talk?={0} time? pupil?={0.3} intensity?={1.5} glow?={0.6} irisAt?={0.22}
            rim?={null} color?={S.void} fog?={true} {...group}/>
```
**The pillow:** a soft, plump pillow silhouette (0.66 × 0.125 × 0.46 m, with pinched corners), with a red iris **inside**
it.

**`open`** opens the eye in stages:
- 0 = a faint red seam in the fabric.
- About 0.45 = the fabric parts like eyelids.
- 1 = the iris is fully open.
- Animate it over 2–4 s.

**`talk`** (0..1) makes the pupil dilate and pulse like speech, deterministically from `time`.
- It uses `pillowSpeech(t)`, a syllable rhythm of about 4.6 Hz gated by word groups.
- Use it only while "Is that you?" is spoken, and keep everything else still in the 162–166 s near-silence.

**`glow`** is red light bleeding through the cloth around the eye.

**Frame:**
- The origin is the base centre, resting on y = 0 (the mattress top).
- The iris lies on the top surface (normal ≈ +Y, tilted 4° toward +Z), with its "up" toward −Z.
- `irisAt` slides the eye toward the +Z edge.
- For a pillow propped against a headboard, rotate the group about X (for example `rotation-x={-1.1}`).
- `PILLOW = {size, top 0.125, irisCenter [0, 0.123, 0.051], irisNormal, irisRadius 0.072}`.
- **In the `CellRoom` bed:** pass it as `pillowSlot` with `pillow={false}`. The slot origin is the pillow *centre*
  (`CELL_PILLOW_LOCAL`, 0.075 above the mattress) and the set's pillow is 0.52 × 0.15 × 0.38, so use
  `pillowSlot={<PillowIris position={[0, -0.075, 0]} scale={0.8} …/>}`. The slot rides the bed tilt, so the eye stays on
  the pillow as `cellBedTilt(p)` lifts him with `guySleepyWake(p)`.

**Rim:** give the pillow a thin `rim` toward the light (red from above in the dark) so its soft outline reads.

## `<PlainBowl>`: Pancake's bowl in the gold pool
```tsx
<PlainBowl fill?={1} goldPool?={0} poolSize?={1} shaft?={0.5} glints?={true} rim?={auto} color?={S.void} fog?={true} seed?={1} {...group}/>
```
**The bowl:** a plain bowl silhouette with a lumpy kibble mound. `fill` 0..1 sets the mound height; animate 1 → 0.3 while
he eats.

**`goldPool`** (0..1; **Final and Outro only**) adds:
- a soft, broken-edged dawnGold pool on the floor (radius ≈ 0.75 m × `poolSize`);
- a gold haze shaft from above (× `shaft`);
- HDR gold glints on the top kibble;
- a thin gold rim on the lip. Pass `rim` to override it.

The bowl and Pancake stay pure black against the pool.

**Size:** the same as the Y2K `DogBowl` (Ø 0.25, 0.071 tall). Put it at `PANCAKE.bowl` **inside Pancake's group**, and
`pancakeEat`'s nose (`noseEatLocal` y 0.052) dips into the mound:
```tsx
<group position={spot} rotation-y={yaw}>
  <SilPancake pose={{...pancakeEat(t), tailWagAmount: 1}}/>
  <PlainBowl position={PANCAKE.bowl} fill={1 - ramp(f, a, a + 300)} goldPool={1}/>
</group>
```
`PLAINBOWL = {radius 0.125, height 0.071, innerRadius 0.094, floorY 0.016, moundTop(fill)}` (`moundTop(1)` = 0.07).

## `<SilPhone>` / `<HeldSilPhone>`: the flip phone
```tsx
<SilPhone open?={1} screenLines?={SILPHONE_DEFAULT_LINES} screen?={1.0} extText?="3:15" ext?={0.5} keys?={0.07} halo?={0.4}
          rim? color? fog? {...group}/>
<HeldSilPhone {...same} offset?={[-0.018, -0.05, 0]}/>         // <SilGuy pose={guyPhoneToEar(t)} rightHand={…}/>
```
**The phone:** a black clamshell with a small **bone screen** showing a list.
- **`screenLines`:** up to 7 lines of 20 or fewer mono characters.
  - A line written `'LABEL|STATUS'` puts the label on the left and the status right-aligned after a dotted leader.
  - Control words in a status (CANCELLED, PLAN, PLUS, LOCKED, DECLINED, …) print in **authRed**.
  - The first line, if it has no `|`, becomes an inverted title bar.
  - The default is `TENURE PLANS / PILLOW+ … CANCELLED / FEEDER+ / THERMAL / SLEEP+ / NUTRITION`.
- **`screen = 1.0`** is just under bloom, so the list stays legible.
- **`halo`** is screen light leaking **around** the phone. It sits behind the lid (on the side away from the screen), so
  it never veils the screen in an insert. At his ear that side faces a profile camera, so the halo glows **over** his
  black head: that is what makes the phone read at the ear (`f00278.jpg`), but it is the one place a prop veils the
  silhouette. Keep it at 0.4 or lower there, and set `halo={0}` (and `keys={0}`) in the Hold near-silence, where the
  pillow's iris must be the only light.
- **`ext`** is the dim outer display when closed. **`keys`** is a faint keypad backlight.

**Frame:** the same as the Y2K `FlipPhone`. The origin is the grip (the centre of the keypad half), with the keypad toward
+Z and the hinge toward +Y. `SILPHONE = {bottom, top, hinge, screenSize, screenCenterOpen [0, 0.0895, 0.0178], topY 0.129}`.

**Held:** `HeldSilPhone` is the Y2K `HeldPhone` grip: the earpiece toward the fingertips, and the screen toward the cheek at
`guyPhoneToEar`.
- It works in `leftHand` too, as a phone hanging at his side.
- **For a screen insert,** hold `<SilPhone open={1} rotation-x={-0.1}/>` in front of a long lens. `f00292.jpg` shows this.

## `<SilEReader>` / `<HeldSilEReader>`: the e-reader losing 1984
```tsx
<SilEReader progress?={0} vent?={[x, y, z] /* WORLD */} rise?={1.5} text?={SILEREADER_TEXT} title?="1984" pale?={0.82}
            ink?={GREYS.g3} ash?={GREYS.g7} ventRed?={1.3} flakes?={5} flakeSize?={1} seed?={1} rim? color? fog? {...group}/>
<HeldSilEReader mode?='read'|'show' {...same}/>
```
**The page:** a **pale rectangle** (a bone screen at 0.82, not a light source) in a black device.

**`progress`** (0..1) runs the loss:
- The printed words peel off roughly top to bottom.
- They crumble into **ash flakes** and drift up into the **vent**.
- The ash turns red over the last 30% of the path, as TENURE's vent swallows it.
- The page ends blank.
- Each word takes 0.38 of the progress range, so drive `progress` over at least 4 s.

**Paths are computed in WORLD space every frame.**
- `vent` is a world point (the `<SilStage>` root's coordinates), so the ash rises straight up even while the reader is
  tilted in his hand.
- Without `vent`, the ash rises `rise` metres and fades.
- `flakeSize` should be 1 for close-ups and **about 2.5–3 in wide shots**, or the stream does not read (`f00320.jpg`).

**Frame:** the device centre is the origin, the screen faces +Z, and the device stands upright. It measures
0.122 × 0.172 × 0.0095. `SILEREADER = {size, screenCenter, screenSize}`.

**Held modes:**
- **`mode='read'`** (the default) is for `mergePose(guyHoldUp(0, t), {headPitch: 0.5})`. The fist holds the bottom edge at
  his chest, the screen faces up toward his face, and the top edge points away from him.
  - The page is oriented for **him**: its text-up points away from him, so from a camera in front of him the text reads
    upside down. For a page insert, look down along the screen normal from above his right shoulder and roll to taste
    (the playground: `<CameraRig position={[-0.415, 2.069, 0.105]} target={[-0.135, 1.148, 0.375]} roll={-1.335}/>` at
    `guyHoldUp(0)` + `headPitch 0.55`, `f00306.jpg`). A camera straight over his head is blocked by the hood.
- **`mode='show'`** is the HeldBook grip: at `guyHoldUp(1)` the screen faces the camera.

## `<KibbleSparks>`: kibble as falling gold sparks
```tsx
<KibbleSparks progress origin?={[0, 0.66, 0.08]} count?={260} seed?={1} duration?={3.2} pour?={0.4} velocity?={[0, 1.6, 1.1]}
              spread?={0.75} sourceRadius?={0.05} floorY?={0} pile?={{center?: [x, z], radius?: 0.2, height?: 0.07} | false}
              size?={0.011} color?={S.dawnGold} heat?={3} ember?={0.5} cool?={0.9} streak?={0.028} fog?={false} {...group}/>
```
**What it is:** instanced HDR dawnGold nuggets in one draw call.

**The motion:**
- Each nugget follows a deterministic ballistic path with one floor bounce.
- It then slides into a slot on a cone-shaped **heap**, and later nuggets sit higher.
- `pile.center` defaults to the mean landing point. `pile = false` gives a scatter instead of a heap.
- `progress` maps linearly to `duration` simulated seconds.
- `pour` spreads the releases over that fraction of the duration (0 = one burst).

**The glow:**
- In flight the nuggets stretch along their velocity (`streak`) and glow hot (`heat`).
- After landing they cool to a soft ember (`ember`, at or under bloom) over `cool` seconds.

All coordinates are in group space. The Monolith uses it with `floorY = 0.02`, so the heap sits on the fallen panels.

## Helpers (also exported)
- `<GlowBillboard color intensity size falloff core stretch floor floorSoft>` is a camera-facing additive glow. Its origin
  is the centre.
  - **Place it behind the thing it glows around:** its quad is depth-tested at its centre.
  - Because of that, a floor beyond the centre's depth cuts a big low glow along a hard line. Pass **`floor`** (the
    distance from the centre down to the floor) to fade it to zero at floor height over `floorSoft` metres (default 0.35).
    The Monolith's gold halo uses it.
- `<FloorGlow shape='radial'|'wedge' size=[w,d] near far softness breakup>` is an additive light decal on the floor.
  - `wedge` starts at the origin and runs toward +Z.
- `<SoftCone from to radiusStart radiusEnd color intensity edge falloff floorY floorSoft>` is a cheap light cone drawn
  from its **back faces only**, so silhouettes inside it stay pure black cut-outs (the same trick as atmos `<LightShaft>`).
  Silhouettes *behind* its far wall do get its light.
  - Pass **`floorY`** (in the from/to space) for any cone that reaches the floor. It fades to zero at floor height over
    `floorSoft` metres (default 0.25), instead of the floor clipping it along a hard curve. The Monolith's forward cone
    and the PlainBowl shaft use it.
- `GRIP` holds the grip-frame rotations of `Held.tsx` (`hammer`, `phone`, `book`).

---

## Verified previews
Playground: `src/silhouette/playground/SilProps.tsx`. Regenerate with
`node scripts/still.mjs silplay SilProps --frames=15,38,52,56,66,72,93,101,110,125,148,165,185,200,216,226,236,255,278,292,306,312,320`.
The images are in `.preview/out/silplay-SilProps/` (`sheet.jpg` plus the files below).

| frame file | what it shows |
|---|---|
| `f00015.jpg` | **V1Feeder:** a low, long-lens shot. The Monolith shows its red iris on the brow, the stencil and the red food slot; Pancake begs beside it, looking up |
| `f00038.jpg` | **V2Rain:** Pancake's nose rests on the front face under the red eye (`pancakeAtMonolith(pose, -0.12, π − 0.78)`), in profile against haze |
| `f00052.jpg` | **V2Rain:** `HungSilHammer` on two pegs on a lit wall, with the faint gold handle edge at **warmth 0.25** |
| `f00056.jpg` | `HungSilHammer hook` dropped onto the CellRoom's own pegs at `CELL_SPOTS.hammerHook` (wall on −X), warmth 0.25 |
| `f00066.jpg` | **Swing, side view:** the overhead wind-up (`monolithSwing(0.25)`), hammer at the 0.3 foreshadow until the impact |
| `f00072.jpg` | **Swing, side view: CONTACT** at `monolithSwing(0.5)`. The striking face lands on the iris (`impactPoint`), with the Guy at `guySwingSpot` |
| `f00093.jpg` | Impact plus 1 frame: the bone flash and the iris bursting |
| `f00101.jpg` | Red shards spraying, the gold kibble-spark fountain starting, the front panel falling |
| `f00110.jpg`, `f00125.jpg` | Gold spill (interior glow, floor wedge, cones fading softly into the floor), sparks pouring into a heap. While the hot sparks fly right past him, their bloom lifts the Guy to a dark brown (≈ 10–15 %); he is pure black again once they settle (`f00148`) |
| `f00148.jpg` | Settled: the hammer resting on the broken brow, the panels on the floor, a glowing kibble heap |
| `f00165.jpg` | **Aftermath:** a hammer (warmth 1) in one hand and the phone in the other beside the gold-lit broken box; Pancake eats at the heap, tail wagging |
| `f00185.jpg` / `f00200.jpg` | **Final:** the paper 1984 held up (`guyHoldUp(1)`, hood down), closed (pale rectangle) and open (the brightest white in the frame) |
| `f00216.jpg` / `f00226.jpg` / `f00236.jpg` | **Hold:** the pillow in the dark: the red seam, then the lids parting and the iris opening, then fully open and talking |
| `f00255.jpg` | **Final hero:** Pancake eating from the `PlainBowl` in a gold pool |
| `f00278.jpg` | The phone at the ear, in profile: the screen light leaking around the black phone on the black head |
| `f00292.jpg` | Phone insert: the open screen with the list "PILLOW+ … CANCELLED" (red control words) |
| `f00306.jpg` / `f00312.jpg` | **V1Feeder:** close-up from above his shoulder, face-on to the pale page (text upright), as the words peel off top to bottom and crumble into ash |
| `f00320.jpg` | **V1Feeder:** a wide shot of the ash stream rising into a red ceiling vent (`flakeSize` 2.8) |

## Caveats for scene builders
- **Monolith size and alignment:**
  - The Monolith is 0.85 m tall and Pancake's head top is 0.75 m. To make it look **huge**, shoot low (camera at about
    0.2–0.35 m) with a long lens and keep Pancake at or behind the box's front plane (`f00015`).
  - `MONOLITH` anchors are for scale 1. **Scaling the Monolith breaks the swing alignment.**
- **The swing:** use `monolithSwing`, not `guyHammerSwing`, with the Monolith. After p > 0.62 the pose holds the hammer on
  the brow, so blend to another pose with `mixPose` when he straightens up.
- **Gold rules:**
  - `spill`, `kibble`, `goldPool` and hammer warmth above 0.3 come **only after the impact (129.2 s)**.
  - Before the impact the hammer may show only `warmth` ≤ 0.3: the V2Rain foreshadow, which may carry on through the
    Swing wind-up until the blow lands (the brief allows gold from the Swing scene; the playground does this).
  - `goldPool` is for Final and Outro only.
- **Rims:** if you give `SilGuy`/`SilPancake` a gold rim in the spill, keep it thin (`strength` ≤ 0.6, `power` ≥ 6).
  Stronger rims light their broad surfaces brown and lose the silhouette.
- **Additive light and silhouettes:** additive glows in front of a silhouette veil it grey or brown. These props avoid that:
  `SoftCone` draws from its back faces, the Monolith's halo sits behind the box, and the phone's halo sits behind the lid.
  If you add your own glows, put them **behind** the figures. Two exceptions are real light sources next to a figure and
  bloom on purpose: the open book (brightness 2.6) lifts his head to about 15 % grey, and the hot kibble sparks do the same
  while they fly. The phone's halo glows over his head at the ear (see `<SilPhone>`).
- **Low glows and the floor:** any `GlowBillboard`/`SoftCone` you add whose light reaches the floor needs `floor` /
  `floorY`, or the floor cuts it along a hard line.
- **Silhouettes need a bright backdrop.** Put a `<Backlight>` behind every prop (atmos), or it disappears on the black
  floor. The pillow in the Hold dark needs its own thin red rim.
- **Fine detail versus bloom:**
  - At distance, the open book's printed lines and "1984" bloom away. That is intended: it reads as pure white light.
    For a legible close-up insert, use `brightness` ≈ 1.6.
  - The e-reader's words are only legible in close-ups. In wide shots only the flake stream reads.
- **E-reader paths:**
  - The e-reader computes world space from its group's `matrixWorld` in `useLayoutEffect` (via `updateWorldMatrix`).
    Give `vent` in **world** coordinates, even when the set is inside a translated group.
  - Its words and flakes are child meshes, so a parent `<Silhouette>` leaves them alone (`silKeep`).
- **Cost:** everything repeated is instanced or merged.
  - KibbleSparks: one draw call.
  - Iris shards and brow fragments: one draw call each, CPU-transformed only when `shatter` changes.
  - E-reader: one draw call for the words and one for the flakes.
  - Canvas textures are redrawn only when their text changes.
- **Engine reuse:** these props reuse Y2K engine helpers only, not its look: `rbox` and `useCanvasTexture` from
  `src/lib/props/Padlock.tsx`, the Guy/Pancake pose and anchor math, and `noise1` from `src/lib/time`.
  No core files were changed.
