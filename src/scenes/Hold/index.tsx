/**
 * HOLD (frames 4678–4992, 155.95–166.39 s) — "Then the hold music stopped, and the voice came through, /
 * the one from my pillow, and it said, 'Is that you?'"
 *
 * Shots (local frames):
 *   0–33    WIDE limbo: the Guy floats on hold in a grape Y2K screen-saver space — chrome/candy 3D notes bobbing on the
 *           beat, a giant spinning hourglass, the 3D-text screensaver "YOUR CALL IS IMPORTANT TO US", neon grid below,
 *           an "OmniStore Customer Care" window with a live EQ and "You are caller #2,147,483,647".
 *   33–55   MEDIUM: bored, half-asleep face, phone at his ear, notes drifting past.
 *   55–91   "stopped": everything FREEZES (EQ dies, ❚❚), colour drains, the notes drop away into black. Stillness.
 *   91–129  CLOSE: darkness; an aqua glow + waveform rings reach him on "voice ... came through"; his eyes open wide.
 *   129–161 TWO-SHOT: his silhouette and the glowing pillow floating in the dark.
 *   161–280 SLOW PUSH on the pillow: "...from my pillow, and it said" -> typing dots -> "Is that you?" (164.18) word by word.
 *   280–314 HIS FACE in aqua light, surprise melting into a soft smile; a first warm glint before the Final chorus.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../../lib/three/Stage';
import {ChromeText} from '../../lib/three/ChromeText';
import {SkyDome, Starfield, WireGrid, SparkleField, Glow} from '../../lib/three/fx';
import {Guy} from '../../lib/characters/Guy';
import {HeldPhone} from '../../lib/props';
import {HoldPillow} from './Pillow';
import {Hourglass3D} from '../../lib/ui';
import {beatAt, lerp} from '../../lib/time';
import {C} from '../../lib/palette';
import {NoteField, clearOfSegment, makeNotes} from './Notes';
import {HoldWindow, PauseOSD, PillowBubble, projectPx} from './HUD';
import {GUY_POS, SCENE_FROM, SHOT, T, clamp, drainAt, smooth} from './common';
import {STOP, guyWorld, staging} from './shots';
import {guyPoint} from '../../lib/characters/guy/rig';

// keep the wide shot's line of sight to the chrome slogan clear
const EYE_WIDE: [number, number, number] = [-3.4, 2.0, 5.1];
const NOTES = clearOfSegment(
  [[5.0, 4.9, -4.6], [3.05, 4.9, -6.3], [6.95, 4.9, -2.9]].reduce(
    (ns, p) => clearOfSegment(ns, EYE_WIDE, p as [number, number, number], 0.85),
    makeNotes(26, [0, 1.5, 0]),
  ),
  EYE_WIDE, [0, 1.6, 0], 0.75, // ... and to him
);

export const Hold: React.FC = () => {
  const f = useCurrentFrame();
  const songT = (SCENE_FROM + f) / 30;
  const frozen = f >= STOP;
  const live = Math.min(f, STOP) / 30;
  const beat = beatAt(frozen ? (SCENE_FROM + STOP) / 30 : songT);
  const pulse = frozen ? beat.pulse * (1 - clamp((f - STOP) / 3, 0, 1)) : beat.pulse;
  const drain = drainAt(f);
  const fall = Math.max(0, f - (STOP + 8)) / 30;

  // ---- the Guy + camera (pure staging, shared with the 2D anchoring)
  const {pose, yaw, floatY, face, pillow: pillowBob, cam} = staging(f);
  // the phone's little green screen: the last light left on in the silence
  const phonePos = guyWorld(yaw, floatY, guyPoint(pose, 'gripR'));
  /** the slow push on the pillow: he is off-screen (left) — keep stray hands out of the corner */
  const pillowOnly = f >= SHOT.push && f < SHOT.face;

  // ---- the voice
  const voiceOn = smooth((f - (T.voice - 3)) / 14);
  const talk = f < T.voice - 2 ? 0 : f < SHOT.face ? 0.55 + 0.35 * Math.max(0, Math.sin(f * 0.21)) : 0.4;
  const pillowGlow = voiceOn * (0.8 + 0.2 * Math.sin(f * 0.15));
  const aquaLight = voiceOn * (1.2 + 0.5 * Math.max(0, Math.sin(f * 0.21)));
  const dawn = smooth((f - 296) / 18); // first warm glint into the Final sunrise

  // ---- shared brightnesses
  const limbo = 1 - drain;
  const bg = drain < 0.5 ? '#2a0c5a' : '#020108';
  const bubbleAt = f >= SHOT.push && f < SHOT.face ? projectPx(cam, [pillowBob[0] - 0.12, pillowBob[1] + 0.2, pillowBob[2]]) : null;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Stage background={bg} env="night" exposure={lerp(1, 0.85, drain)}
        bloom={{strength: lerp(0.6, 0.75, drain), radius: 0.5, threshold: 0.9}}
        lens={{vignette: lerp(0.35, 0.6, drain), grain: lerp(0.035, 0.05, drain), aberration: 0.0018, saturation: lerp(1.12, 0.25, drain) + 0.9 * voiceOn * drain}}>
        <CameraRig position={cam.position} target={cam.target} fov={cam.fov} roll={cam.roll ?? 0} />
        <SkyDome preset="hold" brightness={lerp(1, 0.02, drain)} stripes={6} />
        {limbo > 0.01 ? (
          <>
            <Starfield shell={60} count={900} size={0.16} time={live} intensity={1.4 * limbo} />
            <WireGrid position={[0, -2.6, 0]} color={C.bubblegum} fill="#14053a" glow={1.6 * limbo} offset={live * 0.6} fadeNear={3} fadeFar={30} />
            <group position={[5.0, 4.9, -4.6]} rotation={[0.1 * Math.sin(live * 0.7), -0.72 + 0.3 * Math.sin(live * 0.45), 0.05 * Math.sin(live * 0.5)]}>
              <ChromeText text={'YOUR CALL IS\nIMPORTANT TO US'} font="TrebuchetBoldItalic" size={0.62} material="iridescent" anchor="center"
                brightness={limbo} iriPhase={live * 0.3} />
            </group>
            <NoteField notes={NOTES} live={live} pulse={pulse} fall={fall} brightness={limbo} />
            <group position={[3.3, 2.3 - 0.5 * 7 * Math.max(0, fall - 0.1) ** 2, -0.9]} rotation={[0, -0.6, 0.15 * Math.sin(live)]}>
              <Hourglass3D size={1.5} rot={(live * 70) % 360} sand={(live * 0.18) % 1} />
            </group>
          </>
        ) : null}

        {/* lights: limbo grape fill fades; a cold rim stays; the aqua voice light grows */}
        <hemisphereLight args={['#c9b6ff', '#3a1a7a', 1.1 * limbo + 0.06 + 0.32 * voiceOn * drain]} />
        <directionalLight position={[-3, 4, 4]} color="#ffe6f4" intensity={1.6 * limbo + 0.02} />
        <directionalLight position={[2, 3, -4]} color="#8a6bff" intensity={0.9 * limbo + 0.35 * drain} />
        {/* the pillow's voice light: from the pillow's side, so his face gets an aqua key + a soft terminator */}
        <pointLight position={[lerp(pillowBob[0], face[0], 0.3), lerp(pillowBob[1], face[1], 0.3) + 0.15, lerp(pillowBob[2], face[2], 0.3) + 0.45]} color={C.aqua}
          intensity={aquaLight * 2.4} distance={4.5} decay={1.3} />
        <pointLight position={[face[0] + 0.6, face[1] + 0.8, face[2] + 1.2]} color="#ffd9a8" intensity={dawn * 1.4} distance={3} decay={1.5} />

        <group position={[GUY_POS[0], GUY_POS[1] + floatY, GUY_POS[2]]} rotation={[0, yaw, 0]} visible={!pillowOnly}>
          <Guy pose={pose} shadow={false} rightHand={<HeldPhone open={1} screenLines={['ON HOLD', '00:47:12', 'Caller #2.1B']} />} />
        </group>

        {drain > 0.05 && !pillowOnly ? <Glow position={phonePos} size={0.2} color="#9dff5a" intensity={0.75 * drain * (1 - voiceOn)} /> : null}
        {voiceOn > 0.01 ? (
          <group position={pillowBob}>
            <HoldPillow on={pillowGlow} talk={talk * voiceOn} frame={f} scale={1.15}
              rotation={[0.12 + 0.05 * Math.sin(f / 23), -0.95, 0.07 * Math.sin(f / 30)]} />
            <Glow size={1.6 + 0.3 * talk} color={C.aqua} intensity={0.3 * voiceOn} />
            {/* voice rings rippling out on "voice ... came through" */}
            {[0, 1, 2, 3].map((i) => {
              const born = T.voice + i * 9;
              const a = (f - born) / 34;
              if (a < 0 || a > 1 || f > SHOT.push) return null;
              return (
                <mesh key={i} rotation={[0, -0.75, 0]} scale={0.3 + a * 3.2}>
                  <torusGeometry args={[0.5, 0.012, 6, 64]} />
                  <meshBasicMaterial color={C.aqua} transparent opacity={(1 - a) * 0.8} toneMapped={false} depthWrite={false} />
                </mesh>
              );
            })}
            <SparkleField count={12} seed={77} area={[1.2, 0.8, 0.6]} time={f / 30} size={0.07} intensity={1.3 * voiceOn} />
          </group>
        ) : null}
      </Stage>
      <HoldWindow f={f} opacity={1 - smooth((f - (STOP + 10)) / 18)} />
      <PauseOSD f={f} from={STOP} fadeFrom={STOP + 14} fadeLen={16} />
      {bubbleAt ? <PillowBubble f={f} x={bubbleAt[0]} y={bubbleAt[1]} /> : null}
      {/* soft warm wash creeping in before the Final chorus */}
      {dawn > 0 ? <AbsoluteFill style={{background: `radial-gradient(80% 70% at 70% 30%, rgba(255,214,150,${0.22 * dawn}) 0%, rgba(255,140,90,0) 70%)`}} /> : null}
    </AbsoluteFill>
  );
};
