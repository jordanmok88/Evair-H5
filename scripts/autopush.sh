#!/bin/bash
# Auto-commit and push to GitHub on file changes.
# Netlify picks up the push and deploys automatically.

WATCH_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEBOUNCE=5
POLL_INTERVAL=3

cd "$WATCH_DIR" || exit 1

echo "🔄 Autopush watching: $WATCH_DIR"
echo "   Debounce: ${DEBOUNCE}s | Poll: ${POLL_INTERVAL}s"
echo "   Press Ctrl+C to stop"
echo ""

get_hash() {
  find "$WATCH_DIR" \
    -not -path '*/.git/*' \
    -not -path '*/node_modules/*' \
    -not -path '*/dist/*' \
    -not -path '*/scripts/autopush.sh' \
    \( -name '*.tsx' -o -name '*.ts' -o -name '*.css' -o -name '*.html' -o -name '*.json' -o -name '*.js' -o -name '*.env' \) \
    -newer "$WATCH_DIR/.git/index" \
    2>/dev/null | head -1
}

last_push_time=0

while true; do
  changed=$(get_hash)

  if [ -n "$changed" ]; then
    # Check if git has actual changes
    if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
      now=$(date +%s)
      # Debounce: wait before pushing
      sleep "$DEBOUNCE"

      # Re-check after debounce (more changes may have come in)
      if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[$timestamp] Changes detected, pushing..."

        git add -A
        git commit -m "auto: update $(date '+%H:%M:%S')" --quiet 2>/dev/null

        if git push --quiet 2>&1; then
          echo "[$timestamp] ✅ Pushed successfully. Triggering Netlify build..."
          curl -s -X POST https://api.netlify.com/build_hooks/69b57d8cc1a75fc66b266223 > /dev/null 2>&1
          echo "[$timestamp] 🚀 Netlify build triggered. Live in ~30-60s."
        else
          echo "[$timestamp] ❌ Push failed. Will retry on next change."
        fi
        echo ""
      fi
    fi
  fi

  sleep "$POLL_INTERVAL"
done
