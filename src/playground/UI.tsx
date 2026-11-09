/**
 * Playground: Y2K UI kit in 2D (HTML/SVG layers). Render: node scripts/still.mjs play UI --frames=0,34,60,96,110,150,190,240
 *  0-120   showcase: CARD DECLINED (arrow clicks OK), FeedMe Plus lock dialog (hand tries the disabled Cancel), boot progress,
 *          banners, gel + push buttons, icons, cursors, starburst, hit counter, marquee
 *  ~96     CANCELLED stamp slams onto the lock dialog
 *  130-    pop-up storm builds over everything, then CANCELLED stamps slam onto every pop-up
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {lerp, ramp} from '../lib/time';
import {Desktop} from '../lib/ui/Desktop';
import {Dialog, dialogButtonCenter, dialogSize, Win} from '../lib/ui/Win';
import type {DialogSpec} from '../lib/ui/widgets';
import {AquaButton, Icon, ProgressBar, PushButton} from '../lib/ui/Widgets2D';
import {Cursor, clickAt} from '../lib/ui/Cursor';
import {BannerAd, HitCounter, Marquee, Starburst} from '../lib/ui/Ads2D';
import {PopupStorm} from '../lib/ui/PopupStorm';
import {ICON_KINDS} from '../lib/ui/icons';

export const duration = 260;

const CARD: DialogSpec = {
  kind: 'error', title: 'INKSURE+ Printer Service', heading: 'CARD DECLINED', message: 'Printing disabled by INKSURE+.\nYour card ending in 0315 was declined.',
  buttons: ['OK', 'Retry'],
};
const LOCK: DialogSpec = {
  kind: 'lock', title: 'FeedMe Plus', message: 'Breakfast is for PLUS members only.', buttons: ['Upgrade', 'Cancel'], aquaButton: 0, disabledButtons: [1],
};
const BOOT: DialogSpec = {kind: 'info', title: 'Y2K OS Setup', message: 'Your subscription to EVERYTHING is now active.', progressLabel: 'Loading your life...', buttons: ['Buy Now'], aquaButton: 0};

export default function UI() {
  const f = useCurrentFrame();
  const S = 1.25;
  // dialog placements (top-left, scaled around their top-left via origin)
  const cardXY = {x: 70, y: 90};
  const lockXY = {x: 700, y: 90};
  const bootXY = {x: 70, y: 440};
  // arrow cursor -> OK on the card dialog
  const ok = dialogButtonCenter(CARD, 0);
  const okX = cardXY.x + ok.x * S, okY = cardXY.y + ok.y * S;
  const arrowT = ramp(f, 4, 28);
  const arrowX = lerp(560, okX, arrowT), arrowY = lerp(620, okY, arrowT);
  const okClick = clickAt(f, 30, 12);
  const okPressed = f >= 30 && f < 37;
  // hand cursor -> disabled Cancel on lock dialog, then Upgrade glows
  const cancel = dialogButtonCenter(LOCK, 1);
  const cx = lockXY.x + cancel.x * S, cy = lockXY.y + cancel.y * S;
  const handT = ramp(f, 30, 52);
  const handX = lerp(1260, cx, handT), handY = lerp(720, cy + 4, handT);
  const handClick = clickAt(f, 56, 12) || clickAt(f, 70, 12);
  const progress = Math.min(0.99, ramp(f, 0, 110, (t) => t) * 0.99);
  const lockSize = dialogSize(LOCK);
  const stampP = ramp(f, 92, 106, (t) => t);
  const storm = f >= 128;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Desktop frame={f} />
      <Marquee text="WELCOME TO Y2K OS  ***  Your subscription to EVERYTHING is now active  ***  BUY NOW, FOR NOW" frame={f} x={0} y={0} width={1920} height={40} />

      <Dialog {...CARD} x={cardXY.x} y={cardXY.y} scale={S} origin="top left" pressed={okPressed ? 0 : undefined} hover={!okPressed && arrowT > 0.98 && f < 45 ? 0 : undefined}
        active={f < 40} />
      <Dialog {...LOCK} x={lockXY.x} y={lockXY.y} scale={S} origin="top left" hover={handT > 0.98 ? 1 : undefined} active={f >= 40}
        stamp={f >= 92 ? {text: 'CANCELLED', rotation: -12, size: 62} : undefined} stampProgress={f >= 92 && stampP < 1 ? stampP : undefined} />
      <Dialog {...BOOT} progress={progress} x={bootXY.x} y={bootXY.y} scale={S} origin="top left" active={false} sheen={lerp(-0.2, 1.2, ramp(f, 50, 70, (t) => t))} />

      {/* banners */}
      {(['click', 'buy', 'free', 'visitor', 'upgrade'] as const).map((v, i) => (
        <BannerAd key={v} variant={v} frame={f} x={1380} y={70 + i * 82} />
      ))}

      {/* buttons */}
      {(['aqua', 'lime', 'bubblegum', 'tangerine', 'grape'] as const).map((c, i) => (
        <AquaButton key={c} label={['Buy Now', 'Upgrade', 'Go PLUS', 'Renew', 'Subscribe'][i]} color={c} x={700 + i * 170} y={420}
          glow={c === 'aqua' ? 0.5 + 0.5 * Math.sin(f / 5) : 0} pressed={c === 'lime' && f % 40 < 8} />
      ))}
      <PushButton label="OK" isDefault x={700} y={500} />
      <PushButton label="Hover" hot x={820} y={500} />
      <PushButton label="Pressed" pressed x={940} y={500} />
      <PushButton label="Disabled" disabled x={1060} y={500} />
      <ProgressBar value={progress} label="Downloading breakfast..." showPercent x={700} y={560} width={480} />
      {ICON_KINDS.map((k, i) => (
        <Icon key={k} kind={k} size={54} x={700 + i * 62} y={630} spin={k === 'coin' || k === 'at' ? f * 9 : undefined} />
      ))}
      <Win title="My Subscriptions" icon="coin" width={468} height={196} x={1380} y={480} active={false}>
        <div style={{padding: '10px 14px', fontSize: 15}}>
          {[['Pillow Premium', '$4.99/night'], ['Breakfast PLUS', '$9.99/mo'], ['INKSURE+ Ink Insurance', '$14.99/mo'], ['Gravity Basic', 'FREE*']].map(([n, p], i) => (
            <div key={n} style={{display: 'flex', alignItems: 'center', gap: 8, height: 25}}>
              <span style={{width: 14, height: 14, border: '1px solid #1C5180', background: 'linear-gradient(#DCDCD7, #FFFFFF)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#21A121', fontWeight: 'bold'}}>{i < 3 ? '\u2714' : ''}</span>
              <span style={{flex: 1}}>{n}</span>
              <span style={{fontWeight: 'bold'}}>{p}</span>
            </div>
          ))}
          <div style={{borderTop: '1px solid #ACA899', marginTop: 6, paddingTop: 6, color: '#E2231A', fontWeight: 'bold', display: 'flex'}}>
            <span style={{flex: 1}}>Total</span><span>{'$\u221E/mo'}</span>
          </div>
        </div>
      </Win>

      <Starburst text="NEW!" x={600} y={760} size={150} rotation={f * 1.5} />
      <Starburst text="FREE" x={760} y={770} size={110} color="#9BFF3A" rotation={-f * 2} textColor="#0B6A00" />
      <HitCounter value={1 + ramp(f, 40, 60) } x={880} y={740} />
      <BannerAd variant="click" frame={f} x={1380} y={690} label="CANCEL HERE!!!" sub="(not really)" />

      {/* cursors showcase */}
      <Cursor kind="hourglass" x={1250} y={780} size={64} hourglassRot={Math.floor(f / 20) % 2 ? ramp(f % 20, 0, 8) * 180 : 0} sand={(f % 40) / 40} />

      {storm ? (
        <PopupStorm frame={f} seed="ui-play" count={34} start={130} interval={4.2} accelerate={0.6} scale={1.05} area={{x: 30, y: 50, w: 1860, h: 780}}
          stamps={{start: 214, interval: 1.2, dur: 10}} />
      ) : null}

      <Cursor kind="arrow" x={arrowX} y={arrowY} click={okClick} size={56} />
      <Cursor kind="hand" x={handX} y={handY} click={handClick} size={60} />
      {/* caption-safe zone marker (bottom 230px) */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 230, background: 'rgba(0,0,0,0.25)', borderTop: '1px dashed rgba(255,255,255,0.4)'}} />
      <div style={{position: 'absolute', left: lockXY.x, top: lockXY.y + lockSize.h * S + 8, color: '#fff', font: '14px Tahoma', opacity: 0.0}}>.</div>
    </AbsoluteFill>
  );
}
