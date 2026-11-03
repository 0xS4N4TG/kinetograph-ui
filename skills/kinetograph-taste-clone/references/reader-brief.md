# Brief for a frame-reading agent

Spawn with `model: "sonnet"`, `effort: "medium"`, one agent per beat range, at most 5 at a time. Fill the
placeholders. The agent writes its section to a file; the main model merges and checks it.

```
You are writing one section of a motion spec for a 1:1 clone of a reference video. Precision is the job: every value
you write will be copied into code and checked against the reference frame by frame.

Reference: <path> (<W>x<H>, <fps> fps). Your range: frames f<a> to f<b>, beat(s) <names>.
Frames: <WORK>/ref/full/fNNNN.png (0-based, full size) and <WORK>/ref/sheets/sNN.png (30 frames per sheet, sheet NN =
frames 30·NN … 30·NN+29, left to right, top to bottom). Timeline (cuts, moves): <WORK>/ref-timeline.json.
Measuring tool: python3 <skill>/scripts/measure.py (color, line, bbox, shadow; run it with no args for usage).

Do this:
1. Look at EVERY frame in your range on the sheets, in order. Do not skip or sample. Scripts may measure, but they do
   not replace looking: list the sheets you opened in your report. A section written from scripts alone is sent back.
2. For every element (text line, word, object, shape, background), record what it is, where it is at rest (as fractions
   of W and H, measured with measure.py bbox on a full frame), its z order, and when it appears and leaves.
3. For every motion, write a per-frame table of its position (and scale, rotation, opacity, blur) for every frame of
   the fast part, then where it settles. Read these off full frames. Say what curve it is (exponential ease-out with
   ratio r per frame, quadratic ease-in, linear) and fit the number.
4. For text: characters per frame, the pose of a new letter and how many frames it takes to settle; for words that fade,
   the start frame, frames to opaque, and blur at the start.
5. Shadows: for each object, walk measure.py shadow out from its edge in four directions (down-left, left, up-right,
   right) on the settled frame and report the numbers. Say whether it is a floor band, a cast silhouette, or none, and
   whether it darkens the text it crosses.
6. Dark beats: halo width and strength of the type (measure.py line from inside a thick stroke out into the black),
   and the stroke's core colour.
7. Edges of cut-outs: any fringe or halo (measure.py line across the edge).
8. Occlusion: at the settled frame, exactly which letters of each word are hidden and by what.
9. Transitions in and out: kind, direction, the frames, the front's position per frame.

Write your section in the format of <skill>/references/spec-template.md (section 2 for your beats, plus anything for
section 0 you observed) to <WORK>/spec-<a>-<b>.md. Mark any value you could not measure as (est) and say why. Do not
describe feelings ("smooth", "punchy"); give numbers. Report back only the file path and a list of open questions.
```
