#!/usr/bin/env bash
#
# Daily git fetch/pull + changelog report for Evair repos.
#
# Output:
#   ~/Library/Logs/Evair/daily-pull-YYYY-MM-DD.log           (full, append)
#   ~/Library/Logs/Evair/daily-pull-latest-summary.txt       (compact; easy to open)
#
# Usage:
#   bash scripts/daily-pull-report.sh
#   bash scripts/daily-pull-report.sh --dry-run
#
# Schedule on macOS: scripts/launchd/README-daily-pull.md
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

LOG_ROOT="${HOME}/Library/Logs/Evair"
mkdir -p "$LOG_ROOT"

DAY="$(date '+%Y-%m-%d')"
TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
REPORT_FULL="${LOG_ROOT}/daily-pull-${DAY}.log"
SUMMARY_LAST="${LOG_ROOT}/daily-pull-latest-summary.txt"

H5_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# path|branch|remote - extend this list if you keep more clones in Cursor Codes/
REPOS=(
  "${H5_ROOT}|main|origin"
  "${H5_ROOT%/*}/Evair-Laravel|master|origin"
)

{
  echo "==============================================================="
  echo "  Evair daily pull -- ${TS}"
  echo "==============================================================="
} | tee "$SUMMARY_LAST" >> "$REPORT_FULL"

TOTAL_UPDATED=0
TOTAL_ERRORS=0

repo_block() {
  local path="$1" branch="$2" remote="$3"

  [[ -z "${path}" ]] && return 0
  if [[ ! -e "${path}/.git" ]]; then
    echo "    SKIP: not a repo (missing .git) - ${path}" | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    return 0
  fi

  echo "" | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
  echo "--- $(basename "$path") [$branch @ $remote] ---" | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
  echo "    Path: ${path}" >> "$REPORT_FULL"

  if ! cd "$path"; then
    echo "    ERROR: cannot cd - skipped." | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    ((TOTAL_ERRORS += 1)) || true
    return 1
  fi

  local cur_branch
  cur_branch="$(git symbolic-ref -q --short HEAD 2>/dev/null || echo UNKNOWN)"
  if [[ "$cur_branch" != "$branch" ]]; then
    echo "    SKIP: on ${cur_branch}, expected ${branch}." | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    return 0
  fi

  if ! git fetch "$remote" >> "$REPORT_FULL" 2>&1; then
    echo "    ERROR: git fetch failed - see ${REPORT_FULL}" | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    ((TOTAL_ERRORS += 1)) || true
    return 1
  fi

  local before after pull_out pull_status=0
  before="$(git rev-parse HEAD 2>/dev/null)"

  if [[ "$DRY_RUN" == true ]]; then
    echo "    (dry-run) fetch OK - no merge." | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    return 0
  fi

  pull_out="$(git pull "$remote" "$branch" 2>&1)" || pull_status=$?
  echo "$pull_out" >> "$REPORT_FULL"
  after="$(git rev-parse HEAD 2>/dev/null)"

  if [[ "$pull_status" -ne 0 ]]; then
    echo "    PULL FAILED (exit ${pull_status}) - ${REPORT_FULL}" | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    echo "$pull_out" | sed 's/^/      /' | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    ((TOTAL_ERRORS += 1)) || true
    return 1
  fi

  if [[ "$before" == "$after" ]]; then
    echo "    Already up to date." | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
    return 0
  fi

  ((TOTAL_UPDATED += 1)) || true
  echo "    New commits [$before .. $after]:" | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
  git --no-pager log --oneline "${before}..${after}" 2>/dev/null | sed 's/^/      /' | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"
}

for triple in "${REPOS[@]}"; do
  IFS='|' read -r rp br rm <<<"$triple"
  rp="${rp//[[:space:]]/}"
  [[ -z "$rp" ]] && continue
  repo_block "$rp" "$br" "$rm"
done

{
  echo ""
  echo "Done - repos updated: ${TOTAL_UPDATED}; errors: ${TOTAL_ERRORS}."
  echo "Full transcript: ${REPORT_FULL}"
  echo "Summary file: ${SUMMARY_LAST}"
} | tee -a "$REPORT_FULL" >> "$SUMMARY_LAST"

if [[ "${TOTAL_ERRORS}" -gt 0 ]]; then
  exit 1
fi
exit 0
