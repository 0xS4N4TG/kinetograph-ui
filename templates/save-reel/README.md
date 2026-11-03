# save-reel

A 39 s app-concept reel (1080x810, 30 fps): a post is liked and saved, the save gets lost
in the collection, and a "save reminder" brings it back when you need it. Flat UI on a pale canvas, a camera that
pushes in and whips between details with heavy motion blur, word-by-word type on dark gradients, hand-written ink
notes, and letterbox bars that open and close with the shots.

The timing is the reference's, measured frame by frame. Each shot's first and last frame is in `index.tsx`
(`SHOTS`), and the frames inside the shot files are reference frames too.

## Files

| File | What |
|---|---|
| `index.tsx` | The composition (`SaveReel`), the shot table, the letterbox |
| `lib.tsx` | Canvas, fonts, timing helpers, letterbox curve, `Cam` (2D camera with motion blur), `Ink` (hand-written words, wiped on left to right), `handLine`/`curve` (hand-drawn arrows), icons, `ReminderMark`, `AppGlyph`, cursors |
| `post.tsx` | The feed post card (`PostCard`, `Tag`, `Avatar`) and its layout constants (`POST`) |
| `shots/sNN.tsx` | One file per shot; `shots/[a-d]-*.tsx` are their helpers and drawn pictures |
| `sound.ts` | The sound, synthesised: a chord bed, whooshes on the whips, UI clicks and pops, pen scratch, a thud, a chime |
| `public/photos/` | The posts' pictures: public-domain photos and a poster from the Internet Archive, with `CREDITS.md` |
| `tools/fetch-photos.sh` | Re-downloads and resizes `public/photos/` from archive.org |

## Pictures

The posts' pictures are public-domain photos from the Internet Archive (NASA photos, a Cleveland Museum of Art CC0
photochrom, a 1906 exhibition poster), in `public/photos/`. `public/photos/CREDITS.md` says where each comes from
and why it is public domain. The editor screenshot is drawn in code. To use your own pictures in the feed, put them
in `public/media/` (not committed) and pass them as the `media` prop:

```sh
--props '{"media":{"hills":"hills.jpg","editor":"editor.png","photo":"photo.jpg"}}'
```

## Fonts

All from `@remotion/google-fonts`: Inter Tight (the UI), Archivo Black (the poster and the big words), Gochi Hand
(the red notes) and Caveat ("Forever$").

## Render

From the `kinetograph-ui` root, with `../kinetograph` built:

```sh
node ../kinetograph/packages/cli/dist/cli.js strip templates/save-reel/index.tsx -n 12 -o templates/save-reel/out/strip.png
node ../kinetograph/packages/cli/dist/cli.js render templates/save-reel/index.tsx -o templates/save-reel/out/save-reel.mp4
node ../kinetograph/packages/cli/dist/cli.js audio analyze templates/save-reel/index.tsx
```

The reference reel goes in `reference/reel.mp4`; it and `out/` are never committed.
