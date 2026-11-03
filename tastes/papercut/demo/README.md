# papercut-reel

"How a chatbot answers you": a 28-second reel in the papercut taste (tastes/papercut). Render:

    python tastes/papercut/tools/sound.py sfx tastes/papercut/demo/public/sfx
    python tastes/papercut/tools/sound.py bed tastes/papercut/demo/public/bed.wav 28.4
    node ../kinetograph/packages/cli/dist/cli.js render tastes/papercut/demo/index.tsx --comp PapercutReel --concurrency 4 -o tastes/papercut/demo/out/papercut-reel.mp4

`index.tsx` holds the timeline, banners, captions and sound cues; `scenes.tsx` the eight sets. `public/` links the kit's
`bg`, `fonts` and `assets` and holds the rendered sounds.
