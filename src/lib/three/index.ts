/**
 * Three.js library barrel: the render path (<Stage>, <CameraRig>) + the Y2K look (ChromeText, materials, FX kit).
 *   import {Stage, CameraRig, ChromeText, chromeMat, SparkleField, LensFlare} from '../lib/three';
 */
export {Stage, CameraRig} from './Stage';
export type {StageProps, BloomOpts, LensOpts} from './Stage';
export type {EnvPreset} from './envs';
export {ChromeText, measureChromeText, CHROME_FONTS} from './ChromeText';
export type {ChromeTextProps, ChromeFont, ChromeTextMetrics, LetterTransform, ChromeLayoutOpts} from './ChromeText';
export * from './materials';
export * from './fx';
