import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { CIRCLE1_DURATION, CircleCarousel1, circleCarousel1Defaults, circleCarousel1Schema } from './circle-carousel-1.js';
import { CIRCLE2_DURATION, CircleCarousel2, circleCarousel2Defaults, circleCarousel2Schema } from './circle-carousel-2.js';
import { CIRCLE3_DURATION, CircleCarousel3, circleCarousel3Defaults, circleCarousel3Schema } from './circle-carousel-3.js';
import { CARD_RAIL_DURATION, CardRail, cardRailDefaults, cardRailSchema } from './card-rail.js';
import { REEL_WALL_DURATION, ReelWall, reelWallDefaults, reelWallSchema } from './reel-wall.js';
import { ORBIT_DURATION, OrbitGallery, orbitGalleryDefaults, orbitGallerySchema } from './orbit-gallery.js';
import { GALLERY_PUSH_DURATION, GalleryPush, galleryPushDefaults, galleryPushSchema } from './gallery-push.js';
import { SHOWCASE_DRIFT_DURATION, SHOWCASE_DRIFT_FPS, ShowcaseDrift, showcaseDriftDefaults, showcaseDriftSchema } from './showcase-drift.js';
import { H, W } from './kit.js';

const Root = () => (
  <>
    <Composition id="CircleCarousel1" component={CircleCarousel1} schema={circleCarousel1Schema} defaultProps={circleCarousel1Defaults} width={W} height={H} fps={30} durationInFrames={CIRCLE1_DURATION} />
    <Composition id="CircleCarousel2" component={CircleCarousel2} schema={circleCarousel2Schema} defaultProps={circleCarousel2Defaults} width={W} height={H} fps={30} durationInFrames={CIRCLE2_DURATION} />
    <Composition id="CircleCarousel3" component={CircleCarousel3} schema={circleCarousel3Schema} defaultProps={circleCarousel3Defaults} width={W} height={H} fps={30} durationInFrames={CIRCLE3_DURATION} />
    <Composition id="CardRail" component={CardRail} schema={cardRailSchema} defaultProps={cardRailDefaults} width={W} height={H} fps={30} durationInFrames={CARD_RAIL_DURATION} />
    <Composition id="ReelWall" component={ReelWall} schema={reelWallSchema} defaultProps={reelWallDefaults} width={W} height={H} fps={30} durationInFrames={REEL_WALL_DURATION} />
    <Composition id="OrbitGallery" component={OrbitGallery} schema={orbitGallerySchema} defaultProps={orbitGalleryDefaults} width={W} height={H} fps={30} durationInFrames={ORBIT_DURATION} />
    <Composition id="GalleryPush" component={GalleryPush} schema={galleryPushSchema} defaultProps={galleryPushDefaults} width={W} height={H} fps={30} durationInFrames={GALLERY_PUSH_DURATION} />
    <Composition id="ShowcaseDrift" component={ShowcaseDrift} schema={showcaseDriftSchema} defaultProps={showcaseDriftDefaults} width={W} height={H} fps={SHOWCASE_DRIFT_FPS} durationInFrames={SHOWCASE_DRIFT_DURATION} />
  </>
);
registerRoot(Root);
