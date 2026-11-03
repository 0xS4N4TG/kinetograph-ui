// Seven animated data charts with camera moves. Each is an exported component driven by a `data` prop; this file
// registers one Composition per component (1920x1080) with demo data. See README.md.
//
//   node ../kinetograph/packages/cli/dist/cli.js still components/charts/index.tsx 200 --comp AreaChart -o components/charts/out/area.png
//   node ../kinetograph/packages/cli/dist/cli.js render components/charts/index.tsx --comp AreaChart -o components/charts/out/area-chart.mp4

import React from 'react';
import { Composition, registerRoot, useCurrentFrame } from 'remotion';
import { Camera } from '@kinetographdev/core';
import { AREA_FPS, AreaChart, areaDefaults, areaDuration, areaSchema, type AreaProps } from './AreaChart.js';
import { LINE_FPS, LineTicker, lineDefaults, lineDuration, lineSchema, type LineProps } from './LineTicker.js';
import { BAR_FPS, BarChart, barDefaults, barDuration, barSchema, type BarProps } from './BarChart.js';
import { DONUT_FPS, DonutChart, donutDefaults, donutDuration, donutSchema, type DonutProps } from './DonutChart.js';
import { SCATTER_FPS, ScatterBloom, scatterDefaults, scatterDuration, scatterSchema, type ScatterProps } from './ScatterBloom.js';
import { HEX_FPS, HexTally, hexDefaults, hexDuration, hexSchema, type HexProps } from './HexTally.js';
import { TALLY_FPS, TallyRise, tallyDefaults, tallyDuration, tallySchema, type TallyProps } from './TallyRise.js';
import { H, W } from './lib.js';
import { BklitCompositions } from './bklitScenes.js';

const AreaScene: React.FC<AreaProps> = (p) => <AreaChart f={useCurrentFrame()} {...p} />;
const LineScene: React.FC<LineProps> = (p) => <LineTicker f={useCurrentFrame()} {...p} />;
const BarScene: React.FC<BarProps> = (p) => <BarChart f={useCurrentFrame()} {...p} />;
const DonutScene: React.FC<DonutProps> = (p) => <DonutChart f={useCurrentFrame()} {...p} />;
const ScatterScene: React.FC<ScatterProps> = (p) => <ScatterBloom f={useCurrentFrame()} {...p} />;
const HexScene: React.FC<HexProps> = (p) => <HexTally f={useCurrentFrame()} {...p} />;
const TallyScene: React.FC<TallyProps> = (p) => <TallyRise f={useCurrentFrame()} {...p} />;

registerRoot(() => (
  <>
    <Composition id="AreaChart" component={AreaScene} schema={areaSchema} defaultProps={areaDefaults}
      durationInFrames={areaDuration(areaDefaults)} fps={AREA_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: AreaProps }) => ({ durationInFrames: areaDuration(props) })} />
    <Composition id="LineTicker" component={LineScene} schema={lineSchema} defaultProps={lineDefaults}
      durationInFrames={lineDuration(lineDefaults)} fps={LINE_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: LineProps }) => ({ durationInFrames: lineDuration(props) })} />
    <Composition id="BarChart" component={BarScene} schema={barSchema} defaultProps={barDefaults}
      durationInFrames={barDuration(barDefaults)} fps={BAR_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: BarProps }) => ({ durationInFrames: barDuration(props) })} />
    <Composition id="DonutChart" component={DonutScene} schema={donutSchema} defaultProps={donutDefaults}
      durationInFrames={donutDuration(donutDefaults)} fps={DONUT_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: DonutProps }) => ({ durationInFrames: donutDuration(props) })} />
    <Composition id="ScatterBloom" component={ScatterScene} schema={scatterSchema} defaultProps={scatterDefaults}
      durationInFrames={scatterDuration(scatterDefaults)} fps={SCATTER_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: ScatterProps }) => ({ durationInFrames: scatterDuration(props) })} />
    <Composition id="HexTally" component={HexScene} schema={hexSchema} defaultProps={hexDefaults}
      durationInFrames={hexDuration(hexDefaults)} fps={HEX_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: HexProps }) => ({ durationInFrames: hexDuration(props) })} />
    <Composition id="TallyRise" component={TallyScene} schema={tallySchema} defaultProps={tallyDefaults}
      durationInFrames={tallyDuration(tallyDefaults)} fps={TALLY_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: TallyProps }) => ({ durationInFrames: tallyDuration(props) })} />
    <BklitCompositions />
  </>
));
void Camera;
