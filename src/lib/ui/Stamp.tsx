/**
 * Y2K UI kit — <Stamp>: red rubber stamp with ink-wear texture that SLAMS down (2D).
 *
 * API
 *   <Stamp text='CANCELLED' progress={0..1} rotation={-14} color? seed? size={44 /*px font size*\/} x y scale? opacity?/>
 *     x, y = CENTRE of the stamp. progress: 0 hidden -> ~0.38 contact (impact) -> 1 settled. Omit progress = landed.
 *   stampSlam(progress) -> {scale, alpha, lift, impact}  (re-exported from stamp.ts) — use `impact` for shake/flash.
 *
 * Usage
 *   const p = ramp(frame, 120, 134, (t) => t);           // ~14 frames per slam
 *   <Stamp text="CANCELLED" progress={p} x={960} y={500} size={80}/>
 */
import React from 'react';
import {DLSvg} from './DLSvg';
import {PlaceProps, placeStyle} from './place';
import {stampDL, stampSlam} from './stampArt';

export {stampSlam};

export type StampProps = Omit<PlaceProps, 'anchor' | 'rotate'> & {
  text?: string;
  progress?: number;
  rotation?: number;
  color?: string;
  seed?: number;
  size?: number;
  fontFamily?: string;
};

export const Stamp: React.FC<StampProps> = ({text = 'CANCELLED', progress = 1, rotation = -14, color, seed, size = 44, fontFamily, ...place}) => {
  const d = stampDL({text, color, seed, size, fontFamily});
  const s = stampSlam(progress);
  if (s.alpha <= 0) return null;
  const st = placeStyle({...place, anchor: 'center', rotate: rotation, scale: (place.scale ?? 1) * s.scale}, d.w, d.h, 'center');
  const lift = s.lift;
  return (
    <div
      style={{
        ...st,
        opacity: (place.opacity ?? 1) * s.alpha,
        filter: lift > 0.01 ? `drop-shadow(${lift * 10}px ${lift * 22}px ${4 + lift * 10}px rgba(40,0,0,${0.35 * lift}))` : undefined,
      }}
    >
      <DLSvg dl={d.dl} w={d.w} h={d.h} />
    </div>
  );
};
