# MCP Servers Setup Guide

## Installed MCP Servers

You now have **4 MCP servers** installed in your Aegis-AI project:

### 1. **Filesystem Server** ✅

- **Purpose**: Read/write files and manage directories
- **Installation**: `@modelcontextprotocol/server-filesystem`
- **Access Path**: `./uploads` directory
- **Use Cases**:
  - File management and access
  - Document processing
  - Upload handling

### 2. **GitHub Server** ✅

- **Purpose**: Interact with GitHub repositories
- **Installation**: `@modelcontextprotocol/server-github`
- **Setup Required**: Add `GITHUB_TOKEN` environment variable
- **Use Cases**:
  - Repository operations
  - Issue management
  - PR handling
  - Code access

### 3. **Browser Server** ✅

- **Purpose**: Automate browser actions (Edge)
- **Installation**: `@modelcontextprotocol/server-browser`
- **Setup Required**: Microsoft Edge installed
- **Use Cases**:
  - Web scraping and automation
  - Form filling
  - Interactive testing

### 4. **n8n Server** ✅

- **Purpose**: Workflow automation with 400+ integrations
- **Installation**: `@modelcontextprotocol/server-n8n`
- **Setup Required**: Add `N8N_URL` environment variable
- **Use Cases**:
  - Workflow orchestration
  - API integrations
  - Data processing pipelines

## Configuration File

Created: `mcp-servers.json` - Contains all MCP server configurations

## Setting Up Environment Variables

### For GitHub Server

```bash
GITHUB_TOKEN=your_github_personal_access_token
```

### For n8n Server

```bash
N8N_URL=http://localhost:5678
```

### Get Your GitHub Token

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token"
3. Select scopes: `repo`, `gist`, `read:user`
4. Copy and add to `.env.local`

### Get Your n8n Instance URL

1. Set up n8n locally or use [https://app.n8n.cloud](https://app.n8n.cloud)
2. Get your instance URL
3. Copy and add to `.env.local`

## Usage in Your Application

```typescript
// Example: Using MCP Servers in your Aegis-AI project

// Filesystem operations
// Access documents from ./uploads

// GitHub operations
// Query repositories and issues

// Browser automation
// Scrape and interact with web pages

// n8n workflows
// Execute complex automation workflows
```

## Next Steps

1. ✅ Install environment variables in `.env.local`
2. ✅ Test each server connection
3. ✅ Integrate MCP tools into your AI agent
4. ✅ Use in RAG pipeline for enhanced context

## Testing

Run the test script:

```bash
npm run test:mcp
```

---

**Configuration File**: [mcp-servers.json](mcp-servers.json)

**Documentation**: Check the official MCP documentation at [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
