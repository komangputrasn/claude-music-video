/**
 * <SilPhone> — the flip phone as a SILHOUETTE (DESIGN-silhouette §4 Swing "the phone in one hand and the hammer in the
 * other", Cancel, Hold): a black clamshell with a small BONE screen showing a list ("PILLOW+ … CANCELLED"). Control words
 * (CANCELLED, PLAN, PLUS, LOCKED, …) print in authRed; everything else is void ink on the bone screen.
 *
 *   <SilPhone open?={1} screenLines?={[…]} screen?={1.0} extText?="3:15" ext?={0.5} keys?={0.07} halo?={0.4} {...group}/>
 *   <HeldSilPhone open? screenLines? screen? … offset?={[-0.018, -0.05, 0]}/>   // <SilGuy rightHand={…} pose={guyPhoneToEar(t)}/>
 *
 *   open         0 closed … 1 open (lid hinges ~165°, screen tilted 15° toward the viewer). Same hinge as the Y2K FlipPhone.
 *   screenLines  up to 7 lines of ≤ 20 mono characters. A line may be 'LABEL|STATUS' → label left, status right-aligned.
 *                Default: the cancel list (TENURE PLANS / PILLOW+ … CANCELLED / FEEDER+ … / THERMAL … / SLEEP+ …).
 *   screen       brightness of the bone screen (1.0 = just under bloom so the list stays legible; the halo does the glow).
 *   extText      the small outer display on the closed lid (dim bone); ext = its brightness (0 hides).
 *   keys         faint bone keypad backlight when open (0 = black keypad).
 *   halo         soft bone glow of the open screen (light spilling onto his cheek/hand) — makes the phone read even at
 *                the ear where the screen itself is hidden. 0 = none.
 * The screen/ext/keys are userData.silKeep (they stay lit inside <SilGuy>); the body is a silhouette.
 *
 * Frame (same as the Y2K FlipPhone): origin = GRIP, centre of the bottom (keypad) half; keypad faces +Z, hinge at the top
 * (+Y). Bottom half 0.048 × 0.088 × 0.0115 m. SILPHONE = {bottom, top, hinge, screenSize, screenCenterOpen, topY}.
 * <HeldSilPhone>: the Y2K HeldPhone grip — earpiece toward the fingertips, screen toward the palm/cheek at guyPhoneToEar.
 * For an insert of the screen, hold it in front of the camera: <SilPhone open={1} rotation-x={-0.25}/> and frame
 * SILPHONE.screenCenterOpen with a long lens.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {GREYS, S, SFONTS} from '../palette';
import {RimOpts, Silhouette} from '../Silhouette';
import {rbox} from '../../../lib/props/Padlock';
import {GRIP, GlowBillboard, GroupProps, V3, clamp01, isControlWord, useCanvasTex} from './shared';

const W = 0.048, H = 0.088, D = 0.0115;
const H2 = 0.084, D2 = 0.0092;
const HINGE: V3 = [0, H / 2, D / 2];
const OPEN_TILT = 0.26;
const SCR_W = 0.037, SCR_H = 0.031, SCR_Y = H2 * 0.56;

export const SILPHONE = {
  bottom: [W, H, D] as V3,
  top: [W, H2, D2] as V3,
  hinge: HINGE,
  screenSize: [SCR_W, SCR_H] as [number, number],
  /** internal screen centre (grip space) at open = 1 */
  screenCenterOpen: [0, H / 2 + SCR_Y * Math.cos(OPEN_TILT), D / 2 + SCR_Y * Math.sin(OPEN_TILT)] as V3,
  topY: H / 2 + (H2 + 0.004) * Math.cos(OPEN_TILT),
};

export const SILPHONE_DEFAULT_LINES = ['TENURE PLANS', 'PILLOW+|CANCELLED', 'FEEDER+|CANCELLED', 'THERMAL|CANCELLED', 'SLEEP+|CANCELLED',
  'NUTRITION|CANCELLED'];

const drawScreen = (ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const n = Math.max(1, Math.min(7, lines.length));
  const lh = (h * 0.9) / Math.max(5, n);
  const px = Math.round(lh * 0.62);
  const mx = w * 0.06;
  ctx.textBaseline = 'middle';
  lines.slice(0, 7).forEach((line, i) => {
    const y = h * 0.06 + lh * (i + 0.5);
    const [label, status] = line.split('|');
    const header = i === 0 && !status;
    if (header) {
      // inverted title bar
      ctx.fillStyle = GREYS.g1;
      ctx.fillRect(0, y - lh / 2, w, lh);
      ctx.fillStyle = '#ffffff';
    } else ctx.fillStyle = GREYS.g1;
    ctx.font = `${header ? 'bold ' : ''}${px}px ${SFONTS.mono}`;
    ctx.textAlign = header ? 'center' : 'left';
    ctx.fillText(label, header ? w / 2 : mx, y);
    if (status) {
      const red = status.split(/\s+/).some(isControlWord);
      ctx.textAlign = 'right';
      ctx.fillStyle = red ? S.authRed : GREYS.g1;
      ctx.font = `bold ${px}px ${SFONTS.mono}`;
      ctx.fillText(status, w - mx, y);
      // dotted leader
      ctx.fillStyle = GREYS.g6;
      const lw = ctx.measureText(label).width;
      ctx.font = `${px}px ${SFONTS.mono}`;
      const sw = ctx.measureText(status).width + px * 0.4;
      for (let x = mx + lw + px * 0.5; x < w - mx - sw; x += px * 0.55) ctx.fillRect(x, y + px * 0.25, px * 0.12, px * 0.12);
    }
  });
};
const drawExt = (ctx: CanvasRenderingContext2D, w: number, h: number, text: string) => {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(h * 0.42)}px ${SFONTS.mono}`;
  ctx.fillText(text, w / 2, h / 2);
};
const drawKeys = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  const cols = 3, rows = 4, kw = w * 0.2, kh = h * 0.075;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = w * (0.2 + c * 0.3) - kw / 2, y = h * (0.42 + r * 0.13) - kh / 2;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, kw, kh);
    }
  }
  // nav ring
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.2, w * 0.13, 0, Math.PI * 2);
  ctx.lineWidth = w * 0.03;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.globalAlpha = 1;
};

let phoneGeo: null | Record<string, THREE.BufferGeometry> = null;
const getGeo = () => {
  if (phoneGeo) return phoneGeo;
  const bottom = rbox(W, H, D, 0.005, 3);
  const top = rbox(W, H2, D2, 0.0045, 3);
  const barrel = new THREE.CylinderGeometry(0.0062, 0.0062, W * 0.62, 14);
  barrel.rotateZ(Math.PI / 2);
  const antenna = new THREE.CylinderGeometry(0.0034, 0.0042, 0.016, 10);
  const tip = new THREE.SphereGeometry(0.0042, 10, 8);
  const scr = new THREE.PlaneGeometry(SCR_W, SCR_H);
  const ext = new THREE.PlaneGeometry(0.022, 0.012);
  const keys = new THREE.PlaneGeometry(W * 0.9, H * 0.9);
  phoneGeo = {bottom, top, barrel, antenna, tip, scr, ext, keys};
  return phoneGeo;
};

export type SilPhoneProps = GroupProps & {
  open?: number;
  screenLines?: string[];
  screen?: number;
  extText?: string;
  ext?: number;
  keys?: number;
  halo?: number;
  rim?: RimOpts | null;
  color?: string;
  fog?: boolean;
};

export const SilPhone: React.FC<SilPhoneProps> = ({
  open = 1, screenLines = SILPHONE_DEFAULT_LINES, screen = 1.0, extText = '3:15', ext = 0.5, keys = 0.07, halo = 0.4, rim = null, color = S.void,
  fog = true, ...group
}) => {
  const g = getGeo();
  const key = screenLines.join('\n');
  const scrTex = useCanvasTex(400, Math.round((400 * SCR_H) / SCR_W), (ctx, w, h) => drawScreen(ctx, w, h, screenLines), [key]);
  const extTex = useCanvasTex(176, 96, (ctx, w, h) => drawExt(ctx, w, h, extText), [extText]);
  const keyTex = useCanvasTex(128, 236, drawKeys, []);
  const mats = useMemo(
    () => ({
      scr: new THREE.MeshBasicMaterial({map: scrTex, color: '#ffffff', fog: false}),
      ext: new THREE.MeshBasicMaterial({map: extTex, color: '#ffffff', fog: false}),
      keys: new THREE.MeshBasicMaterial({map: keyTex, color: '#ffffff', fog: false, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false}),
    }),
    [scrTex, extTex, keyTex],
  );
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const o = clamp01(open);
  useLayoutEffect(() => {
    mats.scr.color.set(S.bone).multiplyScalar(screen * (0.25 + 0.75 * o));
    mats.ext.color.set(S.bone).multiplyScalar(ext * (1 - o));
    mats.keys.color.set(S.bone).multiplyScalar(keys * o);
  });
  const theta = Math.PI + (OPEN_TILT - Math.PI) * o;
  return (
    <group {...group}>
      <Silhouette color={color} rim={rim} fog={fog}>
        <mesh geometry={g.bottom} />
        <mesh geometry={g.barrel} position={HINGE} />
        <group position={[W / 2 - 0.0055, H / 2 + 0.004, -D / 2 + 0.0042]}>
          <mesh geometry={g.antenna} />
          <mesh geometry={g.tip} position={[0, 0.008, 0]} />
        </group>
        {keys > 0 && o > 0.02 ? (
          <mesh geometry={g.keys} material={mats.keys} position={[0, 0, D / 2 + 0.0004]} userData={{silKeep: true}} />
        ) : null}
        <group position={HINGE} rotation={[theta, 0, 0]}>
          <group position={[0, H2 / 2 + 0.004, -D2 / 2]}>
            <mesh geometry={g.top} />
            {/* inner screen */}
            <mesh geometry={g.scr} material={mats.scr} position={[0, SCR_Y - H2 / 2 - 0.004, D2 / 2 + 0.0006]} userData={{silKeep: true}} />
            {halo > 0 && o > 0.05 ? (
              // behind the lid: the phone occludes it, so the light only leaks around the outline (never veils the screen)
              <GlowBillboard position={[0, SCR_Y - H2 / 2 - 0.004, -D2 / 2 - 0.004]} color={S.bone} intensity={halo * o * screen * 1.6}
                size={0.09} falloff={2.2} />
            ) : null}
            {/* outer mini display (visible when closed) */}
            {ext > 0 ? (
              <mesh geometry={g.ext} material={mats.ext} position={[0, -H2 / 2 + 0.024, -D2 / 2 - 0.0006]} rotation={[0, Math.PI, Math.PI]}
                userData={{silKeep: true}} />
            ) : null}
          </group>
        </group>
      </Silhouette>
    </group>
  );
};

export type HeldSilPhoneProps = SilPhoneProps & {offset?: V3};
/** Flip phone for <SilGuy rightHand> + guyPhoneToEar(): earpiece toward the fingertips, screen toward the palm side. */
export const HeldSilPhone: React.FC<HeldSilPhoneProps> = ({offset = [-0.018, -0.05, 0], ...props}) => (
  <group position={offset} rotation={GRIP.phone}>
    <SilPhone {...props} />
  </group>
);

export default SilPhone;
