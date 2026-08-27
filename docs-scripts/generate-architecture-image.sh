#!/usr/bin/env bash
# Regenerate the Clean Architecture layered-diagram PNG from the Mermaid source.
#
# Requires: @mermaid-js/mermaid-cli (for rendering to PNG)
#
# On this machine we must pass a puppeteer config that disables the sandbox
# (Chromium cannot launch with the default sandbox here).
#
# Usage:   ./docs-scripts/generate-architecture-image.sh
# Output:  documentation/images/clean-architecture-layers.png

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/docs-scripts/clean-architecture-layers.mmd"
OUT="$ROOT/documentation/images/clean-architecture-layers.png"

TMP_CFG="$(mktemp)"
trap 'rm -f "$TMP_CFG"' EXIT
cat > "$TMP_CFG" <<'JSON'
{
  "args": ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
}
JSON

mkdir -p "$ROOT/documentation/images"

npx --yes @mermaid-js/mermaid-cli -p "$TMP_CFG" -i "$SRC" -o "$OUT" -b white -w 1400

echo "Regenerated: $OUT"
