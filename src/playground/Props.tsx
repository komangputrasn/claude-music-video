/**
 * Props — playground for the hero props library (src/lib/props). One 30-frame segment per shot:
 *   0 lineup wide · 1 feeder locked 3/4 · 2 feeder smashed + kibble burst · 3 kibble burst progress strip ·
 *   4 flip phone open close-up · 5 phone closed ringing · 6 e-reader dissolving · 7 e-reader banner ·
 *   8 hammer legendary glow · 9 book + bowl + bag · 10 padlock icon wall · 11 bowl close-up eating ·
 *   12 feeder locked vs smashed · 13 book cover close-up · 14 food bag hero spin
 * Render: node scripts/still.mjs play Props --frames=0,30,60,90,120,150,180,210,240,270,300,330,360,390,420
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage, CameraRig} from '../lib/three/Stage';
import {
  Book1984, DogBowl, EReader, FEEDER, Feeder, FlipPhone, FoodBag, Hammer, KibbleBurst, KibblePile, Padlock,
} from '../lib/props';

export const duration = 450;

const Lights: React.FC<{warm?: boolean}> = ({warm}) => (
  <>
    <hemisphereLight args={['#cfe2ff', '#2a2050', 0.75]} />
    <directionalLight position={[1.6, 3, 2.4]} intensity={2.1} color={warm ? '#ffd9a8' : '#fff6ea'} />
    <directionalLight position={[-2.5, 1.4, -2]} intensity={1.3} color={warm ? '#ff7ad9' : '#6fd6ff'} />
  </>
);

const Floor: React.FC<{color?: string}> = ({color = '#3346a8'}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[8, 64]} />
    <meshToonMaterial color={color} />
  </mesh>
);

export default function Props() {
  const f = useCurrentFrame();
  const seg = Math.floor(f / 30);
  const lf = f % 30;
  const tt = lf / 29;
  const t = f / 30;
  let shot: React.ReactNode = null;
  let bg = '#1d3fb8';
  let floor: string | null = '#3346a8';
  let warm = false;

  if (seg === 0) {
    // lineup
    shot = (
      <>
        <CameraRig position={[0.05 + tt * 0.08, 0.5, 1.45]} target={[0.02, 0.15, 0]} fov={40} />
        <FoodBag position={[-0.6, 0, -0.08]} rotation={[0, 0.4, 0]} />
        <Feeder position={[-0.12, 0, -0.05]} rotation={[0, 0.12, 0]} lcdText="PLUS MEMBERS ONLY" />
        <DogBowl position={[0.3, 0, 0.22]} fill={0.8} />
        <Book1984 position={[0.32, 0, -0.08]} rotation={[0, -0.3, 0]} />
        <EReader position={[0.5, 0.086, 0.0]} rotation={[0, -0.4, 0]} />
        <group position={[0.64, 0.064, 0.12]} rotation={[0, -0.45, 0]}>
          <FlipPhone open={1} screenLines={['CELLTEK', 'NOV 09 2002', '3:15 AM']} />
        </group>
        <Hammer position={[0.62, 0.015, 0.36]} rotation={[0, 0.5, Math.PI / 2]} />
        <Padlock position={[0.05, 0.035, 0.32]} rotation={[0, -0.2, 0]} />
      </>
    );
  } else if (seg === 1) {
    shot = (
      <>
        <CameraRig position={[0.5, 0.36, 0.78]} target={[0, 0.16, 0.05]} fov={40} />
        <Feeder lcdText="BREAKFAST IS FOR PLUS MEMBERS ONLY" lockShake={0.6} time={t} />
      </>
    );
  } else if (seg === 2) {
    const s = Math.min(1, tt * 2);
    shot = (
      <>
        <CameraRig position={[0.25, 0.5, 1.3]} target={[0, 0.16, 0]} fov={42} roll={-0.06} />
        <Feeder smashed={s} lid={1.6 * Math.min(1, tt * 3)} lcdText="ERR 0xD06" kibbleFill={0.4} time={t} />
        <KibbleBurst progress={tt * 0.75} origin={FEEDER.hopperCenter} count={200} spread={0.8} direction={[0, 0.5]} />
      </>
    );
  } else if (seg === 3) {
    // progress strip: five bursts at different progress values
    shot = (
      <>
        <CameraRig position={[0, 0.7, 2.6]} target={[0, 0.25, 0]} fov={42} />
        {[0.05, 0.12, 0.22, 0.4, 1].map((p, i) => (
          <KibbleBurst key={i} progress={p} origin={[-1.2 + i * 0.6, 0.3, 0]} count={80} spread={0.22} up={2.4} seed={i} />
        ))}
      </>
    );
  } else if (seg === 4) {
    shot = (
      <>
        <CameraRig position={[0.08, 0.13, 0.27]} target={[0, 0.06, 0]} fov={40} />
        <FlipPhone
          open={1}
          screenLines={['CANCEL ALL', 'SUBSCRIPTIONS?', '', '> YES', '  NO']}
          softKeys={['OK', 'Back']}
          rotation={[-0.15, -0.3, 0]}
        />
      </>
    );
  } else if (seg === 5) {
    shot = (
      <>
        <CameraRig position={[0, 0.05, 0.36]} target={[0, 0.03, 0]} fov={40} />
        <FlipPhone ringing={1} time={t} position={[-0.08, 0, 0]} rotation={[0, 0.25, 0]} />
        <FlipPhone open={0.45} position={[0.02, -0.01, -0.02]} rotation={[0, -0.1, 0]} />
        <FlipPhone open={1} screenColor="#8FD3FF" screenLines={['FeedMe+', 'Payment', 'declined :(']} position={[0.1, -0.02, -0.03]} rotation={[0, -0.4, 0]} />
      </>
    );
  } else if (seg === 6) {
    floor = null;
    bg = '#120a3a';
    shot = (
      <>
        <CameraRig position={[0.05, 0.03, 0.3]} target={[0, 0.03, 0]} fov={42} />
        <EReader dissolve={0.15 + tt * 0.75} rotation={[0, -0.18, 0]} />
      </>
    );
  } else if (seg === 7) {
    floor = null;
    bg = '#120a3a';
    shot = (
      <>
        <CameraRig position={[0, 0.0, 0.26]} target={[0, 0.01, 0]} fov={42} />
        <EReader dissolve={1} banner="This title is no longer available" rotation={[0.05, 0.15, 0]} />
      </>
    );
  } else if (seg === 8) {
    bg = '#0b0f3a';
    floor = null;
    shot = (
      <>
        {tt < 0.5 ? (
          <CameraRig position={[0.15 + 0.1 * tt, 0.2, 0.62]} target={[0.04, 0.12, 0]} fov={40} />
        ) : (
          // macro push-in on the glowing hammer's head
          <CameraRig position={[0.02 + 0.06 * tt, 0.32, 0.2 - 0.06 * tt]} target={[-0.07, 0.258, 0]} fov={38} />
        )}
        <Hammer glow={0.6} position={[-0.08, 0, 0]} rotation={[0, 0.3, 0.12]} />
        <Hammer glow={0} position={[0.17, 0.0, -0.05]} rotation={[0, -0.5, -0.15]} />
      </>
    );
  } else if (seg === 9) {
    warm = true;
    bg = '#ff9a5a';
    floor = '#6a8f3a';
    shot = (
      <>
        <CameraRig position={[0.35, 0.38, 1.0]} target={[0, 0.12, 0]} fov={40} />
        <FoodBag position={[-0.32, 0, -0.1]} rotation={[0, 0.5 + tt * 0.6, 0]} />
        <DogBowl position={[0.05, 0, 0.15]} fill={1} />
        <Book1984 position={[0.32, 0, 0]} rotation={[0, -0.4, 0]} open={tt} />
      </>
    );
  } else if (seg === 10) {
    bg = '#2a5bd8';
    floor = null;
    shot = (
      <>
        <CameraRig position={[0, 0, 0.9]} target={[0, 0, 0]} fov={40} />
        {Array.from({length: 12}).map((_, i) => {
          const c = i % 4, r = Math.floor(i / 4);
          return (
            <Padlock
              key={i}
              position={[-0.27 + c * 0.18, 0.16 - r * 0.17, 0]}
              rotation={[0, (c - 1.5) * 0.15, 0]}
              open={i === 5 ? tt : i === 10 ? 1 : 0}
              shake={i === 2 ? 1 : 0}
              broken={i === 7 ? tt : 0}
              color={i === 9 ? '#F5C542' : undefined}
              time={t}
            />
          );
        })}
      </>
    );
  } else if (seg === 12) {
    shot = (
      <>
        <CameraRig position={[0.05, 0.75, 1.75]} target={[0.05, 0.12, 0.05]} fov={40} />
        <Feeder position={[-0.3, 0, 0]} rotation={[0, 0.25, 0]} lcdText="PLUS MEMBERS ONLY" lockShake={0.5} time={t} />
        <Feeder position={[0.32, 0, 0]} rotation={[0, -0.25, 0]} smashed={1} lid={1.25} lcdText="ERR" kibbleFill={0.25} />
        <KibblePile count={50} radius={0.14} height={0.01} position={[0.45, 0, 0.32]} seed={9} />
      </>
    );
  } else if (seg === 13) {
    warm = true;
    bg = '#ffb36b';
    floor = '#d9a46a';
    shot = (
      <>
        <CameraRig position={[0.08, 0.13, 0.32]} target={[0, 0.09, 0]} fov={40} />
        <Book1984 rotation={[0, -0.2 + tt * 0.3, 0]} />
        <Book1984 position={[0.12, 0, -0.06]} rotation={[0, -0.5, 0]} open={1} />
      </>
    );
  } else if (seg === 14) {
    bg = '#2a5bd8';
    floor = null;
    shot = (
      <>
        <CameraRig position={[0, 0.25, 0.85]} target={[0, 0.23, 0]} fov={40} roll={0.05} />
        <FoodBag rotation={[0.08, -0.5 + tt * 1.2, 0.04]} />
      </>
    );
  } else {
    warm = true;
    bg = '#ffb36b';
    floor = '#d9a46a';
    shot = (
      <>
        <CameraRig position={[0, 0.22, 0.42]} target={[0, 0.03, 0]} fov={40} />
        <DogBowl fill={1 - tt * 0.85} />
        <KibblePile count={12} radius={0.05} height={0.0} position={[0.17, 0, 0.06]} seed={4} />
      </>
    );
  }

  return (
    <AbsoluteFill>
      <Stage background={bg} env="chrome">
        <Lights warm={warm} />
        {floor ? <Floor color={floor} /> : null}
        {shot}
      </Stage>
    </AbsoluteFill>
  );
}

