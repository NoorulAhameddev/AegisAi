# Start MCP servers for Antigravity Kit
# This script opens each MCP server in a new PowerShell window so you can see logs.
# Run from repo root: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-mcp.ps1

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $repoRoot

Write-Host "Starting MCP servers (filesystem, github, browser, n8n)...`n"

# Filesystem server
Write-Host "Starting filesystem MCP (serves ./uploads)..."
Start-Process -FilePath powershell -ArgumentList ('-NoExit','-Command','node ./node_modules/@modelcontextprotocol/server-filesystem/dist/index.js ./uploads')

# GitHub server
if (-not $env:GITHUB_TOKEN) {
    Write-Warning "GITHUB_TOKEN not set. GitHub MCP will start but may fail auth. Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN in environment."
}
Write-Host "Starting github MCP..."
Start-Process -FilePath powershell -ArgumentList ('-NoExit','-Command','node ./node_modules/@modelcontextprotocol/server-github/dist/index.js')

# Browser (Puppeteer) server
Write-Host "Starting browser (Puppeteer) MCP (headful by default)..."
Start-Process -FilePath powershell -ArgumentList ('-NoExit','-Command','node ./node_modules/@modelcontextprotocol/server-puppeteer/dist/index.js')

# n8n MCP (optional)
if (-not $env:N8N_API_URL -or -not $env:N8N_API_KEY) {
    Write-Warning "N8N_API_URL or N8N_API_KEY not set. n8n MCP may need those env vars to operate."
}
Write-Host "Starting n8n MCP (via npx n8n-mcp)..."
Start-Process -FilePath powershell -ArgumentList ('-NoExit','-Command','npx n8n-mcp')

Write-Host "All MCP server windows launched. Check each window for logs."