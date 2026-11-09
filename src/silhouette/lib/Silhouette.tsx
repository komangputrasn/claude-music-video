/**
 * <Silhouette> — renders everything inside it as a pure flat silhouette (DESIGN-silhouette §2.1).
 *
 *   <Silhouette color?={S.void} rim?={{color, strength?, power?, dir?, dirMix?}} fog?={true} opacity?={1}>
 *     <Guy pose={…}/>            // any three.js subtree: rigs, props, lib meshes
 *   </Silhouette>
 *
 * - After every render (useLayoutEffect, no deps) it walks its subtree and swaps EVERY mesh material for one shared
 *   unlit silhouette material, and hides inverted-hull ink outlines (any mesh whose material is BackSide).
 *   Children may re-assign materials each frame (R3F props); the swap runs after them because a parent's layout
 *   effect runs after its children's.
 * - `rim`: optional thin edge light (fresnel) in the scene's light colour. Keep it THIN: power 4–7, strength 0.6–1.5.
 *   ALWAYS give `dir` (screen-space vector pointing TOWARD the backlight, e.g. [0, 1] = light above/behind, [1, 0] = from
 *   screen-right): with it the rim only lights the edges facing the light (dirMix 1). Without `dir` it outlines every
 *   edge, which reads as a cartoon outline — avoid.
 * - Opt-outs: any object with `userData.silKeep = true` keeps its own material (and its whole subtree), e.g. the
 *   hammer's dawnGold handle edge or a red iris on a device. `userData.silHide = true` hides an object.
 * - `fog` (default true): distant silhouettes fade into the Stage fog colour, which gives crowds/architecture depth.
 *   Hero characters near camera stay pure black.
 * - Works for Mesh, InstancedMesh and SkinnedMesh-free rigs (Guy/Pancake are rigid hierarchies).
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {S} from './palette';

export type RimOpts = {
  color: string;
  /** HDR multiplier of the rim colour (default 1.0). > ~1 blooms slightly. */
  strength?: number;
  /** fresnel exponent: higher = thinner (default 5) */
  power?: number;
  /** screen-space direction TOWARD the light, e.g. [0,1] top, [-1,0] left */
  dir?: [number, number];
  /** 0..1 how strictly the rim is limited to edges facing `dir` (default 1 if dir given, else 0 = all edges) */
  dirMix?: number;
};

export type SilhouetteProps = {
  children?: React.ReactNode;
  color?: string;
  rim?: RimOpts | false | null;
  fog?: boolean;
  opacity?: number;
  /** return true to hide a mesh (e.g. hair under a hood). Called for every mesh each render. */
  hide?: (m: THREE.Mesh) => boolean;
  /** render order for all silhouette meshes (rarely needed) */
  renderOrder?: number;
} & Omit<React.ComponentProps<'group'>, 'children'>;

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vN;
varying vec3 vV;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vV = -mvPosition.xyz;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRim;
uniform float uRimPower;
uniform vec2 uRimDir;
uniform float uDirMix;
uniform float uOpacity;
#include <common>
#include <fog_pars_fragment>
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float f = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), uRimPower);
  vec2 nd = n.xy;
  float l = length(nd);
  nd = l > 1e-4 ? nd / l : vec2(0.0);
  float d = mix(1.0, smoothstep(0.25, 0.85, dot(nd, uRimDir)), uDirMix);
  vec3 col = uColor + uRim * (f * d);
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Create a silhouette material (not cached; one per <Silhouette> instance). Exported for custom meshes/instancing. */
export const makeSilhouetteMaterial = (color: string = S.void, rim?: RimOpts | false | null, fog = true, opacity = 1) => {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: {value: new THREE.Color(color)},
        uRim: {value: new THREE.Color(0, 0, 0)},
        uRimPower: {value: 4.5},
        uRimDir: {value: new THREE.Vector2(0, 1)},
        uDirMix: {value: 0},
        uOpacity: {value: opacity},
      },
    ]),
    vertexShader: VERT,
    fragmentShader: FRAG,
    fog,
    transparent: opacity < 1,
    side: THREE.FrontSide,
  });
  setSilhouetteUniforms(m, {color, rim, opacity});
  return m;
};

/** Update a silhouette material's uniforms (call in useLayoutEffect). */
export const setSilhouetteUniforms = (m: THREE.ShaderMaterial, o: {color?: string; rim?: RimOpts | false | null; opacity?: number}) => {
  const u = m.uniforms;
  if (o.color) u.uColor.value.set(o.color);
  if (o.rim) {
    u.uRim.value.set(o.rim.color).multiplyScalar(o.rim.strength ?? 1.0);
    u.uRimPower.value = o.rim.power ?? 5;
    const d = o.rim.dir ?? [0, 1];
    const len = Math.hypot(d[0], d[1]) || 1;
    u.uRimDir.value.set(d[0] / len, d[1] / len);
    u.uDirMix.value = o.rim.dirMix ?? (o.rim.dir ? 1 : 0);
  } else if (o.rim !== undefined) {
    u.uRim.value.setRGB(0, 0, 0);
  }
  if (o.opacity !== undefined) {
    u.uOpacity.value = o.opacity;
    m.transparent = o.opacity < 1;
    m.depthWrite = o.opacity >= 0.999;
  }
};

const isOutline = (mat: THREE.Material | THREE.Material[]) => {
  const m = Array.isArray(mat) ? mat[0] : mat;
  return !!m && m.side === THREE.BackSide;
};

/** Walk a subtree and apply the silhouette material. Stops at `userData.silKeep`. */
export const applySilhouette = (
  root: THREE.Object3D,
  mat: THREE.Material,
  hide?: (m: THREE.Mesh) => boolean,
  renderOrder?: number,
) => {
  const visit = (o: THREE.Object3D) => {
    if (o !== root && o.userData?.silKeep) return;
    if (o.userData?.silHide) {
      o.visible = false;
      return;
    }
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const orig = (mesh.userData.silOrigMat ?? mesh.material) as THREE.Material;
      // R3F may have re-assigned the original material this render: remember the latest non-silhouette one.
      if (mesh.material !== mat) mesh.userData.silOrigMat = mesh.material;
      if (isOutline(mesh.userData.silOrigMat ?? orig)) {
        mesh.visible = false;
      } else {
        mesh.visible = hide ? !hide(mesh) : mesh.visible;
        mesh.material = mat;
        if (renderOrder !== undefined) mesh.renderOrder = renderOrder;
      }
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
};

export const Silhouette: React.FC<SilhouetteProps> = ({children, color = S.void, rim = null, fog = true, opacity = 1, hide, renderOrder, ...group}) => {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => makeSilhouetteMaterial(color, rim, fog, opacity), [fog]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  // every render: children may have re-assigned materials / mounted new meshes
  useLayoutEffect(() => {
    setSilhouetteUniforms(mat, {color, rim: rim || null, opacity});
    if (ref.current) applySilhouette(ref.current, mat, hide, renderOrder);
  });
  return (
    <group ref={ref} {...group}>
      {children}
    </group>
  );
};

/** Marks a subtree to keep its own materials inside a <Silhouette> (e.g. a glowing iris on a device). */
export const SilKeep: React.FC<{children?: React.ReactNode} & Omit<React.ComponentProps<'group'>, 'children'>> = ({children, ...group}) => (
  <group userData={{silKeep: true}} {...group}>
    {children}
  </group>
);
