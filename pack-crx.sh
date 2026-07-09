#!/usr/bin/env bash
# Build the upload artifacts for a release:
#   - cleanor-image-extension.zip           (plain ZIP, for normal uploads)
#   - <signing-dir>/cleanor-image-extension-<version>.crx  (signed, for Verified CRX Uploads)
#
# Verified CRX Uploads is enabled on this item, so updates must be uploaded as a CRX signed
# with our private key. See SIGNING.md. The private key lives OUTSIDE this (public) repo.
#
# Usage:  ./pack-crx.sh            # zip + signed crx
#         ./pack-crx.sh --zip-only # just the zip
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Files that make up the extension (keep in sync with the manifest).
FILES=(manifest.json background.js convert-core.js popup.html popup.css app.js icons vendor)

VERSION="$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
echo "Cleanor Image extension · v$VERSION"

# --- 1) plain ZIP ------------------------------------------------------------
rm -f cleanor-image-extension.zip
zip -r -X cleanor-image-extension.zip "${FILES[@]}" -x '*.DS_Store' >/dev/null
echo "✓ zip:  $ROOT/cleanor-image-extension.zip"

[[ "${1:-}" == "--zip-only" ]] && exit 0

# --- 2) signed CRX -----------------------------------------------------------
KEY="${CLEANOR_CRX_KEY:-$HOME/Developer/Web/cleanor-image-extension-signing/cleanor-image-ext.pem}"
CHROME="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUTDIR="$(dirname "$KEY")"

if [[ ! -f "$KEY" ]]; then
  echo "⚠ signing key not found at: $KEY"
  echo "  Set CLEANOR_CRX_KEY, or generate one (see SIGNING.md). Skipping CRX."
  exit 0
fi
if [[ ! -x "$CHROME" ]]; then
  echo "⚠ Chrome not found at: $CHROME (set CHROME_BIN). Skipping CRX."
  exit 0
fi

STAGE="$(mktemp -d)/cleanor-image-extension"
mkdir -p "$STAGE"
cp -R "${FILES[@]}" "$STAGE/"
find "$STAGE" -name '.DS_Store' -delete

"$CHROME" --pack-extension="$STAGE" --pack-extension-key="$KEY" --no-message-box >/dev/null 2>&1 || true
SRC_CRX="$(dirname "$STAGE")/cleanor-image-extension.crx"
if [[ -f "$SRC_CRX" ]]; then
  DEST="$OUTDIR/cleanor-image-extension-$VERSION.crx"
  mv -f "$SRC_CRX" "$DEST"
  rm -rf "$(dirname "$STAGE")"
  echo "✓ crx:  $DEST  ($(head -c4 "$DEST"))"
  echo
  echo "Upload the .crx via Dev Dashboard → Package → Upload new package."
else
  echo "✗ CRX not produced (Chrome pack failed). Check the key/Chrome path."
  rm -rf "$(dirname "$STAGE")"
  exit 1
fi
