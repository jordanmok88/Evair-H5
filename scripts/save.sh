#!/usr/bin/env bash
# Evair H5 — one-command "save everything".
# Stages, commits, and pushes to ALL configured git remotes.
# Netlify: production deploy is triggered by push to GitHub (origin) on the
# branch Netlify watches (main). There is no separate "push to Netlify".
#
# Usage:
#   bash scripts/save.sh                # auto commit message (timestamp)
#   bash scripts/save.sh "message here" # custom message
#   bash scripts/save.sh --skip-if-clean # no-op if nothing changed (exit 0)

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

msg="${1:-}"
skip_if_clean=false
if [ "${msg}" = "--skip-if-clean" ]; then
  skip_if_clean=true
  msg=""
fi
if [ -z "${msg}" ]; then
  msg="save: $(date '+%Y-%m-%d %H:%M:%S')"
fi

branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "HEAD")
echo "────────────────────────────────────────"
echo "  H5 save ($branch)"
echo "  dir:    $PROJECT_DIR"
echo "────────────────────────────────────────"

if git diff --quiet HEAD 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "  ✓ no local changes"
  if $skip_if_clean; then
    exit 0
  fi
else
  echo "  • staging all changes..."
  git add -A
  echo "  • committing: $msg"
  git commit -m "$msg" --quiet
fi

echo ""
echo "  • pushing to remotes..."
fail=0
while read -r remote; do
  [ -z "$remote" ] && continue
  echo "    → $remote ($branch)"
  if git push "$remote" "$branch" 2>&1 | sed 's/^/      /'; then
    :
  else
    echo "      ✗ push to $remote failed"
    fail=1
  fi
done <<< "$(git remote)"

echo ""
if [ $fail -eq 0 ]; then
  echo "  ✓ H5 save complete"
else
  echo "  ⚠ one or more pushes failed — review output above"
  exit 1
fi
