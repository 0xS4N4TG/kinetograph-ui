# kinetic-type-demo

The kinetic-typography plugin's showroom.

- `styles.tsx`: `<Captions>` in each of the fourteen styles on a hook line ("keep **watching** this,") and a caption
  ("it gets better.") over a talking head. `Styles` plays them all at 9:16 (35 s), `Wide`
  plays `cinematic-caps` and `side-note` at 16:9 beside the subject (followed through its matte with `subjectFrom`),
  `Fonts` sets the hook in each of the plugin's 17 fonts in turn, 1.5 s each, its name in the corner.
  `Style` and `StyleWide` play one look named in the props, for stills. `public/subject.mp4` and `public/matte.mp4`
  are links to the cyberpunk reel's footage (not copies).
- `index.tsx`: `<HandCaptions>` on Blacksmith Scene (1893, public domain): `Tracked` hangs "In 1891,
  the Kinetograph learned to move." off the anvil (`track/blacksmith.json`), `Centred` sets it low.

The word timings are typed in; a real film takes them from the voiceover's timestamps with `wordsFrom`.

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/kinetic-type-demo/styles.tsx --comp Styles -o templates/kinetic-type-demo/out/styles.mp4
node ../kinetograph/packages/cli/dist/cli.js render templates/kinetic-type-demo/styles.tsx --comp Fonts -o templates/kinetic-type-demo/out/fonts.mp4
node ../kinetograph/packages/cli/dist/cli.js still templates/kinetic-type-demo/styles.tsx 19 --comp Style --props '{"name":"highlighter"}' -o out.png
node ../kinetograph/packages/cli/dist/cli.js render templates/kinetic-type-demo/index.tsx --comp Tracked -o templates/kinetic-type-demo/out/tracked.mp4
```

Frame 19 is the hook settled and 62 the caption settled (`CHECK`, from `checkFrames`).
