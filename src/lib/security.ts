import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    '/api/v1/events': { windowMs: 60000, maxRequests: 100 },
    '/api/v1/claim-prize': { windowMs: 60000, maxRequests: 10 },
    '/api/v1/campaigns': { windowMs: 60000, maxRequests: 60 },
    'default': { windowMs: 60000, maxRequests: 100 },
};

/**
 * Rate limiting middleware
 */
export function rateLimit(request: NextRequest): { limited: boolean; remaining: number } {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const path = new URL(request.url).pathname;

    // Find matching rate limit config
    const configKey = Object.keys(RATE_LIMITS).find(k => path.startsWith(k)) || 'default';
    const config = RATE_LIMITS[configKey];

    const key = `${ip}:${configKey}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + config.windowMs };
        rateLimitStore.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
        limited: entry.count > config.maxRequests,
        remaining,
    };
}

/**
 * Security headers middleware
 */
export function securityHeaders(): Headers {
    const headers = new Headers();

    // Prevent clickjacking
    headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    headers.set('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    headers.set('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.playflow.io",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.playflow.io https://cdn.playflow.io",
        "frame-ancestors 'none'",
    ].join('; '));

    // Permissions Policy
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return headers;
}

/**
 * Input sanitization for XSS prevention
 */
export function sanitizeInput(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize object recursively
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = sanitizeInput(key);

        if (typeof value === 'string') {
            sanitized[sanitizedKey] = sanitizeInput(value);
        } else if (Array.isArray(value)) {
            sanitized[sanitizedKey] = value.map(v =>
                typeof v === 'string' ? sanitizeInput(v) :
                    typeof v === 'object' && v !== null ? sanitizeObject(v as Record<string, unknown>) : v
            );
        } else if (typeof value === 'object' && value !== null) {
            sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
        } else {
            sanitized[sanitizedKey] = value;
        }
    }

    return sanitized;
}

/**
 * Audit logging for security events
 */
export async function auditLog(params: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}) {
    try {
        // In production, this would write to a dedicated audit log table
        console.log('[AUDIT]', JSON.stringify({
            timestamp: new Date().toISOString(),
            ...params,
        }));

        // For critical actions, also store in database
        // await prisma.auditLog.create({ data: params });
    } catch (error) {
        console.error('[Audit] Failed to log:', error);
    }
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * CSRF token generation and validation
 */
export function generateCSRFToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken) return false;
    const crypto = require('crypto');
    return crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(sessionToken)
    );
}
