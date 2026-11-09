/**
 * Shot 2 (79–146) — DOORBELL-CAM POV: "…and the doorbell said, 'Who?'"
 * A real barrel-distorted fisheye (FisheyeView) from the smart doorbell's lens on the night porch, grainy security-cam
 * grade, rain beyond the porch roof. He steps in and jabs the button (huge hand at the lens), leans in hopefully,
 * the doorbell answers "WHO?", a face-tracking box goes red: FACE NOT RECOGNIZED → upgrade to FACE PLUS; then
 * "INTRUDER ALERT · calling 911…" while he backs off and glances up at his own bedroom window.
 */
import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill} from 'remotion';
import {Stage, Rain} from '../../../lib/three';
import {SkyDome, ExteriorLights, RollingHills, House, HOUSE_SPOTS} from '../../../lib/sets/Exterior';
import {Street} from '../../../lib/sets/exterior/Street';
import {Guy, GuyPose, guyIdle, guyBlink, mergePose, keyPoses, guyPoint} from '../../../lib/characters/Guy';
import {Dialog} from '../../../lib/ui';
import {ramp, popIn, lerp, noise1, clamp01} from '../../../lib/time';
import {C, FONTS} from '../../../lib/palette';
import {FisheyeView} from '../Fisheye';
import {Drips} from '../Water';
import {WET, dripPoints} from '../cast';
import {W, SHOTS} from '../timing';

type V3 = [number, number, number];

const A = SHOTS.doorbell[0]; // 79
const CAM: V3 = [HOUSE_SPOTS.doorbellCam[0], HOUSE_SPOTS.doorbellCam[1], HOUSE_SPOTS.doorbellCam[2] + 0.03];
const TGT: V3 = [CAM[0] + 0.9, CAM[1] + 1.25, CAM[2] + 6];
const SRC_FOV = 100;
const THETA = 78; // deg, half angle across the width
const RES: [number, number] = [768, 432];

const PRESS = Math.round(W.doorbell) + 5; // ~84: finger on the button
const NOTREC = SHOTS.doorbell[0] + 35; // 114 (downbeat): FACE NOT RECOGNIZED
const ALERT = 130; // beat: calling 911

/** the Guy's porch position / pose as a function of the local frame */
const guyState = (f: number) => {
  const t = f / 30;
  const z = lerp(4.95, 4.38, ramp(f, A - 2, A + 9)) + lerp(0, 0.75, ramp(f, ALERT + 2, ALERT + 14));
  const x = HOUSE_SPOTS.doorbellCam[0] + 0.22;
  const talk = (a: number, b: number, amp = 1) => (f > a && f < b ? amp * (0.25 + 0.45 * Math.abs(Math.sin(t * 17)) * (0.6 + 0.4 * noise1(t * 5, 2))) : 0);
  const press = ramp(f, A, PRESS, (x2) => x2) * (1 - ramp(f, PRESS + 4, PRESS + 12));
  const lean = ramp(f, PRESS + 4, PRESS + 16) * (1 - ramp(f, ALERT + 2, ALERT + 12));
  const mad = ramp(f, NOTREC + 2, NOTREC + 6);
  const backoff = ramp(f, ALERT + 2, ALERT + 12);
  const idle = guyIdle(t, 3);
  const pressArm = {shoulderX: 1.38, shoulderZ: 0.05, shoulderY: 0.32, elbow: 0.28, twist: 0.2, wrist: 0, wristZ: -0.2, grip: 0.55, swing: 0};
  const selfArm = {shoulderX: 0.75, shoulderZ: 0.25, shoulderY: 1.1, elbow: 2.05, twist: 0.1, wrist: 0, wristZ: 0.3, grip: 0.7, swing: 0};
  const shrugArmL = {shoulderX: 0.55, shoulderZ: 0.75, shoulderY: -0.2, elbow: 1.35, twist: -0.9, grip: 0.1, swing: 0};
  let pose: GuyPose = mergePose(idle, {
    expression: 'sad', blink: guyBlink(t, 3), shrug: 0.5, headPitch: 0.25, torsoBend: 0.08,
  });
  // press the bell: right arm out to the lens
  pose = keyPoses(press, [
    [0, pose],
    [1, mergePose(pose, {armR: pressArm, torsoBend: 0.18, headPitch: 0.45, expression: 'neutral'})],
  ]);
  // lean in to the lens, hopeful smile + talking ("it's me!")
  if (lean > 0) {
    pose = keyPoses(lean, [
      [0, pose],
      [1, mergePose(pose, {torsoBend: 0.42, lean: 0.06, headPitch: 0.5, headTilt: 0.12, expression: 'happy', eyesY: -0.6, mouthOpen: talk(PRESS + 10, W.who - 3, 0.8)})],
    ]);
  }
  // "WHO?" -> shock; FACE NOT RECOGNIZED -> angry, pointing at his own face, yelling
  if (f >= W.who - 2) pose = mergePose(pose, {expression: mad > 0.5 ? 'angry' : 'shock', expression2: 'yell', expressionMix: 0.5 * mad, mouthOpen: f < NOTREC ? 0.35 : talk(NOTREC + 2, ALERT, 1.2)});
  if (mad > 0) pose = keyPoses(mad * (1 - backoff), [[0, pose], [1, mergePose(pose, {armR: selfArm, armL: shrugArmL, headTilt: -0.1})]]);
  // calling 911: shock, steps back, looks up-left at the bedroom window
  if (backoff > 0) {
    pose = keyPoses(backoff, [
      [0, pose],
      [1, mergePose(pose, {expression: 'shock', expressionMix: 0, mouthOpen: 0.5, torsoBend: -0.05, headPitch: -0.55, headYaw: 0.55, eyesY: 0.9, eyesX: 0.6, shrug: 0.9})],
    ]);
  }
  return {x, z, pose};
};

/** project a world point through the fisheye mapping -> screen px (1920x1080) */
const projectFish = (p: V3) => {
  const cam = new THREE.PerspectiveCamera(SRC_FOV, RES[0] / RES[1], 0.04, 400);
  cam.position.set(...CAM);
  cam.lookAt(...TGT);
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse);
  const th = Math.atan2(Math.hypot(v.x, v.y), -v.z);
  const d = Math.hypot(v.x, v.y) || 1;
  const r = th / ((THETA * Math.PI) / 180);
  const cx = (v.x / d) * r, cy = (v.y / d) * r;
  return {x: (cx * 0.5 + 0.5) * 1920, y: (0.5 - cy * (16 / 9) * 0.5) * 1080, r};
};

const toWorld = (local: V3, x: number, z: number): V3 => [x - local[0], HOUSE_SPOTS.porch[1] + local[1], z - local[2]]; // Guy rotated PI

export const DoorbellShot: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const {x, z, pose} = guyState(f);
  const ring = f >= PRESS && f < PRESS + 14 ? 0.5 + 0.5 * Math.sin((f - PRESS) * 1.3) : 0.35;
  const red = f >= NOTREC;
  const bell = red ? 0.6 + 0.4 * (Math.floor(f / 4) % 2) : ring;
  return (
    <>
      <Stage background="#03051a" env="night" fog={{color: '#0a0f35', near: 14, far: 60}} bloom={{strength: 0.7, radius: 0.5, threshold: 0.85}}
        lens={{aberration: 0.0025, vignette: 0.25, grain: 0.06, scanlines: 0.12, saturation: 1}}>
        <FisheyeView position={CAM} target={TGT} srcFov={SRC_FOV} theta={THETA} res={RES} saturation={0.6} tint="#cfe6ff" noise={0.1} seed={f}
          flash={f >= PRESS && f < PRESS + 3 ? 0.06 : 0} />
        <SkyDome preset="night" time={t + 110} clouds={0} starBrightness={0.2} />
        <ExteriorLights preset="night" intensity={0.7} />
        <RollingHills palette="night" grass={900} flowers={120} />
        <House time="night" doorbellGlow={bell} doorbellColor={red ? C.alertRed : C.aqua} />
        <Street length={60} wet lamps="right" spacing={20} houseLights={0.8} rotation={[0, Math.PI / 2, 0]} position={[0, 0, 17.5]} />
        <Rain time={t} count={2200} area={[18, 9, 12]} position={[-1, 0, 12.5]} color="#ffdcae" intensity={0.7} speed={11} wind={[0.9, 0.4]}
          length={0.5} width={0.009} splashes={200} />
        <pointLight position={[CAM[0] + 0.05, 1.35, CAM[2] + 0.12]} color={red ? '#ff8080' : '#c4e8ff'} intensity={red ? 0.7 : 0.55} distance={3.2} decay={2} />
        <group position={[x, HOUSE_SPOTS.porch[1], z]} rotation={[0, Math.PI, 0]}>
          <Guy pose={pose} outfit={WET} />
          <Drips time={t} points={dripPoints(pose)} rate={1.4} floorY={-0.0} intensity={0.8} />
        </group>
      </Stage>
      <DoorbellHUD f={f} pose={pose} gx={x} gz={z} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------- 2D HUD
const DOOR_TIME = (f: number) => {
  const s = 41 + Math.floor((f - A) / 30);
  return `11:58:${String(s).padStart(2, '0')} PM`;
};

const mono: React.CSSProperties = {fontFamily: FONTS.mono, color: '#f2f8ff', textShadow: '0 0 6px rgba(0,0,0,0.9), 2px 2px 0 #000', fontWeight: 700};

const FaceBox: React.FC<{cx: number; cy: number; size: number; color: string; label: string; sub?: string; scan: number}> = ({cx, cy, size, color, label, sub, scan}) => {
  const s = size;
  const L = s * 0.28;
  const corner = (rx: number, ry: number) => (
    <div style={{position: 'absolute', left: cx + rx * s / 2 - (rx > 0 ? L : 0), top: cy + ry * s / 2 - (ry > 0 ? L : 0), width: L, height: L,
      borderLeft: rx < 0 ? `6px solid ${color}` : undefined, borderRight: rx > 0 ? `6px solid ${color}` : undefined,
      borderTop: ry < 0 ? `6px solid ${color}` : undefined, borderBottom: ry > 0 ? `6px solid ${color}` : undefined,
      filter: `drop-shadow(0 0 8px ${color})`}} />
  );
  return (
    <>
      {corner(-1, -1)}
      {corner(1, -1)}
      {corner(-1, 1)}
      {corner(1, 1)}
      {/* scan line */}
      {scan >= 0 ? (
        <div style={{position: 'absolute', left: cx - s / 2 + 8, top: cy - s / 2 + scan * s, width: s - 16, height: 4, background: color, opacity: 0.75,
          boxShadow: `0 0 14px 3px ${color}`}} />
      ) : null}
      <div style={{position: 'absolute', left: cx - s / 2, top: cy - s / 2 - 52, ...mono, fontSize: 30, color, whiteSpace: 'nowrap'}}>{label}</div>
      {sub ? <div style={{position: 'absolute', left: cx - s / 2, top: cy + s / 2 + 10, ...mono, fontSize: 24, color, whiteSpace: 'nowrap'}}>{sub}</div> : null}
    </>
  );
};

const NOTREC_SPEC = {
  kind: 'error' as const,
  title: 'HomeSafe+ Doorbell',
  heading: 'FACE NOT RECOGNIZED',
  message: 'This face is not on your plan.\nUpgrade to FACE PLUS to be recognized\nat your own front door. Only $4.99/mo!',
  buttons: ['Upgrade to Face Plus', 'Cancel'],
  disabledButtons: [1],
  aquaButton: 0,
  width: 470,
};
const ALERT_SPEC = {
  kind: 'warning' as const,
  title: 'HomeSafe+ Security',
  heading: 'INTRUDER ALERT',
  message: 'Unrecognized person at your door.\nNotifying the authorities...',
  progressLabel: 'Dialing 9-1-1...',
  width: 430,
};

const DoorbellHUD: React.FC<{f: number; pose: GuyPose; gx: number; gz: number}> = ({f, pose, gx, gz}) => {
  const eyes = guyPoint(pose, 'eyes');
  const mouth = guyPoint(pose, 'mouth');
  const head = guyPoint(pose, 'head');
  const pe = projectFish(toWorld([(eyes[0] + mouth[0]) / 2, (eyes[1] + mouth[1]) / 2 + 0.01, (eyes[2] + mouth[2]) / 2], gx, gz));
  const pTop = projectFish(toWorld([head[0], head[1] + 0.13, head[2]], gx, gz));
  const pChin = projectFish(toWorld([mouth[0], mouth[1] - 0.06, mouth[2]], gx, gz));
  const size = Math.max(150, Math.min(470, Math.abs(pChin.y - pTop.y) * 0.95));
  const boxY = Math.max(size / 2 + 70, (pTop.y + pChin.y) / 2 + 10);
  const scanning = f >= A + 12 && f < NOTREC;
  const red = f >= NOTREC;
  const boxOn = f >= A + 12 && f < ALERT + 10;
  const blink = Math.floor(f / 8) % 2 === 0;
  const whoK = popIn(f, W.who - 3, 9);
  const whoOut = ramp(f, NOTREC - 2, NOTREC + 3);
  const dlgK = popIn(f, NOTREC, 10);
  const alertK = popIn(f, ALERT, 10);
  const shake = f >= W.who - 3 && f < W.who + 4 ? (Math.sin(f * 3.1) * 10) : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* top bar */}
      <div style={{position: 'absolute', left: 70, top: 52, ...mono, fontSize: 34, display: 'flex', alignItems: 'center', gap: 16}}>
        <span style={{display: 'inline-block', width: 26, height: 26, borderRadius: 13, background: blink ? '#ff2a2a' : '#5a0a0a', boxShadow: blink ? '0 0 14px #ff2a2a' : 'none'}} />
        <span>LIVE</span>
        <span style={{opacity: 0.85, fontSize: 28}}>FRONT DOOR · CAM 01</span>
      </div>
      <div style={{position: 'absolute', right: 70, top: 52, ...mono, fontSize: 30, textAlign: 'right'}}>
        NOV 09 2002<br />
        {DOOR_TIME(f)}
      </div>
      <div style={{position: 'absolute', left: 70, top: 790, ...mono, fontSize: 24, opacity: 0.9}}>
        <span style={{color: C.aqua, fontFamily: FONTS.web, fontStyle: 'italic', fontSize: 30}}>HomeSafe+</span>&nbsp; DOORBELL PRO&nbsp;
        <span style={{color: f >= PRESS ? '#ffe14a' : '#f2f8ff'}}>{f >= PRESS && f < W.who - 3 ? (blink ? '● DING DONG' : '') : f < PRESS ? 'MOTION DETECTED' : ''}</span>
      </div>
      {/* face tracking box */}
      {boxOn ? (
        <FaceBox cx={pe.x} cy={boxY} size={size} color={red ? '#ff3b30' : '#5dff7a'}
          label={red ? 'UNKNOWN VISITOR' : f >= W.who - 3 ? 'IDENTIFYING...' : 'FACE DETECTED'}
          sub={red ? 'MATCH: 0%   OWNER: ???' : `MATCH: ${Math.min(99, Math.floor(clamp01((f - A - 12) / 30) * 37))}%`}
          scan={scanning ? ((f - A) % 20) / 20 : -1} />
      ) : null}
      {/* "WHO?" from the doorbell speaker */}
      {f >= W.who - 3 && whoOut < 1 ? (
        <div style={{position: 'absolute', left: 1150 + shake, top: 250, transform: `scale(${whoK * (1 - 0.4 * whoOut)}) rotate(-6deg)`, transformOrigin: 'left center',
          opacity: 1 - whoOut, display: 'flex', alignItems: 'center', gap: 20}}>
          <svg width="110" height="110" viewBox="0 0 100 100">
            <polygon points="10,38 30,38 55,15 55,85 30,62 10,62" fill="#ffe14a" stroke="#000" strokeWidth="5" />
            <path d="M66 30 Q80 50 66 70" stroke="#ffe14a" strokeWidth="7" fill="none" />
            <path d="M76 18 Q98 50 76 82" stroke="#ffe14a" strokeWidth="7" fill="none" />
          </svg>
          <div style={{fontFamily: FONTS.impact, fontSize: 190, color: '#ffe14a', WebkitTextStroke: '6px #111', letterSpacing: 4,
            textShadow: '8px 8px 0 #d2231a, 0 0 30px rgba(255,225,74,0.6)', lineHeight: 1}}>WHO?</div>
        </div>
      ) : null}
      {/* dialogs */}
      {f >= NOTREC ? (
        <Dialog {...NOTREC_SPEC} x={1395} y={330} anchor="center" scale={1.32 * dlgK} hover={f > NOTREC + 10 ? 0 : undefined}
          sheen={lerp(-0.2, 1.2, ramp(f, NOTREC + 2, NOTREC + 16, (k) => k))} />
      ) : null}
      {f >= ALERT ? (
        <Dialog {...ALERT_SPEC} progress={clamp01((f - ALERT) / 22)} x={470} y={430} anchor="center" scale={1.25 * alertK} rotate={-2} />
      ) : null}
    </AbsoluteFill>
  );
};
