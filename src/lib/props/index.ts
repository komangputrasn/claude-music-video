/**
 * Hero props (cel-shaded, ink-outlined, Y2K glossy plastic) — see each file's header for the full API.
 *
 *   import {Feeder, FEEDER, Padlock, Hammer, HAMMER, FlipPhone, EReader, Book1984, DogBowl, FoodBag,
 *           KibbleBurst, KibblePile} from '../../lib/props';
 *
 *   <Feeder lcdText="BREAKFAST IS FOR PLUS MEMBERS ONLY" lockShake={pulse} />
 *   <KibbleBurst progress={p} origin={FEEDER.hopperCenter} />
 *
 * Shared helpers (glossMat, chromeMat, candyMat, Ink, rbox, useCanvasTexture, ...) live in Padlock.tsx and are re-exported.
 * Held.tsx: HeldHammer / HeldPhone / HeldBook (pre-rotated for <Guy rightHand>) and HungHammer (on BEDROOM_SPOTS.hammerHook).
 */
export * from './Padlock';
export * from './Kibble';
export * from './Feeder';
export * from './Hammer';
export * from './FlipPhone';
export * from './EReader';
export * from './Book1984';
export * from './DogBowl';
export * from './FoodBag';
export * from './Held';
