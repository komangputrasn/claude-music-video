# Buy Now, For Now — 3D music video (Remotion 4 + three.js)

- Design bible (story, look, beat sheet, technical rules): `DESIGN.md`
- Shared component library API (cast, sets, props, FX, UI, overlays): `src/lib/INDEX.md`
- Edit list (scene frame ranges, 30 fps, 6600 frames): `src/timeline.ts`; each scene lives in `src/scenes/<Id>/` with a `NOTES.md` shot list.
- Lyric word timings: `src/data/lyrics.json`; per-frame audio features + beats: `src/data/audio.json`.

## Commands
- `npm run studio` — Remotion Studio
- `npm run render` — full render to `out/buy-now-for-now.mp4` (uses `--gl=angle`)
- `node scripts/still.mjs scene <SceneId> [--frames=..|--times=..|--n=9] [--no-overlays]` — render stills + contact sheet of one scene to `.preview/out/`
- `node scripts/still.mjs play <Name>` — render a playground (`src/playground/<Name>.tsx`)
- `npx tsc --noEmit -p .` — typecheck

## Gotchas (verified)
- `@react-three/postprocessing` renders black under Remotion's frame loop — use `<Stage>` (`src/lib/three/Stage.tsx`), which uses three's own EffectComposer + bloom.
- drei `<Outlines>` does not render — use `InkMesh` / `outlineMat()` (`src/lib/characters/`).
- Animate only from `useCurrentFrame()` / `useSongTime()`; per-frame mutation in `useLayoutEffect` only (no `useFrame`, `useEffect`, `Math.random`, `Date`).
- Fonts: the project uses locally installed macOS system fonts by CSS name (Tahoma, Verdana, Trebuchet MS, Arial Black, Impact, Comic Sans MS, Papyrus, Courier New, Georgia). Do not download fonts. On machines without these fonts, text falls back to other fonts. 3D extruded text uses `src/assets/fonts/*.typeface.json` (converted from the local fonts by `scripts/make-typeface.mjs`).
