// Map components: real MapLibre GL maps captured frame by frame (capture/capture.mjs), with the line, pins and type drawn
// live on top. 1920x1080 at 30 fps, except RouteWalk (1080x1920 at 24 fps). TerrainDive is 6 s of 3D terrain.
//
//   node ../kinetograph/packages/cli/dist/cli.js still components/maps/index.tsx 120 --comp Flyover -o components/maps/out/flyover.png
//   node ../kinetograph/packages/cli/dist/cli.js render components/maps/index.tsx --comp Flyover -o components/maps/out/flyover.mp4

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Flyover, flyoverDefaults, flyoverSchema } from './flyover.js';
import { Globe, globeDefaults, globeSchema } from './globe.js';
import { CityZoom, cityZoomDefaults, cityZoomSchema } from './cityzoom.js';
import { TerrainDive, terrainDiveDefaults, terrainDiveSchema } from './terraindive.js';
import flyoverTrack from './public/flyover.json' with { type: 'json' };
import globeTrack from './public/globe.json' with { type: 'json' };
import cityTrack from './public/city-zoom.json' with { type: 'json' };
import routeTrack from './public/route-walk.json' with { type: 'json' };
import diveTrack from './public/terrain-dive.json' with { type: 'json' };
import { RouteWalk, routeWalkDefaults, routeWalkSchema, RW_W, RW_H, RW_FPS, rwDuration } from './route-walk.js';
import type { Track } from './ui.js';

const Root: React.FC = () => (
  <>
    <Composition
      id="Flyover"
      component={(p: Omit<typeof flyoverDefaults, never>) => <Flyover {...p} track={flyoverTrack as unknown as Track} />}
      schema={flyoverSchema}
      defaultProps={flyoverDefaults}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={240}
    />
    <Composition
      id="Globe"
      component={(p: typeof globeDefaults) => <Globe {...p} track={globeTrack as unknown as Track} />}
      schema={globeSchema}
      defaultProps={globeDefaults}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={240}
    />
    <Composition
      id="CityZoom"
      component={(p: typeof cityZoomDefaults) => <CityZoom {...p} track={cityTrack as unknown as Track} />}
      schema={cityZoomSchema}
      defaultProps={cityZoomDefaults}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={240}
    />
    <Composition
      id="RouteWalk"
      component={(p: typeof routeWalkDefaults) => <RouteWalk {...p} track={routeTrack as unknown as Track} />}
      schema={routeWalkSchema}
      defaultProps={routeWalkDefaults}
      width={RW_W}
      height={RW_H}
      fps={RW_FPS}
      durationInFrames={rwDuration(routeTrack as unknown as Track)}
    />
    <Composition
      id="TerrainDive"
      component={(p: typeof terrainDiveDefaults) => <TerrainDive {...p} track={diveTrack as unknown as Track} />}
      schema={terrainDiveSchema}
      defaultProps={terrainDiveDefaults}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={180}
    />
  </>
);

registerRoot(Root);
