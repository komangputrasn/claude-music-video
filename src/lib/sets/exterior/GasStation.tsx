/**
 * <GasStation> — night-lit Y2K filling station "FUEL+ 24HR": white canopy with glowing bubblegum-pink + aqua neon strips
 * and bright light panels underneath, two pump islands (one <GasPump> each, nozzle on a hose), tall price sign with
 * LED $ numbers (incl. the joke tier "PREMIUM+ $9.99/mo"), and a "24/7 MART" convenience store box behind. Origin at the
 * canopy centre on the ground; the forecourt slab is included. Faces +Z (street side).
 *
 *   <GasStation lightsOn={1} nozzleOut={false} />
 *   <GasStation nozzleAt={[x, y, z]} nozzleRot={[rx, ry, rz]} />     // nozzle pulled out of pump A (pump-A-local coords),
 *                                                                    // hose follows it (e.g. the Guy's hand)
 *   GAS_SPOTS.pumpNozzle  world-ish (station-local) position of pump A's holstered nozzle grip
 *   GAS_SPOTS.carBay      {position, rotationY} — park a car here so its driver-side (+X) fuel cap faces pump A
 *   GAS_SPOTS.pumpA/pumpB {position, rotationY}, storeDoor, priceSign, canopyHeight
 *   toPumpLocal(stationPoint) converts a station-local point to pump-A-local (for nozzleAt).
 *
 *   <GasPump nozzleAt? nozzleRot? screenText="$0.00" lit={1} />   standalone pump (faces +Z, nozzle holster on +X side)
 *   <PumpNozzle />                                                 standalone nozzle (grip at origin, spout toward +Z)
 *   GAS_PUMP.nozzleHolster / GAS_PUMP.hoseOut                      pump-local anchors
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {toonMat} from '../../characters/toon';
import {C, FONTS} from '../../palette';
import {Ink, Glow, boxGeo, boxGeoM, canvasTex, glowTex, hash1, neonMat, toonTexMat} from './common';

type GroupProps = ThreeElements['group'];
type V3 = [number, number, number];

const CANOPY_H = 5.4; // underside height
const CW = 14; // canopy width (x)
const CD = 8; // canopy depth (z)

// ------------------------------------------------------------------ pump
export const GAS_PUMP = {
  /** grip of the holstered nozzle, pump-local */
  nozzleHolster: [0.5, 1.15, 0.12] as V3,
  /** where the hose leaves the pump body */
  hoseOut: [0.42, 1.75, 0.0] as V3,
  height: 2.1,
};

/** Fuel nozzle: grip at the origin, spout pointing +Z and angled down; hose attaches at -Z end. ~0.32 m long. */
export const PumpNozzle: React.FC<GroupProps & {color?: string}> = ({color = C.bubblegum, ...g}) => {
  const spout = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, 0.08), new THREE.Vector3(0, 0.02, 0.18), new THREE.Vector3(0, -0.03, 0.27)]);
    return new THREE.TubeGeometry(c, 8, 0.013, 6, false);
  }, []);
  return (
    <group {...g}>
      <Ink geometry={boxGeo(0.05, 0.075, 0.2)} color="#1c1e24" outline={0.008} position={[0, 0.02, -0.02]} />
      <Ink geometry={boxGeo(0.056, 0.05, 0.12)} color={color} outline={0.008} position={[0, 0.06, 0.0]} />
      <mesh geometry={spout} material={toonMat('#c8ccd6')} />
      {/* trigger guard */}
      <mesh position={[0, -0.04, 0.0]} rotation={[0, Math.PI / 2, 0]} material={toonMat('#2a2c34')}>
        <torusGeometry args={[0.05, 0.007, 4, 10, Math.PI]} />
      </mesh>
      <mesh geometry={boxGeo(0.02, 0.05, 0.015)} material={toonMat('#c8ccd6')} position={[0, -0.02, 0.03]} />
    </group>
  );
};

export type GasPumpProps = GroupProps & {
  /** pump-local position of the nozzle grip when pulled out (undefined = holstered) */
  nozzleAt?: V3;
  nozzleRot?: V3;
  screenText?: string;
  gallons?: string;
  lit?: number;
  accent?: string;
};

export const GasPump: React.FC<GasPumpProps> = ({nozzleAt, nozzleRot, screenText = '$0.00', gallons = '0.000', lit = 1, accent = C.aqua, ...g}) => {
  const screen = useMemo(
    () =>
      canvasTex(256, 160, (c, w, h) => {
        c.fillStyle = '#081018';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#ff5a2a';
        c.font = `bold 50px ${FONTS.lcd}`;
        c.textAlign = 'right';
        c.textBaseline = 'middle';
        c.fillText(screenText, w - 14, 44);
        c.fillStyle = '#ffb02a';
        c.font = `bold 34px ${FONTS.lcd}`;
        c.fillText(gallons, w - 14, 104);
        c.fillStyle = '#7fa0c0';
        c.font = `bold 15px ${FONTS.ui}`;
        c.textAlign = 'left';
        c.fillText('SALE', 12, 30);
        c.fillText('GALLONS', 12, 94);
        c.fillStyle = '#19c6ff';
        c.fillText('INSERT CARD · SUBSCRIBE', 12, 145);
      }),
    [screenText, gallons],
  );
  const header = useMemo(
    () =>
      canvasTex(256, 64, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#cfe8ff');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.font = `italic 900 40px ${FONTS.heavy}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#0a3fd8';
        c.fillText('FUEL', w / 2 - 20, h / 2 + 2);
        c.fillStyle = '#ff4fb8';
        c.fillText('+', w / 2 + 62, h / 2 + 2);
      }),
    [],
  );
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({map: screen}), [screen]);
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({map: header}), [header]);
  useLayoutEffect(() => {
    screenMat.color.setScalar(0.3 + lit * 1.0);
    headMat.color.setScalar(0.4 + lit * 0.55);
  });

  const out = new THREE.Vector3(...GAS_PUMP.hoseOut);
  const end = nozzleAt ? new THREE.Vector3(...nozzleAt) : new THREE.Vector3(...GAS_PUMP.nozzleHolster);
  const hoseKey = `${end.x.toFixed(3)},${end.y.toFixed(3)},${end.z.toFixed(3)}`;
  const hoseGeo = useMemo(() => {
    const tail = end.clone().add(new THREE.Vector3(0, 0, -0.14).applyEuler(new THREE.Euler(...(nozzleRot ?? [0, Math.PI / 2, 0]))));
    const dist = out.distanceTo(tail);
    const sag = Math.max(0.25, 1.15 - dist * 0.35);
    const mid = out.clone().lerp(tail, 0.5);
    mid.y = Math.min(out.y, tail.y) - sag;
    const p1 = out.clone().add(new THREE.Vector3(0.12, -0.15, 0.05));
    const curve = new THREE.CatmullRomCurve3([out, p1, mid, tail]);
    return new THREE.TubeGeometry(curve, 40, 0.022, 6, false);
  }, [hoseKey]);

  return (
    <group {...g}>
      {/* plinth + body */}
      <Ink geometry={boxGeo(1.0, 0.12, 0.6)} color="#9aa0aa" outline={0.015} position={[0, 0.06, 0]} />
      <RoundedBox args={[0.82, 1.7, 0.46]} radius={0.06} smoothness={2} position={[0, 0.97, 0]} material={toonMat('#f4f6fa')} />
      <mesh geometry={boxGeo(0.84, 0.2, 0.48)} material={toonMat(C.y2kBlue)} position={[0, 0.3, 0]} />
      <mesh geometry={boxGeo(0.84, 0.05, 0.48)} material={neonMat(accent, 0.6 + lit * 2.2)} position={[0, 0.43, 0]} />
      {/* header with brand */}
      <RoundedBox args={[0.92, 0.32, 0.52]} radius={0.05} smoothness={2} position={[0, 1.95, 0]} material={toonMat(C.y2kBlue)} />
      <mesh position={[0, 1.95, 0.265]} material={headMat}>
        <planeGeometry args={[0.8, 0.22]} />
      </mesh>
      <mesh position={[0, 1.95, -0.265]} rotation={[0, Math.PI, 0]} material={headMat}>
        <planeGeometry args={[0.8, 0.22]} />
      </mesh>
      {/* screen + grade buttons */}
      <mesh position={[0, 1.42, 0.238]} material={screenMat}>
        <planeGeometry args={[0.6, 0.38]} />
      </mesh>
      <mesh geometry={boxGeo(0.66, 0.44, 0.02)} material={toonMat('#2a2e38')} position={[0, 1.42, 0.222]} />
      {['#2ad46a', '#ffcf3a', C.alertRed].map((c, i) => (
        <mesh key={c} geometry={boxGeo(0.16, 0.09, 0.03)} material={neonMat(c, 0.4 + lit * 1.0)} position={[-0.2 + i * 0.2, 1.08, 0.24]} />
      ))}
      <mesh geometry={boxGeo(0.22, 0.14, 0.03)} material={toonMat('#3a3e48')} position={[0.18, 0.86, 0.24]} />
      <mesh geometry={boxGeo(0.12, 0.012, 0.035)} material={toonMat('#000000')} position={[0.18, 0.88, 0.25]} />
      {/* holster on +X side */}
      <Ink geometry={boxGeo(0.06, 0.2, 0.16)} color="#2a2e38" outline={0.01} position={[0.44, 1.08, 0.12]} />
      {/* hose */}
      <mesh geometry={hoseGeo} material={toonMat('#14161c')} />
      <PumpNozzle position={nozzleAt ?? GAS_PUMP.nozzleHolster} rotation={nozzleRot ?? [0.5, Math.PI / 2, 0]} />
    </group>
  );
};

// ------------------------------------------------------------------ station layout
const PUMP_A = {position: [3.2, 0.18, 0] as V3, rotationY: 0};
const PUMP_B = {position: [-3.2, 0.18, 0] as V3, rotationY: Math.PI};

const pumpLocalToStation = (p: V3, pump: {position: V3; rotationY: number}): V3 => {
  const v = new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0, 1, 0), pump.rotationY).add(new THREE.Vector3(...pump.position));
  return [v.x, v.y, v.z];
};

export const GAS_SPOTS = {
  canopyHeight: CANOPY_H,
  pumpA: PUMP_A,
  pumpB: PUMP_B,
  /** pump A's holstered nozzle grip, station-local */
  pumpNozzle: pumpLocalToStation(GAS_PUMP.nozzleHolster, PUMP_A),
  pumpNozzleB: pumpLocalToStation(GAS_PUMP.nozzleHolster, PUMP_B),
  /** car parking: car origin + heading (car faces +Z by default; this puts its driver side (+X) toward pump A... the car
   *  stands at x=5.3 facing -Z so its +X side looks at the pump) */
  carBay: {position: [5.15, 0, 0.4] as V3, rotationY: Math.PI},
  /** where the Guy stands to pump fuel (between car and pump A) */
  pumpStand: [4.15, 0.0, 0.9] as V3,
  storeDoor: [-2.0, 0, -11.6] as V3,
  priceSign: [8.6, 0, 6.2] as V3,
};
/** Convert a station-local point into pump-A-local coordinates (use for GasStation nozzleAt). */
export const toPumpLocal = (p: V3): V3 => {
  const v = new THREE.Vector3(...p).sub(new THREE.Vector3(...PUMP_A.position)).applyAxisAngle(new THREE.Vector3(0, 1, 0), -PUMP_A.rotationY);
  return [v.x, v.y, v.z];
};

export type GasStationProps = GroupProps & {
  lightsOn?: number;
  /** flicker/pulse of the neon strips 0..1 */
  neon?: number;
  nozzleAt?: V3;
  nozzleRot?: V3;
  screenText?: string;
  /** real point lights under the canopy */
  lights?: boolean;
  store?: boolean;
  sign?: boolean;
};

export const GasStation: React.FC<GasStationProps> = ({
  lightsOn = 1, neon = 1, nozzleAt, nozzleRot, screenText, lights = true, store = true, sign = true, ...g
}) => {
  const slab = useMemo(
    () =>
      canvasTex(256, 256, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillRect(0, 0, w, 3);
        c.fillRect(0, 0, 3, h);
        for (let i = 0; i < 3; i++) {
          const g = c.createRadialGradient(hash1(i, 2) * w, hash1(i, 3) * h, 2, hash1(i, 2) * w, hash1(i, 3) * h, 10 + hash1(i, 4) * 16);
          g.addColorStop(0, 'rgba(20,20,30,0.16)');
          g.addColorStop(1, 'rgba(20,20,30,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, w, h);
        }
      }, {repeat: [1 / 4, 1 / 4]}),
    [],
  );
  const fascia = useMemo(
    () =>
      canvasTex(1024, 96, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#0a3fd8';
        c.fillRect(0, h * 0.62, w, h * 0.38);
        c.font = `italic 900 64px ${FONTS.heavy}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#0a3fd8';
        c.fillText('FUEL', w / 2 - 70, h * 0.36);
        c.fillStyle = '#ff4fb8';
        c.fillText('+', w / 2 + 60, h * 0.36);
        c.fillStyle = '#ffffff';
        c.font = `bold 26px ${FONTS.web}`;
        c.fillText('24 HR  ·  PAY AT PUMP  ·  PLUS MEMBERS SAVE 2¢', w / 2, h * 0.81);
        c.fillStyle = '#0a3fd8';
        c.font = `bold 28px ${FONTS.web}`;
        c.fillText('24 HR', 110, h * 0.36);
        c.fillText('24 HR', w - 110, h * 0.36);
      }),
    [],
  );
  const priceTex = useMemo(
    () =>
      canvasTex(512, 896, (c, w, h) => {
        c.fillStyle = '#0a1238';
        c.fillRect(0, 0, w, h);
        // brand panel
        const g = c.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, '#4b9bff');
        g.addColorStop(1, '#0a3fd8');
        c.fillStyle = g;
        c.fillRect(16, 16, w - 32, 290);
        c.fillStyle = '#ffffff';
        c.fillRect(16, 300, w - 32, 6);
        c.font = `italic 900 150px ${FONTS.heavy}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#ffffff';
        c.fillText('FUEL', w / 2 - 40, 140);
        c.fillStyle = '#ff4fb8';
        c.fillText('+', w / 2 + 170, 140);
        c.fillStyle = '#bff3ff';
        c.font = `bold 36px ${FONTS.web}`;
        c.fillText('FILL UP · FOR NOW', w / 2, 255);
        const rows: [string, string, string?][] = [['UNLEADED', '1.49'], ['PLUS', '1.59'], ['PREMIUM', '1.69'], ['PREMIUM+', '9.99', '/mo']];
        rows.forEach(([name, price, per], i) => {
          const y = 380 + i * 130;
          c.fillStyle = '#ffffff';
          c.font = `bold 30px ${FONTS.ui}`;
          c.textAlign = 'left';
          c.fillText(name, 34, y - 34);
          c.fillStyle = '#05060e';
          c.fillRect(30, y - 12, w - 60, 92);
          c.fillStyle = i === 3 ? '#ff4fb8' : '#ff4a1a';
          c.font = `bold 84px ${FONTS.lcd}`;
          c.textAlign = 'right';
          c.fillText(`$${price}`, w - (per ? 120 : 90), y + 36);
          c.font = `bold 40px ${FONTS.lcd}`;
          c.fillText(per ?? '9', w - 44, y + (per ? 46 : 16));
        });
      }),
    [],
  );
  const storeTex = useMemo(
    () =>
      canvasTex(1024, 256, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#f4fbff');
        g.addColorStop(1, '#bfe6ff');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        // shelves
        for (let s = 0; s < 3; s++) {
          const y = 80 + s * 52;
          c.fillStyle = 'rgba(80,90,120,0.6)';
          c.fillRect(0, y + 30, w, 6);
          for (let i = 0; i < 70; i++) {
            const x = i * 15 + (s * 7) % 15;
            const cols = ['#ff4fb8', '#19c6ff', '#9bff3a', '#ff8a1e', '#8a4dff', '#ffd23a', '#e2231a'];
            c.fillStyle = cols[Math.floor(hash1(i + s * 99, 3) * cols.length)];
            const hh = 18 + hash1(i, s + 5) * 12;
            c.fillRect(x, y + 30 - hh, 11, hh);
          }
        }
        // posters
        const poster = (x: number, t1: string, t2: string, col: string) => {
          c.fillStyle = col;
          c.fillRect(x, 10, 150, 64);
          c.fillStyle = '#ffffff';
          c.font = `900 30px ${FONTS.impact}`;
          c.textAlign = 'center';
          c.fillText(t1, x + 75, 40);
          c.font = `bold 20px ${FONTS.comic}`;
          c.fillText(t2, x + 75, 64);
        };
        poster(30, 'SLUSHEE', '99¢ !!!', '#e2231a');
        poster(240, 'LOTTO', 'win BIG*', '#0a3fd8');
        poster(700, 'ICE', '$1.99 /bag', '#19a6c9');
        poster(860, 'HOT DOG', '2 for $1', '#ff8a1e');
      }),
    [],
  );
  const martSign = useMemo(
    () =>
      canvasTex(1024, 160, (c, w, h) => {
        c.fillStyle = '#10142a';
        c.fillRect(0, 0, w, h);
        c.font = `italic 900 104px ${FONTS.heavy}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.shadowColor = '#ff4fb8';
        c.shadowBlur = 24;
        c.fillStyle = '#ffd0ee';
        c.fillText('24/7 MART', w / 2, h / 2 + 4);
        c.shadowBlur = 0;
        c.strokeStyle = '#19c6ff';
        c.lineWidth = 6;
        c.strokeRect(10, 10, w - 20, h - 20);
      }),
    [],
  );

  const neonPink = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
  const neonAqua = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
  const panelMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);
  const priceMat = useMemo(() => new THREE.MeshBasicMaterial({map: priceTex}), [priceTex]);
  const fasciaMat = useMemo(() => new THREE.MeshToonMaterial({map: fascia, emissive: '#ffffff', emissiveMap: fascia, emissiveIntensity: 0.6}), [fascia]);
  const storeGlass = useMemo(() => new THREE.MeshBasicMaterial({map: storeTex}), [storeTex]);
  const martMat = useMemo(() => new THREE.MeshBasicMaterial({map: martSign}), [martSign]);
  const poolMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTex(), color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}),
    [],
  );
  useLayoutEffect(() => {
    neonPink.color.set(C.bubblegum).multiplyScalar(0.3 + neon * lightsOn * 3.2);
    neonAqua.color.set(C.aqua).multiplyScalar(0.3 + neon * lightsOn * 3.2);
    panelMat.color.set('#f2fbff').multiplyScalar(0.4 + lightsOn * 1.8);
    priceMat.color.setScalar(0.35 + lightsOn * 0.75);
    fasciaMat.emissiveIntensity = 0.1 + lightsOn * 0.32;
    storeGlass.color.setScalar(0.3 + lightsOn * 0.7);
    martMat.color.setScalar(0.3 + lightsOn * 1.1);
    poolMat.color.set('#dff4ff').multiplyScalar(0.1 * lightsOn);
  });

  const pumpA = (
    <GasPump position={PUMP_A.position} rotation={[0, PUMP_A.rotationY, 0]} nozzleAt={nozzleAt} nozzleRot={nozzleRot} screenText={screenText} lit={lightsOn} />
  );
  const tubeGeoX = useMemo(() => new THREE.CylinderGeometry(0.06, 0.06, CW + 0.1, 8).rotateZ(Math.PI / 2), []);
  const tubeGeoZ = useMemo(() => new THREE.CylinderGeometry(0.06, 0.06, CD + 0.1, 8).rotateX(Math.PI / 2), []);
  const top = CANOPY_H + 1.0;

  return (
    <group {...g}>
      {/* forecourt slab */}
      <mesh geometry={boxGeoM(30, 0.1, 30)} material={toonTexMat('#8e94a2', slab)} position={[0, -0.05, -4]} receiveShadow />
      {/* light pools under the canopy */}
      {[-4, 0, 4].map((x) => (
        <mesh key={`pool${x}`} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat} renderOrder={4}>
          <planeGeometry args={[9, 9]} />
        </mesh>
      ))}

      {/* pump islands */}
      {[PUMP_A, PUMP_B].map((p, i) => (
        <group key={`isl${i}`} position={[p.position[0], 0, p.position[2]]}>
          <Ink geometry={boxGeo(1.4, 0.18, 4.6)} color="#d6d9e0" outline={0.02} position={[0, 0.09, 0]} />
          <mesh geometry={boxGeo(1.44, 0.06, 4.64)} material={toonMat('#ffcf3a')} position={[0, 0.03, 0]} />
          {/* columns */}
          {[-1.9, 1.9].map((z) => (
            <group key={z}>
              <Ink geometry={boxGeo(0.42, CANOPY_H, 0.42)} color="#f4f6fa" outline={0.025} position={[0, CANOPY_H / 2, z]} />
              <mesh geometry={boxGeo(0.44, 0.5, 0.44)} material={toonMat(C.alertRed)} position={[0, 0.45, z]} />
            </group>
          ))}
          {/* trash can + squeegee bucket */}
          <mesh position={[0, 0.5, -1.25]} material={toonMat('#2f6bff')}>
            <cylinderGeometry args={[0.22, 0.2, 0.65, 10]} />
          </mesh>
        </group>
      ))}
      {pumpA}
      <GasPump position={PUMP_B.position} rotation={[0, PUMP_B.rotationY, 0]} lit={lightsOn} accent={C.bubblegum} screenText="$12.40" gallons="8.322" />

      {/* canopy */}
      <Ink geometry={boxGeo(CW, 1.0, CD)} material={fasciaMat} outline={0.05} position={[0, CANOPY_H + 0.5, 0]} />
      <mesh geometry={boxGeo(CW - 0.4, 0.06, CD - 0.4)} material={toonMat('#e8ecf4')} position={[0, CANOPY_H - 0.02, 0]} />
      {[-4.5, -1.5, 1.5, 4.5].map((x) =>
        [-2, 2].map((z) => <mesh key={`lp${x}${z}`} geometry={boxGeo(1.6, 0.04, 1.2)} material={panelMat} position={[x, CANOPY_H - 0.06, z]} />),
      )}
      {/* neon strips: pink along the top edge, aqua along the bottom edge */}
      {[1, -1].map((sz) => (
        <group key={`nz${sz}`}>
          <mesh geometry={tubeGeoX} material={neonPink} position={[0, top - 0.04, sz * (CD / 2 + 0.05)]} />
          <mesh geometry={tubeGeoX} material={neonAqua} position={[0, CANOPY_H + 0.04, sz * (CD / 2 + 0.05)]} />
        </group>
      ))}
      {[1, -1].map((sx) => (
        <group key={`nx${sx}`}>
          <mesh geometry={tubeGeoZ} material={neonPink} position={[sx * (CW / 2 + 0.05), top - 0.04, 0]} />
          <mesh geometry={tubeGeoZ} material={neonAqua} position={[sx * (CW / 2 + 0.05), CANOPY_H + 0.04, 0]} />
        </group>
      ))}
      {/* fake neon spill */}
      {[-5, 0, 5].map((x) => (
        <React.Fragment key={`g${x}`}>
          <Glow position={[x, top, CD / 2 + 0.3]} size={[6, 1.2]} color={C.bubblegum} opacity={0.22 * neon * lightsOn} />
          <Glow position={[x, CANOPY_H, CD / 2 + 0.3]} size={[6, 1.2]} color={C.aqua} opacity={0.22 * neon * lightsOn} />
        </React.Fragment>
      ))}
      {lights && lightsOn > 0.01 ? (
        <>
          <pointLight position={[4.6, CANOPY_H - 0.6, 0]} color="#eaf6ff" intensity={lightsOn * 11} distance={15} decay={1.3} />
          <pointLight position={[-4.6, CANOPY_H - 0.6, 0]} color="#eaf6ff" intensity={lightsOn * 11} distance={15} decay={1.3} />
          <pointLight position={[0, 2.2, CD / 2 + 1.5]} color={C.bubblegum} intensity={lightsOn * neon * 3} distance={10} decay={1.5} />
        </>
      ) : null}

      {/* price sign */}
      {sign ? (
        <group position={GAS_SPOTS.priceSign}>
          {[-0.9, 0.9].map((x) => (
            <Ink key={x} geometry={boxGeo(0.22, 4.2, 0.22)} color="#c8ccd6" outline={0.02} position={[x, 2.1, 0]} />
          ))}
          <Ink geometry={boxGeo(2.5, 4.3, 0.4)} color="#1a2050" outline={0.04} position={[0, 6.2, 0]} />
          <mesh position={[0, 6.2, 0.205]} material={priceMat}>
            <planeGeometry args={[2.3, 4.05]} />
          </mesh>
          <mesh position={[0, 6.2, -0.205]} rotation={[0, Math.PI, 0]} material={priceMat}>
            <planeGeometry args={[2.3, 4.05]} />
          </mesh>
          <Glow position={[0, 6.2, 0.6]} size={[4.5, 6]} color="#4b9bff" opacity={0.15 * lightsOn} />
        </group>
      ) : null}

      {/* convenience store */}
      {store ? (
        <group position={[0, 0, -14]}>
          <Ink geometry={boxGeo(16, 4.2, 7)} color="#f0ece4" outline={0.05} position={[0, 2.1, 0]} />
          <Ink geometry={boxGeo(16.3, 0.5, 7.3)} color={C.y2kBlue} outline={0.04} position={[0, 4.45, 0]} />
          <mesh position={[0, 1.55, 3.52]} material={storeGlass}>
            <planeGeometry args={[13, 2.7]} />
          </mesh>
          {[-6.5, -3.25, 0, 3.25, 6.5].map((x) => (
            <mesh key={x} geometry={boxGeo(0.12, 2.8, 0.1)} material={toonMat('#5a6070')} position={[x, 1.55, 3.55]} />
          ))}
          <mesh geometry={boxGeo(13.1, 0.12, 0.12)} material={toonMat('#5a6070')} position={[0, 2.92, 3.55]} />
          <mesh geometry={boxGeo(13.1, 0.12, 0.12)} material={toonMat('#5a6070')} position={[0, 0.2, 3.55]} />
          {/* door */}
          <mesh geometry={boxGeo(1.6, 2.5, 0.06)} material={toonMat('#8ad8ff', {emissive: '#bfe6ff', emissiveIntensity: 0.9})} position={[-2.0, 1.25, 3.58]} />
          {/* sign band */}
          <mesh position={[0, 3.55, 3.53]} material={martMat}>
            <planeGeometry args={[7.2, 1.1]} />
          </mesh>
          <Glow position={[0, 3.55, 3.9]} size={[9, 2.2]} color={C.bubblegum} opacity={0.25 * lightsOn} />
          {/* ice chest */}
          <group position={[4.2, 0, 4.4]}>
            <Ink geometry={boxGeo(1.6, 1.1, 0.8)} color="#e8f4ff" outline={0.025} position={[0, 0.55, 0]} />
            <mesh geometry={boxGeo(1.3, 0.35, 0.02)} material={neonMat('#19a6c9', 1.2)} position={[0, 0.75, 0.41]} />
          </group>
          {lights && lightsOn > 0.01 ? <pointLight position={[0, 2.0, 6]} color="#dff2ff" intensity={lightsOn * 4} distance={12} decay={1.4} /> : null}
        </group>
      ) : null}
    </group>
  );
};
