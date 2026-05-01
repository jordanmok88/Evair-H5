# Evair-H5 — instructions for automated assistants

Jordan asked that **every new agent receives full project instructions without manual steps**.

Cursor loads **all** `.cursor/rules/*.mdc` files tagged `alwaysApply: true` whenever this workspace is open.

## Start here

1. Read **`.cursor/rules/00-agent-start-here.mdc`** — master checklist and read order for every rule file.
2. **Jordan chat history** (`jordan-chat-history.mdc`): human preferences from chats (agents **extend this file themselves** whenever Jordan expresses a lasting preference — he should not need a special phrase).
3. Build commands and API layout: **`CLAUDE.md`**.

There is no separate “pull instructions” command — staying in this folder is enough if Cursor rules sync is enabled for the project.
