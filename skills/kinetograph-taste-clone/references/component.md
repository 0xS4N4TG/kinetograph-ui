# Component mode

The output is a reusable component (in kinetograph-ui: `components/<category>/<Name>.tsx`), not a one-off film. The
clone rules all apply; the difference is that the reference's content becomes props and the reference's look becomes
the defaults.

1. **Defaults reproduce the reference.** Rendered with no props, the component must pass every gate against the
   reference (same size and fps, or the reference's aspect and fps when the gallery size differs). Brands and people
   in the reference become neutral content in the defaults.
2. **Props are content, not taste.** Text, data, images, colours that the reference shows as content, durations. The
   look (curves, shadows, camera, blur) stays fixed unless the reference family shows it varying. Every prop gets a
   zod `.describe()`.
3. **Images are the user's choice.** Use whatever images the user gives or names. Only when they give none, fall back
   to on-topic public-domain or CC0 stills (Wikimedia Commons works well; not NASA), credited in
   `components/_assets/photos/CREDITS.md`.
4. **Register it:** the category's `index.tsx` composition, a row in the category README and the components README
   (count updated), and a line in its file header naming the reference file and what was measured.
5. **Poster frame (G14):** the gallery shows one still. Pick the frame where the component is fullest and reads at
   card size (data landed, audio loud, type written), never frame 0 of an intro or a silent bar. Check it at the card's
   real size next to its neighbours: an empty, flat or half-built card fails.
6. **Gate both:** the default render against the reference (G1–G13), and two prop variations (long text, other data,
   other image) to prove nothing is hard-wired to the reference's content.

## Components without a reference

If there is no reference video, there is nothing to clone: say so and ask for one (a snapcn/Bklit scene, a product
film, a reel). Taste-only components drift into "looks bad" because nothing pins them; find a reference first.
