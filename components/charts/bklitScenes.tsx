// The six Bklit charts added in round two, one Composition each (1920x1080, 60 fps). Kept in its own file so
// index.tsx only has to render <BklitCompositions />. Chart design after Bklit UI (MIT).

import React from 'react';
import { Composition, useCurrentFrame } from 'remotion';
import { H, W } from './lib.js';
import { RADAR_FPS, RadarChart, radarDefaults, radarDuration, radarSchema, type RadarProps } from './RadarChart.js';
import { RING_FPS, RingChart, ringDefaults, ringDuration, ringSchema, type RingProps } from './RingChart.js';
import { FUNNEL_FPS, FunnelChart, funnelDefaults, funnelDuration, funnelSchema, type FunnelProps } from './FunnelChart.js';
import { HEATMAP_FPS, HeatmapChart, heatmapDefaults, heatmapDuration, heatmapSchema, type HeatmapProps } from './HeatmapChart.js';
import { SANKEY_FPS, SankeyChart, sankeyDefaults, sankeyDuration, sankeySchema, type SankeyProps } from './SankeyChart.js';
import { CANDLE_FPS, CandlestickChart, candleDefaults, candleDuration, candleSchema, type CandleProps } from './CandlestickChart.js';

const RadarScene: React.FC<RadarProps> = (p) => <RadarChart f={useCurrentFrame()} {...p} />;

const RingScene: React.FC<RingProps> = (p) => <RingChart f={useCurrentFrame()} {...p} />;

const FunnelScene: React.FC<FunnelProps> = (p) => <FunnelChart f={useCurrentFrame()} {...p} />;

const HeatmapChartScene: React.FC<HeatmapProps> = (p) => <HeatmapChart f={useCurrentFrame()} {...p} />;

const SankeyChartScene: React.FC<SankeyProps> = (p) => <SankeyChart f={useCurrentFrame()} {...p} />;

const CandlestickChartScene: React.FC<CandleProps> = (p) => <CandlestickChart f={useCurrentFrame()} {...p} />;

export const BklitCompositions: React.FC = () => (
  <>
    <Composition id="RadarChart" component={RadarScene} schema={radarSchema} defaultProps={radarDefaults}
      durationInFrames={radarDuration(radarDefaults)} fps={RADAR_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: RadarProps }) => ({ durationInFrames: radarDuration(props) })} />
    <Composition id="RingChart" component={RingScene} schema={ringSchema} defaultProps={ringDefaults}
      durationInFrames={ringDuration(ringDefaults)} fps={RING_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: RingProps }) => ({ durationInFrames: ringDuration(props) })} />
    <Composition id="FunnelChart" component={FunnelScene} schema={funnelSchema} defaultProps={funnelDefaults}
      durationInFrames={funnelDuration(funnelDefaults)} fps={FUNNEL_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: FunnelProps }) => ({ durationInFrames: funnelDuration(props) })} />
    <Composition id="HeatmapChart" component={HeatmapChartScene} schema={heatmapSchema} defaultProps={heatmapDefaults}
      durationInFrames={heatmapDuration(heatmapDefaults)} fps={HEATMAP_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: HeatmapProps }) => ({ durationInFrames: heatmapDuration(props) })} />
    <Composition id="SankeyChart" component={SankeyChartScene} schema={sankeySchema} defaultProps={sankeyDefaults}
      durationInFrames={sankeyDuration(sankeyDefaults)} fps={SANKEY_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: SankeyProps }) => ({ durationInFrames: sankeyDuration(props) })} />
    <Composition id="CandlestickChart" component={CandlestickChartScene} schema={candleSchema} defaultProps={candleDefaults}
      durationInFrames={candleDuration(candleDefaults)} fps={CANDLE_FPS} width={W} height={H}
      calculateMetadata={({ props }: { props: CandleProps }) => ({ durationInFrames: candleDuration(props) })} />
  </>
);
