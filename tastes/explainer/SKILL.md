---
name: explainer-taste
description: The explainer-reel engine for Kinetograph and its tastes - short agency, founder and brand-lesson reels with a small lead line writing on letter by letter over big keywords that fade up out of a blur, real cut-out objects with a shadow from one top-right light, corner shapes, hard cuts, dark interludes where the type blooms, push and dissolve exits and a wipe. Each taste is the measured look of one reference (red, ember, mono, ledger; more per reference) chosen from TASTES.md. Use to cut a script in one of these looks. To copy a particular reference 1:1 or add a taste from a new one, use the kinetograph-taste-clone skill (skills/kinetograph-taste-clone) first.
---

# Explainer engine and tastes

`tastes/explainer` is one engine and many tastes:

- `taste.ts`: what a taste is (`ExplainerTaste`), `BASE` (the numbers measured off pin 1119 that every taste inherits for
  whatever its own reference has not measured) and `defineTaste`.
- `tastes/<name>.ts`: one taste per reference, `tastes.ts` the catalogue (`TASTES`, `taste(name)`), and `TASTES.md` the
  table an agent reads to choose: look, use when, source, measured, preview.
- The engine, which reads every number from the taste: `stage.tsx` (`Paper`, `Corner` / `Star`, `Wipe` / `CircleWipe` /
  `BlindsWipe`, `push`, `wave`, `cornerLength`, `Barcode`), `type.tsx` (`Lead`, `Keyword`), `props.tsx` (`Prop`; pass
  `taste` so its entrance and shadow use the taste's numbers), `camera.tsx` (`Camera`: push, pan, roll in and out,
  focus pull, zoom-out, flicker; wrap a beat's layers in it, nest to combine; give each `Paper` on screen at once its
  own `id`).

Showrooms: `tastes/explainer/demo-tastes` (one two-beat script in every taste, `Taste-<id>`), `tastes/explainer/demo`
(`red`), `tastes/explainer/demo-original` (`ember`, an original reel with its own cut).

Choose the taste first (TASTES.md), then lay out beats with the recipe below. The recipe and the numbers in it are
`red`'s (pin 1119); another taste changes the colours, shapes, wipe and any number its reference measured, not the
grammar. Vary the layout per reel: copy the edit's grammar, never a reference's beat sheet.

## A beat

A beat is 1.5 to 4 seconds on flat paper (or black), built from these, drawn in this order:

1. `<Paper taste dark?>`
2. `<Corner taste>` shapes in two opposite corners (paper beats; `dark` soft ones on dark beats); the taste picks the shape
3. `<Lead>`: the small line, upper area (about 0.2 to 0.3 H), flush left from about 0.11 to 0.2 W, or centred
4. `<Keyword>`: two or three lines under the lead, flush left with ragged starts (x 0.10 to 0.22 W), line pitch about
   0.95 of the size
5. `<Prop>`: the object, standing in front of the keyword and covering only the tail of its last line
6. small print when the taste has it (`taste.shapes.smallPrint`), a `<Wipe taste>` into the next beat (circle, blinds or cut)

## Timing inside a beat (frames from the beat's start)

| What | When |
|---|---|
| Lead | starts on frame 1-2; about 1 letter a frame (0.8 to 2.5 across beats); spaces take no time |
| Object | arrives at frame 2 (rise) or 2-3 (slide), settles in about 20 frames |
| Stars | grow on frames 7-15, 6-7 frames each, the two a couple of frames apart |
| Keyword | starts once the lead is written and the object settled (frame 35-65); words 3-8 frames apart, 8-frame fade each |
| Hold | at least 15 frames of the finished frame |
| Exit | a cut, a push (lead +0, keyword +1, object +4 frames; k 0.005, 0.0027, 0.010 W), or a dissolve wave (0.046 W a frame), or the circle wipe (8 frames) |

## Sizes (fractions of W)

| Element | Size |
|---|---|
| Lead | 0.038 (medium italic) |
| Keyword | 0.215 for one or two short words a line, 0.13-0.15 for two-word lines, 0.087 for three lines of longer words, 0.052 on a black beat |
| Object | 0.44-1.0 wide; a bust runs off the bottom edge |
| Star arm | 0.2-0.45 |

## Objects and shadows

- Real still cut-outs with clean alpha only: never a drawn stand-in for a photographic object, never a video matte (its
  fringe shows). Fix a fringe by eroding the alpha 2-3 px and feathering 1 px.
- Choose the picture by silhouette so it covers only the end of the keyword's last line (a narrow head on an upright
  bust). If the keyword stops reading, the picture or its placement is wrong.
- `shadow="auto"`: an object touching the bottom edge gets a **cast** shadow (its alpha in black, down-left 0.015 W /
  0.012 H, blur 0.025 W, 0.4), drawn with the object so it also darkens the keyword it crosses; an object on the floor
  gets a **ground** band at its contact (darkest 0.55 at the base, off to the left 0.35 W) and no silhouette shadow.
  Never an all-round glow.
- Stars cast the same way: down-left off their edges.

## Dark beats

`<Paper dark>`, `<Corner taste dark>` in the other two corners, `<Lead dark>` and
`<Keyword dark size={0.052}>` mid-frame. Both bloom (a lifted core, a tight and a wide halo, slightly soft letters).
Leave by a dissolve wave.

## Check

Render each beat's settled frame and its first frames beside the reference at full size (the clone skill's
`compare.sh` and `measure.py`): letter landing and hop, keyword blur, object curve, star growth, shadow strength and reach
(`measure.py shadow`), glow width (`measure.py line`), which keyword letters the object hides.
