# Templates

A template is a whole ready-made reel: a folder with an `index.tsx` entry, its own `public/` and an `out/` for renders.
Copy one, change the copy and the pictures, render it.

| Template | What it is |
|---|---|
| `save-reel`, `greeting-intro`, `prompt-reply`, `phone-orbit`, `collage-burst`, `wait-ship` | App and UI promos with props for text, colours and pictures |
| `word-flash` | Kinetic type cut to a track |
| `stack-credits` | Three-panel double-exposure opening credits |
| `grid-reel`, `film-intro`, `dostoevsky` | Documentary and history openers |
| `inside` | The launch film and its component library wall |
| `hexed-demo`, `kinetic-type-demo`, `vj-demo`, `plugin-ui-demo`, `paper-photo`, `match-cut`, `scrapline` | Demos of the plugins in `plugins/` |
| `papercut-demo` | Demo of `tastes/papercut` |

Each taste in `tastes/` also has a `demo` reel.

Render or preview from the repo root, with a Kinetograph checkout next to it:

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/word-flash/index.tsx -o templates/word-flash/out/word-flash.mp4
node ../kinetograph/packages/cli/dist/cli.js studio templates/word-flash/index.tsx
```
