/**
 * <SilStage> — the shared <Stage> preset for the TERMS cut (DESIGN-silhouette §2.3, §5).
 * No environment map, fog on, strong bloom with a HIGH threshold (only screens, beams and irises glow),
 * low-saturation heavy-grain lens. Every 3D shot in this cut goes through it.
 *
 *   <SilStage fog?={{color: S.ash, near: 8, far: 90}} background?={S.void} bloom?={…} lens?={…}
 *             camera?={{fov: 28, position: [0, 1.6, 12]}} exposure?={1}>
 *     <CameraRig position target fov roll/>   // from lib/three (same as the Y2K cut)
 *     …
 *   </SilStage>
 *
 * Defaults: bloom {strength 0.85, radius 0.6, threshold 0.86}, lens {aberration 0.0007, vignette 0.55, grain 0.075,
 * scanlines 0, saturation 0.92}. Pass `bloom`/`lens` objects to override individual keys (merged with the defaults).
 * Long lenses: use fov 18–35 (CameraRig fov). The visible picture is letterboxed to 2.39:1 by the overlays (see
 * LETTERBOX / cameraFovForVisible in ./palette).
 */
import React from 'react';
import {Stage, BloomOpts, LensOpts} from '../../lib/three/Stage';
import {S} from './palette';

export {CameraRig} from '../../lib/three/Stage';

export const SIL_BLOOM: Required<BloomOpts> = {strength: 0.85, radius: 0.6, threshold: 0.86};
export const SIL_LENS: Required<LensOpts> = {aberration: 0.0007, vignette: 0.55, grain: 0.075, scanlines: 0, saturation: 0.92};

export type SilStageProps = {
  children: React.ReactNode;
  fog?: {color: string; near: number; far: number} | null;
  background?: string | null;
  bloom?: BloomOpts | false;
  lens?: LensOpts | false;
  camera?: {fov?: number; near?: number; far?: number; position?: [number, number, number]};
  exposure?: number;
  style?: React.CSSProperties;
};

export const SilStage: React.FC<SilStageProps> = ({
  children, fog = {color: S.ash, near: 8, far: 90}, background = S.void, bloom, lens, camera, exposure = 1, style,
}) => (
  <Stage
    env="none"
    background={background}
    fog={fog}
    bloom={bloom === false ? false : {...SIL_BLOOM, ...(bloom ?? {})}}
    lens={lens === false ? false : {...SIL_LENS, ...(lens ?? {})}}
    camera={{fov: 28, near: 0.1, far: 800, ...(camera ?? {})}}
    exposure={exposure}
    style={style}
  >
    {children}
  </Stage>
);
