/**
 * Render-to-texture helpers shared by the Intro and Outro (both "picture on the CRT" bookends).
 *
 *   const rt = useRenderTarget(1024, 768);
 *   <RenderToTexture target={rt} camera={{position, target, fov}} background="#000">
 *     <Bedroom .../>                       // rendered into rt each frame (own scene, own lights)
 *   </RenderToTexture>
 *   <CRTTV screen={rt.texture} />
 *
 * The children live in their own THREE.Scene via an R3F portal (the portal's camera is the RT camera, so components that
 * read useThree().camera — e.g. SunFlare — see the right one). The render happens in useLayoutEffect, i.e. after every
 * child's layout effect (React runs child effects first) and before Remotion advances the main <Stage> render.
 * The target is linear HDR (HalfFloat); the main composer's OutputPass tone-maps it together with the rest of the frame.
 *
 * Optional `overlay`: a second (orthographic) scene drawn on top without clearing colour — used for the camcorder HUD.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {createPortal, useThree} from '@react-three/fiber';
import {makeEnvScene, EnvPreset} from '../../lib/three/envs';

export type V3 = [number, number, number];
export type RTCam = {position: V3; target: V3; fov: number; roll?: number};

export const useRenderTarget = (w: number, h: number, samples = 4) => {
  const rt = useMemo(() => {
    const r = new THREE.WebGLRenderTarget(w, h, {type: THREE.HalfFloatType, samples, depthBuffer: true});
    r.texture.generateMipmaps = true;
    r.texture.minFilter = THREE.LinearMipmapLinearFilter;
    r.texture.magFilter = THREE.LinearFilter;
    r.texture.anisotropy = 4;
    return r;
  }, [w, h, samples]);
  useLayoutEffect(() => () => rt.dispose(), [rt]);
  return rt;
};

/** Poses the portal camera (first child of the portal, so its layout effect runs before the other children's). */
const PortalCam: React.FC<{cam: THREE.PerspectiveCamera; c: RTCam; aspect: number}> = ({cam, c, aspect}) => {
  useLayoutEffect(() => {
    cam.position.set(...c.position);
    cam.up.set(0, 1, 0);
    cam.lookAt(...c.target);
    if (c.roll) cam.rotateZ(c.roll);
    cam.fov = c.fov;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  });
  return null;
};

export type RenderToTextureProps = {
  target: THREE.WebGLRenderTarget;
  camera: RTCam;
  background?: string;
  fog?: {color: string; near: number; far: number} | null;
  /** own procedural environment (default: share the main Stage's env) */
  env?: EnvPreset;
  /** false = keep the last picture (no render this frame) */
  enabled?: boolean;
  overlay?: {scene: THREE.Scene; camera: THREE.Camera} | null;
  /** called right before rendering (e.g. to refresh an overlay canvas: parent layout effects run AFTER this one) */
  beforeRender?: () => void;
  children: React.ReactNode;
};

export const RenderToTexture: React.FC<RenderToTextureProps> = ({target, camera, background = '#000000', fog = null, env, enabled = true, overlay = null, beforeRender, children}) => {
  const {gl, scene: mainScene} = useThree();
  const envTex = useMemo(() => {
    if (!env) return null;
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(makeEnvScene(env), 0.02).texture;
    pm.dispose();
    return t;
  }, [gl, env]);
  useLayoutEffect(() => () => envTex?.dispose(), [envTex]);
  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.PerspectiveCamera(camera.fov, target.width / target.height, 0.05, 600), [target]);
  const fogObj = useMemo(() => (fog ? new THREE.Fog(fog.color, fog.near, fog.far) : null), [fog?.color, fog?.near, fog?.far]);
  const bg = useMemo(() => new THREE.Color(background), [background]);
  useLayoutEffect(() => {
    if (!enabled) return;
    beforeRender?.();
    scene.environment = envTex ?? mainScene.environment;
    scene.background = bg;
    scene.fog = fogObj;
    const prevTarget = gl.getRenderTarget();
    const prevAuto = gl.autoClear;
    gl.setRenderTarget(target);
    gl.autoClear = false;
    gl.clear(true, true, true);
    gl.render(scene, cam);
    if (overlay) {
      gl.clearDepth();
      gl.render(overlay.scene, overlay.camera);
    }
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAuto;
  });
  return createPortal(
    <>
      <PortalCam cam={cam} c={camera} aspect={target.width / target.height} />
      {children}
    </>,
    scene,
    {camera: cam},
  );
};

/** A persistent canvas + CanvasTexture redrawn (in useLayoutEffect) only when `key` changes. */
export const useLiveCanvasTexture = (w: number, h: number, key: string, draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) =>
  useLiveCanvas(w, h, key, draw).tex;

/** Same as useLiveCanvasTexture but also returns `update()` (idempotent) for callers that need the picture earlier. */
export const useLiveCanvas = (w: number, h: number, key: string, draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) => {
  const {canvas, tex} = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 8;
    return {canvas: c, tex: t};
  }, [w, h]);
  const last = useMemo(() => ({key: ''}), [canvas]);
  const update = () => {
    if (last.key === key) return;
    last.key = key;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(ctx, canvas);
    tex.needsUpdate = true;
  };
  useLayoutEffect(update);
  useLayoutEffect(() => () => tex.dispose(), [tex]);
  return {tex, update};
};

/** Ortho overlay scene showing a canvas texture over the whole render target (drawn after the RT scene, no depth). */
export const useOverlayScene = (tex: THREE.Texture, brightness = 1.5) => {
  const o = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    camera.position.z = 1;
    const mat = new THREE.MeshBasicMaterial({map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(mesh);
    return {scene, camera, mat, mesh};
  }, [tex]);
  useLayoutEffect(() => {
    o.mat.color.setScalar(brightness);
  });
  useLayoutEffect(
    () => () => {
      o.mat.dispose();
      o.mesh.geometry.dispose();
    },
    [o],
  );
  return o;
};
