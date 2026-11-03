# Carousels

Seven carousel and gallery components for Kinetograph, each a reusable React component with a zod schema (every prop has a
`.describe()`, so Studio builds controls from them) and a demo composition. 1920x1080, 30 fps, 240 frames (8 s) each.
All pictures are public-domain NASA photographs from `../_assets/photos` (credits in `CREDITS.md` there), reached through
the `public/photos` symlink; the `images` prop takes any path under `public/` or a URL.

| Component | Composition id | File | What it is |
|---|---|---|---|
| `CircleCarousel1` | `CircleCarousel1` | `circle-carousel-1.tsx` | Covers on a ring, tiny at the top left to large at the bottom, turning so each grows as it comes round; the big end piles up. |
| `CircleCarousel2` | `CircleCarousel2` | `circle-carousel-2.tsx` | A spiral wound inward: covers are born at a wide rim, grow as they wind in, and are swallowed at the centre. Whole spiral swirls slowly. |
| `CircleCarousel3` | `CircleCarousel3` | `circle-carousel-3.tsx` | Covers file into a "U", askew like handled prints, growing left to right. Warm ground. |
| `CardRail` | `CardRail` | `card-rail.tsx` | Portrait cards on a tilted 3D plane, flicked sideways in two throws; the centred card lifts off the plane. |
| `ReelWall` | `ReelWall` | `reel-wall.tsx` | A 3D ring of tall clips turning past in the dark, thrown and eased to rest on one card, whose name comes up. |
| `OrbitGallery` | `OrbitGallery` | `orbit-gallery.tsx` | Photos spiral in around a serif title and settle on an ellipse, then float and push in a few percent. |
| `GalleryPush` | `GalleryPush` | `gallery-push.tsx` | A wall opening column by column from the middle outward, tile by tile, while the camera pushes in from a wide turned view to a square one. |

| `ShowcaseDrift` | `ShowcaseDrift` | `showcase-drift.tsx` | A drifting-card showcase, timed from measured motion (60 fps, 180 frames, 1920x1080): a drawn scatter of cards slides in from the right behind a headline that never moves, losing about 7 percent of the remaining distance each frame, no overshoot. Props: `headline`, `figure`, `travel`, `loss`, `holdFrames`, `font`, `colors`. |

`chain.tsx` is the conveyor under the three circle carousels, `kit.tsx` the shared easing, photo card, font loading and label.

## Props

Common to all: `images` (paths), `title` / `caption` (or `subtitle`), `font` (Google Fonts family), `colors` (ground, ink, muted ...),
and timing in frames. The rest per component (see each schema for the full list and the descriptions):

- **Circle Carousel 1**: `count`, `radius`, `minSize`, `maxSize`, `growth` (how late covers grow), `turns`, `startAngle`, `turnStart`, `turnFrames`, `stagger`, `push`.
- **Circle Carousel 2**: `count`, `outerRadius`, `innerRadius`, `windings`, `minSize`, `maxSize`, `growth`, `travel`, `travelStart`, `travelFrames`, `swirl`, `tilt`, `stagger`.
- **Circle Carousel 3**: `count`, `width`, `armHeight`, `minSize`, `maxSize`, `scatter`, `lean`, `travel`, `travelStart`, `travelFrames`, `seed`, `stagger`.
- **Card Rail**: `labels`, `count`, `cardWidth`, `cardHeight`, `gap`, `tiltX`, `roll`, `perspective`, `flicks` (list of `{ at, cards, frames }`), `lift`, `serif`.
- **Reel Wall**: `labels`, `count`, `radius`, `cardWidth`, `cardHeight`, `perspective`, `landOn`, `extraTurns`, `spinStart`, `spinFrames`, `step`, `serif`.
- **Orbit Gallery**: `count`, `radiusX`, `radiusY`, `photoWidth`, `photoHeight`, `swirl`, `startDistance`, `firstFrame`, `stagger`, `travelFrames`, `tilt`, `seed`, `push`, `serif`.
- **Gallery Push**: `columns`, `tilesPerColumn`, `columnWidth`, `gap`, `depth`, `perspective`, `openStart`, `openStagger`, `openFrames`, `pushStart`, `pushFrames`, `pushTo`, `turn`, `drift`, `seed`.

Everything is a pure function of the frame (jitter and tilt come from `random(seed)`).

## Principles used

- **Circle Carousels**: slow in and slow out (the conveyor is one eased number), arcs (circle, spiral, U paths), staging (size
  says where to look: the big end is the subject), overlap and stagger (covers enter one after another round the ring),
  solid drawing (bigger covers always draw over smaller; consistent shadow), secondary action (slow push in, swirl), appeal (each frame is a composed still).
- **Card Rail**: anticipation (a pull back of 0.12 card before each throw), slow out (a long settle with no overshoot), timing (two
  throws, the second longer), staging (the centred card lifts and sharpens, the rest sit back), solid drawing (one tilted plane, real perspective, depth-sorted), secondary action (camera sway).
- **Reel Wall**: anticipation (a six-degree pre-roll), slow out (cubic ease-out over 150 frames), arcs (cards travel a circle), staging
  (at rest the others darken and the chosen card steps forward and is named), follow through (the name arrives after the stop), solid drawing (a true 3D ring with depth sorting).
- **Orbit Gallery**: arcs (spiral arrival paths), overlap and stagger (one photograph every 7 frames), slow out, exaggeration (a wide
  swirl that unwinds into a quiet ring), staging (title fixed at the centre, ring clear around it), secondary action (settled float, push in), a hold at the end.
- **Gallery Push**: staging (the push ends on the middle columns), overlap and stagger (columns open outward from the middle, tiles top to bottom), slow in and slow out
  (camera ease), solid drawing (alternate columns stand off the plane, so the push has parallax), secondary action (columns drift in opposite directions).

## Render

From the repo root:

```
node ../kinetograph/packages/cli/dist/cli.js still components/carousels/index.tsx 120 --comp CircleCarousel1 -o components/carousels/out/still.png
node ../kinetograph/packages/cli/dist/cli.js render components/carousels/index.tsx --comp CircleCarousel1 -o components/carousels/out/circle-carousel-1.mp4
```

Composition ids: `CircleCarousel1`, `CircleCarousel2`, `CircleCarousel3`, `CardRail`, `ReelWall`, `OrbitGallery`, `GalleryPush`.
Type-check: `cd components/carousels && npx --no-install tsc -p tsconfig.json`.

## Notes

- The shared photos are cleaned (caption strips and letterboxes cropped, weak shots replaced); see `../_assets/photos/CREDITS.md`.
- Fonts (Geist, Inter, Instrument Serif) come from Google Fonts at first render and are cached; offline they will not load.

## Camera notes (round two)

The three Circle Carousels now share `chainCamera` in `kit.tsx`: the camera rides the front of the entrance sweep (zoomed so the covers it follows stay about 190 px across, so the growth is felt), pulls out past the mark and back to the ring shot, holds while the ring turns, then pushes into the biggest cover. `Rig` is the 2D camera (centre, zoom, roll, motion blur shutter). New props: `rideZoom`, `push`, `motionBlur`. Card Rail opens tight on the first card, pulls out with the first throw (the camera trails the rail so the cards overshoot and settle back), winds up before the second throw and pushes onto the centred card (`startZoom`, `endZoom`). Reel Wall starts far back with the ring swung off-axis, pushes in with the throw and lands on the chosen card with an overshoot (`startPull`). Orbit Gallery opens tight on the title, leans after each launch, pulls out past the mark and settles back toward the title (`openZoom`). Gallery Push opens close on the middle column, pulls back with the reveal, holds, winds up, whips round and trucks across, then pushes onto the middle columns. All take `motionBlur`, off by default (0) so every card stays sharp, as in Grid Builder; turn it up for a smear on the fastest moves.
