// V1Bedroom local pieces: the TENURE bed clock ("03:15"), CellGuy (SilGuy with a correctly wound hood drape),
// Unoccluded (draws its subtree over nearer opaque geometry: the lyric on the back wall seen through the blinds).
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {S, SFONTS, GREYS, hdr} from '../../lib/palette';
import {SilGuy, SilGuyProps} from '../../lib/SilCast';
import {Silhouette} from '../../lib/Silhouette';
import {guyJointMatrix, GUY_DIM} from '../../../lib/characters/Guy';

type V3 = [number, number, number];

const clockTexCache = new Map<string, THREE.CanvasTexture>();
/** Red mono readout texture (white glyphs + baked halo; tinted by the material). <WorldLyric> drops ':' so we draw it. */
const readoutTex = (text: string) => {
  const hit = clockTexCache.get(text);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d')!;
  g.font = `400 132px ${SFONTS.mono}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.filter = 'blur(10px)';
  g.globalAlpha = 0.45;
  g.fillText(text, 256, 100);
  g.filter = 'none';
  g.globalAlpha = 1;
  g.fillText(text, 256, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  clockTexCache.set(text, t);
  return t;
};

/** The bed's TENURE clock: a black wall unit with a red mono "03:15" readout. `glow` scales the red (≤ ~1.6). */
export const BedClock: React.FC<{position: V3; glow?: number; scale?: number; rotationY?: number}> = ({position, glow = 1, scale = 1, rotationY = 0}) => {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({map: readoutTex('03:15'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.color.copy(hdr(S.authRed, Math.min(1.6, 1.1 * glow)));
  });
  return (
    <group position={position} scale={scale} rotation-y={rotationY}>
      <mesh position={[0, 0, 0.008]}>
        <boxGeometry args={[0.42, 0.16, 0.016]} />
        <meshBasicMaterial color={GREYS.g1} />
      </mesh>
      <mesh position={[0, 0, 0.0175]} scale={[0.4, 0.15, 1]} material={mat}>
        <planeGeometry />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ CellGuy
// Local workaround (shared file not edited). SilCast's buildHood() lathes the hood's back drape from top to bottom, so
// its faces point INWARD; under the FrontSide silhouette material only the far inner strip of the drape renders. It is
// also rigid with the head and flares 0.27 m behind it, so whenever he looks down, in profile or back views, it sticks
// out of the back of the hood like a ponytail. CellGuy hides that drape and hangs its own: wound outward (points
// bottom → top), slimmer, and carried by the NECK joint (spine + 35 % of the head pitch), so the hood's back stays a
// cowl on his shoulders when he hunches. The hood shell itself (a sphere about the head centre) is unchanged.
let drapeGeo: THREE.LatheGeometry | null = null;
const getDrape = () => {
  if (drapeGeo) return drapeGeo;
  const pts: THREE.Vector2[] = [];
  for (let i = 10; i >= 0; i--) {
    const k = i / 10;
    pts.push(new THREE.Vector2(0.158 + 0.06 * Math.pow(k, 1.5), 0.03 - 0.3 * k));
  }
  const g = new THREE.LatheGeometry(pts, 18, Math.PI * 0.52, Math.PI * 0.96);
  g.scale(1.0, 1.0, 0.82);
  g.translate(0, 0, -0.025);
  drapeGeo = g;
  return g;
};

/** <SilGuy> (no hand props) with the local hood drape (see above). Same props as SilGuy. */
export const CellGuy: React.FC<Omit<SilGuyProps, 'rightHand' | 'leftHand'>> = ({pose = {}, rim = null, color = S.void, fog = true, opacity = 1, hood = 1, ...group}) => {
  const ref = useRef<THREE.Group>(null);
  const neckM = guyJointMatrix(pose, 'neck', {});
  // hide SilCast's drape (the only LatheGeometry in the Guy); <Silhouette> respects userData.silHide on later renders
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry?.type === 'LatheGeometry' && m.geometry !== drapeGeo) {
        m.userData.silHide = true;
        m.visible = false;
      }
    });
  });
  return (
    <group {...group}>
      <group ref={ref}>
        <SilGuy pose={pose} rim={rim} color={color} fog={fog} opacity={opacity} hood={hood} />
      </group>
      {hood > 0.5 ? (
        <Silhouette color={color} rim={rim} fog={fog} opacity={opacity}>
          <group matrix={neckM} matrixAutoUpdate={false}>
            <mesh geometry={getDrape()} position={[0, GUY_DIM.headY, 0]} />
          </group>
        </Silhouette>
      ) : null}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ Unoccluded
/**
 * Draws its subtree without depth testing (and late), so nearer opaque geometry does not cut it. Used for the shot-A
 * lyric: the words stay ON the back wall (its depth, scale and parallax during the dolly) but the blind slats in front
 * no longer blank whole letter stems. Only use it where the subtree is seen inside an opening (here: the window), never
 * where it would draw over a wall that should hide it.
 */
export const Unoccluded: React.FC<{children: React.ReactNode; order?: number}> = ({children, order = 20}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.renderOrder = order;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mm) => {
        if (mm && mm.depthTest) {
          mm.depthTest = false;
          mm.needsUpdate = true;
        }
      });
    });
  });
  return <group ref={ref}>{children}</group>;
};
