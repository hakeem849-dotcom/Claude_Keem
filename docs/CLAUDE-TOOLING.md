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

### Optional: web-search MCP (needs a free API key)
Add to `.mcp.json` and set `BRAVE_API_KEY`:
```json
"brave-search": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": { "BRAVE_API_KEY": "your-key" }
}
```

## Notes
- Verify each plugin/server name in `/plugin` and `/mcp` before trusting it — the
  marketplace evolves and names can change.
- Keep MCP servers to ~3–6 active; more adds noise and latency.
