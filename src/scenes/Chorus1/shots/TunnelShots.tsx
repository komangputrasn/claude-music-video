// "Upgrade to continue": a tunnel of 3D pop-ups streaming at the camera; hero dialogs slam in on every beat.
import React from 'react';
import {CameraRig} from '../../../lib/three';
import {SkyDome as Y2KSky, Sunburst, SparkleField, WireGrid, SpeedLines} from '../../../lib/three/fx';
import {PopupTunnel3D, Popup3D, POPUP_MESSAGES, Cursor3D, popupButton3D, clickAt} from '../../../lib/ui';
import type {DialogSpec} from '../../../lib/ui';
import {Guy, guyRun, mergePose} from '../../../lib/characters/Guy';
import {lerp, clamp01} from '../../../lib/time';
import {C} from '../../../lib/palette';
import {CutEffect} from '../../../overlays/CutFlash';
import {K, beatL, lipSync, songT} from '../timing';
import {ShotProps, easeOut, easeIn, V3} from './common';

export const UPGRADE: DialogSpec = {
  kind: 'plus', title: 'Upgrade Required', heading: 'UPGRADE TO CONTINUE', message: 'Continuing is a PLUS feature.', buttons: ['Upgrade', 'Upgrade'],
  aquaButton: 0, aquaColor: 'lime', width: 470,
};
const SURE: DialogSpec = {kind: 'warning', title: 'Are you sure?', heading: 'Are you sure?', message: 'Are you sure you are sure?\nYou will lose everything.',
  buttons: ['Yes', 'No'], defaultButton: 1, width: 440};
const PLUS: DialogSpec = {kind: 'lock', title: 'PLUS Required', heading: 'PLUS REQUIRED', message: 'This button requires PLUS.', buttons: ['Upgrade', 'Cancel'],
  aquaButton: 0, disabledButtons: [1], width: 440};
const CONT: DialogSpec = {kind: 'question', title: 'Continue?', heading: 'Continue?', message: 'Upgrade to continue continuing.', buttons: ['Upgrade'],
  aquaButton: 0, aquaColor: 'gold', progress: 0.99, progressLabel: 'Continuing... 99%', width: 440};

/** curated tunnel pool (on-theme upsells) */
const POOL: DialogSpec[] = [UPGRADE, SURE, PLUS, CONT, POPUP_MESSAGES[1], POPUP_MESSAGES[2], POPUP_MESSAGES[5], POPUP_MESSAGES[15], POPUP_MESSAGES[18],
  POPUP_MESSAGES[19], POPUP_MESSAGES[7], POPUP_MESSAGES[11], POPUP_MESSAGES[23], POPUP_MESSAGES[4]];

export const TUNNEL_STAGE = {background: C.y2kBlue, env: 'chrome' as const, fog: {color: '#1E5BFF', near: 9, far: 44}, lens: {saturation: 1.15, vignette: 0.4}};

type Hero = {spec: DialogSpec; at: number; tilt: number};
const heroZ = (lf: number, at: number, next: number) => {
  if (lf < at) return null;
  const arrive = lerp(-16, 1.0, easeOut((lf - at) / 6));
  if (lf < next) return arrive + (lf - at) * 0.02;
  const k = (lf - next) / 5;
  if (k > 1) return null;
  return 1.0 + (next - at) * 0.02 + easeIn(k) * 5;
};

/** S06 (291-352): camera inside the pop-up tunnel; a new hero dialog slams in on every beat. */
export const Tunnel1: React.FC<ShotProps> = ({f, lf}) => {
  const t = lf / 30;
  const b = beatL(lf);
  const heroes: Hero[] = [
    {spec: UPGRADE, at: Math.round(K.upgrade1) - 2, tilt: 0.06},
    {spec: SURE, at: 309, tilt: -0.08},
    {spec: PLUS, at: 325, tilt: 0.05},
    {spec: CONT, at: Math.round(K.continue1) + 11, tilt: -0.04},
  ];
  const roll = lerp(0, -0.9, f / 61) + 0.05 * Math.sin(t * 3);
  return (
    <>
      <CameraRig position={[0, 0, 4]} target={[0, 0, -10]} fov={62 + 6 * b.pulse} roll={roll} />
      <Y2KSky preset="y2k" />
      <Sunburst position={[0, 0, -40]} radius={40} rays={20} rotation2d={t * 0.4} opacity={0.24} colorA="#8fd0ff" colorB="#2f6bff" glow={0.04} />
      <hemisphereLight args={['#dff2ff', '#20307a', 1.1]} />
      <PopupTunnel3D frame={lf} seed="c1-tunnel" count={54} radius={3.7} near={2} speed={0.34} width={2.1} length={44} position={[0, 0, -2]}
        pulse={b.pulse} specs={POOL} spin={0.006} />
      {heroes.map((h, i) => {
        const z = heroZ(lf, h.at, i + 1 < heroes.length ? heroes[i + 1].at : 99999);
        if (z === null) return null;
        const btn = popupButton3D(h.spec, 0, 2.5);
        return (
          <Popup3D key={i} spec={h.spec} width={2.5} pr={3} position={[0, 0.05, z]} rotation={[0, 0, h.tilt]} sheen={lerp(-0.2, 1.2, clamp01((lf - h.at - 4) / 12))}
            saturation={1.35}>
            {i === 0 ? <Cursor3D kind="hand" size={0.42} position={[btn[0] + 0.06, btn[1] - 0.1, btn[2] + 0.08]} click={clickAt(lf, h.at + 9, 12)} /> : null}
          </Popup3D>
        );
      })}
      <SparkleField count={30} seed={21} area={[7, 5, 10]} time={t} position={[0, 0, -4]} size={0.25} intensity={1.6} />
      <SpeedLines intensity={0.35 + 0.4 * b.pulse} time={t} count={60} inner={0.45} color="#ffffff" opacity={0.5} />
    </>
  );
};
export const Tunnel1Over: React.FC<ShotProps> = ({f}) => <CutEffect style="flash" k={f} tint="#DFF4FF" streak="#7FE6FF" seed={141} strength={0.75} />;

/** S15 (832-881): the Guy sprints head-on through the pop-up tunnel over a neon grid; dialogs whip past him. */
export const Tunnel2: React.FC<ShotProps> = ({f, lf}) => {
  const t = songT(lf);
  const b = beatL(lf);
  const pose = mergePose(guyRun(t, 1.5), {expression: 'determined', mouthOpen: lipSync(t) * 0.9, headPitch: -0.12});
  const k = f / 49;
  const cam: V3 = [lerp(0.6, -0.4, k), lerp(-0.3, -0.5, k), lerp(2.45, 1.95, k)];
  const heroAt = Math.round(K.continue2) - 4;
  const hz = lf < heroAt ? null : lerp(-14, 5.5, easeIn((lf - heroAt) / 10));
  return (
    <>
      <CameraRig position={cam} target={[0, -0.5, 0]} fov={70 + 5 * b.pulse} roll={lerp(-0.12, 0.1, k)} />
      <Y2KSky preset="y2k" />
      <Sunburst position={[0, 0, -40]} radius={40} rays={20} rotation2d={-t * 0.4} opacity={0.28} colorA="#ffc4ea" colorB="#ff5fc4" glow={0.05} />
      <hemisphereLight args={['#dff2ff', '#20307a', 1.0]} />
      <directionalLight position={[2, 3, 5]} intensity={2.2} color="#fff2e0" />
      <directionalLight position={[-3, 1, -4]} intensity={1.4} color="#7fd8ff" />
      <WireGrid position={[0, -1.75, 0]} size={80} offset={lf * 0.3} color="#FF4FB8" glow={1.2} />
      <PopupTunnel3D frame={lf + 300} seed="c1-tunnel2" count={48} radius={3.9} near={4.5} speed={0.4} width={2.0} length={44} position={[0, 0, 0]}
        pulse={b.pulse} specs={POOL} spin={-0.006} inner={0.7} />
      <Guy position={[0, -1.75, 0]} pose={pose} />
      {hz !== null ? <Popup3D spec={UPGRADE} width={2.4} pr={3} position={[0.9, 0.2, hz]} rotation={[0, -0.2, 0.1]} saturation={1.35} /> : null}
      <SpeedLines intensity={0.45 + 0.4 * b.pulse} time={t} count={70} inner={0.5} color="#ffffff" opacity={0.5} />
    </>
  );
};
export const Tunnel2Over: React.FC<ShotProps> = ({f, lf}) => (
  <>
    <CutEffect style="flash" k={f} tint="#FFE6F6" streak="#FF8AD0" seed={151} strength={0.7} />
    <CutEffect style="flash" k={Math.round(lf - K.continue2)} tint="#FFFFFF" streak="#7FE6FF" seed={152} strength={0.5} />
  </>
);
