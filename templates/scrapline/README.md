# Scrapline demos

`<Scrapline>` is now part of the paper plugin (`plugins/paper`, `import { Scrapline } from '@kinetographdev/paper'`):
a hand-drawn border round a cut-out subject, a wobbly marker, pencil, crayon, scribble or brush line, on a sheet of
torn paper behind it, both redrawn a few times a second like hand animation. Its props, line styles, papers and how it
works are in `plugins/paper/README.md` and `plugins/paper/SKILL.md`. This folder keeps the demos.

```tsx
import { Scrapline } from '../../plugins/paper/src/index.js';

<Scrapline trace={{ src: staticFile('matte.mp4'), loop: 177 }} line="pencil" paper="kraft" color="#2b2b30" offset={26} threshold={40}>
  {subject}
</Scrapline>
```

## Files

- `index.tsx`: the demo (compositions `ScraplineDemo` and `ScraplineStill`).
- `posters.tsx`: a 24 s showcase (`ScraplinePosters`): the subject in front of public-domain Internet Archive posters, with
  more posters pinned as torn paper cut-outs (rectangles traced with `{ d }`). Posters, sources and licences:
  `public/posters/` and its `CREDITS.md`; `tools/fetch-posters.sh` regenerates them. Has a synthesised soundtrack.
- `public/subject.mp4`, `public/matte.mp4`: links to the cyberpunk reel's footage and matte (not copies).
- `public/cutout.png`: a 1280x720 PNG with alpha for the still example, from `tools/make-cutout.sh`.

The paper scans that used to sit in `public/paper/` are now inside the plugin (`plugins/paper/textures/`).

## Render

From the `kinetograph-ui` root, with `../kinetograph` built (see the root README):

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/scrapline/index.tsx -o templates/scrapline/out/scrapline-demo.mp4
node ../kinetograph/packages/cli/dist/cli.js render templates/scrapline/index.tsx --comp ScraplineStill -o templates/scrapline/out/scrapline-still.mp4
node ../kinetograph/packages/cli/dist/cli.js still templates/scrapline/index.tsx 90 -o templates/scrapline/out/f90.png
node ../kinetograph/packages/cli/dist/cli.js check templates/scrapline/index.tsx
node ../kinetograph/packages/cli/dist/cli.js render templates/scrapline/posters.tsx -o templates/scrapline/out/scrapline-posters.mp4
```

`ScraplineDemo` is 50 s: five line styles and four papers (white, kraft, binder, cardboard), 2.5 s each, 20 pairs
(style `i % 5`, paper `i % 4`).
`ScraplineStill` is 2 s of a still PNG with alpha: nothing moves but the line and the paper. `out/` is never committed.

## Known limits

- The outline is traced on the first frame of each step, so on moving footage it lags the subject by up to
  `fps / boil - 1` frames. The offset hides it; raise `boil` or `offset` if it shows.
- A subject cut by the frame edge gets its line and paper running off the canvas there (clipped), as expected.
