/**
 * Shot 3 — CLIMB (scene-local 146–275, song 114.82–119.17). "so I climbed through my window, and the cops came too."
 * Inside the cell, symmetrical, looking at the window: the blinds are pushed aside and the city's screen glow fills the
 * opening. He climbs in as a black shape against it (guyClimb), lands crouched under the sill. On "cops" two drones
 * hang outside in the rain and their red searchlight cones come in through the window and sweep the floor (a red band
 * also runs through the window light). He is drawn after the cones (<SilOver>), so they read as passing behind him and
 * he stays a clean black cut-out; the bone glow under the sill turns into their red spill (no pink). He is clipped at
 * the sill while still outside (guyClimb's knee passes through the wall). The sung line hangs in the haze in two blocks that
 * flank the window — "SO I CLIMBED / THROUGH MY / WINDOW," left, "AND THE COPS / CAME TOO." right.
 */
import React from 'react';
import {SilStage, CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {S, GREYS, cameraFovForVisible} from '../../lib/palette';
import {Backlight, LightPool, LightShaft, SilRain} from '../../lib/atmos';
import {CellRoom, CELL_SPOTS} from '../../lib/sets';
import {HungSilHammer} from '../../lib/props';
import {guyClimb, mergePose} from '../../../lib/characters/Guy';
import {bassAt, clamp01, lerp} from '../../../lib/time';
import {LyricBlock} from './LyricBlock';
import {SilOver} from './SilOver';
import {TCUT, W} from './timing';

type V3 = [number, number, number];
const s01 = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
// the cones' hull is flattened onto `ground`: keep it just above the cell floor (coplanar = z-fight = black footprint)
const FLOOR = 0.02;
const R0 = 0.06;
const R1 = 0.45;
const ease = (x: number) => x * x * (3 - 2 * x);

export const ShotClimb: React.FC<{t: number; abs: number}> = ({t, abs}) => {
  const bass = bassAt(abs);
  const u = s01(t, TCUT.climb, TCUT.waiting);
  // climb: hands on the sill at the cut, knee up on "climbed", through on "window", crouched inside by "cops"
  const p = ease(s01(t, TCUT.climb + 0.08, W.cops - 0.1));
  // after landing he stays down, head turning up toward the window as the lights sweep
  const crouch = s01(t, W.cops, W.cops + 0.8);
  const pose = mergePose(guyClimb(p), {headPitch: lerp(-0.3, -0.55, crouch), headYaw: 0.25 * crouch});
  // guyClimb's knee rises THROUGH the wall under the sill (p ≈ 0.12–0.35: a foot floats out of the inner face). Clip
  // him at the sill while he is outside, then lower the plane as the leg legitimately comes over (p 0.34 → 0.40)
  const sill = CELL_SPOTS.windowSill[1];
  const clipY = p < 0.34 ? sill : p < 0.4 ? lerp(sill, -0.05, (p - 0.34) / 0.06) : null;

  // the drones: on "cops" they arrive outside; the cones sweep across the room (deterministic, slow)
  const on = s01(t, W.cops - 0.05, W.cops + 0.35);
  const sw = t - W.cops;
  const drones = [-1, 1].map((s) => {
    // two drones hover outside at the top of the window's view (their lamps glow in the rain); the cones come in
    // through the middle of the opening and criss-cross the floor (he is a black cut-out wherever they pass him)
    // (the beam centre must cross the window plane within |x| ≲ 0.5 or its edge clips the jambs)
    // (lamp at y 4.4: the beam centre crosses the wall at y 1.5–1.75 with r ≈ 0.3, clear of the sill at 1.0 and the
    //  jambs at |x| 0.85 — lower lamps clip the sill and the dropped rays leave a black bite in the window corner)
    const src: V3 = [s * 0.35 + 0.1 * Math.sin(sw * 0.9 + s), 4.4 + 0.04 * Math.sin(sw * 2.1 + s), 9.0];
    const tx = s * lerp(0.45, -0.85, 0.5 - 0.5 * Math.cos(Math.max(0, sw) * 0.95 + (s > 0 ? 0.8 : 0)));
    const tz = lerp(-1.25, -2.1, 0.5 + 0.5 * Math.sin(sw * 0.6 + s));
    return {src, to: [tx, FLOOR, tz] as V3};
  });
  // the red band through the window light, back and forth while the cones are on
  const scan = on > 0 ? 0.5 + 0.48 * Math.sin(sw * 1.3 - 1.2) : null;

  const camZ = lerp(-4.7, -4.35, u);
  return (
    <SilStage fog={{color: GREYS.g2, near: 14, far: 80}}>
      <CameraRig position={[0, 1.45, camZ]} target={[0, 1.5, 2.25]} fov={cameraFovForVisible(23)} />
      <CellRoom time={t} hideWalls={['back']} hide={['bed', 'pillow', 'blanket', 'printer', 'page']} blinds={{angle: 0.7, traverse: 0.92}}
        windowLight={{intensity: 0.9, dir: [0, -0.2, -1], scan, scanIntensity: 1.2 * on}}
        outside={{intensity: 0.85 + 0.08 * bass}} doorLeak={0.4}>
        {/* drawn after the red cones (they land on the floor in FRONT of him and would tint his legs red), and clipped
            at the sill while he is still outside (guyClimb's rising knee pokes through the wall under the sill) */}
        <SilOver clipBelow={clipY}>
          <SilGuy position={CELL_SPOTS.climbRoot} rotation-y={CELL_SPOTS.climbRotY} pose={pose} />
        </SilOver>
        {/* grandpa's hammer is always on its pegs in the cell (warmth 0.3: the only gold before Swing) */}
        <HungSilHammer position={CELL_SPOTS.hungHammer} rotation-y={CELL_SPOTS.hungHammerRotY} head="left" pegs={false} warmth={0.3} light={[0, 1]} />
      </CellRoom>
      {/* a low glow on the wall under the sill (window light bouncing off the wet sill and floor), so his legs stay a
          black shape as he drops in and lands — otherwise black on the dark wall until the cones arrive. When the cones
          come on it turns into their red spill: red added over a bone glow reads salmon/pink, not authRed */}
      <Backlight position={[0, 0.55, 2.238]} rotation-y={Math.PI} size={[2.6, 1.3]} shape="radial" softness={0.9} noise={0.1}
        intensity={(0.42 + 0.04 * bass) * (1 - on)} opacity={on < 1 ? 1 : 0} time={t} />
      <Backlight position={[0, 0.55, 2.236]} rotation-y={Math.PI} size={[2.6, 1.3]} shape="radial" softness={0.9} noise={0.1}
        color={S.authRed} intensity={0.4 * on} opacity={on > 0 ? 1 : 0} time={t} />
      {/* rain outside the window */}
      <SilRain time={t} position={[0, -2, 8]} area={[10, 9, 9]} count={2600} length={0.7} width={0.008} wind={[-1.2, 0]} intensity={0.5} splashes={0} />
      {on > 0
        ? drones.map((d, k) => (
            <group key={k}>
              {/* one volume per beam, drone → floor. It is drawn from its hull's back faces, so the beam must clear the
                  sill: shallow beams through the middle of the opening (rays whose back face sits behind the wall drop) */}
              <LightShaft from={d.src} to={d.to} radiusStart={R0} radiusEnd={R1} color={S.authRed}
                intensity={1.0 * on} source={0.9 * on} time={t} dust={60} seed={k + 11} ground={FLOOR} groundFade={0.22} />
              <LightPool position={[d.to[0], 0.005, d.to[2]]} radius={R1} color={S.authRed} intensity={0.85 * on} haze={0} />
            </group>
          ))
        : null}

      {/* the sung line, in the haze of the room, flanking the window */}
      {/* (the camera looks toward +Z: the text is turned to face it, so screen-left is room +X) */}
      <LyricBlock line={25} time={t} rows={[[0, 1, 2], [3, 4], [5]]} align="right" anchor="center" size={0.135}
        mode="light" intensity={1.0} position={[0.56, 1.86, -0.55]} rotation-y={Math.PI} />
      <LyricBlock line={25} time={t} rows={[[6, 7, 8], [9, 10]]} align="left" anchor="center" size={0.135}
        mode="light" intensity={1.0} position={[-0.56, 1.86, -0.55]} rotation-y={Math.PI} />
    </SilStage>
  );
};
