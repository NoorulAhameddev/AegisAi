# Security Policy

## Reporting Security Issues

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in Aegis AI, please report it responsibly by emailing:
**security@aegis-ai.com**

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Security Response

We take security seriously and will:

- Acknowledge your report within 48 hours
- Provide updates every 7 days on investigation progress
- Disclose the vulnerability once a fix is available
- Credit you in the security advisory (unless you prefer anonymity)

## Supported Versions

| Version | Supported         |
| ------- | ----------------- |
| 1.0.x   | ✅ Active support |
| < 1.0   | ❌ No support     |

## Security Best Practices

When using Aegis AI:

1. **Environment Variables**
   - Never commit `.env` files to Git
   - Use `.env.local` for development
   - Rotate API keys regularly

2. **Authentication**
   - Use strong JWT secrets
   - Implement rate limiting
   - Enable HTTPS in production

3. **Database**
   - Use strong database passwords
   - Enable encryption at rest
   - Implement backups
   - Restrict database access

4. **Secrets Management**
   - Use GitHub Secrets for CI/CD
   - Rotate secrets regularly
   - Limit secret access to necessary workflows

5. **Dependencies**
   - Keep dependencies updated
   - Review security advisories
   - Use `npm audit` regularly
   - Pin dependency versions

## Security Headers

When deploying, ensure these headers are set:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

## Encryption

Aegis AI uses:

- **AES-256-GCM** for data encryption at rest
- **HTTPS/TLS** for data in transit
- **JWT** with HS256/RS256 for authentication tokens

## Third-Party Security Tools

We integrate with:

- Dependabot for dependency updates
- CodeQL for code analysis
- npm audit for vulnerability scanning
- OWASP Dependency Check

## More Information

- [Security Implementation](../docs/DOCUMENTATION.md#security)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Code Review Checklist](../CONTRIBUTING.md#-code-review-checklist)

---

Thank you for helping keep Aegis AI secure!
