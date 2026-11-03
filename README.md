# kinetograph-ui

Components, templates, tastes, plugins and skills for [Kinetograph](https://github.com/0xS4N4TG/kinetograph), the
browserless video engine. MIT licensed. Third-party footage, textures, fonts and music keep their own terms; where the source is known it is
noted in a `CREDITS.md` or `SOURCES.md` next to the files.

## Layout

| Folder | What |
|---|---|
| `components/` | Motion components with zod props, by kind: `grids`, `carousels`, `charts`, `showcase` (devices), `backgrounds`, `maps`, `audio-viz`, `effects`. Index and render commands in `components/README.md` |
| `templates/` | Whole ready-made reels, plus demos of the plugins. See `templates/README.md` |
| `tastes/` | Whole styles (`vox`, `print`, `archive`, `papercut`, `collage`, `explainer`, `pale-whip.ts`), each with a `demo` reel |
| `plugins/` | `hexed`, `paper`, `kinetic-typography`, `vj`: Studio panels and components, each its own package |
| `skills/` | Agent skill: `kinetograph-taste-clone` |
| `kit/` | Blocks the templates and tastes share: camera, ink, timing, UI cards, film looks |

## Use a component

With a Kinetograph project:

```sh
npx kinetograph add <name>        # `add --list` shows what exists
```

Or copy the folder (or one file and what it imports from `kit/`) into your project's `src/` and import it.

## Render here

These expect a Kinetograph checkout next to this repo (`../kinetograph`, built with `npm ci && npm run build`):

```sh
ln -s ../kinetograph/node_modules node_modules   # once
node ../kinetograph/packages/cli/dist/cli.js render templates/cyberpunk-reel/index.tsx -o templates/cyberpunk-reel/out/cyberpunk-reel.mp4
```

`out/` and `reference/` are never committed. Some media needed by a few templates is not in the repo (rendered clips,
voice takes, licensed textures); the tool scripts in each `tools/` folder rebuild what they can.

## Skills

```sh
npx skills add 0xS4N4TG/kinetograph-ui
```

- `kinetograph-taste-clone`: reads a reel frame by frame, writes a measured spec and builds from its numbers, or
  distils its taste into a reusable style.
