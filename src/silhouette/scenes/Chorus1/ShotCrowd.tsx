// Chorus1 · shot E — 74.61 → 78.95. Line 16: "You said 'Buy now,' but you meant 'for now,'"
// A plaza packed with identical hooded silhouettes, all standing still, all facing a wall of screens: the line on the
// great central screen, BUY / NOW on two red slabs, a field of irises above. He is the one figure walking the other
// way, toward us, down a lane through them — and a thin red TENURE beam has found him and follows him.
import React, {useMemo} from 'react';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {Crowd} from '../../lib/Crowd';
import {WorldLyric} from '../../lib/WorldLyric';
import {Backlight, WetGround, LightPool} from '../../lib/atmos';
import {TenureScreen, IrisWall, screenDims} from '../../lib/tenure';
import {bassAt, lerp} from '../../../lib/time';
import {guyWalk, GUY} from '../../../lib/characters/Guy';
import {ShotProps, prog, easeOut, Slab, rowsPerWord, RIM_BONE} from './common';

export const SHOT_E = {t0: 74.61, t1: 78.95};
export const FOG_E = {color: S.ash, near: 40, far: 320};

const WALL_Z = -96;
const WALK = GUY.strideLength * 0.94;
const CROWD_Z = -38;
const BIG = {width: 54, height: 17.5, content: {chrome: true, lines: []}};
const RED = {width: 13, height: 21};
const redContent = {chrome: false, lines: [{text: 'BUY', size: 0.2, tracking: 0.3, ink: 'void' as const}, {text: 'NOW', size: 0.2, tracking: 0.3, ink: 'void' as const, gap: 0.08}]};

const ROWS16 = rowsPerWord(16, 3.05, [[0, 1, 2, 3], [4, 5, 6, 7, 8]]);

export const ShotCrowd: React.FC<ShotProps> = ({t, f}) => {
  const lt = t - SHOT_E.t0;
  const u = prog(t, SHOT_E.t0, SHOT_E.t1);
  const bass = bassAt(f);
  const gz = -13.5 + lt * WALK; // walking toward +Z (toward the camera), against everyone
  const lane = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let z = -30; z <= 30; z += 1.4) out.push([0, z, 1.05]);
    return out;
  }, []);
  const big = screenDims({width: BIG.width, height: BIG.height});
  const bigY = 10.5;
  return (
    <>
      <CameraRig position={[0, 1.25, lerp(12, 9.5, easeOut(u))]} target={[0, 9.5, WALL_Z]} fov={cameraFovForVisible(24)} />
      <WetGround size={[400, 300]} position={[0, 0, -40]} reflectivity={0.75} puddles={0.4} time={t} color={GREYS.g1} />
      {/* the screen wall */}
      <Slab size={[260, 80, 4]} position={[0, 0, WALL_Z - 2]} color={GREYS.g2} ambient={0.03} />
      <TenureScreen position={[0, bigY, WALL_Z]} width={BIG.width} height={BIG.height} content={BIG.content} time={t} pulse={bass} haze={0.3} intensity={1.15} />
      <WorldLyric line={16} time={t} mode="screen" size={3.05} position={[0, bigY + big.border + BIG.height * 0.58, WALL_Z + big.depth + 0.06]} until={SHOT_E.t1 + 0.05} perWord={ROWS16} />
      {[-1, 1].map((s) => (
        <TenureScreen key={s} position={[s * 42, 6, WALL_Z]} width={RED.width} height={RED.height} content={redContent} background="red" time={t + s} pulse={bass} intensity={1.05} haze={0.25} />
      ))}
      <IrisWall position={[0, 30, WALL_Z + 0.05]} cols={64} rows={8} spacing={2.1} radius={0.8} time={t} pupil={0.28 + 0.06 * bass} intensity={1.3}
        wave={{center: [0, 8], start: 75.2, speed: 22, width: 6, mode: 'pulse'}} blink={0.05} seed={4} />
      {/* lit ground haze at the foot of the wall: the crowd's backlight (behind all of them) */}
      <Backlight position={[0, 2.6, WALL_Z + 24]} size={[260, 9]} shape="slab" softness={0.85} intensity={0.66} time={t} />
      <Backlight position={[0, 16, WALL_Z - 1]} size={[200, 50]} shape="radial" softness={1} intensity={0.3} time={t} />
      <Crowd count={560} seed={7} area={[74, 48]} spacing={1.45} position={[0, 0, CROWD_Z]} facing={Math.PI} facingJitter={0.06} sway={0.45} time={t}
        exclude={lane.map(([x, z, r]) => [x, z, r] as [number, number, number])} rim={{color: S.bone, strength: 0.45, power: 6, dir: [0, 1]}} />
      {/* a pool of light in the lane just behind him: he walks out of it toward us */}
      <LightPool position={[0, 0, gz - 1.6]} radius={2.1} color={S.bone} intensity={0.8} haze={0.8} hazeHeight={3.2} />
      <SilGuy pose={guyWalk(t)} position={[0, 0, gz]} rim={{...RIM_BONE, strength: 1.2, dir: [0, 1]}} />
    </>
  );
};
