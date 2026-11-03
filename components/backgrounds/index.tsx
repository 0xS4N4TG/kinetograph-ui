// Backgrounds that move subtly and sit behind anything. All 1920x1080 at 30 fps, 300 frames, and they loop seamlessly
// at a whole-number speed. See README.md.

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { GrainGradient, grainGradientDefaults, grainGradientSchema } from './grain-gradient.js';
import { Paper, paperDefaults, paperSchema } from './paper.js';
import { DotField, dotFieldDefaults, dotFieldSchema } from './dot-field.js';
import { Aurora, auroraDefaults, auroraSchema } from './aurora.js';
import { AuroraVeil, auroraVeilDefaults, auroraVeilSchema } from './aurora-veil.js';
import { LiquidGradient, liquidGradientDefaults, liquidGradientSchema } from './liquid-gradient.js';
import { GrainFlow, grainFlowDefaults, grainFlowSchema } from './grain-flow.js';
import { DriftGradient, driftGradientDefaults, driftGradientSchema } from './drift-gradient.js';
import { TideGradient, tideGradientDefaults, tideGradientSchema } from './tide-gradient.js';
import { GraphPaper, graphPaperDefaults, graphPaperSchema } from './graph-paper.js';
import { RiseGlow, riseGlowDefaults, riseGlowSchema } from './rise-glow.js';

const size = { durationInFrames: 300, fps: 30, width: 1920, height: 1080 } as const;

registerRoot(() => (
  <>
    <Composition id="GrainGradient" component={GrainGradient} schema={grainGradientSchema} defaultProps={grainGradientDefaults} {...size} />
    <Composition id="Paper" component={Paper} schema={paperSchema} defaultProps={paperDefaults} {...size} />
    <Composition id="DotField" component={DotField} schema={dotFieldSchema} defaultProps={dotFieldDefaults} {...size} />
    <Composition id="Aurora" component={Aurora} schema={auroraSchema} defaultProps={auroraDefaults} {...size} />
    <Composition id="AuroraVeil" component={AuroraVeil} schema={auroraVeilSchema} defaultProps={auroraVeilDefaults} {...size} />
    <Composition id="LiquidGradient" component={LiquidGradient} schema={liquidGradientSchema} defaultProps={liquidGradientDefaults} {...size} />
    <Composition id="GrainFlow" component={GrainFlow} schema={grainFlowSchema} defaultProps={grainFlowDefaults} {...size} />
    <Composition id="DriftGradient" component={DriftGradient} schema={driftGradientSchema} defaultProps={driftGradientDefaults} {...size} />
    <Composition id="TideGradient" component={TideGradient} schema={tideGradientSchema} defaultProps={tideGradientDefaults} {...size} />
    <Composition id="RiseGlow" component={RiseGlow} schema={riseGlowSchema} defaultProps={riseGlowDefaults} {...size} />
    <Composition id="GraphPaper" component={GraphPaper} schema={graphPaperSchema} defaultProps={graphPaperDefaults} {...size} />
    <Composition id="GraphPaperTall" component={GraphPaper} schema={graphPaperSchema} defaultProps={{ ...graphPaperDefaults, focusY: 0.42 }} {...size} width={1080} height={1920} />
  </>
));
