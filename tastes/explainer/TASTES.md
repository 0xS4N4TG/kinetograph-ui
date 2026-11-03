# Explainer tastes

Pick one taste per reel. Read the "Use when" column against the script's subject and tone, then use the taste by name:
`import { red } from 'tastes/explainer'` or `taste('red')`. Every engine component (`Paper`, `Lead`, `Keyword`, `Prop`,
`Corner`, `Wipe`, `Camera`) takes the taste and draws in it; the beat layout is still yours to choose (SKILL.md).

Each taste's preview is `previews/<id>.jpg` (three moments of its reel) and its reel, cut in its own layouts, camera
and transitions with its own script and pictures, is `tastes/explainer/demo-tastes/out/<id>.mp4`. `mono` and `ledger` are
drafts from contact sheets with no reel yet.

| Taste | Look | Use when | Source | Measured | Preview |
|---|---|---|---|---|---|
| `red` | White paper, black italic lead, brick-red italic keywords, needle stars, black interludes with blooming type, circle wipe, barcode | A brand or content lesson told as a contrarian claim; busts and classic objects; punchy, a little dramatic | pin 1119285313673132667 | yes | `previews/red.jpg` |
| `pulse` | Cream paper and pure black beats, near-black small words beside a heavy red keyword on one line; words fade up from 0.3 and rise, spring and glow on black; camera push-ins, rolls, a flicker; eased black iris | Growth and marketing advice with a call to action (DM me); fast, loud, social-native | pin 933230354043913635 | camera, type timing, light, iris | `previews/pulse.jpg` |
| `graph` | White graph paper (0.136 W cells), all type in one dark grey: condensed upright lead word by word, bold italic keywords; dashed rings, down-right drop shadows; scenes joined by rigid camera pans and a zoom-out | Brand case studies and money stories (how X went from A to B): products, cans, coins, cash; scenes that travel | pin 971581319623279878 | camera, lead entrance, light, grid | `previews/graph.jpg` |
| `agency` | Warm paper under a strong oval vignette and a faint dashed grid; centred upright geometric type, a small lead over an extra-bold headline, second lines grey, every line dropping in from above out of a blur; black corner stars through the whole reel; blur out, cut, blur in | An agency or consultant pitching how they differ: calm authority, positioning, B2B; cut-out photo objects | pin 1061653312177886416 | type entrance, palette, grid, blur-through-cut | `previews/agency.jpg` |
| `ember` | Cream paper, upright black lead, burnt-orange keywords, ink asterisks, a blinds wipe into deep brown where type glows amber, no small print | Craft and creative advice (editing, design, writing); warm and personal, less shouty than `red` | original | type, light and motion inherited from `red` | `previews/ember.jpg`; full reel `tastes/explainer/demo-original/out/reel.mp4` |
| `mono` | Warm off-white with a grey vignette, upright near-black type, no accent, no corner shapes, hard cuts | Calm, serious advice: finance, careers, anything that should feel quiet | contact sheet | no | `previews/mono.jpg` |
| `ledger` | White graph paper, upright black type, a yellow highlighter swept behind the key words, hard cuts | Numbers, how-tos and step lists: study, productivity, business maths | contact sheet | no | `previews/ledger.jpg` |

Coming, one per reference as its spec lands (not committed): pins 422
and 1101 (specs written), and 1086, a photo-montage of its own family (spec written). The paper-cut kit (`tastes/papercut`, its own engine: torn-paper cast, backdrops,
orbit camera, word-tag captions) is listed here as the `papercut` taste once its catalogue entry is wired.

## Adding a taste

1. Clone the reference with the `kinetograph-taste-clone` skill (`skills/kinetograph-taste-clone`) and extract its taste.
2. Write `tastes/<name>.ts` with `defineTaste({ meta, ...colours and fonts, text?, motion?, light?, shapes?, transition?, camera? })`.
   Set only what the reference measured; the rest comes from `BASE` (pin 1119), and `meta.measured` is then false.
3. Add it to `TASTES` in `tastes.ts` and a row here. Render a preview and link it.

## The fields (taste.ts)

| Group | Fields |
|---|---|
| `meta` | `id`, `title`, `useWhen`, `source`, `measured`, `preview` |
| colours | `paper`, `dark`, `vignette`, `grid`, `ink`, `inkOnDark`, `keyword`, `keywordOnDark`, `accentMode` (`ink` / `highlight`), `highlight`, `muted` (plain lines), `star`, `starOnDark` |
| fonts | `font`, `leadWeight`, `keyWeight`, `italic` |
| fonts (lead) | `leadFont`, `leadItalic` (default the keyword's) |
| grid | `gridCell` (W), `gridInk`, `gridStrength` |
| `text` | `leadMode` (`letters` / `words`), `leadBob[]` (em per frame), `leadSize`, `leadTracking`, `leadRate`, `hop[]` ({s, y, r} per frame after landing), `keyTracking`, `keyGap`, `keyLineHeight`, `fade` (frames), `blur` (W), `pop`, `fadeFrom`, `rise` (em), `riseKeep`, `bob[]` (em per frame, dark beats), `bobLag`, `bobGain` |
| `motion` | `riseKeep`, `slideKeep`, `riseCreep`, `push` [lead, keyword, object] (W/frame²), `pushLag` [frames], `waveSpeed` (W/frame), `waveFade` (frames), `spring[]` (scale per frame) |
| `light` | `castAlpha`, `castOffset` [W, H] (its sign is the light's side), `castBlur` (W), `groundAlpha`, `shapeAlpha`, `shapeOffset`, `shapeBlur` (W), `glowTight`, `glowWide` (em), `glowStrength` |
| `shapes` | `corner`, `cornerOnDark` (`needle` `sparkle` `asterisk` `dot` `ring` `plus` `none`), `grow` (share left per frame), `breathe`, `smallPrint` (`barcode` / `none`) |
| `transition` | `wipe` (`circle` `blinds` `cut`), `speed` (circle: W/frame; blinds: frames per band), `bands`, `radii[]` (W per frame: an eased iris) |
| `texture` | `paper` (multiply, on the paper), `ink` (pale flecks through dark type), `grain` (moving specks), `scan` (a real scanned halftone screen, hard-light, over everything), `halftone` (multiply), each an opacity; ink, grain and scan print over the type too; files in `textures/` from `tools/textures.py`; draw `<Texture taste>` last, with the effect's `public/explainer-textures` linked to `tastes/explainer/textures` |
| `meta.layouts` | the reference's beat layouts in `layouts.tsx`: red `HeroRise` `FloorSide` `Interlude`; pulse `BleedSide` `Interlude` `CentreStage`; graph `Ringed` `HeadlineOver` `EndCard`; agency `Sandwich` `StandOn` `ListBeat` |
| `camera` | `pushAmount`, `pushKeep`, `pushDrift`; `panRise` (frames), `panKeep`; `rollFrom` (deg), `rollKeep`, `rollOut` [a, b]; `arriveBlur` (W), `arriveFrames`; `zoomOut[]` (scale per frame), `zoomFade` [from, to]; `flicker[]` (brightness per frame). Moves: `push` `pan` `roll-in` `roll-out` `arrive` `defocus` `zoom-out` `flicker` |

A reference that needs something this table cannot say (a camera move, a new corner shape, a new wipe) gets it added to
the engine and the table, not hard-coded in its reel.
