// 2D PS2-era racing-game HUD for the "crawled in first gear" shots: POS 1/2 -> 2/2 when the snail overtakes, LAP, TIME,
// a GEAR box stuck on 1 with "SPEED PACK REQUIRED" for 2-5, and a 2 MPH digital readout. Lives in the top band only
// (captions own the bottom 230 px). Pure function of the scene-local frame.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ramp, popIn} from '../../lib/time';
import {FONTS} from '../../lib/palette';

const Outlined: React.FC<{text: string; size: number; x: number; y: number; fill: string; anchor?: 'start' | 'middle' | 'end'; italic?: boolean;
  font?: string; stroke?: number; id: string}> = ({text, size, x, y, fill, anchor = 'start', italic = true, font = FONTS.heavy, stroke = 10, id}) => (
  <>
    <text x={x} y={y} fontFamily={font} fontSize={size} fontStyle={italic ? 'italic' : 'normal'} fontWeight={900} textAnchor={anchor}
      stroke="#0b0820" strokeWidth={stroke} strokeLinejoin="round" fill="#0b0820">
      {text}
    </text>
    <text x={x} y={y} fontFamily={font} fontSize={size} fontStyle={italic ? 'italic' : 'normal'} fontWeight={900} textAnchor={anchor} fill={fill}
      data-id={id}>
      {text}
    </text>
  </>
);

/** f = scene-local frame, start/end = HUD lifetime, overtake = frame where POS flips to 2/2 */
export const RaceHUD: React.FC<{f: number; start: number; end: number; overtake: number}> = ({f, start, end, overtake}) => {
  if (f < start || f >= end) return null;
  const inK = popIn(f, start, 8);
  const passed = f >= overtake;
  const flip = passed ? popIn(f, overtake, 10) : 1;
  const flash = passed ? Math.max(0, 1 - (f - overtake) / 10) : 0;
  const blink = Math.floor(f / 6) % 2 === 0;
  const secs = (f - start) / 30;
  const time = `0'${String(Math.floor(secs)).padStart(2, '0')}"${String(Math.floor((secs % 1) * 100)).padStart(2, '0')}`;
  const banner = passed ? ramp(f, overtake, overtake + 6, (x) => 1 - Math.pow(1 - x, 3)) : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="hudGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff7b0" />
            <stop offset="0.45" stopColor="#ffd23a" />
            <stop offset="0.55" stopColor="#ff9a1e" />
            <stop offset="1" stopColor="#ff5a1e" />
          </linearGradient>
          <linearGradient id="hudRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd0d0" />
            <stop offset="0.5" stopColor="#ff3a3a" />
            <stop offset="1" stopColor="#a00010" />
          </linearGradient>
          <linearGradient id="hudAqua" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8fbff" />
            <stop offset="1" stopColor="#19c6ff" />
          </linearGradient>
          <linearGradient id="hudPanel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(10,30,90,0.75)" />
            <stop offset="1" stopColor="rgba(5,10,42,0.55)" />
          </linearGradient>
        </defs>
        {/* POS block (top-left) */}
        <g transform={`translate(96 64) scale(${inK})`}>
          <path d="M0 0 H360 L330 150 H-30 Z" fill="url(#hudPanel)" stroke="#19c6ff" strokeWidth={3} />
          <Outlined id="pos" text="POS" size={42} x={20} y={56} fill="url(#hudAqua)" stroke={8} />
          <g transform={`translate(120 128) scale(${flip}) translate(-120 -128)`}>
            <Outlined id="posn" text={passed ? '2' : '1'} size={118} x={112} y={132} fill={passed ? 'url(#hudRed)' : 'url(#hudGold)'} stroke={12} />
            <Outlined id="posd" text="/2" size={60} x={196} y={130} fill="url(#hudGold)" stroke={9} />
          </g>
          {flash > 0 ? <path d="M0 0 H360 L330 150 H-30 Z" fill={`rgba(255,60,60,${0.6 * flash})`} /> : null}
          {/* LAP */}
          <Outlined id="lap" text="LAP 1/1" size={34} x={6} y={200} fill="url(#hudAqua)" stroke={7} />
        </g>
        {/* TIME (top-right) */}
        <g transform={`translate(1824 64) scale(${inK})`}>
          <Outlined id="tl" text="TIME" size={34} x={0} y={40} anchor="end" fill="url(#hudAqua)" stroke={7} />
          <Outlined id="tv" text={time} size={60} x={0} y={104} anchor="end" fill="url(#hudGold)" font={FONTS.impact} stroke={9} />
          {/* GEAR box + MPH */}
          <g transform="translate(-250 140)">
            <rect x={0} y={0} width={250} height={112} rx={14} fill="url(#hudPanel)" stroke="#ff4a5a" strokeWidth={3} />
            <Outlined id="gl" text="GEAR" size={26} x={20} y={40} fill="url(#hudAqua)" stroke={6} />
            <Outlined id="gv" text="1" size={88} x={58} y={102} anchor="middle" fill="url(#hudRed)" stroke={10} />
            <Outlined id="mph" text="2" size={70} x={196} y={84} anchor="end" fill="url(#hudGold)" font={FONTS.impact} stroke={9} />
            <Outlined id="mphl" text="MPH" size={22} x={238} y={84} anchor="end" fill="url(#hudAqua)" stroke={5} italic={false} />
          </g>
          {blink ? (
            <g transform="translate(-250 270)">
              <rect x={0} y={0} width={250} height={40} rx={6} fill="#e2231a" stroke="#fff3a0" strokeWidth={2} />
              <text x={125} y={28} fontFamily={FONTS.ui} fontSize={19} fontWeight={700} fill="#ffffff" textAnchor="middle">GEAR 2-5: SPEED PACK</text>
            </g>
          ) : null}
        </g>
        {/* OVERTAKEN! banner sweeping in from the left */}
        {banner > 0 ? (
          <g transform={`translate(${-700 + 1660 * banner} 300) skewX(-12)`} opacity={Math.min(1, 1.5 - ramp(f, overtake + 22, overtake + 30, (x) => x) * 1.5)}>
            <rect x={-330} y={-60} width={660} height={92} fill="rgba(226,35,26,0.9)" stroke="#fff3a0" strokeWidth={4} />
            <Outlined id="ov" text="OVERTAKEN!" size={74} x={0} y={14} anchor="middle" fill="url(#hudGold)" stroke={10} />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};
