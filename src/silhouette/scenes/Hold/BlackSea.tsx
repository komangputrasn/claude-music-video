/**
 * <BlackSea> — LOCAL to Hold (not a lib change): the black ocean. A three.js Reflector (same render path as the lib's
 * <WetGround>, verified under <SilStage>) with an ocean shader instead of wet concrete:
 *   - a near-void base and a near-perfect mirror at grazing angles (Fresnel), so the sea is black until something
 *     lights the sky above it;
 *   - a gentle SWELL: a few long directional waves rolling toward the camera (+Z) plus finer chop, all analytic from
 *     `time`. Their slopes bend the reflection: slopes along the view axis shift it vertically (a light's reflection is
 *     broken into a long path of glints toward the camera, like moonlight on the sea), sideways slopes shift it a little;
 *   - finer waves fade out with distance so the horizon never aliases; scene fog melts the far sea away.
 * Origin = the sea surface (y = 0), lying in XZ. Opaque: it IS the floor. One per shot (it re-renders the scene).
 *
 *   <BlackSea time={t} size?={3000} color?={S.void} reflectivity?={0.9} swell?={1} path?={1} resolution?={0.5}/>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {S} from '../../lib/palette';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

export type BlackSeaProps = GroupProps & {
  time: number;
  size?: number;
  color?: string;
  reflectivity?: number;
  /** wave height multiplier (0 = glass) */
  swell?: number;
  /** vertical reflection displacement multiplier (the length of a light's path of glints) */
  path?: number;
  resolution?: number;
};

const VERT = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform vec3 uBase;
uniform float uReflect, uTime, uSwell, uPath;
varying vec4 vUv;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>

// one directional wave: adds its height gradient (d h / d x, d h / d z)
void wave(inout vec2 g, vec2 p, vec2 dir, float len, float amp, float speed, float ph, float dist) {
  vec2 d = normalize(dir);
  float k = 6.2831853 / len;
  // fade a wave out where it gets too fine to resolve (no sparkle at the horizon)
  float fade = 1.0 - smoothstep(len * 9.0, len * 26.0, dist);
  float a = dot(d, p) * k - uTime * speed * k + ph;
  g += d * (amp * k * cos(a)) * fade;
}

void main() {
  vec2 p = vWorld.xz;
  float dist = length(cameraPosition - vWorld);
  vec2 g = vec2(0.0);
  // long swell rolling toward the camera (+Z), then shorter chop
  wave(g, p, vec2(0.08, 1.0), 14.0, 0.16, 1.9, 0.0, dist);
  wave(g, p, vec2(-0.22, 1.0), 7.5, 0.075, 1.5, 1.3, dist);
  wave(g, p, vec2(0.30, 1.0), 4.1, 0.040, 1.1, 2.1, dist);
  wave(g, p, vec2(-0.45, 1.0), 2.3, 0.020, 0.8, 4.0, dist);
  wave(g, p, vec2(0.62, 1.0), 1.25, 0.010, 0.6, 0.7, dist);
  wave(g, p, vec2(-0.1, 1.0), 0.7, 0.0045, 0.45, 5.3, dist);
  g *= uSwell;
  // slopes along the view axis move the reflection vertically (the path of glints), sideways slopes a little
  vec2 uv = vUv.xy / vUv.w + vec2(g.x * 0.05, g.y * 0.55 * uPath);
  // a short vertical smear keeps the broken path soft
  vec3 acc = vec3(0.0);
  float ws = 0.0;
  for (int i = 0; i < 7; i++) {
    float k = float(i) / 6.0 * 2.0 - 1.0;
    float w = exp(-k * k * 2.0);
    acc += texture2D(tDiffuse, uv + vec2(0.0, k * 0.006 * uPath)).rgb * w;
    ws += w;
  }
  vec3 refl = acc / ws;
  // Fresnel with the wave normal: a mirror at grazing angles, darker looking down into the water
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 V = normalize(cameraPosition - vWorld);
  float cosT = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
  float rk = uReflect * (0.18 + 0.82 * fres);
  gl_FragColor = vec4(uBase + refl * rk, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const SEA_SHADER = {
  name: 'HoldBlackSea',
  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      color: {value: null},
      tDiffuse: {value: null},
      textureMatrix: {value: null},
      uBase: {value: new THREE.Color()},
      uReflect: {value: 0.9},
      uTime: {value: 0},
      uSwell: {value: 1},
      uPath: {value: 1},
    },
  ]),
  vertexShader: VERT,
  fragmentShader: FRAG,
};

export const BlackSea: React.FC<BlackSeaProps> = ({
  time, size = 3000, color = S.void, reflectivity = 0.9, swell = 1, path = 1, resolution = 0.5, ...group
}) => {
  const {size: vp, gl} = useThree();
  const pr = gl.getPixelRatio();
  const tw = Math.max(64, Math.round(vp.width * pr * resolution));
  const th = Math.max(64, Math.round(vp.height * pr * resolution));
  const refl = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(size, size), {
      clipBias: 0.003, textureWidth: tw, textureHeight: th, shader: SEA_SHADER, multisample: 0, color: 0x7f7f7f,
    });
    r.rotation.x = -Math.PI / 2;
    (r.material as THREE.ShaderMaterial).fog = true;
    r.renderOrder = -20;
    return r;
  }, [size, tw, th]);
  useLayoutEffect(() => () => {
    refl.geometry.dispose();
    refl.dispose();
  }, [refl]);
  useLayoutEffect(() => {
    const u = (refl.material as THREE.ShaderMaterial).uniforms;
    u.uBase.value.set(color);
    u.uReflect.value = reflectivity;
    u.uTime.value = time;
    u.uSwell.value = swell;
    u.uPath.value = path;
  });
  return (
    <group {...group}>
      <primitive object={refl} />
    </group>
  );
};
