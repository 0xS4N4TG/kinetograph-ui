# prompt-reply

A free Kinetograph component: a 5 s UI promo timed to a measured reference (1920x1080, 60 fps, no audio). A chat prompt
types itself into a rounded box and sends; the shot cuts to the agent's reply, which builds up on a page the camera
scrolls through: two activity rows tick in, then a status line, a serif reply, a brand chip, a small table and the
action icons fade up one after another.

The composition id is `PromptReply`. Timing is the reference's, measured frame by frame (the reference itself is not
committed; it goes in `reference/reel.mp4` if you want to compare). All drawing is authored in the reference's own
960x540 pixels and scaled 2x. No third-party images or brands are shipped; the default brand is "Kinetograph".

## Shots

| Frames | What |
|---|---|
| 0-109 | The prompt box. Characters type in at an uneven pace (about 34 per second, a pause before the last one), each in a warm tint that fades to white over about 0.7 s. The box drifts left and settles, a pink hairline pulses round it as the prompt sends, the caret goes out. |
| 110 | Hard cut, as in the reference. |
| 110-299 | The reply page. The "Plan the cut" tile starts orange and settles to white in 10 frames; "Render preview" ticks in at frame 122 and does the same. The camera scrolls up and left, easing out until about frame 195. Status line 130, serif reply 140, chip 153, table head 166, table cells 188 / 199 / 207, action icons 221. |

## Props

Every visible string, colour and font is a prop (`defaultProps` on the composition, `PromptReplyProps` in `lib.tsx`).
Pass them with `--props '{"prompt":"..."}'`; nested objects (`table`, `colors`, `fonts`) replace the whole object, so
give all their keys.

| Prop | Default | What |
|---|---|---|
| `brand` | `Kinetograph` | Name in the small chip under the reply |
| `prompt` | `Can you turn this release into a video?` | The typed text. Pace is resampled for other lengths; a line wider than the 840 px box shrinks to fit |
| `activities` | `["Plan the cut", "Render preview"]` | The two activity rows |
| `status` | `Cut the video and pulled its preview link.` | Small line under the second activity |
| `reply` | `I’ve cut a 20-second launch video from this release’s changelog.  Link below:` | The reply, in the serif (the double space is the reference's) |
| `table` | `{ head: ["Video","Scenes","Link"], row: ["Launch • 0:20","Hero, changelog, pricing","Open in editor"] }` | Three column heads and one row; the first cell is a mono chip, the last one a link |
| `fonts` | `{ ui: "Inter", mono: "SourceCodePro", serif: "CormorantGaramond" }` | Google Fonts family names, spelled as `@remotion/google-fonts/<Family>` does. UI needs weights 400/500, mono 400, serif 400/500/600. The type sizes and tracking are fitted to Inter, so another UI face will sit a little off |
| `colors` | see `lib.tsx` | `background`, `surface`, `ink`, `tint`, `active`, `label`, `status`, `chipText`, `head`, `cell`, `link`, `icons`, `value`, `line`. Hex colours only (the fades are gamma-corrected from them) |

Fonts follow the reference, glyph for glyph: Inter for the interface type (its slanted `t`, its `y` and its x-height
match; the reference's tight tracking in large type and open tracking in small type is Inter's own size-dependent
spacing, which `tracking()` in `lib.tsx` reproduces character by character), Cormorant Garamond for the reply and
table (old-style figures, as in the reference), and Source Code Pro for the table's mono chip (dotted zero, large
bullet; Geist Mono has a slashed zero, so it does not fit). Geist, the first guess, was wrong: its x-height is
smaller and its `t` is flat.

## Files

| File | What |
|---|---|
| `index.tsx` | The composition, `registerRoot`, the 2x stage |
| `lib.tsx` | Props and defaults, font loading, easing and `glide` (monotone cubic through measured keys), `fadeAlpha`, icons |
| `prompt.tsx` | Shot 1: box, typing schedule (`TYPE_AT`), per-character tint, caret, send highlight |
| `reply.tsx` | Shot 2: camera keys (`CAM_X`, `CAM_Y`), arrival times (`T`), the rows, chip, table, icons |
| `tsconfig.json`, `google-fonts.d.ts` | Type-checking, as the other effects |

## Render

From the `kinetograph-ui` root, with `../kinetograph` built:

```sh
K=../kinetograph/packages/cli/dist/cli.js
node $K still  templates/prompt-reply/index.tsx 80 --comp PromptReply -o templates/prompt-reply/out/f80.png
node $K strip  templates/prompt-reply/index.tsx --comp PromptReply -n 12 -o templates/prompt-reply/out/strip.png
node $K render templates/prompt-reply/index.tsx --comp PromptReply -o templates/prompt-reply/out/prompt-reply.mp4
npx tsc -p templates/prompt-reply --noEmit
```

The first render downloads the three fonts into `~/.cache/kinetograph/fonts`. `out/` and `reference/` are not committed.

## Known differences from the reference

- Kinetograph blends in linear light and a browser in sRGB. Fades are corrected for this (`fadeAlpha`) and the grey
  text colours and the prompt's white are set a little low so each element's total ink matches the reference to within
  a few percent. Peak pixel values of thin text are therefore not identical, and the reference's LCD-style colour
  fringes on small text are not reproduced.
- The reply serif is about 3% lighter than the reference (Cormorant has no weight between 600 and 700; 700 is 8%
  heavier).
- The activity-tile camera glyph is traced from the reference at pixel level but is a vector redraw; edges differ by
  under half a pixel.
- Mean absolute difference to the reference over all 300 frames (both scaled to 960x540) is about 1 grey level out
  of 255; most of that is the replaced brand name and anti-aliasing at glyph edges.
- The prompt box's right edge is off-screen in the reference, so its width is a guess (it only matters if you pass
  a very long prompt).
- `kinetograph lint` reports the first activity row leaving through the top edge at frame 128, and the prompt line
  running past the right edge (its layout box ignores the per-character tracking, so it reads wider than the drawn text). The first is in the reference; the second is a measuring artefact.
