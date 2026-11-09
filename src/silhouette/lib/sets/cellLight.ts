/**
 * cellLight — the CellRoom's window key light as a projective "cookie" computed per pixel (no shadow maps needed).
 *
 * The city glow outside travels along `dir` (into the room, d.z < 0) and passes through the window opening and the
 * vertical blind slats; every room surface (walls, floor, ceiling, bed, printer, door…) gets the slatted pattern that
 * a real projector would throw, including an optional red scan band sliding through the slats (red REPLACES white,
 * never mixes into pink). Implemented by injecting into MeshStandardMaterial (so ordinary three.js lights the scene
 * adds still work on the same surfaces).
 *
 *   const U = makeCellUniforms();                      // one per CellRoom
 *   const m = cellMaterial({color, map, …}, U, 'room'|'slat'|'outside');
 *   setCellUniforms(U, {...});                         // in useLayoutEffect, every render
 *
 * Modes: 'room' = cookie (inside the room only); 'slat' = the blinds' outward faces lit by the city; 'outside' =
 * facade/deck front-lit by the city glow (uOutside). Coordinates are CellRoom-local (uCellInv = inverse world matrix).
 * Not occluded by objects (no shadows): characters stay pure silhouettes anyway.
 */
import * as THREE from 'three';

export type CellMode = 'room' | 'slat' | 'outside';

export type CellUniforms = {
  uCellInv: {value: THREE.Matrix4};
  uWinDir: {value: THREE.Vector3};
  uWinCol: {value: THREE.Color};
  uScanCol: {value: THREE.Color};
  uWinRect: {value: THREE.Vector4};
  uSlat: {value: THREE.Vector4};
  uWinMisc: {value: THREE.Vector4};
  uScanW: {value: number};
  uOutside: {value: THREE.Color};
};

export const makeCellUniforms = (): CellUniforms => ({
  uCellInv: {value: new THREE.Matrix4()},
  uWinDir: {value: new THREE.Vector3(0, -0.12, -1).normalize()},
  uWinCol: {value: new THREE.Color(1, 1, 1)},
  uScanCol: {value: new THREE.Color(1, 0, 0)},
  uWinRect: {value: new THREE.Vector4(-0.85, 0.85, 1, 2.45)},
  uSlat: {value: new THREE.Vector4(0.09, 0.03, 19, 0)},
  uWinMisc: {value: new THREE.Vector4(2.25, 2.19, 0.006, -99)},
  uScanW: {value: 0},
  uOutside: {value: new THREE.Color(0, 0, 0)},
});

const PARS_V = /* glsl */ `
uniform mat4 uCellInv;
varying vec3 vCellPos;
`;

const PARS_F = /* glsl */ `
uniform mat4 uCellInv;
uniform vec3 uWinDir;
uniform vec3 uWinCol;
uniform vec3 uScanCol;
uniform vec4 uWinRect;
uniform vec4 uSlat;
uniform vec4 uWinMisc;
uniform float uScanW;
uniform vec3 uOutside;
varying vec3 vCellPos;
float cellSlatOpacity(float x, float blur) {
  float x0 = uWinRect.x, x1 = uWinRect.y;
  float n = uSlat.z;
  float halfN = floor(n * 0.5);
  float p2 = uSlat.x * (1.0 - 0.86 * uSlat.w);
  float iL = clamp(floor((x - x0) / p2), 0.0, halfN - 1.0);
  float cL = x0 + p2 * (iL + 0.5);
  float iR = clamp(floor((x1 - x) / p2), 0.0, n - halfN - 1.0);
  float cR = x1 - p2 * (iR + 0.5);
  float d = min(abs(x - cL), abs(x - cR)) - uSlat.y;
  return 1.0 - smoothstep(-blur, blur, d);
}
vec3 cellCookie(vec3 P) {
  vec3 d = uWinDir;
  if (P.z > uWinMisc.x - 0.004 || d.z > -0.01) return vec3(0.0);
  float tS = (uWinMisc.y - P.z) / -d.z;
  vec3 Qs = P - d * tS;
  float tW = (uWinMisc.x - P.z) / -d.z;
  vec3 Qw = P - d * tW;
  float blur = 0.003 + uWinMisc.z * tS;
  float rx = smoothstep(uWinRect.x - blur, uWinRect.x + blur, Qw.x) * (1.0 - smoothstep(uWinRect.y - blur, uWinRect.y + blur, Qw.x));
  float ry = smoothstep(uWinRect.z - blur, uWinRect.z + blur, Qw.y) * (1.0 - smoothstep(uWinRect.w - blur, uWinRect.w + blur, Qw.y));
  float open = 1.0 - cellSlatOpacity(Qs.x, blur);
  float sc = 0.0;
  if (uScanW > 0.0) sc = 1.0 - smoothstep(uScanW * 0.5 - blur, uScanW * 0.5 + blur, abs(Qs.x - uWinMisc.w));
  return mix(uWinCol, uScanCol, sc) * rx * ry * open;
}
`;

const MAIN_V = /* glsl */ `
#include <project_vertex>
{
  vec4 cellW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    cellW = instanceMatrix * cellW;
  #endif
  vCellPos = (uCellInv * (modelMatrix * cellW)).xyz;
}
`;

const MAIN_F: Record<CellMode, string> = {
  room: /* glsl */ `
#include <lights_fragment_end>
{
  vec3 cwn = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  vec3 cln = normalize(mat3(uCellInv) * cwn);
  float cndl = max(dot(cln, -uWinDir), 0.0);
  reflectedLight.directDiffuse += BRDF_Lambert(material.diffuseColor) * cellCookie(vCellPos) * cndl;
}
`,
  slat: /* glsl */ `
#include <lights_fragment_end>
{
  vec3 cwn = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  vec3 cln = normalize(mat3(uCellInv) * cwn);
  reflectedLight.directDiffuse += BRDF_Lambert(material.diffuseColor) * uOutside * max(cln.z, 0.0);
}
`,
  outside: /* glsl */ `
#include <lights_fragment_end>
{
  vec3 cwn = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  vec3 cln = normalize(mat3(uCellInv) * cwn);
  float cndl = max(dot(cln, normalize(vec3(0.0, 0.35, 1.0))), 0.0);
  reflectedLight.directDiffuse += BRDF_Lambert(material.diffuseColor) * uOutside * cndl;
}
`,
};

/** A MeshStandardMaterial lit by the cell's window cookie (mode 'room'), the city front light ('outside'/'slat'). */
export const cellMaterial = (params: THREE.MeshStandardMaterialParameters, U: CellUniforms, mode: CellMode = 'room') => {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PARS_V}`)
      .replace('#include <project_vertex>', MAIN_V);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PARS_F}`)
      .replace('#include <lights_fragment_end>', MAIN_F[mode]);
  };
  m.customProgramCacheKey = () => `terms-cell-${mode}`;
  return m;
};

export type CellLightState = {
  matrixWorld: THREE.Matrix4;
  dir: [number, number, number];
  color: string;
  intensity: number;
  scan: number | null;
  scanColor: string;
  scanIntensity: number;
  scanWidth: number;
  rect: [number, number, number, number];
  slatPitch: number;
  slatHalfProjected: number;
  slats: number;
  traverse: number;
  winZ: number;
  slatZ: number;
  softness: number;
  outside: number;
  outsideColor: string;
};

const _c = new THREE.Color();
export const setCellUniforms = (U: CellUniforms, s: CellLightState) => {
  U.uCellInv.value.copy(s.matrixWorld).invert();
  U.uWinDir.value.set(s.dir[0], s.dir[1], s.dir[2]).normalize();
  U.uWinCol.value.set(s.color).multiplyScalar(s.intensity);
  U.uScanCol.value.set(s.scanColor).multiplyScalar(s.scanIntensity * (s.intensity > 0 ? 1 : 0));
  U.uWinRect.value.set(...s.rect);
  U.uSlat.value.set(s.slatPitch, s.slatHalfProjected, s.slats, s.traverse);
  const x0 = s.rect[0], x1 = s.rect[1];
  U.uWinMisc.value.set(s.winZ, s.slatZ, s.softness, s.scan == null ? -99 : x0 + (x1 - x0) * s.scan);
  U.uScanW.value = s.scan == null ? 0 : s.scanWidth;
  U.uOutside.value.copy(_c.set(s.outsideColor)).multiplyScalar(s.outside);
};
