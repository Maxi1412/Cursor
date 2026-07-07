@echo off
REM MediaDeck Claude Code job poller — Windows launcher.
REM Double-click, or register as a Scheduled Task (trigger: At log on) so it runs while
REM the desktop is on. Jobs queue on the NAS and execute when this is running.
REM
REM Config via environment (or an .env you load before this):
REM   ORCH_PUBLIC_URL     e.g. http://192.168.0.100:4000  (the NAS orchestrator)
REM   POLLER_MODE=real    to actually run `claude -p` (default mock = simulate)
REM   POLLER_WORKER       a name for this desktop
REM   CLAUDE_CLI          path to the claude CLI if not on PATH
REM Auth: set CLAUDE_CODE_OAUTH_TOKEN (subscription) or ANTHROPIC_API_KEY.

cd /d "%~dp0"
node dist\index.js
pause
