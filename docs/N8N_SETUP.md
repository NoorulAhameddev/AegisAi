# n8n Workflow Automation MCP Server Setup

## 🎯 What is n8n?

n8n is a powerful workflow automation tool (like Zapier/Make) that you can now control through your AI agent via MCP!

## ✅ Installed

- **n8n-mcp** - MCP server for n8n workflow automation

## 🚀 Quick Setup

### Option 1: Use n8n Cloud (Easiest)

1. **Sign up at n8n.cloud:**

   ```text
   https://n8n.cloud
   ```

2. **Get your API key:**
   - Go to Settings → API
   - Generate new API key
   - Copy the key

3. **Update your .env:**

   ```env
   N8N_API_URL=https://your-instance.app.n8n.cloud/api/v1
   N8N_API_KEY=your_api_key_here
   ```

### Option 2: Install n8n Locally (Full Control)

1. **Install n8n globally:**

   ```powershell
   npm install -g n8n
   ```

2. **Start n8n:**

   ```powershell
   n8n start
   ```

   This will start n8n at: [http://localhost:5678](http://localhost:5678)

3. **Create an API key:**
   - Open [http://localhost:5678](http://localhost:5678)
   - Go to Settings → API Keys
   - Create new API key

4. **Your .env is already configured:**

   ```env
   N8N_API_URL=http://localhost:5678/api/v1
   N8N_API_KEY=your_n8n_api_key_here
   ```

### Option 3: Docker (Recommended for Production)

```powershell
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

## 🎮 What You Can Do

Once configured, your AI agent can:

### Execute Workflows

```typescript
import { mcpClient } from "@/lib/mcp-client";

// Run a workflow
await mcpClient.executeWorkflow("workflow-id", {
  data: "your-input",
});
```

### List All Workflows

```typescript
const workflows = await mcpClient.listWorkflows();
```

### Check Workflow Status

```typescript
const status = await mcpClient.getWorkflowStatus("workflow-id");
```

## 💡 Use Cases

1. **Email Automation** - Send emails when AI detects certain conditions
2. **Data Processing** - Process uploaded documents through n8n workflows
3. **Notifications** - Send Slack/Discord messages via workflows
4. **Database Operations** - Update databases through n8n
5. **API Integrations** - Connect to 400+ services via n8n
6. **File Processing** - Automate file conversions and uploads
7. **Social Media** - Post to Twitter, LinkedIn automatically

```text
1. User uploads document to Aegis-AI
2. AI analyzes document
3. Trigger n8n workflow
4. n8n processes document
5. Send results via email
```

### Workflow 2: Automated Reporting

```text
1. AI generates report
2. Trigger n8n workflow
3. n8n formats report
4. Posts to Slack/Discord
5. Saves to Google Drive
```

### Workflow 3: Data Sync

```text
1. AI processes data
2. Trigger n8n workflow
3. n8n syncs to Airtable
4. Updates Notion database
5. Sends confirmation
```

## 📊 Test Your Setup

Run the test script:

```powershell
npm run test:mcp
```

Should show:

```text
✅ n8n: Ready
```

## 🔗 Resources

- **n8n Documentation**: [https://docs.n8n.io](https://docs.n8n.io)
- **n8n Cloud**: [https://n8n.cloud](https://n8n.cloud)
- **n8n Community**: [https://community.n8n.io](https://community.n8n.io)
- **Workflow Templates**: [https://n8n.io/workflows](https://n8n.io/workflows)

## 🎯 Next Steps

1. ✅ Install n8n (Cloud or Local)
2. ✅ Get API key
3. ✅ Update `.env` with your credentials
4. ✅ Run `npm run test:mcp` to verify
5. ✅ Create your first workflow in n8n
6. ✅ Trigger it from your AI agent!

---

**Your AI agent can now orchestrate complex workflows across 400+ services through n8n!** 🚀
