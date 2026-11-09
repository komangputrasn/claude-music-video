// <Stage>: the ONE way every scene renders 3D. Full-frame ThreeCanvas + procedural environment map +
// three.js-native post chain (UnrealBloom + Y2K lens pass: chromatic aberration, vignette, grain, scanlines).
//
// NOTE: @react-three/postprocessing renders BLACK under Remotion's manual frame loop — do not use it.
// This file uses three/examples/jsm/postprocessing, which is verified to work.
//
// Animation rule: derive everything from useCurrentFrame()/useSongTime() during render (JSX props), or mutate
// objects in useLayoutEffect. Never useFrame() for animation, never useEffect for per-frame mutation
// (Remotion advances the renderer in a passive effect that runs BEFORE your passive effects -> 1 frame lag).
import React, {useLayoutEffect, useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {makeEnvScene, EnvPreset} from './envs';

export type BloomOpts = {strength?: number; radius?: number; threshold?: number};
export type LensOpts = {aberration?: number; vignette?: number; grain?: number; scanlines?: number; saturation?: number};

export type StageProps = {
  children: React.ReactNode;
  /** CSS color for scene background; null = transparent canvas (so HTML underneath shows). */
  background?: string | null;
  fog?: {color: string; near: number; far: number} | null;
  /** Procedural environment for reflections (chrome needs one). */
  env?: EnvPreset | 'none';
  /** Also show the environment as the visible background (overrides `background`). */
  envBackground?: boolean;
  bloom?: BloomOpts | false;
  lens?: LensOpts | false;
  /** initial camera; animate it with <CameraRig/>. */
  camera?: {fov?: number; near?: number; far?: number; position?: [number, number, number]};
  exposure?: number;
  shadows?: boolean;
  style?: React.CSSProperties;
};

const Y2KLensShader = {
  uniforms: {
    tDiffuse: {value: null as THREE.Texture | null},
    uAberration: {value: 0.0015},
    uVignette: {value: 0.35},
    uGrain: {value: 0.04},
    uScan: {value: 0.0},
    uSat: {value: 1.08},
    uSeed: {value: 0},
    uRes: {value: new THREE.Vector2(1920, 1080)},
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uAberration, uVignette, uGrain, uScan, uSat, uSeed; uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32 + uSeed); return fract(p.x * p.y); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * uAberration * (1.0 + 4.0 * r2);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSat);
      col *= 1.0 - uVignette * smoothstep(0.15, 0.75, r2 * 1.6);
      col += (hash(vUv * uRes) - 0.5) * uGrain;
      col *= 1.0 - uScan * (0.5 + 0.5 * sin(vUv.y * uRes.y * 3.14159));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const PostChain: React.FC<{bloom: BloomOpts | false; lens: LensOpts | false}> = ({bloom, lens}) => {
  const {gl, scene, camera, size} = useThree();
  const frame = useCurrentFrame();
  const {composer, bloomPass, lensPass} = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {type: THREE.HalfFloatType, samples: 4});
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    const b = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.6, 0.4, 0.9);
    c.addPass(b);
    c.addPass(new OutputPass());
    const l = new ShaderPass(Y2KLensShader);
    c.addPass(l);
    return {composer: c, bloomPass: b, lensPass: l};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);
  useLayoutEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);
  useLayoutEffect(() => () => composer.dispose(), [composer]);
  useLayoutEffect(() => {
    bloomPass.enabled = bloom !== false;
    if (bloom) {
      bloomPass.strength = bloom.strength ?? 0.6;
      bloomPass.radius = bloom.radius ?? 0.4;
      bloomPass.threshold = bloom.threshold ?? 0.9;
    }
    lensPass.enabled = lens !== false;
    const u = lensPass.uniforms;
    const L = lens || {};
    u.uAberration.value = L.aberration ?? 0.0015;
    u.uVignette.value = L.vignette ?? 0.35;
    u.uGrain.value = L.grain ?? 0.035;
    u.uScan.value = L.scanlines ?? 0;
    u.uSat.value = L.saturation ?? 1.08;
    u.uSeed.value = (frame % 97) * 0.731;
    u.uRes.value.set(size.width, size.height);
  });
  useFrame(() => composer.render(), 1);
  return null;
};

const EnvSetup: React.FC<{env: EnvPreset | 'none'; envBackground: boolean; background: string | null; fog: StageProps['fog']; exposure: number}> = ({
  env, envBackground, background, fog, exposure,
}) => {
  const {gl, scene} = useThree();
  const tex = useMemo(() => {
    if (env === 'none') return null;
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(makeEnvScene(env), 0.02).texture;
    pm.dispose();
    return t;
  }, [gl, env]);
  useLayoutEffect(() => {
    scene.environment = tex;
    scene.background = envBackground && tex ? tex : background ? new THREE.Color(background) : null;
    scene.fog = fog ? new THREE.Fog(fog.color, fog.near, fog.far) : null;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [scene, gl, tex, envBackground, background, fog?.color, fog?.near, fog?.far, exposure]);
  return null;
};

export const Stage: React.FC<StageProps> = ({
  children, background = '#000', fog = null, env = 'chrome', envBackground = false,
  bloom = {}, lens = {}, camera, exposure = 1, shadows = false, style,
}) => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{position: 'absolute', inset: 0, ...style}}
      gl={{antialias: true, alpha: background === null, powerPreference: 'high-performance'}}
      shadows={shadows}
      camera={{fov: camera?.fov ?? 45, near: camera?.near ?? 0.1, far: camera?.far ?? 500, position: camera?.position ?? [0, 1.6, 8]}}
    >
      <EnvSetup env={env} envBackground={envBackground} background={background} fog={fog} exposure={exposure} />
      {children}
      {bloom === false && lens === false ? null : <PostChain bloom={bloom} lens={lens} />}
    </ThreeCanvas>
  );
};

/** Drives the default camera. Put inside <Stage>. All values may change every frame. */
export const CameraRig: React.FC<{
  position: [number, number, number];
  target?: [number, number, number];
  fov?: number;
  /** roll in radians (dutch angle) */
  roll?: number;
}> = ({position, target = [0, 0, 0], fov, roll = 0}) => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.up.set(0, 1, 0);
    camera.lookAt(...target);
    if (roll) camera.rotateZ(roll);
    if (fov !== undefined && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
};
