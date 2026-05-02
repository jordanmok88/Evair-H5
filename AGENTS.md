# Evair-H5 — instructions for automated assistants

Jordan asked that **every new agent receives full project instructions without manual steps**.

Cursor loads **all** `.cursor/rules/*.mdc` files tagged `alwaysApply: true` whenever this workspace is open.

Optional **Agent Skills** (topic playbooks Cursor may load when a task matches) live under **`.cursor/skills/*/SKILL.md`** — layout, SEO, and WebView shell notes live there alongside rules.

## Start here

1. Read **`.cursor/rules/00-agent-start-here.mdc`** — master checklist and read order for every rule file.
2. **Jordan chat history** (`jordan-chat-history.mdc`): human preferences from chats (agents **extend this file themselves** whenever Jordan expresses a lasting preference — he should not need a special phrase).
3. Build commands and API layout: **`CLAUDE.md`**.

There is no separate “pull instructions” command — staying in this folder is enough if Cursor rules sync is enabled for the project.
