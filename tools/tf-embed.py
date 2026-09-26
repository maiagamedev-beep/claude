#!/usr/bin/env python3
"""Embeds Tasty Factory assets so the game runs from file:// and from any host.
  tf-embed.py data   -> writes src/tasty-factory/assets-data.js (models + textures as data URIs)
  tf-embed.py page   -> writes games/tasty-factory/index.html and patches game.js (icons + fonts inlined)
"""
import base64, os, re, sys, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src/tasty-factory')
OUT = os.path.join(ROOT, 'games/tasty-factory')
MIME = {'.glb': 'model/gltf-binary', '.png': 'image/png', '.woff2': 'font/woff2'}

def uri(rel):
    p = os.path.join(SRC, rel)
    ext = os.path.splitext(p)[1]
    return 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(open(p, 'rb').read()).decode())

def data():
    entries = []
    for d in ['factory', 'food', 'chars', 'car']:
        for dp, _, fs in os.walk(os.path.join(SRC, 'assets', d)):
            for f in sorted(fs):
                if f.endswith(('.glb', '.png')):
                    rel = os.path.relpath(os.path.join(dp, f), SRC).replace(os.sep, '/')
                    entries.append('%r:%r' % (rel, uri(rel)))
    open(os.path.join(SRC, 'assets-data.js'), 'w').write('export default {\n' + ',\n'.join(entries) + '\n};\n')

def inline(text):
    return re.sub(r'url\((assets/(?:icons|fonts)/[\w.-]+)\)', lambda m: 'url(%s)' % uri(m.group(1)), text)

def page():
    open(os.path.join(OUT, 'index.html'), 'w').write(inline(open(os.path.join(SRC, 'index.html')).read()))
    g = os.path.join(OUT, 'game.js')
    js = inline(open(g).read())
    open(g, 'w').write(js)
    lic = os.path.join(OUT, 'licenses'); os.makedirs(lic, exist_ok=True)
    shutil.copy(os.path.join(SRC, 'assets/CREDITS.txt'), lic)
    for f in os.listdir(os.path.join(SRC, 'assets/fonts')):
        if f.endswith('.txt'): shutil.copy(os.path.join(SRC, 'assets/fonts', f), lic)

{'data': data, 'page': page}[sys.argv[1]]()
