# atmos: atmosphere and light (TERMS silhouette cut)

These pieces make the silhouettes read (DESIGN-silhouette §2.3): backlit haze, layered fog, volumetric shafts, red
scanner light, slatted blinds light, rain, wet mirror ground, dust and ash, and pools of light. Read
`src/silhouette/INDEX.md` §1 (rules) first. Every component is a pure function of its props. Pass song time in
seconds as `time` (from `useSongTime()`). Everything goes inside `<SilStage>`.

## Import (from a scene file `src/silhouette/scenes/<Id>/index.tsx`)
```ts
import {
  Backlight, FogLayers, LightShaft, ScannerSweep, ScanLine, BlindsLight, BlindShafts, SilRain, WetGround, Motes, LightPool,
} from '../../lib/atmos';
// advanced: atmosNoise(seed) tileable noise texture, GLSL_ATMOS_FOG, GLSL_BILLBOARD (custom shaders)
```
Units are metres, +Y is up, and cards and decals face +Z. Each component's origin is listed below. Every component
also takes ordinary `<group>` props (position, rotation, scale), except where a prop such as `from`/`to` or `origin`
is in parent space. The full docs are in each file's header comment.

## Components

### `<Backlight>`: the bright haze card silhouettes stand against
`<Backlight color?={S.bone} intensity?={1} size?={[30,16]} position?={[0,4,-30]} shape?={'radial'|'slab'|'vertical'}
softness?={0.7} noise?={0.15} time? core?={0} opacity?={1}/>`
- **Origin:** the centre of the card. It faces +Z, is additive, ignores fog, and does not write depth.
- **Shapes:** `radial` is a soft elliptical glow. `slab` is a soft-edged rectangle, such as a horizon band or a screen
  seen through haze. `vertical` is a soft column, such as a doorway or a gap between buildings.
- **Intensity:** the default of 1 keeps a bone card's peak at linear luminance 0.79, just under the bloom threshold
  (0.86). Bone stays under bloom up to about 1.08.
- **`core`:** adds a small hot line or spot that does bloom. Use it sparingly, for example 0.3–0.5 for a door crack.
- **`noise`:** a slow haze breakup that drifts with `time`.

### `<FogLayers>`: stacked, noise-textured haze planes receding in depth
`<FogLayers count?={8} near?={4} far?={40} width?={80} height?={14} color?={S.fog} density?={0.16} time? drift?={[0.25,0.03]}
pulse?={0} blending?={'normal'|'additive'} scale?={9} ground?={0.8} fadeNear?={2} seed?={1}/>`
- **Layout:** card i sits at local z from −`near` to −`far`, with its base at y = 0.
- **Heroes stay black only in front of the haze.** Every card between the camera and a silhouette veils it grey
  (`normal` as well as `additive`). Start the first card just **behind** the hero: put the group just behind the hero
  with `near` ≈ 0.5, or at the camera with `near` ≈ the camera-to-hero distance + 0.5–1 m. Only far or crowd figures
  should stand inside the haze. (The first playground render put cards in front of the heroes and measured them at
  RGB 26–54 instead of void; the fixed shots measure 0–7.)
- **Edges:** every edge is soft: a ragged top, soft sides, and a fade-in from the floor over `ground` m, so there is
  never a line where a card meets the floor. Cards closer than about `fadeNear` to the camera fade out. Far cards are
  denser and take on the scene fog colour.
- **`normal` blending** veils what is behind it, so far silhouettes turn grey and the frame gains depth.
  **`additive`** glows.
- **`pulse`** (0..1) drives beat breathing, for example `beatAt(t).pulse * 0.5`. `drift` is in m/s, and each card
  drifts at its own speed.

### `<LightShaft>`: a true volumetric cone (searchlights, red drone cones, window shafts, the Hold light)
`<LightShaft from to radiusStart?={0.15} radiusEnd?={1.6} color?={S.bone} intensity?={1} time? dust?={0} falloff?={1}
softness?={1.4} striation?={0.5} source?={0} ground?={0} groundFade?={0.35} dustSize?={0.018} dustSpeed?={0.05} seed?={1}/>`
- **Coordinates:** `from` (the lamp) and `to` (the end of the beam) are in the parent's space. Animate `to` to sweep
  the beam.
- **Volume:** each pixel is ray-marched (an analytic ray/frustum intersection plus 14 jittered samples), so the shaft
  reads correctly from any angle, including looking straight down the beam or with the camera inside it. The output
  saturates at about 1.3 × color × intensity.
- **Red beams:** because the core is about 1.3 × intensity, keep authRed shafts at `intensity` ≤ about 1.1 and
  `source` ≤ about 1.2, and keep the haze **behind** them dim (Backlight ≤ about 0.25). At intensity 1.5 over a 0.4
  backlight the playground's drone cones read salmon (saturation 0.3–0.5), not authRed. Dust in a red or gold beam keeps
  the beam's hue; only grey/bone beams get whiter sparkles.
- **Back faces:** the volume is drawn from its back faces, so **a silhouette inside the beam is a clean pure-black
  cut-out**.
- **`source`:** a glow sprite at the lamp that blooms, so it reads as the light itself.
- **`dust`:** the number of motes lit inside the cone, drawn in one draw call.
- **`ground` / `groundFade`:** the beam dissolves into the floor. The hull (16 rings along the axis) is also flattened
  onto y = `ground`. Pass the real floor height, or `-1e4` when there is no floor. End a beam that hits the floor on
  the floor (`to[1]` = ground).
- Also exported: `makeShaftVolumeMaterial()`, `getShaftHull()`, `GLSL_SHAFT_VOLUME`. `LightPool` uses these for its
  haze.

### `<ScannerSweep>`: the red TENURE scanning fan (authRed only)
`<ScannerSweep origin?={[0,6,0]} angle?={0} span?={0.5} length?={8} color?={S.authRed} intensity?={1.4} fill?={0.7}
edge?={1} lead?={0} falloff?={0.7} time? ground?={0} groundFade?={0.3}/>`
- **Geometry:** `origin` is the scanner head. The fan hangs toward −Y in the local XY plane, and `angle` rotates it
  about Z (positive is toward +X). Rotate the group to mount it differently.
- **Laser edges:** each edge is a hot line about 1.5 px wide at any distance. `fill` is the soft sheet between the
  edges.
- **`lead`:** a value of ±1 makes only the leading edge hot and fades the fill into a trail behind it. Set
  `lead={Math.sign(dAngle/dt)}`.
- **Floor:** the sheet dissolves into the floor over `groundFade`.

### `<ScanLine>`: a hot red line sliding across a wall or plane
`<ScanLine width?={4} height?={3} progress?={0.5} axis?={'x'|'y'} color?={S.authRed} intensity?={1.6} thickness?={0.015}
glow?={0.25} trail?={0.6} direction?={1}/>`
- **Origin:** the centre of the decal, facing +Z. Place it 1–2 cm in front of the surface.
- **`axis`:** `x` draws a vertical line that moves horizontally. `y` draws a horizontal line that moves vertically.
- **`progress`:** a value from 0 to 1. The trail fades behind the direction of motion.

### `<BlindsLight>` / `<BlindShafts>`: slatted light from vertical blinds (V1Bedroom's key light) with a red scan
`<BlindsLight width?={3.2} height?={2.4} slats?={9} gap?={0.42} angle?={0.12} softness?={0.14} offset?={0} edge?={0.18}
color?={S.bone} intensity?={0.95} scan?={null} scanColor?={S.authRed} scanWidth?={0.14} scanIntensity?={1.6} time? seed?/>
`<BlindShafts … direction?={[0.25,-0.3,1]} length?={5} intensity?={0.5} ground?={0} groundFade?={0.06}/>``
- **`<BlindsLight>`:** a decal of the pattern on a wall, with its origin at the centre and facing +Z.
  - On the floor, use `rotation={[-Math.PI/2, 0, -Math.PI/2]}` for bars that run along X, or `rotation-x={-Math.PI/2}`
    for bars that run along Z.
  - `gap` is the lit fraction of each period. `angle` sets the lean of the bars. `offset` slides the bars in periods.
  - `scan` (0..1, or null) moves a red band across **through the slats**. Inside the band the white is replaced by red
    with a narrow switch, never a pink crossfade. A faint red spill lights the slat shadows.

`<BlindShafts>` is the same pattern as a ray-marched volume in the air, drawn in one draw call.
- **Window and direction:** the window is the local XY plane centred on the origin. The light travels along
  `direction`, whose z must be > 0. The volume runs for `length` m along local +Z.
- **Reading:** looking toward the window, the beams read as converging stripes. Seen side-on, they read as a glowing
  striped slab.
- **Colour and brightness:** each ray shows the light that dominates it, red or white, so they never mix into pink
  (side-on, where every ray crosses a little red, the slab stays white). The optical depth saturates at
  color × intensity.
- **Floor:** `ground`/`groundFade` stop the light on the floor, and the hull is flattened onto it, the same as
  LightShaft. Without this, beams sloping into the floor were cut by a hard dark wedge.
- **Looking into the window:** whatever is outside (a Backlight) shows through the gaps and adds to the red shafts in
  front of it, so white plus red reads pink. Keep the outside dim (≤ about 0.4), because the shafts already glow.
- **Matching a decal to the shafts:** use the same slats, gap, offset and scan. Light paints the window's pattern
  **mirrored**:
  - On a wall the light hits, add `scale-x={-1}` to the BlindsLight and keep the same `angle`. Otherwise the red band
    slides one way in the air and the other way on the wall.
  - On the floor, turn the decal so its local +X runs along the window's local +X. For a window in a left wall
    (`rotation-y={Math.PI/2}`), that is `rotation={[-Math.PI/2, 0, Math.PI/2]}`. Give the window `angle={0}` and the
    floor decal `angle={Math.atan(direction[0]/direction[2])}`, which is the light's sideways drift. Position the decal
    where the beams land. Playground shot 13 does this, and its red floor stripe continues the red beam.

### `<SilRain>`: hard rain tuned for silhouettes
`<SilRain time area?={[16,10,16]} count?={2600} speed?={11} wind?={[-1.2,0]} length?={0.7} width?={0.006} color?={GREYS.g7}
intensity?={0.55} blending?={'mix'|'additive'} splashes?={count/16} splashSize?={0.09} splashColor?={GREYS.g8} seed?={1}/>`
- **Origin:** the base centre of the rain box. Drops fall from y = `area[1]` to y = 0.
- **Draw calls:** one draw call for the streaks and one for the splashes. All motion is computed in the shader from
  `time` and wraps seamlessly.
- **`mix` (default):** each streak is a translucent mid-grey line. It reads **bright against dark** and **dark against
  bright backlights**.
- **`additive`:** every streak glows. Use it for rain crossing a beam, and tint it with that light's colour.
- **Fog:** far drops fade into the fog.
- **Splashes:** tiny rings and flecks on y = 0, so put the group on the ground.

### `<WetGround>`: wet, mirror-like concrete (three.js `Reflector`, verified under `<SilStage>`)
`<WetGround size?={[160,160]} color?={GREYS.g2} reflectivity?={0.8} puddles?={0.45} streak?={1} ripple?={0} time? seed?={1}
resolution?={0.5}/>`
- **Origin:** the ground centre on y = 0. It lies flat facing +Y, is opaque, and **is** the floor, so don't add
  another floor.
- **Reflection target:** the reflection renders into a HalfFloat target in linear HDR, so reflected screens and irises
  still bloom.
- **Surface:**
  - Puddles (`puddles` sets the coverage) are near-perfect mirrors.
  - The wet concrete between them reflects weakly and smears reflections into broken vertical streaks (`streak`).
  - Fresnel makes the ground most mirror-like at grazing angles, as with a long lens and a low camera.
  - `ripple` animates rain ripples and needs `time`. Scene fog applies.
- **Cost:** one extra full scene render per frame. Use **one WetGround per shot**.

### `<Motes>`: floating dust and ash
`<Motes count?={600} area?={[10,6,10]} time? color?={S.bone} size?={0.012} drift?={[0.03,0.05,0]} wander?={0.25}
intensity?={1} twinkle?={0.6} blending?={'additive'|'normal'} seed?={1}/>`
- **Origin:** the base centre of the box. Motes wrap seamlessly inside it and fade at its faces.
- **Draw calls:** one draw call for thousands of camera-facing soft dots. They are never thinner than about 1.2 px;
  sub-pixel motes are dimmed instead of aliasing.
- **Blending:**
  - `additive` is for glowing dust in light.
  - `normal` with `GREYS.g3`–`g5` and `size` about 0.03 gives dark ash flakes against bright haze.
- **Fog:** far motes fade into the fog.
- **Self-lit:** motes have no light mask, so additive dust outside the light reads as stars in the black. Fit the box
  to the lit volume. For dust inside a cone, use `<LightShaft dust>`.

### `<LightPool>`: a soft pool of light on the ground with a column of lit haze above it
`<LightPool radius?={2} color?={S.bone} intensity?={1} haze?={0.35} hazeHeight?={radius*1.4} hazeRadius?={radius*0.6}
softness?={0.7} breakup?={0.3} seed?={1}/>`
- **Origin:** the centre of the pool on the floor.
- **Disc:** additive, with noise breakup. It is front-facing only, so it does not reflect upside down in WetGround.
- **Haze:** the LightShaft volume, wide at the floor and fading upward. A silhouette standing in it gets a backlit
  halo and stays black.
- **Colour:** use red under the feeder. **dawnGold is allowed only in Final and Outro**, for Pancake's bowl.

## Verified previews (`node scripts/still.mjs silplay Atmos --frames=…`, playground `src/silhouette/playground/Atmos.tsx`)
`.preview/out/silplay-Atmos/sheet.jpg`, one shot per component, 30 frames each:

| frame file | shot |
|---|---|
| `f00015.jpg` | Backlight `radial`: tiny Guy and Pancake between monolith pillars, layered haze (FogLayers) behind them |
| `f00045.jpg` | Backlight `slab`: a horizon band behind a skyline, low camera, figures seen from behind against the band |
| `f00075.jpg` | Backlight `vertical` + `core`: a doorway of light in a black wall, Guy in the door beside the hot core line |
| `f00105.jpg` | FogLayers: a crowd receding into layered haze (depth fade), the Guy walking toward camera in front of it |
| `f00135.jpg` | LightShaft: the single overhead light with dust, Guy pure black inside it (Hold) |
| `f00165.jpg` | LightShaft red: three drone cones (intensity 1.05) with `source` glows over dim haze, reading authRed |
| `f00195.jpg` | ScannerSweep (lead edge + trail fill, ground fade) + ScanLine crossing a wall |
| `f00225.jpg` | BlindsLight (mirrored) on the wall with the red scan through the slats, BlindShafts side-on, Pancake and Guy against the stripes |
| `f00255.jpg` | SilRain: bright streaks on dark, dark streaks on the backlight, low camera so Guy and Pancake both read |
| `f00285.jpg` | WetGround (Reflector): iris, screens, a red cone and silhouettes mirrored in wet concrete |
| `f00315.jpg` | Motes: dark ash flakes and bright dust drifting through a window shaft |
| `f00345.jpg` | LightPool red under the feeder monolith (with iris), Pancake silhouetted looking up |
| `f00375.jpg` | LightPool dawnGold (**FINAL ONLY**): Pancake eating from his bowl in a gold pool with haze |
| `f00405.jpg` | BlindShafts toward the window: slatted volumetric beams reaching the floor, a matching floor decal (the red band lands on the red stripe), Guy black inside |

## Caveats for scene builders
- **Bloom:** bloom veils black shapes grey. Anything above the bloom threshold right behind a silhouette (a `core`,
  a bright window seen through BlindShafts, a shaft seen down its axis) spreads glow over the figure. Keep big
  surfaces at ≤ 0.85 × bone near heroes, and put the hot part beside the figure, not behind it. Additive cards stack:
  two Backlights behind one another add up and can cross the threshold, even though each one is under it (the first
  door shot did this and measured the Guy at RGB 54).
- **Haze in front of heroes:** FogLayers cards (and any haze) between the camera and a hero turn the hero grey. Start
  the haze behind the hero (see FogLayers).
- **Volumes and occluders:** LightShaft, BlindShafts and LightPool haze draw from their hull's back faces.
  - **Opaque things inside them cut a clean black hole.** That is the silhouette look.
  - **Start volumes in front of walls.** A hull behind an opaque surface drops whole rays. For example, start a door
    shaft just inside the doorway.
  - **Keep big architecture from straddling a volume's back surface.** It cuts a hard edge, so keep pool haze clear
    of monoliths.
- **No depth texture:** there are no soft particles. FogLayers hide the floor seam with their `ground` fade, and
  shafts and fans use `ground`/`groundFade`. If your floor is not at y = 0, pass `ground`.
- **WetGround:**
  - Only things above y = 0 reflect.
  - Use one per shot, because each one adds a full scene render.
  - Floor decals (LightPool disc, BlindsLight, ScanLine) draw on top of it.
  - The reflection target is sized from the canvas at mount.
- **Colour:**
  - Additive red over grey haze desaturates toward salmon. Where red must read pure, keep the haze behind red beams
    dim (backlight ≤ about 0.25).
  - Keep the HDR red value (colour × intensity × the component's own gain) ≤ about 1.5, and never above 2. Above
    about 1.2, red already warms toward vermilion under ACES. Note that LightShaft's core is 1.3 × intensity.
  - Gold goes only on owned/free things, and only from the Swing impact (129.2 s) on. The only exception is the
    hammer-handle foreshadow.
- **Determinism and cost:**
  - All randomness is seeded (`rand()`, or a GLSL hash of instance ids).
  - Canvas and noise textures are cached, and nothing is redrawn per frame.
  - Ray-marched volumes cost fill-rate (14 or 28 samples per covered pixel). That is fine at film sizes, but don't
    stack dozens.
- **Shared engine bits:** `SilRain` and `Motes` reuse the streak and instanced-quad helpers from
  `src/lib/three/fx/shared.ts` (geometry and GLSL only, not the Y2K look).
