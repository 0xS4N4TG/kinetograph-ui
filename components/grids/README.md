# Grids: eight arrangements of photos with a camera move

Eight reusable components that lay photos out by one rule and move a camera through them. Each is an exported React
component with a zod schema (every prop has a `.describe()`, so Studio builds controls from it), defaults, and a demo
composition. Photos are the public-domain NASA set in `../_assets/photos` (credits there), reached through
`public/photos` (a symlink).

The shared engine is `kit.tsx`: a hand projection (a card's centre is projected with a perspective camera, its tilt is
the layer's own `rotateX` / `rotateY` / `rotation` under a scene `<Camera>` of the same focal length), depth sorting,
optional depth of field (blur by distance from a focus plane), fog, grain and a quiet caption. Every grid is sharp by
default, like Grid Builder: no depth-of-field blur and no motion blur unless `aperture` or `motionBlur` is turned up. Everything is a function of the frame number. Type is Geist.

| Composition id | Component (file) | Arrangement | Camera |
|---|---|---|---|
| `GridRect` | `Rectangular` (`rectangular.tsx`) | Wall of cards on one plane | Opens full frame on one photo, pulls back as each ring of the wall lands, holds, winds up, then a whip-pan to a second hero that steps forward with the focus landing on it (overshoot and settle) |
| `GridRadial` | `Radial` (`radial.tsx`) | Concentric rings, a tunnel in depth | Rings assemble and step under a long lens, a wind-up, then a dolly zoom (vertigo): the eye moves in while the focal length shortens, the held ring keeps its size, the rings in front swell past; focus racks from the near ring to the held one |
| `GridPath` | `PathGrid` (`path.tsx`) | A string of billboarded cards on a 3D curve (`wave`, `triangle`, `square`, `infinity`) | Rides the path like a dolly just behind the lead card (cards open as it nears them), slows into the lead and holds, a dip, then a crane up and out to the whole curve, focus landing on the lead |
| `GridSpherical` | `Spherical` (`spherical.tsx`) | Double-sided cards on a sphere | Starts with the eye inside looking out at the hero's inner face, a wind-up push, then a fast pull straight back through the shell (near cards fade) while orbiting half a turn to the hero's outside face; push in and the focus lands on it |
| `GridForwardOrient` | `ForwardOrient` (`forward-orient.tsx`) | Ring on a tilted turntable, each card turned to face its direction of travel | One slow stroke of the ring while the camera orbits and closes in |
| `GridCenterOrient` | `CenterOrient` (`center-orient.tsx`) | Grid where every card turns to point at the centre | Twist travels outward from the centre into a rosette; the camera rolls and pushes in |
| `GridPathOrient` | `PathOrient` (`path-orient.tsx`) | Cards on a rounded triangle, turned to the path tangent | Looks down and orbits as the train advances; cards swing through the corners |
| `GridFaceScreen` | `FaceScreen` (`face-screen.tsx`) | Carousel ring, every card billboarded to the screen | Steps one card at a time with holds; camera lifts and closes in |

The orientation modes are a property of the item, not the layout: `Item.orient` in `kit.tsx` takes a 3x3 matrix
(card to world) or `'camera'` (face the screen). `ForwardOrient`, `CenterOrient` and `PathOrient` set the turn from the
direction of travel, the direction to the centre and the path tangent. `Spherical` uses the sphere's normal.

## Props (shared)

`photos` (file names in `public/photos`, used in turn), `caption`, `showHud` (caption and a `NN / total` counter naming
the card nearest the middle), `aperture` (depth-of-field blur, px; 0, the default, keeps every card sharp), `drift` (handheld drift, 0 for locked
off), `radius` (card corner radius), `colors` (`ground`, `ground2`, `ink`, `edge`). Each component adds its own: count,
radius or spacing, card size, camera distances and angles, stagger, timing (see the schema in each file).

## Principles each uses

- `GridRect`: staging (one card, then the wall), slow in and slow out, overlap (ripple staggered by distance), arcs
  (yaw and truck are one curve), solid drawing (fog, depth of field and perspective agree), holds at both ends.
- `GridRadial`: overlap and follow-through (rings start 9 frames apart), slow in and slow out, arcs, staging (focus
  picks the ring), solid drawing (rings at different depths give parallax on the swing).
- `GridPath`: follow-through and overlapping action (the train stretches and closes), arcs, slow in and slow out,
  staging (auto focus follows the leader), solid drawing (the train swings in z).
- `GridSpherical`: staging (ends on one card), anticipation (a held beat before the orbit), arcs (a full orbit is a
  circle), slow in and slow out, overlap (equator leaves first), solid drawing (real back faces, dimmed).
- `GridForwardOrient`: arcs, slow in and slow out, solid drawing, staging (focus rests on the near cards), secondary
  action (orbit and drift), overlap (cards arrive one after another).
- `GridCenterOrient`: follow-through (the twist travels outward and settles), exaggeration (the rosette is the key
  pose), staging (the unmoving centre anchors it), slow in and slow out, arcs (roll and push).
- `GridPathOrient`: arcs and follow-through (corners are turned by the path itself, trailing cards turn later),
  overlap, slow in and slow out, solid drawing.
- `GridFaceScreen`: anticipation and holds (each step eases in, moves, settles, rests), slow in and slow out, solid
  drawing (depth sorts, scales and blurs agree), staging (front card is the subject), restraint (one move at a time).

All of them also use handheld drift (straight-ahead action) under 1% of the frame, and one grain over the whole frame.

## Run

From the repo root:

```
node ../kinetograph/packages/cli/dist/cli.js still components/grids/index.tsx 90 --comp GridSpherical -o components/grids/out/x.png
node ../kinetograph/packages/cli/dist/cli.js render components/grids/index.tsx --comp GridSpherical -o components/grids/out/GridSpherical.mp4
cd components/grids && npx --no-install tsc -p tsconfig.json
components/grids/sheet.sh GridRadial 20 60 100 140 180   # contact sheet of stills to out/GridRadial-sheet.png
```

1920x1080 at 30 fps. Durations: `GridRect` 210, `GridRadial` 210, `GridPath` 210, `GridSpherical` 240,
`GridForwardOrient` 210, `GridCenterOrient` 210, `GridPathOrient` 210, `GridFaceScreen` computed from its steps.


## Camera notes (round two)

The camera moves are choreographed beats with anticipation, overshoot and settle, and two optional blurs that are off by default: rack focus (`aperture`) and camera motion blur (`motionBlur`; `Stage` `shutter`, switched on by `shutterFor` only while the screen speed is high). New kit helpers: `lookFrom` (aim from an eye point), `eyeOf`, `shutterFor`, `rack`, `Item.cull` (one-sided card, so a card can be drawn once per face), `look.near` (cards fade as the eye passes through them). New props: `motionBlur` on the four rebuilt components, `insideFocal` (Spherical), `heroCol`/`heroRow` (Rect), `rideSide`/`rideBehind`/`craneHeight` (Path), `heldRing` (Radial). `GridForwardOrient` rides low with the first card then cranes up and out to the tilted plate (focus stays on the riding card); `GridCenterOrient` opens full frame on the centre card, pulls back and rolls with the twist, then dives back to the centre; `GridPathOrient` chases the leader low (yaw and roll follow its heading through the corners) then cranes out to the loop; `GridFaceScreen` comes down from high, trails each step by a beat, winds up and pushes onto the front card. All four got `motionBlur` (plus `chaseDistance` on the two chase shots).
