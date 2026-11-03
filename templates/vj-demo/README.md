# vj-demo

The vj plugin (`plugins/vj`) on public-domain archive film: Blacksmith Scene (1893), Fred Ott's Sneeze (1894)
and a 1927 parade, the clips the Kinetograph launch film uses.

| Composition | What |
|---|---|
| `Blobs` | Blob tracking over a 1-bit picture: boxes, ids, coordinates, links, some boxes inverted |
| `Thermal` | Blob corners and a chain over a thermal camera |
| `Crt` | Fred Ott on a CRT that switches off at the end |
| `Vhs` | The parade on a worn tape, the tracking band drifting down |
| `PopArt` | Fred Ott cut to an anime poster and back |

`halftone.tsx` has `Poster` (Fred Ott printed whole, blue on yellow; cut out in dots on a blue ground with a title
behind him; two panels with their own ink pairs, an off-register shadow and a title over, cutting to another pair) and
`Look` (`halftonePoster()` on the parade).

`fragments.tsx` has `Fragments`: seven clips seen through detector boxes, tiles of sky and round holes on planes at
different depths, with a camera flying through them, and `Inspect` (prop `piece`), one piece whole with its box ids and
a grid in clip pixels, the view the boxes were named and placed from. The colour clips in `public/` are links to the wish
reel's footage. `track/fragments/` holds the spot tracks, made with `node plugins/vj/tools/track.mjs --in
templates/vj-demo/public/<clip>.mp4 --size 1440x1080 --box <patch> --out templates/vj-demo/track/fragments/<clip>-<who>.json`;
the boxes and their names were read off `Inspect` stills by the agent editing it.

The tracks in `track/` were made with `node plugins/vj/tools/blobs.mjs --in templates/vj-demo/public/<clip>.mp4
--out templates/vj-demo/track/<clip>-blobs.json`. Fred Ott's matte and track were made with `node plugins/vj/tools/matte.mjs
--in templates/vj-demo/public/fred.mp4 --out templates/vj-demo/public/fred-matte.mp4 --track
templates/vj-demo/track/fred-person.json`.

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/vj-demo/index.tsx --comp Blobs -o templates/vj-demo/out/blobs.mp4
node ../kinetograph/packages/cli/dist/cli.js render templates/vj-demo/fragments.tsx --comp Fragments -o templates/vj-demo/out/fragments.mp4
node ../kinetograph/packages/cli/dist/cli.js render templates/vj-demo/halftone.tsx --comp Poster -o templates/vj-demo/out/halftone.mp4
```
