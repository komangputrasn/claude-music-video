/**
 * <BedroomWindow time moon windowOpen rain copLights frame curtains outside /> — the back-wall window, in ROOM space
 * (no transform needed inside <Bedroom>). Pieces:
 *   - white frame + inner sill, two casements that swing OUTWARD with windowOpen (0..1)
 *   - glass shader: tint, glossy reflection, procedural rain (static beads, sliding drops, streaks outside), cop wash
 *   - outside view (backdropTexture(time)) 0.55 m behind the wall + glowing moon/sun disc + cop-car flash blobs
 *   - grape curtains on a chrome rod (billow into the room when the window is open)
 *   - volumetric light shaft + window-pane light pool on the floor along SUN_DIR[time] (scaled by `moon`)
 * copFlash(frame) -> {red, blue} exported so the room lights flash in sync.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {toonMat} from '../../characters/toon';
import {noise1} from '../../time';
import {TBox, geo, chromeMat, useGlowMat} from './ink';
import {backdropTexture, glowTexture, windowPoolTexture, TimeOfDay} from './textures';
import {ROOM, WIN, SUN_DIR, V3} from './layout';

/** Police light-bar pattern (double flashes), deterministic in frame. */
export const copFlash = (frame: number) => {
  const p = ((frame % 16) + 16) % 16;
  const red = p < 2 || (p >= 3 && p < 5) ? 1 : 0;
  const blue = (p >= 8 && p < 10) || (p >= 11 && p < 13) ? 1 : 0;
  return {red, blue};
};

export const LIGHT_COLORS: Record<TimeOfDay, {shaft: string; pool: string; disc: string}> = {
  night: {shaft: '#7fa6ff', pool: '#a9c4ff', disc: '#eef4ff'},
  dawn: {shaft: '#ff9a6a', pool: '#ffb488', disc: '#fff0b0'},
  day: {shaft: '#fff1c8', pool: '#fff4da', disc: '#ffffff'},
};

const glassVert = /* glsl */ `
  varying vec2 vUv; varying vec2 vP;
  void main(){ vUv = uv; vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const glassFrag = /* glsl */ `
  uniform float uTime, uRain; uniform vec3 uTint, uCop, uSky;
  varying vec2 vUv; varying vec2 vP;
  float hash(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
  void main(){
    // base glass: faint tint + diagonal gloss bands
    float gloss = smoothstep(0.03, 0.0, abs(vUv.x + vUv.y * 0.6 - 0.55)) * 0.5 + smoothstep(0.015, 0.0, abs(vUv.x + vUv.y * 0.6 - 0.72)) * 0.35;
    vec3 col = uTint * 0.2 + vec3(gloss) * 0.5;
    float a = 0.10 + gloss * 0.35;
    if (uRain > 0.001) {
      // static beads
      vec2 g = vP * 34.0;
      vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      float h = hash(id);
      vec2 c = (vec2(hash(id + 1.7), hash(id + 9.1)) - 0.5) * 0.5;
      float r = 0.12 + 0.2 * hash(id + 4.4);
      float d = length((f - c) * vec2(1.0, 0.85));
      float bead = step(0.35, h) * smoothstep(r, r * 0.6, d);
      float rim = bead * smoothstep(r * 0.2, r * 0.9, d) * step(0.0, -(f.y - c.y));
      // sliding drops in columns with trails
      float colW = 14.0;
      float cx = floor(vP.x * colW);
      float ch = hash(vec2(cx, 3.3));
      float fx = fract(vP.x * colW) - 0.5 - (ch - 0.5) * 0.4;
      float speed = 0.25 + ch * 0.5;
      float y = fract(vP.y * 0.8 + uTime * speed + ch * 7.0);
      float head = smoothstep(0.035, 0.0, length(vec2(fx * 0.12, (y - 0.06) * 0.6))) * step(0.45, ch);
      float trail = smoothstep(0.06, 0.0, abs(fx)) * smoothstep(0.06, 0.4, y) * (1.0 - y) * step(0.45, ch) * 0.6;
      // fast streaks of rain falling outside
      float sc = floor(vP.x * 90.0 + vP.y * 14.0);
      float sh = hash(vec2(sc, 1.1));
      float sy = fract(vP.y * 0.9 + uTime * (2.6 + sh) + sh * 13.0);
      float streak = smoothstep(0.12, 0.0, sy) * step(0.55, sh) * 0.45;
      float wet = clamp(bead + head + trail, 0.0, 1.0);
      col = mix(col, uSky * 0.6 + vec3(0.25), wet * 0.6) + vec3(1.0) * (rim * 0.7 + head * 0.5) + uSky * streak;
      a = max(a, wet * 0.75 * uRain);
      a = max(a, streak * uRain);
      col += uCop * wet * 1.5;
    }
    col += uCop * 0.25;
    a = max(a, length(uCop) * 0.2);
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const shaftVert = /* glsl */ `
  attribute float aV;
  varying float vV; varying vec3 vN; varying vec3 vView;
  void main(){
    vV = aV;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const shaftFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uI;
  varying float vV; varying vec3 vN; varying vec3 vView;
  void main(){
    float v = clamp(vV, 0.0, 1.0);
    float fres = pow(clamp(abs(dot(normalize(vN), normalize(vView))), 0.0, 1.0), 1.5);
    float a = pow(1.0 - v, 1.2) * (0.35 + 0.65 * smoothstep(0.0, 0.25, v)) * fres * uI;
    gl_FragColor = vec4(uColor * a, 1.0);
  }`;

const floorPt = (x: number, y: number, d: V3, floorY = 0.022): V3 => {
  const t = (y - floorY) / -d[1];
  return [x + d[0] * t, floorY, ROOM.zMin + d[2] * t];
};

const buildLight = (time: TimeOfDay) => {
  const d = SUN_DIR[time];
  const x0 = WIN.x - WIN.width / 2 + 0.05, x1 = WIN.x + WIN.width / 2 - 0.05, y0 = WIN.sill + 0.04, y1 = WIN.top - 0.04;
  const zW = ROOM.zMin + 0.01;
  const W: V3[] = [[x0, y0, zW], [x1, y0, zW], [x1, y1, zW], [x0, y1, zW]];
  const F: V3[] = [floorPt(x0, y0, d), floorPt(x1, y0, d), floorPt(x1, y1, d), floorPt(x0, y1, d)];
  // pool
  const pool = new THREE.BufferGeometry();
  pool.setAttribute('position', new THREE.Float32BufferAttribute(F.flat(), 3));
  pool.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  pool.setIndex([0, 2, 1, 0, 3, 2]);
  pool.computeVertexNormals();
  // shaft prism (4 sides), non-indexed so each face has its own normal
  const pos: number[] = [], vv: number[] = [];
  const quad = (a: V3, b: V3, c: V3, e: V3, va: number, vb: number, vc: number, ve: number) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...e);
    vv.push(va, vb, vc, va, vc, ve);
  };
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quad(W[i], W[j], F[j], F[i], 0, 0, 1, 1);
  }
  const shaft = new THREE.BufferGeometry();
  shaft.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  shaft.setAttribute('aV', new THREE.Float32BufferAttribute(vv, 1));
  shaft.computeVertexNormals();
  return {pool, shaft};
};

/** Pleated curtain panel geometry (top edge at y=0, hangs down -Y; width along X). */
const curtainGeo = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    const w = 0.44, h = 1.42;
    g = new THREE.PlaneGeometry(w, h, 24, 6);
    g.translate(0, -h / 2, 0);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) + w / 2) / w;
      p.setZ(i, 0.03 * Math.sin(u * Math.PI * 2 * 4.5) + 0.01 * Math.sin(u * Math.PI * 2 * 9.0));
    }
    g.computeVertexNormals();
    return g;
  };
})();

export type BedroomWindowProps = {
  time: TimeOfDay;
  moon: number;
  windowOpen: number;
  rain: boolean;
  copLights: number;
  frame: number;
  curtains?: boolean;
  outside?: boolean;
  /** curtains drawn: 0 open (default) .. 1 closed */
  curtainsClosed?: number;
};

export const BedroomWindow: React.FC<BedroomWindowProps> = ({
  time, moon, windowOpen, rain, copLights, frame, curtains = true, outside = true, curtainsClosed = 0,
}) => {
  const lc = LIGHT_COLORS[time];
  const {pool, shaft} = useMemo(() => buildLight(time), [time]);
  useLayoutEffect(() => () => { pool.dispose(); shaft.dispose(); }, [pool, shaft]);
  const cop = copFlash(frame);
  const ci = Math.max(0, Math.min(1, copLights));
  const copCol = new THREE.Color(0, 0, 0)
    .add(new THREE.Color('#ff1a2a').multiplyScalar(cop.red * ci))
    .add(new THREE.Color('#2a5bff').multiplyScalar(cop.blue * ci));

  const glass = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uTime: {value: 0}, uRain: {value: 0}, uTint: {value: new THREE.Color()}, uCop: {value: new THREE.Color()}, uSky: {value: new THREE.Color()}},
        vertexShader: glassVert,
        fragmentShader: glassFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const shaftMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uColor: {value: new THREE.Color()}, uI: {value: 1}},
        vertexShader: shaftVert,
        fragmentShader: shaftFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const poolMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: windowPoolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
    [],
  );
  const backMat = useMemo(() => new THREE.MeshBasicMaterial({map: backdropTexture(time)}), [time]);
  const flashMat = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
    [],
  );
  const flashMat2 = useMemo(() => flashMat.clone(), [flashMat]);
  const discHalo = useMemo(
    () => new THREE.MeshBasicMaterial({map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
    [],
  );
  const mo = Math.max(0, moon);
  const discMat = useGlowMat(lc.disc, time === 'day' ? 0 : 1.6 + 1.2 * mo);
  useLayoutEffect(() => {
    glass.uniforms.uTime.value = frame / 30;
    glass.uniforms.uRain.value = rain ? 1 : 0;
    (glass.uniforms.uTint.value as THREE.Color).set(time === 'night' ? '#5f7cff' : time === 'dawn' ? '#ffb0a0' : '#cfe8ff');
    (glass.uniforms.uSky.value as THREE.Color).set(time === 'night' ? '#4a64c8' : time === 'dawn' ? '#ff9a8a' : '#bfe0ff');
    (glass.uniforms.uCop.value as THREE.Color).copy(copCol);
    (shaftMat.uniforms.uColor.value as THREE.Color).set(lc.shaft);
    shaftMat.uniforms.uI.value = (time === 'day' ? 0.22 : 0.3) * mo * (1 - 0.6 * curtainsClosed);
    poolMat.color.set(lc.pool).multiplyScalar((time === 'day' ? 0.55 : 0.75) * mo * (1 - 0.7 * curtainsClosed));
    backMat.color.setScalar((time === 'night' ? 0.85 + 0.25 * mo : 1.0) * (rain ? 0.6 : 1));
    flashMat.color.set('#ff1a2a').multiplyScalar(cop.red * ci * 2.2);
    flashMat2.color.set('#2a5bff').multiplyScalar(cop.blue * ci * 2.6);
    discHalo.color.set(lc.disc).multiplyScalar(time === 'day' ? 0 : 0.5 * mo);
  });
  useLayoutEffect(() => () => { glass.dispose(); shaftMat.dispose(); poolMat.dispose(); flashMat.dispose(); flashMat2.dispose(); discHalo.dispose(); }, [glass, shaftMat, poolMat, flashMat, flashMat2, discHalo]);
  useLayoutEffect(() => () => backMat.dispose(), [backMat]);

  const z = ROOM.zMin;
  const hw = WIN.width / 2;
  const cy = (WIN.sill + WIN.top) / 2;
  const hh = WIN.top - WIN.sill;
  const frameC = '#f4f5fa';
  const open = Math.max(0, Math.min(1, windowOpen));
  const swing = open * 1.25;
  const paneW = hw - 0.03;
  const billow = open * (0.22 + 0.12 * noise1(frame * 0.06, 21)) + (rain ? 0 : 0);
  const sway = (s: number) => open * 0.08 * noise1(frame * 0.05 + s * 3, 22);

  // hinge on the outer edge; local pane spans from hinge toward the centre
  const casement = (side: -1 | 1) => (
    <group key={side} position={[WIN.x + side * hw - side * 0.02, cy, z - 0.07]} rotation={[0, side * -swing, 0]}>
      <group position={[-side * paneW / 2, 0, 0]}>
        <TBox size={[paneW, 0.045, 0.045]} color={frameC} position={[0, hh / 2 - 0.045, 0]} ink={0.005} />
        <TBox size={[paneW, 0.045, 0.045]} color={frameC} position={[0, -hh / 2 + 0.045, 0]} ink={0.005} />
        <TBox size={[0.045, hh - 0.07, 0.045]} color={frameC} position={[-paneW / 2 + 0.0225, 0, 0]} ink={0.005} />
        <TBox size={[0.045, hh - 0.07, 0.045]} color={frameC} position={[paneW / 2 - 0.0225, 0, 0]} ink={0.005} />
        <TBox size={[paneW - 0.06, 0.035, 0.035]} color={frameC} position={[0, 0.08, 0]} ink={0.004} />
        <mesh geometry={geo.plane(paneW - 0.05, hh - 0.1)} material={glass} />
      </group>
    </group>
  );

  return (
    <group>
      {/* frame / reveal */}
      <TBox size={[WIN.width + 0.14, 0.07, 0.07]} color={frameC} position={[WIN.x, WIN.top + 0.035, z + 0.02]} ink={0.006} />
      <TBox size={[0.07, hh + 0.07, 0.07]} color={frameC} position={[WIN.x - hw - 0.035, cy, z + 0.02]} ink={0.006} />
      <TBox size={[0.07, hh + 0.07, 0.07]} color={frameC} position={[WIN.x + hw + 0.035, cy, z + 0.02]} ink={0.006} />
      <TBox size={[WIN.width + 0.24, 0.04, 0.2]} r={0.01} color={frameC} position={[WIN.x, WIN.sill - 0.02, z + 0.04]} ink={0.006} />
      {/* reveal (wall thickness) */}
      <mesh geometry={geo.box(WIN.width, 0.01, ROOM.wallT)} material={toonMat('#d8dcef')} position={[WIN.x, WIN.top - 0.005, z - ROOM.wallT / 2]} />
      <mesh geometry={geo.box(0.01, hh, ROOM.wallT)} material={toonMat('#c8cce3')} position={[WIN.x - hw + 0.005, cy, z - ROOM.wallT / 2]} />
      <mesh geometry={geo.box(0.01, hh, ROOM.wallT)} material={toonMat('#c8cce3')} position={[WIN.x + hw - 0.005, cy, z - ROOM.wallT / 2]} />
      <mesh geometry={geo.box(WIN.width, 0.01, ROOM.wallT)} material={toonMat('#e4e7f5')} position={[WIN.x, WIN.sill + 0.005, z - ROOM.wallT / 2]} />
      {casement(-1)}
      {casement(1)}
      {/* outside */}
      {outside ? (
        <group position={[WIN.x, cy, z - ROOM.wallT - 0.55]}>
          <mesh geometry={geo.plane(2.6, 2.08)} material={backMat} />
          {time !== 'day' && !rain ? (
            <group position={time === 'night' ? [0.32, 0.36, 0.02] : [-0.3, -0.38, 0.02]}>
              <mesh geometry={geo.circle(time === 'night' ? 0.1 : 0.16, 24)} material={discMat} />
              <mesh geometry={geo.plane(0.9, 0.9)} material={discHalo} position={[0, 0, 0.01]} />
            </group>
          ) : null}
          <mesh geometry={geo.plane(1.6, 1.4)} material={flashMat} position={[-0.55, -0.6, 0.05]} />
          <mesh geometry={geo.plane(1.6, 1.4)} material={flashMat2} position={[0.5, -0.55, 0.06]} />
        </group>
      ) : null}
      {/* light shaft + pool */}
      <mesh geometry={shaft} material={shaftMat} />
      <mesh geometry={pool} material={poolMat} />
      {/* curtains */}
      {curtains ? (
        <group>
          <mesh geometry={geo.cyl(0.014, 0.014, WIN.width + 0.7, 8)} material={chromeMat()} rotation={[0, 0, Math.PI / 2]} position={[WIN.x, WIN.top + 0.16, z + 0.12]} />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={geo.sphere(0.028, 10, 8)} material={chromeMat()} position={[WIN.x + s * (WIN.width / 2 + 0.35), WIN.top + 0.16, z + 0.12]} />
          ))}
          {[-1, 1].map((s) => {
            const closed = Math.max(0, Math.min(1, curtainsClosed));
            const x = WIN.x + s * (hw + 0.12 - closed * (hw - 0.1));
            const sc = 1 + closed * 0.35;
            return (
              <group key={s} position={[x, WIN.top + 0.15, z + 0.12]} rotation={[-billow, sway(s), s * open * 0.04]}>
                <mesh geometry={curtainGeo()} material={toonMat('#7f52e6')} scale={[sc, 1, 1]} />
                <mesh geometry={curtainGeo()} material={toonMat('#5a34b8')} scale={[sc, 1, 1]} position={[0, 0, -0.004]} rotation={[0, Math.PI, 0]} />
              </group>
            );
          })}
        </group>
      ) : null}
    </group>
  );
};
