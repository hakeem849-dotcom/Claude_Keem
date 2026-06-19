---
description: Write a clear, conventional commit for the current changes (does not push)
---

Review the changes and stage/commit them cleanly.

1. Run `git status` and `git diff` (and `git diff --staged`) to see what changed.
2. Group related changes; if the working tree mixes unrelated changes, note it.
3. Write a commit message:
   - Subject: imperative mood, ≤ 72 chars, optionally a conventional prefix
     (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
   - Body (when non-trivial): what changed and **why**, wrapped at ~72 cols.
4. Stage the relevant files and commit. Do **not** push unless I explicitly ask.
5. Show the final `git log -1` so I can confirm.

Extra context for this commit: $ARGUMENTS
