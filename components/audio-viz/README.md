# Audio visualisers

Stylised waveforms in the manner of a reel on "not the boring default" After Effects visualisers. The method, not the
effect, is what makes them: the same audio drawn several times, each copy in its own style (analog lines, analog dots or
digital bars), colour and slight offset in space and time so they stack into one signal; two glows on top of each other
for the analog bloom; grain over everything.

| Component | Composition id | What it is |
|---|---|---|
| Scope | `AudioScope` | An oscilloscope: a dark graticule, two red line traces either side of a yellow digital trace, condensed type with a script word, a slow push. |
| Plasma | `AudioPlasma` | A white-hot trace inside blue and pale-blue copies under a blue bloom, a playhead, and the running time in huge soft numerals. |

Both are 1080x1920 at 30 fps, 360 frames (the length of the bundled beat).

- The signal is read from the decoded audio (`useAudioData`) each frame by `waveform.ts`, which works like After Effects'
  Audio Waveform effect: `windowMs` of the raw signal centred on the frame, drawn as `samples` points. `level()` gives
  the loudness, which swells the bloom and the frame.
- Every copy is a row in the `layers` prop: `style`, `color`, `y` offset, `height`, `thickness`, `samples`, `windowMs`,
  `delayMs`, `opacity`, `glow`. Add, remove or restyle copies there; everything else (grid, glows, bloom tint, push, type,
  timecode, grain, chromatic aberration) is a prop too.
- Use your own track: put it in `public/` and set `audio`; set the composition's length to the track's.

Measured on the reference: the scope traces 58 px apart (red #fc453d, 4 px core, dark-red bloom to about 40 px), a
digital dot every 13 px, graticule cells of 62 px on #0f0f0f.

`public/beat.wav` is an original 12 s, 120 bpm loop synthesised by `tools/make-beat.py` (numpy): no third-party audio.

Render from the repo root:

    node ../kinetograph/packages/cli/dist/cli.js render components/audio-viz/index.tsx --comp AudioScope -o components/audio-viz/out/scope.mp4

Type-check: `npx --no-install tsc -p tsconfig.json` in this folder.
