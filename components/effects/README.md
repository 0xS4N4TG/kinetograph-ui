# Effects with taste

Four components that wrap a picture (their `children`, or the `src` photo from `public/`). Each is a Kinetograph `shader` effect in WGSL, so a frame is a pure function of the frame number: noise comes from a hash of the pixel, never a clock. 1920x1080, 30 fps, 5 s. The demos use NASA photos from `components/_assets/photos` (public domain; credits in `CREDITS.md` there), symlinked as `public/photos`.

| Component | Composition id | What it is |
|---|---|---|
| Light Leak | `LightLeak` | A warm leak enters from an edge, swells into a streaked glow (pale core, orange body, red fringe), washes the frame and ebbs. With `toSrc` the cut is made at the peak, inside the glow. |
| Halation | `Halation` | Highlights glow with a soft red-orange halo (two rings of taps, tight and wide), with a gentle breathing, then film grain. Slow push-in. Strong enough to read in a still (strength 1 adds about 1.6x the old glow). |
| Glass Lens | `GlassLens` | A glass disc crosses the picture on an arc. A real ball-lens refraction with slight dispersion, a lit rim, a highlight upper left and a trailing shadow. |
| Film Burn | `FilmBurn` | A transition: a noisy heat front crosses the frame. The first picture warms and chars ahead of it, the front glows white to red, the second picture shows behind it, over-exposed then settling, and embers keep crawling behind it and die away. About 3.5 s of burn. |

## Props

All have `.describe()` in their schemas.

- **LightLeak**: `src`, `toSrc`, `peakFrame`, `duration`, `strength`, `edge` (left, right, top, bottom), `sweep`, `softness`, `streaks`, `grain`, `colors` (`core`, `body`, `fringe`).
- **Halation**: `src`, `strength`, `radius`, `threshold`, `tint`, `tintMix`, `grain`, `grainSize`, `fadeIn`, `push`.
- **GlassLens**: `src`, `radius`, `path` (frame, x, y keys), `ior`, `depth`, `dispersion`, `rim`, `shadow`, `push`.
- **FilmBurn**: `src`, `toSrc`, `startFrame`, `duration`, `angle`, `width`, `roughness`, `scorch`, `flash`, `grain`, `colors` (`hot`, `mid`, `outer`).

## Render

```
node ../kinetograph/packages/cli/dist/cli.js still components/effects/index.tsx 66 --comp LightLeak -o components/effects/out/x.png
node ../kinetograph/packages/cli/dist/cli.js render components/effects/index.tsx --comp FilmBurn -o components/effects/out/film-burn.mp4
```

## Principles used

- **Light Leak**: anticipation (a thin edge glow before it floods), slow in and slow out (sine-squared envelope), arcs (the leak's heart travels along the edge on an eased path), staging (it covers the cut), timing (2.4 s, peak on the cut), exaggeration (the peak is pushed, the shoulders are quiet), restraint (one effect, three colours).
- **Halation**: restraint (halation and grain, nothing else), slow in and slow out (the glow eases on, the push-in eases), secondary action (grain, push-in), appeal (the halo hugs highlights and never greys the shadows).
- **Glass Lens**: arcs (a parabolic path), slow in and slow out (eased crossing), solid drawing (one light, upper left, for highlight, rim and shadow), follow through (the shadow trails the lens), restraint (no bloom or flares).
- **Film Burn**: anticipation (the first picture warms and darkens before it burns), slow in and slow out (the front eases across), follow through (afterglow behind the front, the second picture settles from over-exposed), staging (the glow is the only bright thing), exaggeration (the front's colour is pushed, the pictures are not).

## Notes

Shaders see one layer, so Film Burn is three layers reading one shared field (scorched picture, revealed picture, screen-blended glow). Colours reach WGSL as linear floats via `colorUniforms`.
