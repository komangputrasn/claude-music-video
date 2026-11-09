/**
 * <CamcorderHUD/> — DV camcorder on-screen display, like the single's cover art. NOT global: scenes render it
 * themselves (above their <Stage>) for home-video moments.
 *
 *   ┌                                         ┐
 *     ● REC                    0:00:12:05 [▮▮▮]
 *
 *     AM 3:15
 *     NOV 09 2002
 *   └                                         ┘
 * - corner focus brackets, blinking red REC dot (or "PLAY ►" / "PAUSE ❚❚"), running timecode from `frame`,
 *   battery icon (low battery blinks), date + time stamp; white OSD text with a dark edge + slight white glow.
 * - Safe-area aware (everything inside title-safe); by default the date stamp sits ABOVE the global caption zone
 *   (bottom 230 px) so lyrics never collide with it. captionSafe={false} puts it in the classic bottom corner
 *   (use in instrumental parts, e.g. the Outro).
 *
 * Props
 *   frame        number   frame used for timecode + blinking (scene-local useCurrentFrame() is fine)
 *   mode?        'rec' | 'play' | 'pause'          default 'rec'
 *   date?        string   default 'NOV 09 2002'
 *   time?        string   default 'AM 3:15'
 *   showBrackets? boolean default true
 *   opacity?     number   default 1
 *   battery?     0..3     bars (default 3; <=1 blinks)
 *   timecodeOffset? number frames added to `frame` for the counter (default 0)
 *   label?       string   small extra line under REC, e.g. 'SP' or 'STBY'
 *   captionSafe? boolean  default true (see above)
 *   style?       CSSProperties for the root
 * Exports: CamcorderHUD, CamcorderHUDProps, formatTimecode(frames, fps?), HUD_SAFE {x, y}
 *
 * Usage:
 *   const f = useCurrentFrame();
 *   <AbsoluteFill><Stage>...</Stage><CamcorderHUD frame={f} date="NOV 09 2002" time="AM 6:42" /></AbsoluteFill>
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {WIDTH, HEIGHT, FPS} from '../timeline';

/** inset of the corner brackets from the frame edge (px at 1080p), inside title-safe */
export const HUD_SAFE = {x: 116, y: 74};

const OSD_FONT = 'Verdana, Tahoma, sans-serif'; // bold Verdana ≈ the classic camcorder date-stamp look

export const formatTimecode = (frames: number, fps = FPS) => {
  const f = Math.max(0, Math.floor(frames));
  const ff = f % fps;
  const s = Math.floor(f / fps);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}:${p2(ff)}`;
};

export type CamcorderHUDProps = {
  frame: number;
  mode?: 'rec' | 'play' | 'pause';
  date?: string;
  time?: string;
  showBrackets?: boolean;
  opacity?: number;
  battery?: number;
  timecodeOffset?: number;
  label?: string;
  captionSafe?: boolean;
  style?: React.CSSProperties;
};

const TEXT_SHADOW = [
  '0 0 2px rgba(0,0,0,0.95)',
  '2px 2px 0 rgba(0,0,0,0.6)',
  '-1px -1px 0 rgba(0,0,0,0.35)',
  '0 0 12px rgba(255,255,255,0.45)',
].join(', ');

const osd = (size: number): React.CSSProperties => ({
  position: 'absolute',
  fontFamily: OSD_FONT,
  fontSize: size,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
  color: '#FFFFFF',
  letterSpacing: size * 0.06,
  textShadow: TEXT_SHADOW,
  whiteSpace: 'nowrap',
});

const Bracket: React.FC<{x: number; y: number; sx: 1 | -1; sy: 1 | -1}> = ({x, y, sx, sy}) => {
  const L = 78, T = 5;
  const shadow = 'drop-shadow(0 0 2px rgba(0,0,0,0.85)) drop-shadow(2px 2px 0 rgba(0,0,0,0.45)) drop-shadow(0 0 8px rgba(255,255,255,0.35))';
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, filter: shadow}}>
      <div style={{position: 'absolute', background: '#fff', width: L, height: T, left: sx > 0 ? 0 : -L, top: sy > 0 ? 0 : -T}} />
      <div style={{position: 'absolute', background: '#fff', width: T, height: L, left: sx > 0 ? 0 : -T, top: sy > 0 ? 0 : -L}} />
    </div>
  );
};

const Battery: React.FC<{bars: number; visible: boolean}> = ({bars, visible}) => (
  <svg width={74} height={36} viewBox="0 0 74 36" style={{display: 'block', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.95)) drop-shadow(2px 2px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 8px rgba(255,255,255,0.35))'}}>
    <rect x={2} y={10} width={6} height={16} rx={1.5} fill="#fff" />
    <rect x={9} y={3} width={62} height={30} rx={4} fill="none" stroke="#fff" strokeWidth={4} />
    {visible
      ? [0, 1, 2].map((i) => (i < bars ? <rect key={i} x={50 - i * 17} y={9} width={14} height={18} rx={1.5} fill="#fff" /> : null))
      : null}
  </svg>
);

export const CamcorderHUD: React.FC<CamcorderHUDProps> = ({
  frame, mode = 'rec', date = 'NOV 09 2002', time = 'AM 3:15', showBrackets = true, opacity = 1, battery = 3,
  timecodeOffset = 0, label, captionSafe = true, style,
}) => {
  const {x: MX, y: MY} = HUD_SAFE;
  const blink = Math.floor(frame / 15) % 2 === 0; // 1 Hz: 0.5 s on / 0.5 s off
  const lowBlink = Math.floor(frame / 10) % 2 === 0;
  const bars = Math.max(0, Math.min(3, Math.round(battery)));
  const inX = MX + 38;
  const topY = MY + 30;
  const dateBottom = captionSafe ? HEIGHT - 250 : HEIGHT - MY - 30;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity, ...style}}>
      {showBrackets ? (
        <>
          <Bracket x={MX} y={MY} sx={1} sy={1} />
          <Bracket x={WIDTH - MX} y={MY} sx={-1} sy={1} />
          <Bracket x={MX} y={HEIGHT - MY} sx={1} sy={-1} />
          <Bracket x={WIDTH - MX} y={HEIGHT - MY} sx={-1} sy={-1} />
        </>
      ) : null}

      {/* top-left: mode */}
      <div style={{...osd(46), left: inX, top: topY, display: 'flex', alignItems: 'center', gap: 16}}>
        {mode === 'rec' ? (
          <>
            <span style={{display: 'inline-block', width: 30, height: 30, borderRadius: 15, background: '#FF2216', opacity: blink ? 1 : 0,
              boxShadow: '0 0 0 2px rgba(0,0,0,0.55), 0 0 14px rgba(255,40,20,0.9), inset 0 -4px 6px rgba(120,0,0,0.5), inset 0 4px 5px rgba(255,190,170,0.7)'}} />
            <span>REC</span>
          </>
        ) : mode === 'play' ? (
          <>
            <span>PLAY</span>
            <svg width={30} height={34} viewBox="0 0 30 34" style={{filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.95)) drop-shadow(2px 2px 0 rgba(0,0,0,0.55))'}}>
              <polygon points="2,2 28,17 2,32" fill="#fff" />
            </svg>
          </>
        ) : (
          <>
            <span>PAUSE</span>
            <svg width={28} height={32} viewBox="0 0 28 32" style={{opacity: blink ? 1 : 0.25, filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.95)) drop-shadow(2px 2px 0 rgba(0,0,0,0.55))'}}>
              <rect x={2} y={2} width={9} height={28} fill="#fff" />
              <rect x={17} y={2} width={9} height={28} fill="#fff" />
            </svg>
          </>
        )}
      </div>
      {label ? <div style={{...osd(30), left: inX + 2, top: topY + 62}}>{label}</div> : null}

      {/* top-right: timecode + battery */}
      <div style={{...osd(40), right: inX, top: topY + 2, display: 'flex', alignItems: 'center', gap: 22}}>
        <span>{formatTimecode(frame + timecodeOffset)}</span>
        <Battery bars={bars} visible={bars > 1 || lowBlink} />
      </div>

      {/* bottom-left: time + date stamp */}
      <div style={{...osd(42), left: inX, bottom: HEIGHT - dateBottom, lineHeight: 1.3}}>
        <div>{time}</div>
        <div>{date}</div>
      </div>
    </AbsoluteFill>
  );
};
