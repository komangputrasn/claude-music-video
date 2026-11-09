// Master edit list. Every cut sits on a beat (see src/data/audio.json). Frames are at 30 fps, absolute.
// Scenes render inside <Sequence from={from}> so useCurrentFrame() inside a scene is LOCAL (0 = scene start).
// Use useSongTime()/useAbsoluteFrame() from lib/time when you need song-absolute timing (lyrics, beats).
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_FRAMES = 6600; // 220 s

export type SceneId =
  | 'Intro' | 'V1Bedroom' | 'V1Feeder' | 'Pre' | 'Chorus1' | 'V2Car' | 'V2Rain'
  | 'Swing' | 'Cancel' | 'Hold' | 'Final' | 'Outro';

export type SceneDef = {id: SceneId; from: number; to: number; section: string; summary: string};

export const SCENES: SceneDef[] = [
  {id: 'Intro',     from: 0,    to: 371,  section: 'intro (instrumental)', summary: 'CRT power-on, Y2K boot, chrome title BUY NOW, FOR NOW, dive into the screen'},
  {id: 'V1Bedroom', from: 371,  to: 900,  section: 'verse 1 a', summary: '3:15 AM bedroom. Smart bed sits up, pillow charges a sleep fee, printer refuses to print (card declined)'},
  {id: 'V1Feeder',  from: 900,  to: 1424, section: 'verse 1 b', summary: 'E-reader loses 1984, feeder is Plus-members-only, Pancake looks up hungry and lonely'},
  {id: 'Pre',       from: 1424, to: 1732, section: 'pre-chorus', summary: 'Hold on buddy; one bag of food; pull back to a world where nothing can be owned; build-up into the chorus'},
  {id: 'Chorus1',   from: 1732, to: 2777, section: 'chorus 1', summary: 'Full Y2K pop-up storm: BUY NOW flips to FOR NOW, house on a payment plan, upgrade to continue, click to cancel'},
  {id: 'V2Car',     from: 2777, to: 3299, section: 'verse 2 a', summary: 'Cold seats (heat is a tier), speed tier, first gear crawl, gas station, car drives itself away, patent blueprint'},
  {id: 'V2Rain',    from: 3299, to: 3850, section: 'verse 2 b', summary: 'Walk home in rain, doorbell cam says WHO?, climb through window, cop lights, Pancake nose on box, grandpa hammer'},
  {id: 'Swing',     from: 3850, to: 4126, section: 'bridge (one swing)', summary: 'Bullet-time hammer swing, lid flies, kibble explosion, Pancake eats, flip phone + hammer, cancelling every plan'},
  {id: 'Cancel',    from: 4126, to: 4678, section: 'bridge (click to cancel)', summary: 'Court says no (gavel), page after page with nowhere to go, the epic "Iliad" cancel page'},
  {id: 'Hold',      from: 4678, to: 4992, section: 'bridge (hold music)', summary: 'Hold music limbo, music stops, the pillow voice returns: "Is that you?"'},
  {id: 'Final',     from: 4992, to: 6126, section: 'final chorus', summary: 'Liberation: paper 1984, Pancake eats from a bowl, CANCELLED stamps shatter every pop-up, sunrise'},
  {id: 'Outro',     from: 6126, to: 6600, section: 'outro (instrumental)', summary: 'Sunrise porch home-video moment, pull back into a CRT TV that switches off, end card'},
];

export const sceneById = (id: SceneId) => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown scene ${id}`);
  return s;
};
