/**
 * V1Feeder 2D overlays (HTML/SVG above the <Stage>): the system-tray balloon tooltip ("expires TODAY"), the red
 * PLUS lock dialog, vignette / letterbox helpers.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {popIn, ramp, clamp01} from '../../lib/time';
import {FONTS, C} from '../../lib/palette';
import {Dialog, Cursor, clickAt, dialogSize, dialogButtonCenter, DialogSpec, Stamp} from '../../lib/ui';

/** Y2K "notification area" balloon tooltip with a tail pointing at (tx, ty). */
export const Balloon: React.FC<{
  x: number; y: number; w?: number; scale?: number; opacity?: number; title: string; lines: React.ReactNode[];
  tail?: 'bl' | 'br' | 'tl'; icon?: 'info' | 'clock' | 'warn';
}> = ({x, y, w = 430, scale = 1, opacity = 1, title, lines, tail = 'bl', icon = 'clock'}) => {
  const tailX = tail === 'br' ? w - 70 : 50;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, transform: `scale(${scale})`, transformOrigin: `${tailX}px 100%`, opacity}}>
      <div
        style={{
          position: 'relative', background: 'linear-gradient(#FFFFF0, #FFFBD0)', border: '2px solid #1b1b1b', borderRadius: 14,
          padding: '14px 18px 16px 18px', boxShadow: '6px 8px 0 rgba(0,0,0,0.35)', fontFamily: FONTS.ui, color: '#111',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8}}>
          {icon === 'clock' ? (
            <svg width={30} height={30} viewBox="0 0 30 30">
              <circle cx={15} cy={15} r={13} fill="#ffffff" stroke="#1E5BFF" strokeWidth={3} />
              <line x1={15} y1={15} x2={15} y2={6} stroke="#111" strokeWidth={2.5} strokeLinecap="round" />
              <line x1={15} y1={15} x2={21} y2={18} stroke={C.alertRed} strokeWidth={2.5} strokeLinecap="round" />
            </svg>
          ) : (
            <svg width={30} height={30} viewBox="0 0 30 30">
              <circle cx={15} cy={15} r={13} fill="#1E5BFF" stroke="#0A3FD8" strokeWidth={2} />
              <text x={15} y={22} textAnchor="middle" fontFamily="Georgia" fontWeight="bold" fontSize={19} fill="#fff">i</text>
            </svg>
          )}
          <div style={{fontWeight: 'bold', fontSize: 23, flex: 1}}>{title}</div>
          <div style={{width: 22, height: 22, border: '1px solid #777', borderRadius: 4, fontSize: 15, lineHeight: '20px', textAlign: 'center', color: '#555'}}>x</div>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{fontSize: 22, lineHeight: 1.35}}>{l}</div>
        ))}
        {/* tail */}
        <svg width={44} height={38} viewBox="0 0 44 38" style={{position: 'absolute', left: tailX - 22, bottom: -36}}>
          <path d="M2 0 L42 0 L8 36 Z" fill="#FFFBD0" stroke="#1b1b1b" strokeWidth={2} />
          <rect x={3} y={-3} width={38} height={4} fill="#FFFBD0" />
        </svg>
      </div>
    </div>
  );
};

/** "at least for today": the loan-expiry balloon pops from the e-reader. */
export const TodayBalloon: React.FC<{f: number; at: number}> = ({f, at}) => {
  const k = popIn(f, at, 10);
  if (f < at) return null;
  const blink = Math.floor((f - at) / 5) % 2 === 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Balloon
        x={250} y={330} scale={k} tail="br" title="OmniStore Library"
        lines={[
          <span key="a">Your license to <i>1984</i> expires:</span>,
          <span key="b" style={{fontWeight: 'bold', fontSize: 30, color: blink ? C.alertRed : '#111'}}>TODAY, 11:59 PM</span>,
        ]}
      />
    </AbsoluteFill>
  );
};

/** soft radial vignette (0..1) — "lonely" isolation */
export const Vignette: React.FC<{amount: number; cx?: number; cy?: number}> = ({amount, cx = 50, cy = 42}) =>
  amount <= 0.001 ? null : (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse 46% 52% at ${cx}% ${cy}%, rgba(0,0,0,0) 35%, rgba(2,4,20,${0.9 * amount}) 100%)`,
      }}
    />
  );

/** cinematic letterbox bars (0..1) */
export const Letterbox: React.FC<{amount: number; h?: number}> = ({amount, h = 92}) =>
  amount <= 0.001 ? null : (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: h * amount, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h * amount, background: '#000'}} />
    </AbsoluteFill>
  );

/** the red PLUS paywall dialog that slams in when the padlock clamps shut */
export const PLUS_SPEC: DialogSpec = {
  kind: 'lock', title: 'FeedMe Plus', theme: 'red', heading: 'Upgrade to PLUS', message: 'Breakfast is for PLUS members only.\nOnly $12.99/mo*',
  buttons: ['Upgrade', 'Cancel'], aquaButton: 0, aquaColor: 'lime', disabledButtons: [1], width: 470,
};

export const LockDialog: React.FC<{f: number; at: number; x?: number; y?: number; scale?: number}> = ({f, at, x = 1010, y = 120, scale = 1.25}) => {
  if (f < at) return null;
  const k = popIn(f, at, 9);
  const sz = dialogSize(PLUS_SPEC);
  const b = dialogButtonCenter(PLUS_SPEC, 1);
  // cursor drifts to the greyed-out Cancel and clicks it twice (nothing happens)
  const cx = x + b.x * scale, cy = y + b.y * scale;
  const arrive = ramp(f, at + 6, at + 16);
  const curX = cx + (1 - arrive) * 220, curY = cy + (1 - arrive) * 160;
  const click = Math.max(clickAt(f, at + 17, 7), clickAt(f, at + 25, 7));
  const shakeX = f - at < 6 ? Math.sin((f - at) * 3.1) * 10 * (1 - (f - at) / 6) : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Dialog {...PLUS_SPEC} hover={arrive > 0.9 ? 1 : undefined} x={x + shakeX} y={y} scale={scale * k} origin="center" sheen={ramp(f, at + 2, at + 14, (q) => q) * 1.4 - 0.2} />
      <div style={{position: 'absolute', left: x + 14 * scale, top: y + (sz.h + 4) * scale, fontFamily: FONTS.ui, fontSize: 15, color: '#ffd0d0', opacity: clamp01((f - at - 8) / 6)}}>
        *billed monthly, forever. Breakfast not included.
      </div>
      {arrive > 0 ? <Cursor kind="arrow" x={curX} y={curY} click={click} size={58} /> : null}
    </AbsoluteFill>
  );
};

export {Stamp};
