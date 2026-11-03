---
name: hexed
description: Roll a look onto any picture or clip with Kinetograph's Hexed plugin. Use when a video needs a grade, glitch, grain, shake or print look, or when you want to reroll and save looks.
---

# Hexed

`@kinetographdev/hexed` rolls a look onto a picture from eleven slots. A slot holds one gene, a seed and an amount.
The slots are `crop`, `shake`, `fps`, `time`, `mirror`, `isolate`, `grade`, `screen`, `optics`, `damage` and `grunge`.
The whole look is a genome: plain JSON, one strand per slot. A genome plays back the same every time.

Run `npx kinetograph plugins` to see that it is installed.

## Component

`<Hexed>` wraps any children. It fills the composition unless you give `width` and `height`.

| Prop | What it does |
|---|---|
| `seed` | Rolls a gene for each slot. Default 1. |
| `lock` | Slots to hold while the seed changes. A seed, a gene id, or a partial strand per slot. |
| `genome` | A saved look. Wins over `seed` and `lock`. |
| `preset` | A saved look by name from `presets/`. Wins over `seed` and `lock`. |
| `off` | Slots to switch off, for example `["grunge"]`. |
| `amount` | Strength of the whole look, 0 to 1. Default 1. |
| `amounts` | Strength per slot, 0 to 1, on top of the genome's own. |
| `order` | The order the effect slots run in. |
| `textures` | Scans the grunge slot picks from, as `{ src, kind }`. |
| `adjust` | Global `exposure`, `shadows`, `highlights`, `contrast`, `saturation`, `temperature` (each -100 to 100), `hue` (degrees), `sharpen` (0 to 100), `invert`. |
| `width`, `height`, `at` | The picture's size and top-left corner on the canvas, for a picture that does not fill the frame. |

Other exports: `roll(seed, lock?, textures?)` returns a genome, `describe(genome, off?)` names it in one line,
`genesOf(slot)` lists a slot's gene ids, `PRESETS` holds the saved genomes.

## Schema and panel

`hexedSchema` is the zod schema for the props above. `genomeSchema` is the schema for a genome and carries
`kinetographPanel: '@kinetographdev/hexed'`, so Studio shows the Hexed panel for that field. The panel has one card per
slot with a custom gene list, an amount slider, a lock (a locked card is outlined and tinted) and the slot's seed, which
you click to copy; a shuffle per slot; a Shuffle button for the whole look (it keeps locked slots); and a preset menu.
It styles itself with Studio's theme variables, so it follows light and dark.
Put it in a composition's schema:

```tsx
schema={z.object({ look: genomeSchema })}
```

## Tools

When Kinetograph's MCP server is running (`kinetograph mcp`), the plugin adds three tools:

- `hexed_roll`: input `{ seed?, locks?, from? }`. Rolls a look and returns `{ seed, genome }`. Without `seed` it picks one
  and returns it, so you can repeat the roll. With `from` (a genome) and `locks` (slot names), the locked slots keep their
  strands from `from` and the rest reroll.
- `hexed_genes`: input `{ slot? }`. Lists the gene ids each slot accepts, with a note on the slot.
- `hexed_presets`: no input. Returns the saved looks as `{ name: genome }`.

Inside Studio, try looks with `studio_set_props` (put a rolled genome in the field that uses `genomeSchema`) and look at the
preview. When you settle, write the final genome into the code or save it as a preset; do not leave it only in Studio's
live props.

## Presets

Presets are in `presets/*.json`. Roll and save one with `node plugins/hexed/tools/save-preset.mjs <name> <seed> [lock-json]`.
Today there is `moss-impact`.

## Examples

```tsx
import { Image, Video, staticFile } from '@kinetographdev/core';
import { Hexed } from '@kinetographdev/hexed';

<Hexed seed={42}><Video src={staticFile('clip.mp4')} /></Hexed>
<Hexed seed={42} lock={{ grade: 'sepia-print' }} off={['mirror']}><Image src={staticFile('photo.jpg')} /></Hexed>
<Hexed preset="moss-impact" amount={0.7} adjust={{ contrast: 20 }}><Image src={staticFile('photo.jpg')} /></Hexed>
```

Props from a file: `kinetograph render --props presets/Look/warm.json`. A genome from Studio's panel goes in the
`genome` prop.

## Check

- Run `kinetograph still` on a frame in the middle of the clip, not frame 0. Shake, time and fps genes only show once
  frames move.
- Look at two or three seeds before you settle. `describe(roll(seed))` tells you which genes a seed picked.
- A loud look can hide the picture. If it does, lower `amount` or switch a slot off.
