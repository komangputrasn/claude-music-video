/**
 * Shot 5 — HAMMER (scene-local 406–550, song 123.48–128.34). "and my grandpa's old hammer doesn't care about locks."
 * Dead-on, symmetrical, slow push-in: the cell wall, the vertical light slit, and grandpa's hammer hanging across it on
 * two pegs — a black cross of light and iron. The wooden handle carries the ONLY warm edge in the film before the
 * swing (warmth 0.3: a faint gold line, the core stays black). The sung line is painted faintly on the concrete in
 * two blocks that flank the hammer. On "about locks" a red TENURE scan line crosses the wall behind the hammer, which
 * cuts it like a key in a lock. "One…" (line 28, sung 0.08 s before the cut) is painted under "LOCKS." Into Swing.
 * The scan lives on the CONCRETE only: it skips the slit opening (red added over the slit's bone light read pink), its
 * core is a solid authRed strip (an additive core over the lit wall tone-mapped coral) over a soft lib ScanLine wash
 * that fades out on the slit-lit wall near the opening (red added there read pink), and the painted words are drawn
 * after it (so the wash never turns a bone letter pink).
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {ScanLine} from '../../lib/atmos';
import {CellRoom, CELL, CELL_SLIT, CELL_SPOTS} from '../../lib/sets';
import {HungSilHammer} from '../../lib/props';
import {bassAt, clamp01, ramp} from '../../../lib/time';
import {LyricBlock} from './LyricBlock';
import {TCUT, T_END, W} from './timing';

const s01 = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// text: em (m), the gap either side of the slit, row height
const EM = 0.073;
const GAP = 0.3;
const LH = 1.18;
const TEXT_Y = 1.5;
// the scan decal (wall frame: local +X = world −Z = screen right, origin on the slit axis): two pieces either side of
// the slit opening (+5 mm), the line position shared; CORE_W = the solid red core strip
const SCAN_W = 2.6;
const SCAN_H = 1.6;
const SLIT_HALF = CELL_SLIT.width / 2 + 0.005;
const PIECE_W = SCAN_W / 2 - SLIT_HALF;
const CORE_W = 0.012;

export const ShotHammer: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  // slow push-in, decelerating into the cut
  const k = ramp(t * 30, TCUT.hammer * 30, T_END * 30, (x) => 1 - Math.pow(1 - x, 1.7));
  const z0 = CELL_SPOTS.hungHammer[2]; // −0.9: the slit / hammer axis
  const camX = 4.5 - 2.3 * k;
  const wallX = CELL.xMin + 0.012;
  const scan = s01(t, W.locks - 0.55, W.locks + 0.75);
  const xl = (scan - 0.5) * SCAN_W; // the line's position along the decal
  // the wash fades out as the line nears the slit: the wall within ~0.3 m of it is lit near-bone by the slit, and red
  // ADDED onto that light grey read pink (202, 173, 172). There the solid core alone carries the line.
  const washK = clamp01((Math.abs(xl) - SLIT_HALF) / 0.45) ** 2;
  const top = TEXT_Y + ((2 * LH + 0.7) * EM) / 2; // top of the 3-row blocks (anchor centre)
  // (renderOrder 5: the words are painted over the scan wash and core, so a bone letter never takes the red additively)
  const common = {time: t, size: EM, mode: 'paint' as const, intensity: 0.6, until: T_END + 1, renderOrder: 5,
    rotation: [0, Math.PI / 2, 0] as [number, number, number]};
  return (
    <SilStage fog={{color: GREYS.g2, near: 12, far: 60}}>
      <CameraRig position={[camX, 1.52, z0]} target={[CELL.xMin, 1.5, z0]} fov={cameraFovForVisible(11)} />
      <CellRoom time={t} hideWalls={['right']} hide={['printer', 'page']} slit={0.66 + 0.1 * bass} doorLeak={0.4}>
        <HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false}
          warmth={0.3} light={[0, 1]} />
      </CellRoom>
      {scan > 0 && scan < 1 ? (
        <group position={[wallX + 0.004, 1.5, z0]} rotation-y={Math.PI / 2}>
          {/* the red wash (glow + trail, hairline core under the strip), one piece each side of the slit */}
          {[-1, 1].map((sd) => {
            const c = sd * (SLIT_HALF + PIECE_W / 2);
            return (
              <ScanLine key={sd} position={[c, 0, 0]} width={PIECE_W} height={SCAN_H} axis="x" progress={(xl - c) / PIECE_W + 0.5}
                intensity={0.8 * washK} thickness={0.004} glow={0.1} trail={0.2} />
            );
          })}
          {/* the core: solid authRed (normal blending reads red over any grey; hidden while it crosses the slit) */}
          <mesh position={[xl, 0, 0.001]} scale={[CORE_W, SCAN_H * 0.92, 1]} renderOrder={4} visible={Math.abs(xl) > SLIT_HALF + CORE_W / 2}>
            <planeGeometry />
            <meshBasicMaterial color={S.authRed} transparent depthWrite={false} fog={false} />
          </mesh>
        </group>
      ) : null}
      {/* the sung line, painted faintly on the wall either side of the hammer (the camera looks −X: screen-left = +Z) */}
      <LyricBlock line={27} rows={[[0, 1], [2], [3, 4]]} align="right" anchor="top" position={[wallX, top, z0 + GAP]} {...common} />
      <LyricBlock line={27} rows={[[5], [6, 7], []]} align="left" anchor="top" position={[wallX, top, z0 - GAP]} {...common} />
      {/* "LOCKS." names a lock (DESIGN-silhouette §2.6): authRed paint, same slot (row 3). The shared RED_WORDS list only
          has "locked", so the colour is given here. */}
      <LyricBlock line={27} rows={[[], [], [8]]} align="left" anchor="top" position={[wallX, top, z0 - GAP]} {...common}
        color={S.authRed} intensity={1} />
      <LyricBlock line={28} rows={[[0]]} align="left" anchor="top" position={[wallX, top - 3 * LH * EM, z0 - GAP]} {...common} />
    </SilStage>
  );
};
