/**
 * Shot PAGE — scene-local 0–125 (abs 900–1025, song 30.00–34.20). [4] "My Kindle's got Orwell, at least for today,"
 * The insert: over his right shoulder, face-on to the e-reader in his black hands. The pale page is the brightest thing in
 * the frame; "1984 · GEORGE ORWELL" heads it and the sung line is printed on it in ink, word by word, as it is sung.
 * A very slow push-in on the long lens; the city's slatted light lies on the floor far below.
 */
import React from 'react';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {cameraFovForVisible} from '../../lib/palette';
import {CellRoom} from '../../lib/sets';
import {Motes} from '../../lib/atmos';
import {bassAt} from '../../../lib/time';
import {T_CUT, lin, scanAt, smooth} from './timing';
import {InsertReader, V3, readerMatrix, readerPage, rollToUp} from './parts';
import {GUY_SPOT, GUY_YAW, readPose} from './common';

/** the verified over-the-shoulder direction (SilProps playground, Guy-local: camera − page target), normalised below */
const LOCAL_DIR: V3 = [-0.28, 0.921, -0.27];

export const ShotPage: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const u = lin(t, T_CUT.page, T_CUT.vent);
  const pose = readPose(t);
  const pg = readerPage(readerMatrix(pose, GUY_SPOT, GUY_YAW));
  // rotate the local direction into the world (Guy yaw)
  const c = Math.cos(GUY_YAW), s = Math.sin(GUY_YAW);
  const l = Math.hypot(...LOCAL_DIR);
  const dir: V3 = [(LOCAL_DIR[0] * c + LOCAL_DIR[2] * s) / l, LOCAL_DIR[1] / l, (-LOCAL_DIR[0] * s + LOCAL_DIR[2] * c) / l];
  const d = 1.02 - 0.1 * smooth(u);
  // aim a little above the page centre so the device's top bezel clears the letterbox
  const target: V3 = [pg.center[0] + pg.up[0] * 0.006, pg.center[1] + pg.up[1] * 0.006 - 0.002, pg.center[2] + pg.up[2] * 0.006];
  const cam: V3 = [target[0] + dir[0] * d, target[1] + dir[1] * d, target[2] + dir[2] * d];
  const roll = rollToUp(cam, target, pg.up);
  const pulse = 1 + 0.08 * bassAt(abs);
  return (
    <>
      <CameraRig position={cam} target={target} roll={roll} fov={cameraFovForVisible(9.6)} />
      <CellRoom time={t} blinds={{angle: 0.86}} ambient={0.05} vent={0.5}
        windowLight={{dir: [0.25, -0.42, -1], intensity: 0.85 * pulse, scan: scanAt(t), scanIntensity: 1.3}}>
        <SilGuy position={GUY_SPOT} rotation-y={GUY_YAW} pose={pose}
          rightHand={<InsertReader time={t} line={4} until={T_CUT.vent} />} />
        <Motes count={120} area={[1.2, 0.8, 1.2]} position={[pg.center[0], 0.2, pg.center[2]]} time={t} size={0.004}
          intensity={0.18} drift={[0.005, 0.02, 0]} seed={11} />
      </CellRoom>
    </>
  );
};
