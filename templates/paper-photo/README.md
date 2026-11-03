# paper-photo

The showroom for the paper plugin's photo effects (`plugins/paper/`), 1080x1920 at 30 fps:

- `Edges`: one still of `<CutOut>` with each edge style (torn, cut, wavy, sticker).
- `FoldOut`: `<FoldOut>` on a green screen, 2 s, opening from frame 8 with a crinkle on each step.
- `FoldOutDesk`: the same on a grey paper desk.

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/paper-photo/index.tsx --comp FoldOut -o templates/paper-photo/out/fold-out.mp4
node ../kinetograph/packages/cli/dist/cli.js still templates/paper-photo/index.tsx 0 --comp Edges -o templates/paper-photo/out/edges.png
```

`public/subject.png` is scrapline's `cutout.png` (public-domain footage), cropped and padded so the border has room.
Drop in your own picture with alpha to try another. `reference/` holds reference cut-out and fold-out examples
(not committed).
