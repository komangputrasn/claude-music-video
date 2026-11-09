/**
 * Playground: Y2K UI kit in 3D. Render: node scripts/still.mjs play UI3D --frames=0,30,70,100,118,135,160,175,215
 *  0-59    tunnel POV: pop-ups stream toward the camera on a blue background
 *  60-139  wide 3/4: hero FeedMe Plus pop-up, giant cursor flies in and clicks the disabled Cancel; CANCELLED stamp slams (~124)
 *  140-199 fisheye close-up: hand cursor clicks the aqua Upgrade button (ripple)
 *  200-239 hourglass + 3D banners
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {lerp, ramp} from '../lib/time';
import {C} from '../lib/palette';
import {Banner3D, Popup3D, PopupTunnel3D, Stamp3D, popupButton3D, Window3D} from '../lib/ui/Popup3D';
import {Cursor3D, Hourglass3D} from '../lib/ui/Cursor3D';
import {clickAt} from '../lib/ui/Cursor';
import type {DialogSpec, WindowSpec} from '../lib/ui/widgets';
import {progressDL, pushButtonDL} from '../lib/ui/widgets';
import {font} from '../lib/ui/dl';
import {UIF} from '../lib/ui/theme';

export const duration = 240;

const LOCK: DialogSpec = {kind: 'lock', title: 'FeedMe Plus', message: 'Breakfast is for PLUS members only.', buttons: ['Upgrade', 'Cancel'], aquaButton: 0,
  disabledButtons: [1]};

const CANCEL_PAGE: WindowSpec = {
  title: 'OmniStore - Cancel Subscription', width: 520, height: 300, icon: 'question',
  body: [
    {t: 'text', x: 18, y: 34, text: 'Page 37 of \u221E', font: font(22, UIF.ui, 'bold'), fill: '#0A3FD8'},
    {t: 'text', x: 18, y: 66, text: 'Are you sure you are sure you want to cancel?', font: font(15, UIF.ui), fill: '#101010'},
    {t: 'text', x: 18, y: 90, text: 'Please re-confirm on the next 4,000 pages.', font: font(15, UIF.ui), fill: '#101010'},
    progressDL(18, 112, 476, 22, 0.02),
    {t: 'text', x: 18, y: 160, text: 'Progress toward cancellation: 0.0001%', font: font(13, UIF.verdana), fill: '#555'},
    pushButtonDL(270, 206, 110, 32, 'Continue', {isDefault: true}),
    pushButtonDL(392, 206, 110, 32, 'Give Up'),
  ],
};

export default function UI3D() {
  const f = useCurrentFrame();
  const shot = f < 60 ? 0 : f < 140 ? 1 : f < 200 ? 2 : 3;
  const W = 2.2;
  const cancel = popupButton3D(LOCK, 1, W);
  const upgrade = popupButton3D(LOCK, 0, W);
  // cursor path (shot 1): fly in from bottom right to Cancel, click at 108
  const ct = ramp(f, 66, 104);
  const cur1: [number, number, number] = [lerp(2.6, cancel[0], ct), lerp(-2.2, cancel[1], ct), lerp(1.6, cancel[2] + 0.12, ct)];
  const hover = f >= 104 && f < 140 ? 1 : undefined;
  const stampP = ramp(f, 122, 136, (t) => t);
  // shot 2: hand onto Upgrade
  const ht = ramp(f, 140, 160);
  const cur2: [number, number, number] = [lerp(1.8, upgrade[0], ht), lerp(-1.5, upgrade[1] - 0.02, ht), lerp(0.9, upgrade[2] + 0.1, ht)];
  const upPressed = f >= 164 && f < 170 ? 0 : undefined;

  let cam: {position: [number, number, number]; target: [number, number, number]; fov: number; roll?: number};
  if (shot === 0) cam = {position: [Math.sin(f * 0.03) * 0.4, Math.cos(f * 0.02) * 0.3, 3], target: [0, 0, -10], fov: 70, roll: Math.sin(f * 0.02) * 0.12};
  else if (shot === 1) {
    const a = lerp(-0.42, -0.18, ramp(f, 60, 140));
    cam = {position: [Math.sin(a) * 4.2, 0.45, Math.cos(a) * 4.2], target: [0.1, -0.1, 0], fov: 42};
  } else if (shot === 2) cam = {position: [upgrade[0] + 0.55, upgrade[1] - 0.25, 1.15], target: [upgrade[0] + 0.1, upgrade[1], 0], fov: 78, roll: -0.08};
  else cam = {position: [lerp(-0.6, 0.6, ramp(f, 200, 240)), 0.3, 3.2], target: [0, 0.1, 0], fov: 45};

  const heroSpec: DialogSpec = {...LOCK, hover: shot === 1 ? hover : shot === 2 && ht > 0.95 ? 0 : undefined, pressed: upPressed};
  return (
    <AbsoluteFill>
      <Stage background={C.y2kBlue} env="chrome" fog={{color: '#1E5BFF', near: 10, far: 46}} bloom={{strength: 0.6, radius: 0.5, threshold: 0.9}}>
        <CameraRig {...cam} />
        <hemisphereLight args={['#dff2ff', '#20307a', 1.1]} />
        <directionalLight position={[3, 4, 5]} intensity={2.4} />
        <directionalLight position={[-4, -1, 2]} intensity={0.8} color={C.aqua} />

        <PopupTunnel3D frame={f} seed="ui3d" count={shot === 0 ? 56 : 18} radius={shot === 0 ? 3.6 : 5} near={shot === 0 ? 2 : -3} speed={0.3}
          width={shot === 0 ? 2.2 : 1.8} length={44} />

        {shot === 1 || shot === 2 ? (
          <>
            <Popup3D spec={heroSpec} width={W} position={[0, 0, 0]} rotation={[0, 0, 0]} pr={3} sheen={lerp(-0.2, 1.2, ramp(f, 140, 158, (t) => t))}>
              <Stamp3D progress={stampP} width={1.5} position={[0, -0.02, 0.06]} rotation={-12} />
            </Popup3D>
            {shot === 1 ? <Cursor3D kind="arrow" size={0.7} position={cur1} rotation={[0, -0.25, 0]} click={clickAt(f, 108, 14)} /> : null}
            {shot === 2 ? <Cursor3D kind="hand" size={0.42} position={cur2} rotation={[0, -0.15, 0]} click={clickAt(f, 162, 14)} /> : null}
            <Banner3D variant="click" frame={f} width={2.4} position={[-1.7, 1.45, -1.0]} rotation={[0, 0.45, 0.08]} />
            <Banner3D variant="buy" frame={f} width={2.4} position={[2.0, -1.35, -1.2]} rotation={[0, -0.4, -0.06]} />
          </>
        ) : null}
        {shot === 3 ? (
          <>
            <Hourglass3D size={1.6} position={[0, 0.15, 0]} rot={Math.floor(f / 20) % 2 ? ramp(f % 20, 0, 10) * 180 : 0} sand={((f - 200) % 40) / 40}
              rotation={[0.1, f * 0.03, 0]} />
            <Banner3D variant="free" frame={f} width={2.2} position={[-1.6, 1.0, -0.6]} rotation={[0, 0.45, 0.05]} />
            <Banner3D variant="visitor" frame={f} width={2.2} position={[1.7, -0.9, -0.5]} rotation={[0, -0.45, -0.05]} />
            <Banner3D variant="upgrade" frame={f} width={2.2} position={[1.5, 1.1, -1.4]} rotation={[0, -0.3, 0.04]} />
            <Window3D spec={CANCEL_PAGE} width={1.9} position={[-1.75, -0.35, -0.9]} rotation={[0, 0.5, -0.03]} sheen={lerp(-0.2, 1.2, ramp(f, 205, 225, (t) => t))} />
            <Popup3D spec={{kind: 'warning', title: 'Are you sure?', message: 'Really?', buttons: ['Yes', 'No']}} width={1.2} position={[1.9, 0.0, -2.2]}
              rotation={[0, -0.6, 0]} opacity={1 - ramp(f, 205, 235)} />
            <Cursor3D kind="arrow" size={0.9} position={[-1.3, -0.5, 0.6]} rotation={[0.2, 0.5, 0.3]} click={clickAt(f, 222, 14)} />
          </>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
