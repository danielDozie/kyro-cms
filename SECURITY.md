# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.9.x   | :white_check_mark: |
| < 0.9   | :x:                |

## Reporting a Vulnerability

We take the security of Kyro CMS seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them by opening a security issue at https://github.com/danielDozie/kyro-cms/issues. You should receive a response within 48 hours. If for some reason you do not, please follow up via the same channel to ensure we received your original message.

Please include the following information:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Preferred Languages

We prefer all communications to be in English.

## Policy

- We will respond to your report within 48 hours
- We will keep you informed of the progress towards a fix
- We will not disclose your identity without permission
- We will credit you in our release notes if desired

## Security Best Practices

When using Kyro CMS:

1. Always use strong passwords for admin accounts
2. Keep your `APP_SECRET` environment variable secure
3. Use HTTPS in production
4. Regularly update to the latest version
5. Restrict database access to authorized users only
6. Enable rate limiting for API endpoints
7. Use environment variables for sensitive configuration
