#!/usr/bin/env python3
"""Writes games/<slug>/index.html from a title, background, CSS variables and extra CSS.
usage: mkhtml.py slug "Title" "#bg" "css vars" "extra css" [3d]"""
import sys, os
slug, title, bg, vars_, extra = sys.argv[1:6]
three = len(sys.argv) > 6 and sys.argv[6] == '3d'
os.makedirs(f'games/{slug}', exist_ok=True)
fx = '\n<canvas id="fx"></canvas>' if three else ''
lib3 = '\n<script src="./lib/three.min.js"></script>' if three else ''
pos = 'position:absolute;left:0;top:0;' if three else ''
open(f'games/{slug}/index.html', 'w').write(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<link rel="icon" href="data:,">
<title>{title}</title>
<style>
  html,body{{margin:0;height:100%;overflow:hidden;background:{bg};touch-action:none;overscroll-behavior:none}}
  canvas{{display:block;{pos}}}
  #fx{{pointer-events:none}}
  :root{{{vars_}}}
{extra}
</style>
</head>
<body>
<canvas id="c"></canvas>{fx}{lib3}
<script src="./lib/kit.js"></script>
<script src="./game.js"></script>
</body>
</html>
''')
