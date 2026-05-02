## Daily repo pull & change report

The script `Evair-H5/scripts/daily-pull-report.sh`:

- Runs `git fetch` + `git pull` on **Evair-H5** (`main`) and **Evair-Laravel** (`master`) when those folders sit side by side under your `Cursor Codes` directory.
- Appends the full transcript to `~/Library/Logs/Evair/daily-pull-YYYY-MM-DD.log`
- Writes a short summary to **`~/Library/Logs/Evair/daily-pull-latest-summary.txt`** (open this each morning).

**Manual run:**

```bash
bash "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/Evair-H5/scripts/daily-pull-report.sh"
npm run daily-pull
```

**Fetch only (no merge):**

```bash
bash scripts/daily-pull-report.sh --dry-run
```

To add repos, edit the `REPOS=(...)` block at the top of `daily-pull-report.sh` using the `path|branch|remote` pattern.

---

### Automatic daily schedule (macOS Launch Agent)

Cursor cannot wake up your Mac each morning — use **launchd**.

1. Edit **`com.evair.git-daily-pull.plist`** next to this file if needed (`Hour` / `Minute`, script path `ProgramArguments`).
2. Install:

```bash
mkdir -p "$HOME/Library/Logs/Evair"
cp scripts/launchd/com.evair.git-daily-pull.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.evair.git-daily-pull.plist
```

3. Remove:

```bash
launchctl unload ~/Library/LaunchAgents/com.evair.git-daily-pull.plist
rm ~/Library/LaunchAgents/com.evair.git-daily-pull.plist
```

Launch stdout/stderr: `~/Library/Logs/Evair/launchd-daily-pull.*.log`.

---

### What agents can/cannot see

Anything that lands in **`daily-pull-latest-summary.txt`** is easy to paste into a Cursor chat.

Nothing in Cursor automatically summarizes those logs unless you open or paste them.
