// TERMS (dystopian silhouette cut) — palette, fonts and frame constants. See DESIGN-silhouette.md §2.
// Grey world, ONE controlling colour (authRed = TENURE / control) and ONE free colour (dawnGold = something you own).
// No other hues anywhere in this cut.
import * as THREE from 'three';

export const S = {
  /** silhouettes, deep shadow */
  void: '#07080A',
  /** architecture, mid fog */
  ash: '#2B2E33',
  /** lit fog, haze */
  fog: '#8A9097',
  /** backlight, screens' white, paper */
  bone: '#E9E6DF',
  /** TENURE: every lock, paywall, price, scanner beam, "BUY NOW". The system's only colour. */
  authRed: '#FF2A1F',
  /** freedom: forbidden until Swing (except the hammer-handle foreshadow in V2Rain); floods the frame only in Final/Outro */
  dawnGold: '#FFB54A',
} as const;

/** Extra greys between the tokens (still hue-free) for layering fog depth. */
export const GREYS = {
  g0: '#07080A', g1: '#0E1013', g2: '#16181C', g3: '#1F2226', g4: '#2B2E33', g5: '#3D4147', g6: '#585D64', g7: '#8A9097',
  g8: '#B9BDC2', g9: '#E9E6DF',
} as const;

/** HDR colour: `intensity` > 1 pushes it over the bloom threshold. */
export const hdr = (hex: string, intensity = 1) => new THREE.Color(hex).multiplyScalar(intensity);

/** System font stacks ONLY (never download fonts). Futura + Andale Mono are macOS fonts; the rest are cloud fallbacks. */
export const SFONTS = {
  /** TENURE signage, captions, titles: uppercase, wide tracking */
  futura: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Trebuchet MS", "DejaVu Sans", sans-serif',
  /** condensed variant for tall monumental letters */
  futuraCond: '"Futura Condensed ExtraBold", "Futura", "Avenir Next Condensed", "DejaVu Sans Condensed", "Arial Narrow", sans-serif',
  /** terms, legal text, serial numbers, lease stencils */
  mono: '"Andale Mono", "Courier New", "DejaVu Sans Mono", "Liberation Mono", monospace',
} as const;

/** 2.39:1 letterbox inside 1920×1080 (drawn by the silhouette overlays). The visible picture is y ∈ [138, 942]. */
export const LETTERBOX = {bar: 138, top: 138, bottom: 942, pictureHeight: 804, width: 1920, height: 1080} as const;

/**
 * Vertical fov (deg) the camera needs so that the VISIBLE letterboxed picture spans `visibleFovDeg` vertically.
 * The 3D camera always renders the full 1080 px; only the middle 804 px are seen.
 */
export const cameraFovForVisible = (visibleFovDeg: number) => {
  const k = LETTERBOX.height / LETTERBOX.pictureHeight;
  return (2 * Math.atan(Math.tan((visibleFovDeg * Math.PI) / 360) * k) * 180) / Math.PI;
};

/** Lyric words that flash authRed in captions (prices, plans, locks). Lower-case, punctuation stripped. */
export const RED_WORDS = ['buy', 'plan', 'upgrade', 'cancel', 'cancelling', 'cancelled', 'locked', 'tier', 'plus', 'patent', 'fee',
  'declined'] as const;
/** Lyric words that appear in dawnGold — ONLY in the final chorus. */
export const GOLD_WORDS = ['good', 'own', 'paper', 'bowl', 'ground'] as const;

/** Song seconds of the two whole-frame brightness changes (DESIGN-silhouette §2.7). */
export const CHORUS_HITS = {chorus1: 57.75, final: 166.39} as const;
/** The near-silence window ("Is that you?") that must be visually near-silent too. */
export const SILENCE = {start: 162.0, end: 166.39} as const;
/** The hammer impact (Swing): dawnGold is forbidden before this, except the hammer-handle foreshadow in V2Rain. */
export const IMPACT_T = 129.2;
