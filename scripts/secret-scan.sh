#!/usr/bin/env bash
# Lightweight secret scan for staged files using ripgrep patterns.
set -euo pipefail

CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$CHANGED_FILES" ]; then
  echo "No staged files to scan for secrets."
  exit 0
fi

PATTERN='(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|-----BEGIN PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|"type": "service_account")'

if rg --pcre2 -n "$PATTERN" $CHANGED_FILES; then
  echo "❌ Potential secret detected. Review the above matches before committing."
  exit 1
fi

echo "✅ Secret scan passed (staged files)."
