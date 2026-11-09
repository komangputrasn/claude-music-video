/**
 * Playground: ChromeText fonts/presets + Y2K materials on props.
 *   0-39    close-up 3/4 of chrome title bevels with shine sweep + sparkles
 *   40-79   the five local fonts in chrome (wave via perLetter)
 *   80-119  all eight presets
 *   120-159 material swatches: chrome/gold/gel/iridescent/candy/ruby spheres, candy-plastic rounded boxes, gel pills,
 *           glow ring, low-poly gem, PBR metal
 *   160-199 close-up of the gadgets (candy plastic + gel button + chrome)
 *   node scripts/still.mjs play Y2KFXText --frames=20,60,100,140,180
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {RoundedBox} from '@react-three/drei';
import {Stage, CameraRig} from '../lib/three/Stage';
import {ChromeText, CHROME_FONTS} from '../lib/three/ChromeText';
import {chromeMat, goldMat, gelButtonMat, iridescentMat, candyPlastic, glowMat, lowPolyMat, metalMat, CANDY, y2kMat, Y2K_PRESETS} from '../lib/three/materials';
import {SparkleField, SkyDome, Sparkle} from '../lib/three/fx';
import {ramp, lerp} from '../lib/time';

export const duration = 200;

export default function Y2KFXText() {
  const f = useCurrentFrame();
  const t = f / 30;
  const shot = Math.floor(f / 40);
  const lf = f % 40;
  const k = lf / 39;
  let body: React.ReactNode;
  if (shot === 0) {
    body = (
      <>
        <CameraRig position={[lerp(-3.4, -2.6, k), lerp(1.4, 1.1, k), lerp(3.6, 3.0, k)]} target={[-0.6, 0.35, 0]} fov={40} />
        <ChromeText text={'BUY NOW,\nFOR NOW'} size={0.8} anchor="center" position={[0, 0.35, 0]} shine={ramp(lf, 4, 34)} outline />
        <SparkleField count={14} seed={2} area={[5, 2, 0.6]} position={[0, 0.35, 0.4]} time={t} size={0.35} />
      </>
    );
  } else if (shot === 1) {
    body = (
      <>
        <CameraRig position={[0, 0.2, 8.5]} target={[0, 0.2, 0]} fov={42} />
        {CHROME_FONTS.map((fn, i) => (
          <ChromeText key={fn} text={fn === 'GeorgiaBold' ? 'Georgia Bold 1984' : fn.replace(/([a-z])([A-Z])/g, '$1 $2')} font={fn} size={0.42}
            material={i % 2 ? 'blue' : 'chrome'} color={fn === 'VerdanaBold' ? '#FF4FB8' : undefined} bevel={fn === 'Impact' ? false : undefined}
            position={[0, 2.1 - i * 1.0, 0]}
            perLetter={(j) => ({position: [0, Math.sin(t * 5 - j * 0.45) * 0.07, 0]})} />
        ))}
      </>
    );
  } else if (shot === 2) {
    body = (
      <>
        <CameraRig position={[2.5, 0.8, 9.5]} target={[0, 0.3, 0]} fov={45} />
        {Y2K_PRESETS.map((m, i) => (
          <ChromeText key={m} text={m.toUpperCase()} material={m} size={0.5} font={i % 2 ? 'Impact' : 'ArialBlack'} iriPhase={t * 0.3}
            position={[(i % 2 ? 2.4 : -2.4), 2.2 - Math.floor(i / 2) * 1.25, 0]} rotation={[0, Math.sin(t * 2 + i) * 0.25, 0]} />
        ))}
      </>
    );
  } else {
    const close = shot === 4;
    body = (
      <>
        <CameraRig position={close ? [lerp(-1.4, -0.8, k), 0.5, 2.6] : [0, 0.6, 6.5]} target={close ? [-0.4, 0.15, 0] : [0, 0.3, 0]} fov={close ? 38 : 45} />
        {[chromeMat(), goldMat(), gelButtonMat(), iridescentMat(), y2kMat('candy', {color: '#FF4FB8'}), y2kMat('ruby')].map((m, i) => (
          <mesh key={i} material={m} position={[-2.5 + i, 1.35, 0]}>
            <sphereGeometry args={[0.4, 48, 32]} />
          </mesh>
        ))}
        {[CANDY.bondi, CANDY.tangerine, CANDY.grape, CANDY.lime, CANDY.strawberry].map((c, i) => (
          <RoundedBox key={c} args={[0.62, 0.62, 0.62]} radius={0.14} smoothness={4} material={candyPlastic(c)} position={[-2 + i, 0.15, 0]} rotation={[0.35, t * 0.6 + i, 0]} />
        ))}
        <mesh material={gelButtonMat()} position={[-0.9, -0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.22, 1.2, 8, 32]} />
        </mesh>
        <mesh material={gelButtonMat(CANDY.lime)} position={[0.9, -0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.22, 1.2, 8, 32]} />
        </mesh>
        <mesh material={glowMat('#FF4FB8', 3)} position={[-2.4, -0.95, 0]} rotation={[0, t, 0]}>
          <torusGeometry args={[0.28, 0.03, 8, 48]} />
        </mesh>
        <mesh material={lowPolyMat('#FF8A1E')} position={[2.4, -0.95, 0]} rotation={[t, t * 0.7, 0]}>
          <icosahedronGeometry args={[0.32, 0]} />
        </mesh>
        <mesh material={metalMat()} position={[2.9, 1.35, -0.6]}>
          <torusKnotGeometry args={[0.25, 0.08, 96, 12]} />
        </mesh>
        {close ? <Sparkle position={[-1.55, 1.62, 0.35]} size={0.5} time={t} intensity={3} /> : null}
      </>
    );
  }
  return (
    <AbsoluteFill>
      <Stage background="#1E5BFF" env="chrome">
        <SkyDome preset="y2k" />
        <hemisphereLight args={['#cfe8ff', '#30204a', 0.9]} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} />
        {body}
      </Stage>
    </AbsoluteFill>
  );
}
