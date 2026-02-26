# 🚀 MCP Servers - Quick Start Guide

Your MCP (Model Context Protocol) servers are now **ready to use**!

## ✅ What's Been Set Up

1. **Environment Variables** - Added to `.env` file
2. **MCP Client** - Created at `src/lib/mcp-client.ts`
3. **API Endpoint** - Status check at `/api/mcp/status`
4. **Test Script** - Verify setup with `npm run test:mcp`
5. **Configuration** - Server configs in `mcp-servers.json`

## 📦 Installed Servers

| Server             | Status   | Purpose                                 |
| ------------------ | -------- | --------------------------------------- |
| **Filesystem**     | ✅ Ready | File operations in `./uploads`          |
| **GitHub**         | ✅ Ready | Repository operations                   |
| **Browser (Edge)** | ✅ Ready | Microsoft Edge automation               |
| **n8n**            | ✅ Ready | Workflow automation (400+ integrations) |

## 🔧 Complete Setup (2 minutes)

### Step 1: Enable MCP

Your `.env` already has:

```bash
MCP_ENABLED=true  # ✅ Already set
```

### Step 2: Get GitHub Token (Optional)

1. Visit: [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: "Aegis-AI MCP"
4. Select scopes: `repo`, `gist`, `read:user`
5. Click "Generate token" and copy it
6. In `.env`, replace: `GITHUB_TOKEN=your_github_token_here`

### Step 3: Get n8n Instance URL (Optional)

**Option A - Local n8n (Recommended):**

1. Install n8n: `npm install -g n8n`
2. Run: `n8n start`
3. Access at [http://localhost:5678](http://localhost:5678)
4. In `.env`, add: `N8N_URL=http://localhost:5678`

**Option B - Cloud n8n:**

1. Visit: [https://app.n8n.cloud](https://app.n8n.cloud)
2. Create account and get your instance URL
3. Add to `.env`

## 🧪 Test Your Setup

Run the test script:

```powershell
npm run test:mcp
```

Test via API:

```bash
npm run dev
curl http://localhost:3000/api/mcp/status
```

## 💻 Usage in Your Code

### Import the MCP Client

```typescript
import { mcpClient } from "@/lib/mcp-client";
```

### Check Status

```typescript
const status = mcpClient.getStatus();
console.log("Available servers:", status.availableServers);
```

### Use Filesystem

```typescript
const content = await mcpClient.readFile("path/to/file.txt");
```

### Use GitHub

```typescript
const repo = await mcpClient.getRepository("owner", "repo-name");
```

## 📚 Learn More

- **MCP Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **GitHub Tokens**: [https://github.com/settings/tokens](https://github.com/settings/tokens)
- **n8n**: [https://app.n8n.cloud](https://app.n8n.cloud)

## ❓ Troubleshooting

- Check `MCP_ENABLED=true` in `.env`
- Verify each server has required environment variables
- Check [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for detailed setup

## 🔗 Integration with Your AI Agent

Add to your AI tool pipeline:

```typescript
// In your AI agent configuration
import { mcpClient } from "@/lib/mcp-client";

const tools = [
  // Your existing tools...

  // Add MCP capabilities
  {
    name: "filesystem",
    description: "Read and manage files",
    execute: async (path: string) => {
      return await mcpClient.readFile(path);
    },
  },
  {
    name: "github",
    description: "Access GitHub repositories",
    execute: async (owner: string, repo: string) => {
      return await mcpClient.getRepository(owner, repo);
    },
  },
  {
    name: "search",
    description: "Search the internet",
    execute: async (query: string) => {
      return await mcpClient.search(query);
    },
  },
];
```

## 📁 Project Structure

```text
Aegis-Ai/
├── .env                          # ✅ Environment variables (updated)
├── mcp-servers.json              # ✅ MCP configuration
├── src/
│   ├── lib/
│   │   └── mcp-client.ts        # ✅ MCP client (new)
│   └── app/
│       └── api/
│           └── mcp/
│               └── status/
│                   └── route.ts  # ✅ Status API (new)
├── scripts/
│   └── test-mcp.ts              # ✅ Test script (new)
└── docs/
    ├── MCP_SETUP.md             # ✅ Full documentation
    └── ...
```

## 🎯 Next Steps

1. ✅ Run `npx tsx scripts/test-mcp.ts` to verify
2. ✅ Add your GitHub token if needed
3. ✅ Add search API key if needed
4. ✅ Integrate with your AI agent tools
5. ✅ Test with real queries

## 📚 Resources

- **Full Docs**: [docs/MCP_SETUP.md](docs/MCP_SETUP.md)
- **MCP Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **GitHub Tokens**: [https://github.com/settings/tokens](https://github.com/settings/tokens)
- **n8n**: [https://app.n8n.cloud](https://app.n8n.cloud)

## 🆘 Troubleshooting

**MCP not working?**

- Check `MCP_ENABLED=true` in `.env`
- Run test script: `npx tsx scripts/test-mcp.ts`
- Check API status: `http://localhost:3000/api/mcp/status`

**Need help?**

- Check [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for detailed setup
- Review error logs in terminal
- Verify environment variables are set correctly

---

🎉 **You're all set!** MCP servers are ready to supercharge your Aegis-AI application.
