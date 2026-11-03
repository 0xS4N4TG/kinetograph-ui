# wait-ship

A 2.5 s UI promo, timed to a measured reference. Seven photo cards float round the edges of a near-black frame, out of
focus at first. A camera pulls back and racks focus, "You wait..." comes up out of the blur, then "Ship it with
Kinetograph" replaces it with a blur that clears left to right. The scene then slides to the right with depth and the
left card comes into focus. The clip ends while that slide is still accelerating, as the reference does.

Output: 1920x1080, 60 fps, 148 frames (the reference's length, 2.47 s). Composition id: `WaitShip`.

No third-party photos or brands ship with it. The cards are drawn in code (`art.tsx`): a sunset head, a hand in light,
a dusk ribbon, a night coast with a rim-lit profile, a figure in haze, a hill, a smeared figure on orange. Drop your own
photos in with `images`.

## Props

All have defaults (`defaultProps` in `index.tsx`) and a zod schema, so Studio draws a form for them.

| Prop | Default | What it does |
|---|---|---|
| `lineOne` | `You wait...` | First line, comes up out of the blur. |
| `lineTwo` | `Ship it with {brand}` | Second line. `{brand}` is replaced by `brand`. |
| `brand` | `Kinetograph` | Product name. |
| `fontFamily` | `InterTight` | Google Fonts module or family name, loaded by `makeGoogleFont`. The reference face is a tight grotesque; Inter Tight at weight 600 and -0.04 em matched its widths to within 1%. Geist is wider; it works but the line runs longer. |
| `fontWeight` | `600` | Weight of both lines. |
| `textSize` | `47` | Size in reference units (the frame is 960 wide). Lines wider than 820 units shrink to fit. |
| `tracking` | `-0.04` | Letter spacing in em. |
| `textColor` | `#ffffff` | Text colour. |
| `glowAmount` | `0.03` | Soft halo round the letters. |
| `backgroundTop`, `backgroundBottom` | `#18171c`, `#0c0c0f` | The ground, a vertical gradient. |
| `images` | `[]` | Photos for the seven cards, in order: sunset head, hand in light, dusk ribbon, coast (the card that sharpens at the end), figure in haze, hill, smear. Paths under `public/` (read with `staticFile`) or full paths. An empty or missing entry keeps the drawn stand-in. Images are cropped to the card with `fit="cover"`. |
| `cardGrain` | `0.03` | Film grain on the cards. |
| `blurAmount` | `1` | Multiplies all depth-of-field blur. 0 is everything sharp. |
| `slideAmount` | `1` | Multiplies the closing slide to the right. |
| `switchAt` | `60` | Frame on which line one is replaced by line two. |

## Render

From the `kinetograph-ui` root:

```
node ../kinetograph/packages/cli/dist/cli.js strip templates/wait-ship/index.tsx -n 12 -o templates/wait-ship/out/strip.png
node ../kinetograph/packages/cli/dist/cli.js render templates/wait-ship/index.tsx --comp WaitShip -o templates/wait-ship/out/wait-ship.mp4
node ../kinetograph/packages/cli/dist/cli.js render templates/wait-ship/index.tsx --comp WaitShip --props '{"brand":"Acme","images":["a.jpg","b.jpg"]}' -o templates/wait-ship/out/acme.mp4
npx tsc -p templates/wait-ship --noEmit
```

The first render downloads the font into `~/.cache/kinetograph/fonts`.

## How it is built

- `index.tsx`: schema, props, timing tables measured off the reference, the card and text layers.
- `art.tsx`: the drawn photo stand-ins and the `Photo` wrapper (image or art, grain, clip).
- `lib.ts`: easing and a monotone cubic `curve()` used for every measured track.

Motion: a global zoom from 1.26 settling by frame 60 (`1 + 0.26 e^(-f/19)` about the frame centre), per-card blur curves,
a text scale and blur settle, and the slide from frame 120 with each card travelling a different distance for depth.
Cards A, C, D and G blur their picture inside a hard-edged frame, as in the reference; B, E and F blur whole.
Blur radii are in canvas pixels because the engine does not scale blur with a layer's scale.
