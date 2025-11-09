# Security Guidelines for Professional Clothing Rental Management System

This document outlines mandatory security practices tailored to the Professional Clothing Rental Management System. Follow these guidelines throughout design, implementation, testing, and deployment to ensure a robust, secure application.

---

## 1. Authentication & Access Control

*Security by Design & Least Privilege*

- **Strong Password Policies**
  - Enforce minimum length (12+ characters), complexity (upper, lower, digits, symbols), and rotation policies.
  - Use Argon2id or bcrypt with unique per-user salts.
- **Role-Based Access Control (RBAC)**
  - Extend the existing `users` table with a `role` field (`cashier` | `manager`).
  - Implement server-side checks (middleware) on every API route and page endpoint. Deny by default.
- **Secure Session Management**
  - Use HTTP-only, Secure, `SameSite=Strict` cookies for session tokens.
  - Generate sufficiently random session IDs (at least 256 bits of entropy).
  - Enforce idle and absolute timeouts (e.g., 15-minute idle, 8-hour absolute).
  - Invalidate sessions on logout or password change.
- **Multi-Factor Authentication (MFA)**
  - Provide optional TOTP-based MFA for manager accounts.
  - Store MFA secrets encrypted at rest (use a vault or KMS).
- **JWT Usage**
  - If using JWTs, avoid the `none` algorithm. Use `HS256` or `RS256` and validate signatures.
  - Check expiration (`exp`) on every request.
  - Rotate signing keys periodically and manage them in a secrets manager.

---

## 2. Input Validation & Output Encoding

*Defense in Depth*

- **Server-Side Validation**
  - Validate all API inputs using a schema validation library (e.g., Zod).
  - Reject unknown fields; enforce strict type checks (dates, numbers, enums).
- **Prevent Injection**
  - Use Drizzle ORM’s parameterized queries for all database access.
  - Never concatenate raw SQL strings with user input.
- **Sanitize Outputs**
  - Context-aware HTML encoding of any user-provided data rendered in React components.
  - Use `dangerouslySetInnerHTML` only with sanitized content.
- **File Upload Handling**
  - If supporting file uploads (e.g., invoice attachments), validate MIME types, extensions, and size limits.
  - Store uploads outside the webroot with randomized file names; scan for malware.
- **Redirect Validation**
  - Validate any redirect URL against an allow-list. Do not trust arbitrary `next` parameters.

---

## 3. Data Protection & Privacy

*Encrypt Sensitive Data & Prevent Information Leakage*

- **Encryption In Transit & At Rest**
  - Enforce HTTPS (TLS 1.2+). Redirect HTTP to HTTPS.
  - Enable encryption for PostgreSQL connections (`sslmode=require`).
  - Encrypt PII and payment details at rest if required by regulation.
- **Secret Management**
  - Store all secrets (DB credentials, auth keys) in a vault or cloud KMS. Do not hardcode in source or `.env`.
- **Data Minimization & Masking**
  - Return only necessary fields in API responses (avoid exposing full customer PII).
  - Mask sensitive fields (e.g., show only last four digits of payment methods).
- **Logging & Auditing**
  - Log security-relevant events (login attempts, role changes, rental creations) to an immutable store.
  - Do not log sensitive data (passwords, full card numbers).

---

## 4. API & Service Security

*Secure Defaults & Fail Securely*

- **HTTPS & HSTS**
  - Enforce HSTS (`Strict-Transport-Security` header) with at least a 6-month max age.
- **Rate Limiting & Throttling**
  - Apply IP-based rate limits on authentication endpoints and high-volume APIs (e.g., 100 requests/minute).
  - Implement exponential backoff for repeated failures.
- **CORS**
  - Restrict `Access-Control-Allow-Origin` to trusted front-end domains only.
- **HTTP Method Enforcement**
  - Use correct verbs: GET for reads, POST for creation, PUT/PATCH for updates, DELETE for removal.
- **API Versioning**
  - Prefix endpoints with `/api/v1/` and increment on breaking changes.

---

## 5. Web Application Security Hygiene

*Defense in Depth & Secure Client-Side Practices*

- **CSRF Protection**
  - Use anti-CSRF tokens (Synchronizer Token Pattern) for all state-changing POST/PUT/DELETE requests.
- **Security Headers**
  - Content-Security-Policy: restrict sources for scripts, styles, fonts, images.
  - X-Content-Type-Options: `nosniff`.
  - X-Frame-Options: `DENY`.
  - Referrer-Policy: `strict-origin-when-cross-origin`.
- **Secure Cookies**
  - Set `HttpOnly`, `Secure`, `SameSite=Strict` on session and CSRF cookies.
- **Client-Side Storage**
  - Do not store tokens or PII in `localStorage` or `sessionStorage`.
- **Subresource Integrity**
  - Use SRI hashes for any third-party scripts or styles loaded from CDNs.

---

## 6. Infrastructure & Configuration Management

*Keep Security Simple & Harden Defaults*

- **Container & Host Hardening**
  - Use minimal base images. Remove unnecessary packages and services.
  - Run services as non-root users inside containers.
- **Configuration**
  - Store runtime configs in environment variables or secrets manager. Do not check `.env` into VCS.
  - Disable debug/logging ports and verbose error messages in production.
- **TLS Configuration**
  - Use strong cipher suites only (AEAD ciphers, forward secrecy).
  - Disable SSLv3, TLS1.0/1.1.
- **Patch Management**
  - Regularly update OS, Docker base images, and dependencies to latest security-patched versions.

---

## 7. Dependency Management

*Minimize Attack Surface & Continuous Scanning*

- **Lockfiles & Version Pinning**
  - Commit `pnpm-lock.yaml` to ensure reproducible builds.
- **Vulnerability Scanning**
  - Integrate SCA (npm audit, Snyk, Dependabot) in CI/CD to detect CVEs in both direct and transitive dependencies.
- **Library Vetting**
  - Use only actively maintained, well-reviewed libraries (e.g., Next.js, Drizzle ORM, Tailwind CSS).
  - Remove or replace unmaintained packages.

---

## 8. Project-Specific Security Considerations

- **Transactional Safety & Locking**
  - Use Drizzle ORM transactions with `SELECT … FOR UPDATE` to lock inventory rows. Rollback on conflicts.
- **Scheduled Jobs (Laundry Cycle)**
  - Secure cron endpoints or functions behind IAM policies. Encrypt any configuration for job schedules.
- **Audit Logging**
  - Store ActivityLogs in a write-only database or append-only log store. Include `userId`, timestamp, action, and affected record IDs.
- **Error Handling & User Feedback**
  - Provide generic error messages to users (`"An unexpected error occurred"`) and detailed logs only in server logs.

---

## Conclusion
Adherence to these guidelines is mandatory. Security is a continuous process—regularly review these practices, perform security testing (pen tests, code reviews), and update controls as your system evolves.

By embedding these controls into every layer, you will build a resilient, trustworthy Professional Clothing Rental Management System.
