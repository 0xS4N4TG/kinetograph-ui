# Credits: Hold Still (archive-reel)

## Photographs: The Metropolitan Museum of Art, Open Access (public domain, CC0)

Fetched with the Met Collection API (`/public/collection/v1.1/search`, `/public/collection/v1/objects/<id>`), `isPublicDomain: true`.

| File(s) | Object | Maker | Date | Medium | Accession | Page |
|---|---|---|---|---|---|---|
| photos/mckay-back.jpg, mckay-mid.png | Donald McKay | Southworth and Hawes | ca. 1850-55 | Daguerreotype | 37.14.1 | https://www.metmuseum.org/art/collection/search/268306 |
| photos/hodges-back.jpg, hodges-mid.png | Miss Hodges of Salem | Southworth and Hawes | ca. 1850 | Daguerreotype | 37.14.20 | https://www.metmuseum.org/art/collection/search/268318 |
| photos/lace-back.jpg, lace-mid.png | [Woman in Black Taffeta Dress and Lace Shawl] | Southworth and Hawes | ca. 1850 | Daguerreotype with applied color | 37.14.4 | https://www.metmuseum.org/art/collection/search/268339 |
| photos/choiselat-landscape.jpg | [Landscape] | Marie-Charles-Isidore Choiselat | 1844 | Daguerreotype | 1994.417 | https://www.metmuseum.org/art/collection/search/267087 |
| photos/talbot-paris.jpg | [Street Scene, Paris] | William Henry Fox Talbot | 1843 | Salted paper print from paper negative | 1988.1018 | https://www.metmuseum.org/art/collection/search/265895 |
| photos/marville-constantine.jpg | [Rue de Constantine] | Charles Marville | 1866 | Albumen silver print from glass negative | 1986.1141 | https://www.metmuseum.org/art/collection/search/264863 |
| photos/plate-268310.jpg | [Unidentified Woman] | Southworth and Hawes | ca. 1850 | Daguerreotype | 37.14.13 | https://www.metmuseum.org/art/collection/search/268310 |
| photos/plate-268315.jpg | [Unidentified Woman] | Southworth and Hawes | ca. 1850 | Daguerreotype | 37.14.18 | https://www.metmuseum.org/art/collection/search/268315 |
| photos/plate-268334.jpg | [Woman in Profile with Lace Collar and Shawl] | Southworth and Hawes | ca. 1850 | Daguerreotype | 37.14.35 | https://www.metmuseum.org/art/collection/search/268334 |

Edits: the `-mid.png` files are the sitter cut out with rembg (isnet-general-use, matte hardened); the `-back.jpg` files
are the same photo with the hole behind the sitter filled by a push-pull blur from its edges plus matched noise
(tastes/archive/tools: `cutfull.py`, `harden.py`, `fillhole.py`). On screen every photo is toned and grained by
tastes/archive (photo.tsx). The accession numbers on the tag and album labels are the Met's real ones for those plates.

## Texture

`archive-textures/film-scan.jpg` (link to tastes/archive/textures): Texturelabs "Paper 338L" from the reference's free
resources (Texturelabs_Paper_338L.jpg),
greyscale, turned upright and downscaled to 1200 px. Texturelabs licence: may be used in videos, not redistributed
as a file; this is a reduced working copy, do not ship it as an asset on its own.

## Sound

All procedural (numpy), no third-party audio: tastes/archive/tools/sfx.py (projector, shutter, film advance, typewriter
keys, bell, paper rustle, thud, page flick, run-out) and tastes/archive/tools/score.py (piano and strings, A minor).

## Facts on screen

- 1839, Paris: the daguerreotype process was made public (19 August 1839); the French state bought it and presented it free to the world.
- 1840s portrait sittings lasted from seconds up to a minute or more; studios used iron posing stands and head rests behind the sitter.
- Long exposures left moving people blurred or invisible in street views.
- A daguerreotype is a unique image on a silvered copper plate: no negative, so no copies (other than re-photographing it).
- Glass negatives (wet collodion, from 1851) could be printed many times, as albumen prints such as Marville's 1866 street.
