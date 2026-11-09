// Shared character shading so Guy, Pancake and hero props match: early-2000s cel-shaded look.
// Use toonMat(color) for character surfaces and put drei <Outlines thickness={OUTLINE.thickness} color={OUTLINE.color}/>
// inside meshes that need an ink line (silhouette pieces: head, body, limbs). Materials are cached per colour.
import * as THREE from 'three';

const makeGradient = (steps: number[]) => {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = Math.round(v * 255);
    data[i * 4 + 3] = 255;
  });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
};

/** 3-band toon ramp (shadow / mid / lit). */
export const TOON_GRADIENT = makeGradient([0.38, 0.72, 1.0]);

const cache = new Map<string, THREE.MeshToonMaterial>();
/** Cached cel-shaded material. `emissive` adds a soft self-glow (e.g. eyes highlights, screens). */
export const toonMat = (color: string, opts: {emissive?: string; emissiveIntensity?: number; transparent?: boolean; opacity?: number} = {}) => {
  const key = `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 0}|${opts.opacity ?? 1}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({color, gradientMap: TOON_GRADIENT});
    if (opts.emissive) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    if (opts.transparent || (opts.opacity ?? 1) < 1) {
      m.transparent = true;
      m.opacity = opts.opacity ?? 1;
    }
    cache.set(key, m);
  }
  return m;
};

/** Ink outline settings for drei <Outlines/>. Thickness is in world units (scaled meshes need adjusting). */
export const OUTLINE = {color: '#1b1030', thickness: 0.02};

// ---- Ink outlines (inverted hull). drei <Outlines/> does NOT render under Remotion's manual loop — use these instead.
const outlineCache = new Map<string, THREE.ShaderMaterial>();
/** Back-face material that pushes vertices out along normals by `thickness` (object-space metres). */
export const outlineMat = (thickness = OUTLINE.thickness, color = OUTLINE.color) => {
  const key = `${thickness}|${color}`;
  let m = outlineCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {uT: {value: thickness}, uC: {value: new THREE.Color(color)}},
      vertexShader: `uniform float uT; void main(){ vec3 p = position + normalize(normal) * uT; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }`,
    });
    outlineCache.set(key, m);
  }
  return m;
};
