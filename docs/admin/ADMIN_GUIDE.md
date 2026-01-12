# 🛡️ Aegis AI: Admin Operations & Governance Playbook

This document serves as the official technical specification and operational manual for the Aegis AI Admin System. It outlines the governance policies, permission structures, and emergency protocols for senior admins and operations designers.

---

## 1. Role-Based Access Control (RBAC) Specification

Access is managed through a granular permission matrix. Every administrative account must be mapped to one of the following four tiers.

### 🧩 Permission Matrix

| Permission Code    | Super Admin | Moderator | Analyst | Support |
| :----------------- | :---------: | :-------: | :-----: | :-----: |
| `IDENTITY_INVITE`  |     ✅      |    ❌     |   ❌    |   ❌    |
| `IDENTITY_SUSPEND` |     ✅      |    ✅     |   ❌    |   ✅    |
| `IDENTITY_DELETE`  | ✅ (4-Eyes) |    ❌     |   ❌    |   ❌    |
| `CONFIG_TOGGLE`    |     ✅      |    ❌     |   ❌    |   ❌    |
| `CONFIG_LIMITS`    |     ✅      |    ❌     |   ❌    |   ❌    |
| `MOD_READ_CONTENT` |     ✅      |    ✅     |   ✅    |   ❌    |
| `MOD_OVERRIDE`     |     ✅      |    ✅     |   ❌    |   ❌    |
| `AUDIT_VIEW_MAP`   |     ✅      |    ✅     |   ✅    |   ✅    |
| `AUDIT_EXPORT`     |     ✅      |    ❌     |   ✅    |   ❌    |
| `KILL_SWITCH_ACT`  |     ✅      |    ❌     |   ❌    |   ❌    |

---

## 2. Audit Trail & Logging Schema

All admin actions are immutable. The following schema defines the structure of an audit log entry.

### 📝 Log Entry Specification (Conceptual)

```json
{
  "traceId": "uuid-v4",
  "actor": {
    "adminId": "uuid",
    "role": "SUPER_ADMIN",
    "ip": "203.0.113.42",
    "mfaVerified": true
  },
  "action": "FEATURE_TOGGLE_DISABLE",
  "target": {
    "type": "SYSTEM_FEATURE",
    "id": "AI_IMAGE_GEN",
    "previousState": "ENABLED",
    "newState": "DISABLED"
  },
  "context": {
    "reason": "Emergency high-cost burn detected",
    "ticketId": "INC-8892",
    "timestamp": "2026-01-11T12:00:00Z"
  },
  "integrity": {
    "hash": "sha256-...",
    "signature": "pkcs1-v1.5-..."
  }
}
```

---

## 3. Operational Workflows

### 🚦 Emergency Kill Switch Protocol

**Trigger:** Detected security breach, massive token leak, or runaway cost.

1.  **Initiation:** Super Admin accesses the `System Control` panel.
2.  **Selection:** Select the targeted module (e.g., `OPENAI_API_PROXY`).
3.  **Confirmation:** Enter the phrase `CONFIRM DISCONNECTION` and provide MFA token.
4.  **Effect:**
    - All active AI processing jobs are marked as `STOPPED`.
    - API Gateway begins returning `503 Service Temporarily Unavailable` for the specific module.
    - Incident log is automatically generated and pushed to the Slack/Discord Ops channel.
5.  **Restoration:** Requires two Super Admin signatures to re-enable.

### 👤 User Lifecycle Escalation

- **Level 1 (Support):** Issues temporary bans for spam or minor ToS violations.
- **Level 2 (Moderator):** Reviews flagged content and can issue permanent bans. Can override "Shadow Protocol".
- **Level 3 (Super Admin):** Manages user deletions and bulk account scrubbings.

---

## 4. Governance & Compliance

### 🔒 Security Principles

- **Zero Trust:** Admin sessions expire every 2 hours of inactivity.
- **Hardware MFA:** All Admin-tier accounts require FIDO2/WebAuthn keys.
- **No Self-Modification:** Admins cannot change their own roles or lift their own bans.
- **Clearance Level:** Information is redacted based on the "Need to Know" basis (e.g., Analysts see hashed emails, Super Admins see full emails).

### 🛡️ Failure Prevention

- **Bulk Action Cap:** Maximum of 50 users can be banned in a single bulk action to prevent mass-error impacts.
- **4-Eyes Principle:** Any action tagged `DESTRUCTIVE` in the code requires a secondary approval from a different Super Admin within a 15-minute window.

---

## 5. Technical Integration Requirements

_Not implemented in backend code yet - Design Guidance for Developers._

1.  **Middleware Validation:** Admin routes must be wrapped in `adminGate()` which checks for both a valid JWT and an active, hardware-signed session.
2.  **Webhooks:** Every admin action should trigger a webhook to an external secure logging service (e.g., Datadog, Axiom) to ensure local DB tampering is detectable.
3.  **Encrypted Exports:** All user data exports (CSV/JSON) must be encrypted with the requester's public key.

---

**Document Owner:** Aegis Admin Operations Team
**Last Revised:** 2026-01-11
