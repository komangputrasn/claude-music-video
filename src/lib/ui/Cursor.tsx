/**
 * Y2K UI kit — <Cursor>: arrow / pointing hand / hourglass mouse cursor with a click animation (2D).
 *
 * API
 *   <Cursor kind='arrow'|'hand'|'hourglass' x y click? hourglassRot? sand? size={48} color? outline? ripple? opacity? style?/>
 *     (x, y) is the HOTSPOT in parent px: arrow tip, index fingertip, hourglass centre.
 *     click 0..1: press animation (shrink toward the hotspot + aqua ripple). Drive 0->1 over ~12 frames; 0 = idle.
 *     hourglassRot: degrees (the classic flip); sand 0..1 = fraction run through.
 *     size: px height of the 32-unit cursor grid (48 reads well at 1080p; go 96+ for hero shots).
 *   clickAt(frame, clickFrame, dur=12) -> 0..1 helper for the click prop
 *
 * Usage
 *   <Cursor kind="hand" x={lerp(300, 820, ramp(f, 0, 30))} y={600} click={clickAt(f, 34)} size={64}/>
 */
import React from 'react';
import {DLSvg} from './DLSvg';
import {g} from './dl';
import {cursorDL, CursorKind} from './cursors';

export type CursorProps = {
  kind?: CursorKind;
  x: number;
  y: number;
  click?: number;
  hourglassRot?: number;
  sand?: number;
  size?: number;
  color?: string;
  outline?: string;
  ripple?: boolean;
  opacity?: number;
  zIndex?: number;
  style?: React.CSSProperties;
};

const VB = {x: -26, y: -26, w: 62, h: 66};

/** 0..1 click progress for a click starting at `clickFrame`. */
export const clickAt = (frame: number, clickFrame: number, dur = 12) => {
  const t = (frame - clickFrame) / dur;
  return t <= 0 || t >= 1 ? 0 : t;
};

export const Cursor: React.FC<CursorProps> = ({kind = 'arrow', x, y, click = 0, hourglassRot, sand, size = 48, color, outline, ripple, opacity, zIndex, style}) => {
  const k = size / 32;
  const dl = [g(cursorDL(kind, {click, hourglassRot, sand, color, outline, ripple}), {tx: -VB.x, ty: -VB.y})];
  return (
    <DLSvg
      dl={dl}
      w={VB.w}
      h={VB.h}
      style={{
        position: 'absolute', left: x + VB.x * k, top: y + VB.y * k, width: VB.w * k, height: VB.h * k, opacity, zIndex, pointerEvents: 'none', ...style,
      }}
    />
  );
};
