/**
 * TERMS overlays (DESIGN-silhouette §2.4, §2.6), mounted by Layout when overlays="silhouette":
 *   <Letterbox/>    2.39:1 black bars (138 px top and bottom) — always on. The ONLY global overlay.
 *
 * LYRICS LIVE INSIDE THE WORLD in this cut: every scene stages its sung lines diegetically with <WorldLyric>
 * (src/silhouette/lib/WorldLyric.tsx). There is no caption overlay. <SilCaptions/> below is kept only as a
 * reference/debug tool (e.g. a playground timing check) and is NOT mounted.
 *   <SilCaptions/>  lower-left, uppercase Futura, bone white, words appear one at a time (hard on) as they are sung.
 *
 * Scenes do NOT render the bars. Keep important picture content inside y ∈ [138, 942] px.
 *
 *   <SilCaptions time?={songSeconds} fontSize?={38} left?={120} top?={930} maxWidth?={1320}/>   (balanced wrapping)
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

export const SilCaptions: React.FC<{time?: number; fontSize?: number; left?: number; top?: number; maxWidth?: number}> = ({
  time, fontSize = 38, left = 120, top = LETTERBOX.bottom - 12, maxWidth = 1320,
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
          top,
          maxWidth,
          textAlign: 'left',
          textWrap: 'balance',
          fontFamily: SFONTS.futura,
          fontWeight: 500,
          fontSize,
          lineHeight: 1.18,
          letterSpacing: '0.15em',
          wordSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: '0 0 14px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9)',
        }}
      >
        {L.words.map((w, i) => {
          const on = t >= w.start;
          return (
            <React.Fragment key={i}>
              {i > 0 ? ' ' : null}
              <span style={{visibility: on ? 'visible' : 'hidden', color: silWordColor(w.text, L.section, t - w.start)}}>
                {w.text.replace(/["“”]/g, '')}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const SilOverlays: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <Letterbox />
  </AbsoluteFill>
);
