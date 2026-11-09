# Shared library — API reference for scene builders

Everything a scene needs to stage *Buy Now, For Now*. Read DESIGN.md first. This file covers **what exists, how to call it,
the anchor constants, and which preview image shows it**. Every component file also has a doc comment at the top with the
full prop list, so open the file when you need more detail.

Preview images live in `.preview/out/<key>/` (open them with the Read tool). Rendering a playground **wipes and rewrites**
its own folder: `node scripts/still.mjs play <Name> --frames=a,b,c`. The integration playground is **`src/playground/Showcase.tsx`**:
the whole cast at true scale in every set (see §11). The main §10 recipes are rendered as written in **`src/playground/Recipes.tsx`**.

---------------------------------------------------------------------------------------------------------------------------

## 0. Conventions (all modules)

- **Units and axes:** metres and radians. `y = 0` is the floor/ground. Characters and props **face +Z**, and the origin is at the base centre unless stated otherwise.
  All `XXX_SPOTS` and `XXX` anchor constants are in that object's **local** space. Apply the object's own transform to them (or put
  your things inside the same `<group>`).
- **Determinism:** components are pure functions of their props. Pass frame-derived numbers (`f = useCurrentFrame()`,
  `t = f / 30`, `useSongTime()`). Many components take `frame` or `time` explicitly: always pass them, or blinks, rain, flicker
  and similar effects freeze. Mutate per frame only in `useLayoutEffect`. No `useFrame`, `Math.random` or `Date`.
- **Group props** (`position`, `rotation`, `scale`, `visible`, …) pass through on every 3D component.
- **Fonts:** system fonts only (`FONTS` in `lib/palette`). Nothing is downloaded. 3D text uses the local typeface JSON in `src/assets/fonts`.
- **Look:** cel-shaded `toonMat` + inverted-hull ink outlines (colour `#1b1030`) on characters, props and sets. Chrome and gloss come from the
  Y2K shader materials. Bloom is the `<Stage>` default (threshold 0.9): anything brighter than ~0.9 after tone mapping glows.
- **Captions:** the bottom **230 px** (`CAPTION_ZONE`) belongs to the global karaoke captions. Keep faces and text above it.

### Import cheat-sheet (paths from `src/scenes/<Scene>/index.tsx`)
```ts
import {Stage, CameraRig, ChromeText, measureChromeText, SparkleField, LensFlare, Sunburst, WireGrid, Confetti,
        Rain, LightRays, Glow, Swoosh, SpeedLines, Starfield, chromeMat, goldMat, glowMat} from '../../lib/three';
import {SkyDome as Y2KSky} from '../../lib/three/fx';                       // gradient wallpaper backdrop
import {useSongTime, useAbsoluteFrame, useBeat, beatAt, ramp, popIn, lerp, rand, noise1, sec} from '../../lib/time';
import {wordTime, lineAt, LINES, linesOf} from '../../lib/lyrics';
import {C, FONTS} from '../../lib/palette';
import {Guy, GUY, guyIdle, guyWalk, guyHammerSwing, guySitOn, mergePose, mixPose, guyPoint} from '../../lib/characters/Guy';
import {Pancake, PANCAKE, pancakeIdle, pancakeBeg, pancakeEat, pancakeHappy, pancakeAnchor} from '../../lib/characters/Pancake';
import {Feeder, FEEDER, Padlock, Hammer, HeldHammer, HeldPhone, HeldBook, HungHammer, HELD, FlipPhone, EReader,
        Book1984, DogBowl, FoodBag, KibbleBurst, KibblePile} from '../../lib/props';
import {CRTTV, CRT_SCREEN, crtFillCamera, makeTestPatternTexture} from '../../lib/props/CRTTV';
import {Car, CAR} from '../../lib/props/Car';
import {Bedroom, BEDROOM_SPOTS} from '../../lib/sets/Bedroom';
import {SkyDome, SKY_PRESETS, ExteriorLights, RollingHills, House, HOUSE_SPOTS, Street, GasStation, GAS_SPOTS,
        StreetLamp, SunFlare, Tree, Bush} from '../../lib/sets/Exterior';
import {Dialog, Cursor, clickAt, PopupStorm, BannerAd, Stamp, Popup3D, popupButton3D, Stamp3D, PopupTunnel3D,
        Cursor3D, POPUP_MESSAGES} from '../../lib/ui';
import {CamcorderHUD} from '../../overlays/CamcorderHUD';
import {CutEffect} from '../../overlays/CutFlash';
import {CAPTION_ZONE} from '../../overlays/Captions';
```
**Name collisions:** some names exist in two modules. Alias one of them when you need both (full list in §12):
`SkyDome`/`SKY_PRESETS` (three/fx vs sets/Exterior), `Glow`, `chromeMat`, `glowMat`, `Padlock`, `Ink`/`hullOf`, `mixPose` (Guy vs Pancake), `clamp01`.

---------------------------------------------------------------------------------------------------------------------------

## 1. Render path — `lib/three/Stage` (read-only shared file)

```ts
<Stage background?="#000"|null fog?={{color, near, far}} env?='chrome'|'studio'|'sky'|'sunset'|'night'|'none'
       envBackground?={false} bloom?={{strength=0.6, radius=0.4, threshold=0.9}}|false
       lens?={{aberration=0.0015, vignette=0.35, grain=0.035, scanlines=0, saturation=1.08}}|false
       camera?={{fov=45, near=0.1, far=500, position}} exposure?={1} shadows?={false}>…</Stage>
<CameraRig position={[x,y,z]} target?={[x,y,z]} fov?={deg} roll?={rad} />      // all values may change every frame
```
- Every 3D shot goes inside one `<Stage>`. Tone mapping is ACES. `env` is a procedural PMREM environment (chrome, metals and clear-coat reflect it).
- Env picks: interiors use `night` (moody) or `chrome`. Exteriors use `SKY_PRESETS[preset].env` (`sky`, `sunset`, `night`).
  **Avoid `studio`** with the Car (clear-coat blows out to white).
- Preview: every playground. A simple test is `.preview/out/play-ToonTest/sheet.jpg`.

---------------------------------------------------------------------------------------------------------------------------

## 2. Time, lyrics, palette (read-only shared files)

`lib/time`:
- `FPS = 30`, `sec(s) → frame`.
- `useAbsoluteFrame()` and `useSongTime()` return the song-absolute frame and seconds (scene-local frame = absolute − scene `from`).
- Beat helpers: `beatAt(t, decay=9) → {index, since, phase, pulse, inBar, downPulse}`, `useBeat()`, `nextBeat(t)`. Also `BEATS`, `DOWNBEATS`, `TEMPO` (~112.3), `BEAT_LEN` (~0.534 s).
- Audio readings: `rmsAt(absFrame)`, `bassAt`, `onsetAt`, and `bandsAt(absFrame) → 16 × 0..1`.
- Easing: `ramp(f, a, b, easing?)` gives 0..1 (in-out cubic by default). `popIn(f, a, dur=12)` gives 0..~1.1..1 with overshoot. Also `lerp`, `clamp01`.
- Seeded randomness: `rand(seed)` in [0,1) and `noise1(x, seed)` in −1..1 (smooth).

`lib/lyrics`:
- `LINES: Line[]`, where `Line = {i, section, text, start, end, words: {text, start, end}[]}`.
- `wordTime(lineIndex, word, occurrence=0) → seconds`. It throws if the word is missing.
- `lineAt(t)` and `linesOf(section)`.

`lib/palette`:
- `C`: `y2kBlue #1E5BFF`, `aqua #19C6FF`, `bubblegum #FF4FB8`, `tangerine #FF8A1E`, `lime #9BFF3A`, `grape #8A4DFF`, `night #050A2A`, `alertRed #E2231A`, `pancakeGold #E9B25E`, `sodium #FFB347`, …
- `FONTS`: `ui`, `web`, `verdana`, `heavy`, `impact`, `comic`, `papyrus`, `mono`, `lcd`, `serif`. These are CSS stacks for canvases and HTML.

---------------------------------------------------------------------------------------------------------------------------

## 3. Characters

### 3.1 `lib/characters/Guy` — the protagonist (1.79 m)
```ts
<Guy pose?={GuyPose} rightHand?={ReactNode} leftHand?={ReactNode} outfit?={Partial<GuyColors>}
     outlineScale?={1 /*0 = none, ~1.6 for wide shots*/} shadow?={true | opacity(0.35) | false} {...group} />
```
- **Frame:** faces +Z, feet on y = 0, origin between the feet.
- **Hand slots:** `rightHand` and `leftHand` render in the hand's **grip frame**: origin at the fist centre, +Z forward out of the thumb side,
  −Y along the fingers, palm normal +X for the right hand. Use the `Held*` adapters (§4.2) instead of rotating props yourself.
- **`GuyPose`** (every field optional; angles in radians):
  - Locomotion: `walk` (cycles), `walkAmount`, `run` (0..1).
  - Seating and lying: `sit` (0..1), `lie`, `bed`.
  - Body offsets: `hipsY` and `hipsZ` (m), `ground` (1 = auto-plant the soles on y = 0).
  - Torso and head: `lean`, `torsoBend`, `torsoTwist`, `torsoSide`, `headYaw` (+ = his left), `headPitch` (+ = down), `headTilt`, `shrug`.
  - Limbs: `armL`/`armR = {shoulderX, shoulderZ, shoulderY, elbow, twist, wrist, wristZ, grip, swing}` and `legL`/`legR = {hipX, hipZ, hipY, knee, ankle, swing}`.
    Sign conventions are at the top of `guy/rig.ts`.
  - Face: `expression` ∈ `neutral|sleepy|shock|angry|sad|happy|determined|yell|cold`, `expression2` + `expressionMix`, `mouthOpen` (0..1 lip-sync),
    `blink`, `eyesX`/`eyesY` (−1..1).
  - Cold: `shiver` (needs `t`).
- **Pose helpers** (`t` = seconds, `p` = 0..1 progress):
  - `guyIdle(t, seed?)`
  - `guyWalk(t, cadence=0.94)`: limbs only. **Move the root yourself** at `GUY.strideLength * cadence` m/s (≈1.07 m/s).
  - `guyRun(t, cadence=1.35)`
  - `guySleepyWake(p)`: bed mode. 0 = asleep, 0.15–0.5 = sits up (sync the bed tilt, §10), then rubs an eye, then stretches.
  - `guyShiver(t)`
  - `guyHammerSwing(p)`: 0 = wind-up, 0.3 = overhead, **0.5 = impact**, 1 = follow-through.
  - `guyClimb(p)`: window sill at y ≈ 1.0, z ≈ 0.25–0.45. The root stays outside.
  - `guyCheer(t, bpm)`, `guyPhoneToEar(t?)`, `guyHoldUp(p, t?)`, `guyPatDog(t)`: patting hand at ~0.66 m high, 0.55 m in front.
  - **`guySitOn(seatY)`**: sits on a seat of any height with the feet still on the floor. Keep the group at **floor** level. The bed is 0.52, the default chair is 0.37.
  - `guyBlink(t, seed)` returns 0..1.
  - Combining poses: `mergePose(a, b)` is a deep merge where b wins. `mixPose(a, b, k)` blends numerically. `keyPoses(p, [[p0, pose0], …])` interpolates with smoothstep.
- **Kinematics:**
  - `guyPoint(pose, joint, holding?) → [x,y,z]` (Guy-local). Joints: `hips chest neck head eyes nose mouth shoulderL/R elbowL/R wristL/R gripL/R kneeL/R ankleL/R`.
  - `guyJointMatrix(pose, joint, holding?) → Matrix4` and `resolveGuy(pose)` (full solve).
- **`GUY` anchors** (m):

  | anchor | value | anchor | value |
  |---|---|---|---|
  | `height` | 1.79 | `hipHeight` | 0.85 |
  | `eyeHeight` | 1.53 | `seatHeight` | 0.37 |
  | `headCenterY` | 1.531 | `sitHipHeight` | 0.465 |
  | `chinY` | 1.366 | `sitKneeZ` | 0.385 |
  | `shoulderHeight` | 1.30 | `lieHeight` | 0.14 |
  | `shoulderWidth` | 0.444 | `lieHeadZ` | −0.681 |
  | `bodyWidth` | 0.58 | `handHang` | [−0.276, 0.712, 0.095] |
  | `strideLength` | 1.134 | `faceTarget` | [0, 1.5, 0.05] |
  | `footLength` | 0.29 | `chestTarget` | [0, 1.17, 0] |

  `hammerImpact` [−0.148, 0.434, 0.651] is the hammer-head centre at `guyHammerSwing(0.5)`. The real striking face is `HELD.hammerFace` through `guyJointMatrix`.
- Also exported: `GUY_COLORS`, `GUY_DIM`, `GUY_REST_ARM`, `GUY_REST_LEG`, and the types `GuyPose`, `GuyArmPose`, `GuyLegPose`, `GuyExpression`, `GuyJoint`, `GuyColors`.
- Previews:
  - Turnaround: `play-Guy/f00000.jpg`
  - Walk: `f00040`
  - Expressions: `f00220`, `f00262`
  - Hammer keyframes: `f00095`
  - Phone + sit: `f00130`
  - Wake in bed: `f00310`
  - Sheet: `play-Guy/sheet.jpg`
  - Real props in hand: `play-Held/sheet.jpg`
  - In the sets: `play-Showcase/f00020.jpg`, `f00160.jpg`, `f00300.jpg`, `f00410.jpg`

### 3.2 `lib/characters/Pancake` — the dog (0.55 m shoulder, 0.75 m head top)
```ts
<Pancake pose?={PancakePose} outlineScale?={1} shadow?={true|opacity|false} colors?={Partial<typeof PANCAKE_COLORS>} {...group}/>
```
- **Frame:** origin on the floor under the middle of the body, facing +Z.
- **`PancakePose`** (all optional):
  - Body: `walk` (cycles), `walkAmount`, `sit`, `lie` (sit and lie cannot be combined).
  - Head: `headYaw`, `headPitch` (+ = look **up**), `headTilt`.
  - Ears and tail: `earPerk` (−1 droopy .. 1 perked), `tailWag` (cycles), `tailWagAmount`.
  - Mouth and eyes: `mouthOpen`, `tongue` (0..1), `eyes` ∈ `open|puppy|happy|closed`, `blink`.
  - Eating: `eat` (0..1, head into the bowl), `eatPhase`.
  - Cartoon extras: `bodySquash` (−1..1), `hop` (m), `blush`, `frown`, `tear` (0..1: a tear forms under his left eye and rolls down).
- **Pose helpers** (`t` = seconds):
  - `pancakeIdle(t, seed)`
  - `pancakeWalk(t, speed=0.45 m/s, seed)`: move him `speed·t` along his own +Z and the paws stay planted.
  - `pancakeBeg(t)`: sitting, puppy eyes, the "hungry and lonely" look.
  - `pancakeEat(t)`, `pancakeHappy(t, seed, hops=true)`, `pancakeSad(t)`, `pancakeLie(t, sleepy?, seed)`
  - `pancakeBlink(t, seed, every=3.2)`
  - `mixPose(a, b, k)`: the eye style swaps at k = 0.5 with an automatic blink.
  - `solvePancake(pose)`: the full rig solve.
- **Anchors:**
  - `pancakeAnchor(pose, 'nose'|'mouth'|'head'|'headTop'|'eyeL'|'eyeR'|'tag'|'back'|'tailBase') → [x,y,z]`, Pancake-local, for any pose.
  - `PANCAKE`:

    | anchor | value | anchor | value |
    |---|---|---|---|
    | `shoulderHeight` | 0.55 | `noseEatLocal` | [0, 0.052, 0.445] |
    | `headTop` | 0.752 | `bowl` | **[0, 0, 0.465]** |
    | `noseLocal` | [0, 0.578, 0.524] | `tagLocal` | [0, 0.374, 0.299] |
    | `mouthLocal` | [0, 0.491, 0.465] | `backLocal` | [0, 0.548, −0.025] |
    | `noseSitLocal` | [0, 0.577, 0.384] | `rumpZ` | −0.29 |
    | `noseLieLocal` | [0, 0.233, 0.586] | `length` | 0.814 |
    | `headLocal` | [0, 0.578, 0.275] | `width` | 0.4 |
    | `strideLength` | 0.242 | `outline` | 0.009 |

  - Also `STRIDE_LENGTH` and `PANCAKE_COLORS` (`gold #E9B25E`, `cream #FFF0D2`, `collar #E2231A`, …).
- Previews:
  - Overview: `play-Pancake/sheet.jpg`
  - Beg close-up with a tear: `f00165.jpg`
  - Happy: `f00250`
  - Eye close-up: `f00440`
  - Eating: `f00500`
  - With the real bowl: `play-Showcase/f00375.jpg`
  - Beside the feeder: `play-Showcase/f00045.jpg`

### 3.3 Shared shading — `lib/characters/toon`, `lib/characters/InkMesh`
- `toonMat(color, {emissive?, emissiveIntensity?, opacity?})` is a cached 3-band `MeshToonMaterial`. Its ramp is `TOON_GRADIENT`.
- `outlineMat(thickness = 0.02, color = '#1b1030')` is the inverted-hull material. `OUTLINE = {color, thickness}`.
- `<InkMesh color? material? outline?={m|false} outlineColor? geometry={…} | <xGeometry/> child {...mesh}/>` draws a mesh plus its ink outline.
  drei `<Outlines>` does **not** render here.
- Ink weights in use:
  - Characters: Guy 0.0045–0.011, Pancake 0.009.
  - Furniture: 0.011 (`INK` in `sets/bedroom/ink`).
  - Hand props: 0.0009–0.005 (`PROP_INK`).
  - Car: 0.016.

---------------------------------------------------------------------------------------------------------------------------

## 4. Props — `lib/props` (barrel) + `lib/props/CRTTV` + `lib/props/Car`

### 4.1 Hero props
| component | key props | origin / size | anchors |
|---|---|---|---|
| `<Feeder>` | `lid` 0..1 (>1 over-rotates), `lidFly` 0..1, `lcdText`, `lcdColor`, `locked=true`, `lockOpen` 0..1, `lockShake` 0..1, `smashed` 0..1, `kibbleFill`=0.8, `time` | floor centre, LCD +Z; 0.45×0.35×0.35 | `FEEDER = {size, bodyTop 0.25, hinge [0,0.25,−0.175], lcdCenter [0,0.08,0.182], lcdSize, lockPivot [0,0.225,0.194], hopperCenter [0,0.29,0], frontZ 0.175}` |
| `<Padlock>` | `open`, `shake`, `broken` 0..1, `time`, `color` (`'#F5C542'` gold), `outline` | body centre; 7 cm wide | `PADLOCK = {body [0.07,0.058,0.03], shackleInnerTop 0.054, shackleTop 0.068, bottomY −0.029, height 0.097, frontZ 0.015}` |
| `<Hammer>` | `glow` 0..1 (use 0.3–0.8), `glowColor`, `outline` | GRIP point; handle +Y, face +X, claw −X; 0.353 long | `HAMMER = {length, headOffset [0,0.262,0], faceOffset [0.066,0.262,0], clawTip, buttY −0.07, topY 0.283, gripHalf 0.055}` |
| `<FlipPhone>` | `open` 0..1, `screenLines[]`, `screenColor`, `softKeys`, `extText`, `ringing` 0..1, `time` | keypad-half centre; keypad +Z, hinge +Y | `FLIPPHONE = {bottom, top, hinge, screenSize, screenCenterOpen [0,0.089,0.018], topY 0.129}` |
| `<EReader>` | `title`, `author`, `page[]`, `dissolve` 0..1 (pixels fly up), `banner`, `particles` | device centre, screen +Z; 0.122×0.172 | `EREADER = {size, screenCenter [0,0.013,0.005], screenSize}` |
| `<Book1984>` | `open` 0..1 (title page "mine. paid once.") | base centre, upright, cover +Z; 0.108×0.178×0.022 | `BOOK1984 = {size, coverCenter [0,0.089,0.011], spineX}` |
| `<DogBowl>` | `fill` 0..1, `color`, `name='PANCAKE'` | floor centre; r 0.125, h 0.071 | `DOGBOWL = {radius, height, innerRadius 0.094, floorY 0.016}` |
| `<FoodBag>` | `outline` | floor centre, front +Z; 0.30×0.47×0.13 | `FOODBAG = {size, frontCenter, sealY 0.456, carryPoint [0,0.456,0]}` |
| `<KibbleBurst>` | `progress` 0..1 (→ `duration`=2.4 sim-s), `origin`, `count`, `seed`, `spread`, `up`, `direction [vx,vz]`, `floorY`, `size`, `sourceRadius` | instanced ballistic, bounces, settles | put in the same group as the Feeder with `origin={FEEDER.hopperCenter}` |
| `<KibblePile>` | `count?`, `radius`, `height`, `footprint [w,d]`, `seed`, `size` | static mound on y = 0 | `KIBBLE = {size 0.011, colors}` |

Previews:
- Line-up: `play-Props/f00000.jpg`
- Feeder locked: `play-Props/f00040.jpg`, `play-PropsFeeder/f00030.jpg`
- Feeder smashed with a kibble burst: `play-Props/f00075.jpg`, `play-PropsFeeder/f00215.jpg`
- Flip phone: `f00135`
- E-reader dissolve: `f00195`
- E-reader banner: `f00215`
- Hammer glow: `f00268`
- Padlocks: `play-PropsLock/sheet.jpg`, `play-Props/f00310`
- Bowl: `f00345`
- Book: `f00400`
- Food bag: `f00425`

### 4.2 Hand and hook adapters — `lib/props/Held.tsx` (integration fix)
The Guy's grip frame and the props' own frames differ, so **always use these adapters for props in the Guy's hands.**
- `<HeldHammer glow? slide?=0.05 />`: handle along grip +Z, face toward −Y. Matches `guyHammerSwing`.
  - `HELD.hammerHead` [0, 0, 0.312] and `HELD.hammerFace` [0, −0.066, 0.312] are grip-frame points.
- `<HeldPhone open? screenLines? … offset?=HELD.phoneOffset />`: earpiece toward the fingertips, screen toward the cheek. Matches `guyPhoneToEar`.
- `<HeldBook open? />`: held by its bottom edge, cover toward the camera at `guyHoldUp(1)`. At `guyHoldUp(0)` it lies across the chest, cover up.
- `<HungHammer glow? {...group} />`: resting on two wall pegs. Origin is `BEDROOM_SPOTS.hammerHook`, the head points toward +Z (the door), claw up, and the wall is on −X.
- Previews:
  - Swing: `play-Held/sheet.jpg` (frame 10 shows the impact, with the lime `GUY.hammerImpact` marker and the pink real-face marker)
  - Hammer on the wall: `play-Showcase/f00065.jpg`
  - Hammer in hand: `play-Showcase/f00085.jpg`
  - Phone: `play-Showcase/f00410.jpg`

### 4.3 `lib/props/CRTTV`
```ts
<CRTTV screen?={THREE.Texture|null} power?={0..1 /*1→0 = collapse to a dot*/} glow? static?={0..1 snow} frame?
       color? antenna?={true} light? lightColor? {...group} />
```
- Silver "TELEVOX" set with a curved-glass shader (scanlines, vignette, snow). Origin at the base centre, facing +Z.
- `CRT_SIZE` {0.66, 0.61, 0.52}. `CRT_SCREEN` {width 0.46, height 0.345, center [0, 0.375, 0.283]}.
- `crtFillCamera(fovDeg)` gives the distance from the glass at which the picture fills the frame vertically (for a dive into the screen).
- `makeTestPatternTexture(label?)` returns a cached colour-bar card.
- Previews: `play-CRTTV/f00017.jpg` (power-on), `f00045`, `f00129`. In the room: `play-Bedroom/f00064.jpg`.

### 4.4 `lib/props/Car`
```ts
<Car wheelSpin?(rad) steer?(-1..1) doorOpen? headlights? brakeLights? bodyRoll? bodyPitch? bodyBounce? interior?=true
     seatFrost?(0..1, icicles >0.4) speedNeedle? rpmNeedle? dashSpeedText? dashLocked? fuel?=0.12 consoleText? consoleColor?
     paint?='#b9c1ce' plate?='4 NOW' beams? lights? shadow? outline?=0.016 {...group}/>
```
- 3.95 × 1.72 × 1.5 m, facing +Z, origin on the ground between the axles. The driver sits on **+X**.
- `CAR` anchors:
  - Seats and dash: `driverSeat` [0.38, 0.54, −0.22] (hip point), `passengerSeat`, `driverEye` [0.38, 1.22, −0.3], `steeringWheel`, `dashboard` [0.39, 1.055, 0.36], `console`.
  - Body: `fuelCap` [0.864, 0.86, −1.3], `driverDoorHinge`, `driverExit` [1.55, 0, −0.15], `headlights[]`, `tailLights[]`, `wheels.{fl,fr,rl,rr}`, `wheelRadius` 0.32.
  - Suggested cameras: `dashCam`, `seatCam` `{position, target, fov}`.
- Sitting the Guy: `<Guy position={[s[0], s[1] - GUY.sitHipHeight, s[2]]} pose={{...p, sit: 1}}/>` with `s = CAR.driverSeat`.
- Previews: `play-Car/f00000.jpg`, `f00100`, `f00150` (cops), `f00215` (locked dash), `f00280` (frost). Guy seated: `play-Showcase` frames 425 and 440 (render them).

### 4.5 Prop helpers (from `lib/props`, defined in `Padlock.tsx`)
- Materials:
  - `glossMat(color, {spec, edge, rim, rimColor, emissive, …})` is a cached cel-shaded material with a hard glint. `makeGlossMat` is the uncached version.
  - `chromeMat(color?, roughness?)` is env chrome (`MeshStandard`).
  - `candyMat(color, opacity)` is translucent plastic. `flatMat(color)` is unlit.
- Geometry and outlines:
  - `rbox(w, h, d, r)`: rounded box.
  - `<Ink geometry material outline? silhouette?/>` with `hullOf(geo)`: gap-free ink outlines on boxes.
  - `PROP_INK = {hair 0.0009, thin 0.0014, mid 0.0022, thick 0.0035, big 0.005}`.
- Utilities:
  - `useCanvasTexture(w, h, draw, deps)`: canvas texture redrawn only when `deps` change.
  - `usePropTime(time?)` returns seconds.
  - `makeGlowMat(color)`: additive fresnel shell.

---------------------------------------------------------------------------------------------------------------------------

## 5. Sets

### 5.1 `lib/sets/Bedroom` — 4.5 × 4 m room, 2.6 m ceiling, origin = floor centre
```ts
<Bedroom time?='night'|'dawn'|'day' lamp?(0..1) moon?(0..1+) copLights?(0..1) frame? windowOpen? rainOnWindow?
         hideWalls?={('front'|'left'|'right'|'back'|'ceiling')[]} doorOpen? stars? curtainsClosed? hammerGlow?(0..1)
         bed?={{tilt 0..1, glow, blanket, headSlot}} pillow?={{glow, talk, frame}} clock?={{text='3:15', color, blink, flash, pm, alarm, brightness, light}}
         printer?={{feed, error, locked, pageLines}} tv?={{screen, power, glow, static, antenna, light, lightColor, color}}
         lavaLamp?={{on}} hide?={BedroomPiece[]} {...group}>{cast}</Bedroom>
```
- **Pass `frame`.** The clock colon, pillow waveform, rain, cop lights, printer error and TV snow all animate from it.
- The TV is **off** by default: pass `tv={{power: 1, screen: tex}}`.
- The set brings its own lights (hemisphere, key through the window, fill, two cop point lights). Pass `hide={['lights']}` to light it yourself.
- Layout: back wall z = −2 (bed, nightstand + clock + lamp, window x≈1.15). Left wall x = −2.25 (door, hammer rack, dog bed). Right wall x = +2.25 (dresser + TV, desk + printer).
- `BedroomPiece`: `bed pillow nightstand clock lamp desk printer chair dresser tv lavaLamp rug posters hammerRack dogBed curtains outside lights blowupChair`.
- **`BEDROOM_SPOTS`** (room space):
  - Bed: `bed` [−0.6, 0, −0.88], `mattressTop` [−0.6, **0.52**, −0.88], `pillow` [−0.6, 0.595, −1.64], `pillowSitting`, `bedHinge` [−0.6, 0.52, −1.04].
  - Guy on the bed:
    - `guyLieInBed` = `guySitUpInBed` = **[−0.6, 0.52, −0.96]**: the Guy bed-mode origin (*fixed*). No rotation. Use with `guySleepyWake`.
    - `guySitOnBed` [0.03, 0, −0.75] with `guySitOnBedRotY` π/2. Pose with `guySitOn(0.52)`.
  - Guy standing: `guyStand` [0.55, 0, 0.45].
  - Nightstand: `nightstand`, `clock`, `clockFace` [−1.621, 0.618, −1.603], `clockRotY`, `lamp`, `lampBulb`.
  - Desk: `desk`, `printer` [1.98, 0.74, 0.06], `printerRotY` −π/2, `printerSlot`, `chair` [1.2, 0, 0.22].
  - Dresser and TV: `dresser`, `tv` [1.97, 0.82, −1.47], `tvRotY` −1.351, `tvScreen` [1.694, 1.195, −1.408], `tvNormal`.
  - Window and door: `window`, `windowSill` [1.15, 0.92, −1.92], `windowOutside`, `door`, `doorInside` [−1.7, 0, 1.25].
  - Pancake's things: **`feeder` [0.66, 0, −0.5]** (empty floor spot), `dogBed` [−1.7, 0, −0.62].
  - Hammer rack: **`hammerHook` [−2.175, 1.538, −0.62]**, `hammerPegs` (now 0.24 m apart, *fixed*), `hammerWallNormal` [1, 0, 0].
  - Decor: `rug`, `posterStar`, `posterY2K`.
  - Cameras `{position, target, fov}`: `cameraWide`, `cameraWideLeft`, `cameraBed`, `cameraClock`, `cameraPillow`, `cameraPrinter`, `cameraTV`,
    `cameraWindow`, `cameraHammer`, `cameraFeeder`, `cameraDiorama` (needs `hideWalls={['front','right']} hide={['outside']}`). Also `bedroomCamera(name)`.
- Head-section maths:
  - `bedHeadPoint(tilt, local)` and `bedHeadPose(tilt) → {pivot, rotationX}`.
  - `PILLOW_LOCAL`, `ROOM`, `BED_LOCAL`, `PILLOW_SIZE`.
- Pieces (also usable on their own):
  - Bed and pillow: `Bed`, `Pillow`.
  - `LedClock` (`CLOCK_SIZE`, `CLOCK_FACE`).
  - `Printer` (`PRINTER_ANCHORS`) and a printer-specific `Padlock`.
  - Furniture: `Nightstand`, `Lamp`, `Desk`, `DeskChair`, `Dresser`, `LavaLamp`, `DogBed`, `HammerRack`, `Poster`, `Rug`, `GlowStars`, `InflatableChair`.
  - `copFlash(frame) → {red, blue}`: the room's police-light pattern, for syncing your own lights.
- Previews:
  - Night wide: `play-Bedroom/f00010.jpg`
  - Dawn: `f00045`
  - Rainy window: `f00064`
  - Pillow talk: `f00118`
  - Clock: `f00145`
  - Printer error: `f00175`
  - Diorama: `f00265`
  - Bed tilt: `f00322`
  - Day: `f00375`
  - Cops: `f00435`
  - With the cast: `play-Showcase/f00005.jpg` (no character light) vs `f00020.jpg` (with a character light, §10.7)

### 5.2 `lib/sets/Exterior` — the Y2K wallpaper world and the night locations
- `<ExteriorWorld preset? time? sky? hills? house? lights? lightIntensity?/>`: sky, lights, hills and house in one line.
- `<ExteriorLights preset='day'|'sunrise'|'dusk'|'night' intensity? keyDir? distance? center? shadows? shadowSize?/>`
- `<SkyDome preset time? clouds? cloudSpeed? sunDir? sunScale? glow? stars? starBrightness? horizonLift? cloudRadius? cloudHeight? seed?/>`
  - Camera-centred at infinity; it ignores its own transform.
  - `SKY_PRESETS[preset] = {stops, sunDir, …, light: {…}, fog, env}`. Use `env` for the Stage. `sunDirection(preset)` is also exported.
- `<SunFlare dir|position strength? size? ghosts? color? twinkle? occlusion?/>`: place it **after** `<CameraRig>`.
- `<RollingHills palette? size=600 grass=2600 flowers=700 avoid?=[house footprint] plateau=14 …/>`
  - Flat at y = 0 within 14 m of the origin.
  - `hillsHeight(x, z)` and `makeHillsHeight(opts)` give the ground height for slopes.
  - Pass `avoid={[]}` when there is no house.
- `<House time?='day'|'night'|'sunrise' lightsOn? bedroomLight? porchLight? doorbellGlow? doorbellColor? doorOpen? mailboxFlag? yard? lawn? lights?/>`
  - 8 × 7 m footprint, ridge at 8.4 m, porch floor at 0.5 m.
- **`HOUSE_SPOTS`** (house-local):
  - Porch: `frontDoor` [−1.6, 0.5, 3.75], `doorHinge`, `porch` [−1.6, 0.5, 4.7], `porchSeat` [−1.6, 0.5, 5.62], `porchSeatPancake` [−0.75, 0.5, 5.25], `stepsBottom` [−1.6, 0, 6.75].
  - Doorbell: `doorbell`, `doorbellCam` [−0.72, 1.6, 3.6] (fisheye looking +Z).
  - Lights and windows: `porchLight`, **`bedroomWindow` [−1.6, 4.6, 3.5]** (upper front-left), `bedroomSill`, `porchRoof` [−1.6, 3.17, 4.05], `livingWindow`, `upstairsWindow`, `atticWindow`.
  - Yard: `mailbox`, `mailboxBase`, `gate` [−1.6, 0, 10], `driveway` [6.1, 0, 7.5] (car faces −Z: `rotation={[0, Math.PI, 0]}`).
  - Roof: `chimneyTop`, `ridge`.
  - `size = {width 8, depth 7, height 8.4, floor 0.5, eave 6}`.
- Vegetation and clouds:
  - `<Tree kind?='round'|'pine' height? seed? time?/>` and `<Bush seed? size? color? flowers?/>`.
  - `Cloud`, `Clouds`, `CloudRing`, `makeCloudGeometry`, `cloudMat`.
- Street:
  - `<StreetLamp on? color? height? arm? cone? pool? light?/>` with `STREETLAMP = {height 7.5, arm 2.3, lens [0, 7.2, 2.3]}`.
  - `<Street length?=60 wet? lamps? spacing? lampOn? lampLights? offset? verge? houses? houseLights?/>`: runs along Z. `offset` scrolls it for endless walks.
  - Related: `STREET` (sidewalk at x = 4.7, y = 0.15), `streetLampPositions()`, `BackdropHouse`.
- Gas station:
  - `<GasStation lightsOn? neon? nozzleAt?(pump-A local) nozzleRot? screenText? lights? store? sign?/>`.
  - `GAS_SPOTS = {canopyHeight 5.4, pumpA, pumpB, pumpNozzle, carBay {position [5.15, 0, 0.4], rotationY π}, pumpStand [4.15, 0, 0.9], storeDoor, priceSign}`.
  - `toPumpLocal(p)` converts station coordinates to pump-A coordinates.
  - Pumps: `GasPump`, `PumpNozzle` (grip origin, spout +Z), `GAS_PUMP`.
- Helpers (from `exterior/common`): `Glow` (sprite), `canvasTex`, `glowTex`, `sparkleTex`, `Ink`, `hullOf`, `boxGeo`, `lightConeMat`, `hash1`, `fbm2`, …
- Previews:
  - Day wallpaper: `play-Exterior/f00000.jpg`
  - House: `f00060`
  - Sunrise: `f00120`
  - Dusk: `f00150`
  - Night house: `f00180`
  - Doorbell cam: `f00240`
  - Wet street: `f00300`
  - Gas station: `f00360`, `f00450`
  - With the cast and car: `play-Showcase/f00095.jpg`, `f00130.jpg`, `f00160.jpg`, `f00340.jpg`

---------------------------------------------------------------------------------------------------------------------------

## 6. Y2K text, materials, FX — `lib/three` (barrel), `lib/three/ChromeText`, `lib/three/materials`, `lib/three/fx`

### 6.1 `<ChromeText>`
```ts
<ChromeText text font?='ArialBlack'|'Impact'|'TrebuchetBoldItalic'|'VerdanaBold'|'GeorgiaBold' size?=1 /*CAP HEIGHT m*/
  depth?=0.32*size bevel?=true bevelSegments?=3 curveSegments?=7 material?='chrome'|'gold'|'blue'|'ruby'|'sunset'|'candy'|'aqua'|'iridescent'|Material
  sideMaterial? color? align?='center' anchor?='baseline'|'center'|'top' letterSpacing?=0.02 lineHeight?=1.05
  perLetter?={(i, n, {char, line}) => ({position?, rotation?, scale?, visible?})} outline?={true | {thickness, color, glow}}
  shine?={0..1 sweep} shineAmount?=1.3 brightness?=1 opacity?=1 rim? iriPhase? castShadow? {...group}/>
```
- `measureChromeText(text, opts) → {width, height, capHeight, frontZ, em, letters[{char, i, line, x, y, center}]}`.
- `CHROME_FONTS` lists the available fonts. Missing glyphs (emoji, ∞) render as `?`.
- The Y2K looks ignore scene lights by design. Dim them with `brightness`.
- Previews: `play-Y2KFX/f00062.jpg` (title), `play-Y2KFX/f00140.jpg` (all looks), `play-Y2KFXText/sheet.jpg`, `play-Showcase/f00235.jpg`.

### 6.2 Materials (`lib/three/materials`)
- Y2K shader materials (cached):
  - `y2kMat(preset='chrome', opts)`, `chromeMat(opts)`, `goldMat(opts)`, `gelButtonMat(color, opts)`, `iridescentMat(opts)`.
  - All are lighting-independent ShaderMaterials and support instancing.
- Other cached materials:
  - `candyPlastic(color, {opacity, transmission, roughness})`: physical, reacts to lights.
  - `glowMat(color, intensity=2)`: unlit HDR that blooms.
  - `lowPolyMat(color, opts)`: flat-shaded.
  - `metalMat(color, roughness)`: PBR, uses the Stage env.
  - `hullMat(thickness, color, glow, opacity)`: outline or neon aura.
- For per-instance animation use `createY2KMat(preset, opts)` + `setY2KUniforms(mat, {...})` in `useLayoutEffect`. Never mutate the cached instances.
- Constants and utilities: `CANDY` (iMac colours), `Y2K_PRESETS`, `matcapTexture`, `faceGradientTexture`, `resolveY2KMaterial`, `isMetalPreset`.

### 6.3 FX (`lib/three/fx`)
All FX are deterministic and take `time` or `progress`. Most are additive HDR (they bloom) and ignore fog.

| component | key props | notes |
|---|---|---|
| `Sparkle` / `SparkleField` | `count=40 seed time area=[6,3,2] positions? size=0.22 colors intensity=2.5 twinkle speed spin` | 4-point glints, 1 draw call |
| `LensFlare` | `intensity scale color streakColor rotation ghosts streak` | source = group origin, drawn on top, **no occlusion** (fade it yourself) |
| `LightRays` | `length=6 radius=2.2 count=14 color intensity time speed falloff haze` | god-ray cone, apex at the origin pointing −Y |
| `Sunburst` | `radius=6 rays=16 colorA colorB center rotation2d opacity glow softness additive twist` | flat XY backdrop facing +Z |
| `Starfield` | `count=1500 time speed area shell? size streak intensity twinkle` | flies along +Z (camera near +Z looking −Z) |
| `WireGrid` / `WireTunnel` | `size cell line color glow offset fill fillOpacity fadeNear fadeFar horizon major` | neon grid floor at y = 0 / tunnel along Z; `offset` scrolls toward +Z |
| `SpeedLines` | `intensity time count inner center color opacity blend speed flicker` | full-screen pass; ignores position |
| `Confetti` | `progress (burst) or time (fall) mode count duration power spread gravity area colors stars starMaterial` | burst from the origin |
| `Rain` | `time count=1800 area=[14,9,14] speed wind length width color intensity splashes` | base-centre origin |
| `SkyDome` (fx) | `preset 'y2k'|'day'|'night'|'sunset'|'sunrise'|'hold'|'void' stops radius glow brightness stripes` | gradient backdrop sphere (≠ Exterior SkyDome) |
| `Glow` (fx) | `size color intensity depthTest squash` | soft halo billboard |
| `Swoosh` | `radius [rx,ry] arc [a,b] width progress colorA colorB intensity tilt` | logo swoosh that draws on with `progress` |

Previews: `play-Y2KFX/sheet.jpg` (`f00235` rain + grid, `f00300` confetti, `f00372` god-rays).

---------------------------------------------------------------------------------------------------------------------------

## 7. Y2K UI kit — `lib/ui`

**2D components** go inside an `<AbsoluteFill>` above or below the `<Stage>`. Coordinates are in px at 1920×1080, and every component accepts `PlaceProps {x, y, scale, rotate, opacity, origin, anchor, zIndex, style}`.
- Windows and dialogs:
  - `<Win title width height icon? active? theme? controls?>body</Win>`
  - `<Dialog {...DialogSpec} x y scale stamp? stampProgress? sheen?/>`
  - `DialogSpec = {kind?: 'error'|'warning'|'info'|'question'|'lock'|'coin'|'plus'|'none', title, heading?, message?, buttons?, defaultButton?, pressed?, hover?, disabledButtons?, aquaButton?, aquaColor?, progress?, progressLabel?, width?=440, theme?, active?}`
  - `dialogSize(spec)` and `dialogButtonCenter(spec, i)` return px relative to the dialog's top-left (aim cursors here).
- Controls:
  - `<AquaButton label pressed? glow? color?/>`, `<PushButton label isDefault? pressed? disabled? hot?/>`
  - `<ProgressBar value label? segments? color?/>`, `<Icon kind size spin?/>`
- Cursors: `<Cursor kind='arrow'|'hand'|'hourglass' x y click?(0..1) size?/>` (positioned by its hotspot). `clickAt(frame, clickFrame, dur=12)`.
- Banners and web-1999 widgets:
  - `<BannerAd variant='click'|'buy'|'free'|'visitor'|'upgrade' frame/>`
  - `<Starburst text x y/>`, `<Marquee text frame/>`, `<HitCounter value/>`
- Stamps: `<Stamp text='CANCELLED' progress x y/>`. `stampSlam(p) → {scale, alpha, lift, impact}` (contact at p ≈ 0.38).
- Storms and backdrops:
  - `<PopupStorm frame seed count=24 area start interval accelerate popDur scale stamps?/>`. `stormSchedule(i, …)` gives each pop-up's start frame.
  - `<Desktop variant='blue'|'night'|'pink' taskbar? clock?/>`
- Messages: `POPUP_MESSAGES` (24 on-theme specs) and `pickMessage(seed, kinds?)`.

**3D components** go inside `<Stage>`. Units are metres, centred, facing +Z.
- Panels:
  - `<Popup3D spec width=1.6 thickness? gloss sheen opacity brightness saturation=1.25 pr=2>children</Popup3D>`
  - `popupSize(spec, w)`, `popupPoint(spec, px, py, w)`, `popupButton3D(spec, i, w) → [x,y,z]` (on the front face)
  - `<Window3D spec={WindowSpec}/>`, `<Banner3D variant frame width=2.4/>`, `<Stamp3D progress width/>` (place it just in front of `frontZ`)
- Tunnel: `<PopupTunnel3D frame count length radius speed(m/frame) near width/>`. Pop-ups travel toward +Z. Put the camera on the axis at about `near + 1.5`, looking −Z.
- Cursors: `<Cursor3D kind size click look='gloss'|'toon'/>` (hotspot at the origin) and `<Hourglass3D rot sand/>`.
- Generic panels: `<UIPanel3D texture/>`, `<UIPlane3D texture/>`.
- Textures (cached): `makeDialogTexture`, `makeBannerTexture`, `makeStampTexture`, `makeWindowTexture`, `makeDrawingTexture`.
- Low level: the display-list core (`dl.ts`, `<DLSvg>`) and builders (`dialogDL`, `windowDL`, …), so 2D and 3D draw identically. Theme constants: `WIN`, `DLG`, `TITLE_THEMES`, `UIC`, `UIF`, `AQUA_COLORS`.

Previews:
- 2D: `play-UI/f00060.jpg` (dialogs), `f00140`, `f00224` (storm + stamps), `play-UI/sheet.jpg`
- 3D: `play-UI3D/f00025.jpg` (tunnel), `f00166` (stamp + cursor), `f00232` (hourglass + banners), `play-Showcase/f00235.jpg`

---------------------------------------------------------------------------------------------------------------------------

## 8. Overlays — `src/overlays`

- **`GlobalOverlays`** (already mounted by `Layout`): `<CutFlash/>` with `<Captions/>` on top. **Scenes do nothing for captions or cuts.**
- `Captions` (`{time?, fontSize=64, bottom=70, pill=true, themeOverride?, style?}`):
  - **`CAPTION_ZONE = 230`** px is reserved at the bottom.
  - Also exported: `CAPTION_TRACK` (per-line on-screen windows), `captionLinesAt(t)`, `layoutCaptionLine`, `CAPTION_THEMES`, `CAPTION_FONT`.
- `CutFlash`:
  - `<CutFlash frame? cuts?/>` is the global one.
  - For an internal hit inside your scene: `<CutEffect style='flash'|'glitch'|'vhs' k={f - hitFrame} strength? tint? streak? seed={>=100}/>`.
  - `CUT_PLAN` and `CUT_WINDOW` (flash [−1, 6], glitch [−2, 4], vhs [−3, 5]).
- `CamcorderHUD` (**not global**: render it in your scene when you need it):
  - Props: `{frame, mode='rec'|'play'|'pause', date='NOV 09 2002', time='AM 3:15', showBrackets, opacity, battery 0..3, timecodeOffset, label, captionSafe=true}`.
  - Also exported: `formatTimecode(frames)` and `HUD_SAFE {x: 116, y: 74}`.
- Previews: `play-Overlays/sheet.jpg` (captions in 0–11, HUD in 12–15, transitions in 16–25).

---------------------------------------------------------------------------------------------------------------------------

## 9. Scale reference (verified side by side: `play-Showcase/f00255.jpg`)

| object | size (m) |
|---|---|
| Guy | 1.79 tall |
| Doors (bedroom and house) | ~2.04 |
| Pancake | 0.55 shoulder, 0.75 head top, 0.81 long |
| Feeder | 0.45 × 0.35 × 0.35 |
| Bed | mattress top 0.52, 1.5 × 2.04 |
| CRT | 0.66 × 0.61 × 0.52 |
| FoodBag | 0.30 × 0.47 |
| DogBowl | Ø 0.25 |
| Hammer | 0.353 |
| Flip phone | 0.088 closed |
| Car | 3.95 × 1.72 × 1.5 |
| House | 8 × 7 m, ridge 8.4 |

---------------------------------------------------------------------------------------------------------------------------

## 10. Recipes

### 10.1 Guy holding / swinging grandpa's hammer at the feeder
```tsx
const p = ramp(f, 0, 24, (x) => x);                       // 0 wind-up .. 0.5 impact (frame 12) .. 1 follow-through
<group position={[0.4, 0, 0]} rotation={[0, -0.5, 0]}>
  <Guy pose={guyHammerSwing(p)} rightHand={<HeldHammer glow={0.4} />} />
  {/* put the feeder so its lid is under the impact point */}
  <group position={[GUY.hammerImpact[0], 0, GUY.hammerImpact[2]]}>
    <Feeder smashed={ramp(f, 12, 24)} lid={1.5 * ramp(f, 12, 16)} lidFly={ramp(f, 14, 50)} lcdText="ERR" kibbleFill={0.3} />
    <KibbleBurst progress={ramp(f, 12, 100, (x) => x)} origin={FEEDER.hopperCenter} count={220} spread={0.9} />
  </group>
</group>
// exact striking-face point: new THREE.Vector3(...HELD.hammerFace).applyMatrix4(guyJointMatrix(pose, 'gripR', {R: true}))
// hammer on the wall before he takes it:  <HungHammer position={BEDROOM_SPOTS.hammerHook} glow={g} />  + <Bedroom hammerGlow={g}>
```
Side or 3/4 cameras read the wind-up best, because at p = 0 the hammer is behind his head from the front. Rendered in `play-Recipes/f00012.jpg` (impact) and `f00045.jpg` (aftermath).

### 10.2 Pancake eating from the bowl (Final hero shot)
```tsx
<group position={spot} rotation={[0, yaw, 0]}>       {/* the bowl lives in Pancake's own group */}
  <Pancake pose={pancakeEat(t)} />
  <DogBowl position={PANCAKE.bowl} fill={1 - ramp(f, 0, 300)} />
</group>
// camera: position = spot + [0.55, 0.45, 1.45], target = spot + [0, 0.25, 0.3], fov 40  (play-Showcase/f00375.jpg, play-Recipes/f00090.jpg)
```

### 10.3 Pancake begging beside the locked feeder (V1Feeder heart shot)
```tsx
<Bedroom time="night" frame={f}>
  <Feeder position={BEDROOM_SPOTS.feeder} rotation={[0, 0.35, 0]} lcdText="BREAKFAST IS FOR PLUS MEMBERS ONLY" lockShake={beat.pulse} />
  <Pancake position={[0.30, 0, -0.28]} rotation={[0, 0.2, 0]} pose={{...pancakeBeg(t), tear: ramp(f, a, a + 70, (x) => x)}} />
  <pointLight position={[camX, 1.2, camZ]} color="#ffe2c4" intensity={2} distance={3} decay={1.4} />   {/* §10.7 */}
</Bedroom>
// face close-up: const n = pancakeAnchor(pancakeBeg(t), 'nose') → add the dog's transform → CameraRig target
```

### 10.4 3:15 AM wake-up: smart bed sits him up
```tsx
const p = ramp(f, 0, 150, (x) => x);
const up = Math.max(0, Math.min(1, (p - 0.15) / 0.35)); const tilt = up * up * (3 - 2 * up);   // same curve as guySleepyWake
<Bedroom time="night" frame={f} bed={{tilt}} pillow={{talk: f > 160 ? 0.9 : 0}}>
  <Guy position={BEDROOM_SPOTS.guyLieInBed} pose={guySleepyWake(p)} shadow={false} />
</Bedroom>
```
His hips stay just in front of the bed hinge while the head section rises behind him (`play-Showcase` frames 275 and 300).

### 10.5 Sitting anywhere
- On the bed edge: `<Guy position={S.guySitOnBed} rotation={[0, S.guySitOnBedRotY, 0]} pose={mergePose(pose, guySitOn(0.52))}/>` (`f00410`).
- On the porch steps (Outro): `<Guy position={[seat[0], seat[1] - GUY.seatHeight, seat[2]]} pose={{...guyIdle(t), sit: 1}}/>` with `seat = HOUSE_SPOTS.porchSeat`. His feet rest on the steps (`f00340`).
- Driver seat: `<Guy position={[s[0], s[1] - GUY.sitHipHeight, s[2]]} pose={{...guyShiver(t), sit: 1}}/>` with `s = CAR.driverSeat`, inside the Car's group.

### 10.6 On the phone / holding up the book
```tsx
<Guy pose={mergePose(guyPhoneToEar(t), {expression: 'angry', mouthOpen: talk})}
     rightHand={<HeldPhone open={1} screenLines={['INKSURE+', 'ON HOLD']} ringing={0} />} />
<Guy pose={guyHoldUp(ramp(f, 0, 12), t)} rightHand={<HeldBook />} />     // Final: "a paper 1984 they can't take down"
```

### 10.7 Making characters read in the dark rooms
The night bedroom (moonlight, hemisphere 0.62) desaturates the tangerine hoodie and Pancake's gold to brown-grey. Add a warm,
distance-limited **character key** near the camera side. It does not repaint the room:
`<pointLight position={[0.6, 1.7, 1.5]} color="#ffe2c4" intensity={2.2} distance={3.2} decay={1.4} />` (compare
`play-Showcase/f00005.jpg` without it and `f00020.jpg` with it). Keep the number of lights constant across a scene to avoid shader recompiles.
For wide shots pass `outlineScale={1.5}` to the Guy and Pancake.

### 10.8 Pop-up storm in 3D (Chorus)
```tsx
<Stage background={C.y2kBlue} env="chrome" fog={{color: C.y2kBlue, near: 10, far: 46}}>
  <CameraRig position={[0, 0, 4]} target={[0, 0, -10]} fov={60} />
  <hemisphereLight args={['#dff2ff', '#20307a', 1.1]} />
  <PopupTunnel3D frame={f} count={56} radius={3.6} near={2} speed={0.3} width={2.2} length={44} position={[0, 0, -2]}
                 pulse={beatAt(useSongTime()).pulse} />
  <Popup3D spec={POPUP_MESSAGES[2]} width={2.2} pr={3} sheen={lerp(-0.2, 1.2, ramp(f, 30, 48, (x) => x))}>
    <Stamp3D progress={ramp(f, 60, 74, (x) => x)} width={1.5} position={[0, 0, 0.06]} />
    <Cursor3D kind="hand" size={0.5} position={(([x, y, z]) => [x, y, z + 0.1])(popupButton3D(POPUP_MESSAGES[2], 1, 2.2))} click={clickAt(f, 44)} />
  </Popup3D>
</Stage>
// 2D version over/under the 3D layer: <PopupStorm frame={f} seed="chorus" count={30} start={90} interval={4} scale={1.3} stamps={{start: 200, interval: 3}} />
```
Rendered in `play-Recipes/f00150.jpg` (click) and `f00175.jpg` (stamp). Pop-up faces look pale on very bright backdrops (sunburst centres). Use darker or fogged backgrounds, or raise `saturation` and `brightness`.

### 10.9 Karaoke-safe framing
- Keep faces, hero props and in-world text **above y ≈ 850 px** (the bottom 230 px is `CAPTION_ZONE`; the captions, including a two-row line and its pill, stay inside it).
  A practical rule: aim `CameraRig.target` ~10–15 % of the frame height *below* the subject's centre, so the subject sits in the upper two-thirds.
- `CamcorderHUD` lifts its date stamp above the zone by default (`captionSafe`). Pass `captionSafe={false}` only in instrumental parts (Intro, Outro).
- Always check with overlays on: `node scripts/still.mjs scene <Id> --frames=…` (overlays are on unless `--no-overlays`).

### 10.10 Chrome hero word synced to a lyric word
```tsx
const af = useAbsoluteFrame();                          // song frame (lyrics are song time)
const tBuy = wordTime(12, 'buy') * 30;                  // [12] "Buy now" ≈ 58.94 s
const tFor = wordTime(12, 'for') * 30;                  // "for now" ≈ 60.70 s
const flip = ramp(af, tFor - 4, tFor + 4);              // flip BUY NOW -> FOR NOW on the sung word
<group rotation={[flip * Math.PI, 0, 0]} position={[0, 1.6, 0]}>
  <ChromeText text="BUY NOW" visible={flip < 0.5} size={0.7} anchor="center" shine={ramp(af, tBuy, tBuy + 20)}
    perLetter={(i) => { const k = popIn(af, tBuy - 3 + i * 1.5, 10); return {scale: k, position: [0, (1 - k) * 2, 0]}; }} />
  <group rotation={[Math.PI, 0, 0]} visible={flip >= 0.5}><ChromeText text="FOR NOW" size={0.7} anchor="center" material="gold" /></group>
</group>
<SparkleField count={24} area={[5, 1.5, 0.5]} time={af / 30} position={[0, 1.6, 0.3]} />
```
Both words share one spot, so swap `visible` at the half-flip (edge-on): without that, the back word shows through the gaps of the front one. Start pops 2–4 frames **before** the word time, because the eye reads an anticipation pop as on the beat. Downbeats come from `beatAt(t).downPulse`. Rendered in `play-Recipes/f00192.jpg` (letters popping on the sung "Buy") and `f00240.jpg` → `f00246.jpg` (flip on "for").

### 10.11 Diving into the CRT (Intro → bedroom)
`const d = crtFillCamera(fov)` gives the distance from the glass where the picture fills the frame. Animate the camera along `BEDROOM_SPOTS.tvNormal`
from `tvScreen + tvNormal * 1.5` to `tvScreen + tvNormal * d`, then cut to whatever the screen showed.

### 10.12 Doorbell-cam POV (V2Rain)
`<House time="night" doorbellColor={C.alertRed} doorbellGlow={pulse} />` with
`<CameraRig position={HOUSE_SPOTS.doorbellCam} target={[-0.7, 1.3, 12]} fov={100} />`, plus `<Rain time={t} />` and a 2D `<Dialog kind="error" …>` overlay.

---------------------------------------------------------------------------------------------------------------------------

## 11. Playgrounds (`node scripts/still.mjs play <Name> --frames=…`)

| playground | shows |
|---|---|
| **Showcase** | integration of everything at true scale (segments listed at the top of the file) |
| **Recipes** | the §10 recipes 10.1, 10.2, 10.8 and 10.10, rendered as written |
| Held | hand/hook adapters |
| Guy, Pancake | the characters |
| Bedroom, CRTTV | room + TV |
| Exterior, Car | exterior sets |
| Props, PropsFeeder, PropsLock | props |
| Y2KFX, Y2KFXText | chrome text + FX |
| UI, UI3D | UI kit |
| Overlays | captions, HUD, cuts |
| ToonTest | shading test |

**Showcase frames:**

| frames | segment |
|---|---|
| 5 / 20 | bedroom wide, without and with the character light |
| 45 | Pancake begging beside the feeder |
| 65 | hammer on its hook |
| 85 | Guy with the hammer |
| 95 / 130 / 160 | house, car, porch |
| 200 / 235 | title + pop-ups |
| 255 | scale line-up |
| 275 / 300 | wake-up |
| 340 / 375 | porch at sunrise, eating from the bowl |
| 395 / 410 | bed edge, on the phone |
| 425 / 440 | in the car |

---------------------------------------------------------------------------------------------------------------------------

## 12. Name collisions (alias on import)

| name | module A | module B |
|---|---|---|
| `SkyDome`, `SKY_PRESETS` | `lib/three/fx` (gradient backdrop, presets `y2k/day/night/sunset/sunrise/hold/void`) | `lib/sets/Exterior` (sky at infinity with sun, moon, clouds, stars; presets `day/sunrise/dusk/night`, includes light-rig data) |
| `Glow` | `lib/three/fx` (`size, color, intensity, squash`) | `lib/sets/Exterior` (`size number\|[w,h], kind 'glow'\|'sparkle'`) |
| `chromeMat` | `lib/three` (Y2K shader, light-independent, `opts`) | `lib/props` (`MeshStandard` env chrome, `(color, roughness)`). `sets/bedroom/ink` has a third version. |
| `glowMat` | `lib/three` (`(color, intensity, opts)` HDR basic) | `sets/exterior/common` |
| `Padlock` | `lib/props` (full: open, shake, broken) | `lib/sets/Bedroom` (the printer's lock, `open` only) |
| `Ink`, `hullOf` | `lib/props` | `sets/exterior/common` |
| `mixPose` | `lib/characters/Guy` (`(a, b, t)` GuyPose) | `lib/characters/Pancake` (`(a, b, k)` PancakePose) |
| `clamp01` | `lib/time` | `lib/props` (identical) |
| `hullMat` | `lib/three/materials` | `sets/bedroom/ink` |

---------------------------------------------------------------------------------------------------------------------------

## 13. Known caveats

### Walking and poses
- **Walk cycles don't move the root.**
  - Guy: advance him at `GUY.strideLength × cadence` (~1.07 m/s).
  - Pancake: use `pancakeWalk(t, speed)` and move him `speed·t` along his own +Z.
  - Turning while walking makes the feet slide slightly.
- **Bed mode:** the Guy's head sinks partly into the pillow and his hair spikes poke into it. Frame for the face, or tilt the bed slightly.
- `guyClimb` assumes a ~1.0 m sill. Mid-climb his legs can clip the wall.
- `HeldBook` at `guyHoldUp(0)` lies across the chest with the cover up. It reads from a higher camera; the trophy pose (p = 1) faces the camera.

### Props
- **Feeder:** `smashed` does not open the lid or spawn kibble by itself. Drive `lid`/`lidFly` and add a `<KibbleBurst>` in the same group.
- **Feeder outlines** (0.005 m) are thinner than the characters' (0.009–0.011). That is fine at normal distances, but in very wide shots the box reads lighter.

### Lighting and materials
- **Car:** the clear-coat paint blows out under `env="studio"`. Use `sky`, `sunset` or `night`. At dusk the roof edge catches a bright env glint, which is intended.
- **Y2K shader materials** (ChromeText, `y2kMat`, …) ignore lights. Dim them with `brightness` in dark scenes.
- `chromeMat` from `lib/props` and `candyMat` need a Stage `env`. They go dark with `env="none"`.
- **Bloom:** big white surfaces (the bed, siding, shoes) are tuned to sit just under the threshold. Key lights above about 3 make them glow.
- **Light budget at night:**
  - House: up to 3 point lights. Each StreetLamp: 1. GasStation: 3–4. Car: 1 spotlight. Bedroom: 2 cop point lights (always present).
  - Pass `lights={false}` or `lampLights={false}` when stacking many.
  - Keep the light count constant within a shot.

### FX and UI
- **LensFlare** (fx) has no occlusion. **SunFlare** (Exterior) only tests opaque, non-instanced meshes.
- **Popup3D** panels look pale on very bright backgrounds. Use `saturation`/`brightness`, or darker or fogged backdrops.
- **Overlays:** the glitch/VHS cuts and the caption pill use CSS `backdrop-filter`. They are verified in the preview renderer, so re-check them if the final render uses a different GL or browser setup.

### Other
- **Bedroom defaults:** the TV is off, the pillow rides the tilting head section (`hide={['pillow']}` to use your own), and cameras outside the room need `hideWalls` + `hide={['outside']}`.
- **Console:** the only console line in previews is three/r3f's `THREE.Clock: This module has been deprecated` warning. It is harmless and not from our code.
- **Preview folders:** `still.mjs` wipes `.preview/out/<key>/` on every run, so re-render a playground to regenerate the images listed here.
