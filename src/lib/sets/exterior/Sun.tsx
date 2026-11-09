/**
 * <SunFlare> — Y2K lens flare for a sun/moon/any bright light at infinity: hot core + 4-point sparkle at the light, plus a
 * chain of coloured ghost discs/rings (aqua, bubblegum, lime, grape) mirrored through the screen centre. Camera-aware but
 * deterministic: positions are recomputed in useLayoutEffect from the current camera (place it AFTER <CameraRig> in the tree
 * so it reads this frame's camera). Fades out when the light leaves the frame or is behind the camera.
 *
 *   <SkyDome preset="day" /> ... <CameraRig .../> <SunFlare dir={SKY_PRESETS.day.sunDir} strength={1} />
 *   <SunFlare position={[x, y, z]} />            // or a world-space point light source (e.g. a street lamp, headlight)
 *   props: dir | position, strength (0..1+), size (core size factor), ghosts (default true), color (core tint), twinkle (0..1),
 *          occlusion (default true: one raycast per frame hides the flare when an opaque mesh blocks the light)
 *
 * sunDirection(preset) is re-exported for convenience: the unit vector toward the preset's visible sun/moon.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {canvasTex, glowTex, sparkleTex} from './common';
import {SKY_PRESETS, SkyPreset} from './SkyDome';

type V3 = [number, number, number];

export const sunDirection = (preset: SkyPreset): V3 => SKY_PRESETS[preset].sunDir;

let _ring: THREE.Texture | null = null;
const ringTex = () => {
  if (_ring) return _ring;
  _ring = canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, {srgb: false});
  return _ring;
};
let _hex: THREE.Texture | null = null;
const hexTex = () => {
  if (_hex) return _hex;
  _hex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = w / 2 + Math.cos(a) * w * 0.44, y = h / 2 + Math.sin(a) * h * 0.44;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.closePath();
    c.fill();
  }, {srgb: false});
  return _hex;
};

// [t along the sun->centre->mirror line (1 = at sun, 0 = centre, -1 = mirrored), size, tex, colour, opacity]
const GHOSTS: [number, number, 'glow' | 'ring' | 'hex', string, number][] = [
  [0.62, 0.05, 'hex', '#19c6ff', 0.35],
  [0.35, 0.09, 'ring', '#ff4fb8', 0.3],
  [0.12, 0.035, 'glow', '#9bff3a', 0.45],
  [-0.18, 0.07, 'hex', '#8a4dff', 0.3],
  [-0.42, 0.13, 'ring', '#19c6ff', 0.28],
  [-0.62, 0.045, 'glow', '#ffd23a', 0.4],
  [-0.95, 0.2, 'ring', '#ff4fb8', 0.18],
];

export type SunFlareProps = {
  dir?: V3;
  position?: V3;
  strength?: number;
  size?: number;
  ghosts?: boolean;
  color?: string;
  twinkle?: number;
  /** hide the flare when geometry blocks the light (single raycast per frame; default true) */
  occlusion?: boolean;
};

export const SunFlare: React.FC<SunFlareProps> = ({dir, position, strength = 1, size = 1, ghosts = true, color = '#fff6dc', twinkle = 0, occlusion = true}) => {
  const {camera, scene} = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const coreRef = useRef<THREE.Sprite>(null);
  const starRef = useRef<THREE.Sprite>(null);
  const ghostRefs = useRef<(THREE.Sprite | null)[]>([]);
  const mats = useMemo(() => {
    const mk = (map: THREE.Texture, col: string) =>
      new THREE.SpriteMaterial({map, color: new THREE.Color(col), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false});
    return {
      core: mk(glowTex(), color),
      star: mk(sparkleTex(), '#ffffff'),
      ghosts: GHOSTS.map(([, , k, col]) => mk(k === 'glow' ? glowTex() : k === 'ring' ? ringTex() : hexTex(), col)),
    };
  }, [color]);

  useLayoutEffect(() => {
    camera.updateMatrixWorld();
    const cam = camera as THREE.PerspectiveCamera;
    const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const src = position ? new THREE.Vector3(...position) : camPos.clone().add(new THREE.Vector3(...(dir ?? [0, 1, 0])).normalize().multiplyScalar(300));
    const ndc = src.clone().project(cam);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const inFront = src.clone().sub(camPos).dot(fwd) > 0;
    const edge = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));
    let vis = inFront ? Math.max(0, Math.min(1, (1.25 - edge) / 0.35)) : 0;
    if (vis > 0 && occlusion) {
      // hide when solid geometry blocks the light (deterministic single ray)
      const d = src.clone().sub(camPos);
      const maxD = position ? d.length() - 0.3 : 250;
      ray.set(camPos, d.normalize());
      ray.far = maxD;
      ray.camera = cam;
      const hits = ray.intersectObjects(scene.children, true);
      const blocked = hits.some((h) => {
        const o = h.object as THREE.Mesh;
        if (!(o as THREE.Mesh).isMesh || (o as THREE.InstancedMesh).isInstancedMesh || !o.visible) return false;
        const m = o.material as THREE.Material;
        if (!m || Array.isArray(m) || m.transparent || m.side === THREE.BackSide || (m as THREE.ShaderMaterial).isShaderMaterial) return false;
        return true;
      });
      if (blocked) vis = 0;
    }
    const k = strength * vis;
    const D = 8; // place flare sprites 8 m in front of the camera
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov ?? 45) / 2);
    const place = (s: THREE.Sprite | null, nx: number, ny: number, sz: number, op: number, mat: THREE.SpriteMaterial) => {
      if (!s) return;
      const p = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(camPos).normalize().multiplyScalar(D).add(camPos);
      s.position.copy(p);
      s.scale.setScalar(sz * D * tanH * 2);
      mat.opacity = op;
      s.visible = op > 0.002;
    };
    const tw = 1 + twinkle * 0.15 * Math.sin(ndc.x * 40 + ndc.y * 33);
    place(coreRef.current, ndc.x, ndc.y, 0.22 * size * tw, 0.9 * k, mats.core);
    place(starRef.current, ndc.x, ndc.y, 0.42 * size * tw, 0.85 * k, mats.star);
    GHOSTS.forEach(([t, sz, , , op], i) => {
      place(ghostRefs.current[i], ndc.x * t, ndc.y * t, sz * size, ghosts ? op * k : 0, mats.ghosts[i]);
    });
  });

  return (
    <group>
      <sprite ref={coreRef} material={mats.core} renderOrder={50} frustumCulled={false} />
      <sprite ref={starRef} material={mats.star} renderOrder={51} frustumCulled={false} />
      {GHOSTS.map((_, i) => (
        <sprite key={i} ref={(el) => { ghostRefs.current[i] = el; }} material={mats.ghosts[i]} renderOrder={52} frustumCulled={false} />
      ))}
    </group>
  );
};
