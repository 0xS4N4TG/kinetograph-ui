# Templates

A template is a whole ready-made reel: a folder with an `index.tsx` entry, its own `public/` and an `out/` for renders.
Copy one, change the copy and the pictures, render it.

| Template | What it is |
|---|---|
| `cyberpunk-reel`, `wish-reel` | Pop-art edits: halftone, rays, tracked 3D props, grade shaders |
| `save-reel`, `greeting-intro`, `prompt-reply`, `phone-orbit`, `collage-burst`, `wait-ship` | App and UI promos with props for text, colours and pictures |
| `word-flash`, `lyric-reel` | Kinetic type cut to a track |
| `stack-credits` | Three-panel double-exposure opening credits |
| `grid-reel`, `film-intro`, `dostoevsky` | Documentary and history openers |
| `inside` | The launch film and its component library wall |
| `hexed-demo`, `kinetic-type-demo`, `vj-demo`, `plugin-ui-demo`, `paper-photo`, `match-cut`, `scrapline` | Demos of the plugins in `plugins/` |
| `papercut-demo`, `looks-demo` | Demos of `tastes/papercut` and `kit/looks` |

Each taste in `tastes/` also has a `demo` reel.

Render or preview from the repo root, with a Kinetograph checkout next to it:

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/cyberpunk-reel/index.tsx -o templates/cyberpunk-reel/out/cyberpunk-reel.mp4
node ../kinetograph/packages/cli/dist/cli.js studio templates/cyberpunk-reel/index.tsx
```
