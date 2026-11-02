"""Explicit maintenance command; never run by build. Vendor official, unmodified WOFF2.

Only latin/latin-ext subsets are included. Other scripts and emoji use system fallbacks.
Each family retains its upstream OFL, metadata, URLs and binary SHA-256 checksums.
"""
from pathlib import Path
import hashlib
import json
import re
import urllib.parse
import urllib.request

FRONTEND = Path(__file__).resolve().parents[1]
TARGET = FRONTEND / 'src/assets/paperie-fonts'
FAMILIES = [
    ('caveat', 'Caveat', 'Caveat:wght@400..700'),
    ('kalam', 'Kalam', 'Kalam:wght@400;700'),
    ('patrickhand', 'Patrick Hand', 'Patrick Hand'),
    ('nunito', 'Nunito', 'Nunito:ital,wght@0,200..900;1,200..900'),
    ('quicksand', 'Quicksand', 'Quicksand:wght@300..700'),
    ('fraunces', 'Fraunces', 'Fraunces:ital,wght@0,100..900;1,100..900'),
    ('cormorantgaramond', 'Cormorant Garamond', 'Cormorant Garamond:ital,wght@0,300..700;1,300..700'),
]
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'}


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=45).read()


def main():
    pending = []
    faces = ['/* Official Google Fonts binaries, unchanged. See the OFL.txt files and manifest.json in src/assets/paperie-fonts. */']
    manifest = []
    for slug, name, query in FAMILIES:
        upstream = f'https://raw.githubusercontent.com/google/fonts/main/ofl/{slug}/'
        license_text = fetch(upstream + 'OFL.txt')
        if b'SIL OPEN FONT LICENSE Version 1.1' not in license_text:
            raise RuntimeError(f'Unexpected license for {name}; no files written.')
        metadata = fetch(upstream + 'METADATA.pb')
        css_url = 'https://fonts.googleapis.com/css2?' + urllib.parse.urlencode({'family': query, 'display': 'swap'})
        css = fetch(css_url).decode()
        entries = []
        for subset, face in re.findall(r'/\*\s*([^*]+?)\s*\*/\s*(@font-face\s*\{.*?\})', css, re.S):
            if subset.strip() not in ('latin', 'latin-ext'):
                continue
            url = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', face).group(1)
            binary = fetch(url)
            if binary[:4] != b'wOF2':
                raise RuntimeError(f'Expected WOFF2 for {name}; no files written.')
            checksum = hashlib.sha256(binary).hexdigest()
            filename = checksum[:16] + '.woff2'
            pending.append((TARGET / slug / filename, binary))
            face = face.replace(f"'{name}'", f"'Matcha {name}'")
            face = face.replace(url, f'../../assets/paperie-fonts/{slug}/{filename}')
            faces.append(f'/* {name}: {subset.strip()} */\n{face}')
            entries.append({'subset': subset.strip(), 'url': url, 'file': filename, 'sha256': checksum})
        if not entries:
            raise RuntimeError(f'No latin WOFF2 faces for {name}; no files written.')
        pending.extend([(TARGET / slug / 'OFL.txt', license_text), (TARGET / slug / 'METADATA.pb', metadata)])
        manifest.append({'family': name, 'license': 'OFL-1.1', 'license_url': upstream + 'OFL.txt', 'css_url': css_url, 'files': entries})
    # Validate every family before making any writes.
    for path, content in pending:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    (TARGET / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (FRONTEND / 'src/pages/Agenda/AgendaFontFaces.css').write_text('\n\n'.join(faces) + '\n', encoding='utf-8')
    files = {path: data for path, data in pending if path.suffix == '.woff2'}
    print(f'Vendored {len(FAMILIES)} OFL families, {len(files)} unique WOFF2 files, {sum(len(data) for data in files.values())} bytes.')


if __name__ == '__main__':
    main()
