# Gates

Run every gate for every beat on full-size gate frames (`scripts/gate.sh`), never on sheets. A gate passes only when
the threshold holds. Write the result per beat as `G5 PASS` or `G5 FAIL: ground shadow 0.25 at the edge, ref 0.55`.

Frames to gate per beat: first frame, middle of each entrance, settled frame, middle of the exit, last frame. Add any
frame the user screenshotted.

| Gate | What | How to measure | Pass |
|---|---|---|---|
| G1 Timing | Cuts, entrances, settles, exits, write-on rate, length | `timeline.py REF CLONE`; count characters per frame on consecutive full frames | every event within ±1 frame; same length |
| G2 Layout | Position and size of every element at the settled frame and on the entrance path | `measure.py bbox` on both at the same frame | within 0.01 W / 0.01 H |
| G3 Colour | Paper, ink, accent, object tint, black beats | `measure.py palette` over the whole frame with the same inks on both (the median of every pixel of each ink, never one picked point); `color` only for a single spot | each ink's median within 6 per channel |
| G4 Type | Family, weight, italic, case, size, tracking, line pitch, alignment; per-letter write-on (scale, lift, rotation, settle frames); per-word fade and blur | gate frames at entrance midpoints, `bbox` per line | same glyph shapes; sizes within 2%; write-on matches frame by frame |
| G5 Shadows | Light direction; kind (ground band under a standing object, cast silhouette for a floating or cropped one); strength at the edge; falloff; whether it shades the text behind; paper beside the object clean | `measure.py shadow` in four directions from the same edge point in both | same direction and kind; edge strength within 0.08; falloff distance within 25%; no darkening on the lit side (an all-round halo fails) |
| G6 Cut-out edges | Fringe, halo, matte noise, edge softness | `measure.py line` across the edge, from object to paper, in 3 places | no dark or light ring wider than 1 px that the reference lacks |
| G7 Legibility and occlusion | Which letters the object hides; depth order | at the settled frame, list the hidden letters of each keyword in both | the same letters (by position in the word) hidden, or fewer; same depth order |
| G8 Glow and bloom | On dark beats: halo width and strength per colour, core colour, softness of the letters | `measure.py line` across a thick stroke out into the black; `color` on the stroke core | halo width within 25%, strength within 0.1, core within 10 per channel |
| G9 Blur and focus | Entrance blur, motion blur, out-of-focus layers, depth of field | `line` across a blurred edge at the entrance midpoint: the 10–90% ramp width | ramp width within 30% |
| G10 Transitions | Kind (cut, wipe, dissolve, push), direction, speed (W per frame), ease, the frames it spans | gate frames at every frame of the transition | same kind and direction; front position within 0.02 W each frame |
| G11 Camera | Push, drift, shake, settle, scale per frame | `bbox` of a static element over the beat | within 1% scale and 0.005 W drift per 30 frames |
| G12 Assets | Silhouette proportions, photographic vs drawn, gloss and reflections, licence | gate frames; asset credits | same silhouette class and proportions within 15%; same rendering class; PD or CC0 with a credit line |
| G14 Poster | The still shown in galleries and cards | the poster frame at the card's real size beside its neighbours | full, readable, on-topic; not empty, flat, half-built or a photo from a banned source |
| G15 Texture | Grain and dust on the ground, halftone or paper in the fills, print noise | `measure.py grain` on the same empty patch in both; `palette`'s texture spread per ink | ground mean within 3, spread within 25%, specks within 50%; each ink's spread within 30% |
| G13 Shading and depth | Anything the reference renders as volume: bead or dot shading, gradients on tiles, dock and card shadows, reflections | gate frame crops at 2x | the same light on the same surfaces; nothing the reference shades is flat |

## The shadow test in detail (G5)

1. Pick an edge point on the object present in both frames (the same anatomical spot: the elbow, the base's left corner).
2. Walk out four ways: down-left, left, up-right, right.
   `measure.py shadow FRAME X Y -1 1 #fdfdfd 0.1` (start inside a dark object; on the edge for a light one).
3. The reference's numbers decide: a shadow on the down-left side only means a directional shadow (light top right).
   Any darkening on the up-right side of the clone that the reference lacks is a halo and fails.
4. For a standing object, also walk down from the base and left along the floor: the ground band's strength at the
   contact and its length.
5. Where the shadow crosses text, sample the text colour inside and outside the shadow in both.

## When a gate cannot pass

Say so to the user with the number: "G12 FAIL: no PD statue with a narrow upright head; the closest is X, which hides
2 letters more". Do not show the clone as finished.
