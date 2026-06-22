#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install project tools
npm install -g htmlhint --prefer-offline --quiet

# Install MCP server binaries (configured globally via ~/.claude.json)
npm install -g \
  opencode-ai \
  @modelcontextprotocol/server-memory \
  @modelcontextprotocol/server-sequential-thinking \
  @upstash/context7-mcp \
  @playwright/mcp \
  @brave/brave-search-mcp-server \
  --prefer-offline --quiet

# Install Playwright browser
npx playwright install chromium --quiet 2>/dev/null || true
