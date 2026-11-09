import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {SCENES, SceneId} from './timeline';
import {SceneStart} from './lib/time';
import {GlobalOverlays} from './overlays/GlobalOverlays';
import {SilOverlays} from './silhouette/overlays/SilOverlays';

export type SceneMap = Partial<Record<SceneId, React.FC>>;

/**
 * Which global overlay set to mount above the scenes:
 *   true | 'y2k'  → the Y2K cut's GlobalOverlays (karaoke captions + cut flashes) — the default, used by `Main`
 *   'silhouette'  → the TERMS cut's SilOverlays (2.39:1 letterbox + word-by-word Futura captions)
 *   false         → none
 */
export type OverlaySet = boolean | 'y2k' | 'silhouette';

/** Renders the scenes that are present in `scenes` at their timeline slots, plus global overlays (captions, HUD, FX). */
export const Layout: React.FC<{scenes: SceneMap; overlays?: OverlaySet}> = ({scenes, overlays = true}) => (
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
    {overlays === true || overlays === 'y2k' ? <GlobalOverlays /> : overlays === 'silhouette' ? <SilOverlays /> : null}
  </AbsoluteFill>
);
