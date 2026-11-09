/**
 * <Printer feed={0..1} error={0..1} locked frame={f} pageLines={[...]} {...groupProps} />
 * Early-2000s inkjet ("INKSURE+"): silver-grey body, smoky ink-door lid, rear paper tray, front output tray.
 * Origin: base centre; faces +Z (pages come out toward +Z). Footprint 0.44 w x 0.3 d (+ trays), 0.15 tall.
 *   feed    0..1 how far the current page sticks out of the front slot (its bottom 26 cm).
 *   error   0..1 blinking red error LED + red glow + jittery shake (uses frame).
 *   locked  big red padlock clamped on the ink-door hasp.
 *   pageLines  text lines printed on the emerging page (top to bottom); the last line is red.
 * Anchors: PRINTER_ANCHORS.slot (page exit), .padlock, .errorLed (all printer-local).
 *
 *   <Printer position={[0, 0.74, 0]} feed={ramp(f, 0, 40)} error={f > 40 ? 1 : 0} locked frame={f} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {noise1} from '../../time';
import {C, FONTS} from '../../palette';
import {toonMat} from '../../characters/toon';
import {TBox, TCyl, geo, glowMat, chromeMat, makeCanvas, canvasTex} from './ink';
import {glowTexture} from './textures';

export const PRINTER_ANCHORS = {
  slot: [0, 0.066, 0.16] as [number, number, number],
  padlock: [-0.04, 0.1, 0.19] as [number, number, number],
  errorLed: [0.175, 0.152, 0.07] as [number, number, number],
};

export type PrinterProps = Omit<ThreeElements['group'], 'children'> & {
  feed?: number;
  error?: number;
  locked?: boolean;
  frame?: number;
  pageLines?: string[];
  children?: React.ReactNode;
};

const labelCache: {t?: THREE.CanvasTexture} = {};
const labelTex = () => {
  if (labelCache.t) return labelCache.t;
  const {c, ctx} = makeCanvas(320, 64);
  ctx.clearRect(0, 0, 320, 64);
  ctx.font = `italic 900 44px ${FONTS.heavy}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2c3550';
  ctx.fillText('INKSURE', 8, 34);
  const w = ctx.measureText('INKSURE').width;
  ctx.fillStyle = C.alertRed;
  ctx.fillText('+', 12 + w, 30);
  labelCache.t = canvasTex(c);
  return labelCache.t;
};

const DEFAULT_LINES = ['Dear Landlord,', '', 'Please find attached my', 'rent for Nov 2002 ......', '', 'PRINTING DISABLED'];

/** Padlock (red body, chrome shackle). Origin at the body centre; ~0.09 wide. */
export const Padlock: React.FC<Omit<ThreeElements['group'], 'children'> & {open?: number}> = ({open = 0, ...group}) => (
  <group {...group}>
    <TBox size={[0.085, 0.07, 0.03]} r={0.012} color={C.alertRed} ink={0.005} />
    <mesh geometry={geo.cyl(0.008, 0.008, 0.004, 10)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.006, 0.016]} material={toonMat('#2a0606')} />
    <mesh geometry={geo.box(0.005, 0.016, 0.004)} position={[0, -0.006, 0.016]} material={toonMat('#2a0606')} />
    <group position={[0, 0.035 + open * 0.03, 0]}>
      <mesh geometry={geo.torus(0.026, 0.0065, 8, 16, Math.PI)} material={chromeMat()} />
      <mesh geometry={geo.cyl(0.0065, 0.0065, 0.02, 8)} material={chromeMat()} position={[-0.026, -0.01, 0]} />
      <mesh geometry={geo.cyl(0.0065, 0.0065, 0.02, 8)} material={chromeMat()} position={[0.026, -0.01, 0]} />
    </group>
  </group>
);

export const Printer: React.FC<PrinterProps> = ({feed = 0, error = 0, locked = false, frame = 0, pageLines = DEFAULT_LINES, children, ...group}) => {
  const fd = Math.max(0, Math.min(1, feed));
  const er = Math.max(0, Math.min(1, error));
  // page texture (per instance)
  const pageKey = pageLines.join('\n');
  const {pageTex} = useMemo(() => {
    const {c, ctx} = makeCanvas(256, 362);
    ctx.fillStyle = '#fbfbf6';
    ctx.fillRect(0, 0, 256, 362);
    ctx.fillStyle = '#c9d6ff';
    ctx.fillRect(0, 0, 256, 6);
    ctx.textBaseline = 'top';
    pageLines.forEach((ln, i) => {
      const last = i === pageLines.length - 1;
      ctx.font = last ? `bold 24px ${FONTS.heavy}` : `16px ${FONTS.mono}`;
      ctx.fillStyle = last ? C.alertRed : '#3a3a48';
      ctx.fillText(ln, 22, 150 + i * (last ? 30 : 24) + (last ? 14 : 0), 212);
    });
    // inkjet banding streaks (running out of ink!)
    for (let y = 0; y < 362; y += 9) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, y, 256, 2);
    }
    const t = canvasTex(c);
    t.wrapT = THREE.ClampToEdgeWrapping;
    return {pageTex: t};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);
  useLayoutEffect(() => () => pageTex.dispose(), [pageTex]);
  const pageMat = useMemo(() => new THREE.MeshToonMaterial({map: pageTex, side: THREE.DoubleSide}), [pageTex]);
  useLayoutEffect(() => {
    pageTex.repeat.set(1, Math.max(0.001, fd));
    pageTex.offset.set(0, 0);
  });
  const errGlowMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), color: '#ff2a1a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}),
    [],
  );
  useLayoutEffect(() => () => { pageMat.dispose(); errGlowMat.dispose(); }, [pageMat, errGlowMat]);
  const blinkOn = er > 0.01 && frame % 12 < 7;
  useLayoutEffect(() => {
    errGlowMat.opacity = blinkOn ? er : 0;
  });

  const shake = er > 0.01 ? er : 0;
  const sx = shake * 0.006 * noise1(frame * 1.7, 11);
  const sy = shake * 0.004 * Math.abs(noise1(frame * 2.3, 12));
  const rz = shake * 0.03 * noise1(frame * 1.3, 13);
  const pageLen = fd * 0.26;
  const body = '#dde1ea';
  return (
    <group {...group}>
      <group position={[sx, sy, 0]} rotation={[0, 0, rz]}>
        {/* feet + body */}
        <TBox size={[0.4, 0.012, 0.26]} r={0.004} color="#3a3f4f" position={[0, 0.006, 0]} ink={false} />
        <TBox size={[0.44, 0.13, 0.3]} r={0.035} color={body} position={[0, 0.077, 0]} />
        {/* darker front band + output slot */}
        <TBox size={[0.36, 0.035, 0.02]} r={0.008} color="#9aa3b8" position={[0, 0.066, 0.143]} ink={false} />
        <mesh geometry={geo.box(0.26, 0.011, 0.01)} material={toonMat('#141824')} position={[0, 0.066, 0.152]} />
        {/* output tray */}
        <TBox size={[0.27, 0.008, 0.13]} r={0.003} color="#aab2c4" position={[0, 0.03, 0.2]} ink={0.004} />
        {/* smoky ink-door lid */}
        <TBox size={[0.32, 0.026, 0.19]} r={0.012} color="#6f7d9e" position={[-0.04, 0.147, 0.035]} ink={0.006} />
        <mesh geometry={geo.box(0.22, 0.004, 0.06)} material={toonMat('#8d9bbd')} position={[-0.04, 0.161, 0.06]} />
        {/* rear paper tray + paper */}
        <group position={[0, 0.14, -0.12]} rotation={[-0.55, 0, 0]}>
          <TBox size={[0.3, 0.008, 0.22]} r={0.003} color="#aab2c4" position={[0, 0, -0.11]} ink={0.004} />
          <TBox size={[0.215, 0.012, 0.2]} r={0.001} color="#fbfbf6" position={[0, 0.011, -0.1]} ink={0.003} />
        </group>
        {/* label */}
        <mesh geometry={geo.plane(0.12, 0.024)} position={[0.1, 0.112, 0.1505]}>
          <meshBasicMaterial map={labelTex()} transparent />
        </mesh>
        {/* control strip: power (green) + resume + error LED */}
        <TCyl args={[0.014, 0.014, 0.01, 14]} color="#e8ecf4" position={[0.17, 0.146, 0.1]} ink={0.003} />
        <mesh geometry={geo.circle(0.006, 12)} rotation={[-Math.PI / 2, 0, 0]} position={[0.17, 0.152, 0.1]} material={glowMat(C.lime, 2.2)} />
        <TCyl args={[0.011, 0.011, 0.008, 12]} color="#c3c9d6" position={[0.17, 0.144, 0.045]} ink={0.003} />
        <mesh geometry={geo.sphere(0.008, 10, 6)} position={PRINTER_ANCHORS.errorLed} material={blinkOn ? glowMat('#ff2a1a', 4) : toonMat('#5a1414')} />
        <mesh geometry={geo.plane(0.22, 0.22)} material={errGlowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0.175, 0.162, 0.07]} />
        {/* hasp + padlock */}
        <mesh geometry={geo.box(0.03, 0.03, 0.006)} material={chromeMat()} position={[-0.04, 0.135, 0.153]} />
        {locked ? <Padlock position={PRINTER_ANCHORS.padlock} rotation={[0.08, 0, 0]} /> : null}
        {/* emerging page */}
        {fd > 0.001 ? (
          <group position={PRINTER_ANCHORS.slot} rotation={[0.16 + 0.12 * fd, 0, 0]}>
            <mesh geometry={geo.plane(0.21, 1)} material={pageMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, pageLen / 2]} scale={[1, pageLen, 1]} />
          </group>
        ) : null}
      </group>
      <pointLight color="#ff2a1a" position={[0.17, 0.3, 0.15]} intensity={blinkOn ? 0.9 * er : 0} distance={1.4} decay={1.6} />
      {children}
    </group>
  );
};
