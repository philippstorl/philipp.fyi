---
name: log-learning
description: Record something from the current conversation into LEARNINGS.md right now, instead of waiting for the automatic end-of-session sweep. Use when the user explicitly asks to log, save, or record something as a learning, or when something significant was just decided or discovered that might not show up in a git diff (the automatic sweep only looks at git status/diff/log).
---

# Log a learning now

Apply the same bar as the automatic `SessionEnd` sweep — don't lower it just because this is manual:

- A standing rule or convention about this repo belongs in CLAUDE.md (via the `doc-sync` skill), not here.
- Feedback about working style belongs in Claude's own cross-session memory, not here.
- Otherwise — a decision and the reasoning behind it, a dead end and why it didn't work, domain knowledge about the tooling/process itself, or a genuinely open question — it belongs here.

## What to do

1. Read `LEARNINGS.md` first, so you don't duplicate an entry that's already there.
2. If `$ARGUMENTS` describes what to log, use that. Otherwise, infer it from the recent conversation — what was just decided, discovered, or ruled out.
3. Append one short, specific entry (1-3 sentences) to the `## Log` section under today's date — add a new `### YYYY-MM-DD` heading if today doesn't have one yet, otherwise add to the existing one. Add to `## Open questions` instead if it's unresolved rather than a settled fact.
4. If it resulted in (or should result in) a CLAUDE.md or memory change, make that change too and link to it from the entry rather than restating it.
5. Confirm back to the user in one line what you logged.

If nothing in the recent conversation actually meets the bar, say so rather than forcing a low-value entry.
