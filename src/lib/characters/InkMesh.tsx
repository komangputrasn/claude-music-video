// <InkMesh>: a mesh + optional ink outline (inverted hull). Pass the geometry either as `geometry` (preferred, build it in
// useMemo) or as a single JSX geometry child, e.g. <InkMesh color="#E9B25E"><sphereGeometry args={[0.3, 12, 8]}/></InkMesh>.
// Smooth-normal geometries outline best; flatShading is applied by the toon material look anyway.
import React from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {toonMat, outlineMat, OUTLINE} from './toon';

type MeshProps = ThreeElements['mesh'];
export type InkMeshProps = Omit<MeshProps, 'material' | 'children'> & {
  color?: string;
  /** custom material instead of toonMat(color) */
  material?: THREE.Material;
  /** outline thickness in object-space metres; 0/false disables */
  outline?: number | false;
  outlineColor?: string;
  emissive?: string;
  emissiveIntensity?: number;
  children?: React.ReactElement;
};

export const InkMesh = React.forwardRef<THREE.Mesh, InkMeshProps>(function InkMesh(
  {color = '#ffffff', material, outline = OUTLINE.thickness, outlineColor = OUTLINE.color, emissive, emissiveIntensity, geometry, children, ...rest},
  ref,
) {
  const mat = material ?? toonMat(color, {emissive, emissiveIntensity});
  return (
    <mesh ref={ref} geometry={geometry} material={mat} {...rest}>
      {children ? React.cloneElement(children) : null}
      {outline ? (
        <mesh geometry={geometry} material={outlineMat(outline, outlineColor)} raycast={() => null}>
          {children ? React.cloneElement(children) : null}
        </mesh>
      ) : null}
    </mesh>
  );
});
