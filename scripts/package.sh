#!/usr/bin/env bash
# Build dist/marbl-web.zip: the playable web build for itch.io / game portals
# (index.html at the zip root, same files as the GitHub Pages deploy).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist/web && mkdir -p dist/web
cp -r index.html manifest.webmanifest sw.js css js icons fonts dist/web/
rm -f dist/marbl-web.zip
(cd dist/web && zip -qr ../marbl-web.zip .)
cp dist/marbl-web.zip store/marbl-web.zip
echo "dist/marbl-web.zip + store/marbl-web.zip ($(du -h dist/marbl-web.zip | cut -f1), $(cd dist/web && find . -type f | wc -l) files)"
