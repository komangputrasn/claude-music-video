/**
 * Exterior sets — barrel + ready-made outdoor rigs for the "Y2K desktop wallpaper" world and the night locations.
 *
 * Re-exports: SkyDome, SKY_PRESETS, SunFlare/sunDirection, Cloud/Clouds/CloudRing, RollingHills/makeHillsHeight/hillsHeight,
 *             House/HOUSE_SPOTS, Tree/Bush, StreetLamp/STREETLAMP, Street/STREET/streetLampPositions/BackdropHouse,
 *             GasStation/GAS_SPOTS/GAS_PUMP/GasPump/PumpNozzle/toPumpLocal, Glow + texture helpers.
 *
 *   <ExteriorLights preset="day" | "sunrise" | "dusk" | "night" intensity={1} shadows={false} />
 *       hemisphere + key (sun/moon) + cool fill matched to SKY_PRESETS[preset]. Optional `keyDir` override.
 *
 *   <ExteriorWorld preset="day" time={t} house={{lightsOn: 0}} hills={{grass: 2600}} />
 *       sky + lights + hills + house in one line (pass `house={false}` / `hills={false}` to drop parts).
 *       Use with <Stage env={SKY_PRESETS[preset].env} ...> for matching reflections.
 *
 * Usage (Chorus wide shot):
 *   <Stage env="sky"><CameraRig position={[-12, 1.6, 24]} target={[0, 4, 0]} fov={45} />
 *     <ExteriorWorld preset="day" time={t} /></Stage>
 */
import React from 'react';
import {SkyDome, SKY_PRESETS, SkyPreset, SkyDomeProps} from './exterior/SkyDome';
import {RollingHills, RollingHillsProps} from './exterior/RollingHills';
import {House, HouseProps, HouseTime} from './exterior/House';

export {SkyDome, SKY_PRESETS} from './exterior/SkyDome';
export type {SkyPreset, SkyDomeProps, SkyPresetDef} from './exterior/SkyDome';
export {Cloud, Clouds, CloudRing, makeCloudGeometry, cloudMat} from './exterior/Clouds';
export {RollingHills, makeHillsHeight, hillsHeight, HILL_PALETTES} from './exterior/RollingHills';
export type {RollingHillsProps, HillsOpts, HillPalette} from './exterior/RollingHills';
export {House, HOUSE_SPOTS} from './exterior/House';
export type {HouseProps, HouseTime} from './exterior/House';
export {Tree, Bush} from './exterior/Tree';
export {StreetLamp, STREETLAMP} from './exterior/StreetLamp';
export type {StreetLampProps} from './exterior/StreetLamp';
export {Street, STREET, streetLampPositions, BackdropHouse} from './exterior/Street';
export type {StreetProps} from './exterior/Street';
export {GasStation, GAS_SPOTS, GAS_PUMP, PumpNozzle, GasPump, toPumpLocal} from './exterior/GasStation';
export type {GasStationProps, GasPumpProps} from './exterior/GasStation';
export {SunFlare, sunDirection} from './exterior/Sun';
export type {SunFlareProps} from './exterior/Sun';
export {Glow, canvasTex, glowTex, sparkleTex} from './exterior/common';

type V3 = [number, number, number];

export const ExteriorLights: React.FC<{
  preset?: SkyPreset;
  /** global multiplier */
  intensity?: number;
  /** override key light direction (unit-ish vector pointing TOWARD the light) */
  keyDir?: V3;
  /** distance of the key light from `center` */
  distance?: number;
  center?: V3;
  shadows?: boolean;
  /** shadow camera half-size (m) */
  shadowSize?: number;
}> = ({preset = 'day', intensity = 1, keyDir, distance = 60, center = [0, 0, 0], shadows = false, shadowSize = 20}) => {
  const L = SKY_PRESETS[preset].light;
  const d = keyDir ?? L.keyDir;
  const pos: V3 = [center[0] + d[0] * distance, center[1] + d[1] * distance, center[2] + d[2] * distance];
  const fillPos: V3 = [center[0] - d[0] * distance, center[1] + distance * 0.4, center[2] - d[2] * distance * 0.3];
  return (
    <group>
      <hemisphereLight args={[L.skyColor, L.groundColor, L.hemiIntensity * intensity]} />
      <directionalLight
        position={pos}
        color={L.keyColor}
        intensity={L.keyIntensity * intensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={distance * 2.5}
      />
      <directionalLight position={fillPos} color={L.fillColor} intensity={L.fillIntensity * intensity} />
    </group>
  );
};

export type ExteriorWorldProps = {
  preset?: SkyPreset;
  /** song seconds (or any increasing number) — drifts clouds, twinkles stars, sways trees */
  time?: number;
  sky?: Partial<SkyDomeProps> | false;
  hills?: Partial<RollingHillsProps> | false;
  house?: Partial<HouseProps> | false;
  lights?: boolean;
  lightIntensity?: number;
};
/** Sky + matching lights + hills + house at the origin. */
export const ExteriorWorld: React.FC<ExteriorWorldProps> = ({preset = 'day', time = 0, sky = {}, hills = {}, house = {}, lights = true, lightIntensity = 1}) => {
  const ht: HouseTime = preset === 'night' || preset === 'dusk' ? 'night' : preset === 'sunrise' ? 'sunrise' : 'day';
  return (
    <group>
      {sky !== false ? <SkyDome preset={preset} time={time} {...sky} /> : null}
      {lights ? <ExteriorLights preset={preset} intensity={lightIntensity} /> : null}
      {hills !== false ? <RollingHills palette={preset} {...hills} /> : null}
      {house !== false ? <House time={ht} {...house} /> : null}
    </group>
  );
};
