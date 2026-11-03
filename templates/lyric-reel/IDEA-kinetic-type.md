# Idea: a kinetic typography package

Not started. A note on turning this reel into a reusable kinetic-type block (`kit/kinetic-type/`, or a package such
as `@kinetographdev/kinetic-type`), with `lyric-reel` as its first user rendering unchanged through it.

Not a Kinetograph "plugin": those (`@kinetographdev/gsap`, `anime`, `motion`, `p5-brush`) only seek an outside
animation library to the frame. This is a component library, like `kit/`.

## Already reusable (`type.tsx`)

- `Word`: Helvetica-style type (Arial Bold), silver or flat face, thin edge; arrives letter-spaced and dim, closes
  up and brightens letter by letter.
- `Plane` + `rigAt`: words on nulls in 3D (position, depth, own turn) seen by one keyframed camera (pan, zoom,
  roll, turnY, turnX, dolly), motion blurred.
- `Sky`: parallax stars with four-point flares, streaks when the camera moves, bokeh when out of focus; `dark` for
  the orange band's dust.
- Four looks: night stack (shot A), orange band with letterbox (B), clouds (C), star finale (D).

## What it would take

1. **Auto-layout.** Positions are hand-placed per shot for a fixed word count. Take lines of words and build
   stacks, staggered rows or scattered words, sized to the text.
2. **Timing from timestamps.** Word times are the reference's frames. Take word timestamps instead (LRC, a JSON
   transcript, or whisper output run on your own audio) so words land when sung.
3. **Camera presets.** Camera keys are tuned per shot. Make each look a preset ("stack and drop", "pan the band",
   "orbit", "travel the line") that builds its keys from where the words were laid out.
4. **One prop surface**, e.g.

   ```tsx
   <KineticLyrics words={timedWords} looks={['night', 'band', 'clouds', 'night']} cuts={[0, 155, 262, 352]} font={...} />
   ```

1 and 3 are most of the work.
