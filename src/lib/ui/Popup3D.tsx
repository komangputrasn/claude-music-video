/**
 * Y2K UI kit — 3D pop-ups: glossy bevelled panels showing the same dialogs/banners/stamps as the 2D kit.
 * All components are pure (props-driven), centred on their local origin, facing +Z, metres. Put them inside <Stage>.
 *
 * API
 *   <Popup3D spec={DialogSpec} width={1.6} thickness? gloss={0.2} sheen?={-0.2..1.2} opacity={1} brightness={1} saturation={1.25} edgeColor? pr={2}
 *            {...groupProps}>children</Popup3D>
 *       panel is centred at the origin; front face at z = thickness/2. Children live in the panel's local space.
 *   popupSize(spec, width=1.6, thickness?) -> {w, h, thickness, frontZ}
 *   popupPoint(spec, px, py, width=1.6) -> [x, y, z]       dialog pixel coords -> local 3D point on the front face
 *   popupButton3D(spec, index, width=1.6) -> [x, y, z]    centre of a button on the front face (aim <Cursor3D> here!)
 *   <Window3D spec={WindowSpec} width={1.6} ...same panel props/>   custom window: spec.body = display-list prims in body coords
 *   <Banner3D variant label? sub? frame width={2.4} pxW={468} pxH={60} thickness={0.03} gloss? opacity? {...groupProps}/>
 *   <Stamp3D text='CANCELLED' progress={0..1} rotation={-14 deg} width={1} color? seed? {...groupProps}/>
 *       flat inked plane that slams down onto whatever is behind it (place it just in front of a Popup3D's frontZ).
 *   <PopupTunnel3D frame seed? count={24} length={40} radius={3} speed={0.25 m/frame} specs? width={1.6} spin? wobble? pulse? near={0}/>
 *       pop-ups stream along -Z toward +Z (camera on the axis at z > near looking down -Z). Deterministic per frame.
 *   <UIPanel3D texture width height? radii? thickness? edgeColor? gloss? sheen? opacity? brightness? saturation?/>   generic panel for any CanvasTexture
 *   <UIPlane3D texture width={1} opacity? brightness? onTop?/>   flat transparent plane for any UI texture (starbursts, icons, sparkles)
 *   UI_DECAL_DEFAULTS  default gloss / saturation (pre-grade against the Stage's ACES tone mapping) / brightness / sheenStrength
 *
 * Usage
 *   <Stage background="#1E5BFF"><CameraRig position={[0, 0, 4]}/>
 *     <Popup3D spec={{kind: 'error', title: 'OmniStore', heading: 'Error 402', message: 'Payment Required.', buttons: ['OK']}} rotation={[0, 0.3, 0]}>
 *       <Stamp3D progress={p} position={[0, 0, 0.05]} width={1}/>
 *     </Popup3D>
 *     <PopupTunnel3D frame={frame} position={[0, 0, -2]}/>
 *   </Stage>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {rand} from '../time';
import {BannerVariant} from './ads';
import {makeBannerTexture, makeStampTexture, makeWindowTexture, texSize, useDialogTexture} from './textures';
import {DialogSpec, layoutDialog, WindowSpec} from './widgets';
import {POPUP_MESSAGES} from './messages';
import {stampSlam} from './stampArt';
import {WIN} from './theme';

type GroupProps = Omit<ThreeElements['group'], 'children'>;

// ---------------------------------------------------------------- geometry helpers
const roundedShape = (w: number, h: number, r: [number, number, number, number]) => {
  const [tl, tr, br, bl] = r.map((v) => Math.max(0, Math.min(v, w / 2 - 1e-4, h / 2 - 1e-4)));
  const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + bl, y0);
  s.lineTo(x1 - br, y0);
  if (br) s.absarc(x1 - br, y0 + br, br, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - tr);
  if (tr) s.absarc(x1 - tr, y1 - tr, tr, 0, Math.PI / 2, false);
  s.lineTo(x0 + tl, y1);
  if (tl) s.absarc(x0 + tl, y1 - tl, tl, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + bl);
  if (bl) s.absarc(x0 + bl, y0 + bl, bl, Math.PI, Math.PI * 1.5, false);
  return s;
};

const decalGeometry = (w: number, h: number, r: [number, number, number, number]) => {
  const geo = new THREE.ShapeGeometry(roundedShape(w, h, r), 8);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return geo;
};

const slabGeometry = (w: number, h: number, r: [number, number, number, number], t: number) => {
  const bs = Math.min(t * 0.45, w * 0.02);
  const bt = t * 0.3;
  const depth = Math.max(1e-4, t - 2 * bt);
  const geo = new THREE.ExtrudeGeometry(roundedShape(w - 2 * bs, h - 2 * bs, r.map((v) => Math.max(0, v - bs)) as [number, number, number, number]), {
    depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 3, curveSegments: 8,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
};

// ---------------------------------------------------------------- generic panel
export type UIPanel3DProps = GroupProps & {
  texture: THREE.Texture;
  width?: number;
  height?: number;
  /** corner radii in metres [tl, tr, br, bl] */
  radii?: [number, number, number, number];
  thickness?: number;
  edgeColor?: string;
  /** 0..1 glossy clear-coat reflections over the UI */
  gloss?: number;
  opacity?: number;
  /** multiplies the UI colours (>1 = glowing / blooming) */
  brightness?: number;
  /** colour saturation pre-grade (compensates the Stage's ACES tone mapping); 1 = untouched */
  saturation?: number;
  /** stylised diagonal glint sweeping across the face: position -0.2..1.2 (undefined = none). Animate it on beats! */
  sheen?: number;
  sheenStrength?: number;
  children?: React.ReactNode;
};

const SHEEN_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SHEEN_FS = `uniform float uPos, uStrength, uOpacity; varying vec2 vUv;
void main(){
  float d = (vUv.x * 0.8 + (1.0 - vUv.y) * 0.45) - uPos * 1.25;
  float band = smoothstep(0.075, 0.0, abs(d));
  float thin = smoothstep(0.016, 0.0, abs(d - 0.12)) * 0.75;
  gl_FragColor = vec4(vec3(1.0), (band * 0.8 + thin) * uStrength * uOpacity);
}`;

const Sheen: React.FC<{geometry: THREE.BufferGeometry; z: number; pos: number; strength: number; opacity: number}> = ({geometry, z, pos, strength, opacity}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SHEEN_VS, fragmentShader: SHEEN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        uniforms: {uPos: {value: 0}, uStrength: {value: 0}, uOpacity: {value: 1}},
      }),
    [],
  );
  useLayoutEffect(() => {
    mat.uniforms.uPos.value = pos;
    mat.uniforms.uStrength.value = strength;
    mat.uniforms.uOpacity.value = opacity;
  });
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return <mesh geometry={geometry} material={mat} position={[0, 0, z]} />;
};

/** Shared decal shader patch: saturation boost after the map lookup (uniform object per panel). */
const useSatPatch = (saturation: number) => {
  const u = useMemo(() => ({value: saturation}), []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    u.value = saturation;
  });
  return useMemo(
    () => ({
      onBeforeCompile: (sh: THREE.WebGLProgramParametersWithUniforms) => {
        sh.uniforms.uSat = u;
        sh.fragmentShader = sh.fragmentShader
          .replace('void main() {', 'uniform float uSat;\nvoid main() {')
          .replace(
            '#include <map_fragment>',
            '#include <map_fragment>\n\tdiffuseColor.rgb = max(vec3(0.0), mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, uSat));',
          );
      },
      customProgramCacheKey: () => 'y2k-ui-decal-sat',
    }),
    [u],
  );
};

export const UI_DECAL_DEFAULTS = {gloss: 0.12, saturation: 1.25, brightness: 1, sheenStrength: 0.45} as const;

export const UIPanel3D: React.FC<UIPanel3DProps> = ({
  texture, width = 1.6, height, radii = [0.03, 0.03, 0.015, 0.015], thickness = 0.05, edgeColor = '#1544D6', gloss = UI_DECAL_DEFAULTS.gloss, opacity = 1,
  brightness = UI_DECAL_DEFAULTS.brightness, saturation = UI_DECAL_DEFAULTS.saturation, sheen, sheenStrength = UI_DECAL_DEFAULTS.sheenStrength, children,
  ...group
}) => {
  const sat = useSatPatch(saturation);
  const h = height ?? width / texSize(texture).aspect;
  const [r0, r1, r2, r3] = radii;
  const geos = useMemo(
    () => ({slab: thickness > 0 ? slabGeometry(width, h, [r0, r1, r2, r3], thickness) : null, decal: decalGeometry(width, h, [r0, r1, r2, r3])}),
    [width, h, r0, r1, r2, r3, thickness],
  );
  useLayoutEffect(
    () => () => {
      geos.slab?.dispose();
      geos.decal.dispose();
    },
    [geos],
  );
  const fade = opacity < 1;
  const dz = Math.max(0.002, width * 0.0012);
  const z = thickness / 2 + dz;
  return (
    <group {...group}>
      {geos.slab ? (
        <mesh geometry={geos.slab}>
          <meshPhysicalMaterial color={edgeColor} roughness={0.28} metalness={0.15} clearcoat={1} clearcoatRoughness={0.12} transparent={fade} opacity={opacity}
            depthWrite={!fade} />
        </mesh>
      ) : null}
      <mesh geometry={geos.decal} position={[0, 0, z]}>
        <meshBasicMaterial map={texture} transparent opacity={opacity} color={[brightness, brightness, brightness]} toneMapped={false} polygonOffset
          polygonOffsetFactor={-1} polygonOffsetUnits={-2} depthWrite={!fade} onBeforeCompile={sat.onBeforeCompile}
          customProgramCacheKey={sat.customProgramCacheKey} />
      </mesh>
      {gloss > 0 ? (
        <mesh geometry={geos.decal} position={[0, 0, z + dz]}>
          <meshStandardMaterial color="#000000" roughness={0.1} metalness={0} envMapIntensity={gloss} transparent opacity={opacity}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ) : null}
      {sheen !== undefined && sheen > -0.3 && sheen < 1.3 ? <Sheen geometry={geos.decal} z={z + dz * 2} pos={sheen} strength={sheenStrength} opacity={opacity} /> : null}
      {children}
    </group>
  );
};

// ---------------------------------------------------------------- Popup3D
const pxRadii = (pxW: number, w: number): [number, number, number, number] => {
  const k = w / pxW;
  return [WIN.rTop * k, WIN.rTop * k, WIN.rBottom * k, WIN.rBottom * k];
};

export const popupSize = (spec: DialogSpec, width = 1.6, thickness?: number) => {
  const L = layoutDialog(spec);
  const t = thickness ?? width * 0.035;
  return {w: width, h: (width * L.h) / L.w, thickness: t, frontZ: t / 2};
};

export const popupPoint = (spec: DialogSpec, px: number, py: number, width = 1.6): [number, number, number] => {
  const L = layoutDialog(spec);
  const s = popupSize(spec, width);
  return [(px / L.w - 0.5) * s.w, (0.5 - py / L.h) * s.h, s.frontZ];
};

export const popupButton3D = (spec: DialogSpec, index: number, width = 1.6): [number, number, number] => {
  const L = layoutDialog(spec);
  const b = L.buttons.find((x) => x.index === index) ?? L.buttons[0];
  return b ? popupPoint(spec, b.x + b.w / 2, b.y + b.h / 2, width) : popupPoint(spec, L.w / 2, L.h - 30, width);
};

export type Popup3DProps = GroupProps & {
  spec: DialogSpec;
  width?: number;
  thickness?: number;
  gloss?: number;
  opacity?: number;
  brightness?: number;
  saturation?: number;
  sheen?: number;
  edgeColor?: string;
  /** canvas pixel ratio (2 default; 3-4 for full-screen close-ups) */
  pr?: number;
  children?: React.ReactNode;
};

export const Popup3D: React.FC<Popup3DProps> = ({spec, width = 1.6, thickness, gloss, opacity = 1, brightness, saturation, sheen, edgeColor, pr, children,
  ...group}) => {
  const tex = useDialogTexture(spec, {pr});
  const {w: pxW} = texSize(tex);
  return (
    <UIPanel3D texture={tex} width={width} radii={pxRadii(pxW, width)} thickness={thickness ?? width * 0.035} gloss={gloss} opacity={opacity}
      brightness={brightness} saturation={saturation} sheen={sheen} edgeColor={edgeColor ?? (spec.active === false ? '#6F8BD6' : '#1240CC')} {...group}>
      {children}
    </UIPanel3D>
  );
};

// ---------------------------------------------------------------- Window3D
export type Window3DProps = Omit<Popup3DProps, 'spec'> & {spec: WindowSpec};
/** Generic custom-content window in 3D (body drawn from display-list prims, see WindowSpec). */
export const Window3D: React.FC<Window3DProps> = ({spec, width = 1.6, thickness, gloss, opacity = 1, brightness, saturation, sheen, edgeColor, pr, children,
  ...group}) => {
  const tex = useMemo(() => makeWindowTexture(spec, {pr}), [JSON.stringify(spec), pr]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <UIPanel3D texture={tex} width={width} radii={pxRadii(spec.width, width)} thickness={thickness ?? width * 0.035} gloss={gloss} opacity={opacity}
      brightness={brightness} saturation={saturation} sheen={sheen} edgeColor={edgeColor ?? (spec.active === false ? '#6F8BD6' : '#1240CC')} {...group}>
      {children}
    </UIPanel3D>
  );
};

// ---------------------------------------------------------------- Banner3D
export type Banner3DProps = GroupProps & {
  variant: BannerVariant;
  label?: string;
  sub?: string;
  frame: number;
  width?: number;
  pxW?: number;
  pxH?: number;
  thickness?: number;
  gloss?: number;
  opacity?: number;
  brightness?: number;
  saturation?: number;
  sheen?: number;
  edgeColor?: string;
  pr?: number;
};

export const Banner3D: React.FC<Banner3DProps> = ({variant, label, sub, frame, width = 2.4, pxW = 468, pxH = 60, thickness = 0.03, gloss, opacity = 1,
  brightness, saturation, sheen, edgeColor = '#0B0B1A', pr = 3, ...group}) => {
  const tex = makeBannerTexture(variant, {label, sub, frame, w: pxW, h: pxH}, {pr});
  const r = width * 0.004;
  return <UIPanel3D texture={tex} width={width} radii={[r, r, r, r]} thickness={thickness} gloss={gloss} opacity={opacity} brightness={brightness}
    saturation={saturation} sheen={sheen} edgeColor={edgeColor} {...group} />;
};

// ---------------------------------------------------------------- UIPlane3D
export type UIPlane3DProps = GroupProps & {
  texture: THREE.Texture;
  width?: number;
  opacity?: number;
  brightness?: number;
  saturation?: number;
  /** render on top of everything (HUD-like) */
  onTop?: boolean;
};
/**
 * Flat transparent plane for any UI texture (starbursts, icons, sparkles, cursors...).
 * e.g. <UIPlane3D texture={makeDrawingTexture('burst-new', () => starburstDL({text: 'NEW!'}))} width={1}/>
 */
export const UIPlane3D: React.FC<UIPlane3DProps> = ({texture, width = 1, opacity = 1, brightness = 1, saturation = UI_DECAL_DEFAULTS.saturation, onTop = false,
  ...group}) => {
  const sat = useSatPatch(saturation);
  const {aspect} = texSize(texture);
  return (
    <group {...group}>
      <mesh renderOrder={onTop ? 999 : 0}>
        <planeGeometry args={[width, width / aspect]} />
        <meshBasicMaterial map={texture} transparent opacity={opacity} color={[brightness, brightness, brightness]} toneMapped={false} depthWrite={false}
          depthTest={!onTop} side={THREE.DoubleSide} onBeforeCompile={sat.onBeforeCompile} customProgramCacheKey={sat.customProgramCacheKey} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- Stamp3D
export type Stamp3DProps = GroupProps & {
  text?: string;
  progress?: number;
  /** degrees around Z */
  rotation?: number;
  width?: number;
  color?: string;
  seed?: number;
  /** px font size of the texture design (affects border proportions only) */
  size?: number;
  opacity?: number;
};

export const Stamp3D: React.FC<Stamp3DProps> = ({text = 'CANCELLED', progress = 1, rotation = -14, width = 1, color, seed, size = 44, opacity = 1, ...group}) => {
  const tex = makeStampTexture({text, color, seed, size});
  const {aspect} = texSize(tex);
  const s = stampSlam(progress);
  if (s.alpha <= 0) return null;
  return (
    <group {...group}>
      <group position={[0, 0, s.lift * width * 1.4]} rotation={[0, 0, (rotation * Math.PI) / 180]} scale={s.scale}>
        <mesh>
          <planeGeometry args={[width, width / aspect]} />
          <meshBasicMaterial map={tex} transparent opacity={s.alpha * opacity} toneMapped={false} depthWrite={false} polygonOffset polygonOffsetFactor={-4}
            polygonOffsetUnits={-8} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- PopupTunnel3D
export type PopupTunnel3DProps = GroupProps & {
  frame: number;
  seed?: string;
  count?: number;
  length?: number;
  radius?: number;
  /** metres per frame toward +Z */
  speed?: number;
  specs?: DialogSpec[];
  width?: number;
  /** tunnel twist, radians per frame */
  spin?: number;
  wobble?: number;
  /** 0..1 extra scale kick (feed a beat pulse) */
  pulse?: number;
  /** z where pop-ups leave (put the camera a bit beyond, e.g. near + 1.5) */
  near?: number;
  /** fraction of the length used to fade in at the far end */
  fadeFar?: number;
  gloss?: number;
  /** keep the centre clear: minimum radius as a fraction of radius */
  inner?: number;
};

export const PopupTunnel3D: React.FC<PopupTunnel3DProps> = ({
  frame, seed = 'tunnel', count = 24, length = 40, radius = 3, speed = 0.25, specs, width = 1.6, spin = 0.004, wobble = 1, pulse = 0, near = 0, fadeFar = 0.3,
  gloss, inner = 0.55, ...group
}) => {
  const list = specs?.length ? specs : POPUP_MESSAGES;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => rand(`${seed}-${i}-${k}`);
    // stratified along the tunnel so it never bunches up
    const travel = ((i + 0.15 + r('u') * 0.7) / count) * length + frame * speed;
    const loop = Math.floor(travel / length);
    const s = travel - loop * length;
    const z = near - length + s;
    const a = i * 2.39996 + (r('a') - 0.5) * 0.6 + frame * spin + loop * 1.3; // golden-angle ring coverage
    const rr = radius * (inner + (1 - inner) * rand(`${seed}-${i}-r-${loop}`));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    const fade = Math.min(1, s / (length * fadeFar));
    const spec = list[(Math.floor(r('m') * list.length) + loop * 5) % list.length];
    const roll = (r('roll') - 0.5) * 0.5 + Math.sin(frame * 0.05 + i) * 0.08 * wobble;
    items.push(
      <Popup3D
        key={i}
        spec={spec}
        width={width * (0.85 + 0.3 * r('w'))}
        position={[x, y, z]}
        rotation={[(y / radius) * 0.35 + Math.sin(frame * 0.04 + i * 1.7) * 0.1 * wobble, (-x / radius) * 0.35 + Math.cos(frame * 0.035 + i) * 0.1 * wobble, roll]}
        scale={1 + pulse * 0.1}
        opacity={fade}
        gloss={gloss}
      />,
    );
  }
  return <group {...group}>{items}</group>;
};
