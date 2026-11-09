// V1Bedroom 2D layers above the <Stage>: camcorder HUD (wide), fisheye lens vignette (gadget close-ups), INKSURE+
// remote-shutdown dialog, and the CARD DECLINED alert slam + Y2K "dragged error window" trail with red strobe.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CamcorderHUD} from '../../overlays/CamcorderHUD';
import {CutEffect} from '../../overlays/CutFlash';
import {Dialog} from '../../lib/ui';
import type {DialogSpec} from '../../lib/ui';
import {ramp, popIn, noise1} from '../../lib/time';
import {W, ShotId} from './timing';

const FISHEYE: React.CSSProperties = {
  background: 'radial-gradient(ellipse 62% 70% at 50% 46%, rgba(0,0,0,0) 62%, rgba(4,6,20,0.55) 80%, rgba(2,3,10,0.96) 100%)',
};

export const DECLINED_SPEC: DialogSpec = {
  kind: 'error',
  title: 'INKSURE+ Printer Service',
  heading: 'CARD DECLINED',
  message: 'Printing disabled by INKSURE+.\nYour card ending in 0315 was declined.',
  buttons: ['OK', 'Retry'],
  disabledButtons: [1],
  width: 470,
};

const shutdownSpec = (p: number, off: boolean): DialogSpec => ({
  kind: off ? 'error' : 'warning',
  title: 'INKSURE+ Remote Service',
  heading: off ? 'PRINTER OFF' : 'Payment problem',
  message: off ? 'Your printer was turned off remotely.' : 'Turning your printer off remotely...',
  progress: off ? undefined : p,
  progressLabel: off ? undefined : 'Disabling printer',
  progressColor: 'gold',
  buttons: ['OK'],
  width: 400,
});

export const Overlay2D: React.FC<{f: number; shot: ShotId}> = ({f, shot}) => {
  const layers: React.ReactNode[] = [];
  if (shot === 'wide') {
    layers.push(<CamcorderHUD key="hud" frame={f + 1590} time="AM 3:15" date="NOV 09 2002" opacity={1 - ramp(f, 46, 51)} label="SP" />);
  }
  if ((shot === 'clock' && f >= 101) || (shot === 'ink' && f >= W.ink - 1) || shot === 'card') {
    layers.push(<AbsoluteFill key="fish" style={FISHEYE} />);
  }
  // internal snap-cut hits
  if (f >= 99 && f < 108) layers.push(<CutEffect key="c1" style="flash" k={f - 101} strength={0.55} tint="#FFD0C8" streak="#FF4A3A" seed={131} />);
  if (f >= W.ink - 3 && f < W.ink + 6) layers.push(<CutEffect key="c2" style="flash" k={f - Math.round(W.ink - 1)} strength={0.6} tint="#DFF8FF" streak="#19C6FF" seed={132} />);
  if (f >= 362 && f < 371) layers.push(<CutEffect key="c3" style="glitch" k={f - 364} strength={0.6} seed={133} />);

  // INKSURE+ remote shutdown ("'cause HP shuts it off")
  if (shot === 'shutoff') {
    const k = popIn(f, W.hp - 3, 10);
    const p = 1 - ramp(f, W.shuts, W.off - 2, (x) => x);
    const off = f >= W.off;
    const jit = off && f < W.off + 8 ? 10 * noise1(f * 1.7, 3) : 0;
    // brown-out: the frame dips dark for a beat when the printer dies
    if (f >= W.off - 1 && f < W.off + 10) {
      const d = Math.exp(-Math.max(0, f - W.off) / 3.5);
      layers.push(<AbsoluteFill key="brown" style={{background: `rgba(2,3,12,${0.55 * d})`}} />);
    }
    if (f >= W.hp - 3) {
      layers.push(
        <Dialog key="sd" {...shutdownSpec(p, off)} x={150 + jit} y={120} scale={1.25 * k} origin="top left" sheen={off ? undefined : ((f - W.hp) / 30) % 1.4 - 0.2} />,
      );
    }
  }

  // CARD DECLINED: slam + shake + trail of copies (the frozen-desktop "dragged window" trail), kept left of his face
  if (shot === 'declined' && f >= W.declined - 2) {
    const slam = popIn(f, W.declined - 2, 8);
    const shakeA = 22 * Math.exp(-(f - W.declined) / 6) * (f >= W.declined ? 1 : 0);
    const sx = shakeA * Math.sin((f - W.declined) * 2.6);
    const sy = 0.4 * shakeA * Math.cos((f - W.declined) * 3.1);
    const flash = f >= W.declined - 1 ? Math.exp(-(f - W.declined + 1) / 5) : 0;
    const trailStart = W.declined + 4;
    const n = Math.max(0, Math.min(18, Math.floor(f - trailStart)));
    const path = (i: number) => ({x: 150 + i * 27, y: 240 + i * 15});
    const items: React.ReactNode[] = [];
    for (let i = 0; i < n; i++) {
      const pp = path(i);
      items.push(<Dialog key={`t${i}`} {...DECLINED_SPEC} x={pp.x} y={pp.y} scale={1.05} origin="top left" />);
    }
    const head = path(n);
    const sc = (n > 0 ? 1.05 : 1.05 + 0.35 * (1 - ramp(f, W.declined + 1, trailStart))) * (n > 0 ? 1 : slam);
    layers.push(
      <AbsoluteFill key="red" style={{background: `radial-gradient(ellipse at 50% 45%, rgba(255,40,30,${0.15 * flash}) 0%, rgba(226,35,26,${0.55 * flash}) 100%)`}} />,
    );
    layers.push(<AbsoluteFill key="trail">{items}</AbsoluteFill>);
    layers.push(
      <Dialog key="dec" {...DECLINED_SPEC} x={head.x + (n > 0 ? 0 : sx)} y={head.y + (n > 0 ? 0 : sy)} scale={sc} origin="top left"
        sheen={((f - W.declined) / 20) % 1.4 - 0.2} />,
    );
  }
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{layers}</AbsoluteFill>;
};
