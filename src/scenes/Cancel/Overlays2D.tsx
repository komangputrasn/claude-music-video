// 2D layers for the Cancel scene: 2002 cable-news ticker, the DENIED stamp, the "Page Properties" dialog where the
// cancel page gets named I-L-I-A-D on the beats, and internal flashes. All pure functions of the scene-local frame.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Win, Stamp, Cursor, PushButton, ProgressBar, Icon, clickAt} from '../../lib/ui';
import {CutEffect} from '../../overlays/CutFlash';
import {C, FONTS} from '../../lib/palette';
import {popIn, lerp} from '../../lib/time';
import {SHOT, W, B} from './times';
import {lin, smooth, easeOutCubic} from './kit';
import {IMPACT, PASSED_F} from './Plaza';

// ------------------------------------------------------------------ news ticker (A2 → B1)
const T_PASS = '★ CONGRESS PASSES "CLICK TO CANCEL" RULE ★ CANCEL ANY SUBSCRIPTION IN ONE CLICK ★ CONSUMERS REJOICE ★ CONFETTI SALES UP 400% ';
const T_COURT = '★ COURT BLOCKS "CLICK TO CANCEL" ★ CANCEL BUTTON REMAINS 37 PAGES DEEP ★ PLEASE HOLD ★ ';

export const NewsTicker: React.FC<{f: number}> = ({f}) => {
  const court = f >= Math.round(W.court) - 2;
  const inK = easeOutCubic(lin(f, PASSED_F - 2, PASSED_F + 8));
  const outK = lin(f, SHOT.B2 - 6, SHOT.B2);
  if (inK <= 0 || outK >= 1) return null;
  const txt = court ? T_COURT : T_PASS;
  const x = 345 - (f - (court ? W.court - 2 : PASSED_F - 2)) * 9;
  const flash = court && Math.floor(f / 4) % 2 === 0;
  return (
    <div style={{position: 'absolute', left: 0, top: lerp(-90, 34, inK) - outK * 140, width: 1920, height: 66, fontFamily: FONTS.heavy}}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#1b2f8f, #0a1450)', borderTop: '3px solid #9fc6ff',
        borderBottom: '4px solid #ffcc00', boxShadow: '0 6px 18px rgba(0,0,20,0.5)', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: x, top: 10, whiteSpace: 'nowrap', fontSize: 38, color: '#fff', letterSpacing: 1,
          textShadow: '2px 2px 0 #000a40'}}>
          {txt + txt}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, top: -6, height: 78, width: 330, background: court ? (flash ? '#ffcc00' : C.alertRed) : C.alertRed,
        color: court && flash ? '#7a0000' : '#fff', fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0 14px 14px 0', boxShadow: '4px 0 12px rgba(0,0,0,0.45)', fontStyle: 'italic'}}>
        {court ? 'UPDATE' : 'BREAKING NEWS'}
      </div>
      <div style={{position: 'absolute', right: 26, top: -42, fontSize: 26, color: '#fff', fontFamily: FONTS.ui, fontWeight: 'bold',
        textShadow: '1px 1px 2px #000'}}>
        OmniNews 24/7 &nbsp;
        <span style={{background: C.alertRed, padding: '2px 10px', borderRadius: 4}}>LIVE</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ DENIED
export const Denied: React.FC<{f: number}> = ({f}) => {
  const p = lin(f, IMPACT + 1, IMPACT + 13);
  if (p <= 0 || f >= SHOT.B2b) return null;
  const fade = 1 - lin(f, SHOT.B2b - 8, SHOT.B2b);
  return (
    <Stamp text="DENIED" progress={p} x={960} y={f < SHOT.B2 ? 300 : 250} scale={f < SHOT.B2 ? 3.4 : 2.4} rotation={-11} seed={7} opacity={fade}
      color={C.alertRed} />
  );
};

// ------------------------------------------------------------------ Page Properties dialog (D2/D3)
const LETTERS = 'ILIAD';
const TYPE_F = [342, 357, 374, 390, 407];
export const PageProps: React.FC<{f: number}> = ({f}) => {
  if (f < W.named - 3 || f >= SHOT.E1) return null;
  const pop = popIn(f, W.named - 3, 10);
  const typed = TYPE_F.filter((tf) => f >= tf).length;
  const selected = f >= 336 && typed === 0; // double-clicked the old title
  const gold = lin(f, 407, 410);
  const caretOn = Math.floor(f / 8) % 2 === 0;
  // camera: snap-zoom onto the Title field on the downbeat (D3)
  const zoom = smooth(lin(f, SHOT.D3 - 2, SHOT.D3 + 5));
  // each letter lands on a beat with a little zoom punch
  const lastType = TYPE_F.filter((tf) => f >= tf).pop();
  const punch = lastType !== undefined ? 0.06 * Math.exp(-(f - lastType) / 4) : 0;
  const s = lerp(1.35, 3.1, zoom) * pop * (1 + punch);
  const W_ = 1040, H_ = 470;
  const fieldX = 250, fieldY = 167; // start of the Title text inside the window (px)
  const pf0 = [960 + (fieldX - W_ / 2) * 1.35, 520 + (fieldY - H_ / 2) * 1.35];
  const pf1 = [770, 440];
  const tx = lerp(pf0[0], pf1[0], zoom) - fieldX;
  const ty = lerp(pf0[1], pf1[1], zoom) - fieldY;
  const origin = `${fieldX}px ${fieldY}px`;
  // cursor path (window px): to the Title field (double-click on "named"), then it waits there
  const cx = lerp(900, 330, easeOutCubic(lin(f, W.named + 2, 334)));
  const cy = lerp(420, 172, easeOutCubic(lin(f, W.named + 2, 334)));
  const rowLabel: React.CSSProperties = {position: 'absolute', left: 26, fontSize: 21, color: '#101010', fontFamily: FONTS.ui};
  const field: React.CSSProperties = {position: 'absolute', left: 170, height: 34, background: '#fff', border: '2px solid #7f9db9', fontSize: 22,
    fontFamily: FONTS.ui, display: 'flex', alignItems: 'center', paddingLeft: 8, boxSizing: 'border-box'};
  return (
    <div style={{position: 'absolute', left: tx, top: ty, width: W_, height: H_, transform: `scale(${s})`, transformOrigin: origin}}>
      <Win title="Page Properties - OmniStore SiteBuilder 2002" width={W_} height={H_} icon="info" sheen={lerp(-0.2, 1.2, lin(f, W.named, W.named + 16))}>
        {/* tabs */}
        <div style={{position: 'absolute', left: 14, top: 12, display: 'flex', gap: 2, fontFamily: FONTS.ui, fontSize: 18}}>
          {['General', 'Background', 'Margins', 'Custom', 'Language'].map((tb, i) => (
            <div key={tb} style={{padding: '5px 16px', background: i === 0 ? C.windowBeige : '#dcd8c8', border: '1px solid #919b9c', borderBottom: i === 0 ? 'none' : '1px solid #919b9c',
              borderRadius: '5px 5px 0 0', marginTop: i === 0 ? 0 : 3, boxShadow: i === 0 ? 'inset 0 3px 0 #f7b03a' : 'none'}}>{tb}</div>
          ))}
        </div>
        <div style={{position: 'absolute', left: 14, top: 46, right: 14, bottom: 70, border: '1px solid #919b9c', background: '#f6f4ec'}}>
          <div style={{...rowLabel, top: 24}}>Location:</div>
          <div style={{position: 'absolute', left: 170, top: 24, fontSize: 21, fontFamily: FONTS.ui, color: '#333'}}>http://www.omnistore.com/account/cancel-page.html</div>
          <div style={{...rowLabel, top: 76, fontWeight: 'bold'}}>Title:</div>
          <div style={{...field, top: 70, width: 560, boxShadow: zoom > 0 ? '0 0 0 3px rgba(108,155,246,0.8)' : 'none'}}>
            {typed === 0 ? (
              <span style={{background: selected ? '#316ac5' : 'transparent', color: selected ? '#fff' : '#101010', padding: '0 2px'}}>Cancel Membership</span>
            ) : (
              <span style={{fontFamily: gold > 0 ? FONTS.papyrus : FONTS.ui, fontWeight: 'bold', fontSize: gold > 0 ? 26 : 23, letterSpacing: 2,
                color: gold > 0 ? '#8a5a00' : '#101010', textShadow: gold > 0 ? `0 0 ${10 * gold}px #ffc23a, 0 0 2px #fff6c0` : 'none'}}>
                {LETTERS.slice(0, typed).split('').map((ch, i) => {
                  const k = popIn(f, TYPE_F[i], 7);
                  return <span key={i} style={{display: 'inline-block', transform: `scale(${Math.max(0.01, k)}) translateY(${(1 - k) * -8}px)`}}>{ch}</span>;
                })}
              </span>
            )}
            {typed > 0 && caretOn ? <span style={{width: 2, height: 24, background: '#101010', marginLeft: 2}} /> : null}
          </div>
          <div style={{...rowLabel, top: 128}}>Font:</div>
          <div style={{...field, top: 122, width: 300, justifyContent: 'space-between', paddingRight: 0}}>
            <span style={{fontFamily: FONTS.papyrus, fontSize: 22, fontWeight: 'bold'}}>Papyrus</span>
            <span style={{width: 30, height: 30, background: 'linear-gradient(#cfe0ff,#7aa2ec)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14}}>{'▼'}</span>
          </div>
          <div style={{...rowLabel, top: 180}}>Length:</div>
          <div style={{position: 'absolute', left: 170, top: 180, fontSize: 21, fontFamily: FONTS.ui}}>15,693 lines (24 books)</div>
          <div style={{...rowLabel, top: 226, color: '#a8a492'}}>
            <span style={{display: 'inline-block', width: 16, height: 16, border: '2px solid #a8a492', marginRight: 10, verticalAlign: -2}} />
            Make this page easy to find (requires PLUS)
          </div>
        </div>
        <PushButton label="OK" isDefault x={W_ - 330} y={H_ - 100} width={140} height={40} />
        <PushButton label="Cancel" disabled x={W_ - 176} y={H_ - 100} width={140} height={40} />
      </Win>
      {f < SHOT.D3 ? <Cursor kind="hand" x={cx} y={cy} click={Math.max(clickAt(f, 335, 6), clickAt(f, 339, 6))} size={56} /> : null}
    </div>
  );
};


// ------------------------------------------------------------------ the cancellation progress window (C1–C2): it goes BACKWARDS on every beat
const PROG_BEATS = B.filter((b) => b >= SHOT.C1 && b < SHOT.D1);
const PROG_VALS = [0.42, 0.37, 0.31, 0.26, 0.18, 0.12, 0.07, 0.03];
const PROG_ETA = ['2 minutes', '1 hour', '3 days', '9 years', '9 business years', '\u221e', '\u221e + 1', 'please hold'];
export const CancelProgress: React.FC<{f: number}> = ({f}) => {
  if (f < SHOT.C1 + 2 || f >= SHOT.D1) return null;
  const pop = popIn(f, SHOT.C1 + 2, 9);
  const out = lin(f, SHOT.D1 - 5, SHOT.D1);
  let i = 0;
  while (i + 1 < PROG_BEATS.length && f >= PROG_BEATS[i + 1] - 2) i++;
  const prev = PROG_VALS[Math.max(0, i - 1)], cur = PROG_VALS[Math.min(PROG_VALS.length - 1, i)];
  const k = easeOutCubic(lin(f, PROG_BEATS[i] - 2, PROG_BEATS[i] + 5));
  const v = i === 0 ? cur : lerp(prev, cur, k);
  const jolt = i === 0 ? 0 : Math.exp(-Math.max(0, f - PROG_BEATS[i] + 2) / 4);
  return (
    <div style={{position: 'absolute', left: 1920 - 560, top: 70 + jolt * 6, width: 500, height: 150, opacity: 1 - out,
      transform: `scale(${Math.max(0.01, pop)}) rotate(${-1.5 + jolt * 1.2}deg)`, transformOrigin: '100% 0%'}}>
      <Win title="Cancelling OmniStore Plus..." width={500} height={150} icon="info">
        <div style={{position: 'absolute', left: 14, top: 10, display: 'flex', alignItems: 'center', gap: 10}}>
          <Icon kind="warning" size={34} />
          <div style={{fontFamily: FONTS.ui, fontSize: 16, color: '#101010'}}>
            Time remaining: <b style={{color: i >= 5 ? C.alertRed : '#101010'}}>{PROG_ETA[Math.min(PROG_ETA.length - 1, i)]}</b>
          </div>
        </div>
        <ProgressBar value={v} showPercent label="Cancellation progress" width={466} height={22} x={14} y={52} />
      </Win>
    </div>
  );
};

// ------------------------------------------------------------------ the whole 2D layer
export const Overlay2D: React.FC<{f: number}> = ({f}) => {
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <NewsTicker f={f} />
      <Denied f={f} />
      <PageProps f={f} />
      <CancelProgress f={f} />
      <CutEffect style="flash" k={f - IMPACT} strength={0.9} tint="#E8FBFF" streak="#7FE6FF" seed={141} />
      <CutEffect style="flash" k={f - (SHOT.E1)} strength={1} tint="#FFF1CC" streak="#FFB347" seed={142} />
      <CutEffect style="glitch" k={f - SHOT.C1} strength={0.6} seed={143} />
      <CutEffect style="flash" k={f - SHOT.D1} strength={0.35} tint="#FFE3C4" streak="#FF8FB8" seed={144} />
    </AbsoluteFill>
  );
};

