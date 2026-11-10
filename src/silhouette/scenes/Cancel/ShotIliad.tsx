// Cancel · shot C — 147.33 → 155.93 (cut to Hold). Lines 34–35:
//   "Amazon named its cancel page 'Iliad,'" / "the most honest name that a cancel page had."
// A colossal wall of Greek capitals cut stoichedon into ashlar (the opening of the Iliad, unreadable at this scale),
// raked from its foot by a red light trench: every chisel cut catches red, the face itself stays dark. He stands at its
// foot, tiny, black against the red glow, hammer hanging from his right hand, and looks up. The sung lines are cut among
// the Greek in Latin capitals, filled with light: first at his scale ("ILIAD," larger, like a title), then — as the
// camera cranes slowly up and back to reveal the endless wall — line 35 high above him. Bass pulses the red light.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric, type WordInfo} from '../../lib/WorldLyric';
import {WetGround, Backlight} from '../../lib/atmos';
import {HeldSilHammer, GlowBillboard} from '../../lib/props';
import {bassAt} from '../../../lib/time';
import {guyIdle, mergePose} from '../../../lib/characters/Guy';
import {ShotProps, VoidFloor, prog, easeInOut, smooth, mix, mixV, pulseAfter, rowsPerWord} from './common';
import {iliadMap, ILIAD_TILE, ILIAD_GRID} from './textures';
import {T, L, SHOTS} from './timing';

export const FOG_C = {color: GREYS.g1, near: 60, far: 420};
/**
 * The sung lines are opaque light-filled letters ('screen': bone, luminance ~0.8, just under the bloom threshold) with
 * their own halo. As additive 'light' they summed with the red wall past the threshold, and the white bloom laid a grey
 * haze over the block that turned CANCEL coral (~240,120,105). The wall keeps its bloom.
 */
const LYRIC = {mode: 'screen', intensity: 1, halo: 0.3} as const;
/** control words: no onset flash above authRed × 1 (brighter tone-maps orange) */
const noFlash = (_i: number, w: WordInfo) => (w.since < 0.22 ? 1 / 1.45 : 1);

// ------------------------------------------------------------------------------------------------ the carved wall
const WALL_VERT = /* glsl */ `
varying vec3 vWorld;
#include <common>
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const WALL_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uTile;
uniform vec3 uRed;     // linear authRed × intensity
uniform vec3 uFace;    // the stone's own (unlit) grey
uniform vec3 uSky;     // faint cold top light
uniform float uFront;  // height (m) the red light reaches
uniform float uFall;   // falloff height (m)
uniform float uTrench; // distance of the light line from the wall (m)
uniform vec2 uShift;   // per-tile offsets (whole letters / whole courses) so the repeat never lines up
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 uvc = vWorld.xy / uTile;
  vec2 cell = floor(uvc);
  vec2 uv = uvc + vec2(cell.y * uShift.x, cell.x * uShift.y);
  // gradients from the continuous uv: the per-tile shift must not pick a tiny mip along the tile seams
  vec2 gx = dFdx(uvc), gy = dFdy(uvc);
  vec4 m = texture2DGradEXT(uMap, uv, gx, gy);
  float sky = m.r, down = m.g, face = m.b, h = m.a;
  float y = max(vWorld.y, 0.0);
  // raking light from the trench at the foot: almost parallel to the wall, coming from below. The map is pre-lit per
  // channel, so this stays linear in the filtered texels: far away the lit cut walls average into a red grain instead
  // of flattening out (a max(dot(n, L)) of mip-averaged normals goes dark).
  vec3 Lr = normalize(vec3(0.0, -(y + 0.35), uTrench));
  // far away (distance, so it does not depend on the output resolution) the thin lit edges get a little help
  float far = smoothstep(45.0, 120.0, distance(cameraPosition, vWorld));
  float rake = down * (-Lr.y) * (1.0 + 0.7 * far) + face * Lr.z;
  // the face itself catches a little (more near the trench); cuts that face down catch it fully
  float lit = rake * (1.0 / (1.0 + y / uFall)) * smoothstep(uFront + 10.0, uFront - 10.0, y);
  float cav = mix(0.25, 1.0, smoothstep(0.05, 0.9, h));
  // a faint cold light from far above: cuts that face up go grey (gives the relief its second side)
  vec3 col = uFace * cav + uRed * lit * cav + uSky * sky;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

const IliadWall: React.FC<{red: number; front: number}> = ({red, front}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uMap: {value: null}, uTile: {value: new THREE.Vector2(ILIAD_TILE.w, ILIAD_TILE.h)}, uRed: {value: new THREE.Color()},
            uFace: {value: new THREE.Color()}, uSky: {value: new THREE.Color()}, uFront: {value: 30}, uFall: {value: 38}, uTrench: {value: 1.6},
            uShift: {value: new THREE.Vector2(19 / ILIAD_GRID.cols, (3 * ILIAD_GRID.course) / ILIAD_GRID.rows)},
          },
        ]),
        vertexShader: WALL_VERT,
        fragmentShader: WALL_FRAG,
        fog: true,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uMap.value = iliadMap();
    u.uRed.value.set(S.authRed).multiplyScalar(red);
    u.uFace.value.set(GREYS.g3).multiplyScalar(0.5);
    u.uSky.value.set(GREYS.g6).multiplyScalar(0.55);
    u.uFront.value = front;
  });
  return (
    <mesh material={mat} position={[0, 160, 0]}>
      <planeGeometry args={[520, 320]} />
    </mesh>
  );
};

/** the red light trench along the foot of the wall: a hot line, its glow on the stone and on the floor */
const Trench: React.FC<{k: number}> = ({k}) => {
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({fog: true, toneMapped: true}), []);
  useLayoutEffect(() => () => lineMat.dispose(), [lineMat]);
  useLayoutEffect(() => {
    lineMat.color.set(S.authRed).multiplyScalar(1.3 * k);
  });
  return (
    <>
      <mesh material={lineMat} position={[0, 0.012, 0.9]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[520, 0.22]} />
      </mesh>
      {/* the trench's haze on the wall's foot and the spill on the floor (behind the figure) */}
      <Backlight color={S.authRed} position={[0, 2.0, 0.15]} size={[260, 6]} shape="slab" softness={1} intensity={0.32 * k} noise={0.2} />
    </>
  );
};

// ------------------------------------------------------------------------------------------------ the shot
const EM34 = 1.65;
const ROWS34 = rowsPerWord(L.amazon, EM34, [[0, 1, 2], [3, 4], [5]], {rowScale: [1, 1, 2.1], rowGap: [1, 1, 0.95]});
const LINE34_Y = 10.7; // baseline of row 0
const EM35 = 3.5;
const ROWS35 = rowsPerWord(L.honest, EM35, [[0, 1, 2, 3], [4, 5, 6, 7, 8]]);
const LINE35_Y = 23.2;
const GUY_Z = 5.5;

export const ShotIliad: React.FC<ShotProps> = ({t, f}) => {
  const bass = bassAt(f);
  // the crane: holds on him at the foot of the wall while line 34 is cut, then rises and pulls back to the whole wall
  const c = easeInOut(prog(t, T.amazon + 1.2, SHOTS.iliad.t1 - 0.2));
  const cam = mixV([0, 1.35, 37], [0, 13.5, 128], c);
  const target = mixV([0, 7.4, 0], [0, 21.5, 0], c);
  const fov = cameraFovForVisible(mix(23, 25, c));

  // light: the trench pulses with the bass; the red climbs the wall ahead of the camera
  const k = 0.88 + 0.22 * bass + 0.12 * pulseAfter(t, T.honest, 3);
  const front = mix(26, 95, smooth(prog(t, T.amazon, SHOTS.iliad.t1)));

  const look = smooth(prog(t, T.amazon + 0.3, T.amazon + 2.2));
  const pose = mergePose(guyIdle(t, 7), {headPitch: mix(0.05, -0.55, look), torsoBend: mix(0.02, -0.08, look), lean: -0.02 * look});

  return (
    <>
      <CameraRig position={cam} target={target} fov={fov} />
      <IliadWall red={0.95 * k} front={front} />
      <Trench k={k} />
      {/* line 34: cut in light among the Greek at his scale; "ILIAD," set larger, like a title */}
      <WorldLyric line={L.amazon} time={t} {...LYRIC} glow={noFlash} size={EM34} perWord={ROWS34}
        position={[0, LINE34_Y, 0.04]} until={SHOTS.iliad.t1 + 0.1} />
      {/* line 35: high on the wall, revealed by the crane */}
      <WorldLyric line={L.honest} time={t} {...LYRIC} glow={noFlash} size={EM35} perWord={ROWS35}
        position={[0, LINE35_Y, 0.04]} until={SHOTS.iliad.t1 + 0.1} />
      <SilGuy pose={pose} position={[0, 0, GUY_Z]} rotation-y={Math.PI} rim={{color: S.authRed, strength: 0.45, power: 6, dir: [0, -1]}}
        rightHand={<HeldSilHammer warmth={0.22} />} />
      <GlowBillboard color={S.authRed} intensity={0.25 * k} size={6} falloff={2} position={[0, 1.2, 0.6]} floor={1.2} />
      <WetGround size={[400, 260]} position={[0, 0, 120]} reflectivity={0.6} puddles={0.12} streak={1} color={GREYS.g1} time={t} />
      <VoidFloor />
    </>
  );
};
