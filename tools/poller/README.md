# MediaDeck Claude Code job poller

The "messy judgment" layer. The always-on orchestrator on the NAS writes ambiguous jobs
(odd file sorting, "are these the same episode?", targeted torrent adds) to the `jobs`
queue. This small watcher runs on **Max's Windows desktop**, polls that queue, and — when
the desktop is on — runs headless **`claude -p`** with a scoped prompt and the mapped drives
(`T:` TV, `M:` Movies), then writes the result back and lets the orchestrator fire an ntfy push.

Jobs queue while the desktop is off and execute on wake. That's why the always-on layer is
the NAS, not this.

## Run

```bash
# from the repo (built):
pnpm --filter @mediadeck/poller build
ORCH_PUBLIC_URL=http://192.168.0.100:4000 POLLER_MODE=real node tools/poller/dist/index.js
```

On Windows, use `mediadeck-poller.cmd` (double-click or register as a Scheduled Task with
trigger "At log on"). It runs `node dist\index.js` from the poller folder.

## Config (environment)

| Var | Default | Meaning |
|---|---|---|
| `ORCH_PUBLIC_URL` | `http://192.168.0.100:4000` | The NAS orchestrator base URL |
| `POLLER_MODE` | `mock` | `real` to actually invoke `claude -p`; `mock` simulates |
| `POLLER_INTERVAL_MS` | `15000` | Poll interval |
| `POLLER_WORKER` | `desktop-<hostname>` | Identifies this worker when claiming jobs |
| `CLAUDE_CLI` | `claude` | Path to the Claude Code CLI if not on `PATH` |

**Auth:** `CLAUDE_CODE_OAUTH_TOKEN` (subscription) or `ANTHROPIC_API_KEY`.

## Safety

Jobs are kept **bounded** (sort *this* folder, match *these* files) — never the whole 12 TB
library. Runs with `--allowedTools Read,Edit,Bash`. Never hard-deletes; destructive moves
go to the Synology Recycle Bin (enforced by the job prompts + the orchestrator action set).
