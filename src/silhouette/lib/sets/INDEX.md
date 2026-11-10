# `lib/sets`: architecture and recurring locations (TERMS cut)

Black and ash concrete, monumental, brutalist, symmetrical (DESIGN-silhouette §2, §4). Every surface is board-formed or
polished concrete in greys only. Light comes from openings, screens and practicals: authRed only on control (locks,
scanners, gate strips, the bed mechanism, the printer slit), dawnGold only on owned/free things (the warm window, a gold
doorway) and only in Final/Outro. Read `src/silhouette/INDEX.md` §1 first.

```ts
// from src/silhouette/scenes/<Id>/index.tsx
import {
  CellRoom, CELL, CELL_SPOTS, CELL_CAMERAS, cellBedTilt, cellBedHead, cellHeadPoint, cellPillow, cellPrinterPage,
  Megablock, megablockLayout, megablockPane, CityGrid, cityGridLayout,
  Plaza, PLAZA_SPOTS, PLAZA_CAMERAS, plazaSpots,
  HouseCube, HOUSE_SPOTS, HOUSE_CAMERAS, houseSpots, HOUSE_MIN_SIZE,
  Corridor, CORRIDOR_SPOTS, CORRIDOR_CAMERAS, corridorLayout,
  LaserLines,                                   // red laser ribbons (cages, gate strips): reusable
  useConcreteMat, concreteMat, concreteTex, floorTex, stencilTex, wbox,   // building blocks for your own architecture
} from '../../lib/sets';
```

Units are metres, +Y is up, and fronts face **+Z**. Every component takes `<group>` props. Pass **`time` in seconds**
(song time) to anything that blinks, pulses or opens. Everything is a pure function of its props: geometry and canvas
textures are built once and cached, repeated parts are instanced, and nothing animates on its own. Every `*_CAMERAS`
entry is `{position, target, fov}` with the fov already corrected for the 2.39:1 letterbox
(`cameraFovForVisible`), so spread it into `<CameraRig/>`.

---

## 1. `<CellRoom>`: the 3:15 AM bedroom as a cell (V1Bedroom, V1Feeder, V2Rain, Swing, Hold)

```tsx
<CellRoom time={t} bedTilt?={0} bedActive?={0} pillow?={true} pillowSlot? blanket?={true}
  blinds?={{angle: 0.62, traverse: 0}}
  windowLight?={{intensity: 1, color: S.bone, dir: [0, -0.06, -1], scan: null, scanColor: S.authRed,
                 scanIntensity: 1.6, scanWidth: 0.16, softness: 0.006}}
  outside?={true | {intensity: 0.8, iris: false}} facade?={true}
  printerFeed?={0} printerError?={0} printerGlow?={1} pageSlot?
  doorOpen?={0} doorIris?={{…IrisProps} | false} doorLeak?={0.6}
  slit?={1} vent?={0.6} practicals?={1} ambient?={0.06}
  hideWalls?={[]} hide?={[]} {...group}>{cast}</CellRoom>
```
- **Room.** 3.6 w × 4.5 d × 2.7 h with 0.2 m walls; the origin is the floor centre. The bed head is at the back wall
  (−Z). The window with vertical blinds is centred in the front wall (+Z), with the opening at x ±0.85 and y 1.0–2.45.
  The door is on the left wall (−X) at z 1.15, and the hammer slit with its two pegs is beside it at z −0.9. The printer
  slab stands on the right wall (+X) at z −0.9, and the ceiling vent is at z −0.55.
- **Key light: a projective blinds cookie.** The city's screen glow travels along `windowLight.dir` (−Z, slightly down)
  through the window and the slats. Every room surface receives the slatted stripes per pixel, so the back wall behind
  the bed is striped and he rises against it. `scan` 0..1 slides a red band through the slats from left to right; the
  red replaces the white and never mixes into pink. The stripes follow the `blinds` `angle` and `traverse`. Characters
  never receive this light, so they stay pure silhouettes. Hiding the front wall keeps the stripes but hides the slat
  geometry.
- **Bed.** A concrete plinth carries a steel deck. The head section is a **narrow back-board** (0.56 m, hidden behind his
  torso from the front, so his outline reads) that lifts to 78° on two rams.
  - **Syncing with `guySleepyWake`:**
    `bedTilt={cellBedTilt(p)}` with `<SilGuy position={CELL_SPOTS.guyInBed} pose={guySleepyWake(p)}/>` and no rotation.
    `cellBedTilt` is the same curve as the pose's own "up" (smoothstep 0.15–0.5).
  - `bedActive` 0..1 lights the red mechanism strips (TENURE runs the bed); light it while the bed lifts.
- **Pillow.** The built-in pillow is a dark puffy shape, and `pillow={false}` hides it.
  - `pillowSlot` renders at the pillow centre **in head-section space**, so it rides the tilt: local +Y is the pillow top
    and −Z points toward the headboard. Put the PillowIris there.
  - `cellPillow(tilt)` gives `{position, rotationX}` in room space.
  - `CELL_PILLOW_SIZE` is 0.52 × 0.15 × 0.38.
- **Printer.** A pale page (bone 0.62) slides out of the red slit; `printerFeed` is the fraction of the page that is out.
  Hold it at ~0.5 to make the page halt. `printerError` makes the slit and the status dot blink hard at about 3 Hz.
  - `cellPrinterPage(feed)` returns `{slit, position, rotation, out, size}`. Its frame is the paper frame: +Z is the
    printed face, +Y points into the printer (text reads upright from the room) and +X points toward room +Z.
  - `pageSlot` renders in that frame, for example `<WorldLyric mode="paint" size={0.022}/>` for "PAYMENT DECLINED".
    Only the part that is out of the slit is visible.
- **Door and its iris lock.** `doorIris` props pass straight through to `<Iris>` (radius 0.1, `time` = `time`). The iris
  sits on the door's inner face at `CELL_SPOTS.doorIris` and faces +X (`doorIrisRotY`). `doorIris={false}` hides it.
  - `doorOpen` swings the door into the room (hinge on the +Z jamb) and shows a lit corridor beyond it.
  - `doorLeak` is the thin line of corridor light under the door.
- **Hammer.** Two pegs, 0.24 m apart, sit across a vertical light slit (`slit` 0..1).
  - `CELL_SPOTS.hammerHook` is the rest point on top of the pegs, using the Y2K `<HungHammer>` convention: handle along
    +Z, head toward +Z, claw up, wall on −X, `hammerRotY` 0.
  - `CELL_SPOTS.hungHammer` is the same rest for the props-module `<HungSilHammer>` wall frame (origin = the wall surface
    between the pegs at their top, wall normal = its local +Z). It rests on the cell's own pegs (verified in f135):
    `<HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false}/>`.
    (Do not put the wall-frame hammer at `hammerHook`: it would float 7.5 cm off the wall with a second pair of pegs.)
- **Vent.** A grille in the ceiling with a faint red glow deep inside (`vent`). `CELL_SPOTS.vent` is the grille centre,
  where the e-reader ash is pulled to.
- **Outside.**
  - `outside`: a city skyline glow card 60 m beyond the window, with monumental bone screens; `iris: true` adds a red iris
    to the centre screen.
  - `facade`: a deck-access block facade around the window, with other cells every 4.2 m and floors every 3 m. Their
    windows are instanced slatted panes, about 12 % faintly lit. Access decks with 1.1 m parapets sit at every floor; the
    deck at y = 0 is where the climb happens. The cell's own front wall is drawn with the facade material on its outer
    face, so from outside it continues the facade without a darker patch around our window.
- **Practicals.** Five point lights in a constant count: window fill, red vent, red printer slit, red door iris and
  bone slit. `practicals` scales all five (0 switches them off) and `hide={['lights']}` removes them. `ambient` is the
  self-light of the concrete.
- **`hideWalls`** takes `'front' | 'back' | 'left' | 'right' | 'ceiling'`. **`hide`** takes `CellPiece` names: `bed pillow
  blanket printer page door vent pegs slit blinds outside facade lights`.

### `CELL_SPOTS` (room space; `…RotY` = yaw for a +Z-facing character or prop)
| anchor | value | use |
|---|---|---|
| `guyInBed` | [0, 0.52, −1.26] | SilGuy origin in bed mode (no rotation) with `guySleepyWake(p)` |
| `bedHinge`, `pillow` | [0, 0.52, −1.34], pillow at tilt 0 | `cellPillow(tilt)` while the bed moves |
| `guySitOnBed` (+`RotY` π/2) | [0.38, 0, −0.8] | sit on the bed edge, pose with `guySitOn(0.52)` |
| `guyStand` | [0.55, 0, 0.55] | |
| `window`, `windowSill` | [0, 1.725, 2.25], [0, 1.0, 2.35] | opening centre (inner face) and sill top |
| `climbRoot` (+`climbRotY` π) | [0, 0, 2.70] | `guyClimb(p)` root on the outside deck, facing −Z; lands at `climbLanding` [0, 0, 1.80] |
| `windowOutside` | [0, 0, 3.6] | standing on the deck outside |
| `door`, `doorInside`, `doorOutside` | [−1.8, 0, 1.15], … | |
| `doorIris` (+`doorIrisRotY` π/2) | [−1.794, 1.36, 1.15] | the iris lock on the closed door's inner face |
| `hammerHook` (+`hammerRotY` 0, `hammerWallNormal` [1,0,0]) | [−1.725, 1.55, −0.9] | Y2K HungHammer origin (rest point on the pegs); `hammerPegs` gives the two peg centres |
| `hungHammer` (+`hungHammerRotY` π/2) | [−1.8, 1.55, −0.9] | props `<HungSilHammer head="left" pegs={false}>` origin (wall surface between the pegs) |
| `guyAtHammer` (+`RotY` −π/2) | [−1.05, 0, −0.8] | facing the hammer wall |
| `slit` | [−1.8, 1.35, −0.9] | centre of the light slit |
| `printer`, `printerSlit` (+`printerRotY` −π/2) | [1.59, 0, −0.9], [1.38, 0.84, −0.9] | |
| `guyAtPrinter` (+`RotY` 2.6) | [0.96, 0, −0.18] | beside the printer, turned to the slit |
| `feeder` (+`feederRotY` π/2) | [−0.35, 0, 0.3] | props `<Monolith>` base; its face (prop +Z) turned toward +X. The Swing fits: `MONOLITH.guySwingSpot` lands the Guy at [0.74, 0, 0.47], hammer peak 2.09 m (ceiling 2.7), clear of the bed |
| `pancakeAtFeeder` (+`RotY` π+0.35) | [0.16, 0, 1.27] | Pancake BESIDE the box (door side), nose ~0.2 m off its front corner, near-profile to `feederWide`, turned toward it. Not between the box and the camera: the box is only 0.85 m, he must not look bigger than it |
| `vent` | [0, 2.68, −0.55] | ceiling grille centre |

### `CELL_CAMERAS` (spread `{position, target, fov}` into `<CameraRig/>`; pass `hideWalls`/`hide` to the CellRoom)
| name | what | needs |
|---|---|---|
| `throughBlinds` | symmetrical, from the deck **through the window and the blinds**: slatted back wall, he rises into the bars of light | — |
| `wide` | symmetrical diorama of the whole cell: bed centred under the striped back wall, door/iris left, printer right | `hideWalls ['front']`, `hide ['facade','outside']` |
| `bedProfile` | profile at the bed: the back-board lifts him upright, slit light behind his face | `hideWalls ['right']`, `hide ['printer']` |
| `feederWide` | floor level, held: monolith face-on, Pancake in profile in front of it | `hideWalls ['right']`, `hide ['printer']` |
| `hammerWall` | the pegs across the vertical light slit | `hideWalls ['right']`, `hide ['printer']` |
| `windowOutside` | monumental: the block's grid of identical cells on their decks, ours in the centre | — |
| `windowDeck` | closer, from the deck: the parapet in the foreground, the window centred | — |
| `windowInside` | from behind the bed toward the window: blinds and climber black against the city glow | `hideWalls ['back']` |
| `printer` | the printer slab from above-left: red slit, page halted | `hideWalls ['left','ceiling']`, `hide ['door']` |

Also exported: `CELL`, `CELL_WINDOW`, `CELL_BED`, `CELL_DOOR`, `CELL_SLIT`, `CELL_PEGS`, `CELL_PRINTER`, `CELL_PAGE`,
`CELL_VENT`, `CELL_FACADE`, `CELL_PILLOW_LOCAL`, `cellBedHead(tilt)` → `{pivot, rotationX}`, `cellHeadPoint(tilt, local)`,
`cellSlatCentres(traverse)`, and the cookie internals `cellMaterial`, `makeCellUniforms` and `setCellUniforms`.

---

## 2. `<Megablock>` and `<CityGrid>`: brutalist towers

```tsx
<Megablock w?={32} h?={96} d?={24} floors?={≈h/3.4} bays?={≈w/3.6} litFraction?={0.03} seed?={1}
           warmWindow?={false | true | {face: 'front', bay, floor, intensity: 1.6}}
           faces?={['front','back','left','right']} podium?={2} crown?={true} color?={GREYS.g5} ambient?={1.1}
           litIntensity?={0.9} litColor?={S.bone} glass?={GREYS.g1} fin?={0.7} {...group}/>
```
- **Structure.**
  - The origin is the base centre and the front face is +Z.
  - Each face has deep 0.7 m fins and spandrel bands. The open podium (pilotis around a slim core, `podium` floors high)
    lets the backlight pass under the tower.
  - The crown is a parapet, plant boxes and sometimes a mast, all seeded.
  - The concrete, frames and crown are about two draw calls in total.
- **Panes.** All panes are one InstancedMesh of slatted glass: dark panes, `litFraction` bone-lit ones, and the single
  **`warmWindow`** in dawnGold.
  - The warm window is the Final crane's "black city with one warm window", and it is allowed in **Final/Outro only**.
  - `true` uses `MEGABLOCK_WARM_DEFAULT`: the front face, ~58 % up, just left of centre.
- **Self-light.** `ambient` is the concrete's self-light, shaded per face (sky above, a soft key from +X, darker fronts)
  so the volume reads without any lights. Use 0–0.3 for a black city. Scene lights add on top (MeshStandard).
- **Anchors.** `megablockLayout(props)` gives the floor height, bay widths and roof height.
  `megablockPane(props, face, bay, floor)` returns `{position, normal, size}` of a pane, for example to aim a crane shot
  at the warm window.

```tsx
<CityGrid rows?={8} cols?={8} spacing?={56} seed?={1} height?={[30, 150]} footprint?={[16, 34]} jitter?={0.3}
          centreBoost?={0.5} litFraction?={0.02} avoid?={[[x, z, r], …]} floorH?={3.4} bayW?={3.6}
          color?={GREYS.g4} glass?={GREYS.g1} litColor?={S.bone} litIntensity?={1} ambient?={1}
          shade?={[0.75, 1, 0.6, 0.9]} crowns?={true} {...group}/>
```
- **Field.** A deterministic, seeded field of blocks centred on the origin (x = columns, z = rows). The towers are
  **one instanced draw call** and their roof plant is one more.
- **Windows.** Windows are drawn procedurally in the shader (floors, bays, slatted glass, rare lit panes). They are
  fwidth-faded to their average colour when they get sub-pixel, so far blocks never shimmer. Fog does the depth.
- **Options.**
  - `avoid` clears circles, for example a hero Megablock's lot or a plaza.
  - `shade` sets the brightness of the front, back, left and right faces.
  - `cityGridLayout(props)` returns the blocks as `[{x, z, w, d, h, seed}]`.
  - For a black city use `color={GREYS.g2}` with dark fog and a bright horizon (`Backlight shape="slab"`).

---

## 3. `<Plaza>`: monumental emptiness

```tsx
<Plaza size?={[180, 200]} slab?={6} color?={GREYS.g5} ambient?={0.3} roughness?={0.6} axis?={true} stair?={true}
       masts?={true} mastLight?={1} mastColor?={S.bone} spill?={0.6} spillColor?={S.bone} {...group}/>
```
- **Layout.** The origin is the centre of the paving on y = 0. The paving is polished slabs with saw-cut joints every
  `slab` m.
  - `axis` lays two dark granite strips and a thin bone inlay line along Z, for one-point perspective.
  - `stair` adds 7 steps up to a podium at the −Z end, with cheek walls.
- **Masts.** 14 m floodlight masts every 24 m on both sides of the axis are instanced. `mastLight` lights their heads and
  a soft pool under each (decals, not real lights).
- **Spill.** `spill` is the screen's light on the paving in front of the stair, which is the bright floor a crossing
  figure is silhouetted against. Use `spillColor={S.authRed}` for the red-lit plaza (Pre).
- **Size.** The stair sits a fixed 34 m in from the −Z edge and the crossing 30 m in front of it, so keep `size` at or
  above about [120, 120]; smaller plazas push the stair and the walks past the centre.
- **No three.js lights.** The plaza brings none. Light it more from the scene (screens, `Backlight`, `LightShaft`).
- **`PLAZA_SPOTS`** (for other sizes use `plazaSpots(size)`):
  - `stairZ` (−66) is the first riser, and `podiumZ` / `podiumY` (1.26) describe the podium.
  - **`screen`** [0, 1.26, −86.3] is a `TenureScreen` base on the podium, facing +Z down the axis.
  - `towersLeft` / `towersRight` are Megablock bases flanking the plaza, with `towersLeftRotY` π/2 and
    `towersRightRotY` −π/2 so their fronts face the axis.
  - `crossingStart` / `crossingEnd` [∓40, 0, −36] are a walk across the lit paving (rotation-y π/2).
  - `axisStart` / `axisEnd` are a walk up the axis toward the screen (rotation-y π).
  - `masts` lists the mast foot positions.
- **`PLAZA_CAMERAS`:**
  - `axial`: low, dead centre.
  - `crossing`: raised, long lens, down the axis over the lit paving.
  - `crane`: high above the axis.

---

## 4. `<HouseCube>`: the house as a black cube

```tsx
<HouseCube size?={8} time? color?={GREYS.g3} ambient?={0.06} doorOpen?={0} doorIris?={{…IrisProps} | false}
           irisLight?={1} warmWindow?={0} windowGlow?={0} windowOpen?={false} interior?={0} interiorColor?={S.bone}
           facadeLight?={0} laserCage?={0} cagePulse?={0.6} stencil?="UNIT 0315 · LEASED" {...group}/>
```
- **Facade.** The origin is the base centre and the front face (+Z) is at z = size/2.
  - `size` is clamped to ≥ `HOUSE_MIN_SIZE` (7.6): the facade is laid out in metres.
  - The door is a deep-reveal opening in the centre, 1.2 × 2.5 above the step. Its slab slides into the wall on the +X
    side with `doorOpen` (the −X side is the carved climb room).
  - The TENURE iris lock is **on the right door-jamb face** (radius 0.16; props pass through `doorIris`).
    `doorIris.position` (house-local) and `doorIris.radius` override the spot and the size, e.g.
    `doorIris={{position: [-0.98, 1.62, 4.004], radius: 0.25}}` puts it on the left jamb. The red spill light
    (`irisLight`) follows the iris, 0.6 m out along +Z. A rotated iris still gets its light along +Z.
  - **Roof parapet.** A lip runs round the top 0.5 m (from y = size − 0.5, i.e. **7.5** for the 8 m cube) and stands
    **8 cm proud** of every face. Text or decals on the facade plane above about **7.4 m** are hidden behind it (from a
    low camera the lip's underside also covers a centimetre or two below 7.5). Keep facade lyrics below ~7.4, or put
    them on a plane in front of the lip (z > size/2 + 0.08).
  - Two flanking windows have a **sill at 1.0 m** above the ground. The **left** one is the guyClimb window: its
    front skin is only 0.2 m thick, which is exactly guyClimb's sill (outer face +0.25, inner face +0.45 from the root).
    Behind it is a carved interior room (3 × 3 × 3.6 m, floor = ground) where he lands.
  - `windowOpen` removes the left window's glass line and opens that room.
  - A 0.37 m concrete step (`GUY.seatHeight`) runs across the door bay.
- **Light options.**
  - `windowGlow` gives the windows a bone screen glow seen through slats (V2Rain).
  - `facadeLight` is the street screens lighting the concrete; use it when figures must read in front of the house.
  - `interior` with `interiorColor` lights the open doorway. With `windowOpen`, it also lights the room behind the
    climb window, so the climber silhouettes against it. **dawnGold only in Final/Outro**; the figures on the step read
    against it. Its floor spill only shows while `doorOpen` > 0.
  - `warmWindow` makes the left window dawnGold (1.0× plus a 0.2× halo, so it stays gold instead of washing to cream)
    and spills gold on the ground (**Final/Outro only**).
  - `laserCage` 0..1 builds the red laser lattice around the cube from bottom to top (Chorus1), adding a red ground glow
    and light packets running along the lines (`cagePulse`; it needs `time`).
- **Lights.** One red point light for the iris spill and one dawnGold point light for the warm window, in a constant
  count.
- **`HOUSE_SPOTS`** (for other sizes use `houseSpots(size)`):
  - Door and iris: `door` [0, 0.37, 4], `doorInside`, and **`doorIris`** [0.98, 1.62, 4.004] (faces +Z; Iris default
    orientation).
  - The climb window: `window`, `windowSill` [−2.3, 1.0, 4], and **`climbRoot`** [−2.3, 0, 4.25] (`climbRotY` π) for
    `guyClimb`. `rightWindow` is the twin.
  - The step: `step`.
  - **`guySeat`** [−0.3, 0, 4.7] is the root for the man sitting on the step: `pose={{…, sit: 1}}`, no y offset.
  - **`pancakeSeat`** [0.32, 0.37, 4.55] is Pancake sitting on the step. Both sit inside the doorway's width (x ±0.6), so
    their outlines read against the lit doorway from the `outro` camera (f405).
  - **`bowl`** [0.55, 0, 5.55] is on the ground in front of the step.
  - `guyAtDoor` [0, 0, 5.55] (rotation-y π) faces the door.
  - `cage` is `{half, height}`.
- **`HOUSE_CAMERAS`:**
  - `outro`: static symmetrical wide at dawn.
  - `cage`: low and monumental.
  - `door`: the iris lock.
  - `window`: three-quarter on the climb window.

---

## 5. `<Corridor>`: "upgrade to continue"

```tsx
<Corridor length?={60} width?={4} height?={6} gates?={8} firstGate?={8} gateSpacing?={auto}
          gateClose?={(i) => 0} time? endLight?={1} slot?={1} pools?={1} red?={1} threshold?={0.6} labels?={true}
          color?={GREYS.g5} ambient?={0.07} {...group}/>
```
- **Layout.** The origin is the floor centre of the **entrance**, and the corridor runs to z = −length.
  - **The set reaches 3.8 m in front of its origin.** The side walls and the ceiling start at **z = 3**, not 0, and
    the entrance **portal face** (a thick frame round the mouth: 3.6 m out from each side of the opening and 3 m above
    it) is a slab from **z 3 to 3.8**. The floor runs on to z 15. Anything at the entrance plane (z ≤ 3) that lies
    outside the opening (|x| > width/2 or y > height), such as text on a facade, is hidden behind the portal.
    To set the corridor into a wall of your own, place it at `z = wallZ − 3.85`, so the portal front sits 5 cm behind
    the wall face (Chorus1 ShotCorridor: wall at z 0, `<Corridor position={[0, 0, -3.85]}/>`). Text on the wall then
    sits in front of the portal.
  - Each gate has deep portal frames (wall ribs and a lintel), with half-ribs between gates.
  - A ceiling light slot runs the whole length (`slot`).
  - A bone doorway of light at the far end (`endLight`) is cut off as gates close.
- **Gates.** Each gate is two heavy leaves that slide out of the wall pockets and meet in the middle.
  - `gateClose(i)` returns 0 (open) to 1 (shut) for gate i, where 0 is the nearest. Example:
    `(i) => ramp(f, 30 + i * 12, 44 + i * 12)`.
  - **Red strips** (LaserLines) run on the leaves' leading edges and brighten as they close, ending as one red seam.
    Faint armed lines run on the jambs and lintel, and a red floor `threshold` line crosses each gate. A red floor spill
    appears while a gate closes.
  - `labels` stencils GATE 01 … on the leaves.
  - A shut gate is a dark slab with its red seam: it cuts off the far light (f421 open → f435/f448 shut).
- **Pools and lights.** `pools` is a downlight per lintel: a bone strip and a soft floor decal, plus **one real point
  light per gate** high in the middle of the bay in front of it (intensity 70, distance 9 m, constant count; `pools={0}`
  turns them off). These are the corridor's only three.js lights. Do not put a light right in front of the leaves: it
  blows a shut gate out to white, so the gate reads as light and blooms the walker grey.
- **Anchors.** `corridorLayout(props)` returns `{gateZ[], openW, openH, leafW, spacing, endZ, …}`. `CORRIDOR_SPOTS` is
  the default layout plus `walkStart` and `end`.
- **`CORRIDOR_CAMERAS`:**
  - `axial`: dead-centre one-point perspective from outside the mouth.
  - `low`: close behind the walker.
  - `reverse`: from beyond the far end; it needs `endLight={0}`.

---

## 6. Building blocks (for your own architecture)
- **`<LaserLines segments={[[a, b, k?], …]} color?={S.authRed} intensity?={1.6} width?={0.02} minPx?={1.6} halo?={3}
  time? pulse?={0} fog?={0.6} maxHdr?={2}/>`**
  - Hot ribbons, at least `minPx` wide on screen at any distance, drawn in one call.
  - Endpoints may move every frame.
  - `maxHdr` caps one line's HDR value (intensity × core × k × pulse) at 2, so k > 1 segments and pulses never tone-map to
    orange. Lines are additive, so crossings still add up at the intersection points. Leave headroom under the cap if
    you want `pulse` to show (the cage runs at 1.1–1.3).
- **`useConcreteMat({color, ambient, roughness, kind: 'wall'|'floor', sky})`**
  - A hook giving a per-instance concrete MeshStandardMaterial whose inputs can change every frame.
  - `concreteMat(opts)` is the cached version for **static** values only. Animating its inputs would cache a new
    material per value.
  - `sky` 0..1 shades the self-lit term per face.
- **`wbox(w, h, d, pos, tile)` / `wboxMinMax(min, max, tile)`** build boxes with world-scaled UVs, so the texture density
  is constant. `mergeBoxes(list)` merges them into one geometry.
- **Textures.**
  - `concreteTex()` is board-formed concrete: 1.2 × 0.6 m panels and tie holes, 4.8 m per repeat.
  - `floorTex()` is polished concrete with saw-cut joints, 2.4 m per repeat.
  - `blindsTex()`, `glowTex()` and `columnGlowTex()` are also available.
  - `stencilTex(text, {font: 'mono'|'futura'|'futuraCond'})` returns `{tex, aspect}`. It is a cached SFONTS stencil;
    tint it with the material colour.
- **Seeded randomness.** `prng(seed)` and `hash01(a, b, c)` give seeded randomness for geometry.

---

## 7. Verified previews

Run `node scripts/still.mjs silplay Sets --frames=15,45,75,105,135,165,195,225,255,285,315,345,375,405,421,435,448,465`. The playground is
`src/silhouette/playground/Sets.tsx`, with one shot per 30 frames. The output is in `.preview/out/silplay-Sets/`, with
`sheet.jpg` as the contact sheet.

| file | shot |
|---|---|
| `f00015.jpg` | CellRoom `throughBlinds`: bars of window light on the back wall seen through dark slats, red scan bar, he rises with the bed (`bedActive`) |
| `f00045.jpg` | CellRoom `wide`: symmetrical diorama with the bed up, the striped back wall behind his silhouette, door iris left, printer error right, red vent above |
| `f00075.jpg` | CellRoom `bedProfile`: the back-board lifting him upright, the slit blade behind his face, red mechanism strip |
| `f00105.jpg` | CellRoom `feederWide`: the props `<Monolith>` at `feeder`, Pancake beside it at `pancakeAtFeeder` in profile against a red `LightPool` haze; door leak line |
| `f00135.jpg` | CellRoom `hammerWall`: the props `<HungSilHammer>` at `hungHammer` resting on the cell's pegs across the vertical light slit |
| `f00165.jpg` | CellRoom `windowOutside`: the deck-access block, a grid of identical cells, ours with red scan + stripes |
| `f00195.jpg` | CellRoom `windowInside`: blinds traversed aside, he climbs in, black against the city glow |
| `f00225.jpg` | CellRoom `printer`: red slit + error dot, page halted half out, him beside it |
| `f00255.jpg` | Megablock ×3 from a low camera: open pilotis podiums, fins, rare lit windows against a radial haze; a tiny figure in a pilotis gap |
| `f00285.jpg` | CityGrid 16×16 + Megablock `warmWindow`: black city against a pale horizon, one gold window (Final crane) |
| `f00315.jpg` | Plaza `crossing`: masts and light pools in perspective, axis line, stand-in screen with iris on the podium, tiny figure on the lit paving |
| `f00345.jpg` | HouseCube `laserCage`: red lattice around the black cube, red ground glow, a figure beside it against the haze |
| `f00375.jpg` | HouseCube `door`: `facadeLight` 0.35, slatted window glow, iris lock on the jamb, him at the door |
| `f00405.jpg` | HouseCube `outro`: black cube on gold dawn, warm window, gold doorway, man + dog silhouettes on the step |
| `f00421.jpg` | Corridor `axial`, all gates open: red portal frames, the far doorway of light behind him |
| `f00435.jpg` | Corridor `axial`, gates 4–8 shutting in sequence: gate 4 shut (dark slab, red seam), the far light cut off |
| `f00448.jpg` | Corridor `axial`, gates 4–8 shut |
| `f00465.jpg` | HouseCube `window` camera, `windowOpen` + `interior` 0.7: `guyClimb(~0.3)` knee on the 0.2 m sill, silhouetted against the lit room |

---

## 8. Caveats (things scene builders must know)

**Framing and the far plane**
- **Camera far plane.** `<SilStage>` defaults to `far: 800`. City wides and cranes need `camera={{far: 4000}}`,
  otherwise the far blocks and the horizon `Backlight` are clipped (verified in f285).

**Geometry that hides your text**
- **Corridor portal.** The Corridor's walls start at z 3 and its portal face fills z 3–3.8 in front of its origin
  (§5). Text at the entrance plane outside the opening is hidden behind it.
- **HouseCube parapet.** The roof lip (from y 7.5 on the 8 m cube, 8 cm proud) hides facade text above ~7.4 m (§4).

**CellRoom: the cookie light**
- **No shadows.**
  - The cookie is not occluded by objects. Characters, props and the raised back-board cast no stripes-shadow.
    This is invisible from the window-side cameras and acceptable elsewhere. Characters never receive it either.
  - If you need his shadow on the striped wall, add a dark decal yourself.
- **The bed and the scene.** The narrow back-board is deliberate. A full-width backrest merges with his torso and kills
  the silhouette in the symmetrical shots.

**CellRoom: cameras and visibility**
- **`hideWalls` cameras.** Cameras outside the room must also hide pieces that would sit in front of the lens; the
  `hide` list in `CELL_CAMERAS` says which. The corridor glow behind the door only exists while `doorOpen` > 0, and the
  slit glow is a narrow card, so neither leaks into outside views.
- **Outside card.** The city card is 60 m out along +Z and faces the room. Cameras farther out than that see its back,
  which is culled. `outside={false}` removes it, for example when the scene supplies its own skyline.

**CellRoom: lighting and the feeder**
- **Practicals.** The cell has five point lights, the corridor has one per gate, and the house has two. Their counts
  are constant (toggling never recompiles), but they ARE global three.js lights. Other things within their
  distance (≤ 9 m) are lit too.
- **Feeder.** The props Monolith is only 0.85 m tall (Pancake's head top is 0.75 m): keep Pancake beside it at its front
  plane (`pancakeAtFeeder`), never between it and the camera, and shoot low (`feederWide`, 0.3 m). Both need a bright
  backdrop: the box's own red halo plus a red `LightPool` (or a Backlight) between them and the left wall, as in f105.

**Concrete materials**
- **Static vs animated.** Use `useConcreteMat` in your own components whenever an input animates. `concreteMat` is
  cached by value and is meant for static use only.

**Colour and brightness**
- **Colour rules.** Gold appears only through `warmWindow` (Megablock, HouseCube) and `interiorColor` (HouseCube), and
  only in Final/Outro. Red appears only on control: the scan, the bed strips, the printer slit, irises, the cage, gate
  strips and the vent.
- **Red intensity.** All built-in red stays at or below about 2× intensity; `LaserLines` enforces it per line (`maxHdr`).
- **Bloom.** Big glow surfaces stay at or below 0.85 of bone. The cell slit, the corridor lintel strips and the far
  doorway are small and allowed to bloom.

**Determinism and fonts**
- **Seeded randomness.** Randomness uses a local seeded PRNG/hash (`prng`, `hash01`, and a sin-free GLSL hash) instead
  of `rand()` from `src/lib/time`, because the textures need tens of thousands of draws. It is equally deterministic,
  and `Math.random` is never used.
- **Output folder.** `still.mjs` wipes `.preview/out/silplay-Sets/` on every run. Render all the frames you want to keep
  in one pass.
- **Fonts.** Stencils use SFONTS (Futura and Andale Mono on the Mac), and the cloud previews fall back to other fonts.
