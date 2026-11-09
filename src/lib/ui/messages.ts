/**
 * Y2K UI kit — a pool of on-theme subscription-hell pop-up messages (for storms, tunnels, scene filler).
 * In-world brand names are invented stand-ins (INKSURE+, OmniStore, FeedMe Plus, MOTORCO...).
 *
 * API
 *   POPUP_MESSAGES: DialogSpec[]                       ~24 ready-to-use dialog specs
 *   pickMessage(seed, kinds?) -> DialogSpec            deterministic pick (optionally filtered by kind)
 *
 * Usage
 *   <Dialog {...pickMessage(`storm-${i}`)} x={...} y={...}/>
 */
import type {DialogKind, DialogSpec} from './widgets';
import {rand} from '../time';

export const POPUP_MESSAGES: DialogSpec[] = [
  {kind: 'error', title: 'INKSURE+ Printer Service', heading: 'CARD DECLINED', message: 'Printing disabled by INKSURE+.', buttons: ['OK', 'Retry']},
  {kind: 'warning', title: 'Are you sure?', message: 'Are you sure you want to cancel?\nYou will lose everything.', buttons: ['Yes', 'No'], defaultButton: 1},
  {kind: 'lock', title: 'FeedMe Plus', heading: 'Plus members only', message: 'Breakfast is a PLUS feature.', buttons: ['Upgrade', 'Cancel'], aquaButton: 0,
    disabledButtons: [1]},
  {kind: 'error', title: 'OmniStore', heading: 'Error 402', message: 'Payment Required.', buttons: ['OK']},
  {kind: 'info', title: 'Free Trial', message: 'Your free trial of OXYGEN has ended.', buttons: ['Buy Now', 'Later'], aquaButton: 0},
  {kind: 'question', title: 'Upgrade?', message: 'Upgrade to continue?', buttons: ['Upgrade', 'Upgrade'], aquaButton: 0, aquaColor: 'lime'},
  {kind: 'lock', title: 'e-Reader', heading: 'Content Removed', message: 'This title is no longer available.', buttons: ['OK']},
  {kind: 'coin', title: 'Special Offer!', heading: 'BUY NOW for $9.99/mo*', message: '*for now', buttons: ['Buy Now'], aquaButton: 0, aquaColor: 'gold'},
  {kind: 'warning', title: 'Ownership Check', message: 'You do not own this item.\nYou rent it.', buttons: ['OK']},
  {kind: 'error', title: 'Sleep Service', heading: 'SLEEP HAS A FEE', message: '$4.99 per night.', buttons: ['Buy Now', 'Maybe Later'], aquaButton: 0,
    disabledButtons: [1]},
  {kind: 'info', title: 'Terms of Service', message: 'We updated our terms.\nYou already agreed.', buttons: ['OK']},
  {kind: 'question', title: 'Cancel Subscription', message: 'To cancel, please visit page 37 of ∞.', buttons: ['Continue', 'Give Up'], defaultButton: 1},
  {kind: 'lock', title: 'MOTORCO Seat Heat', heading: 'PLATINUM TIER', message: 'Seat heat requires Platinum.', buttons: ['Upgrade', 'Shiver'],
    aquaButton: 0, aquaColor: 'tangerine'},
  {kind: 'error', title: 'Speed Pack', message: 'SPEED PACK REQUIRED.\nYou are limited to 1st gear.', buttons: ['OK']},
  {kind: 'warning', title: 'Low Balance', message: 'Your wallet is getting thin.', buttons: ['Add Funds', 'Cry'], aquaButton: 0},
  {kind: 'plus', title: 'Go PLUS!', heading: 'Unlock EVERYTHING', message: 'Doors, breakfast, gravity & more.', buttons: ['Upgrade'], aquaButton: 0,
    aquaColor: 'bubblegum', theme: 'pink'},
  {kind: 'lock', title: 'Doorbell Cam', heading: 'WHO?', message: 'Face not recognized.\nUpgrade to Face Plus.', buttons: ['Upgrade', 'Cancel'],
    aquaButton: 0, disabledButtons: [1]},
  {kind: 'error', title: 'License Expired', message: 'Your license to this pillow has expired.', buttons: ['Renew']},
  {kind: 'question', title: 'Really sure?', message: 'Really, really sure?', buttons: ['Yes', 'No'], defaultButton: 1},
  {kind: 'info', title: 'Special Offer', heading: "Here's 10% off!", message: 'Stay subscribed and save.', buttons: ['Stay', 'Leave'], aquaButton: 0,
    disabledButtons: [1]},
  {kind: 'warning', title: 'Subscription', message: 'Your subscription to EVERYTHING is now active.', buttons: ['Buy Now'], aquaButton: 0},
  {kind: 'error', title: 'Fatal Exception', message: 'A fatal fee has occurred at 0x0315.', buttons: ['Pay', 'Pay Later'], defaultButton: 0},
  {kind: 'coin', title: 'Tip Jar', message: 'Would you like to tip your toaster?', buttons: ['15%', '20%', '25%']},
  {kind: 'lock', title: 'Breathing Plus', message: 'Inhale is free. Exhale requires PLUS.', buttons: ['Upgrade', 'Hold'], aquaButton: 0, aquaColor: 'grape'},
];

export const pickMessage = (seed: string | number, kinds?: DialogKind[]): DialogSpec => {
  const pool = kinds?.length ? POPUP_MESSAGES.filter((m) => kinds.includes(m.kind ?? 'info')) : POPUP_MESSAGES;
  const list = pool.length ? pool : POPUP_MESSAGES;
  return list[Math.floor(rand(`pm-${seed}`) * list.length) % list.length];
};
