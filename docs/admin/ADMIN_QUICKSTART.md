# 🚀 Quick Start Guide: Accessing the Admin System

## Method 1: Using Prisma Studio (Visual Interface)

Prisma Studio is currently running at **http://localhost:5555**

### Steps:

1. **Open Prisma Studio** in your browser: http://localhost:5555
2. Click on the **"User"** table
3. Find your user account (search by email)
4. Click on the **"role"** field
5. Change it from `ADMIN` or `USER` to **`SUPER_ADMIN`**
6. Click **"Save 1 change"**
7. **Refresh your browser** at http://localhost:3000
8. Navigate to **http://localhost:3000/admin**

---

## Method 2: Using the Setup Script (Command Line)

I've created a helper script for you:

```bash
# Replace with your actual email address
node scripts/setup-admin.js your-email@example.com
```

This will:

- ✅ Find your user account
- ✅ Upgrade you to SUPER_ADMIN
- ✅ Show confirmation message

---

## Method 3: Direct Database Query

If you prefer SQL:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE email = 'your-email@example.com';
```

---

## 🎯 What You Can Access Now

### 1. **Existing Admin Dashboard**

**URL**: http://localhost:3000/admin

**Current Features**:

- User management (ban/unban/delete)
- System metrics
- Activity logs
- Settings toggles

### 2. **New API Endpoints**

#### Query Audit Logs

```bash
# Get all audit logs
curl http://localhost:3000/api/admin/audit

# Filter by action
curl http://localhost:3000/api/admin/audit?action=USER_BAN

# Filter by user
curl http://localhost:3000/api/admin/audit?userId=<user-id>
```

#### Export Audit Logs

```bash
# Export as JSON
curl -X POST http://localhost:3000/api/admin/audit/export \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}' \
  --output audit-logs.json

# Export as CSV
curl -X POST http://localhost:3000/api/admin/audit/export \
  -H "Content-Type: application/json" \
  -d '{"format": "csv"}' \
  --output audit-logs.csv
```

#### Update System Settings

```bash
curl -X POST http://localhost:3000/api/admin/system/settings \
  -H "Content-Type: application/json" \
  -d '{
    "key": "maintenanceMode",
    "value": "true",
    "reason": "Scheduled maintenance",
    "ticketId": "MAINT-001"
  }'
```

---

## 🔍 Testing the New Features

### Test 1: Ban a User with Audit Trail

1. Go to http://localhost:3000/admin
2. Click the **"Users"** tab
3. Find a test user
4. Click **"Ban"**
5. The system now logs:
   - Who performed the action (you)
   - What changed (isBanned: false → true)
   - When it happened
   - Your IP address
   - Your browser info

### Test 2: View Audit Logs

```bash
# In a new terminal
curl http://localhost:3000/api/admin/audit | jq
```

You should see detailed logs with:

- `adminRole`: "SUPER_ADMIN"
- `action`: "USER_BAN"
- `targetType`: "USER"
- `previousState` and `newState`
- `integrityHash` for tamper detection

### Test 3: Role Hierarchy Protection

Try to ban another SUPER_ADMIN user - the system will prevent it with:

```
"Cannot modify users with equal or higher privileges"
```

---

## 📊 Understanding Your New Permissions

As a **SUPER_ADMIN**, you have access to all 33 permissions:

### Identity Management

- ✅ IDENTITY_INVITE
- ✅ IDENTITY_SUSPEND
- ✅ IDENTITY_BAN
- ✅ IDENTITY_RESTORE
- ✅ IDENTITY_DELETE
- ✅ IDENTITY_ROLE_CHANGE

### System Configuration

- ✅ CONFIG_TOGGLE
- ✅ CONFIG_LIMITS
- ✅ CONFIG_ENVIRONMENT
- ✅ KILL_SWITCH_ACT

### Moderation

- ✅ MOD_READ_CONTENT
- ✅ MOD_OVERRIDE
- ✅ MOD_SHADOW_BAN
- ✅ MOD_FLAG_REVIEW

### Audit & Analytics

- ✅ AUDIT_VIEW_MAP
- ✅ AUDIT_EXPORT
- ✅ ANALYTICS_VIEW
- ✅ ANALYTICS_EXPORT

### Support

- ✅ SUPPORT_RESET_PASSWORD
- ✅ SUPPORT_VIEW_PROFILE
- ✅ SUPPORT_TICKET_MANAGE

---

## 🎨 Next: Building the Advanced Admin UI

The backend is ready! To create a full governance dashboard:

1. **Create `/admin/governance` page** with:

   - Real-time audit log viewer
   - Permission matrix display
   - Role assignment interface
   - Emergency kill switch controls
   - Anomaly detection alerts

2. **Add MFA requirement** for destructive actions

3. **Integrate external logging** (Datadog/Axiom)

---

## 🐛 Troubleshooting

### "Forbidden: Missing Permission"

- Your role might not be updated yet
- Log out and log back in to refresh your session
- Check your role in Prisma Studio

### "Cannot find module '@prisma/client'"

```bash
npx prisma generate
```

### Audit logs not showing

- The new schema was just applied
- Perform an action (ban/unban a user) to create the first audit log
- Then query `/api/admin/audit`

---

**Your admin system is now live!** 🎉

Start by upgrading your account using one of the methods above, then explore the new capabilities.
