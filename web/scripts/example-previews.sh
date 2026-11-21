#!/bin/sh
# Page images for the example library's PDFs, so the reviewer document viewer can show
# them inline: public/examples/<slug>/<name>.pdf -> <name>.png (1600 px on the long side).
# macOS only (Quick Look). Run after `pnpm examples`, which rebuilds public/examples.
set -e
cd "$(dirname "$0")/../public/examples"
tmp=$(mktemp -d)
for pdf in */*.pdf; do
  qlmanage -t -s 1600 -o "$tmp" "$pdf" >/dev/null 2>&1
  mv "$tmp/$(basename "$pdf").png" "${pdf%.pdf}.png"
done
rmdir "$tmp"
echo "Previews written for $(ls */*.pdf | wc -l | tr -d ' ') PDFs."
