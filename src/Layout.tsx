import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {SCENES, SceneId} from './timeline';
import {SceneStart} from './lib/time';
import {GlobalOverlays} from './overlays/GlobalOverlays';

export type SceneMap = Partial<Record<SceneId, React.FC>>;

/** Renders the scenes that are present in `scenes` at their timeline slots, plus global overlays (captions, HUD, FX). */
export const Layout: React.FC<{scenes: SceneMap; overlays?: boolean}> = ({scenes, overlays = true}) => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    {SCENES.map((s) => {
      const C = scenes[s.id];
      if (!C) return null;
      return (
        <Sequence key={s.id} name={s.id} from={s.from} durationInFrames={s.to - s.from} premountFor={30}>
          <SceneStart from={s.from}>
            <C />
          </SceneStart>
        </Sequence>
      );
    })}
    {overlays ? <GlobalOverlays /> : null}
  </AbsoluteFill>
);
