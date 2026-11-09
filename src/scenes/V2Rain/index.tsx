/**
 * V2Rain (verse 2b, 109.97–128.34 s, lines [24]–[27]):
 * "I walked home in the rain, and the doorbell said, 'Who?' / so I climbed through my window, and the cops came too. /
 *  Pancake was waiting with his nose on the box, / and my grandpa's old hammer doesn't care about locks."
 *
 * Shot list (scene-local frames; see timing.ts):
 *   0–49    street wide: soaked trudge, his driverless car splashes him ("walked home")
 *   49–79   street close: shivering, drips, lightning on "rain"
 *   79–146  DOORBELL-CAM fisheye POV: ring, "WHO?", FACE NOT RECOGNIZED → Face Plus upsell, "calling 911…"
 *   146–207 inside the bedroom: lightning silhouette, window bursts open, he climbs in ("climbed … window")
 *   207–243 outside: POLICE+ cruiser slides up, light bar strobing the house ("cops came")
 *   243–276 inside: red/blue wash, crouched Guy frozen, dutch push-in ("too")
 *   276–338 Pancake waiting, chin on the locked feeder, puppy eyes ("Pancake was waiting")
 *   338–373 insert: nose on the box, LCD "LOCKED" ("nose on the box")
 *   373–406 the Guy kneels, pats him … a golden glow pulls his eyes to the wall
 *   406–454 LEGENDARY ITEM: grandpa's hammer, god rays, chrome GRANDPA'S ("grandpa's")
 *   454–501 hero orbit of the hammer + RPG item card ("old hammer doesn't care")
 *   501–551 tight CU of his determined face, crash zoom-out on beat 518; his right fist clamps the handle on "locks",
 *           lifts it off the pegs, gold flare → white-out into Swing
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {shotAt} from './timing';
import {StreetWide, StreetClose} from './shots/StreetShots';
import {DoorbellShot} from './shots/DoorbellShot';
import {ClimbShot, CopsInShot, PancakeShot, NoseShot, PatShot} from './shots/BedroomShots';
import {RevealShot, HammerShot, ReachShot} from './shots/HammerShots';
import {CopsOutShot} from './shots/CopsOutShot';

export const V2Rain: React.FC = () => {
  const f = useCurrentFrame();
  const shot = shotAt(f);
  let body: React.ReactNode = null;
  switch (shot) {
    case 'streetWide':
      body = <StreetWide f={f} />;
      break;
    case 'streetClose':
      body = <StreetClose f={f} />;
      break;
    case 'doorbell':
      body = <DoorbellShot f={f} />;
      break;
    case 'climb':
      body = <ClimbShot f={f} />;
      break;
    case 'copsOut':
      body = <CopsOutShot f={f} />;
      break;
    case 'copsIn':
      body = <CopsInShot f={f} />;
      break;
    case 'pancake':
      body = <PancakeShot f={f} />;
      break;
    case 'nose':
      body = <NoseShot f={f} />;
      break;
    case 'pat':
      body = <PatShot f={f} />;
      break;
    case 'reveal':
      body = <RevealShot f={f} />;
      break;
    case 'hammer':
      body = <HammerShot f={f} />;
      break;
    case 'reach':
      body = <ReachShot f={f} />;
      break;
    default:
      body = (
        <AbsoluteFill style={{background: '#123', color: '#9cf', fontSize: 60, justifyContent: 'center', alignItems: 'center', fontFamily: 'Tahoma'}}>
          {shot} · {f}
        </AbsoluteFill>
      );
  }
  return <AbsoluteFill style={{background: '#000'}}>{body}</AbsoluteFill>;
};
