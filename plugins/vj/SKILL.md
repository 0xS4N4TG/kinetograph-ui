---
name: vj
description: Screen, tape and sensor looks for Kinetograph (CRT with switch-off, VHS, 1-bit dither, thermal camera, depth pass, subpixel zoom), tracking overlays (blob boxes with ids, coordinates and links; a reticle on one tracked point), `HalftonePoster` (a clip printed as coarse ink dots on flat paper colours: panels, an off-register shadow and a title, from a matte) and `halftonePoster()` (the look on any layer), `Fragments` (clips seen only through named detector boxes, tiles and round holes, on planes at different depths with a camera flying through them: the "fragmented memories" collage) and a pop-art cut to an anime poster of a person (`PopArt`, needs a person matte). Use for TouchDesigner-style tracked footage, object-detection looks, parallax collages, halftone and screen-print posters and retro screen looks.
---

# VJ

`@kinetographdev/vj`. Full reference: README.md beside this file.

## Looks

Layer effects: `<Layer effects={crt()}>`. `crt`, `switchOff(t)` (spread into `crt`), `vhs`, `oneBit`, `thermal`
(`IRON`, `RAINBOW`), `depthLook`, `pixels`.

## Tracking, for an agent

1. Run `node plugins/vj/tools/blobs.mjs --in <clip> --out <json> --debug <prefix>` (motion mode by default).
2. Open two or three of the debug PNGs. Too many small boxes: raise `--min` or `--threshold`. One thing split into
   several: raise `--grow`. Ids changing on a moving thing: raise `--link`.
3. Import the JSON and put `<Blobs track={...} />` over the clip. Render a still and look at it; tame a busy frame
   with `max` and `min`.

## Halftone poster, for an agent

1. The look alone: `<Layer effects={halftonePoster({ ink, paper, size, angle, punch, bias })}>`. Pick two inks far
   apart in lightness (a dark ink on a light paper); `punch` 1.5 to 2 gives solid shadows and clean highlights, and
   `bias` below 0 lifts a dark clip (more paper), above 0 darkens a flat one.
2. A poster of a person: make the matte (`tools/matte.mjs`, as for pop art), then `<HalftonePoster src matte panels
   title offset />`. Each panel is `{ x: [from, to], ink, paper, ground, shadow }`: the person is printed `ink` on
   `paper`, the rest of the panel is flat `ground`, and `shadow` is the off-register silhouette `offset` px away. Two
   or three panels with different ink pairs read best; `changes` cuts to another set on a frame.
3. Render a still of each panel set and look: the face mostly paper with dots in the shadows (not a solid block of
   ink), the ground a different colour from the paper so the person stands off it, the title clear of the face.

## Fragments, for an agent

The boxes and their names are yours to make: there is no detection model. You are the detector.

1. Choose the clips and what of each shows: `{ boxes }` (blobs that move, named by id), `{ spots }` (boxes you place),
   `{ tiles }` (fixed rectangles, a sky built from a few) and `{ dots }` (round holes, a scatter of specks).
2. Moving things, on a locked-off shot: `tools/blobs.mjs` as above. Put the piece in `<Fragments inspect={i}>` and
   render stills a second or so apart: every box shows `ID n`. Name what each id is in `labels` (`{ 12: 'person' }`)
   and set `only: true` to drop the unnamed. Ids that jump from thing to thing: leave them out. A handheld shot gives
   boxes on the background (the camera moved, not the people): use spots there.
3. Still things, and people on a handheld shot: render `inspect` at frame 0. The grid is in clip pixels (lines every
   100, numbers every 200); read each box off it as `[x, y, w, h]`. For a box that should move, run
   `tools/track.mjs --in <clip> --size <clip w>x<clip h> --box <a patch inside it> --out <json>` and give the spot
   `track`. A spot that slides off the clip is cut at its edge and dropped.
4. Name things the way a detector would: the COCO class names (`person`, `backpack`, `tie`, `traffic light`, `bird`,
   `cow`, `bench`, `boat`, `car`, ...). Never a name or an identity, only the kind of thing.
5. Place the pieces: `at: [x, y, z]` (px from the centre seen from depth 0, and depth) and `size`; `camera` keys
   ease between `{ frame, x, y, z }`. A piece is gone once the camera is closer than 0.04 to it, so a path through
   the pieces flies past them. Slow short clips with `rate` and `loop`.
6. Render stills at the start, the middle and the end, and look: nothing big covering the last shot, text not over a
   busy piece, a tag not cut by the frame for long.

## Pop art, for an agent

1. `node plugins/vj/tools/matte.mjs --in <clip> --out <matte.mp4> --track <person.json>` (once per clip).
2. Open a frame of the matte beside the clip: the person should be solid white. Holes or a missing arm mean the
   clip is too dark or the person too small; try another clip.
3. `<PopArt src matte track cuts title />`. Set each cut's `origin` near the person (1920x1080 space). Render stills
   inside a cut (the poster) and at its edges (the shards and slices) and look at them.

Studio: `vjLookSchema` (the look, with a panel) and `blobStyleSchema` (the marks) as composition props;
`lookEffects(look)` for the layer, `{...marks}` into `<Blobs>`.

For one subject: `tools/track.mjs --box x,y,w,h`, then `<Reticle track />` or `pointAt()`.
