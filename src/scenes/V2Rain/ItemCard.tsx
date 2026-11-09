/**
 * <ItemCard> — a 2002 console-RPG "LEGENDARY ITEM" stat window for grandpa's hammer (blue gradient panel, white bevel,
 * gold stars, Trebuchet/Verdana), lines landing on the sung words: "old hammer" → name + stars, "doesn't" → fees,
 * "care" → LOCKS: DOESN'T CARE. Pure HTML; driven by the scene-local frame.
 */
import React from 'react';
import {popIn, ramp, lerp} from '../../lib/time';
import {FONTS} from '../../lib/palette';
import {W, BEAT_F} from './timing';

const ROWS: {label: string; value: string; at: number; hot?: boolean}[] = [
  {label: 'OWNED SINCE', value: '1961', at: 470},
  {label: 'MONTHLY FEE', value: '$0.00', at: Math.round(W.doesnt) - 1},
  {label: 'FIRMWARE', value: 'NONE', at: 486},
  {label: 'TERMS OF SERVICE', value: 'NONE', at: 492},
  {label: 'LOCKS', value: "DOESN'T CARE", at: Math.round(W.care) - 2, hot: true},
];

const HammerIcon: React.FC = () => (
  <svg width="84" height="84" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="hmIron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8a8f9e" />
        <stop offset="0.5" stopColor="#3a3d48" />
        <stop offset="1" stopColor="#1a1b22" />
      </linearGradient>
      <linearGradient id="hmWood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#d9a060" />
        <stop offset="1" stopColor="#8a5528" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="#0a2a8a" stroke="#ffe08a" strokeWidth="4" />
    <g transform="rotate(-35 50 50)">
      <rect x="45" y="30" width="10" height="56" rx="4" fill="url(#hmWood)" stroke="#2a1606" strokeWidth="2.5" />
      <rect x="45" y="68" width="10" height="16" rx="3" fill="#1d1d24" />
      <path d="M26 20 L66 20 L66 36 L26 36 Z" fill="url(#hmIron)" stroke="#0a0a10" strokeWidth="2.5" />
      <path d="M66 22 Q80 20 84 10 L78 28 Q72 34 66 34 Z" fill="url(#hmIron)" stroke="#0a0a10" strokeWidth="2.5" />
      <circle cx="34" cy="26" r="2.5" fill="#b4642a" />
      <circle cx="56" cy="31" r="2" fill="#b4642a" />
    </g>
  </svg>
);

export const ItemCard: React.FC<{f: number; start: number; x?: number; y?: number; scale?: number}> = ({f, start, x = 92, y = 150, scale = 1}) => {
  const k = popIn(f, start - 1, 10);
  if (f < start - 1) return null;
  const nameN = Math.floor(ramp(f, start + 1, start + 12, (q) => q) * "GRANDPA'S HAMMER".length);
  const stars = ramp(f, W.hammer - 2, W.hammer + 6, (q) => q);
  const sheen = lerp(-0.3, 1.3, ramp(f, start + 2, start + 18, (q) => q));
  const hotK = popIn(f, ROWS[4].at, 9);
  // tiny bounce on every beat
  const lastBeat = BEAT_F.filter((b) => b <= f).pop() ?? -99;
  const bounce = Math.exp(-(f - lastBeat) / 4) * 0.012;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 720, transform: `scale(${scale * (k + bounce)})`, transformOrigin: 'left center',
      opacity: Math.min(1, k * 1.5)}}>
      <div style={{position: 'relative', borderRadius: 16, padding: '22px 30px 26px 30px', overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(40,92,230,0.94) 0%, rgba(14,40,150,0.94) 55%, rgba(6,18,90,0.95) 100%)',
        border: '4px solid #f2f6ff', boxShadow: '0 0 0 3px #0a1250, 0 10px 28px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -3px 0 rgba(0,0,30,0.5)'}}>
        {/* sheen */}
        <div style={{position: 'absolute', left: `${sheen * 100}%`, top: -40, width: 90, height: 520, transform: 'rotate(22deg)',
          background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))'}} />
        <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
          <HammerIcon />
          <div>
            <div style={{fontFamily: FONTS.verdana, fontWeight: 900, fontSize: 22, letterSpacing: 4, color: '#ffe08a', textShadow: '2px 2px 0 #40200a'}}>
              ★ LEGENDARY ITEM ★
            </div>
            <div style={{fontFamily: FONTS.web, fontWeight: 900, fontStyle: 'italic', fontSize: 46, color: '#fff', lineHeight: 1.1,
              textShadow: '3px 3px 0 #061040, 0 0 14px rgba(140,190,255,0.8)', whiteSpace: 'nowrap'}}>
              {"GRANDPA'S HAMMER".slice(0, nameN)}
              {nameN < 16 && Math.floor(f / 3) % 2 === 0 ? '_' : ''}
            </div>
            <div style={{fontSize: 34, letterSpacing: 6, color: '#ffd23a', textShadow: '0 0 10px #ffb000, 2px 2px 0 #5a2a00', height: 40}}>
              {'★★★★★'.slice(0, Math.round(stars * 5))}
            </div>
          </div>
        </div>
        <div style={{height: 3, margin: '14px 0 10px', background: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.1))'}} />
        {ROWS.map((r, i) => {
          const a = popIn(f, r.at, 7);
          if (f < r.at) return <div key={i} style={{height: r.hot ? 54 : 42}} />;
          const hot = r.hot;
          return (
            <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', height: hot ? 54 : 42,
              transform: `translateX(${(1 - a) * -40}px)`, opacity: Math.min(1, a * 1.3),
              fontFamily: FONTS.verdana, fontWeight: 700, fontSize: hot ? 30 : 26, color: hot ? '#ffe08a' : '#e8f0ff', textShadow: '2px 2px 0 #061040'}}>
              <span>{r.label}</span>
              <span style={{flex: 1, borderBottom: '3px dotted rgba(220,232,255,0.45)', margin: '0 14px 8px'}} />
              <span style={{color: hot ? '#ff4a3a' : '#9bff3a', fontSize: hot ? 34 * (1 + 0.25 * (1 - Math.min(1, hotK))) : 26, fontWeight: 900,
                textShadow: hot ? '0 0 12px rgba(255,80,40,0.9), 2px 2px 0 #300' : '2px 2px 0 #061040', fontStyle: hot ? 'italic' : 'normal'}}>{r.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
