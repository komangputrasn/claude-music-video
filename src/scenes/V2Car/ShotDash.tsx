// S4 (local 163-228) "and the speed is a tier": driver-POV on the instrument cluster. On "speed" he floors it and the
// needle surges; on the downbeat a big red PADLOCK slams onto the speedometer (red strobe, shake), the needle drops back
// to a crawl and the LCD reads SPEED PACK REQUIRED; on "tier" a price tag swings down from the padlock: $12.99/mo.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Stage, CameraRig, SparkleField, SpeedLines} from '../../lib/three';
import {ramp, lerp, noise1} from '../../lib/time';
import {Car, CAR} from '../../lib/props/Car';
import {Padlock} from '../../lib/props';
import {SkyDome, SKY_PRESETS, ExteriorLights, Street, canvasTex} from '../../lib/sets/Exterior';
import {C, FONTS} from '../../lib/palette';
import {B, W} from './timing';
import {Spot, V3} from './common';

const DASH_ROT: V3 = [0.26, Math.PI, 0];
const LOCK_AT: V3 = [-0.03, 0.026, 0.036];

const PriceTag: React.FC<{swing: number}> = ({swing}) => {
  const tex = useMemo(
    () =>
      canvasTex(512, 256, (c, w, h) => {
        // tag body (punched hole on the left)
        c.fillStyle = '#fff6c8';
        c.beginPath();
        c.moveTo(70, 12);
        c.lineTo(w - 14, 12);
        c.lineTo(w - 14, h - 12);
        c.lineTo(70, h - 12);
        c.lineTo(12, h / 2);
        c.closePath();
        c.fill();
        c.strokeStyle = '#c8102e';
        c.lineWidth = 8;
        c.stroke();
        c.fillStyle = '#20202a';
        c.beginPath();
        c.arc(58, h / 2, 14, 0, Math.PI * 2);
        c.fill();
        c.textAlign = 'center';
        c.fillStyle = '#0a3fd8';
        c.font = `900 50px ${FONTS.heavy}`;
        c.fillText('SPEED PACK', 300, 92);
        c.fillStyle = '#e2231a';
        c.font = `900 84px ${FONTS.impact}`;
        c.fillText('$12.99/mo', 300, 188);
        c.fillStyle = '#4a4a5a';
        c.font = `bold 22px ${FONTS.ui}`;
        c.fillText('unlocks gears 2-5*', 300, 228);
      }),
    [],
  );
  const mat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: true});
    m.color.setScalar(0.6);
    return m;
  }, [tex]);
  return (
    <group rotation={[0, 0, swing]}>
      {/* string from the shackle to the tag's punched hole */}
      <mesh position={[0.016, -0.022, 0]} rotation={[0, 0, 0.62]}>
        <boxGeometry args={[0.0012, 0.054, 0.0012]} />
        <meshBasicMaterial color="#f4f4f4" />
      </mesh>
      <group position={[0.032, -0.044, 0]} rotation={[0, 0, -0.42]}>
        <mesh position={[0.039, 0, 0]} material={mat}>
          <planeGeometry args={[0.088, 0.044]} />
        </mesh>
      </group>
    </group>
  );
};

export const ShotDash: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const slam = B.d3;
  const locked = f >= slam;
  // needle: surge on "speed", knocked back down by the lock, then tries (and fails) to climb
  const surge = ramp(f, W.speed - 3, slam, (x) => 1 - Math.pow(1 - x, 2));
  const knocked = ramp(f, slam, slam + 3, (x) => x);
  const trying = locked ? 0.012 * Math.max(0, Math.sin((f - slam) * 0.9)) : 0;
  const needle = lerp(lerp(0.0, 0.47, surge), 0.03, knocked) + trying;
  const rpm = locked ? 0.84 + 0.05 * noise1(t * 9, 4) : lerp(0.1, 0.8, surge);
  // padlock drop
  const drop = ramp(f, slam - 7, slam, (x) => x * x);
  const lockY = lerp(0.24, 0, drop);
  const hit = f >= slam ? Math.exp(-(f - slam) / 5) : 0;
  const bounce = f >= slam ? Math.sin((f - slam) * 0.9) * Math.exp(-(f - slam) / 4) * 0.01 : 0;
  // camera: driver POV, snap push-in on the slam
  const push = ramp(f, slam, slam + 4, (x) => 1 - Math.pow(1 - x, 3));
  const drift = ramp(f, B.cut3, B.cut4, (x) => x);
  const sh = hit * 0.006;
  const cam: V3 = [CAR.dashCam.position[0] + noise1(f * 1.7, 1) * sh - 0.015, lerp(1.27, 1.25, push) + noise1(f * 1.7, 2) * sh, lerp(0.02, 0.06, push) + drift * 0.02];
  const tgt: V3 = [0.375, lerp(1.06, 1.035, push), 0.36];
  const fov = lerp(50, 40, push) - drift * 3;
  // price tag swings in on "tier"
  const tagK = ramp(f, W.tier2 - 4, W.tier2 + 2, (x) => x);
  const swing = tagK > 0 ? (1 - tagK) * 1.6 + Math.sin((f - W.tier2) * 0.45) * 0.35 * Math.exp(-Math.max(0, f - W.tier2) / 14) : 0;
  const lines = ramp(f, W.speed - 4, W.speed + 6) * (1 - ramp(f, slam - 1, slam + 1, (x) => x));
  // the car rolls on (street lamps sweep overhead)
  const z = 30 * surge * 0.15 + (f - B.cut3) * 0.08;
  return (
    <Stage background={C.night} env={SKY_PRESETS.night.env} bloom={{strength: 0.6, radius: 0.45, threshold: 0.9}}>
      <CameraRig position={[cam[0] - 1.75, cam[1], cam[2] + z]} target={[tgt[0] - 1.75, tgt[1], tgt[2] + z]} fov={fov} />
      <SkyDome preset="night" time={t} clouds={0} />
      {/* he floors it on "speed": speed lines rush in... and die the instant the padlock lands */}
      {lines > 0.01 ? <SpeedLines intensity={lines} time={t} count={90} inner={0.5} center={[0, 0.1]} color="#bfefff" opacity={0.7} speed={1.6} /> : null}
      <ExteriorLights preset="night" intensity={0.7} />
      <Street length={90} lamps="left" spacing={16} houses houseLights={0.8} lampLights={false} />
      <group position={[-1.75, 0, z]}>
        <Car headlights={0} lights={false} wheelSpin={z / CAR.wheelRadius} speedNeedle={needle} rpmNeedle={rpm} dashLocked={locked}
          dashSpeedText={locked ? 'SPEED PACK REQUIRED' : 'SPEED: BASIC'} consoleText={locked ? 'GEAR 1 ONLY' : 'FM 101.1'}
          consoleColor={locked ? '#ff4a5a' : C.aqua} />
        <pointLight position={[0.39, 1.25, 0.1]} color="#9fd8ff" intensity={0.5} distance={1.2} decay={1.5} />
        <Spot position={[0, 0.75, 2.1]} target={[0, 0, 14]} color="#eaf4ff" intensity={16} />
        <pointLight position={[0.39, 1.15, 0.25]} color={C.alertRed} intensity={hit * 0.9} distance={0.7} decay={1.5} />
        <group position={CAR.dashboard} rotation={DASH_ROT}>
          {drop > 0 ? (
            <group position={[LOCK_AT[0], LOCK_AT[1] + lockY + bounce, LOCK_AT[2]]} rotation={[0, 0, (1 - drop) * 0.6]}>
              <Padlock scale={0.9} shake={locked ? 0.35 * Math.exp(-(f - slam) / 10) + 0.08 : 0} time={t} />
              {tagK > 0 ? (
                <group position={[0.006, 0.058, 0.012]}>
                  <PriceTag swing={swing} />
                </group>
              ) : null}
            </group>
          ) : null}
          <SparkleField count={14} seed={5} time={t} area={[0.14, 0.1, 0.02]} position={[-0.02, 0.01, 0.05]} size={0.03} intensity={hit * 4}
            colors={['#ffffff', '#ffd0d0', '#ff8080']} />
        </group>
      </group>
    </Stage>
  );
};
