/**
 * Y2K UI kit — 2D windows and dialogs (HTML/SVG, for <AbsoluteFill> layers). All animation via props.
 *
 * API
 *   <Win title width height icon? active? theme? controls? closeState? shadow? sheen? bodyStyle? {...PlaceProps}>children</Win>
 *       generic "Y2K OS" window; children render inside the beige body (Tahoma 15px), clipped.
 *       Body rect inside the window = winBodyRect(width, height) (x=4, y=34).
 *   <Dialog kind title heading? message? buttons? defaultButton? pressed? hover? disabledButtons? aquaButton?
 *           progress? progressLabel? width? theme? active? stamp? stampProgress? shadow? sheen? {...PlaceProps}>overlay children</Dialog>
 *       sheen: diagonal glint position -0.2..1.2 (same look as the 3D panels' sheen).
 *       kind: 'error'|'warning'|'info'|'question'|'lock'|'coin'|'plus'|'none'. Height is automatic.
 *       pressed / hover = button index. stamp + stampProgress (0..1) slams a rubber stamp onto the dialog.
 *   dialogSize(spec) -> {w, h}                         size before scaling (for centring / layout)
 *   dialogButtonCenter(spec, index) -> {x, y}          centre of a button relative to the dialog's top-left (aim cursors!)
 *
 * Usage
 *   const spec = {kind: 'lock', title: 'FeedMe Plus', message: 'Breakfast is for PLUS members only.', buttons: ['Upgrade', 'Cancel'],
 *                 disabledButtons: [1], aquaButton: 0} as const;
 *   <Dialog {...spec} x={960} y={420} anchor="center" scale={1.6 * popIn(frame, 10)}/>
 *   const b = dialogButtonCenter(spec, 1); // -> cursor target (add the dialog's top-left, times scale)
 */
import React from 'react';
import {DLSvg} from './DLSvg';
import type {IconKind} from './icons';
import {PlaceProps, placeStyle} from './place';
import {Stamp} from './Stamp';
import {CtrlState, DialogSpec, dialogDL, layoutDialog, sheenDL, winBodyRect, winChromeDL, WinControls} from './widgets';
import {TitleThemeName, UIC, UIF} from './theme';

export type WinProps = PlaceProps & {
  title: string;
  width: number;
  height: number;
  icon?: IconKind | null;
  active?: boolean;
  theme?: TitleThemeName;
  controls?: WinControls;
  closeState?: CtrlState;
  shadow?: boolean;
  /** diagonal glint position -0.2..1.2 (animate it on a beat); undefined = none */
  sheen?: number;
  bodyStyle?: React.CSSProperties;
  children?: React.ReactNode;
};

export const Win: React.FC<WinProps> = ({title, width, height, icon = null, active, theme, controls, closeState, shadow = true, sheen, bodyStyle, children,
  ...place}) => {
  const b = winBodyRect(width, height);
  const dl = winChromeDL({w: width, h: height, title, icon, active, theme, controls, closeState, shadow});
  return (
    <div style={placeStyle(place, width, height)} className={place.className}>
      <DLSvg dl={dl} w={width} h={height} style={{position: 'absolute', left: 0, top: 0}} />
      <div
        style={{
          position: 'absolute', left: b.x + 1.5, top: b.y + 1.5, width: b.w - 3, height: b.h - 3, overflow: 'hidden',
          fontFamily: UIF.ui, fontSize: 15, color: UIC.text, lineHeight: 1.35, ...bodyStyle,
        }}
      >
        {children}
      </div>
      {sheen !== undefined ? <DLSvg dl={sheenDL(width, height, sheen)} w={width} h={height} style={{position: 'absolute', left: 0, top: 0}} /> : null}
    </div>
  );
};

export type DialogProps = PlaceProps &
  DialogSpec & {
    /** soft drop shadow (default true) */
    shadow?: boolean;
    /** 0..1 slam progress for `stamp` (omit = stamp already landed) */
    stampProgress?: number;
    /** diagonal glint position -0.2..1.2; undefined = none */
    sheen?: number;
    children?: React.ReactNode;
  };

const specOf = (p: DialogProps): DialogSpec => ({
  kind: p.kind, title: p.title, heading: p.heading, message: p.message, buttons: p.buttons, defaultButton: p.defaultButton, pressed: p.pressed,
  hover: p.hover, disabledButtons: p.disabledButtons, aquaButton: p.aquaButton, aquaColor: p.aquaColor, progress: p.progress,
  progressLabel: p.progressLabel, progressColor: p.progressColor, width: p.width, theme: p.theme, active: p.active, titleIcon: p.titleIcon,
  controls: p.controls, closeState: p.closeState,
});

export const dialogSize = (spec: DialogSpec) => {
  const L = layoutDialog(spec);
  return {w: L.w, h: L.h};
};

export const dialogButtonCenter = (spec: DialogSpec, index: number) => {
  const L = layoutDialog(spec);
  const b = L.buttons.find((x) => x.index === index) ?? L.buttons[0];
  return b ? {x: b.x + b.w / 2, y: b.y + b.h / 2} : {x: L.w / 2, y: L.h - 30};
};

export const Dialog: React.FC<DialogProps> = (props) => {
  const spec = specOf(props);
  const {shadow = true, stamp, stampProgress, sheen, children} = props;
  // a landed stamp is baked into the drawing; an animating one is an overlay
  const bake = stamp && stampProgress === undefined;
  const d = dialogDL(bake ? {...spec, stamp} : spec, {shadow});
  const place: PlaceProps = {x: props.x, y: props.y, scale: props.scale, rotate: props.rotate, opacity: props.opacity, origin: props.origin,
    anchor: props.anchor, zIndex: props.zIndex, style: props.style, className: props.className};
  return (
    <div style={placeStyle(place, d.w, d.h)} className={props.className}>
      <DLSvg dl={sheen !== undefined ? [...d.dl, ...sheenDL(d.w, d.h, sheen)] : d.dl} w={d.w} h={d.h} style={{position: 'absolute', left: 0, top: 0}} />
      {stamp && stampProgress !== undefined ? (
        <Stamp text={stamp.text} color={stamp.color} seed={stamp.seed} size={stamp.size ?? Math.round(d.w * 0.11)} rotation={stamp.rotation ?? -14}
          progress={stampProgress} x={d.w / 2} y={d.h / 2 + 6} />
      ) : null}
      {children}
    </div>
  );
};
