#!/bin/sh
# Copies the shared runtime into every game folder and builds upload-ready zips in dist/.
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
for d in games/*/; do
  g=$(basename "$d")
  mkdir -p "$d/lib"
  cp shared/kit.js "$d/lib/kit.js"
  if grep -q 'three.min.js' "$d/index.html"; then cp shared/three.min.js "$d/lib/three.min.js"; fi
  rm -f "dist/$g.zip"
  (cd "$d" && zip -qr "../../dist/$g.zip" . -x '.*')
done
ls -la dist
