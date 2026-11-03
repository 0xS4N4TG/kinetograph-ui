# SPEC.md template

One file per reference, next to it. Frame numbers are 0-based (`f12`). Positions are fractions of W and H. Every value
that came from looking rather than measuring is marked `(est)`; the gates need measured values.

```
# Spec: <what it is> (<W>x<H>, <fps> fps, <N> frames)

Method: <who read which frames, at what size; which values were measured with measure.py>

## 0. Global
- Background per beat kind (colour, texture, vignette yes/no, grain yes/no)
- Palette: every ink with hex, where it is used, how it was sampled
- Type: families, weights, italic, case, tracking, line height, size as a fraction of W per role
- Light: which way the shadows fall; the shadow kind per object class (ground / cast / stacked) with numbers
- Depth order: background < … < … (what is in front of what, and which letters each object hides)
- Recurring behaviours, each with exact numbers: write-on (chars per frame, per-letter pose and settle), word fades
  (frames, blur start), exits (kind, speed in W per frame, ease), entrances (curve, ratio per frame, overshoot or not)
- Camera: push, drift, shake per beat; or "none"

## 1. Beat table
| # | Frames | Content | Enter | Exit | Hold drift |

## 2. Per beat
### B<n> (f<a>-f<b>): <name>
- Each element: content, role, position and size at rest, z order
- Its entrance as a per-frame table (at least every frame of the fast part), then the settle
- Its shadow: kind, direction, edge strength, falloff, what it shades
- Its exit, frame by frame
- Occlusion: which letters are hidden, by what, at the settled frame
- Blur / glow / focus values per frame where they change

## 3. Assets
| Slot | Reference object | Silhouette and proportions | Rendering (photo / drawn) | Sits (floor / cropped / floating) | Our replacement |

## 4. Open questions
Anything the readers could not settle, with the frames to look at.
```

The spec is done when every row of `gates.md` has an answer for every beat.
