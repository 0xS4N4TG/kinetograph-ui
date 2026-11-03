# Looks: from measurement to layers

Each look below starts from numbers in the spec (measured with `scripts/measure.py`) and says how to build it. W and H
are the frame's width and height; values scale with the frame, never fixed pixels.

In kinetograph-ui, the explainer family (white paper, letter-hop lead, red blur-fade keyword, cut-out object) already
has these looks built and measured in `tastes/explainer` (its own SKILL.md has the API). A clone in that family imports
the kit instead of re-deriving them, then still passes every gate. The kit has its own owner; report gaps rather than
editing it.

## Shadows (G5)

First decide the light. Almost every reference has one light; the side the shadows fall on gives it away (shadows
down-left = light top right). Every shadow in the film then falls the same way.

| Object sits… | Kind | Build |
|---|---|---|
| on the floor (a chess piece, a can, a phone on a tripod) | **ground** | A thin band at the contact: an ellipse or rect with border-radius, height about 0.02–0.03 H, blurred about 0.012 H, darkest (the measured edge strength, often 0.5–0.55) right at the base, and running off away from the light (0.35 W the long way, a short tail the other). The contact span comes from the cut-out's lowest opaque rows. **No silhouette shadow.** |
| floating, or cropped by the frame (a bust rising from the bottom, an icon, a coin, a card) | **cast** | A black copy of the object's alpha: `filter: brightness(0) blur(b)` on a duplicate (Remotion/DOM) or the same Path/Image with a black fill and `blur()` (Kinetograph). Offset away from the light (often -0.015 W, +0.012 H), blur about 0.025 W, opacity at the measured edge strength (often 0.35–0.45). |
| UI on a surface (dock, card, tile, dot bead) | **stacked** | Two drop shadows, one tight and one wide: e.g. `dropShadow({ y: 2, blur: 2.5, color: '#00000030' })` plus `dropShadow({ y: 9, blur: 22, color: '#00000026' })`, scaled to the measured falloff. Add top-left highlight gradients when the reference shades the surface. |

Rules:
- **Never a symmetric blur round the whole object.** It reads as a glow or a halo, and the paper on the lit side must
  stay clean. CSS `drop-shadow(0 0 …)` and a centred radial ellipse are both this mistake.
- **The shadow's layer order is the reference's.** When the object stands in front of text, the cast shadow is drawn
  after the text, so the letters it crosses get darker. Put the shadow with the object, above the type.
- A shadow fades in with its object's landing and pales while the object lifts off the floor.

## Cut-outs (G6)

- Still images with real alpha only. A matte keyed from video keeps background pixels: a dark or light ring.
- If a matte has a fringe: erode the alpha 2–3 px, then feather 1 px. Check with `measure.py line` from the object
  out over the paper: luma should go straight from object to paper with no dip.
- Match the reference's rendering class: photographic objects with gloss and reflections cannot be stood in for by
  flat drawn shapes (G12).

## Glow and bloom on dark beats (G8)

The look is light coming off a screen, not ink. Measure on the reference: core colour, halo width (the distance from
the stroke edge to where the halo is gone) and halo strength at the stroke edge.

- The text layer, then two blurred copies behind it, drawn additively (screen):
  a tight one (blur about 0.006 W, opacity about 0.9) and a wide one (blur about 0.025 W, opacity about 0.6).
  In Kinetograph, `glow({ radius, color, intensity })` on the text Layer gives one copy; stack two layers for two radii.
- Lift the core colour: a red that is #a24440 on white reads as about #e0606a on black, with near-white in the thick
  strokes.
- A slight overall softness on the type (0.5–1 px at 720 wide) when the reference's letters look out of focus.

## Blur and focus (G9)

- Measure the 10–90% ramp across a blurred edge on the entrance frames; that width is the blur to use, per frame.
- Words that fade in with blur: a blur from the measured start (often about 10 px at 720) down to 0 over the fade.
- In Kinetograph, `blur()` on a Path with many subpaths can render hard outlines. For a soft wash, build it from
  gradient strips (rows of Rects with multi-stop gradients) instead.
- Grids and carousels stay sharp unless the reference blurs them.

## Write-ons (G4)

- Count characters per frame from consecutive full frames. Spaces usually take no time.
- Copy the per-letter pose from the spec: e.g. each letter appears at 0.7 scale, lifted 0.4 em and turned -10°, and
  settles over 3 frames, while the next letter is already appearing.
- If the reference's letters land whole (no partial opacity), do the same: `a = typed - i >= 0.5 ? 1 : 0`.

## Moves

- Exponential ease-outs are common in these references: position(t+1) = target + r · (position(t) - target), with r
  measured from consecutive frames (0.82–0.9 is typical). Use the spec's per-frame table directly when it has one.
- Pushes out of frame are often quadratic ease-ins at different speeds per layer (parallax). Copy each layer's own
  coefficient.
