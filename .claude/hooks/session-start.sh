#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install project tools
npm install -g htmlhint --prefer-offline --quiet

# Install opencode-ai and MCP servers globally
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

# Write global Claude settings with MCP server configuration
mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" << EOF
{
  "mcpServers": {
    "memory": {
      "command": "mcp-server-memory"
    },
    "sequential-thinking": {
      "command": "mcp-server-sequential-thinking"
    },
    "context7": {
      "command": "context7-mcp"
    },
    "playwright": {
      "command": "playwright-mcp"
    },
    "brave-search": {
      "command": "brave-search-mcp-server",
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY:-}"
      }
    }
  }
}
EOF
