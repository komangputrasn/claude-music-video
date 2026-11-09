// Local copy of the Chorus1 house gift-wrap (ribbon bands + bow, "$9.99/mo" price tag, gold subscription padlock),
// extended with `release` 0..1: the padlock springs open and drops, the ribbons snap back, the bow pops off like a cork
// and the price tag falls onto the lawn. House-local coordinates. Pure: everything is driven by props.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Line} from '@react-three/drei';
import type {ThreeElements} from '@react-three/fiber';
import {glossMat, Padlock} from '../../lib/props';
import {toonMat} from '../../lib/characters/toon';
import {InkMesh} from '../../lib/characters/InkMesh';
import {outlineMat} from '../../lib/characters/toon';
import {popIn, clamp01} from '../../lib/time';
import {FONTS} from '../../lib/palette';

type V3 = [number, number, number];
const RED = '#F0182C';
const FRONT_Z = 3.56; // just in front of the front facade
const BAND = 0.5; // ribbon width
const BAND_T = 0.05;
const easeOutC = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

// ------------------------------------------------------------------ price tag
const TAG_W = 2.5, TAG_H = 2.1, TAG_POINT = 0.55;
const tagShape = () => {
  const s = new THREE.Shape();
  const w = TAG_W / 2, h = TAG_H;
  s.moveTo(-w, 0);
  s.lineTo(w, 0);
  s.lineTo(w, -h + 0.12);
  s.quadraticCurveTo(w, -h, w - 0.12, -h);
  s.lineTo(-w + 0.12, -h);
  s.quadraticCurveTo(-w, -h, -w, -h + 0.12);
  s.lineTo(-w, 0);
  // pointed top (house-shaped tag)
  s.lineTo(-w * 0.62, TAG_POINT);
  s.quadraticCurveTo(0, TAG_POINT + 0.16, w * 0.62, TAG_POINT);
  s.lineTo(w, 0);
  const hole = new THREE.Path();
  hole.absarc(0, TAG_POINT * 0.55, 0.11, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
};

let tagTexCache: THREE.CanvasTexture | null = null;
const tagTexture = () => {
  if (tagTexCache) return tagTexCache;
  const W = 1000, H = Math.round((W * (TAG_H + TAG_POINT + 0.16)) / TAG_W);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FFF86A');
  g.addColorStop(0.5, '#FFE81F');
  g.addColorStop(1, '#FFC81A');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const py = (y: number) => ((TAG_POINT + 0.16 - y) / (TAG_H + TAG_POINT + 0.16)) * H; // metres (tag local y) -> px
  // dashed inner border
  c.strokeStyle = '#E2231A';
  c.lineWidth = 14;
  c.setLineDash([34, 18]);
  c.strokeRect(46, py(-0.06), W - 92, py(-TAG_H + 0.08) - py(-0.06));
  c.setLineDash([]);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#1B1030';
  c.font = `bold 96px ${FONTS.heavy}`;
  c.fillText('HOME PLAN+', W / 2, py(-0.4));
  // big price
  c.font = `290px ${FONTS.impact}`;
  c.lineJoin = 'round';
  c.lineWidth = 22;
  c.strokeStyle = '#FFFFFF';
  c.strokeText('$9.99', W / 2 - 40, py(-1.32));
  c.fillStyle = '#E2231A';
  c.fillText('$9.99', W / 2 - 40, py(-1.32));
  c.font = `120px ${FONTS.impact}`;
  c.textAlign = 'left';
  c.strokeText('/mo', W / 2 + 255, py(-1.32));
  c.fillText('/mo', W / 2 + 255, py(-1.32));
  c.textAlign = 'center';
  c.fillStyle = '#1B1030';
  c.font = `italic bold 92px ${FONTS.web}`;
  c.fillText('*for now', W / 2, py(-1.82));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  tagTexCache = t;
  return t;
};

/** Pointed price tag, origin at the string hole, hangs down (-Y), faces +Z. */
export const PriceTag: React.FC<{swing?: number} & ThreeElements['group']> = ({swing = 0, ...g}) => {
  const geos = useMemo(() => {
    const shape = tagShape();
    const body = new THREE.ExtrudeGeometry(shape, {depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 10});
    body.translate(0, 0, -0.03);
    const face = new THREE.ShapeGeometry(shape, 10);
    const pos = face.attributes.position;
    const uv = face.attributes.uv;
    const top = TAG_POINT + 0.16, tot = TAG_H + top;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + TAG_W / 2) / TAG_W, (pos.getY(i) + TAG_H) / tot);
    uv.needsUpdate = true;
    return {body, face};
  }, []);
  const tex = tagTexture();
  const holeY = TAG_POINT * 0.55;
  return (
    <group {...g}>
      <group rotation={[0, 0, swing]}>
        <group position={[0, -holeY, 0]}>
          <InkMesh geometry={geos.body} material={toonMat('#F6C800')} outline={0.035} />
          <mesh geometry={geos.face} position={[0, 0, 0.056]}>
            <meshBasicMaterial map={tex} toneMapped={false} color={[0.92, 0.92, 0.92]} />
          </mesh>
          <mesh geometry={geos.face} position={[0, 0, -0.056]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
            <meshBasicMaterial color="#E8C400" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {/* reinforced hole ring */}
          <mesh position={[0, holeY, 0.06]}>
            <ringGeometry args={[0.11, 0.17, 24]} />
            <meshBasicMaterial color="#E9ECF2" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ ribbon
const ribbonMat = () => glossMat(RED, {spec: 0.55, edge: 0.97, rim: 0.25, rimColor: '#ffb0b8'});

/** a ribbon segment that grows along its local +Y from 0..len with progress p */
const Band: React.FC<{len: number; p: number; position: V3; rotation?: V3; width?: number}> = ({len, p, position, rotation = [0, 0, 0], width = BAND}) => {
  const k = clamp01(p);
  if (k <= 0.001) return null;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, (len * k) / 2, 0]} scale={[1, Math.max(1e-3, k), 1]} material={ribbonMat()}>
        <boxGeometry args={[width, len, BAND_T]} />
      </mesh>
      <mesh position={[0, (len * k) / 2, 0]} scale={[1.06, Math.max(1e-3, k) * 1.001, 1.6]} material={outlineMat(0.0)}>
        <boxGeometry args={[width, len, BAND_T]} />
      </mesh>
    </group>
  );
};

const Bow: React.FC<{s: number}> = ({s}) => {
  const m = ribbonMat();
  if (s <= 0.001) return null;
  return (
    <group scale={s}>
      {[-1, 1].map((side) => (
        <group key={side} rotation={[0, 0, side * 0.35]}>
          <mesh position={[side * 0.58, 0.18, 0]} rotation={[0, side * 0.25, 0]} scale={[1.25, 0.72, 0.5]} material={m}>
            <torusGeometry args={[0.45, 0.13, 8, 20]} />
          </mesh>
          <mesh position={[side * 0.58, 0.18, 0]} rotation={[0, side * 0.25, 0]} scale={[1.25, 0.72, 0.5]} material={outlineMat(0.02)}>
            <torusGeometry args={[0.45, 0.13, 8, 20]} />
          </mesh>
        </group>
      ))}
      {/* tails */}
      {[-1, 1].map((side) => (
        <group key={`t${side}`} rotation={[0.25, 0, side * 0.55]}>
          <mesh position={[0, -0.55, 0.05]} material={m}>
            <boxGeometry args={[0.36, 1.1, 0.05]} />
          </mesh>
        </group>
      ))}
      <InkMesh material={m} outline={0.025} position={[0, 0.05, 0.05]} scale={[1, 0.85, 0.8]}>
        <sphereGeometry args={[0.3, 14, 10]} />
      </InkMesh>
    </group>
  );
};

export type HouseDecoProps = {
  /** 0..1 ribbon bands wrap the house */
  wrap: number;
  /** 0..1 bow pops on */
  bow: number;
  /** 0..1 tag drops from the sky and settles */
  tag: number;
  /** 0..1 padlock clamps on */
  lock: number;
  /** seconds, for the tag swing / lock rattle */
  t: number;
  lockShake?: number;
  /** 0..1 everything falls off (liberation) */
  release?: number;
};

/** apex of the bow (house-local) */
export const BOW_POS: V3 = [0, 8.72, 4.02];
export const TAG_HOLE: V3 = [0, 7.75, 4.25];
export const LOCK_POS: V3 = [0, 3.15, 3.75];

export const HouseDeco: React.FC<HouseDecoProps> = ({wrap, bow, tag, lock, t, lockShake = 0, release = 0}) => {
  const r = clamp01(release);
  // release phases: lock springs open (0-0.12), everything lets go (0.12+)
  const go = clamp01((r - 0.12) / 0.88);
  const unwrap = 1 - clamp01(go * 2.2);
  // ribbon: vertical front band (grows up), horizontal band around the walls (grows outward from the centre)
  const pv = clamp01(wrap * 1.6) * unwrap;
  const ph = clamp01(wrap * 1.6 - 0.45) * unwrap;
  const pr = clamp01(wrap * 2.2 - 1.2) * unwrap;
  const tagDrop = clamp01(tag);
  const fall = (1 - Math.min(1, tagDrop * 1.6)) ** 2 * 9; // drop from above
  const settle = tagDrop >= 0.62 ? (tagDrop - 0.62) / 0.38 : 0;
  const swing = 0.32 * Math.exp(-settle * 3.2) * Math.sin(settle * 14) * (tagDrop >= 0.62 ? 1 : 0) + 0.035 * Math.sin(t * 1.7);
  const lockS = lock <= 0 ? 0 : 21 * Math.max(0, Math.min(1.15, popIn(lock * 14, 0, 14)));
  // tag falls to the lawn (gravity, one bounce), tumbling flat
  const tf = go;
  const g1 = Math.min(1, tf / 0.55);
  const tagFall = tf <= 0 ? 0 : tf < 0.55 ? g1 * g1 * 7.1 : 7.1 - Math.sin(((tf - 0.55) / 0.45) * Math.PI) * 0.5 * Math.exp(-(tf - 0.55) * 3);
  const tagTip = -1.35 * Math.min(1, tf / 0.6);
  const holeY = TAG_HOLE[1] + fall - tagFall;
  const tagZ = TAG_HOLE[2] + 2.6 * Math.min(1, tf / 0.6);
  // bow pops up like a cork and spins away
  const bowUp = go <= 0 ? 0 : easeOutC(go) * 7;
  const bowS = go <= 0 ? 1 : Math.max(0, 1 - go * 1.05);
  // padlock: shackle springs open, then the lock drops to the lawn
  const lockOpen = r <= 0 ? 0 : clamp01(r / 0.1);
  const lf2 = clamp01((r - 0.08) / 0.5);
  const lockDrop = lf2 * lf2 * (LOCK_POS[1] - 0.45);
  const lockRot = lf2 * 2.4;
  const lockZ = LOCK_POS[2] + lf2 * 1.8;
  return (
    <group>
      {/* vertical band up the front facade to the gable apex */}
      <Band len={8.5} p={pv} position={[0, 0.02, FRONT_Z]} />
      {/* over the ridge front -> back */}
      <Band len={8.2} p={pr} position={[0, 8.62, 4.1]} rotation={[-Math.PI / 2, 0, 0]} width={BAND * 1.02} />
      {/* horizontal band: front (two halves growing outward), then the sides */}
      <Band len={4.03} p={ph} position={[0, 3.62, FRONT_Z + 0.01]} rotation={[0, 0, -Math.PI / 2]} />
      <Band len={4.03} p={ph} position={[0, 3.62, FRONT_Z + 0.01]} rotation={[0, 0, Math.PI / 2]} />
      <Band len={7.12} p={clamp01(ph * 2 - 1)} position={[4.04, 3.62, 3.56]} rotation={[-Math.PI / 2, Math.PI / 2, 0]} />
      <Band len={7.12} p={clamp01(ph * 2 - 1)} position={[-4.04, 3.62, 3.56]} rotation={[-Math.PI / 2, -Math.PI / 2, 0]} />
      {/* bow at the front of the ridge */}
      {bowS > 0.01 ? (
        <group position={[BOW_POS[0], BOW_POS[1] + bowUp, BOW_POS[2] + bowUp * 0.3]} rotation={[go * 3, go * 5, go * 1.5]}>
          <Bow s={popIn(bow * 14, 0, 14) * 1.15 * bowS} />
        </group>
      ) : null}
      {/* string + tag */}
      {tagDrop > 0 ? (
        <>
          {go <= 0 ? (
            <Line points={[[BOW_POS[0], BOW_POS[1] + 0.05, BOW_POS[2] + 0.12], [TAG_HOLE[0], holeY, TAG_HOLE[2]]]} color="#2a1a10" lineWidth={3} />
          ) : null}
          <PriceTag position={[TAG_HOLE[0] + go * 0.8, holeY, tagZ]} swing={go > 0 ? go * 0.5 : swing} rotation={[0.04 + tagTip, go * 0.4, 0]} scale={1.3} />
        </>
      ) : null}
      {/* the subscription padlock where the ribbons cross */}
      {lockS > 0.01 ? (
        <group position={[LOCK_POS[0], LOCK_POS[1] - lockDrop, lockZ]} rotation={[lockRot, lockRot * 0.6, lockRot * 0.3]}>
          <Padlock scale={lockS} color="#F5C542" open={Math.max(lock < 0.6 ? 1 - lock / 0.6 : 0, lockOpen)} shake={lockShake} time={t} outline={0.004} />
        </group>
      ) : null}
    </group>
  );
};
