# collage-burst

A 4.4 s UI promo (measured at 1280x720, 30 fps), built in 1920x1080 at 30 fps, 130 frames. On black
a wordmark fades in and pulls back; a cluster of screenshot cards bursts out of one point while the camera flies in;
the cards settle into a dense wall that drifts and then whips off to the right; and big white type on black says
"One", then "One subscription.", cuts to "Endless", then "Endless videos."

Nothing from the reference ships. Every card is drawn in code (document, terminal, chat, input, photo collage, list,
and so on) with abstract gradient "photos". The default brand is "Kinetograph".

Composition id: `CollageBurst`.

## Props

| Prop | Default | What |
|---|---|---|
| `brand` | `"Kinetograph"` | Wordmark text, and the "<brand> is installed" blue card |
| `brandSuffix` | `""` | Second word of the wordmark; `""` for none |
| `lines` | `["One subscription.", "Endless videos."]` | The two tagline phrases. Each phrase's first word shows alone, then the line completes |
| `sansFont` | `"Geist"` | Google Fonts family for the wordmark, the tagline and the cards' UI text |
| `monoFont` | `"Geist Mono"` | Google Fonts family for the terminal card |
| `serifFont` | `"Noto Serif"` | Google Fonts family for the small serif text on the chat and far-left cards |
| `background` | `"#000000"` | Canvas colour |
| `textColor` | `"#ffffff"` | Wordmark and tagline colour |
| `accent` | `"#3b82e6"` | The blue card and the small buttons |
| `paper` | `"#f7f6f2"` | Paper colour of the pale cards |
| `dark` | `"#111113"` | Dark card colour |
| `images` | `[]` | Your own screenshots or photos, as `staticFile` paths (`"shots/home.png"`, files in `public/` next to `index.tsx`). They fill the photo cards and the screens of several UI cards, in turn. Empty: all drawn |
| `cardTexts` | `{}` | Partial override of the words on the cards (`ship`, `built`, `caption`, `command`, `docBody`, and so on; see `CardTexts` in `theme.tsx`) |
| `seed` | `7` | Seeds the tilt and timing jitter of the burst |

## Files

| File | What |
|---|---|
| `index.tsx` | Composition, camera curves (zoom, pan, whip), wordmark, tagline timing |
| `cards.tsx` | The drawn screenshot cards (about 30 layouts) and the abstract photos |
| `wall.ts` | Each card's rest size, stacking order and screen path (keys read off the reference, plus the shared pan) |
| `tracks.ts` | The screen paths of the cards that stay in view: [frame, x, y, scale] keys. Motion data only; the artwork is all drawn in `cards.tsx` |
| `theme.tsx` | Props, defaults, card texts, the theme context |
| `lib.ts` | Timing helpers, font loading, text measuring |

## Render

From the `kinetograph-ui` root, with `../kinetograph` built:

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/collage-burst/index.tsx --comp CollageBurst -o templates/collage-burst/out/collage-burst.mp4
node ../kinetograph/packages/cli/dist/cli.js render templates/collage-burst/index.tsx --comp CollageBurst --props '{"brand":"Acme","lines":["Two plans.","Zero fuss."]}' -o out/acme.mp4
```

`lint` reports text running off the canvas on the wall frames: that is the cards bleeding past the frame and their
text cut by each card's clip, on purpose. No audio is shipped.
