// The words on screen and the beat each one lands on. These are placeholder lines written for this component, not
// the song's lyrics: put your own words here (one entry per word, same count per shot, or adjust the layouts in
// shots/). `at` is the frame the word starts to arrive; the frames are the reference's.

const w = (text: string, at: number) => ({ text, at });

export const LINES = {
  // two stacks of chrome words in the night sky
  a: [
    [w('the', 16), w('night', 30), w('keeps', 42), w('on', 52), w('calling', 60), w('ME', 70), w('back', 82), w('home', 88)],
    [w('every', 100), w('single', 110), w('time', 132), w('you', 140), w('call', 148)],
  ],
  // black words on the orange band, two rows the camera pans along
  b: [w('just', 168), w('one', 177), w('more', 196), w('look', 207), w('and', 222), w('I', 228), w('fold', 243), w('again', 252)],
  // small blue words floating in the clouds
  c: [w('soft', 272), w('and', 280), w('slow', 290), w('we', 300), w('drift', 305), w('away', 318), w('from', 328), w('here', 335)],
  // the finale: a line of words the camera travels along, then the last stack
  d: [
    [w('so', 358), w('tell', 370), w('me', 384), w('what', 396), w('you', 408), w('want', 420)],
    [w('stay', 432), w('a', 448), w('little', 458), w('longer', 472), w('tonight', 496)],
  ],
};
