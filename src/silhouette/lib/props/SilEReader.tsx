/**
 * <SilEReader> — the e-reader that loses *1984* (DESIGN-silhouette §4 V1Feeder): a PALE RECTANGLE (bone screen) in a black
 * device. As `progress` rises its printed words peel off the page one by one, crumble into ASH flakes and drift UP into a
 * ceiling vent (red-lit as they are swallowed, if you give the vent). The page ends blank.
 *
 *   <SilEReader progress?={0} vent?={[x, y, z] (WORLD space)} rise?={1.5} text?={…} title?="1984" pale?={0.82}
 *               ink?={GREYS.g3} ash?={GREYS.g7} ventRed?={1.3} flakes?={5} flakeSize?={1} seed?={1} rim? color? fog? {...group}/>
 *   <HeldSilEReader mode?='read'|'show' {...same props}/>      // <SilGuy rightHand={…}/>
 *
 *   progress  0 = full page … 1 = every word gone. Words leave roughly top → bottom (with jitter); each takes 0.38 of the
 *             progress range to reach the vent, so drive progress over ≥ 4 s for a slow, sad drift.
 *   vent      WORLD-space point (the <SilStage> root's coordinates) the ash is pulled into — e.g. a ceiling vent above him.
 *             Paths are computed in world space every frame, so the ash rises straight up even while the reader is
 *             tilted in his hand. Without `vent` the ash rises `rise` metres (world +Y) and fades.
 *   pale      flat brightness of the screen (0.82 bone = a pale rectangle, just under bloom). Not a light source.
 *   ink/ash   word ink colour on the page, and the pale ash the flakes turn into once airborne (readable on dark).
 *   ventRed   authRed intensity flakes pick up in the last 30% of their path (TENURE's vent swallowing them). 0 = none.
 *   flakes    ash flakes per word (one draw call for all; ≈ 80 words × flakes).
 *   flakeSize flake size multiplier (1 = 2–5 mm flakes for close-ups; use ~2.5–3 in wide shots so the stream reads).
 *   text      page body (auto-wrapped, Futura, original filler — not Orwell's text); title = big heading word.
 * The screen, words and ash are userData.silKeep (they stay pale/grey inside <SilGuy>); the device body is a silhouette.
 *
 * Frame (same as the Y2K EReader): origin = device CENTRE, screen faces +Z, upright (+Y). 0.122 × 0.172 × 0.0095 m.
 * SILEREADER = {size, screenCenter, screenSize}.
 * <HeldSilEReader mode='read'> (default): for mergePose(guyHoldUp(0, t), {headPitch: 0.5}) — the fist holds the bottom edge
 *   at his chest, the screen faces UP toward his face, the top edge points away from him. Frame the page from a high 3/4.
 * <HeldSilEReader mode='show'>: the HeldBook grip — at guyHoldUp(1) the screen faces the camera in front of him.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {GREYS, S, SFONTS} from '../palette';
import {RimOpts, Silhouette} from '../Silhouette';
import {rbox} from '../../../lib/props/Padlock';
import {noise1} from '../../../lib/time';
import {GRIP, GroupProps, V3, basisEuler, clamp01, hash, smooth01} from './shared';

const W = 0.122, H = 0.172, D = 0.0095;
const SW = 0.09, SH = 0.12, SY = 0.013;
const CW = 512, CH = 683;
const FLY = 0.38;

export const SILEREADER = {
  size: [W, H, D] as V3,
  screenCenter: [0, SY, D / 2 + 0.0006] as V3,
  screenSize: [SW, SH] as [number, number],
};

export const SILEREADER_TEXT =
  'The hallway clock had stopped at a quarter past three and nobody came to wind it. He read the same line twice, ' +
  'because the page was the only thing in the room that did not ask him for anything. Outside, the screens said the ' +
  'night was included in his plan. In here the paper said nothing at all, and he loved it for that. He turned the ' +
  'page slowly, as if somebody might be listening, and the dog sighed at his feet.';

type Word = {x: number; y: number; w: number; h: number; rect: [number, number, number, number]; row: number};

const layout = (ctx: CanvasRenderingContext2D, title: string, text: string): {words: Word[]; rows: number} => {
  const words: Word[] = [];
  const mx = CW * 0.09;
  ctx.textBaseline = 'alphabetic';
  // title
  const tpx = 54;
  ctx.font = `600 ${tpx}px ${SFONTS.futura}`;
  const tw = ctx.measureText(title).width;
  words.push({x: CW / 2 - tw / 2, y: 92, w: tw, h: tpx, rect: [0, 0, 0, 0], row: 0});
  const spx = 17;
  ctx.font = `${spx}px ${SFONTS.futura}`;
  const st = 'PART ONE';
  const sw = ctx.measureText(st).width;
  words.push({x: CW / 2 - sw / 2, y: 128, w: sw, h: spx, rect: [0, 0, 0, 0], row: 1});
  // body
  const px = 23, lh = 37;
  ctx.font = `${px}px ${SFONTS.futura}`;
  const space = ctx.measureText(' ').width;
  let x = mx + px * 1.2, y = 186, row = 2;
  for (const t of text.split(/\s+/).filter(Boolean)) {
    const w = ctx.measureText(t).width;
    if (x + w > CW - mx) {
      x = mx;
      y += lh;
      row++;
    }
    if (y > CH - 30) break;
    words.push({x, y, w, h: px, rect: [0, 0, 0, 0], row});
    x += w + space;
  }
  return {words, rows: row + 1};
};

const buildPage = (title: string, text: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d')!;
  const {words, rows} = layout(ctx, title, text);
  const labels = [title, 'PART ONE', ...text.split(/\s+/).filter(Boolean)];
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = '#ffffff';
  words.forEach((wd, i) => {
    const px = i === 0 ? 54 : i === 1 ? 17 : 23;
    ctx.font = `${i === 0 ? '600 ' : ''}${px}px ${SFONTS.futura}`;
    ctx.fillText(labels[i], wd.x, wd.y);
    // rect in UV (texture flipY: v = 1 − py/CH), padded
    const pad = 3;
    const x0 = wd.x - pad, x1 = wd.x + wd.w + pad, yTop = wd.y - px * 0.82 - pad, yBot = wd.y + px * 0.24 + pad;
    wd.rect = [x0 / CW, 1 - yBot / CH, x1 / CW, 1 - yTop / CH];
    wd.x = x0;
    wd.w = x1 - x0;
    wd.y = yTop;
    wd.h = yBot - yTop;
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return {tex, words, rows};
};

const WORD_VERT = /* glsl */ `
attribute vec4 aRect;
attribute float aFade;
varying vec2 vUv;
varying vec2 vCell;
varying float vFade;
#include <fog_pars_vertex>
void main() {
  vUv = mix(aRect.xy, aRect.zw, uv);
  vCell = uv;
  vFade = aFade;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WORD_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uInk;
uniform vec3 uAsh;
varying vec2 vUv;
varying vec2 vCell;
varying float vFade;
#include <fog_pars_fragment>
float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  float a = texture2D(uMap, vUv).a;
  if (a < 0.03) discard;
  float n = h21(floor(vCell * vec2(14.0, 4.0)));
  if (n < vFade) discard;
  vec3 c = mix(uInk, uAsh, smoothstep(0.0, 0.7, vFade));
  gl_FragColor = vec4(c, a);
  #include <fog_fragment>
}`;

const PLANE = new THREE.PlaneGeometry(1, 1);
let flakeGeo: THREE.BufferGeometry | null = null;
const getFlake = () => {
  if (!flakeGeo) {
    const s = new THREE.Shape();
    s.moveTo(-0.5, -0.3);
    s.lineTo(0.15, -0.5);
    s.lineTo(0.5, 0.05);
    s.lineTo(0.1, 0.5);
    s.lineTo(-0.45, 0.25);
    s.closePath();
    flakeGeo = new THREE.ShapeGeometry(s);
  }
  return flakeGeo;
};

export type SilEReaderProps = GroupProps & {
  progress?: number;
  vent?: V3;
  rise?: number;
  text?: string;
  title?: string;
  pale?: number;
  ink?: string;
  ash?: string;
  ventRed?: number;
  flakes?: number;
  flakeSize?: number;
  seed?: number;
  rim?: RimOpts | null;
  color?: string;
  fog?: boolean;
};

export const SilEReader: React.FC<SilEReaderProps> = ({
  progress = 0, vent, rise = 1.5, text = SILEREADER_TEXT, title = '1984', pale = 0.82, ink = GREYS.g3, ash = GREYS.g7, ventRed = 1.3,
  flakes = 5, flakeSize = 1, seed = 1, rim = null, color = S.void, fog = true, ...group
}) => {
  const ref = useRef<THREE.Group>(null);
  const page = useMemo(() => buildPage(title, text), [title, text]);
  useLayoutEffect(() => () => page.tex.dispose(), [page]);
  const nW = page.words.length;
  const nF = nW * Math.max(0, Math.round(flakes));

  const body = useMemo(() => rbox(W, H, D, 0.006, 3), []);
  const screenGeo = useMemo(() => new THREE.PlaneGeometry(SW, SH), []);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff'}), []);

  const wordsMesh = useMemo(() => {
    const geo = PLANE.clone();
    const rect = new Float32Array(nW * 4), fade = new Float32Array(nW);
    page.words.forEach((w, i) => rect.set(w.rect, i * 4));
    geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(rect, 4));
    geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(fade, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {uMap: {value: null}, uInk: {value: new THREE.Color()},
        uAsh: {value: new THREE.Color()}}]),
      vertexShader: WORD_VERT, fragmentShader: WORD_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    });
    mat.uniforms.uMap.value = page.tex;
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, nW));
    m.frustumCulled = false;
    m.renderOrder = 2;
    return m;
  }, [page, nW]);
  const flakeMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(getFlake(), new THREE.MeshBasicMaterial({color: '#ffffff', side: THREE.DoubleSide}), Math.max(1, nF));
    m.frustumCulled = false;
    for (let i = 0; i < Math.max(1, nF); i++) m.setColorAt(i, new THREE.Color(0, 0, 0));
    return m;
  }, [nF]);
  useLayoutEffect(() => () => {
    wordsMesh.geometry.dispose();
    (wordsMesh.material as THREE.Material).dispose();
    wordsMesh.dispose();
    (flakeMesh.material as THREE.Material).dispose();
    flakeMesh.dispose();
    screenMat.dispose();
    screenGeo.dispose();
  }, [wordsMesh, flakeMesh, screenMat, screenGeo]);

  // per-word schedule
  const sched = useMemo(
    () =>
      page.words.map((w, i) => ({
        d: 0.62 * (0.72 * (w.row / Math.max(1, page.rows - 1)) + 0.28 * hash(i, 1, seed)),
        axis: new THREE.Vector3(hash(i, 2, seed) - 0.5, hash(i, 3, seed) - 0.5, hash(i, 4, seed) - 0.5).normalize(),
        spin: 1.5 + 4 * hash(i, 5, seed),
      })),
    [page, seed],
  );

  useLayoutEffect(() => {
    const grp = ref.current;
    if (!grp) return;
    screenMat.color.set(S.bone).multiplyScalar(pale);
    const wm = wordsMesh.material as THREE.ShaderMaterial;
    wm.uniforms.uInk.value.set(ink);
    wm.uniforms.uAsh.value.set(ash);
    grp.updateWorldMatrix(true, false);
    const Mw = grp.matrixWorld;
    const Minv = Mw.clone().invert();
    const nrm = new THREE.Vector3(0, 0, 1).transformDirection(Mw);
    const pr = Math.max(0, progress);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), L = new THREE.Vector3(), P = new THREE.Vector3();
    const Wp = new THREE.Vector3(), tgt = new THREE.Vector3();
    const fade = wordsMesh.geometry.getAttribute('aFade') as THREE.InstancedBufferAttribute;
    const inkC = new THREE.Color(ink), ashC = new THREE.Color(ash), redC = new THREE.Color(S.authRed).multiplyScalar(ventRed), col = new THREE.Color();
    const sx = SW / CW, sy = SH / CH;
    const wscale = Mw.getMaxScaleOnAxis();
    /** world-space path point for parameter k from world start point s */
    const path = (s: THREE.Vector3, k: number, salt: number, spread: number, out: THREE.Vector3) => {
      if (vent) tgt.set(vent[0], vent[1], vent[2]);
      else tgt.set(s.x, s.y + rise, s.z);
      const lift = 0.03 * smooth01(k / 0.18) * wscale;
      const pull = Math.pow(k, 1.75);
      const sw = Math.sin(Math.PI * k);
      out.copy(s).addScaledVector(nrm, lift).lerp(tgt, pull);
      out.x += (noise1(k * 2.6 + salt * 1.7, seed + 11) * 0.11 + spread * (hash(salt, 7, seed) - 0.5)) * sw;
      out.z += (noise1(k * 2.6 + salt * 1.7, seed + 12) * 0.11 + spread * (hash(salt, 8, seed) - 0.5)) * sw;
      out.y += 0.05 * noise1(k * 3.1 + salt, seed + 13) * sw;
      return out;
    };
    let fi = 0;
    page.words.forEach((w, i) => {
      const sc = sched[i];
      const e = clamp01((pr - sc.d) / FLY);
      L.set((w.x + w.w / 2) * sx - SW / 2, SY + SH / 2 - (w.y + w.h / 2) * sy, D / 2 + 0.0012);
      Sc.set(w.w * sx, w.h * sy, 1);
      let f = 0;
      if (e <= 0) {
        Q.identity();
        P.copy(L);
      } else {
        Wp.copy(L).applyMatrix4(Mw);
        path(Wp, e, i, 0, P).applyMatrix4(Minv);
        Q.setFromAxisAngle(sc.axis, sc.spin * e);
        f = smooth01((e - 0.03) / 0.3);
      }
      M.compose(P, Q, Sc);
      wordsMesh.setMatrixAt(i, M);
      fade.setX(i, f >= 0.999 ? 1.01 : f);
      // flakes
      const nfl = Math.max(0, Math.round(flakes));
      for (let j = 0; j < nfl; j++, fi++) {
        const ej = 0.04 + 0.22 * hash(i * 13 + j, 1, seed);
        const kf = clamp01((e - ej) / (1 - ej));
        if (kf <= 0 || kf >= 1) {
          M.makeScale(0, 0, 0);
          flakeMesh.setMatrixAt(fi, M);
          continue;
        }
        const u = (hash(i * 13 + j, 2, seed) - 0.5) * w.w * sx;
        Wp.set(L.x + u, L.y + (hash(i * 13 + j, 3, seed) - 0.5) * w.h * sy, L.z).applyMatrix4(Mw);
        path(Wp, kf, i * 13 + j + 500, 0.07, P).applyMatrix4(Minv);
        Q.setFromAxisAngle(sc.axis, (3 + 9 * hash(i * 13 + j, 4, seed)) * kf * 3);
        const s = flakeSize * (0.002 + 0.0034 * hash(i * 13 + j, 5, seed)) * (1 - smooth01((kf - 0.82) / 0.18)) * Math.min(1, kf / 0.06);
        Sc.setScalar(s / Math.max(1e-6, wscale));
        M.compose(P, Q, Sc);
        flakeMesh.setMatrixAt(fi, M);
        col.copy(inkC).lerp(ashC, smooth01(kf / 0.25)).multiplyScalar(0.45 + 0.65 * hash(i * 13 + j, 6, seed));
        if (vent && ventRed > 0) col.lerp(redC, smooth01((kf - 0.68) / 0.3));
        flakeMesh.setColorAt(fi, col);
      }
    });
    wordsMesh.instanceMatrix.needsUpdate = true;
    fade.needsUpdate = true;
    flakeMesh.count = fi;
    flakeMesh.instanceMatrix.needsUpdate = true;
    if (flakeMesh.instanceColor) flakeMesh.instanceColor.needsUpdate = true;
  });

  return (
    <group {...group}>
      <group ref={ref}>
        <Silhouette color={color} rim={rim} fog={fog}>
          <mesh geometry={body} />
        </Silhouette>
        <group userData={{silKeep: true}}>
          <mesh geometry={screenGeo} material={screenMat} position={[0, SY, D / 2 + 0.0006]} />
          <primitive object={wordsMesh} />
          <primitive object={flakeMesh} />
        </group>
      </group>
    </group>
  );
};

/** read: screen → grip +Z (up toward his face at guyHoldUp(0)), device top → grip −X (away from him) */
const READ_ROT = basisEuler([0, 1, 0], [-1, 0, 0], [0, 0, 1]);

export type HeldSilEReaderProps = SilEReaderProps & {mode?: 'read' | 'show'};
/** E-reader in <SilGuy rightHand>: 'read' (guyHoldUp(0): screen up toward his face) or 'show' (guyHoldUp(1): toward camera). */
export const HeldSilEReader: React.FC<HeldSilEReaderProps> = ({mode = 'read', ...props}) =>
  mode === 'read' ? (
    <group position={[-0.07, -0.012, 0.012]} rotation={READ_ROT}>
      <SilEReader {...props} />
    </group>
  ) : (
    <group position={[0, -0.046, 0]} rotation={GRIP.book}>
      <SilEReader {...props} />
    </group>
  );

export default SilEReader;
