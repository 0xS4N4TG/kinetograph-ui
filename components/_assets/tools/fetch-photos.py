"""Fetches the shared public-domain photo set into components/_assets/photos and writes CREDITS.md.

NASA Image and Video Library (NASA media is generally not subject to copyright in the United States). Run: python3 -I components/_assets/tools/fetch-photos.py
"""
import json, os, subprocess, sys, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'photos')
os.makedirs(ROOT, exist_ok=True)
get = lambda url: urllib.request.urlopen(url, timeout=30).read()
credits = []

def save(name, url, credit):
    out = os.path.join(ROOT, name + '.jpg')
    if not os.path.exists(out):
        data = get(url)
        open(out, 'wb').write(data)
        subprocess.run(['sips', '-Z', '1400', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', out, '--out', out],
                       capture_output=True, check=True)
    credits.append(f'- `{name}.jpg`: {credit}')

# NASA: a few searches, the first good stills of each
nasa = {'earth': 'earth from orbit', 'astronaut': 'astronaut spacewalk', 'aurora': 'aurora from space station',
        'nebula': 'hubble nebula', 'galaxy': 'hubble galaxy', 'mars': 'mars surface rover', 'launch': 'rocket launch pad',
        'moon': 'apollo lunar surface', 'storm': 'hurricane from space', 'city': 'city lights at night from space',
        'desert': 'sahara desert from space', 'glacier': 'glacier antarctica', 'reef': 'coral reef from space',
        'river': 'river delta from orbit', 'volcano': 'volcano eruption from space', 'jet': 'research aircraft flight',
        'balloon': 'scientific balloon launch', 'telescope': 'telescope observatory night', 'sun': 'solar flare sdo',
        'saturn': 'cassini saturn rings', 'jupiter': 'juno jupiter', 'iss': 'international space station',
        'clouds': 'cloud formations from space', 'mountains': 'himalaya from space'}
n = 0
for key, q in nasa.items():
    url = 'https://images-api.nasa.gov/search?' + urllib.parse.urlencode({'q': q, 'media_type': 'image'})
    items = json.loads(get(url))['collection']['items'][:6]
    taken = 0
    for it in items:
        if taken >= 2: break
        d = it['data'][0]
        href = next((l['href'] for l in it.get('links', []) if l.get('render') == 'image'), None)
        if not href: continue
        big = href.replace('~thumb', '~large')
        try:
            n += 1; save(f'nasa-{key}-{taken + 1}', big, f'NASA, "{d.get("title", "")[:80]}" ({d.get("nasa_id")}), {d.get("date_created", "")[:4]}')
            taken += 1
        except Exception as e:
            print('skip', key, e, file=sys.stderr)

open(os.path.join(ROOT, 'CREDITS.md'), 'w').write(
    '# Photos\n\nPublic domain: NASA media, not subject to copyright in the United States. Per NASA\'s media usage '
    'guidelines, do not use them to imply NASA endorses anything.\n\n' + '\n'.join(credits) + '\n')
print(len(credits), 'photos')
