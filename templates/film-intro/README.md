# film-intro

A film opening, timed to a measured quiz-landing-page opening. An old film fades up over the paper as a field of
soft ink dots and pushes slowly in. A thin serif line types itself across the middle, drawn into the film as its
negative: ink over the light and paper over the dark. It lifts away in a blur, a second line types and holds, and
the whole film lifts and blurs away to a title. It runs 7 s at 1920x1080 and 60 fps (`FilmIntro`).

## How it is made

- `film.ts` dithers the film as the reference page does:
  - each picture is cut to cover the frame and scaled to `ditherWidth` dots across (942);
  - it gets ±7 of fixed noise, read from a new offset each picture of the video;
  - Floyd–Steinberg dithers it to the two tones, which are stretched back over the frame and softened.
- The line is the film's negative. Around the line, the film is box-blurred (9 px) and each pixel of the glyphs takes
  the ink or the paper by the blurred film under it (`toneAround`). The glyphs are a track matte over that tone
  picture, so their blur, lift and fade come through.
- The timings are the reference's own (see the comment at the top of `index.tsx`):
  - the film fades in over 0.8 s and pushes in to 1.12× over 6 s;
  - each line types at 0.044 s a letter on an arccos curve;
  - the lines hold for 1.3 s and 0.7 s and leave in 0.42 s;
  - the film leaves over 0.9 s;
  - the title fades up 10 px.

Kinetograph renders each frame from its frame number. The film, the typing and the dither all read the same time, so
nothing drifts, however long a frame takes.

## Props

Everything on screen is a prop: `line1`, `line2`, `title`, `phonetic`, `lead`, and `film` (`src`, `start`, `rate`).

The type props are `display` (a Google family), `displayFile` (a local font file), `ui`, `lineWeight`, `lineSize`,
`titleSize` and `titleTop` (474 centres the title block; the reference sets 120). The rest are `ditherWidth`, `zoom`, `pace`, `paper` and `ink`.

The default display face is Instrument Serif, the closest Google font to the reference's face. Instrument Serif comes
in 400 only, so the default line weight is 400; the reference sets 200.

## The default film

`public/film.mp4` is public-domain archive film cut on the reference's beats and graded pale, made by
`tools/make-film.sh`:

- Blacksmith Scene (1893)
- Fred Ott's Sneeze (1894)
- a 1927 parade
- shot_031 of a US National Archives reel (MAAG, Tuy Hoa, 1960s)
- Eadweard Muybridge's *The Horse in Motion* (1878, Library of Congress), cut into the silhouettes in `public/film/`

## Checking against the reference

`reference/` and `public/ref/` are never committed. They hold the reference's film and display face, and a screen
recording of the page:

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/film-intro/index.tsx --comp FilmIntro \
  --props templates/film-intro/reference/props-1to1.json --encoder libx264 --crf 14 \
  -o templates/film-intro/out/film-intro-1to1.mp4
```

`out/compare.mp4` puts that render beside the recording. The recording's text drifts up to about 0.5 s late against
its own film by the second line. The page's animation clock fell behind its video while it dithered, so that drift
is the recording's, not the design's.

## Render

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/film-intro/index.tsx --comp FilmIntro \
  --encoder libx264 --crf 14 -o templates/film-intro/out/film-intro.mp4
```
