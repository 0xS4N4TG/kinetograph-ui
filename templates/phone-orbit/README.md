# phone-orbit

A 3.2 s UI promo clip (1920x1080, 60 fps, 193 frames), timed to a measured 960x540 reference. A phone showing a
social post starts as a huge close-up of its lower edge, cuts to a pulled-back frame and glides to rest. Chat bubbles,
avatars and icon chips pop in around it. A hand reaches into the post's photo and lifts the phone, and the screen swaps
to a second state as the view count reaches its cap.

Composition id: `PhoneOrbit`.

Nothing in it is a third-party picture. The desk photo, the second screen, the hand, the avatars, the logo and the
emoji are drawn in code, and each picture has a prop slot for your own file.

## Props

Pictures are file names in `public/` next to `index.tsx` (resolved with `staticFile`); an empty string draws the stand-in.
Defaults are in `props.ts`.

| Prop | Default | What |
|---|---|---|
| `brand` | `Kinetograph` | name in the post header |
| `postText` | "Our whole launch video is Kinetograph / components. Shipped in an afternoon" | the black caption pill; `\n` makes a line break; the type shrinks to fit |
| `subtitleBefore`, `subtitleAfter` | `This...`, `is a phone.` | the small caption on the photo; it swaps at frame 98 and goes at the second picture |
| `countFrom`, `countTo`, `countUnit`, `countReachedAt` | 10, 999, `k`, 178 | the view count: linear, in 24 fps steps like the reference |
| `replyBlueLeft`, `replyBlueRight`, `replyGrey` | "Which component is this?!", "NEED THIS ASAP", "This is peak" | the three bubble texts (a drawn flame follows the grey one) |
| `appTitle`, `appLabelA`, `appTimeA`, `appDayA`, `appLabelB`, `appTimeB`, `appDayB`, `appTotal`, `appNote`, `appFooter` | "Edit sleep schedule", "GO TO BED", "21:15", "Tonight", "WAKE UP", "00:50", "Tomorrow", "3 h 35 min", a note, a footer link | text on the drawn second screen state (a clock dial in a gold-cased phone) |
| `holdFps` | `24` | the source rate the motion is held to. The reference was shot at 24 fps and held to 60 (each picture lasts 2.5 frames); `24` reproduces that, `60` is fully smooth |
| `statusTime` | `9:41` | clock in the status bar |
| `background`, `bubbleBlue`, `bubbleGrey`, `accent`, `noteColor` | `#000000`, `#0a84ff`, `#e6e6e9`, `#1a73ff`, `#f2c230` | colours; `accent` is the logo, `noteColor` the sticky note |
| `uiFont`, `monoFont`, `captionFont` | Geist, Geist Mono, Roboto Condensed | font families; the defaults load from Google Fonts. The count uses `monoFont`, the caption pill `captionFont` (Roboto Condensed is the reference's caption face), everything else `uiFont` |
| `photo` | empty | the post photo, a picture or a video (`.mp4`, `.webm`, `.mov`); when set, the drawn desk, hand and phone are replaced and it does a slow zoom and turn instead of the drawn camera swing. A video is muted and covers the screen |
| `photoStart` | `0` | seconds into `photo` where a video starts; ignored for a still |
| `photoAfter` | empty | the picture or video that replaces the first at frame 178 |
| `photoAfterStart` | `0` | seconds into `photoAfter` where a video starts; ignored for a still |
| `logo` | empty | the header logo |
| `avatars` | four empty strings | four avatar pictures, in order: top left, lower left, right, lower right |

`phoneOrbitSchema` (zod) is on the Composition, so Studio draws a form for the props.

## Files

| File | What |
|---|---|
| `index.tsx` | the composition and `registerRoot` |
| `props.ts` | prop schema and defaults |
| `phone.tsx` | the phone (body, status bar, header, caption, count), its camera (`phoneCam`) and the final push-in |
| `desk.tsx` | the drawn desk photo (one world, one camera), the hand, and the drawn second screen state |
| `orbit.tsx` | bubbles, avatars and chips, and their pop-in springs |
| `art.tsx` | drawn icons, emoji and portraits |
| `lib.ts` | constants, easing helpers, fonts |

## Render

From the `kinetograph-ui` root, with `../kinetograph` built:

```sh
node ../kinetograph/packages/cli/dist/cli.js still templates/phone-orbit/index.tsx 100 --comp PhoneOrbit -o templates/phone-orbit/out/f100.png
node ../kinetograph/packages/cli/dist/cli.js render templates/phone-orbit/index.tsx --comp PhoneOrbit -o templates/phone-orbit/out/phone-orbit.mp4
npx tsc -p templates/phone-orbit --noEmit
```

To use your own pictures, put them in `templates/phone-orbit/public/` and pass
`--props '{"photo":"desk.jpg","photoAfter":"app.jpg","avatars":["a.jpg","b.jpg","c.jpg","d.jpg"]}'`.

## Use your own video

Put the clip in `templates/phone-orbit/public/` and name it in `photo` (and `photoAfter`); a `.mp4`, `.webm` or `.mov`
extension makes it a video. It plays from `photoStart` seconds (the second clip from `photoAfterStart`), muted, covering
the screen with the same slow zoom and turn a still gets, and is held to `holdFps` like the rest. The clip needs about
3 s after its start for `photo` (frames 0-177) and about 0.3 s for `photoAfter` (frames 178-192).

```sh
node ../kinetograph/packages/cli/dist/cli.js render templates/phone-orbit/index.tsx --comp PhoneOrbit \
  --props '{"photo":"clip.mp4","photoStart":6.5,"photoAfter":"clip.mp4","photoAfterStart":9.5}' -o templates/phone-orbit/out/phone-orbit-clip.mp4
```

Skip title cards or slates by setting the start past them. `public/stock/` is git-ignored: keep downloaded stock footage
there so it never ships.

## Timing (frames at 60 fps)

| Frames | What |
|---|---|
| 0-37 | close-up of the phone's lower edge, shrinking and settling; the photo's camera tilts and rises over the mat |
| 38 | hard cut to the pulled-back frame (the reference cuts here too) |
| 38-100 | the phone slides down and shrinks to its resting size while the photo's camera pans from the keyboard to the phone, turning and zooming in |
| 77-104 | the bubbles, avatars and chips pop in (spring, about 20% overshoot), staggered 77 to 84 |
| 98 | subtitle changes to `subtitleAfter` |
| 126-158 | the hand sweeps in from the lower right and rests with its index finger on the phone's camera |
| 158-177 | the hand grips the phone and drags it off to the lower right, blurred |
| 158-192 | slow push-in on the whole scene (7.5%) |
| 178 | cut to the second picture; the count is capped |

## How the desk photo works

The reference's photo is a handheld video. Here it is one drawn world (wood, a cutting mat, a keyboard, two sticky notes,
a phone, a cable) seen by one camera: zoom, turn and a centre point, keyed in `CAM` in `desk.tsx`. The keys were fitted
by tracking where the sticky note, the keyboard's end and the phone sit in the reference at frames 0, 8, 15, 25, 35,
38, 43, 48, 53, 58, 63, 68, 73, 78, 83 and 90, then solving for the camera that puts the drawn objects there. Everything
else in the photo (blur, dimming, the lamp's light falling off to the right) is keyed on the frame.

## Differences from the reference

- The pictures are drawn, so they cannot match the footage pixel for pixel: wood grain, the mat's print, the keyboard's
  keys, the hand's skin and the knit cuff are flat vector shading with a blur, where the reference has real texture. The
  hand is stylised: its shape, tone, reach, grip and drag follow the reference, its anatomy does not.
- One object in the drawn desk does not follow a rigid camera in the reference (the keyboard's apparent turn between
  frames 43 and 58 is larger than the rest of the scene's); here it stays rigid, so it sits a little off at frame 58.
- The second state is a drawn clock dial with the reference's layout and colours; its small type is placeholder text.
- The avatars are flat drawn portraits, not photographs.
- The reference's motion blur on the grabbed phone is approximated with a Gaussian blur.
