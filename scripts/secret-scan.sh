#!/usr/bin/env bash
# Lightweight secret scan for staged files (default) or entire repo with --all.
set -euo pipefail

MODE=${1:-staged}
if [ "$MODE" = "--all" ]; then
  TARGET_FILES=$(git ls-files)
  [ -z "$TARGET_FILES" ] && { echo "No files to scan."; exit 0; }
  echo "Scanning all tracked files for secrets..."
else
  TARGET_FILES=$(git diff --cached --name-only --diff-filter=ACM)
  if [ -z "$TARGET_FILES" ]; then
    echo "No staged files to scan for secrets."
    exit 0
  fi
  echo "Scanning staged files for secrets..."
fi

PATTERN='('
PATTERN+=$'AI\x7aa[0-9A-Za-z_-]{30,}|'
PATTERN+=$'s\x6b-'"[A-Za-z0-9]{20,}|"
PATTERN+=$'s\x6b-proj-'"[A-Za-z0-9_-]{20,}|"
PATTERN+=$'gs\x6b_'"[A-Za-z0-9]{20,}|"
PATTERN+=$'h\x66_'"[A-Za-z0-9]{20,}|"
PATTERN+='-----BEGIN PRIVATE KEY-----|'
PATTERN+=$'xox[baprs]-'"[A-Za-z0-9-]{10,}|"
PATTERN+='"type": "service_account"'
PATTERN+=')'

if rg --pcre2 -n "$PATTERN" $TARGET_FILES -g '!scripts/secret-scan.sh'; then
  echo "❌ Potential secret detected. Review the above matches before committing."
  exit 1
fi

echo "✅ Secret scan passed."
