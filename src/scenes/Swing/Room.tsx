/**
 * The bedroom AFTER the smash (shared by the Pancake / phone / cancel shots): smashed feeder with its lid on the floor,
 * kibble everywhere, rain on the window, the cops' strobe still washing in. Constant light count across the shots.
 */
import React from 'react';
import {Bedroom} from '../../lib/sets/Bedroom';
import {Feeder, FEEDER, KibbleBurst, Padlock} from '../../lib/props';
import {FEEDER_POS, FEEDER_ROT, HIDE_PIECES, KIBBLE_BURST, LOCK_LAND, LOCK_SCALE, V3, kibbleProgress, lockAt} from './common';
import type {BedroomPiece} from '../../lib/sets/Bedroom';

export {kibbleProgress};

export const RoomAfter: React.FC<{
  f: number;
  cops?: number;
  keyPos: V3;
  keyIntensity?: number;
  hide?: BedroomPiece[];
  hideFront?: boolean;
  children?: React.ReactNode;
}> = ({f, cops = 1, keyPos, keyIntensity = 2.0, hide = [], hideFront, children}) => (
  <Bedroom time="night" frame={f} copLights={cops} moon={0.9} lamp={0.12} rainOnWindow hide={[...HIDE_PIECES, ...hide]}
    hideWalls={hideFront ? ['front'] : []}>
    <pointLight position={keyPos} color="#ffe2c4" intensity={keyIntensity} distance={3.6} decay={1.4} />
    <group position={FEEDER_POS} rotation={[0, FEEDER_ROT, 0]}>
      <Feeder lcdText="ERR 0xD06" smashed={1} lid={1.4} lidFly={1} kibbleFill={0.3} locked={false} time={f / 30} />
      <KibbleBurst progress={kibbleProgress(f)} origin={FEEDER.hopperCenter} {...KIBBLE_BURST} />
    </group>
    {/* the broken padlock where it landed after the smash */}
    <group position={lockAt(LOCK_LAND)} rotation={[LOCK_LAND * 14, LOCK_LAND * 9.8, 0.4]} scale={LOCK_SCALE}>
      <Padlock broken={1} time={0} />
    </group>
    {children}
  </Bedroom>
);

/** rotate a local offset by yaw and add a base position */
export const toWorld = (base: V3, yaw: number, p: V3): V3 => [
  base[0] + p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw),
  base[1] + p[1],
  base[2] - p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw),
];
