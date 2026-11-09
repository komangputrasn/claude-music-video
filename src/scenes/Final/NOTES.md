# Final — shot list & status

Song 166.39–204.20 s, absolute frames 4992–6126 (local 0–1134), lines [38]–[45]. Sunrise liberation mirror of Chorus1.
One `<Stage>` for the whole scene; `index.tsx` picks the shot by local frame (hard cuts on words/beats).
Global CutFlash: warm "flash" IN at local 0, "vhs" OUT at 1134 (Outro).

| id | local frames | lyric | content |
|---|---|---|---|
| A-open | 0–67 | "You said 'Buy now,'" | crane down onto the still-wrapped house at sunrise; chrome BUY NOW pops letter by letter; confetti |
| B-morph | 67–116 | "but I'm good for now," | low orbit under the sign: BUY flips into gold GOOD (split-flap), FOR drops in, NOW turns gold + bounce; fine print |
| C-paper | 116–166 | "I got a paper" | medium: Guy on the hillside (G0) with Pancake, book at chest, starts raising it |
| D-trophy | 166–207 | "1984" | worm's-eye arc on the trophy book overhead: halo rays, glow, lens flare, burst on "1984" |
| E-cantTakeDown | 207–248 | "they can't take down." | a giant Cursor3D hand tries to yank the book away and fails; chrome CAN'T + gold TAKE DOWN; 2D error dialog |
| F-houseFree | 248–297 | "I'm done with" | over his shoulder at the front gate: points on "done" → padlock pops, ribbons unwrap, bow corks off, price tag falls |
| G-stampStorm | 297–355 | "'upgrade to continue,'" | inside the pop-up tunnel; four hero dialogs get CANCELLED-stamped (Stamp3D) on the beats then shatter into shards + confetti |
| H-catch | 355–427 | "click to cancel," | the legged CANCEL button dodges the cursor, bumps into Pancake, the click lands on "cancel" → confetti pop |
| I-pointYou | 427–509 | "I cancelled you." | fisheye push-in, he points at the lens on "you"; 2D CANCELLED stamp on "cancelled" |
| J-bulletTime | 509–558 | "You said" | bullet-time: Guy + Pancake frozen mid-leap in confetti, 200° orbit, letterbox |
| K-sign2 | 558–639 | "'Buy now,' but I'm good for now," | the two on the hilltop under the morphing sign; shrug on "I'm good", fist up on "now" |
| L-bowlDown | 639–671 | "and Pancake" | he crouches and sets the DogBowl down; Pancake runs in |
| M-eat | 671–737 | "eats breakfast from a bowl" | PANCAKE HERO: low, close, golden; pancakeEat, hearts, looks up at the lens on "bowl" |
| N-ground | 737–770 | "on the ground." | overhead crane-up while he pats Pancake (guyPatDog); confetti falls |
| O-hangUp | 770–818 | "I'm done with" | he holds out the flip phone (OMNISTORE / CANCEL ALL? / > YES) and SNAPS it shut on "done" (2D CLICK! starburst); grin |
| P-fireworks | 818–878 | "'upgrade to continue,'" | dog-eye view from behind the two of them: upsell pop-ups rocket over the house, get stamped, and burst like fireworks on the beats |
| Q-giantClick | 878–947 | "click to cancel," | Q1 (878–912) worm's-eye over his shoulder: he points up at a giant "Cancel EVERYTHING?" dialog in the sky, the giant cursor glides in on "click"; Q2 (912–947) close on the button: the click lands on "cancel" → dialog bursts into shards, confetti, stars, white flash |
| R-celebrate | 947–1017 | "I cancelled" | out of the white: guyCheer + Pancake happy hops, confetti rain, slow orbit; big jump on "cancelled" |
| S-craneUp | 1017–1134 | "you." (held) | they wave up as the camera cranes up and tilts into the sunrise; flare blooms on the held "you"; warm 72% gold-white haze into the Outro's VHS cut |

## Status (final pass done)
- All 19 shots are built, wired and reviewed: at least 5 render/critique/fix rounds, including the caption overlay, cut boundaries, motion
  triplets (snap, click, jump), the first and last 10 frames, and a final `--n=12` pass. Typecheck is clean. The only console output is the
  THREE.Clock deprecation.
- Performance: a full-res still takes about 0.6 s (6 heavy frames rendered in 3.5 s).
- Internal accents use the local `Hit` (a screen-blended tint plus a streak). CutEffect 'flash' (backdrop brightness plus a white wash) clipped
  the bright sunrise palette to white (the K "now" frame went fully white), so it is used only for the deliberate white-out on the giant click (Q, BOOM).
- P/Q are staged at GP (just outside the front gate) so the yard tree is not between the camera and the sky over the house.
- O: the flip phone is placed at the gripR joint (`guyJointMatrix`) and turned by hand to face the lens. HeldPhone's ear orientation read edge-on.
- MorphWord FOR now drops in with a readable tilt (it used to spin around Y and show mirrored as "ROF").

## Known / possible polish
- Sun disc and bloom are still in frame in some wides (A open, H, I). This is intentional for the sunrise, but bright.
- The flip phone's keypad and lid bloom bright white in O.
- P: the first pop-up is already up when the shot starts (its launch happens before 818).
