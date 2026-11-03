# match-cut

The showroom for the paper plugin's `<MatchCut>` (`plugins/paper/`): one composition per preset (`Web`,
`Broadsheet`, `Crumpled`, `Clean`), 1080×1920, 30 fps, 5 s, keyword "Super Bowl", a paper flick on every cut. With
screenshots listed in `shots.ts` (images under `public/shots/`, not committed) there is a `Screenshots` composition
too, drawn with `showKeyBox` so a still shows the hint (blue) and where it snapped (red).

`Web` uses the `web` preset: article and blog pages plus the app screens (`tweet` feed, `reddit` post, `comments`
thread, each light or dark), filmed off a screen (`screen` 1: LCD subpixels, a slight lens barrel, the grid going soft
off the keyword's line). The other three are printed pages on paper.

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/match-cut/index.tsx --comp Web -o templates/match-cut/out/web.mp4
node ../kinetograph/packages/cli/dist/cli.js still templates/match-cut/index.tsx 0 --comp Screenshots -o templates/match-cut/out/snap.png
```

`reference/` holds the reference clips (not committed). Lint reports `text-overflow-canvas` on the page copy: it runs
off the frame on purpose.
