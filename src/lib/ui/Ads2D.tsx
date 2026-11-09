/**
 * Y2K UI kit — 2D web-1999 ad furniture: <BannerAd>, <Starburst>, <Marquee>, <HitCounter>.
 *
 * API (PlaceProps: x y scale rotate opacity origin anchor style)
 *   <BannerAd variant='click'|'buy'|'free'|'visitor'|'upgrade' label? sub? frame width={468} height={60}/>
 *       GIF-style animation at 10 fps driven by `frame` (flashing, chasing arrows, sheen, twinkles).
 *       click: "CLICK HERE!!!" (sub = small line) | buy: NEW! burst + sub text + lime "BUY NOW" gel button (label)
 *       free: "FREE*" + fine print (sub) | visitor: "You are visitor #" (label) + counter digits (sub = '0000001')
 *       upgrade: "UPGRADE TO PLUS" + sub line
 *   <Starburst text color?='#FFE600' textColor? size={140} points={16} rotation? textRotation?/>   x,y = CENTRE
 *   <Marquee text frame speed={4 px/frame} width={600} height={36} variant='ticker'|'led'|'plain' color? background? fontFamily?/>
 *   <HitCounter value digits={7} label?='You are visitor #' (null = digits only) digitHeight={34}/>
 *       fractional value -> rolling odometer digits (e.g. value={1 + ramp(f, 0, 20)})
 *
 * Usage
 *   <BannerAd variant="click" frame={frame} x={60} y={60} scale={1.5}/>
 *   <Starburst text="NEW!" x={300} y={200} rotation={frame * 2}/>
 */
import React from 'react';
import {DLSvg} from './DLSvg';
import {PlaceProps, placeStyle} from './place';
import {BannerVariant, bannerDL, hitCounterDL, marqueeDL, MarqueeVariant, starburstDL} from './ads';

export type BannerAdProps = PlaceProps & {variant: BannerVariant; label?: string; sub?: string; frame: number; width?: number; height?: number};
export const BannerAd: React.FC<BannerAdProps> = ({variant, label, sub, frame, width, height, ...place}) => {
  const d = bannerDL(variant, {label, sub, frame, w: width, h: height});
  return (
    <div style={placeStyle(place, d.w, d.h)} className={place.className}>
      <DLSvg dl={d.dl} w={d.w} h={d.h} />
    </div>
  );
};

export type StarburstProps = Omit<PlaceProps, 'anchor'> & {text: string; color?: string; textColor?: string; size?: number; points?: number; rotation?: number;
  textRotation?: number};
export const Starburst: React.FC<StarburstProps> = ({text, color, textColor, size = 140, points, rotation, textRotation, ...place}) => {
  const d = starburstDL({text, color, textColor, size, points, rotation, textRotation});
  return (
    <div style={placeStyle({...place, anchor: 'center'}, d.w, d.h, 'center')} className={place.className}>
      <DLSvg dl={d.dl} w={d.w} h={d.h} />
    </div>
  );
};

export type MarqueeProps = PlaceProps & {text: string; frame: number; speed?: number; width?: number; height?: number; variant?: MarqueeVariant; color?: string;
  background?: string; fontFamily?: string; separator?: string};
export const Marquee: React.FC<MarqueeProps> = ({text, frame, speed, width, height, variant, color, background, fontFamily, separator, ...place}) => {
  const d = marqueeDL({text, frame, speed, w: width, h: height, variant, color, background, fontFamily, separator});
  return (
    <div style={placeStyle(place, d.w, d.h)} className={place.className}>
      <DLSvg dl={d.dl} w={d.w} h={d.h} />
    </div>
  );
};

export type HitCounterProps = PlaceProps & {value: number; digits?: number; label?: string | null; digitHeight?: number};
export const HitCounter: React.FC<HitCounterProps> = ({value, digits, label, digitHeight, ...place}) => {
  const d = hitCounterDL({value, digits, label, digitH: digitHeight});
  return (
    <div style={placeStyle(place, d.w, d.h)} className={place.className}>
      <DLSvg dl={d.dl} w={d.w} h={d.h} />
    </div>
  );
};
