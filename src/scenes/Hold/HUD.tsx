/**
 * 2D layers for Hold: the "OmniStore Customer Care — please hold" window (EQ driven by the real audio bands, caller
 * counter, marquee), and the pillow's soft aqua speech bubble ("..." typing, then "Is that you?" word by word).
 */
import React from 'react';
import * as THREE from 'three';
import {Win} from '../../lib/ui';
import {bandsAt, popIn} from '../../lib/time';
import {C, FONTS} from '../../lib/palette';
import {SCENE_FROM, T, clamp, smooth, V3} from './common';

/** project a world point to 1920x1080 px for a camera {position, target, fov} */
export const projectPx = (cam: {position: V3; target: V3; fov: number}, p: V3): [number, number] => {
  const c = new THREE.PerspectiveCamera(cam.fov, 1920 / 1080, 0.1, 500);
  c.position.set(...cam.position);
  c.lookAt(new THREE.Vector3(...cam.target));
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return [(v.x * 0.5 + 0.5) * 1920, (-v.y * 0.5 + 0.5) * 1080];
};

export const HoldWindow: React.FC<{f: number; opacity: number}> = ({f, opacity}) => {
  if (opacity <= 0.01) return null;
  const stopped = f >= T.stopped;
  const fe = stopped ? Math.round(T.stopped) : f; // everything freezes on "stopped"
  const bands = bandsAt(SCENE_FROM + fe);
  const inK = popIn(f, 2, 10);
  const caller = '2,147,483,647';
  const marq = 'Your call is important to us.   Please continue to hold.   Your call is important to us.   ';
  const off = ((fe * 3.2) % 520);
  return (
    <div style={{position: 'absolute', left: 84, top: 70, opacity, transform: `scale(${1.18 * inK})`, transformOrigin: 'top left',
      filter: stopped ? `grayscale(${clamp((f - T.stopped) / 12, 0, 1)})` : 'none'}}>
      <Win title="OmniStore Customer Care" width={500} height={262} icon="info" active={!stopped}>
        <div style={{padding: '12px 16px', fontFamily: FONTS.ui, fontSize: 17, color: '#16162a'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: 700}}>{stopped ? '❚❚  Hold music stopped' : '♪  Now playing: hold_music_04.mid'}</span>
          </div>
          {/* equalizer */}
          <div style={{display: 'flex', gap: 4, height: 54, alignItems: 'flex-end', margin: '10px 0 8px', padding: '4px 6px',
            background: '#0b0b24', border: '2px inset #b8b4a8'}}>
            {bands.map((b, i) => {
              const v = stopped ? Math.max(0.04, b * (1 - clamp((f - T.stopped) / 4, 0, 1))) : b;
              const h = Math.round(v * 10);
              return (
                <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column-reverse', gap: 1}}>
                  {Array.from({length: 10}, (_, k) => (
                    <div key={k} style={{height: 3.4, background: k < h ? (k > 7 ? '#ff4fb8' : k > 5 ? '#ffd23a' : '#9bff3a') : '#1c1c3c'}} />
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: FONTS.comic, fontSize: 18, color: C.grape, height: 26}}>
            <div style={{transform: `translateX(${-off}px)`}}>{marq}{marq}</div>
          </div>
          <div style={{marginTop: 8, display: 'flex', alignItems: 'center', gap: 10}}>
            <span>You are caller #</span>
            <span style={{fontFamily: FONTS.lcd, background: '#000', color: '#ff3b2f', padding: '2px 8px', letterSpacing: 2, fontSize: 19,
              border: '2px inset #888'}}>{caller}</span>
          </div>
        </div>
      </Win>
    </div>
  );
};

/** soft aqua speech bubble anchored at a pixel point (tail tip), typing dots then the words */
export const PillowBubble: React.FC<{f: number; x: number; y: number}> = ({f, x, y}) => {
  const typingFrom = T.said - 2;
  const k = popIn(f, typingFrom, 12);
  if (k <= 0) return null;
  const words: [string, number][] = [['Is', T.is], ['that', T.that], ['you?', T.you]];
  const anyWord = f >= T.is - 1;
  const glow = 0.5 + 0.5 * Math.sin(f * 0.18);
  const w = anyWord ? 560 : 200;
  const h = 150;
  return (
    <div style={{position: 'absolute', left: x - 70, top: y - h - 46, width: w, height: h, transform: `scale(${k})`,
      transformOrigin: '70px 196px', transition: 'none'}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 75,
        background: 'radial-gradient(120% 140% at 30% 20%, rgba(220,250,255,0.96) 0%, rgba(140,230,255,0.92) 45%, rgba(25,198,255,0.85) 100%)',
        boxShadow: `0 0 ${40 + 30 * glow}px rgba(25,198,255,${0.55 + 0.25 * glow}), inset 0 6px 14px rgba(255,255,255,0.8), inset 0 -10px 20px rgba(0,90,140,0.35)`,
        border: '3px solid rgba(255,255,255,0.85)'}} />
      {/* tail */}
      <div style={{position: 'absolute', left: 46, top: h - 12, width: 0, height: 0, borderLeft: '22px solid transparent',
        borderRight: '22px solid transparent', borderTop: '50px solid rgba(40,200,255,0.9)', transform: 'rotate(18deg)',
        filter: 'drop-shadow(0 0 12px rgba(25,198,255,0.8))'}} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22,
        fontFamily: FONTS.web, fontStyle: 'italic', fontWeight: 700, fontSize: 70, color: '#06345a',
        textShadow: '0 2px 0 rgba(255,255,255,0.8), 0 0 18px rgba(255,255,255,0.7)'}}>
        {anyWord
          ? words.map(([wd, t]) => {
              const a = smooth((f - (t - 2)) / 5);
              return (
                <span key={wd} style={{opacity: a, transform: `translateY(${(1 - a) * 14}px)`, display: 'inline-block'}}>{wd}</span>
              );
            })
          : [0, 1, 2].map((i) => {
              const b = 0.5 + 0.5 * Math.sin(f * 0.35 - i * 1.1);
              return <span key={i} style={{display: 'inline-block', width: 22, height: 22, borderRadius: 11, background: '#06345a',
                opacity: 0.35 + 0.65 * b, transform: `translateY(${-8 * b}px)`}} />;
            })}
      </div>
    </div>
  );
};

/** VCR-style on-screen display on "stopped": a blocky "❚❚ PAUSE" + frozen counter, jittering slightly, fading with the drain */
export const PauseOSD: React.FC<{f: number; from: number; fadeFrom: number; fadeLen: number}> = ({f, from, fadeFrom, fadeLen}) => {
  if (f < from) return null;
  const a = Math.min(1, (f - from + 1) / 2) * (1 - clamp((f - fadeFrom) / fadeLen, 0, 1));
  if (a <= 0.01) return null;
  const blink = Math.floor((f - from) / 8) % 2 === 0 ? 1 : 0.55;
  const jx = ((f * 7) % 3) - 1;
  const txt: React.CSSProperties = {fontFamily: FONTS.mono, fontWeight: 700, color: '#f2f6ff', letterSpacing: 4,
    textShadow: '3px 3px 0 rgba(10,10,40,0.85), 0 0 14px rgba(140,200,255,0.6)'};
  return (
    <div style={{position: 'absolute', right: 120 + jx, top: 86, opacity: a, textAlign: 'right'}}>
      <div style={{...txt, fontSize: 64, opacity: blink}}>❚❚ PAUSE</div>
      <div style={{...txt, fontSize: 30, marginTop: 6}}>HOLD 00:47:12</div>
    </div>
  );
};
