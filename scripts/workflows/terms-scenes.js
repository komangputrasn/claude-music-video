export const meta = {
  name: 'terms-scenes',
  description: 'Build and independently review/fix the 12 scenes of the TERMS silhouette cut',
  phases: [
    { title: 'Build', detail: 'one agent per scene in src/silhouette/scenes/<Id>' },
    { title: 'Review', detail: 'independent reviewer per scene renders, checks the brief, fixes' },
  ],
}

// ---------------------------------------------------------------------------------------------------------------------
// TERMS (dystopian silhouette cut) — scene-building workflow for Claude Code's Workflow tool.
// Builds the 12 scenes in src/silhouette/scenes/<Id>/ (one agent per scene), then an independent reviewer per scene
// renders it, checks it against DESIGN-silhouette.md (lyrics inside the world, colour timeline, framing, continuity)
// and fixes it. Agents never commit; commit their work yourself afterwards.
//
// Run it from Claude Code in this repo, e.g. ask: "run the workflow at scripts/workflows/terms-scenes.js"
// (Workflow tool with scriptPath). To build only some scenes, edit the SCENES array below (order = priority).
// Requires: npm ci; the preview script `node scripts/still.mjs sil <SceneId>` working on your machine (with a GPU it
// uses ANGLE and Remotion's own headless Chromium; ffmpeg on PATH for contact sheets).
// Prerequisites already in the repo: the foundation (src/silhouette/lib), the verified modules (atmos, tenure, sets,
// props) and <WorldLyric>. Each scene's slot in src/silhouette/scenes/ is a placeholder until its agent replaces it.
// ---------------------------------------------------------------------------------------------------------------------

const COMMON = `You are building ONE scene of "TERMS", the dystopian silhouette cut of the music video "Buy Now, For Now", in the Remotion 4 + three.js repo in your current working directory.

READ FIRST (in this order):
1. DESIGN-silhouette.md — the brief (concept, silhouette rule, palette, light, framing, captions, scene treatments, done-means).
2. src/silhouette/INDEX.md — API contract + the rules every piece must obey (§1), core components (§2: SilStage, Silhouette, SilGuy/SilPancake, Iris, Crowd, WorldLyric), the module table and the module verifiers' HARD-WON STAGING LESSONS (§3 — read them, they will save you render passes), incl. <WorldLyric> (the lyrics live inside the world; see its verified look test .preview/out/silplay-Lyrics/).
3. The module references: src/silhouette/lib/atmos/INDEX.md, src/silhouette/lib/tenure/INDEX.md, src/silhouette/lib/sets/INDEX.md, src/silhouette/lib/props/INDEX.md. Look at their verified preview frames (paths listed in each INDEX) with the Read tool so you know what each piece looks like.
4. Timing: DESIGN.md §6 "Key word times" (song seconds of every sung word; use wordTime(line, word) from src/lib/lyrics in code) and the edit list in src/timeline.ts. Pose helpers: src/lib/INDEX.md §3 (Guy + Pancake rigs; SilGuy/SilPancake take the same poses) and its §10 recipes / §13 caveats.
5. A working example: src/silhouette/playground/Core.tsx and CrowdTest.tsx.
FRESH CHECKOUT NOTE: .preview/ is gitignored, so the 'verified preview frames' the INDEX files cite may not exist on this machine yet. If you want to see one, render that playground first (node scripts/still.mjs silplay <Name> --frames=<the frames cited>) — Core, CrowdTest, Lyrics, Atmos, Tenure, Sets, SilProps.
The Y2K cut (src/scenes, DESIGN.md look) is a DIFFERENT film: reuse only engine pieces (rigs, poses, time, lyrics, CameraRig); never its look or staging.

YOUR SCENE: {ID} — absolute frames {FROM}–{TO} (song {T0}–{T1} s, 30 fps; scene-local frame = absolute − {FROM}; use useSongTime() for lyric sync).
Files: write ONLY inside src/silhouette/scenes/{ID}/ — index.tsx must keep the named export \`export const {ID}: React.FC\`; split into more files in that folder as you like; local variants of shared pieces go in that folder too. Also write src/silhouette/scenes/{ID}/NOTES.md: the shot list (shot, scene-local frames, song seconds, lyric/beat it syncs to, camera, what reads in silhouette). Do NOT edit any other file (not the shared lib, not other scenes, not overlays/timeline/Root/Layout). Do NOT git commit. The letterbox is a global overlay — never draw it. There is NO caption overlay: YOU stage the lyrics.

CONTINUITY ACROSS THE FILM (other agents build the other scenes in parallel; obey this so the cut is coherent):
- The Guy: SilGuy, hood UP in every scene through Hold; the hood comes DOWN in Final (~167.5–170 s, around "good for now"); down in Outro. Same rig/proportions everywhere; he is small in frame most of the time (monumental scale).
- Pancake: SilPancake. Tail STILL (tailWagAmount 0) until the hammer impact at 129.20 s; wagging after it (Swing eating, Final, Outro). Ears low / earPerk negative in V1Feeder and V2Rain. Profile or three-quarter view.
- Colour timeline: authRed = TENURE/control everywhere until Final. dawnGold is FORBIDDEN before 129.20 s except a faint warm edge on the hammer handle in V2Rain. Swing (impact) = the first gold ever. Cancel/Hold: gold at most as the faint hammer-handle edge in his hand; Hold is otherwise red + one light. Final: red screens fail city-wide at 166.39 s and gold sunrise floods in; red only dying/falling after that. Outro: gold dawn; one last red iris flicker on the doorframe closes for good. Greys everywhere else. No other hues.
- Locations: the cell bedroom (CellRoom: V1Bedroom, V1Feeder, V2Rain end, Swing), the city/plaza (Pre, Chorus1, Final), the house as a black cube (HouseCube: Chorus1, V2Rain, Final, Outro), the elevated highway + fuel pillar (V2Car), legal architecture (Cancel), black ocean void + the pillow iris (Hold). Night until Final (dawn).
- Props: the feeder is the Monolith; grandpa's hammer hangs on the cell wall (V2Rain), in his right hand from Swing on; flip phone in his left hand in Swing; the paper 1984 in Final; the plain bowl in Final/Outro.
- Brightness: the chorus entrances (57.75 s, 166.39 s) are the only whole-frame brightness changes; the near-silence 162–166.39 s is visually near-silent.

LOOK / CRAFT RULES (DESIGN-silhouette §2, INDEX §1): pure black silhouettes always against something bright (lit fog, screens, shafts, wet reflective ground); thin directional rim only (always pass rim.dir); long lenses fov 18–35 (CameraRig), monumental scale, strict symmetry / one-point perspective, slow deliberate dolly/crane; few cuts (verses 4–8 s shots, chorus cuts on downbeats only — downbeats are in src/data/audio.json via DOWNBEATS from src/lib/time); NO fisheye, whip-pans, strobe, flashes, split screens; rhythm from LIGHT (pulse screens/beams/fog with bassAt(absFrame)/beatAt(t)); compose inside the visible 2.39:1 band (y 138–942 px of 1080); no faces ever; text monumental (Futura/mono via SFONTS, bone or authRed). Every lyric line in your scene must have a CLEAR silhouette image that tells the story with the sound off.
LYRICS INSIDE THE WORLD (the user's direction — this is a signature of the cut): every line your scene owns (sceneLyricLines({T0}, {T1}) from src/silhouette/lib/WorldLyric) must be visible IN THE WORLD while it is sung, using <WorldLyric> (words appear exactly as sung; red control words, gold free words in Final). Design where each line lives so it belongs to the shot and the story: projected into fog behind a silhouette, glowing on a TENURE screen or facade, stencilled on concrete, printed on the halted printer page, on the e-reader then drifting away as ash, carved into the Iliad wall, streaming along the highway's light lines, black letters standing against the dawn. Vary the placement shot to shot; let the camera move past/through text; sometimes the words ARE the architecture (monumental) — but every word must be legible inside the 2.39:1 picture (cap height >= ~26 px of the 1080 frame; size with metresForPx) for the time it's sung, and never look like a subtitle (no flat lower-third text, no HTML text over the picture). Use mode 'light' / 'screen' / 'paint' / 'dark' to match the surface; perWord for word animation. Lines that start in the last ~0.1 s of the previous scene belong to you (sceneLyricLines includes them). Make it beautiful: this should look like a high-end art-house music video (think strong graphic compositions, deep fog, hard backlight), not a tech demo.
TECH RULES: everything inside <SilStage>; deterministic (useCurrentFrame/useSongTime only; no useFrame, no useEffect animation, no Math.random/Date; rand()/noise1() from src/lib/time); per-frame mutation only in useLayoutEffect; memoize geometry/materials/textures; instance repeats; keep frame cost sane (aim < ~15 s/frame in the software-GL preview; the final render runs on a GPU). Typecheck: npx tsc --noEmit -p . 2>&1 | grep "silhouette/scenes/{ID}" must be clean. Fix browser console errors from your code.

PREVIEW LOOP (you can SEE frames — iterate until it looks great):
- node scripts/still.mjs sil {ID} --n=9                     (9 evenly spaced frames + sheet)
- node scripts/still.mjs sil {ID} --times=13.6,14.2,19.8    (song seconds: check lyric beats)
- add --no-overlays to see the raw picture; default includes the letterbox (check nothing important — incl. lyric words — hides under the bars).
- Output: .preview/out/sil-{ID}[-raw]/f<absFrame>.jpg and sheet.jpg — open with the Read tool. Render speed depends on the machine (seconds per frame with a GPU, 5–20 s with software GL); another agent may render in parallel (the script queues). Budget ~12 render passes; render only what you need.
- If a shared lib component is broken or missing something, make a local variant in your folder and report it (don't edit the lib).

YOUR SCENE'S TREATMENT (expand on it — it's a starting point, but keep every story beat and timing):
`

const SCENES = [
  { id: 'Chorus1', from: 1732, to: 2777, t0: 57.75, t1: 92.56, spec: `Chorus 1 — "The machine at full power." 35 s, the biggest scene. Monumental symmetrical frames; CUT ON DOWNBEATS ONLY (downbeats in this range: 57.19, 59.37, 61.56, 63.74, 65.90, 68.08, 70.24, 72.42, 74.61, 76.79, 78.95, 81.13, 83.31, 85.47, 87.63, 89.81, 92.00 — pick a subset; shots of 2–4 bars). 57.75 s is the chorus slam: the frame's brightness changes all at once (the Pre scene ends in a red whiteout; open on a hard, high-contrast monumental image).
Lines and images:
[12] "You said 'Buy now,' but you meant 'for now,'" (said 58.58, Buy 58.94, now 59.20, meant 60.28, for 60.70, now 61.10): "BUY NOW" in 30-storey red letters (GiantLetters) over the plaza, tiny figures below; on "for now" the letters' lease timers count down.
[13] "you put my whole house on a plan somehow." (whole house 63.06, plan 64.66, somehow 65.10): the house as a black cube inside a red laser cage with a floating price (HouseCube laserCage + FloatingPrice/TenureScreen e.g. "WHOLE HOUSE PLAN · $9.99 / MO").
[14] "I'm done with 'upgrade to continue,'" (done 66.90, upgrade 67.48, continue 68.72): "upgrade to continue" = gates that close in sequence down a corridor (Corridor), he stands small at the near end.
[15] "click to cancel, I'm cancelling you." (click 69.48, cancel 71.14, cancelling 72.40, you 73.92): a CANCEL button on a screen that RECEDES as he approaches (he walks toward it; it slides away; the corridor/plaza stretches).
[16] "You said 'Buy now,' but you meant 'for now,'" (Buy 76.34, now 76.60, for 78.14, now 78.50): crowds of identical silhouettes (Crowd) stand still under the screens while he walks AGAINST them (give him a lane + a backlight/rim so he separates).
[17] "and my dog's breakfast is locked in a box on the ground." (dog's breakfast 79.62, locked 80.72, box 81.84, ground 82.88): Pancake sits by the red-lit box (Monolith) in the rain — small, alone, wet ground reflecting the red iris.
[18] "I'm done with 'upgrade to continue,'" (done 84.28, upgrade 84.86, continue 86.16): gates/corridor or giant screens flashing UPGRADE TO CONTINUE in sequence (light rhythm, not cuts).
[19] "click to cancel, I'm cancelling you." (click 87.30, cancel 88.52, cancelling 89.96, you 91.44): the receding cancel button again, wider: he is tiny, the button is a red dot at the end of an endless axis; end on the 92.00 downbeat feel (the scene cuts at 92.56 into V2Car at night on the highway).
Lyrics: monumental — the words ARE the city (on facades, giant screens, the corridor gates, the cancel screen), BUY/PLAN/UPGRADE/CANCEL in red. Pulse every screen with bass. This scene sets the city's look for Final: make the city monumental (Megablocks/CityGrid, TermsScroll facades, IrisWall, LeaseTags), symmetrical, foggy.` },
  { id: 'Final', from: 4992, to: 6126, t0: 166.39, t1: 204.20, spec: `Final chorus — "Liberation through colour." 38 s. Cuts on downbeats (in range: 167.53, 169.72, 171.92, 174.10, 176.29, 178.47, 180.63, 182.83, 184.99, 187.18, 189.34, 191.50, 193.68, 195.84, 197.97, 200.29, 202.48).
166.39 s: THE hit (the second and last whole-frame brightness change): the red screens fail city-wide (flicker → dark, irises die to black discs) and dawnGold sunrise rises through the fog for the first time. Gold floods from here (low sun through fog, gold haze, long shadows, gold rim on silhouettes) — but still silhouettes; gold replaces red as the light.
[38] "You said 'Buy now,' but I'm good for now," (Buy 167.66, now 167.94, good 169.10, for now 169.42): the hood comes DOWN (SilGuy hood 1→0 over ~0.6 s around 168–169.5) revealing the spiky-hair silhouette, against the rising sun.
[39] "I got a paper 1984 they can't take down." (paper 171.22, 1984 171.90, can't take down 173.42): he holds up the paper 1984 (HeldPaperBook, guyHoldUp) — opened, the BRIGHTEST WHITE page in the film.
[40] "I'm done with 'upgrade to continue,'" (done 175.60, upgrade 176.24, continue 177.52): the giant red letters (GiantLetters "BUY NOW" / "UPGRADE TO CONTINUE") flicker and FALL one by one.
[41] "click to cancel, I cancelled you." (click 178.24, cancel 179.88, cancelled 181.26, you 182.72): the crowds of silhouettes look UP (Crowd lookUp wave) as the last red dies; gold rim light on them.
[42] "You said 'Buy now,' but I'm good for now," (Buy 185.12, now 185.40, good 186.52, for now 186.86): he and the dog walk/stand in the gold, maybe at the house cube.
[43] "and Pancake eats breakfast from a bowl on the ground." (Pancake 188.10, eats 188.84, breakfast 189.22, bowl 190.56, ground 191.64): THE HERO SHOT — Pancake eats from the plain bowl on the ground in a pool of gold light (PlainBowl goldPool, pancakeEat), tail wagging, profile, low long-lens, maybe the Guy's legs at the edge; hold it.
[44] "I'm done with 'upgrade to continue,'" (done 193.06, upgrade 193.58, continue 194.88) and [45] "click to cancel, I cancelled you." (click 195.66, cancel 197.26, cancelled ~198–200, you held to ~204): final crane UP: a black city with ONE warm window (CityGrid/Megablock warmWindow), gold dawn haze; rising, slow, to the end of the scene (cut to Outro at 204.20). Lyrics: the red letters of the old system falling while the new lines appear in bone/dark against the gold; GOOD/PAPER/BOWL/GROUND in dawnGold; [43] near the bowl at ground level in the hero shot.` },
  { id: 'V1Bedroom', from: 371, to: 900, t0: 12.38, t1: 30.0, spec: `Verse 1a — 3:15 AM in the cell. 17.6 s, 3–4 shots (4–6 s each, cut on beats).
A cell-like bedroom seen THROUGH VERTICAL BLINDS (CellRoom + BlindsLight), red scanner light sliding across the wall (ScannerSweep/ScanLine), city screen glow outside the window.
[0] "The bed sat me up at a quarter past three," (bed 13.26, sat 13.60, up 14.20, quarter 15.32, three 16.56): symmetrical wide through the blinds; he lies in bed (SilGuy bed mode, guySleepyWake), and on "sat me up" (13.60–14.20) the bed LIFTS him upright like a mechanism (CellRoom bedTilt in sync). "Quarter past three": a small red readout "03:15" (TENURE device on the wall/nightstand) — optional but nice.
[1] "and a voice in the pillow said, 'Sleep has a fee.'" (voice 17.74, pillow 18.56, Sleep 19.82, fee 20.82): closer profile at the bed; the red iris OPENS inside the pillow behind him (PillowIris); on "Sleep has a fee" the words "SLEEP · METERED" (and/or "$4.99 / NIGHT") appear in red light projected on the wall/fog.
[2] "There's ink in the printer, but it won't print a line," (ink 22.30, printer 22.90, won't 24.06, print 24.56, line 25.30): the printer is a black slab with a red slit; a pale page feeds and HALTS halfway out on "won't print"; his silhouette in profile reaching for it.
[3] "'cause HP shuts it off when my card gets declined." (HP 26.08, shuts 26.50, off 27.48, card 28.48, declined 29.34): "PAYMENT DECLINED" stencilled in red light ACROSS his silhouette and the wall (projected text light falling over him) on "declined"; on "shuts it off" the printer's slit light dies.
Lyrics: e.g. [0] projected through the blinds onto the wall, [1] glowing in the haze above the pillow iris, [2] printed on the halted page / the printer slab, [3] the stencilled light falling across him. Opening: the scene starts at 12.38 s right after the Intro's title card (cut). Mood: cold, quiet, oppressive; rhythm from the scanner sweeping on the beat.` },
  { id: 'V2Rain', from: 3299, to: 3850, t0: 109.97, t1: 128.34, spec: `Verse 2b — walk home in the rain. 18.4 s, 4 shots.
Hard rain (SilRain) in sodium-free darkness lit by SCREENS only; wet reflective ground (WetGround) mirroring red.
[24] "I walked home in the rain, and the doorbell said, 'Who?'" (walked home 110.90, rain 112.02, doorbell 112.60, Who 113.44): a small figure walking home through rain under giant screens; then the house (HouseCube) door: a red IRIS that won't open: "IDENTITY NOT ON PLAN" (TenureScreen/Stencil/FloatingPrice) on "Who?".
[25] "so I climbed through my window, and the cops came too." (climbed 115.24, window 115.82, cops 116.86, too 118.10): he climbs through the window (guyClimb) as a silhouette against the screen glow outside; on "cops" searchlights from drones (red LightShaft cones) sweep the room through the window.
[26] "Pancake was waiting with his nose on the box," (Pancake 119.20, waiting 120.10, nose 121.22, box 121.96): Pancake waits with his nose on the Monolith (MONOLITH.noseTouch), ears low, tail still, in the cell; the red iris above him.
[27] "and my grandpa's old hammer doesn't care about locks." (grandpa's 124.18, old hammer 125.10, care 126.56, locks 127.48): grandpa's hammer hangs on the cell wall (HungSilHammer) — the only object with a FAINT warm edge (warmth ~0.2–0.3: the ONLY gold before Swing); slow push-in on it, symmetrical, the rest of the frame grey/red. Lyrics: on the rain-streaked screens, the door iris, the fog lit by drone cones, faint on the cell wall beside the hammer. End at 128.34 into Swing.` },
  { id: 'V2Car', from: 2777, to: 3299, t0: 92.56, t1: 109.97, spec: `Verse 2a — the car. 17.4 s, 4 shots. Night.
Build the car LOCALLY in your folder: a black capsule (smooth pod, no brand cues) on an ELEVATED HIGHWAY of red light lines (lane lines as glowing red lines receding in perfect one-point perspective, fog).
[20] "The car seats went cold, 'cause the heat is a tier," (car seats 94.10, cold 94.84, heat 95.90, tier 97.32): inside/side view in silhouette: him seated in the capsule; the seat glows frost-white ("THERMAL TIER" stencil/readout in red) — cold light from below.
[21] "and the speed is a tier, so I crawled in first gear." (speed 98.06, tier 99.26, crawled 100.22, first gear 101.14): a speed governor holds the needle back (a dial with a red limiter "SPEED · TIER 1"); he crawls while other capsules stream past as light streaks.
[22] "I stopped to get gas, and the car drove away," (stopped 102.44, gas 103.54, car 104.62, drove away 105.10): the gas station = a fuelling pillar under floodlights (hard white top light, fog); he steps out, and the EMPTY capsule drives itself away into the fog (on "drove away").
[23] "Ford filed a patent for that, by the way." (Ford 107.04, patent 108.24, by the way 109.46): a patent drawing projects across the fog wall: bone-white line drawing of the capsule with numbered callouts and the title "METHOD FOR REPOSSESSION IN MOTION" (patent-figure style, mono type), the tiny figure standing in front of it. Lyrics: along the highway's light lines / on passing signage / in the patent drawing's own callout type. Cut to V2Rain at 109.97.` },
  { id: 'Cancel', from: 4126, to: 4678, t0: 137.53, t1: 155.95, spec: `Bridge — legal architecture. 18.4 s, 3–4 shots. (After Swing: he carries the hammer in his right hand — gold at most a faint edge on its handle; otherwise grey + red.)
[32] "They passed 'Click to Cancel,' and a court said no," (passed 138.96, Click to Cancel 139.48, court 141.74, said no 142.02): "Click to Cancel" is a red button on a plinth in a vast hall; a court is a ring of tall black lecterns (faceless judges = more lecterns/silhouettes); a single GAVEL STRIKE blacks out the hall on "said no" (one hard cut to black / lights die — not a white flash).
[33] "so it's page after page with nowhere to go." (page after page 143.64, nowhere 145.62, go 146.86): he climbs an endless staircase of PAPER in a canyon of bureaucracy, where every landing is the same page (repeat the same page text on each landing; endless, vertical, one-point perspective).
[34] "Amazon named its cancel page 'Iliad,'" (Amazon 147.34, named 148.34, cancel page 149.34, Iliad 151.22) and [35] "the most honest name that a cancel page had." (most honest 151.96, name 153.34, cancel page 154.74, had 155.80): a colossal red-lit wall of carved Greek text (unreadable at scale — use Greek glyphs from system fonts in canvas textures, deeply 'carved' via shading/normal tricks or layered planes), with the tiny figure at its foot; slow crane up the wall. Lyrics: engraved on the plinth, on the paper landings (every landing the same page — the line itself), carved into the Iliad wall in Latin letters among the Greek. Cut to Hold at 155.95.` },
  { id: 'Swing', from: 3850, to: 4126, t0: 128.34, t1: 137.53, spec: `Bridge — "One swing." 9.2 s. THE turning point: the first gold in the film.
[28] "One swing, and the lid flew off," (One swing 128.26/129.20, lid 129.86, flew off 130.06): time slows; ONE overhead (top-down or high) shot of the swing in silhouette (SilGuy + HeldSilHammer driven by monolithSwing(p) from lib/props, the Guy at the documented swing spot, so the hammer face lands exactly on MONOLITH.impactPoint — see src/silhouette/lib/props/INDEX.md). IMPACT EXACTLY at 129.20 s (abs frame 3876): the red iris SHATTERS and dawnGold light SPILLS out of the broken box for the first time (Monolith shatter/spill), kibble falling like gold sparks (kibble). The gold must feel like a door opening in the film.
[29] "Pancake ate till he'd had enough." (Pancake 130.82, ate 131.46, enough 132.40): Pancake eats from the gold-lit spill/pile; his tail WAGS (first time in the film).
[30] "I picked up the phone with the hammer in my hand," (picked up 133.02, phone 133.62, hammer 134.18, hand 134.72): he stands with the phone in one hand (left, HeldSilPhone) and the hammer in the other (right), BACKLIT BY GOLD (gold rim).
[31] "I'm cancelling every last thing on a plan." (cancelling 135.28, every last thing 135.82, plan 136.86): a wall of red lease tags behind him goes dark one by one (LeaseTags offFrom/offTo), leaving him in gold. Lyrics: the first lyrics lit by gold after the impact (before it: red/bone); e.g. the cancel list on his phone screen and the dying lease-tag wall. Cut to Cancel at 137.53.` },
  { id: 'V1Feeder', from: 900, to: 1424, t0: 30.0, t1: 47.46, spec: `Verse 1b — the vanished book and the locked feeder. 17.5 s, 3–4 shots, ending in the loneliest frame of the film.
[4] "My Kindle's got Orwell, at least for today," (Kindle's 30.90, Orwell 31.74, today 33.66): the e-reader is a pale rectangle in his hands (SilEReader / HeldSilEReader) — the brightest thing, lighting from below; "1984 · GEORGE ORWELL" on it.
[5] "Amazon took it back once, and they can take it away." (Amazon 34.20, took 34.98, back 35.92, take 37.42, away 38.14): its words drift off as ASH and are pulled up into a ceiling vent with a red light (progress synced to "took it back"); on "take it away" the screen is empty.
[6] "The feeder said, 'Breakfast is Plus members only,'" (feeder 39.54, Breakfast 40.46, Plus 41.38, members 41.84, only 42.62): the feeder Monolith's iris turns red / opens; "PLUS ONLY" appears (stencil/readout/projection) on "Plus members only".
[7] "and Pancake looked up at me, hungry and lonely." (Pancake 44.00, looked up 44.58, hungry 45.86, lonely 47.12): Pancake is a small silhouette in front of the huge box, ears lowered, LOOKING UP (pancakeBeg-like, headPitch up, earPerk −1, tail still). From ~43.5 s to the end (47.46): a LONG, HELD, WIDE shot with NO camera move — the loneliest frame in the film (tiny dog, huge red-eyed monolith, the Guy a tall silhouette at the frame edge he looks up to, deep negative space, backlit haze). Lyrics: [4]/[5] on the e-reader screen itself, then drifting up as ash with the words of the book; [6] on the monolith/projected red; [7] small, quiet, in the haze above the dog — this is the loneliest frame, keep the text restrained.` },
  { id: 'Pre', from: 1424, to: 1732, t0: 47.46, t1: 57.75, spec: `Pre-chorus — leaving for one bag of food. 10.3 s, 2–3 shots, building to the chorus.
[8] "Hold on, buddy, I'll be right back," (Hold on 47.82, buddy 48.98, right back 49.70): he kneels; two silhouettes touch (hand on Pancake's head — guyPatDog with a kneel, or a custom kneeling pose); profile, backlit; tender.
[9] "one bag of food, and that's that." (one bag 50.34, food 51.36, that's that 51.98): he walks out the door into the city: a single figure crossing an enormous red-lit plaza where EVERY object is tagged (LeaseTags on bollards, benches, lamps, the ground).
[10] "How hard can it be to buy one thing" (How hard 52.42, buy 53.68, one thing 53.94) and [11] "in a world where you can't own anything?" (world 54.92, can't 55.46, own 55.80, anything 56.02): the crane RISES until he disappears among millions of lease tags glowing on the buildings (CityGrid + LeaseTags + TermsScroll); the light builds into a RED WHITEOUT by 57.75 (the chorus slam). Do the whiteout as a frame-filling red fade (screen-space, e.g. an HTML AbsoluteFill authRed with rising opacity over the Stage, or red fog) — NOT by over-driving HDR (that turns orange). Keep the red pure authRed. Lyrics: [8] soft light in the haze above the two silhouettes, [9] on the plaza ground / a tag, [10]-[11] dissolving into the sea of lease tags as the crane rises.` },
  { id: 'Intro', from: 0, to: 371, t0: 0, t1: 12.37, spec: `Intro (instrumental, 12.4 s). Beat from 1.3 s; downbeats 2.42, 4.64, 6.85, 9.03, 11.26.
0–~1.3 s: black. On the first beat a single red IRIS opens in the dark (Iris open 0→1), extreme close.
Then a slow pull-back (~2.4–7 s) reveals it as ONE OF THOUSANDS of irises on a city wall at night in the fog (IrisWall + Megablocks + FogLayers); irises breathe with the bass.
~7–9 s: the terms of service scroll up a skyscraper like credits (TermsScroll on a tower facade), camera craning, tiny silhouettes at the foot for scale.
~9–12.37 s: the title "BUY NOW, FOR NOW" appears LETTER BY LETTER in Futura (bone or black) on a RED SCREEN (full-red TenureScreen slab, symmetrical, monumental); on the downbeat at 11.26 s the "BUY" dims and leaves "FOR NOW" alone; hold to the cut at 12.38 (V1Bedroom). The title letters must be legible inside the letterbox. Cold, silent, monumental.` },
  { id: 'Hold', from: 4678, to: 4992, t0: 155.95, t1: 166.39, spec: `Bridge — hold music, then the voice. 10.4 s. The quietest scene.
[36] "Then the hold music stopped, and the voice came through," (hold music 156.88, stopped 157.80, voice 159.00, came through 159.40): hold music as VISIBLE SOUND: thin red waveforms ripple through fog over a black ocean (a dark reflective sea plane, gentle swell); he floats, small (phone to ear? optional). On "stopped" (157.80) EVERY light cuts out except one: the pillow's iris (PillowIris), red, alone in the black.
[37] "the one from my pillow, and it said, 'Is that you?'" (one from my pillow 161.12–162.24, Is that you 164.18): in the near-silence (~162–166.39) the iris opens FULLY and asks "Is that you?" on screen in a single line of bone text (Futura, small, centred, not huge) appearing on 164.18. NOTHING moves except his breath (a tiny chest rise on a still silhouette, or the iris breathing). One light source. Lyrics: [36] riding the red waveforms / reflected on the black ocean; [37] the ONLY line of text in the dark — bone, small, centred: "IS THAT YOU?" is the pillow's voice. Then the scene ends at 166.39 where Final slams the city's red off and the gold on.` },
  { id: 'Outro', from: 6126, to: 6600, t0: 204.20, t1: 220.0, spec: `Outro (instrumental, 15.8 s; loud until ~218 s, then fades).
A STATIC, symmetrical wide of the house (HouseCube) at dawn: gold sky, black shapes of the man (hood down) and the dog on the front step, and the bowl beside them; Pancake's tail wags slowly. Holds as the music plays out (subtle life only: fog drift, dog tail, a breath; maybe the sun's gold slowly rising).
The last image (~213–217 s): the TENURE iris on the doorframe opens ONE LAST TIME, flickers, and closes for good. Fade to black by 220 s (fully black from ~219.5).` },
]

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    scene: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    shots: { type: 'array', items: { type: 'object', properties: { frames: { type: 'string' }, description: { type: 'string' } }, required: ['frames', 'description'] } },
    previews: { type: 'array', items: { type: 'string' } },
    secondsPerFrame: { type: 'number' },
    libWorkarounds: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
  },
  required: ['scene', 'files', 'shots', 'previews', 'secondsPerFrame', 'libWorkarounds', 'concerns'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    scene: { type: 'string' },
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['high', 'medium', 'low'] },
      description: { type: 'string' },
      fixed: { type: 'boolean' },
    }, required: ['severity', 'description', 'fixed'] } },
    lyricCoverage: { type: 'array', items: { type: 'object', properties: { line: { type: 'string' }, image: { type: 'string' }, reads: { type: 'boolean' } }, required: ['line', 'image', 'reads'] } },
    previews: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['scene', 'issues', 'lyricCoverage', 'previews', 'notes'],
}

const fill = (s, sc) => s.split('{ID}').join(sc.id).split('{FROM}').join(String(sc.from)).split('{TO}').join(String(sc.to))
  .split('{T0}').join(String(sc.t0)).split('{T1}').join(String(sc.t1))

const results = await pipeline(
  SCENES,
  (sc) => agent(fill(COMMON, sc) + sc.spec + `\n\nFinal answer: the structured summary (files, shot list, preview paths, measured seconds per frame from the still.mjs output, any lib workarounds, open concerns).`,
    { label: `build:${sc.id}`, phase: 'Build', schema: BUILD_SCHEMA }),
  (built, sc) => agent(fill(`You are an independent reviewer + fixer for the scene {ID} of "TERMS", the dystopian silhouette cut of the music video in the repo in your current working directory. Another agent built it; you did not. Find what is actually wrong against the brief and FIX it.

Read: DESIGN-silhouette.md (esp. §2 rules, §4 the {ID} row, §6 done-means), src/silhouette/INDEX.md (§1 rules) and the module INDEX files under src/silhouette/lib/*/INDEX.md as needed, DESIGN.md §6 key word times, and every file in src/silhouette/scenes/{ID}/ (incl. NOTES.md).
Builder's summary (claims to verify, not facts): ` + JSON.stringify(built) + `

The scene was specified as (check every beat is delivered at the right time):
` + sc.spec + `

Continuity the whole film relies on: hood up until Final (~168–170 s), down after; Pancake's tail still until 129.20 s, wagging after; dawnGold forbidden before 129.20 s except a faint hammer-handle edge in V2Rain; red = TENURE until Final's city-wide failure at 166.39 s; night until Final; no other hues.

Render it yourself and LOOK (Read tool): node scripts/still.mjs sil {ID} --n=9, plus --times=<key word seconds> for EVERY lyric line's key moment, plus --no-overlays where needed. ({T0}–{T1} s; another render may run in parallel.)
Check, with evidence from frames:
1. Every lyric line has a clear silhouette image; the story reads with the sound off; timings match the words (fill lyricCoverage).
1b. LYRICS INSIDE THE WORLD: every line in sceneLyricLines({T0}, {T1}) is staged in-world with <WorldLyric> (no caption/HTML text overlay), every word appears when sung and stays legible (cap height >= ~26 px, not clipped by the bars, not lost in bloom/fog, readable contrast) while it is sung, red control words / gold final words correct, and the placement feels part of the shot.
2. Pure silhouettes, no faces, against bright backgrounds (no characters lost in black on black); rim thin and directional; not washed grey by bloom.
3. Colour timeline obeyed (see continuity) — no stray hues, red not orange.
4. Framing: 2.39:1 band, symmetry/long lens, slow moves, cut count/positions (verses 4–8 s shots, chorus on downbeats), nothing important under the bars; no fisheye/whip/strobe/flash.
5. Craft: does each shot look like a high-end art-house music video? Fix weak compositions, clutter, flat lighting, scale problems (characters floating, clipping, sliding feet), popping, discontinuities at shot boundaries.
6. Code: deterministic (no Math.random/Date/useFrame/useEffect-animation), memoized resources, no edits outside src/silhouette/scenes/{ID}/ (git status), typecheck clean (npx tsc --noEmit -p . 2>&1 | grep "silhouette/scenes/{ID}"), no browser console errors from the scene, frame time sane.
Fix every real problem directly in src/silhouette/scenes/{ID}/ only (update NOTES.md if shots change), re-render to confirm. Don't rebuild what works; ~10 render passes max. Do NOT git commit. Final answer: the structured summary.`, sc),
    { label: `review:${sc.id}`, phase: 'Review', schema: REVIEW_SCHEMA }).then((r) => ({ built, review: r })),
)
return results
