import React from 'react';
import {Composition, Audio, staticFile, AbsoluteFill} from 'remotion';
import {FPS, WIDTH, HEIGHT, TOTAL_FRAMES} from './timeline';
import {Layout, SceneMap} from './Layout';
import {Intro} from './scenes/Intro';
import {V1Bedroom} from './scenes/V1Bedroom';
import {V1Feeder} from './scenes/V1Feeder';
import {Pre} from './scenes/Pre';
import {Chorus1} from './scenes/Chorus1';
import {V2Car} from './scenes/V2Car';
import {V2Rain} from './scenes/V2Rain';
import {Swing} from './scenes/Swing';
import {Cancel} from './scenes/Cancel';
import {Hold} from './scenes/Hold';
import {Final} from './scenes/Final';
import {Outro} from './scenes/Outro';

const ALL: SceneMap = {Intro, V1Bedroom, V1Feeder, Pre, Chorus1, V2Car, V2Rain, Swing, Cancel, Hold, Final, Outro};

const Main: React.FC = () => (
  <AbsoluteFill>
    <Layout scenes={ALL} />
    <Audio src={staticFile('song.mp3')} />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
