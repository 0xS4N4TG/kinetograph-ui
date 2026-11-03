# Misses: every rejection so far, and the gate that catches it now

Read this before a build. Each line is a clone the user rejected, what was actually wrong, and where the skill now
checks for it. Add to it after every rejection.

| Reference / clone | What the user said | What was wrong | Gate |
|---|---|---|---|
| Explainer pin 1119, clone A | "not the same" (kit built first) | Built from 5 fps contact sheets; the write-on, settles and shadows were invisible at that rate | Rule 1, G1, G4 |
| Explainer pin 1119, clone A | "shadows not the same" | A CSS drop-shadow read as a faint halo all round; the reference has a directional cast shadow down-left at 0.4–0.46, gone by about 0.03 W, drawn over the red text | G5 |
| Explainer pin 1119, clone A, chess | "shadows not the same" | A big blurred halo round the pieces and a symmetric, too-dark floor ellipse; the reference has only a thin floor band at the contact, darkest 0.55, running left 0.35 W | G5 |
| Explainer pin 1119, clone A, stars | — | Uniform halo round the corner stars; the reference casts a directional shadow 8–10 px down-left. Arms too fat; the reference's taper to needle tips | G5, G2 |
| Explainer pin 1119, clone A, Fred | — | Dark fringe from a video matte (keyed film frames) | G6, rule 4 |
| Explainer pin 1119, clone A, beat 1 | "wouldn't happen if built from scratch" | Fred's wide head covered the middle of the keyword, so "frame"/"counts" didn't read; the reference statue hides only the tail of the last line | G7, G12, rule 4 |
| Explainer pin 1119, clone A, chess | — | Drawn flat pieces stood in for glossy photographic ones with a reflection | G12 |
| Explainer pin 1119, clone A, black beats | "should be glowing" | Flat #a24440 with no bloom; the reference's type blooms (red core lifts toward #e0606a, red halo about 0.02 W at 0.6–0.8; white halo about 0.01–0.015 W) | G8 |
| LaunchFilm (product film) | "the clutter and patches is what makes it good" | The dot matrix was evenly spread; the reference has clustered bands and empty patches, and a 14 px dot pitch (ours was 19.5) | G2, G13 |
| LaunchFilm, dots | "why ours look flat? no shadows?" | Flat discs; the reference's dots are beads with a rim and a top highlight | G13 |
| LaunchFilm, dock | "why is ours flat, shadows not focused" | One weak shadow; the reference stacks a tight and a wide shadow and shades the tiles | G5, G13 |
| LaunchFilm, headline | "typing not that sharp" | Letters faded in; the reference's letters land whole | G4 |
| LaunchFilm, headline | "ours doesnt slide left" | The drift before the exit was missing | G1, G11 |
| LaunchFilm, transition | "a mirror-like jump, not this flatish" | A hard mosaic stood in for a soft streaked wash | G10 |
| LaunchFilm, posters | "bruh again this not accurate" | Posters scattered and rotated; the reference spins them on a drum (depth-sorted, scale by depth) | G2, G10 |
| Any component | "no more NASA photos" | NASA stills reused everywhere; off-topic for the references | G12: PD/CC0 stills on-topic for the reference, fetched via a real browser |
| Hybrid AI reel, first live run (2026-11-03) | timeline.py found 4 of 7 hard cuts (missed the reframe cuts f298, f362 and the whip cut f716); its move pairing called the opening 4 events off on a drifting background; two readers measured by script without reading the sheets | G1: the cut rule now also catches a jump that drops straight back; G1 also prints the per-frame change curve and brightness gap; reader-brief rule 1 requires the sheets read and listed |
| BRING THE NOISE poster loop (2026-11-03) | letters set in a font with jitter could not match hand-drawn, lumpy lettering; user: "trace over it" | Trace mode: `trace.py` vectorises the frames into a private study (gated: 6.8-15 mean diff vs 18-50 for the font); shipped pieces redraw our words by hand (p5.brush) |
| BRING THE NOISE, colours and ground (2026-11-03) | colours eyeballed and one-point picks: letters 25% dark (p5.brush darkens its marks), halftone too heavy (spread 21 vs 8), ground flat #050503 vs the reference's grained #0b0b09 | G3 now uses `measure.py palette` (median of every pixel per ink); new G15 Texture with `measure.py grain` |
