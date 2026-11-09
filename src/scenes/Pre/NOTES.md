# Pre — progress log (frames 1424–1732, 47.46–57.75 s)

Files: index.tsx (switcher + overlays), timing.ts (W word frames, CUT), RoomShots.tsx (P1 P2 P5), AdShot.tsx (P3 P4 + 2D),
WorldShots.tsx (P6 P7), Tags.tsx (PriceTag, Sticker), Keys.tsx. Uses ../V1Feeder/common.tsx (NightRoom etc.).

| shot | local frames | words | status |
|---|---|---|---|
| P1 pat: two-shot, Guy pats Pancake, he melts, heart | 0–33 | Hold on | done |
| P2 Pancake POV up at Guy, stands + keys sparkle | 33–81 | buddy, I'll be right back | done |
| P3 TV-ad void: bag whips round, chrome ONE BAG, NEW! | 81–113 | one bag | done |
| P4 low dutch hero, gold OF FOOD, ONE-TIME PURCHASE!* , "*for now." | 113–145 | of food, and that's that | done |
| P5 room: cocky Guy w/ keys, pull back into diorama on neon grid, tags pop on beats, RENTED sticker on his hoodie | 145–211 | How hard can it be to buy one thing | done |
| P6 exterior night: pull back hard from bedroom window, house RENTED tag, door padlock, stickers | 211–256 | in a world where you can't own | done |
| P7 accelerating inserts (moon tag, car, mailbox, tree, door) + speed lines + progress bar -> white-out | 256–308 | anything? | done (own moon mesh, tags fog:false) |


## Status (final pass done)
- Typecheck clean for src/scenes/{V1Feeder,Pre}. Only console line is the harmless THREE.Clock deprecation.
- Perf: ~1 s/frame full-res steady state (8 consecutive frames ~7-8 s incl. JPEG write).
- Known nits: Pre P2 POV has the Guy's patting arm as a big foreground shape (intentional "pat the lens");
  P3 bag whip strobes for the first ~4 frames (no motion blur); P1 shows the Guy mostly in profile/back (Pancake is the focus).
