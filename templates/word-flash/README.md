# word-flash

A black-and-white type spot for brands, cut on every hit of its track: one word or a two-word lockup per cut, the
background swapping black and white at each one. 1080×1920, 30 fps, 9.4 s. Timed frame by frame to a reference
reel: cut frames, ink positions, sizes and every settle curve are measured off its frames.

- **Intro**: a small word rises out of a grainy blur, a big word lands under it with a short smear, a third word
  slides in from the left, a fourth lands under that, a fifth pushes in big.
- **Run**: one word per cut, landing 1.2× large and settling, under film dust. The first bends in as a thin ribbon;
  the second drops the dot onto its i.
- **Outro**: the last word types on in stages, holds, blurs away, and the frame ends blank.

## Make it yours

- Words: `script.ts` (`intro`, `run`, `outro`). The run is one word per cut, so the number of run words plus the
  intro, outro stages, hold and blank must equal the number of cuts.
- Track: put it at `public/audio.m4a`, then get its cuts and paste them over `CUTS`/`END` in `script.ts`:

  ```sh
  node templates/word-flash/tools/cuts.mjs path/to/track.mp3 --shots 24
  ```

  It picks the strongest hits at least `--gap` frames apart (6 by default). On the reference's own audio it lands
  within two frames of the reference's cuts.
- Type: `FONT` in `lib.tsx` (Figtree 700, −0.06 em). The reference sets a Proxima-style sans; Figtree is the closest
  free match. Positions are ink boxes, so another face lands in the same places.

## Files

- `index.tsx`: the shots, chosen by the cut the frame falls in.
- `lib.tsx`: type and ink measurement, the `Word` placed and scaled by its ink box, the entry shaders (grainy blur,
  smear, ribbon, directional blur), dust.
- `script.ts`: copy and cuts. `tools/cuts.mjs`: cuts from audio.

`public/audio.m4a` (the reference's audio), `reference/` and `out/` are not committed.

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/word-flash/index.tsx -o templates/word-flash/out/word-flash.mp4
```
