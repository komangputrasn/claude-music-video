/**
 * <FisheyeView> — a doorbell-camera lens inside <Stage>. Renders the scene from its own wide perspective camera into a
 * low-res render target, then shows it full-screen through a barrel-distortion (equidistant fisheye) + security-cam
 * grade shader. The Stage's default camera is switched to layer 1 so it only sees the full-screen quad; the Stage's
 * bloom + lens chain still runs on top (so grain/aberration are kept).
 *
 * Deterministic: all values are props; the off-screen render runs in the Stage's render loop (priority 0.5, i.e.
 * right before the Stage composer at priority 1), which is driven by Remotion one call per frame.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useFrame, useThree} from '@react-three/fiber';

type V3 = [number, number, number];

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform float uTheta;     // half horizontal angle of view of the OUTPUT (rad)
uniform float uTanSrc;    // tan(half horizontal fov of the source render)
uniform float uAspect;    // width / height
uniform float uSat;
uniform vec3 uTint;
uniform float uNoise;
uniform float uSeed;
uniform float uFlash;
uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32 + uSeed); return fract(p.x * p.y); }
void main() {
  vec2 c = (vUv - 0.5) * vec2(2.0, 2.0 / uAspect);   // x in -1..1, y in -1/aspect..1/aspect
  float r = length(c);
  float th = r * uTheta;                              // equidistant: angle grows linearly with radius
  float rs = tan(min(th, 1.45)) / uTanSrc;            // radius in the rectilinear source (x half-width = 1)
  vec2 s = r > 1e-5 ? c / r * rs : vec2(0.0);
  vec2 uv = vec2(s.x * 0.5 + 0.5, s.y * uAspect * 0.5 + 0.5);
  // mild chroma split toward the rim (cheap plastic lens)
  vec2 dir = s * 0.004 * r;
  vec3 col;
  col.r = texture2D(tSrc, uv + dir).r;
  col.g = texture2D(tSrc, uv).g;
  col.b = texture2D(tSrc, uv - dir).b;
  // outside the rendered image -> lens housing (black, soft edge)
  vec2 e = min(uv, 1.0 - uv);
  float inside = smoothstep(0.0, 0.03, min(e.x, e.y));
  // security-cam grade: desaturate, tint, crush, noise, lines
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uSat) * uTint;
  col = max(col - 0.012, 0.0) * 1.08;
  float n = hash(floor(vUv * uRes * 0.5)) - 0.5;
  col += n * uNoise * (0.4 + l);
  col *= 0.92 + 0.08 * sin(vUv.y * uRes.y * 1.6);
  // optical vignette of a cheap ultra-wide lens
  col *= 1.0 - 0.55 * smoothstep(0.55, 1.25, r);
  col *= inside;
  col += uFlash;
  gl_FragColor = vec4(col, 1.0);
}`;

export type FisheyeProps = {
  position: V3;
  target: V3;
  /** vertical fov of the source perspective render (deg) */
  srcFov?: number;
  /** output half-angle across the width (deg); larger = stronger barrel */
  theta?: number;
  /** render target resolution (low = grainy cheap cam) */
  res?: [number, number];
  saturation?: number;
  tint?: string;
  noise?: number;
  seed?: number;
  /** additive white flash 0..1 */
  flash?: number;
  roll?: number;
};

export const FisheyeView: React.FC<FisheyeProps> = ({
  position, target, srcFov = 104, theta = 80, res = [800, 450], saturation = 0.55, tint = '#d8ecff', noise = 0.09, seed = 0, flash = 0, roll = 0,
}) => {
  const {gl, scene, camera} = useThree();
  const rt = useMemo(() => {
    const r = new THREE.WebGLRenderTarget(res[0], res[1], {type: THREE.HalfFloatType, samples: 2});
    r.texture.minFilter = THREE.LinearFilter;
    r.texture.magFilter = THREE.LinearFilter;
    return r;
  }, [res[0], res[1]]);
  const cam = useMemo(() => new THREE.PerspectiveCamera(srcFov, res[0] / res[1], 0.04, 400), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tSrc: {value: rt.texture}, uTheta: {value: 1}, uTanSrc: {value: 1}, uAspect: {value: 16 / 9}, uSat: {value: 0.5},
          uTint: {value: new THREE.Color()}, uNoise: {value: 0.08}, uSeed: {value: 0}, uFlash: {value: 0}, uRes: {value: new THREE.Vector2(1920, 1080)},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [rt],
  );
  const quad = useMemo(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.frustumCulled = false;
    m.renderOrder = 9999;
    m.layers.set(1);
    return m;
  }, [mat]);
  useLayoutEffect(() => {
    const prev = camera.layers.mask;
    camera.layers.set(1);
    return () => {
      camera.layers.mask = prev;
    };
  }, [camera]);
  useLayoutEffect(
    () => () => {
      rt.dispose();
      mat.dispose();
      quad.geometry.dispose();
    },
    [rt, mat, quad],
  );
  useLayoutEffect(() => {
    cam.position.set(...position);
    cam.up.set(0, 1, 0);
    cam.lookAt(...target);
    if (roll) cam.rotateZ(roll);
    cam.fov = srcFov;
    cam.aspect = res[0] / res[1];
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const tanSrcH = Math.tan(((srcFov * Math.PI) / 180) / 2) * (res[0] / res[1]);
    mat.uniforms.uTheta.value = (theta * Math.PI) / 180;
    mat.uniforms.uTanSrc.value = tanSrcH;
    mat.uniforms.uSat.value = saturation;
    (mat.uniforms.uTint.value as THREE.Color).set(tint);
    mat.uniforms.uNoise.value = noise;
    mat.uniforms.uSeed.value = (seed % 89) * 0.37;
    mat.uniforms.uFlash.value = flash;
  });
  useFrame(() => {
    const prev = gl.getRenderTarget();
    quad.visible = false;
    gl.setRenderTarget(rt);
    gl.clear(true, true, true);
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
    quad.visible = true;
  }, 0.5);
  return <primitive object={quad} />;
};
