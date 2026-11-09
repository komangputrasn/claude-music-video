/**
 * Swing · shot 4 (local 208–276): "I'm cancelling every last thing on a plan."
 * Left: the Guy on the flip phone, hammer up, barking "CANCEL" at each hit. Right: a giant green-backlit flip-phone
 * LCD "MY PLANS" list; every subscription gets a red CANCELLED stamp slammed on the beat / sung word, the list scrolls,
 * the monthly total counts down to $0.00 on "plan" — then a smug "Are you sure?" pops up (bridge into Cancel).
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {SparkleField, Glow} from '../../lib/three/fx';
import {Guy} from '../../lib/characters/Guy';
import {HeldHammer} from '../../lib/props';
import {Stamp, stampSlam, Dialog} from '../../lib/ui';
import {lerp, noise1, popIn} from '../../lib/time';
import {C, FONTS} from '../../lib/palette';
import {T, V3, clamp, smooth} from './common';
import {RoomAfter, toWorld} from './Room';
import {HERO_POS, HERO_ROT, heroPose, hammerHeadL} from './PhoneShot';
import {EarPhone, earPhoneScreen} from './EarPhone';
import {CutEffect} from '../../overlays/CutFlash';

export const PLANS: {name: string; price: number; per: string}[] = [
  {name: 'Pillow Premium', price: 4.99, per: '/night'},
  {name: 'INKSURE+', price: 12.99, per: '/mo'},
  {name: 'FeedMe Plus', price: 9.99, per: '/mo'},
  {name: 'Seat Heat Platinum', price: 19.99, per: '/mo'},
  {name: 'Speed Pack', price: 14.99, per: '/mo'},
  {name: 'Face Plus', price: 6.99, per: '/mo'},
  {name: 'OmniStore Prime-ish', price: 14.98, per: '/mo'},
];

/** contact frame of each stamp: "cancelling" downbeat, the off-beat, then the words every / last / thing / on / plan */
export const STAMP_HITS = [209.5, 217.5, T.every + 0.5, T.last, T.thing, T.on, T.plan];
const SLAM = 13; // frames per slam; contact at ~0.38
const slamStart = (i: number) => STAMP_HITS[i] - SLAM * 0.38;
const slamP = (f: number, i: number) => clamp((f - slamStart(i)) / SLAM, 0, 1);

/** how many stamps have made contact by frame f (fractional for smoothing) */
const stampedCount = (f: number) => STAMP_HITS.filter((h) => f >= h).length;

const ROW_H = 96;
const VISIBLE = 5;
const LCD = {x: 860, y: 70, w: 960, h: 660};

const PhoneLCD: React.FC<{f: number}> = ({f}) => {
  const n = stampedCount(f);
  // scroll so the row being stamped stays in view (smoothly, ~6 frames per step)
  let scroll = 0;
  for (let i = 0; i < PLANS.length; i++) {
    const target = Math.max(0, Math.min(PLANS.length - VISIBLE, i - 2));
    const prev = Math.max(0, Math.min(PLANS.length - VISIBLE, i - 3));
    const k = smooth((f - (STAMP_HITS[i] - 9)) / 6);
    if (f >= STAMP_HITS[i] - 9) scroll = lerp(prev, target, k);
  }
  const remaining = PLANS.reduce((s, p, i) => s + (f >= STAMP_HITS[i] ? 0 : p.price), 0);
  const allDone = n === PLANS.length;
  const totalPop = popIn(f, T.plan + 2, 8);
  const inK = popIn(f, 206, 9);
  // panel kick on each impact
  let kick = 0;
  for (const h of STAMP_HITS) if (f >= h) kick = Math.max(kick, Math.exp(-(f - h) / 2.2));
  const kx = kick * 10 * noise1(f * 3, 4), ky = kick * 8 * noise1(f * 3, 9);

  return (
    <div style={{position: 'absolute', left: LCD.x + kx, top: LCD.y + ky, width: LCD.w, height: LCD.h,
      transform: `scale(${inK}) rotate(${-1.5 + kick * 0.6}deg)`, transformOrigin: '50% 50%'}}>
      {/* silver phone bezel */}
      <div style={{position: 'absolute', inset: 0, borderRadius: 46,
        background: 'linear-gradient(160deg,#f4f7fb 0%,#b9c2cf 38%,#e6ebf2 55%,#8f99a8 100%)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.55), inset 0 2px 0 #fff, inset 0 -3px 6px rgba(0,0,0,0.35)'}} />
      <div style={{position: 'absolute', left: 26, top: 14, right: 26, height: 30, fontFamily: FONTS.web, fontWeight: 700,
        fontStyle: 'italic', fontSize: 22, color: '#5a6476', letterSpacing: 3, textAlign: 'center'}}>CELLTEK</div>
      {/* green backlit LCD */}
      <div style={{position: 'absolute', left: 34, top: 50, right: 34, bottom: 34, borderRadius: 18, overflow: 'hidden',
        background: 'radial-gradient(120% 90% at 50% 40%, #c8f58a 0%, #9fdc5c 60%, #7cbf40 100%)',
        boxShadow: 'inset 0 4px 14px rgba(0,40,0,0.55)', fontFamily: FONTS.mono, color: '#173a10'}}>
        {/* header */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 74, background: '#173a10', color: '#bff27a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', fontSize: 38, fontWeight: 700}}>
          <span>MY PLANS</span>
          <span style={{fontSize: 30}}>{allDone ? 'ALL CANCELLED' : `${PLANS.length - n} ACTIVE`}</span>
        </div>
        {/* rows */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 84, height: ROW_H * VISIBLE, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: -scroll * ROW_H}}>
            {PLANS.map((p, i) => {
              const sp = slamP(f, i);
              const s = stampSlam(sp);
              const hit = f >= STAMP_HITS[i];
              const cur = !hit && i === n;
              return (
                <div key={p.name} style={{position: 'relative', height: ROW_H, display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '0 30px', fontSize: 40, fontWeight: 700,
                  borderBottom: '3px dashed rgba(23,58,16,0.35)',
                  background: cur ? 'rgba(23,58,16,0.16)' : 'transparent', opacity: hit ? 0.55 + 0.45 * s.alpha * 0 : 1}}>
                  <span style={{textDecoration: hit ? 'line-through' : 'none', textDecorationThickness: 4}}>{cur ? '> ' : '  '}{p.name}</span>
                  <span style={{fontSize: 34}}>${p.price.toFixed(2)}{p.per}</span>
                  {sp > 0 ? (
                    <Stamp text="CANCELLED" progress={sp} x={LCD.w / 2 - 60 + (i % 2 ? 70 : -50)} y={ROW_H / 2} size={40}
                      rotation={i % 2 ? -6 : -10} seed={i + 3} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {/* total */}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, background: 'rgba(23,58,16,0.88)',
          color: allDone ? '#ffffff' : '#bff27a', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 30px', fontSize: 40, fontWeight: 700}}>
          <span>TOTAL</span>
          <span style={{transform: `scale(${allDone ? totalPop * 1.15 : 1})`, transformOrigin: 'right center',
            textShadow: allDone ? '0 0 18px #9BFF3A' : 'none'}}>${remaining.toFixed(2)}/mo</span>
        </div>
      </div>
    </div>
  );
};

export const CancelShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  // bark "CANCEL" at every stamp
  let bark = 0;
  for (const h of STAMP_HITS) if (f >= h - 3) bark = Math.max(bark, Math.exp(-Math.max(0, f - h + 3) / 5));
  const pose = heroPose(f, 0.15 + 0.85 * bark);
  const poseYell = {...pose, expression: (bark > 0.45 ? 'yell' : 'determined') as 'yell' | 'determined', expressionMix: 0};
  const head = toWorld(HERO_POS, HERO_ROT, hammerHeadL(pose));
  const kick = bark * 0.03;
  const drift = smooth((f - 208) / 68);
  const cam: {position: V3; target: V3; fov: number} = {
    position: toWorld(HERO_POS, HERO_ROT, [lerp(0.2, 0.28, drift) + kick * noise1(f * 2, 3), 1.36 + kick * noise1(f * 2, 5), lerp(1.65, 1.5, drift)]),
    target: toWorld(HERO_POS, HERO_ROT, [0.62, 1.26, 0]),
    fov: 46,
  };
  const keyPos: V3 = toWorld(HERO_POS, HERO_ROT, [0.5, 1.6, 1.2]);
  const sure = popIn(f, 263, 9);
  return (
    <AbsoluteFill>
      <Stage background={C.night} env="night" lens={{vignette: 0.45, grain: 0.04, saturation: 1.12}}>
        <CameraRig position={cam.position} target={cam.target} fov={cam.fov} />
        <RoomAfter f={f} cops={1} keyPos={keyPos} keyIntensity={2.3}>
          <Guy position={HERO_POS} rotation={[0, HERO_ROT, 0]} pose={poseYell}
            rightHand={<EarPhone open={1} screenLines={['MY PLANS', '> CANCEL ALL']} softKeys={['Back', 'OK']} extText="CALL 0:12" />}
            leftHand={<HeldHammer glow={0.4 + 0.4 * bark} />} />
          <pointLight position={earPhoneScreen(pose, HERO_POS, HERO_ROT)} color="#9dff5a" intensity={0.05} distance={0.8} decay={2} />
          <Glow position={earPhoneScreen(pose, HERO_POS, HERO_ROT)} size={0.14} color="#9dff5a" intensity={0.25 + 0.2 * bark} />
        </RoomAfter>
        <SparkleField count={8} seed={41} area={[0.4, 0.5, 0.3]} position={head} time={t} size={0.05} intensity={1.4} />
      </Stage>
      <PhoneLCD f={f} />
      {sure > 0 ? (
        <Dialog kind="question" title="OmniStore Care" heading="Are you sure?" message="Cancellation is a 3,000-page process. Page 1 of 3,000."
          buttons={['Yes', 'Stay subscribed']} defaultButton={1} aquaButton={1} width={520}
          x={1340} y={400} anchor="center" scale={1.55 * sure} />
      ) : null}
      {STAMP_HITS.map((h, i) => (Math.abs(f - h) < 6 ? <CutEffect key={i} style="flash" k={f - h} strength={0.18} seed={120 + i} /> : null))}
    </AbsoluteFill>
  );
};
