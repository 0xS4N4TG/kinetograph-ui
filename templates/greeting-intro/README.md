# greeting-intro

A 3.5 s app-intro: a gradient wordmark on a soft off-white ground shrinks away as an app window grows in behind it.
The camera pushes into the window's top left, tilted, types "Hello, <name>." and a question across it in large
perspective type, slides four suggestion cards in, then pulls back and flattens to the whole window with its prompt box.
1920x1080 at 60 fps, 212 frames. Composition id: `GreetingIntro`.

The timing, layout and camera follow a measured reference clip (960x540, 60 fps, not committed; it goes
in `reference/reel.mp4`). The reference is 30 fps content shown twice, so it moves in 2-frame steps; the component does
the same by default (`step: 2`). The camera was tracked from that clip against the flat window (landmarks for the first
second, image alignment after), so the push-in, the tilt and the pull-back follow it. Cards and the prompt box cut in on
one step each, the greeting types unevenly as the reference does, and the wordmark shrinks, rises and fades linearly
from frame 8 as measured.

## Files

| File | What |
|---|---|
| `index.tsx` | The composition, its zod schema, the defaults, the ground, the wordmark and the caption |
| `ui.tsx` | The app window drawn flat (sidebar, brand name, greeting, question, cards, prompt box) and when each part appears |
| `camera.ts` | The camera as a table of keys (position, ln scale, rotateX, rotateY, rotation) at every second frame, and its spline |

## Props

Everything on screen is a prop (`defaultProps` on the composition; the schema gives Studio a form).

| Prop | Default | |
|---|---|---|
| `brand` | `Kinetograph` | The wordmark, and the app name at the top of the window |
| `name` | `Sri` | "Hello, `name`." |
| `question` | `What are we shipping today?` | The grey line under the greeting |
| `cards` | four labels: Ship the demo, Cut a launch video, Render the changelog, Draft the release post | One to four, left to right |
| `placeholder` | `Describe your video` | Text in the prompt box |
| `caption` | `Scenes shortened and simulated.` | Small grey line at the bottom left; empty hides it |
| `font` | `Google Sans` | Any Google Fonts family, used for all type |
| `step` | `2` | Hold every N frames. 2 reproduces the reference's 30 fps stepping; 1 is smooth 60 fps |
| `colors` | see `index.tsx` | `ground`, `glowCool`, `glowWarm`, `window`, `sidebar`, `surface` (cards), `field` (prompt box), `ink`, `muted`, `greetingStart`, `greetingEnd`, `wordmark` (gradient stops) |

The reference is set in Google Sans, which Google Fonts carries (`Google Sans`, `Google Sans Text`, `Google Sans Flex`).
I compared word widths of the question and the card labels against the reference for ten families; `Google Sans` came
closest (within about 1 px per word at 1080p), then Product Sans and Google Sans Flex, then Figtree. The wordmark is
scaled down so a long brand name fits. Colours are `#rrggbb`; the glows need hex.

## Render

From the `kinetograph-ui` root, with `../kinetograph` built:

```sh
K=../kinetograph/packages/cli/dist/cli.js
node $K still templates/greeting-intro/index.tsx 100 --comp GreetingIntro -o templates/greeting-intro/out/f100.png
node $K render templates/greeting-intro/index.tsx -o templates/greeting-intro/out/greeting-intro.mp4
node $K render templates/greeting-intro/index.tsx --props '{"brand":"Acme","name":"Ada"}' -o templates/greeting-intro/out/acme.mp4
```

`out/` and `reference/` are not committed.
