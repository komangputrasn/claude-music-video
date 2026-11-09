/**
 * Y2K UI kit — small 2D widgets: <AquaButton>, <PushButton>, <ProgressBar>, <Icon>.
 *
 * API (all accept PlaceProps: x y scale rotate opacity origin anchor style)
 *   <AquaButton label pressed? glow?={0..1} color?='aqua'|'lime'|'bubblegum'|'tangerine'|'grape'|'graphite'|'red'|'gold' width? height={46} disabled?/>
 *   <PushButton label width?={110} height?={32} isDefault? pressed? disabled? hot?/>
 *   <ProgressBar value={0..1} label? showPercent? segments? width={360} height={24} color?='green'|'aqua'|'pink'|'gold'/>
 *       label is drawn above the bar (Tahoma 15); total height = height + 24 when labelled.
 *   <Icon kind='error'|'warning'|'info'|'question'|'lock'|'coin'|'plus'|'at'|'sparkle' size={48} spin?={deg} shadow?/>
 *
 * Usage
 *   <AquaButton label="Upgrade" color="lime" glow={beat.pulse} x={800} y={600} scale={2}/>
 *   <ProgressBar value={0.99} label="Loading your life..." showPercent x={760} y={500}/>
 */
import React from 'react';
import {DLSvg} from './DLSvg';
import {font, g, measureText} from './dl';
import type {Prim} from './dl';
import {iconDL, IconKind} from './icons';
import {PlaceProps, placeStyle} from './place';
import {AquaColor, UIC, UIF} from './theme';
import {aquaButtonDL, aquaButtonWidth, ProgressColor, progressDL, pushButtonDL} from './widgets';

export type AquaButtonProps = PlaceProps & {label: string; pressed?: boolean; glow?: number; color?: AquaColor; width?: number; height?: number; disabled?: boolean;
  fontFamily?: string};
export const AquaButton: React.FC<AquaButtonProps> = ({label, pressed, glow, color, width, height = 46, disabled, fontFamily, ...place}) => {
  const w = width ?? aquaButtonWidth(label, height, fontFamily);
  return (
    <div style={placeStyle(place, w, height)} className={place.className}>
      <DLSvg dl={[aquaButtonDL(0, 0, w, height, label, {pressed, glow, color, disabled, fontFamily})]} w={w} h={height} />
    </div>
  );
};

export type PushButtonProps = PlaceProps & {label: string; width?: number; height?: number; isDefault?: boolean; pressed?: boolean; disabled?: boolean; hot?: boolean;
  fontSize?: number};
export const PushButton: React.FC<PushButtonProps> = ({label, width, height = 32, isDefault, pressed, disabled, hot, fontSize, ...place}) => {
  const w = width ?? Math.max(100, Math.round(measureText(font(fontSize ?? 15, UIF.ui), label) + 40));
  return (
    <div style={placeStyle(place, w, height)} className={place.className}>
      <DLSvg dl={[pushButtonDL(0, 0, w, height, label, {isDefault, pressed, disabled, hot, fontSize})]} w={w} h={height} />
    </div>
  );
};

export type ProgressBarProps = PlaceProps & {value: number; label?: string; showPercent?: boolean; segments?: number; width?: number; height?: number;
  color?: ProgressColor; labelColor?: string};
export const ProgressBar: React.FC<ProgressBarProps> = ({value, label, showPercent, segments, width = 360, height = 24, color, labelColor, ...place}) => {
  const top = label || showPercent ? 24 : 0;
  const f = font(15, UIF.ui);
  const dl: Prim[] = [];
  if (label) dl.push({t: 'text', x: 0, y: 16, text: label, font: f, fill: labelColor ?? UIC.text});
  if (showPercent)
    dl.push({t: 'text', x: width, y: 16, text: `${Math.floor(Math.max(0, Math.min(1, value)) * 100)}%`, font: font(15, UIF.ui, 'bold'), align: 'right',
      fill: labelColor ?? UIC.text});
  dl.push(progressDL(0, top, width, height, value, {segments, color}));
  return (
    <div style={placeStyle(place, width, height + top)} className={place.className}>
      <DLSvg dl={dl} w={width} h={height + top} />
    </div>
  );
};

export type IconProps = PlaceProps & {kind: IconKind; size?: number; spin?: number; shadow?: boolean};
export const Icon: React.FC<IconProps> = ({kind, size = 48, spin, shadow, ...place}) => (
  <div style={placeStyle(place, size, size)} className={place.className}>
    <DLSvg dl={[g([iconDL(kind, size, 0, 0, {spin, shadow})])]} w={size} h={size} />
  </div>
);
