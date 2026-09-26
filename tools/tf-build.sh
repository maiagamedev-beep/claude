#!/bin/sh
# Builds games/tasty-factory (index.html + game.js, every asset embedded) from src/tasty-factory and zips it.
set -e
cd "$(dirname "$0")/.."
mkdir -p games/tasty-factory
python3 tools/tf-embed.py data
node_modules/.bin/esbuild src/tasty-factory/main.js --bundle --minify --format=iife --target=es2019 --outfile=games/tasty-factory/game.js --log-level=warning
python3 tools/tf-embed.py page
rm -f dist/tasty-factory.zip
(cd games/tasty-factory && zip -qr ../../dist/tasty-factory.zip . -x '.*')
ls -la games/tasty-factory dist/tasty-factory.zip
