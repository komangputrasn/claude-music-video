/**
 * Hammer — grandpa's old claw hammer: worn honey-wood handle, black friction-tape grip, dark iron head with rust patches,
 * a polished striking face. The one thing he truly owns — treat it as a legendary item (`glow`).
 *
 * <Hammer glow? glowColor? {...groupProps}/>
 *   glow       0..1 legendary aura: additive fresnel rim shell + warm rim light on the materials. Keep it subtle (0.3–0.8).
 *   glowColor  aura colour (default warm gold '#FFC95A')
 * Origin: the GRIP point (middle of the taped grip) so it drops straight into a hand. Handle runs along +Y,
 * the striking face points +X, the claw points -X. Total length ≈ 0.35 m.
 * HAMMER: {length, headOffset (eye centre from grip), faceOffset (striking face centre), clawTip, buttY, topY, gripHalf}.
 *
 * Example (swing about the grip):
 *   <group position={handPos} rotation={[0, 0, -swingAngle]}><Hammer glow={0.4} /></group>
 *   // impact point in hammer space: HAMMER.faceOffset
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {rand} from '../time';
import {GroupProps, Ink, PROP_INK, chromeMat, hullOf, makeGlossMat, makeGlowMat, rbox, useCanvasTexture} from './Padlock';

const BUTT_Y = -0.07, HEAD_Y = 0.262, TOP_Y = 0.283;

export const HAMMER = {
  length: TOP_Y - BUTT_Y + 0.0,
  /** centre of the head (the eye) relative to the grip origin */
  headOffset: [0, HEAD_Y, 0] as [number, number, number],
  /** centre of the striking face (+X) */
  faceOffset: [0.066, HEAD_Y, 0] as [number, number, number],
  /** tip of the claw (-X) */
  clawTip: [-0.084, HEAD_Y - 0.026, 0] as [number, number, number],
  buttY: BUTT_Y,
  topY: TOP_Y,
  /** taped grip spans y ∈ [-gripHalf, +gripHalf] around the origin (roughly) */
  gripHalf: 0.055,
};

// ------------------------------------------------------------------------------------------------- textures
const drawWood = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#B57C44';
  ctx.fillRect(0, 0, w, h);
  // broad tone bands
  for (let i = 0; i < 7; i++) {
    const x = rand(`wb${i}`) * w;
    ctx.fillStyle = `rgba(${rand(`wc${i}`) > 0.5 ? '205,150,92' : '140,88,44'},0.35)`;
    ctx.fillRect(x, 0, 10 + rand(`ww${i}`) * 30, h);
  }
  // grain lines
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = `rgba(110,62,26,${0.25 + rand(`ga${i}`) * 0.35})`;
    ctx.beginPath();
    const x0 = rand(`gx${i}`) * w;
    for (let y = 0; y <= h; y += 16) {
      const x = x0 + Math.sin(y * 0.02 + i) * 4 + Math.sin(y * 0.071 + i * 3) * 2;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // worn pale patch where the thumb sits (upper part of the handle, below the head)
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 4, w * 0.5, h * 0.42, h * 0.16);
  g.addColorStop(0, 'rgba(232,190,130,0.55)');
  g.addColorStop(1, 'rgba(232,190,130,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // dark grime near the head
  const g2 = ctx.createLinearGradient(0, 0, 0, h * 0.12);
  g2.addColorStop(0, 'rgba(60,30,10,0.55)');
  g2.addColorStop(1, 'rgba(60,30,10,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
  // knot
  ctx.fillStyle = 'rgba(90,48,18,0.75)';
  ctx.beginPath();
  ctx.ellipse(w * 0.3, h * 0.6, 6, 13, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawTape = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#26262E';
  ctx.fillRect(0, 0, w, h);
  // diagonal wraps
  const band = 34;
  for (let k = -h; k < w + h; k += band) {
    ctx.strokeStyle = 'rgba(110,112,128,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + h * 0.55, h);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(k + 4, 0);
    ctx.lineTo(k + 4 + h * 0.55, h);
    ctx.stroke();
  }
  // scuffs
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(160,160,175,${0.08 + rand(`ts${i}`) * 0.15})`;
    ctx.fillRect(rand(`tx${i}`) * w, rand(`ty${i}`) * h, 2 + rand(`tw${i}`) * 14, 1 + rand(`th${i}`) * 3);
  }
};

const drawIron = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#41464F';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(${rand(`in${i}`) > 0.5 ? '90,96,108' : '28,30,36'},0.25)`;
    ctx.fillRect(rand(`ix${i}`) * w, rand(`iy${i}`) * h, 3 + rand(`iw${i}`) * 9, 2 + rand(`ih${i}`) * 5);
  }
  // rust patches (clusters of soft blobs)
  for (let c = 0; c < 9; c++) {
    const cx = rand(`rc${c}`) * w, cy = rand(`rcy${c}`) * h, cr = 14 + rand(`rr${c}`) * 34;
    for (let j = 0; j < 14; j++) {
      const a = rand(`ra${c}-${j}`) * Math.PI * 2, d = rand(`rd${c}-${j}`) * cr;
      const r = 4 + rand(`rs${c}-${j}`) * cr * 0.45;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const col = ['122,58,22', '166,92,40', '196,122,60', '96,44,18'][j % 4];
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col},0.85)`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // bright scratches
  ctx.strokeStyle = 'rgba(170,178,190,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    const x = rand(`sx${i}`) * w, y = rand(`sy${i}`) * h, l = 10 + rand(`sl${i}`) * 30, a = rand(`sa${i}`) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
};

// ------------------------------------------------------------------------------------------------- geometry
/** Planar UVs from object positions (u = x + z, v = y) × scale — good enough for small iron parts with a tiling texture. */
const planarUV = (g: THREE.BufferGeometry, k: number, ox = 0) => {
  const p = g.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) + p.getZ(i) * 0.7) * k + ox;
    uv[i * 2 + 1] = p.getY(i) * k;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
};

let hGeo: null | Record<string, THREE.BufferGeometry> = null;
const hammerGeo = () => {
  if (hGeo) return hGeo;
  const prof: [number, number][] = [
    [0.0, BUTT_Y], [0.0095, BUTT_Y], [0.0135, BUTT_Y + 0.004], [0.0148, BUTT_Y + 0.011], [0.0138, BUTT_Y + 0.024],
    [0.013, 0.0], [0.0122, 0.08], [0.0106, 0.17], [0.0104, 0.215], [0.011, 0.244], [0.0112, TOP_Y - 0.003], [0.0, TOP_Y],
  ];
  const handle = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  handle.scale(1.22, 1, 0.92);
  const tapeProf: [number, number][] = [
    [0.0124, BUTT_Y + 0.017], [0.0152, BUTT_Y + 0.019], [0.0146, BUTT_Y + 0.03], [0.0143, 0.0], [0.0138, 0.05], [0.0128, 0.056],
  ];
  const tape = new THREE.LatheGeometry(tapeProf.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  tape.scale(1.22, 1, 0.92);
  // loose frayed tape flap at the top of the wrap
  const flapS = new THREE.Shape();
  flapS.moveTo(0, 0);
  flapS.lineTo(0.014, 0.002);
  flapS.lineTo(0.011, 0.012);
  flapS.lineTo(0.007, 0.009);
  flapS.lineTo(0.004, 0.014);
  flapS.closePath();
  const flap = new THREE.ExtrudeGeometry(flapS, {depth: 0.0008, bevelEnabled: false});

  const eye = planarUV(rbox(0.033, 0.037, 0.029, 0.005, 3).clone(), 6);
  const neck = new THREE.CylinderGeometry(0.0138, 0.0118, 0.034, 16);
  neck.rotateZ(-Math.PI / 2);
  neck.translate(0.033, 0, 0);
  planarUV(neck, 6, 0.3);
  const face = new THREE.CylinderGeometry(0.0148, 0.0158, 0.016, 20);
  face.rotateZ(-Math.PI / 2);
  face.translate(0.057, 0, 0);
  planarUV(face, 6, 0.6);
  const faceDisk = new THREE.CircleGeometry(0.0136, 20);
  faceDisk.rotateY(Math.PI / 2);
  // claw prong side profile (XY), extruded along Z
  const clawS = new THREE.Shape();
  clawS.moveTo(-0.012, 0.016);
  clawS.bezierCurveTo(-0.04, 0.016, -0.07, 0.006, -0.086, -0.027);
  clawS.bezierCurveTo(-0.078, -0.022, -0.068, -0.012, -0.056, -0.008);
  clawS.bezierCurveTo(-0.04, -0.004, -0.026, -0.008, -0.012, -0.014);
  clawS.closePath();
  const prong = new THREE.ExtrudeGeometry(clawS, {depth: 0.0095, bevelEnabled: true, bevelSize: 0.0016, bevelThickness: 0.0016, bevelSegments: 2, curveSegments: 10});
  planarUV(prong, 6, 0.1);
  const rootS = new THREE.Shape();
  rootS.moveTo(-0.012, 0.016);
  rootS.lineTo(-0.036, 0.012);
  rootS.lineTo(-0.03, -0.006);
  rootS.lineTo(-0.012, -0.014);
  rootS.closePath();
  const root = new THREE.ExtrudeGeometry(rootS, {depth: 0.012, bevelEnabled: false});
  root.translate(0, 0, -0.006);
  planarUV(root, 6, 0.2);
  const wedge = new THREE.BoxGeometry(0.018, 0.0035, 0.004);
  hGeo = {handle, tape, flap, eye, neck, face, faceDisk, prong, root, wedge};
  return hGeo;
};

export type HammerProps = GroupProps & {
  /** 0..1 legendary aura */
  glow?: number;
  glowColor?: string;
  outline?: number;
};

export const Hammer: React.FC<HammerProps> = ({glow = 0, glowColor = '#FFC95A', outline = PROP_INK.thin, ...rest}) => {
  const g = hammerGeo();
  const woodTex = useCanvasTexture(256, 512, drawWood, []);
  const tapeTex = useCanvasTexture(256, 256, drawTape, []);
  const ironTex = useCanvasTexture(256, 256, drawIron, []);
  const mats = useMemo(() => {
    ironTex.wrapS = ironTex.wrapT = THREE.RepeatWrapping;
    tapeTex.wrapS = tapeTex.wrapT = THREE.RepeatWrapping;
    return {
      wood: makeGlossMat('#ffffff', {map: woodTex, spec: 0.18, edge: 0.97}),
      tape: makeGlossMat('#ffffff', {map: tapeTex, spec: 0.3, edge: 0.95}),
      iron: makeGlossMat('#ffffff', {map: ironTex, spec: 0.55, edge: 0.955}),
      flap: makeGlossMat('#2A2A33', {spec: 0.2, side: THREE.DoubleSide}),
      wedgeMat: makeGlossMat('#6B4A2A', {spec: 0}),
      glowMat: makeGlowMat(glowColor, 0.0028),
    };
  }, [woodTex, tapeTex, ironTex, glowColor]);
  useLayoutEffect(() => {
    const k = Math.max(0, Math.min(1, glow));
    (mats.glowMat.uniforms.uI as {value: number}).value = 1.4 * k;
    for (const m of [mats.wood, mats.tape, mats.iron]) {
      const u = m.userData.u as {uRim: {value: number}; uRimColor: {value: THREE.Color}};
      u.uRim.value = 0.55 * k;
      u.uRimColor.value.set(glowColor);
    }
  }, [glow, glowColor, mats]);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const chrome = chromeMat('#A9B1BE', 0.38);
  const showGlow = glow > 0.001;
  return (
    <group {...rest}>
      {/* handle + tape */}
      <Ink geometry={g.handle} material={mats.wood} outline={outline} />
      <Ink geometry={g.tape} material={mats.tape} outline={outline} />
      <mesh geometry={g.flap} material={mats.flap} position={[0.0135, 0.052, 0.006]} rotation={[0.2, 0.9, -0.2]} />
      {/* head */}
      <group position={[0, HEAD_Y, 0]}>
        <Ink geometry={g.eye} material={mats.iron} outline={outline} />
        <Ink geometry={g.neck} material={mats.iron} outline={outline} />
        <Ink geometry={g.face} material={mats.iron} outline={outline} />
        <mesh geometry={g.faceDisk} material={chrome} position={[0.0652, 0, 0]} />
        <Ink geometry={g.root} material={mats.iron} outline={outline} />
        <Ink geometry={g.prong} material={mats.iron} position={[0, 0, 0.0028]} outline={outline} />
        <Ink geometry={g.prong} material={mats.iron} position={[0, 0, -0.0123]} outline={outline} />
        {/* wooden wedge visible on top of the eye */}
        <mesh geometry={g.wedge} material={mats.wedgeMat} position={[0, 0.0186, 0]} />
        {showGlow ? (
          <>
            <mesh geometry={hullOf(g.eye)} material={mats.glowMat} />
            <mesh geometry={hullOf(g.neck)} material={mats.glowMat} />
            <mesh geometry={hullOf(g.face)} material={mats.glowMat} />
            <mesh geometry={hullOf(g.prong)} material={mats.glowMat} position={[0, 0, 0.0028]} />
            <mesh geometry={hullOf(g.prong)} material={mats.glowMat} position={[0, 0, -0.0123]} />
          </>
        ) : null}
      </group>
      {showGlow ? (
        <>
          <mesh geometry={hullOf(g.handle)} material={mats.glowMat} />
          <mesh geometry={hullOf(g.tape)} material={mats.glowMat} />
        </>
      ) : null}
    </group>
  );
};

export default Hammer;
