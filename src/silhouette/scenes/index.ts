// TERMS (dystopian silhouette cut): scene map for the MainSilhouette composition. Same SceneIds and frame ranges as
// src/timeline.ts. Each scene lives in ./<Id>/index.tsx (named export) with a NOTES.md shot list.
import type {SceneMap} from '../../Layout';
import {Intro} from './Intro';
import {V1Bedroom} from './V1Bedroom';
import {V1Feeder} from './V1Feeder';
import {Pre} from './Pre';
import {Chorus1} from './Chorus1';
import {V2Car} from './V2Car';
import {V2Rain} from './V2Rain';
import {Swing} from './Swing';
import {Cancel} from './Cancel';
import {Hold} from './Hold';
import {Final} from './Final';
import {Outro} from './Outro';

export const SIL_SCENES: SceneMap = {Intro, V1Bedroom, V1Feeder, Pre, Chorus1, V2Car, V2Rain, Swing, Cancel, Hold, Final, Outro};
