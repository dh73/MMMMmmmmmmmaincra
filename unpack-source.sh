#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE="${TMPDIR:-/tmp}/canto-de-barro-src.tgz"
EXPECTED="2cf8185682e3bfe52f00d4ebbfcc619797153a5479a1f0a1da030395d70a39d5"

cat "$ROOT"/.payload/part-* | base64 --decode > "$ARCHIVE"
printf '%s  %s\n' "$EXPECTED" "$ARCHIVE" | sha256sum --check -
tar -xzf "$ARCHIVE" -C "$ROOT"
printf 'Canto de Barro source restored and verified.\n'
