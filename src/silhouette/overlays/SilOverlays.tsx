/**
 * TERMS overlays (DESIGN-silhouette §2.4, §2.6), mounted by Layout when overlays="silhouette":
 *   <Letterbox/>    2.39:1 black bars (138 px top and bottom) — always on.
 *   <SilCaptions/>  lower-left, uppercase Futura, bone white, words appear one at a time (hard on) as they are sung.
 *                   Price/plan/lock words flash authRed; in the final chorus "good / own / paper / bowl / ground" are
 *                   dawnGold. Sits in the bottom bar, slightly overlapping the picture.
 *
 * Scenes do NOT render captions or bars. Keep important picture content inside y ∈ [138, 900] px and away from the
 * lower-left ~1250×60 px of the picture (the caption block's first row overlaps the picture bottom).
 *
 *   <SilCaptions time?={songSeconds} fontSize?={38} left?={120} bottom?={42} maxWidth?={1220}/>
 *   silCaptionLineAt(t) → the lyric line shown at t (or null)
 *   silWordColor(word, section, sinceStart) → the CSS colour of a caption word
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {LINES, Line} from '../../lib/lyrics';
import {useSongTime} from '../../lib/time';
import {S, SFONTS, LETTERBOX, RED_WORDS, GOLD_WORDS} from '../lib/palette';

export const Letterbox: React.FC<{bar?: number; color?: string}> = ({bar = LETTERBOX.bar, color = '#000'}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: color}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: color}} />
  </AbsoluteFill>
);

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
const RED = new Set<string>(RED_WORDS);
const GOLD = new Set<string>(GOLD_WORDS);

/** Caption colour of a word. `since` = seconds since the word appeared (red words flash brighter for ~0.25 s). */
export const silWordColor = (word: string, section: string, since: number) => {
  const w = clean(word);
  if (section === 'final' && GOLD.has(w)) return S.dawnGold;
  if (RED.has(w)) return since < 0.22 ? '#FF6A55' : S.authRed;
  return S.bone;
};

/** The lyric line on screen at song time t: from its first word until the next line starts (or end + 1.2 s). */
export const silCaptionLineAt = (t: number): Line | null => {
  for (let k = LINES.length - 1; k >= 0; k--) {
    const L = LINES[k];
    const start = L.words[0]?.start ?? L.start;
    if (t < start) continue;
    const next = k + 1 < LINES.length ? (LINES[k + 1].words[0]?.start ?? LINES[k + 1].start) : Infinity;
    return t < Math.min(next, L.end + 1.2) ? L : null;
  }
  return null;
};

export const SilCaptions: React.FC<{time?: number; fontSize?: number; left?: number; bottom?: number; maxWidth?: number}> = ({
  time, fontSize = 38, left = 120, bottom = 42, maxWidth = 1220,
}) => {
  const songT = useSongTime();
  const t = time ?? songT;
  const L = silCaptionLineAt(t);
  if (!L) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left,
          bottom,
          maxWidth,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          columnGap: fontSize * 0.42,
          rowGap: fontSize * 0.18,
          fontFamily: SFONTS.futura,
          fontWeight: 500,
          fontSize,
          lineHeight: 1.12,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          textShadow: '0 0 14px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9)',
        }}
      >
        {L.words.map((w, i) => {
          const on = t >= w.start;
          return (
            <span key={i} style={{visibility: on ? 'visible' : 'hidden', color: silWordColor(w.text, L.section, t - w.start), whiteSpace: 'nowrap'}}>
              {w.text.replace(/["“”]/g, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const SilOverlays: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <Letterbox />
    <SilCaptions />
  </AbsoluteFill>
);
