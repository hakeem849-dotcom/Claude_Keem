# Claude Code tooling for this repo

Boosters approved and configured. Repo-level items work automatically when you
open this project in Claude Code; the account/marketplace items need a one-time
step on your side.

## ✅ Configured in the repo (no action needed)

### MCP servers — `.mcp.json`
On your next Claude Code session in this repo you'll be prompted to **enable** these:
- **playwright** — drive a real browser: open the app, click, screenshot, test UI.
- **chrome-devtools** — inspect DOM, console, network, performance on the live site.
- **context7** — pull up-to-date library/framework docs into context.

> Requires Node/npx with npm-registry access. On Claude Code **web**, MCP launching
> is subject to the environment's network policy — if they don't start there, they
> will in your **local** Claude Code. Approve them when prompted (`/mcp` to manage).

### Edit-validation hook — `.claude/settings.json` + `.claude/hooks/check-edit.js`
After Claude edits a file, it auto-validates it: `node --check` on `*.js` and
`JSON.parse` on `*.json`. Errors are fed straight back so they're fixed
immediately. (Dependency-free by design — this repo avoids a formatter/linter
toolchain, so this is a syntax/JSON guard, not a reformatter.)

### Skill — `.claude/skills/ui-ux-design/`
Senior-designer UI/UX pass (hierarchy, type scale, spacing, contrast/AA,
states, motion). Auto-invoked on user-facing UI work.

### Slash commands — `.claude/commands/`
- `/commit` — clean, conventional commit (no push).
- `/pr` — PR title + description from the branch diff.
- `/readme` — create/refresh README from the actual code.

## ⚙️ Owner one-time steps (account / marketplace)

### Design booster plugin
```
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design
```

### Security plugin (code-quality)
```
/plugin install semgrep        # or: security-guidance
```
> Browse everything with `/plugin` (Anthropic + partner marketplaces).

### Already built in (no install)
`/code-review` and `/security-review` ship with Claude Code — use them before merges.

### Web-search MCP — already in `.mcp.json`, just needs a free key
The `brave-search` server is configured to read `${BRAVE_API_KEY}` from your
environment. Get a free key at https://brave.com/search/api/ and export it
(e.g. add `BRAVE_API_KEY=...` to your shell profile or the environment's secrets),
then enable the server when prompted. Without the key it simply won't start —
decline it until the key is set.

## Notes
- Verify each plugin/server name in `/plugin` and `/mcp` before trusting it — the
  marketplace evolves and names can change.
- Keep MCP servers to ~3–6 active; more adds noise and latency.
