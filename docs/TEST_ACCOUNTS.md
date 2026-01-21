# 🔐 Aegis AI - Role-Based Test Accounts

## Account Credentials

All existing users have been deleted and replaced with role-based test accounts.

### 📋 Login Credentials

| Role            | Name           | Email                 | Password         |
| --------------- | -------------- | --------------------- | ---------------- |
| **SUPER_ADMIN** | Super Admin    | `superadmin@aegis.ai` | `SuperAdmin@123` |
| **ADMIN**       | Admin User     | `admin@aegis.ai`      | `Admin@123`      |
| **MODERATOR**   | Moderator User | `moderator@aegis.ai`  | `Moderator@123`  |
| **ANALYST**     | Analyst User   | `analyst@aegis.ai`    | `Analyst@123`    |
| **SUPPORT**     | Support User   | `support@aegis.ai`    | `Support@123`    |
| **USER**        | Regular User   | `user@aegis.ai`       | `User@123`       |

---

## 🎯 Role Descriptions

### SUPER_ADMIN

- **Highest level access**
- Full system control and configuration
- Can manage all users and roles
- Access to all administrative features
- Can view and manage audit logs

### ADMIN

- **High level access**
- User management capabilities
- System configuration access
- Can moderate content and users
- Limited to specific administrative tasks

### MODERATOR

- **Content moderation**
- Can review and moderate user content
- Can ban/unban users
- Access to moderation tools
- Limited administrative access

### ANALYST

- **Data analysis and reporting**
- Access to analytics and metrics
- Can view usage statistics
- Read-only access to most features
- Generate reports

### SUPPORT

- **Customer support**
- Can view user issues
- Limited user management
- Access to support tools
- Can assist users with problems

### USER

- **Standard user access**
- Basic application features
- Personal chat and memory
- File uploads
- Standard AI interactions

---

## 🚀 Quick Start

1. **Access the application**: http://localhost:3000
2. **Login with any account** using the credentials above
3. **Test role-based features** to verify permissions

---

## 🛠️ Management Scripts

### Create Role Accounts

```bash
npx tsx scripts/setup-role-accounts.ts
```

Deletes all users and creates fresh role-based accounts.

### List All Users

```bash
npx tsx scripts/list-users.ts
```

Displays all users currently in the database.

---

## 📊 Database Access

**Prisma Studio**: http://localhost:5555

Use Prisma Studio to:

- View all users and their roles
- Inspect user data
- Manage database records
- View relationships

---

## 🔒 Security Notes

⚠️ **IMPORTANT**: These are test accounts with simple passwords.

- **DO NOT use these in production**
- Change passwords before deploying
- Implement proper password policies
- Enable MFA for admin accounts
- Use environment-specific credentials

---

## 📝 Notes

- All passwords follow the pattern: `[Role]@123`
- Emails use the domain: `@aegis.ai`
- All accounts created: **January 12, 2026**
- Database: PostgreSQL via Prisma
- Password hashing: bcrypt (10 rounds)

---

_Last Updated: 2026-01-12 21:23_
