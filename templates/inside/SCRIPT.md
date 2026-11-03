# Launch film 2 (Kinetograph 0.3): script and shot list (draft 2)

16:9, 1920x1080, 30 fps, about 40–50 s (the voice take sets it). Engine: 0.3.0 (`origin/main`), built in
`../kinetograph-0.3.0`.

**The story.** The first launch film opened on 1891: the Kinetograph made pictures move. This one picks up two years
later. In 1893 Edison built the first film studio, the Black Maria: a tar-paper shed on a turntable that turned to
follow the sun. Blacksmith Scene was shot in it. The film cuts from that studio to ours: Kinetograph Studio, which
follows you. Each thing you ask for opens a world, and the film ends back on the wordmark.

**Grammar, carried over from the first film:** archive film with handwritten captions tracked onto objects (only on
the archive shots), the leader and the 16 mm burn, a CRT, thermal and 1-bit looks, the ink/cream/signal-red palette,
DM Sans for the brand, the same narrator in one continuous take, cuts on the voice's word timestamps, and the fast
opening pace held all the way through. **New in this one:** each world sets its words in its own style (word by
word, on the voice), and the Studio is filmed Screen Studio style.

## Script (one take, local Qwen3-TTS narrator)

| # | Line |
|---|---|
| 1 | In 1893, Edison built the first film studio. The Black Maria. A black shed that turned to follow the sun. |
| 2 | This is ours. Kinetograph Studio. It follows you. |
| 3 | Ask for a chart, and the numbers tell a story. |
| 4 | Ask for a place, and the camera dives in. |
| 5 | A wall of your work. Your app, on every screen. |
| 6 | Then plugins change the whole look. |
| 7 | Hexed rolls a grade. Paper tears it out. VJ puts it on a screen. Brushes paint it by hand. And the words move with your voice. |
| 8 | Talk to the agent. Mark the frame. Hear the cut. Tune every prop. Export. |
| 9 | Still no browser. Every frame, straight on the GPU. |
| 10 | Kinetograph zero point three. Motion pictures, written in code. Try it at kinetograph dot dev. |

## Shots

| Shot | VO | Picture | Words on screen |
|---|---|---|---|
| 01 Leader | — | SMPTE leader runs 3 → 2, the 2-pop, two frames of black. | — |
| 02 Black Maria | 1 | Archive stills of the Black Maria; the shed turns on its track (stills cut and pushed, a sun flare sweeping), then Blacksmith Scene. | Handwritten captions tracked to the shed and the anvil: "1893", "the first film studio", "followed the sun". |
| 03 Reveal | 2 | The anvil's spark flashes to white, and out of the white the area chart draws full frame, the camera riding the line's tip as it climbs to Oct (29,400). Then the camera pulls out: the chart shrinks into Studio's preview, and the whole Studio window settles on its wallpaper (the Studio capture's own frame lines up with the chart's last frame). | "This is ours." in DM Sans as the window lands. |
| 04 Charts | 3 | Studio: the prompt "make the numbers move" types and sends; the camera falls back in through the preview into the donut's orbit, then the sankey flows. | Big counting numerals, chart-label type. |
| 05 Terrain dive | 4 | Pull out to Studio; "take us somewhere" sends; fall into the 3D terrain dive (Alps, FPV plunge, banking round the Matterhorn), then the Dubai→Tokyo arc as a short cutaway. | Map-legend small caps with coordinates and an altitude readout. |
| 06 Work | 5 | The sphere of our own renders, the reel wall spinning to rest, then the three phones. | Thin editorial serif. |
| 07 Plugins | 6 | Studio's Props tab: the plugin cards light up in turn, then cut to the brush card painting itself. | "plugins." painted by p5.brush. |
| 08 Plugin run | 7 | Hexed rolls six looks on Blacksmith Scene and locks; Paper tears the subject onto posters; VJ puts it on a CRT with blob tracking and switches off; p5.brush watercolour and charcoal paint a frame; kinetic captions hang off the tracked anvil. | Each plugin's own type: seed labels, torn keyword, detector boxes, the captions themselves. |
| 09 Studio teardown | 8 | The Studio panels come apart in 3D; the camera visits each on its word: agent chat streaming, markup pins and box, timeline waveform scrub, a Props slider dragged, the Export dialog. | A small label by each panel. |
| 10 No browser | 9 | Struck "browser", a thermal flash through the film's own frames on a strip, the render clock. | "no browser." / the measured render time in digits. |
| 11 End card | 10 | "kinetograph." with the red dot, 0.3, MOTION PICTURES, WRITTEN IN CODE., kinetograph.dev. | As the first film. |

## Sound

- One voice file, never cut, spliced or stretched; the picture is timed to it.
- Sound effects (`tools/sfx.sh`, synthesised, CC0): the 2-pop, projector clatter under the archive, a riser and whoosh on
  every fall into a world and every pull back out, UI clicks and keystrokes on Studio, a shutter tick on each Hexed roll,
  a paper tear, the CRT power-down, a low hit on the wordmark.

## Pictures

- Archive: public domain only, listed in `public/archive/CREDITS.md`.
- Worlds: rendered from the components and plugins (`public/worlds/`, `worlds.tsx`); the spinning globe is out.
- Studio: recorded from Studio 0.3.0 (`public/studio/`, `studio.json`).

## Motion plan

Context: launch film. Weighting: Jakub primary (polish, nothing that looks generated), Jhey secondary (one signature
move a beat), Emil only for restraint: at most two effects on screen at once. All twelve principles apply. Frames at
30 fps. Every frame is a function of the frame; cuts on the voice's word timestamps.

**Signature move:** the pull-out from a world into Studio's preview (and the fall back in). It is the film's idea
("each ask opens a world") made into one camera move, so it carries the film and nothing else competes with it.

Key stills first (each must hold up alone): 1 the Black Maria photo with the roof flap up and "1893" handwritten on it;
2 the chart full frame at Oct 29,400; 3 Studio whole on the wallpaper; 4 the terrain at frame 104 (valley, snow, sky);
5 the reel wall at rest on one card; 6 Hexed locked on #58; 7 the Studio panels apart in depth; 8 the end card.

| Shot | Poses (pose-to-pose) | Timing (frames) | Principles |
|---|---|---|---|
| 01 Leader | 3 → 2 sweep, 2-pop | 1-frame beep, 2 black | 9 timing, 8 secondary (projector clatter) |
| 02 Black Maria | Photo: slow push (60–90) with a sun flare truck across; drawing: the shed turns 20° on its track (24, ease-in-out, arc); Blacksmith Scene | captions word by word, 3-frame stagger, hold 0.3 s a word + 0.5 s | 3 staging, 7 arcs (turn on the track), 4 straight-ahead film weave and grain |
| 03 Reveal | Spark: 2–3 frame white hit. Chart draws full frame with the camera riding the line tip (lead 6 frames ahead of the tip, slight look-ahead). Anticipation: camera eases in 3% (6 frames) before the pull-out. Pull-out 30–36 frames ease-in-out to Studio, motion blur 180° on the fast middle, the window's shadow and rounded corners grow in as it lands; settle 4 frames of 1% overshoot | 2 / ~90 / 6 / 33 / 4 | 2 anticipation, 6 slow in-out, 5 follow through (shadow and corner radius lag the scale by 2 frames), 10 exaggeration (only the overshoot) |
| 04 Charts | Cursor arcs to the prompt (7), types at the recorded rate, click dips the cursor 18% (3 frames); fall in: ease-in only into the cut so it lands at speed; donut orbit, sankey | fall 18–24 | 7 arcs, 6 ease-in into cuts, 1 squash (cursor press only) |
| 05 Terrain | Fall in, then the dive itself carries the shot; altitude readout counts down with the camera (overlap: numerals settle 3 frames after the camera) | dive 180 | 11 solid drawing (real 3D, one sun), 5 overlap |
| 06 Work | Sphere orbit, reel wall spin decelerates onto one card (ease-out, overshoot 2°), phones bank | 24–60 per move | 6, 10 (one overshoot), arrangement rule: animate the ring, not the cards |
| 07 Plugins | Cards light up in turn, 4-frame stagger; "plugins." paints stroke by stroke | stagger 4 | 5 overlap, 4 straight-ahead (brush) |
| 08 Plugin run | Each plugin one beat on its word; cut on the word; Hexed rolls every 7 frames then locks with a 2-frame shutter tick | 7 / roll | 9 timing, 3 one subject a beat |
| 09 Teardown | Panels separate in depth along z (24, ease-out, 3-frame stagger, far panels move less: parallax by depth); camera orbits 12° and visits each panel on its word (push-ins 20, ease-in-out); one light, shadows under each panel | 24 / 20 per visit | 11 solid drawing, 5 overlap, 7 arcs (orbit) |
| 10 No browser | Strike-through draws left to right (10, ease-out); frames race past on the strip; clock counts and stops with a 2-frame hit | 10 / 2 | 9, 10 |
| 11 End card | Panels fly back together (ease-in, at speed into the snap), window shrinks to the wordmark, the red dot lands last with a small squash (volume kept) | 24 / 6 | 1 squash (dot only), 5 follow through, 12 appeal: hold 2 s clean |

**Texture (whole frame, not per element):** film grain and gate weave on archive shots only; Studio and worlds clean;
a slight vignette everywhere. **Flashes:** no more than 3 a second, no full-frame strobe. **Type:** DM Sans for the
brand; handwritten captions only on the archive shots; each world's own face elsewhere.
