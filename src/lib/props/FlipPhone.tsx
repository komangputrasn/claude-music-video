/**
 * FlipPhone — silver early-2000s clamshell ("CELLTEK"): external mini LCD on the lid, green-backlit pixel-font internal
 * screen, glossy keypad, chrome hinge barrel, stubby antenna with an LED.
 *
 * <FlipPhone open? screenLines? screenColor? softKeys? extText? ringing? time? {...groupProps}/>
 *   open        0 closed .. 1 open (lid hinges ~165°, screen tilted slightly toward the viewer)
 *   screenLines internal screen text lines (≈14 chars each, up to 5 lines). default ['NOV 09 2002', '3:15 AM']
 *   screenColor backlight (default classic green '#A8E063'); try '#8FD3FF' for blue
 *   softKeys    [left, right] soft-key labels on the bottom row of the screen (default ['Menu', 'Names'])
 *   extText     external LCD text when not ringing (default '3:15')
 *   ringing     0..1 buzz amplitude: phone vibrates, external LCD flashes "CALLING", antenna LED blinks, ring arcs pulse
 *   time        seconds for the ringing phase (defaults to current frame / fps)
 * Origin: the GRIP — centre of the bottom (keypad) half; keypad faces +Z, hinge at the top (+Y).
 * FLIPPHONE: {bottom: [w,h,d], hinge (axis point), screenCenterOpen (internal screen centre when open=1), screenSize, topY}.
 *
 * Example:
 *   <FlipPhone open={ramp(f, 0, 8)} screenLines={['CANCEL ALL?', '> YES', '  NO']} position={hand} rotation={[0.3, 0, 0]} />
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C, FONTS} from '../palette';
import {GroupProps, Ink, PROP_INK, chromeMat, clamp01, flatMat, glossMat, makeGlossMat, rbox, useCanvasTexture, usePropTime} from './Padlock';

const W = 0.048, H = 0.088, D = 0.0115; // bottom half
const H2 = 0.084, D2 = 0.0092; // top half
const HINGE: [number, number, number] = [0, H / 2, D / 2];
const OPEN_TILT = 0.26; // rad toward the viewer at open = 1
const SCR_W = 0.036, SCR_H = 0.03, SCR_Y = H2 * 0.56;
const KW = W - 0.002, KH = H - 0.003; // keypad decal plane
const NAV_Y = KH / 2 - 0.0145; // nav-pad centre on the keypad (matches drawKeypad)

export const FLIPPHONE = {
  bottom: [W, H, D] as [number, number, number],
  top: [W, H2, D2] as [number, number, number],
  /** hinge axis point (axis along X) */
  hinge: HINGE,
  screenSize: [SCR_W, SCR_H] as [number, number],
  /** internal screen centre (grip space) at open = 1 */
  screenCenterOpen: [0, H / 2 + SCR_Y * Math.cos(OPEN_TILT), D / 2 + SCR_Y * Math.sin(OPEN_TILT)] as [number, number, number],
  /** top of the phone when open */
  topY: H / 2 + (H2 + 0.004) * Math.cos(OPEN_TILT),
};

// ------------------------------------------------------------------------------------------------- canvases
const PX_W = 96, PX_H = 80, CELL = 4;

const drawScreen = (ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[], color: string, soft: [string, string]) => {
  // 1-bit mask at native LCD resolution
  const m = document.createElement('canvas');
  m.width = PX_W;
  m.height = PX_H;
  const mc = m.getContext('2d')!;
  mc.fillStyle = '#000';
  // signal bars
  for (let i = 0; i < 5; i++) mc.fillRect(2 + i * 3, 9 - i * 2, 2, 2 + i * 2);
  // battery
  mc.fillRect(PX_W - 16, 3, 12, 7);
  mc.clearRect(PX_W - 15, 4, 2, 5);
  mc.fillRect(PX_W - 4, 5, 2, 3);
  // text
  mc.font = `bold 10px ${FONTS.ui}`;
  mc.textBaseline = 'top';
  const body = lines.slice(0, 5);
  const top = body.length <= 2 ? 22 : 14;
  body.forEach((ln, i) => {
    const tw = mc.measureText(ln).width;
    mc.fillText(ln, Math.max(2, Math.round((PX_W - tw) / 2)), top + i * 11);
  });
  // soft keys
  mc.font = `9px ${FONTS.ui}`;
  mc.fillText(soft[0], 2, PX_H - 11);
  const rw = mc.measureText(soft[1]).width;
  mc.fillText(soft[1], PX_W - 2 - rw, PX_H - 11);
  mc.fillRect(0, PX_H - 13, PX_W, 1);
  const data = mc.getImageData(0, 0, PX_W, PX_H).data;
  // paint backlight + ghost grid + pixels
  const bl = new THREE.Color(color);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `#${bl.clone().lerp(new THREE.Color('#ffffff'), 0.18).getHexString()}`);
  g.addColorStop(1, `#${bl.clone().multiplyScalar(0.8).getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const ink = `#${bl.clone().multiplyScalar(0.16).getHexString()}`;
  const ghost = `rgba(0,0,0,0.05)`;
  for (let y = 0; y < PX_H; y++)
    for (let x = 0; x < PX_W; x++) {
      const on = data[(y * PX_W + x) * 4 + 3] > 110;
      ctx.fillStyle = on ? ink : ghost;
      ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
    }
};

const drawKeypad = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // canvas covers the keypad plane (KW × KH) — 1 m = w / KW px
  const k = w / KW;
  ctx.fillStyle = '#C3CAD6';
  ctx.fillRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#9AA2B0');
  bg.addColorStop(1, '#7E8696');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0.002 * k, 0.002 * k, w - 0.004 * k, h - 0.004 * k, 0.006 * k);
  ctx.fill();
  const key = (x: number, y: number, kw: number, kh: number, fill: [string, string], label: string, sub = '', labelCol = '#1B2233') => {
    const gx = ctx.createLinearGradient(0, y, 0, y + kh);
    gx.addColorStop(0, fill[0]);
    gx.addColorStop(1, fill[1]);
    ctx.fillStyle = 'rgba(20,24,36,0.55)';
    ctx.beginPath();
    ctx.roundRect(x, y + 0.0007 * k, kw, kh, kh * 0.45);
    ctx.fill();
    ctx.fillStyle = gx;
    ctx.beginPath();
    ctx.roundRect(x, y, kw, kh, kh * 0.45);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.roundRect(x + kw * 0.12, y + kh * 0.1, kw * 0.76, kh * 0.28, kh * 0.14);
    ctx.fill();
    ctx.fillStyle = labelCol;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${kh * 0.55}px ${FONTS.verdana}`;
    ctx.fillText(label, x + kw * (sub ? 0.32 : 0.5), y + kh * 0.55);
    if (sub) {
      ctx.font = `bold ${kh * 0.3}px ${FONTS.ui}`;
      ctx.fillText(sub, x + kw * 0.7, y + kh * 0.58);
    }
  };
  const silver: [string, string] = ['#F4F6FA', '#B9C0CC'];
  // soft keys + call/end
  const top = 0.006 * k;
  key(0.004 * k, top, 0.011 * k, 0.0065 * k, silver, '–');
  key(w - 0.015 * k, top, 0.011 * k, 0.0065 * k, silver, '–');
  key(0.004 * k, top + 0.0095 * k, 0.011 * k, 0.0075 * k, ['#7CF07A', '#22A33A'], '☎', '', '#0B3A12');
  key(w - 0.015 * k, top + 0.0095 * k, 0.011 * k, 0.0075 * k, ['#FF7A7A', '#D0201A'], '☎', '', '#4A0606');
  // nav pad well (3D ring sits on top)
  ctx.fillStyle = 'rgba(30,36,52,0.65)';
  ctx.beginPath();
  ctx.arc(w / 2, top + 0.0085 * k, 0.0098 * k, 0, Math.PI * 2);
  ctx.fill();
  // number grid 3×4
  const labels = [['1', ''], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'], ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', ''], ['0', '+'], ['#', '']];
  const gx0 = 0.0035 * k, gy0 = 0.024 * k, kw = 0.0128 * k, kh = 0.0108 * k, gapx = 0.0024 * k, gapy = 0.0034 * k;
  labels.forEach(([l, s], i) => {
    const c = i % 3, r = Math.floor(i / 3);
    key(gx0 + c * (kw + gapx), gy0 + r * (kh + gapy), kw, kh, silver, l, s);
  });
  // mic hole
  ctx.fillStyle = '#2A3040';
  ctx.beginPath();
  ctx.arc(w / 2, h - 0.004 * k, 0.0008 * k, 0, Math.PI * 2);
  ctx.fill();
};

const drawInner = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // inner face of the lid (W × H2): dark glossy bezel, speaker slot, brand
  const k = w / W;
  ctx.fillStyle = '#C3CAD6';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#3A4152');
  g.addColorStop(0.5, '#232835');
  g.addColorStop(1, '#2E3444');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0.0025 * k, 0.0025 * k, w - 0.005 * k, h - 0.005 * k, 0.005 * k);
  ctx.fill();
  // speaker slot
  ctx.fillStyle = '#0D0F16';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 0.007 * k, 0.006 * k, 0.014 * k, 0.0022 * k, 0.0011 * k);
  ctx.fill();
  // brand under the screen
  ctx.fillStyle = '#C9D2E4';
  ctx.font = `italic bold ${0.0042 * k}px ${FONTS.web}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CELLTEK', w / 2, h - 0.016 * k);
  ctx.fillStyle = C.aqua;
  ctx.font = `bold ${0.0026 * k}px ${FONTS.ui}`;
  ctx.fillText('C O L O R   F L I P   2 0 0 2', w / 2, h - 0.011 * k);
};

const drawOuter = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // outer face of the lid (closed orientation: hinge at the top of the canvas)
  const k = w / W;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, w, h);
  // chrome-ish oval frame around the ext LCD
  const cx = w / 2, cy = 0.022 * k;
  ctx.fillStyle = 'rgba(40,46,60,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 0.0165 * k, 0.0145 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // brand
  ctx.fillStyle = 'rgba(60,70,92,0.8)';
  ctx.font = `italic bold ${0.0048 * k}px ${FONTS.web}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CELLTEK', cx, h - 0.014 * k);
  // swoosh
  ctx.strokeStyle = 'rgba(25,198,255,0.75)';
  ctx.lineWidth = 0.0009 * k;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h - 0.009 * k);
  ctx.quadraticCurveTo(w / 2, h - 0.004 * k, w * 0.78, h - 0.011 * k);
  ctx.stroke();
};

const drawExt = (ctx: CanvasRenderingContext2D, w: number, h: number, text: string, ringOn: boolean, ringing: boolean) => {
  const bg = ringOn ? '#57E6FF' : '#0B1626';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const ink = ringOn ? '#04202A' : '#58C8FF';
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ringing) {
    // bell
    const bx = w / 2, by = h * 0.36, r = h * 0.17;
    ctx.beginPath();
    ctx.moveTo(bx - r, by + r * 0.8);
    ctx.quadraticCurveTo(bx - r, by - r * 1.1, bx, by - r * 1.1);
    ctx.quadraticCurveTo(bx + r, by - r * 1.1, bx + r, by + r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(bx - r * 1.25, by + r * 0.75, r * 2.5, r * 0.3);
    ctx.beginPath();
    ctx.arc(bx, by + r * 1.25, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `bold ${h * 0.2}px ${FONTS.ui}`;
    ctx.fillText('CALLING', w / 2, h * 0.8);
  } else {
    ctx.font = `bold ${h * 0.42}px ${FONTS.lcd}`;
    ctx.fillText(text, w / 2, h * 0.47);
    ctx.font = `bold ${h * 0.14}px ${FONTS.ui}`;
    ctx.fillText('NOV 09', w / 2, h * 0.8);
  }
};

// ------------------------------------------------------------------------------------------------- geometry
let pGeo: null | Record<string, THREE.BufferGeometry> = null;
const phoneGeo = () => {
  if (pGeo) return pGeo;
  const barrel = new THREE.CylinderGeometry(0.0072, 0.0072, 0.03, 18);
  barrel.rotateZ(Math.PI / 2);
  const barrelCap = new THREE.CylinderGeometry(0.0062, 0.0062, 0.0075, 16);
  barrelCap.rotateZ(Math.PI / 2);
  const ring = new THREE.TorusGeometry(0.0072, 0.0017, 8, 24);
  const okKey = new THREE.CylinderGeometry(0.0045, 0.0048, 0.0018, 18);
  okKey.rotateX(Math.PI / 2);
  const arc = new THREE.TorusGeometry(1, 0.06, 4, 18, 1.3);
  pGeo = {
    bottom: rbox(W, H, D, 0.0055, 3),
    top: rbox(W, H2, D2, 0.0055, 3),
    keypad: new THREE.PlaneGeometry(KW, KH),
    inner: new THREE.PlaneGeometry(W - 0.002, H2 - 0.002),
    outer: new THREE.PlaneGeometry(W - 0.002, H2 - 0.002),
    screen: new THREE.PlaneGeometry(SCR_W, SCR_H),
    screenFrame: rbox(SCR_W + 0.004, SCR_H + 0.004, 0.0012, 0.0012, 2),
    ext: new THREE.PlaneGeometry(0.02, 0.017),
    extFrame: rbox(0.024, 0.021, 0.0014, 0.003, 2),
    barrel,
    barrelCap,
    ring,
    okKey,
    antenna: new THREE.CylinderGeometry(0.0034, 0.0038, 0.016, 10),
    antennaTip: new THREE.SphereGeometry(0.0042, 12, 8),
    arc,
  };
  return pGeo;
};

export type FlipPhoneProps = GroupProps & {
  open?: number;
  screenLines?: string[];
  screenColor?: string;
  softKeys?: [string, string];
  extText?: string;
  ringing?: number;
  time?: number;
  outline?: number;
};

export const FlipPhone: React.FC<FlipPhoneProps> = ({
  open = 0, screenLines = ['NOV 09 2002', '3:15 AM'], screenColor = '#A8E063', softKeys = ['Menu', 'Names'], extText = '3:15',
  ringing = 0, time, outline = PROP_INK.hair * 1.1, ...rest
}) => {
  const t = usePropTime(time);
  const g = phoneGeo();
  const ring = clamp01(ringing);
  const ringOn = ring > 0.02 && Math.sin(t * Math.PI * 2 * 2.2) > -0.2;
  const linesKey = screenLines.join('\n');
  const screenTex = useCanvasTexture(PX_W * CELL, PX_H * CELL, (ctx, w, h) => drawScreen(ctx, w, h, screenLines, screenColor, softKeys), [linesKey, screenColor, softKeys[0], softKeys[1]], {pixelated: true});
  const keypadTex = useCanvasTexture(256, Math.round((256 * KH) / KW), drawKeypad, []);
  const innerTex = useCanvasTexture(256, Math.round((256 * H2) / W), drawInner, []);
  const outerTex = useCanvasTexture(256, Math.round((256 * H2) / W), drawOuter, []);
  const extTex = useCanvasTexture(160, 136, (ctx, w, h) => drawExt(ctx, w, h, extText, ringOn, ring > 0.02), [extText, ringOn, ring > 0.02]);
  const mats = useMemo(
    () => ({
      screen: new THREE.MeshBasicMaterial({map: screenTex, toneMapped: false, color: '#e8e8e8'}),
      ext: new THREE.MeshBasicMaterial({map: extTex, toneMapped: false}),
      keypad: makeGlossMat('#ffffff', {map: keypadTex, spec: 0.5, edge: 0.96, polygonOffset: 1}),
      inner: makeGlossMat('#ffffff', {map: innerTex, spec: 0.6, edge: 0.96, polygonOffset: 1}),
      outer: makeGlossMat('#ffffff', {map: outerTex, transparent: true, spec: 0, depthWrite: false, polygonOffset: 2}),
    }),
    [screenTex, extTex, keypadTex, innerTex, outerTex],
  );
  const silver = glossMat('#BCC3D0', {spec: 0.4, edge: 0.972, rim: 0.1});
  const dark = glossMat('#1E2330', {spec: 0.6, edge: 0.97});
  const chrome = chromeMat('#E6EAF2', 0.14);
  const led = ring > 0.02 && Math.sin(t * Math.PI * 2 * 3) > 0 ? flatMat('#FF3B5C', false) : glossMat('#5A1020', {spec: 0.8});
  const arcMat = flatMat(C.aqua, false);

  // hinge angle: π closed → OPEN_TILT open
  const o = clamp01(open);
  const theta = Math.PI + (OPEN_TILT - Math.PI) * o;
  // vibration
  const buzz = ring * (0.5 + 0.5 * Math.sin(t * 9.4));
  const vz = buzz * 0.07 * Math.sin(t * 97);
  const vx = buzz * 0.0012 * Math.sin(t * 83 + 1);

  return (
    <group {...rest}>
      <group rotation={[0, 0, vz]} position={[vx, 0, 0]}>
        {/* bottom half */}
        <Ink geometry={g.bottom} material={silver} outline={outline} />
        <mesh geometry={g.keypad} material={mats.keypad} position={[0, 0, D / 2 + 0.0002]} />
        <Ink geometry={g.ring} material={chrome} position={[0, NAV_Y, D / 2 + 0.0008]} outline={false} />
        <Ink geometry={g.okKey} material={silver} position={[0, NAV_Y, D / 2 + 0.0009]} outline={false} />
        {/* antenna beside the hinge */}
        <group position={[W / 2 - 0.0052, H / 2 + 0.006, -D / 2 + 0.0042]}>
          <Ink geometry={g.antenna} material={dark} outline={outline} />
          <Ink geometry={g.antennaTip} material={led} position={[0, 0.008, 0]} outline={outline} />
        </group>
        {/* hinge barrel */}
        <Ink geometry={g.barrel} material={silver} position={HINGE} outline={outline} />
        {[-1, 1].map((sx) => (
          <mesh key={sx} geometry={g.barrelCap} material={chrome} position={[HINGE[0] + sx * 0.0185, HINGE[1], HINGE[2]]} />
        ))}
        {/* top half (lid) — modelled open-flat in hinge space: y ∈ [0, H2], inner face at z = 0 facing +Z */}
        <group position={HINGE} rotation={[theta, 0, 0]}>
          <group position={[0, H2 / 2 + 0.004, -D2 / 2]}>
            <Ink geometry={g.top} material={silver} outline={outline} />
            <mesh geometry={g.inner} material={mats.inner} position={[0, 0, D2 / 2 + 0.0002]} />
            {/* internal screen */}
            <mesh geometry={g.screenFrame} material={dark} position={[0, SCR_Y - H2 / 2 - 0.004, D2 / 2 + 0.0002]} />
            <mesh geometry={g.screen} material={mats.screen} position={[0, SCR_Y - H2 / 2 - 0.004, D2 / 2 + 0.0009]} />
            {/* outer face: brand decal + external LCD (oriented to read correctly when CLOSED) */}
            <mesh geometry={g.outer} material={mats.outer} position={[0, 0, -D2 / 2 - 0.0002]} rotation={[0, Math.PI, Math.PI]} />
            <group position={[0, -H2 / 2 + 0.022, -D2 / 2]} rotation={[0, Math.PI, Math.PI]}>
              <Ink geometry={g.extFrame} material={chrome} outline={false} />
              <mesh geometry={g.ext} material={mats.ext} position={[0, 0, 0.0008]} />
            </group>
          </group>
        </group>
      </group>
      {/* ring arcs ")))" */}
      {ring > 0.02
        ? [0, 1, 2].flatMap((i) => {
            const ph = (t * 2.2 + i / 3) % 1;
            const r = 0.03 + ph * 0.035;
            const s = ring * (1 - ph);
            const y = H / 2 + (o > 0.5 ? 0.03 : -0.005);
            return [-1, 1].map((side) => (
              <mesh
                key={`${i}${side}`}
                geometry={g.arc}
                material={arcMat}
                position={[side * 0.006, y, 0]}
                rotation={[0, 0, side > 0 ? -0.65 : Math.PI - 0.65]}
                scale={r}
                visible={s > 0.05}
              />
            ));
          })
        : null}
    </group>
  );
};

export default FlipPhone;
