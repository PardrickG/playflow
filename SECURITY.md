# Security Implementation Notes

This document outlines the security measures implemented in PlayFlow.

## Authentication & Authorization

**Clerk Integration:**
- All authenticated routes use `requireAuth()` from `@/lib/auth`
- Workspace-scoped access via `requireWorkspaceAccess(userId, slug)`
- Role-based permissions: OWNER, ADMIN, EDITOR, VIEWER

**Session Management:**
- HttpOnly cookies via Clerk
- Automatic token refresh
- Secure session handling

## Input Validation & Sanitization

**Zod Schemas:**
- All API inputs validated with `safeParse()`
- Type-safe request handling
- Detailed error responses

**XSS Prevention:**
- `sanitizeInput()` for string escaping in `security.ts`
- `sanitizeObject()` for recursive object sanitization
- Content Security Policy headers

## Rate Limiting

**Implementation in `security.ts`:**
```typescript
'/api/v1/events': { windowMs: 60000, maxRequests: 100 }
'/api/v1/claim-prize': { windowMs: 60000, maxRequests: 10 }
```

**Production:** Use Redis-based distributed rate limiting

## Security Headers

Applied via `securityHeaders()`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` with strict rules
- `Permissions-Policy` restricting camera/mic/geo

## Webhook Security

- HMAC-SHA256 signature generation
- `X-PlayFlow-Signature` header for verification
- Timing-safe comparison via `crypto.timingSafeEqual`

## CSRF Protection

- Token generation: `generateCSRFToken()`
- Token validation: `validateCSRFToken()`
- Applied to state-changing operations

## Secrets Management

**Environment Variables:**
- `CLERK_SECRET_KEY` - Auth
- `CRON_SECRET` - Cron job auth
- `DATABASE_URL` - Prisma connection

**Best Practices:**
- Never log secrets
- Use `.env.local` for local dev
- Vercel secret management for production

## Audit Logging

```typescript
auditLog({
  userId: 'user_123',
  action: 'UPDATE_CAMPAIGN',
  resource: 'campaign',
  resourceId: 'camp_abc',
  ipAddress: '1.2.3.4'
});
```

## Database Security

- Parameterized queries via Prisma (SQL injection prevention)
- Workspace-scoped data isolation
- Cascade deletes for data cleanup

## Public API Security

CORS configured for widget endpoints:
- `Access-Control-Allow-Origin: *` (widget embeds)
- Restricted methods per endpoint
- CDN caching for immutable assets
