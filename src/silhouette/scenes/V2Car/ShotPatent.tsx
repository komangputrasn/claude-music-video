/**
 * Shot 4 — PATENT (scene-local 424–521, song 106.70–109.97). [23] "Ford filed a patent for that, by the way."
 * Low, dead-centre, long lens down the highway to where the capsule vanished. The fog closes the road like a wall.
 * On "Ford" (107.04) a projector throws a patent sheet across it in bone-white light: METHOD FOR REPOSSESSION IN
 * MOTION, FIG. 1 — the capsule in side elevation driving away (callouts 10–18), a fuelling pillar (30) and the lessee
 * (40) left standing. The sung line is the patent's own claim, typed in its mono callout type (PATENT in red). He stands
 * small on the wet road in front of it, a black figure looking up at the drawing of what just happened to him; the
 * sheet and the red lane lines mirror in the wet concrete. Holds to the cut into V2Rain at 109.97.
 */
import React, {useMemo} from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {S, GREYS, SFONTS, cameraFovForVisible} from '../../lib/palette';
import {Backlight, FogLayers} from '../../lib/atmos';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {guyIdle, mergePose} from '../../../lib/characters/Guy';
import {Highway} from './Highway';
import {PatentProjection, SHEET} from './Patent';
import {placeWords} from './lyric';
import {TCUT, T_END, W} from './timing';

const FOV = cameraFovForVisible(20);
const SZ = -95; // the fog wall / sheet
const SY = 12.2; // sheet centre height (its foot just above the road)
const GUY_Z = -30;
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

export const ShotPatent: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const u = clamp01((t - TCUT.patent) / (T_END - TCUT.patent));
  const on = smooth((t - (W.ford - 0.08)) / 0.32);
  const C = SHEET.claim;
  const perWord = useMemo(() => placeWords(23, C.em, [
    {words: [0, 1, 2, 3], x: -22, y: C.row0, align: 'left'},
    {words: [4, 5, 6, 7, 8], x: -22, y: C.row1, align: 'left'},
  ], {font: SFONTS.mono}), [C.em, C.row0, C.row1]);
  const camZ = lerp(0, -2.6, smooth(u));
  const pose = mergePose(guyIdle(t, 5), {headPitch: -0.22 * smooth((t - W.ford) / 0.8), headYaw: 0});
  return (
    <SilStage fog={{color: GREYS.g2, near: 40, far: 420}} camera={{far: 2500}}>
      <CameraRig position={[0, 1.0, camZ]} target={[0, 11, SZ]} fov={FOV} />
      <Highway time={t} zNear={12} zFar={SZ - 4} gantries={false} pulse={bass} horizon={0.16} horizonY={8} horizonH={60} sky={0.04}
        sea={0.18} wet={{reflectivity: 0.9, puddles: 0.62, streak: 1.25}} />
      {/* the fog wall the capsule drove into: lit dimly by the projector's spill */}
      <Backlight position={[0, SY - 2, SZ - 3]} size={[110, 46]} shape="radial" softness={1} intensity={0.06 + 0.12 * on} noise={0.35} time={t} />
      <FogLayers position={[0, 0, SZ - 2]} count={6} near={0.5} far={120} width={160} height={40} color={GREYS.g3} density={0.1}
        time={t} drift={[0.35, 0.02]} />
      <FogLayers position={[0, 0, GUY_Z - 6]} count={5} near={0.5} far={55} width={120} height={30} color={GREYS.g4} density={0.05}
        time={t} drift={[0.25, 0.02]} seed={3} />
      <PatentProjection time={t} on={on * (1 + 0.06 * bass)} position={[0, SY, SZ]} />
      {on > 0.01 ? (
        <WorldLyric line={23} time={t} mode="light" font={SFONTS.mono} weight={500} size={C.em} position={[0, SY, SZ + 0.05]}
          perWord={perWord} intensity={0.98 * on} halo={0.3} tracking={0.12} until={T_END + 0.5} />
      ) : null}
      <SilGuy position={[0, 0, GUY_Z]} rotation-y={Math.PI} pose={pose} rim={{color: S.bone, strength: 0.6, power: 7, dir: [0, 1]}} />
    </SilStage>
  );
};
