# kit

Building blocks shared by the templates in `../templates`. Pulled out of `templates/save-reel`, which renders
through them unchanged. The tastes are in `../tastes`.

| Folder | What |
|---|---|
| `core/` | Blocks any reel can use: camera and letterbox, timing, drawing, ink, icons, pointers, backgrounds, UI cards, placeholder sounds, the `Taste` provider |
| `looks/` | Film and transition looks: posterize, curve cut, parallax, page turn, gate weave, flicker, dust, window light, edge blur, vignette |

## Taste

A taste is the style a reel is cut in, as one value (`Taste` in `taste.tsx`): canvas, ink and accent colours, the
UI, display, marker and pen fonts, the note colours, the dark interlude gradient, the camera's motion-blur samples
and default shutter, the letterbox colour. Kit components read it from context:

```tsx
import { TasteProvider } from '../../kit/core/taste.js';
import { paleWhip } from '../../tastes/pale-whip.js';

<TasteProvider taste={paleWhip}>{/* shots */}</TasteProvider>
```

Swap the taste and every kit block restyles. Outside a provider the kit uses Pale Whip.

| Taste | Look |
|---|---|
| `tastes/pale-whip.ts` | Flat UI on pale grey, heavy whip blur, felt-tip red and yellow pen notes, warm dark interludes, letterbox bars |

## Blocks

| File in `core/` | What |
|---|---|
| `timing.ts` | `ease`/`easeOut`/`easeIn`, `keys` (keyframes), `ramp`, `spline` and `glide` (smooth camera paths through measured keys) |
| `draw.ts` | `line` (a stroke with cap, join and dashes), `rrect` (rounded-rect path), `polyD` |
| `camera.tsx` | `Cam` (2D camera with motion blur: push-ins, whips, tilts), `Letterbox` (bars from keyframes) |
| `ink.tsx` | `Ink` (a word written on in the marker or pen hand), `handLine`/`curve`/`InkLines` (freehand underlines, arrows, scribbles drawn on) |
| `icons.tsx` | `ICON` paths and `Icon` |
| `pointers.tsx` | `Arrow` (cursor), `Hand` (tap), `FlatArrow`, `BigArrow` (the block arrow extruded in 3D, spinning) |
| `backgrounds.tsx` | `WarmGradient` (the taste's interlude), `Spotlight` (light on an oval, black outside) |
| `ui/social-card.tsx` | `SocialCard` (a generic feed post, save icon as a slot), `Avatar`, `Tag` |
| `ui/notification.tsx` | `NotificationCard` (bring your own app icon, title, body, trailing piece) |
| `ui/toggle.tsx` | `Toggle` |
| `sfx.ts` | Synthesised placeholder sounds for `onFrame` cues: `whoosh` (whips), `click` (taps), `pop`, `thud`, `scratch` (pen), `tone`, `hz` |

No block carries an app's branding: icons, names and logos come in through props.

## Motion blur across cuts

`Cam` needs an `id` unique among the shots on screen at once, and a whipping shot's Sequence should start a few
frames early, hidden with `opacity` until `start - 0.5`, with a camera key there. The comment on `Cam` says why.

## Explainer taste: `../tastes/explainer`

The look of short agency, founder and brand-lesson reels as a taste and its blocks: palettes (`mono`, `crimson`,
`ledger`), the paper and the camera (`Shot`: settle, push, scroll, punch; `Corners`: the corner wipe), the type stack
(`Stack`: lead, keyword, tail, words landing on their frames, accent ink or highlighter) and the cut-out object (`Prop`:
rise, slide, drop, zoom, a dashed ring; drawn objects `ChessKing`, `PaperBoat`, `Briefcase`, `Coin`). `SKILL.md`
there is the taste skill: the layout rules with numbers, the camera moves in frames, the story order and how to time a
reference shot by shot. `tastes/explainer/demo` cuts one story in all three palettes.
