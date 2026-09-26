#!/bin/sh
# Builds games/tasty-factory/game.js from src/tasty-factory and zips the upload folder.
set -e
cd "$(dirname "$0")/.."
node_modules/.bin/esbuild src/tasty-factory/main.js --bundle --minify --format=iife --target=es2019 --outfile=games/tasty-factory/game.js --log-level=warning
rm -f dist/tasty-factory.zip
(cd games/tasty-factory && zip -qr ../../dist/tasty-factory.zip . -x '.*' -x 'proto.*')
ls -la games/tasty-factory/game.js dist/tasty-factory.zip
