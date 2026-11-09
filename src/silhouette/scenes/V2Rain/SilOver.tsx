/**
 * <SilOver> — LOCAL helper for V2Rain shot 3 (not a lib change). Re-skins a silhouette subtree (e.g. a <SilGuy>) with
 * one flat S.void MeshBasicMaterial that is drawn in the TRANSPARENT pass after the light shafts (high renderOrder,
 * alpha 1, depth written), so an additive volume that lies BETWEEN the camera and the figure (a drone cone coming in
 * through the window and landing on the floor in front of him) can never paint over him: he stays a clean black
 * cut-out, the beam reads as passing behind him. Same look as <Silhouette> without rim (flat void + fog).
 *
 * `clipBelow` (world y, or null) discards everything below that height. guyClimb's rising knee passes through the
 * 0.2 m wall under the sill (keyPoses are not collision-aware) and pokes out of the inner face as a floating foot;
 * while he is still outside, everything of him below the sill is behind the wall anyway, so clipping there only
 * removes the poke-through.
 *
 *   <SilOver clipBelow={p < 0.3 ? 1.0 : null}><SilGuy … /></SilOver>
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {S} from '../../lib/palette';
import {applySilhouette} from '../../lib/Silhouette';

export const SilOver: React.FC<{renderOrder?: number; clipBelow?: number | null; children: React.ReactNode}> = ({
  renderOrder = 12, clipBelow = null, children,
}) => {
  const ref = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({color: S.void, transparent: true, opacity: 1, depthWrite: true, depthTest: true, fog: true}),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  // every render (after the inner <Silhouette>'s own layout effect, children run first): re-apply
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    plane.constant = -(clipBelow ?? 0);
    const want = clipBelow !== null;
    const has = !!mat.clippingPlanes && mat.clippingPlanes.length > 0;
    if (want !== has) {
      mat.clippingPlanes = want ? [plane] : [];
      mat.needsUpdate = true;
    }
    if (ref.current) applySilhouette(ref.current, mat, undefined, renderOrder);
  });
  return <group ref={ref}>{children}</group>;
};
