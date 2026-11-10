// V1Bedroom shots A–D (see NOTES.md). Every shot is a pure function of song time t (seconds).
import React from 'react';
import {CameraRig} from '../../lib/SilStage';
import {SilGuy} from '../../lib/SilCast';
import {WorldLyric} from '../../lib/WorldLyric';
import {S, SFONTS, cameraFovForVisible} from '../../lib/palette';
import {CellRoom, CELL_SPOTS, cellBedTilt} from '../../lib/sets';
import {PillowIris} from '../../lib/props';
import {FloatingPrice, Stencil} from '../../lib/tenure';
import {Backlight, Motes} from '../../lib/atmos';
import {lerp, bassAt} from '../../../lib/time';
import {guySleepyWake, guySitOn, guyIdle, mergePose} from '../../../lib/characters/Guy';
import {T_CUT, W, lin, sm, smooth, scanAt, errPulse} from './timing';
import {BedClock, PrinterDot, Unoccluded, WindowSpill} from './parts';

type V3 = [number, number, number];
/** A/B: slats nearly edge-on (thin bars of light on the back wall); C/D: tilted a little more shut */
const BLINDS = {angle: 0.92};
const BLINDS_CD = {angle: 0.86};
/** the city glow through the blinds: slightly downward so the stripes sit low on the back wall (dark band above) */
const DIR_BACK: V3 = [0, -0.12, -1];
/** C/D: the light swings toward the printer wall (the city's screens re-aim): stripes land on the right wall */
const DIR_RIGHT: V3 = [0.5, -0.12, -1];
/** B: the same city glow nudged a little to the right so the stripe field also covers him on the bed's right edge */
const DIR_B: V3 = [0.05, -0.12, -1];
const CLOCK_POS: V3 = [-1.06, 1.0, -2.25];
/** B/C/D self-lit concrete (CellRoom ambient; WindowSpill must get the same value) */
const AMB = 0.045;
const FACE_X = -Math.PI / 2; // rotation-y that turns +Z-facing text toward -X (the camera on the left)
/**
 * C/D printer slit level (CellRoom printerGlow). The lib's 1 draws the slit core at 1.5 x authRed, which tone-maps
 * coral; 0.6 keeps the core red. The error state breathes BELOW it (errPulse), and the status dot peaks at DOT_ERR.
 */
const SLIT = 0.6;
const DOT_ERR = 0.9;
/**
 * C/D: the lit air between him and the printer wall. He is wider than a stripe gap, so his outline kept falling into
 * the black gaps between stripes; this soft, dim column of haze glow behind him (window colour, breathing with it)
 * lifts those gaps just enough for the pure-black figure, legs included, to read. Room space, facing the camera (-X).
 */
const HazeBehind: React.FC<{t: number; color?: string; intensity?: number}> = ({t, color = S.bone, intensity = 1}) => (
  <Backlight position={[1.62, 1.0, -0.23]} rotation-y={FACE_X} size={[1.6, 2.8]} shape="vertical" softness={1} noise={0.2}
    time={t} color={color} intensity={0.04 * intensity} />
);
/** the city's screens breathe with the bass: a subtle (≤ 10 %) lift of the window light, never a flash */
const cityPulse = (t: number) => 1 + 0.1 * bassAt(Math.round(t * 30));

// ------------------------------------------------------------------------------------------------ A
/** 12.37–16.77 "The bed sat me up at a quarter past three," — through the blinds from the deck; the bed lifts him. */
export const ShotA: React.FC<{t: number}> = ({t}) => {
  const u = lin(t, T_CUT.A, T_CUT.B);
  const camZ = lerp(11.0, 8.4, smooth(u * 0.8 + 0.2 * u * u));
  const p = t < W.sat ? 0.08 : t < W.up ? 0.15 + 0.35 * lin(t, W.sat, W.up) : 0.5 + 0.04 * lin(t, W.up, T_CUT.B);
  const bedActive = sm(t, W.sat - 0.2, W.sat) * (1 - 0.7 * sm(t, W.up + 0.2, W.up + 1.2));
  return (
    <>
      <CameraRig position={[0, 1.72, camZ]} target={[0, 1.72, -2.25]} fov={cameraFovForVisible(14)} />
      <CellRoom time={t} bedTilt={cellBedTilt(p)} bedActive={bedActive} blinds={BLINDS} outside={{intensity: 0.6}}
        windowLight={{dir: DIR_BACK, scan: scanAt(t), intensity: cityPulse(t)}}>
        <SilGuy position={CELL_SPOTS.guyInBed} pose={guySleepyWake(p)} />
        {/* on the back wall, seen through the window; the slats must not blank whole stems, so they don't occlude it */}
        <Unoccluded>
          <WorldLyric line={0} time={t} size={0.17} weight={600} maxWidth={2.6} position={[0, 2.3, -2.236]} until={T_CUT.B} />
        </Unoccluded>
        <Unoccluded>
          <BedClock position={CLOCK_POS} scale={0.8} glow={1 + 0.4 * sm(t, W.quarter - 0.1, W.quarter + 0.1)} />
        </Unoccluded>
      </CellRoom>
    </>
  );
};

// ------------------------------------------------------------------------------------------------ B
/** 16.77–21.20 "and a voice in the pillow said, 'Sleep has a fee.'" — frontal at the bed: the iris opens in the pillow. */
export const ShotB: React.FC<{t: number}> = ({t}) => {
  const u = lin(t, T_CUT.B, T_CUT.C);
  // framed low enough that his whole seated body (bed edge to hood) sits against the stripes, the words above
  const camZ = lerp(7.3, 6.8, smooth(u));
  const camY = lerp(1.6, 1.48, smooth(u));
  const open = sm(t, W.voice - 0.15, W.said + 0.25);
  const talk = t >= W.said - 0.05 && t < W.fee + 0.45 ? 0.85 : 0;
  const look = sm(t, W.pillow - 0.25, W.pillow + 0.7);
  const br = Math.sin(t * Math.PI * 2 * 0.22);
  // hunched over his knees, head down; on "pillow" the head lifts and turns back toward the voice (camera side)
  const pose = mergePose(guySitOn(0.52), {
    torsoBend: 0.44 - 0.08 * look + 0.015 * br,
    headPitch: 0.3 - 0.28 * look,
    headYaw: -0.7 * look,
    headTilt: 0.08 * look,
    shrug: 0.18 + 0.03 * br,
    armL: {shoulderX: 0.55, shoulderZ: 0.12, shoulderY: 0.3, elbow: 1.05, twist: 0.3, grip: 0.3},
    armR: {shoulderX: 0.55, shoulderZ: 0.12, shoulderY: 0.3, elbow: 1.05, twist: 0.3, grip: 0.3},
  });
  const fee = sm(t, W.sleep - 0.05, W.sleep + 0.1);
  const price = sm(t, W.fee - 0.05, W.fee + 0.1);
  const wl = {dir: DIR_B, scan: scanAt(t), intensity: cityPulse(t)};
  return (
    <>
      <CameraRig position={[0, camY, camZ]} target={[0, 1.36, -1.6]} fov={cameraFovForVisible(15.2)} />
      <CellRoom time={t} bedTilt={1} bedActive={0.22} pillow={false} blinds={BLINDS} ambient={AMB} windowLight={wl}
        hideWalls={['front']} hide={['facade', 'outside']} doorIris={false}
        pillowSlot={<PillowIris position={[0, -0.075, 0]} scale={0.92} open={open} talk={talk} time={t} glow={0.7} />}>
        {/* the stripes run on down the back wall beside the bed, so his shins stand against them */}
        <WindowSpill wall="back" floor={false} blinds={BLINDS} windowLight={wl} ambient={AMB} />
        <SilGuy position={[0.42, 0, -0.78]} rotation-y={Math.PI / 2} pose={pose} />
        <Motes count={260} area={[1.6, 1.3, 0.6]} position={[0, 0.55, -1.95]} time={t} size={0.006} intensity={0.55} drift={[0.01, 0.025, 0]} seed={3} />
        {/* match cut: the last 0.2 s of line 0 ("…three,") stays on the same wall, seen now from inside, until "and" */}
        <WorldLyric line={0} time={t} size={0.17} weight={600} maxWidth={2.6} position={[0, 2.3, -2.236]} />
        <WorldLyric line={1} time={t} size={0.135} maxWidth={3.35} position={[0, 2.22, -2.236]} until={T_CUT.C} />
        {fee > 0 ? (
          <>
            <FloatingPrice text="SLEEP" font="mono" size={0.07} intensity={1.1 * fee} time={t} position={[-1.32, 1.64, -2.2]} depth={0.02} haze={0.5} />
            <FloatingPrice text="METERED" font="mono" size={0.07} intensity={1.1 * fee} time={t} position={[-1.32, 1.5, -2.2]} depth={0.02} haze={0.5} />
          </>
        ) : null}
        {price > 0 ? (
          <>
            <FloatingPrice text="$4.99" font="mono" size={0.07} intensity={1.1 * price} time={t} position={[1.32, 1.64, -2.2]} depth={0.02} haze={0.5} />
            <FloatingPrice text="/ NIGHT" font="mono" size={0.07} intensity={1.1 * price} time={t} position={[1.32, 1.5, -2.2]} depth={0.02} haze={0.5} />
          </>
        ) : null}
        <BedClock position={CLOCK_POS} scale={0.8} />
      </CellRoom>
    </>
  );
};

// ------------------------------------------------------------------------------------------------ C
/** 21.20–25.60 "There's ink in the printer, but it won't print a line," — the printer wall from the left. */
export const ShotC: React.FC<{t: number}> = ({t}) => {
  const u = lin(t, T_CUT.C, T_CUT.D);
  const camZ = lerp(-0.12, 0.32, smooth(u));
  // the page feeds from "printer" and HALTS on "won't": a dying stutter, then nothing
  const k = t - W.wont;
  const feed = k < 0 ? 0.5 * Math.pow(lin(t, W.printer - 0.5, W.wont), 0.7) : 0.5 + 0.012 * Math.sin(k * 46) * Math.exp(-k * 7);
  const ep = errPulse(t); // 0, then a calm ~0.94 Hz swell from "print" (no strobe)
  const reach = sm(t, W.wont - 0.3, W.print + 0.2);
  const pose = mergePose(guyIdle(t, 3), {
    torsoBend: 0.12 + 0.14 * reach,
    headPitch: 0.12,
    armL: {shoulderX: lerp(0.1, 1.05, reach), shoulderZ: lerp(0.15, -0.05, reach), elbow: lerp(0.25, 0.2, reach), grip: 0.15, twist: 0.2},
  });
  const wl = {dir: DIR_RIGHT, scan: scanAt(t), intensity: cityPulse(t)};
  return (
    <>
      <CameraRig position={[-4.3, 2.15, camZ]} target={[1.6, 1.12, camZ]} fov={cameraFovForVisible(17)} />
      <CellRoom time={t} bedTilt={0} printerFeed={feed} printerGlow={ep > 0 ? SLIT * ep : SLIT} blinds={BLINDS_CD} ambient={AMB}
        windowLight={wl} hideWalls={['left']} hide={['door', 'slit', 'pegs']}>
        {/* the stripes run on down the printer wall to the floor, so his legs and the printer stand against them too */}
        <WindowSpill blinds={BLINDS_CD} windowLight={wl} ambient={AMB} />
        <PrinterDot level={ep > 0 ? DOT_ERR * ep : 0.5} />
        <HazeBehind t={t} intensity={wl.intensity} />
        <SilGuy position={[0.98, 0, -0.2]} rotation-y={2.6} pose={pose} />
        <Motes count={180} area={[0.5, 1.4, 2.2]} position={[1.5, 0.75, -0.9]} time={t} size={0.006} intensity={0.4} drift={[0, 0.025, 0.01]} seed={5} />
        <WorldLyric line={2} time={t} size={0.112} maxWidth={1.6} font={SFONTS.mono} weight={400}
          align="left" anchor="top" position={[1.795, 1.8, 0.48]} rotation-y={FACE_X} until={T_CUT.D} />
      </CellRoom>
    </>
  );
};

// ------------------------------------------------------------------------------------------------ D
/** 25.60–30.00 "'cause HP shuts it off when my card gets declined." — the slit dies; PAYMENT DECLINED across him. */
export const ShotD: React.FC<{t: number}> = ({t}) => {
  const u = lin(t, T_CUT.D, T_CUT.END);
  const camX = lerp(-3.1, -3.0, smooth(u));
  const dead = sm(t, W.off - 0.2, W.off + 0.15);
  const red = sm(t, W.declined - 0.05, W.declined + 0.12);
  // on "declined" the head sinks and the shoulders draw up
  const pose = mergePose(guyIdle(t, 3), {torsoBend: 0.13 + 0.08 * red, headPitch: 0.2 + 0.18 * red, shrug: 0.08 + 0.2 * red});
  const ep = errPulse(t) * (1 - dead); // the error swell carried over from C, dying on "off"
  const wl = {dir: DIR_RIGHT, scan: red > 0 ? null : scanAt(t), color: red > 0.5 ? S.authRed : S.bone, intensity: red > 0.5 ? 0.85 : 0.7 * cityPulse(t)};
  return (
    <>
      <CameraRig position={[camX, 0.98, -0.32]} target={[1.6, 1.36, -0.32]} fov={cameraFovForVisible(17)} />
      <CellRoom time={t} bedTilt={0} printerFeed={0.5} printerGlow={SLIT * ep} blinds={BLINDS_CD} ambient={AMB} windowLight={wl}
        hideWalls={['left']} hide={['door', 'slit', 'pegs']}>
        <WindowSpill blinds={BLINDS_CD} windowLight={wl} ambient={AMB} />
        <PrinterDot level={DOT_ERR * ep} />
        <HazeBehind t={t} color={wl.color} intensity={wl.intensity} />
        {/* after "declined" the wall behind him is dim red: a thin red rim keeps his outline (the only allowed edge light) */}
        <SilGuy position={[0.98, 0, -0.2]} rotation-y={2.6} pose={pose}
          rim={red > 0 ? {color: S.authRed, strength: 0.9 * red, power: 6, dir: [1, 0.25]} : null} />
        <WorldLyric line={3} time={t} size={0.085} maxWidth={1.8} intensity={0.85} halo={0.1} position={[0.55, 1.66, -0.25]} rotation-y={FACE_X} until={T_CUT.END} />
        {red > 0 ? (
          <Stencil text="PAYMENT DECLINED" glow color={S.authRed} intensity={1.1 * red} size={0.1} wear={0.2}
            position={[0.5, 1.25, -0.3]} rotation-y={FACE_X} />
        ) : null}
        <WorldLyric line={4} time={t} size={0.085} align="left" position={[1.79, 0.98, 0.75]} rotation-y={FACE_X} until={T_CUT.END} />
      </CellRoom>
    </>
  );
};
