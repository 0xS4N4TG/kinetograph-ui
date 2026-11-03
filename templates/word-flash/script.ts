// The component's copy and its cuts. Change the words here; get cuts for another track with
// `node templates/word-flash/tools/cuts.mjs <audio>` (prints a CUTS line to paste in).
//
// One cut per shot, in order: the five intro shots (a small word, the small word over a big one, a third word
// sliding in, that word over a fourth, a fifth big alone), one shot per `run` word, one per `outro` stage, a hold on
// the last stage, and a blank. The background swaps black/white at every cut up to the hold.

export const SCRIPT = {
  intro: ['we', 'don’t', 'just', 'edit', 'we'] as const,
  run: ['create', 'motion', 'art', 'impact', 'visuals', 'energy', 'precision', 'rhythm', 'vibes', 'graphics', 'transitions', 'ideas', 'feelings'],
  /** the last word typed on in stages */
  outro: ['re', 'repe.', 'repea', 'repeat.'],
};

/** the frame each shot starts: the reference's cuts, one on every hit of its audio */
export const CUTS = [0, 22, 42, 60, 76, 91, 105, 119, 131, 142, 155, 166, 177, 187, 197, 207, 216, 225, 234, 241, 250, 258, 267, 276];
export const END = 282;
