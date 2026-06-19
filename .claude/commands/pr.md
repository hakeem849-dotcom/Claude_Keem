---
description: Draft a high-quality pull request title and description from the branch diff
---

Draft a pull request for the current branch.

1. Determine the base branch (usually `main`) and run
   `git log <base>..HEAD --oneline` and `git diff <base>...HEAD` to gather the full
   set of changes.
2. Produce:
   - **Title:** concise, imperative, scoped.
   - **Summary:** 2–4 sentences on what and why.
   - **Changes:** bulleted list grouped by area.
   - **Testing:** how it was verified (commands run, results).
   - **Notes/risks:** anything reviewers should watch; follow-ups.
3. Keep it factual — describe only what the diff actually does.
4. Output the title and body as copy-pasteable markdown. Only open the PR if I ask.

Extra context: $ARGUMENTS
