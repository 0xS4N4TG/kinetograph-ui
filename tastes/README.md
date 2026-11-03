# Tastes

A taste is a whole style for a reel: palette, fonts, paper and textures, how text animates, how the camera moves,
how shots cut, how pictures are treated, and the sound. Pick one by folder and you get all of it. Each taste has a
demo reel in its `demo` folder, cut entirely in that taste on its own topic.

| Taste | Look | Use it for | Demo reel |
|---|---|---|---|
| [`vox/`](vox/) | Documentary explainer: grid paper, photos tinted and halftoned into the palette, caps that fill yellow then settle into a marker box, odometer numbers, old maps with burn-in regions and boiling arrows, page turns, magazine-scan finish, marimba bed | History, science and "why does X" explainers | `tastes/vox/demo` (Krakatoa, 30 s) |
| [`print/`](print/) | Risograph: two or three ink passes (green, yellow, blue type) that sweep in top to bottom, Hard Mix dot screen at 15° that jumps on twos, small misregistration, the scanned halftone and moiré as finish | Art, design, culture, anything that should feel printed | `tastes/print/demo` (woodblock prints, 28 s) |
| [`archive/`](archive/) | Old photographs brought to life: cut-out parallax, gate weave and exposure flicker from the reference's presets, film scan and dust, offset vignette, curve cuts, page turns on threes, typed datelines, piano and strings | History, biography, "the first..." stories | `tastes/archive/demo` (the first photographs, 30 s) |
| [`papercut/`](papercut/) | Cut-paper sets: illustrated rooms with a floor line, paper critters, cut-paper props with grain and shadows, taped banners, torn red caption tags, orbit camera with depth layers, scene wipes | Tech and AI explainers, playful how-it-works | `tastes/papercut/demo` (how a chatbot answers, 28 s) |
| [`collage/`](collage/) | Vox-style paper collage: archive cut-outs, torn yellow labels typing on in Didone, a torn charcoal strip with colour-split white type, a real old newspaper page under our own masthead, stop motion on twos, parallax by scaling about the centre, rack focus, a static dither | History hooks, "how it happened" explainers, documentary openers | `tastes/collage/demo` (3 s) |
| [`explainer/`](explainer/) | Agency and founder-lesson reels: one engine with presets (`red`, `pulse`, `graph`, `agency`, `ember`; `mono`, `ledger` are drafts), museum cut-outs on textured paper, lead/keyword/tail type stack, corner wipes. Presets and their fields: `explainer/TASTES.md` | Business lessons, one-idea brand reels | `tastes/explainer/demo-tastes`, `explainer-original`, `explainer-reel` |
| [`pale-whip.ts`](pale-whip.ts) | Flat app UI on pale grey, heavy whip blur, felt-tip notes, letterbox bars (used with the blocks in `kit/core`) | App and product concept reels | `templates/save-reel` |

Shared by every taste: `kit/looks` (posterize, curve cut, parallax, page turn, film weave, flicker, dust, window light,
edge blur, vignette) and `kit/core` (camera, timing, ink, pointers, UI blocks).

Each taste folder has a README (what it is, its components, its rules and which reference reel each came from) and a
`tools/` folder for its procedural sound and textures. The measured technique notes are not committed.
