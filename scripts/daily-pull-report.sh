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

: > "${SUMMARY_LAST}"

{
  echo "==============================================================="
  echo "  Evair daily pull -- ${TS}"
  echo "==============================================================="
} | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"

TOTAL_UPDATED=0
TOTAL_ERRORS=0

repo_block() {
  local path="$1" branch="$2" remote="$3"

  [[ -z "${path}" ]] && return 0
  if [[ ! -e "${path}/.git" ]]; then
    echo "    SKIP: not a repo (missing .git) - ${path}" | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    return 0
  fi

  echo "" | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
  echo "--- $(basename "$path") [$branch @ $remote] ---" | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
  echo "    Path: ${path}" | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"

  if ! cd "$path"; then
    echo "    ERROR: cannot cd - skipped." | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    ((TOTAL_ERRORS += 1)) || true
    return 1
  fi

  local cur_branch
  cur_branch="$(git symbolic-ref -q --short HEAD 2>/dev/null || echo UNKNOWN)"
  if [[ "$cur_branch" != "$branch" ]]; then
    echo "    SKIP: on ${cur_branch}, expected ${branch}." | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    return 0
  fi

  if ! git fetch "$remote" >> "$REPORT_FULL" 2>&1; then
    echo "    ERROR: git fetch failed - see ${REPORT_FULL}" | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    ((TOTAL_ERRORS += 1)) || true
    return 1
  fi

  local before after pull_out pull_status=0
  before="$(git rev-parse HEAD 2>/dev/null)"

  if [[ "$DRY_RUN" == true ]]; then
    echo "    (dry-run) fetch OK - no merge." | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    return 0
  fi

  pull_out="$(git pull "$remote" "$branch" 2>&1)" || pull_status=$?
  echo "$pull_out" >> "$REPORT_FULL"
  after="$(git rev-parse HEAD 2>/dev/null)"

  if [[ "$pull_status" -ne 0 ]]; then
    echo "    PULL FAILED (exit ${pull_status}) - ${REPORT_FULL}" | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    echo "$pull_out" | sed 's/^/      /' | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    ((TOTAL_ERRORS += 1)) || true
    return 1
  fi

  if [[ "$before" == "$after" ]]; then
    echo "    Already up to date." | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
    return 0
  fi

  ((TOTAL_UPDATED += 1)) || true
  echo "    New commits [$before .. $after]:" | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
  git --no-pager log --oneline "${before}..${after}" 2>/dev/null | sed 's/^/      /' | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"
}

for triple in "${REPOS[@]}"; do
  IFS='|' read -r rp br rm <<<"$triple"
  rp="${rp//[[:space:]]/}"
  [[ -z "$rp" ]] && continue
  repo_block "$rp" "$br" "$rm"
done

{
  echo ""
  echo "--- Reminder：套餐网络运营商展示 / Plan network names (Jordan + China ops) ---"
  echo ""
  echo "Customers see carrier text on H5/App plan cards ONLY as plain UI text (example: \"AT&T · T-Mobile\")."
  echo "That text does NOT expose backend URLs, API keys, or database credentials — it is not a \"window\" into the server."
  echo ""
  echo "Shown data comes from, in order: (1) Laravel field network_partner_summary if sync ran,"
  echo "(2) static file constants/carriersFromSupplier.generated.ts (after npm run carriers:pull on a laptop + commit),"
  echo "(3) manual CARRIER_MAP in constants.ts. Snapshot is EMPTY until carriers:pull is run once."
  echo ""
  echo "china-team / 中国区：请将生产 Laravel（master）保持最新并已部署 schedule + queue。"
  echo "建议一次性执行以便套餐 metadata 写入 network_partner_summary： php artisan esimaccess:sync-products"
  echo "详细：Evair-Laravel routes/console.php 已每 6 小时调度 esimaccess:sync-products；H5 说明见 scripts/README-redtea-carriers.md"
  echo ""
} | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"

{
  echo ""
  echo "Done - repos updated: ${TOTAL_UPDATED}; errors: ${TOTAL_ERRORS}."
  echo "Full transcript: ${REPORT_FULL}"
  echo "Summary file: ${SUMMARY_LAST}"
} | tee -a "${SUMMARY_LAST}" "${REPORT_FULL}"

# Always visible in Terminal (the lines above mostly duplicate into log files via tee too).
echo ""
echo "Daily pull finished."
echo "  Summary: ${SUMMARY_LAST}"

if [[ "${TOTAL_ERRORS}" -gt 0 ]]; then
  exit 1
fi
exit 0
