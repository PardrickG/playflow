import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * Form Capture & Dynamic Fields System
 * 
 * Handles form schema validation, field rendering, and submission processing
 */

// Field type definitions
export const FormFieldSchema = z.object({
    id: z.string(),
    type: z.enum(['text', 'email', 'phone', 'select', 'checkbox', 'date', 'number', 'textarea']),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    validation: z.object({
        pattern: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
    }).optional(),
    options: z.array(z.object({
        value: z.string(),
        label: z.string(),
    })).optional(),
});

export const FormConfigSchema = z.object({
    fields: z.array(FormFieldSchema),
    submitText: z.string().default('Submit'),
    successMessage: z.string().optional(),
    consentRequired: z.boolean().default(true),
    consentText: z.string().optional(),
    gdprCompliant: z.boolean().default(true),
});

export type FormField = z.infer<typeof FormFieldSchema>;
export type FormConfig = z.infer<typeof FormConfigSchema>;

/**
 * Validate form submission against schema
 */
export function validateFormSubmission(
    config: FormConfig,
    data: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    for (const field of config.fields) {
        const value = data[field.id];

        // Check required
        if (field.required && (value === undefined || value === '' || value === null)) {
            errors[field.id] = `${field.label} is required`;
            continue;
        }

        if (value === undefined || value === '') continue;

        // Type-specific validation
        switch (field.type) {
            case 'email':
                if (typeof value === 'string' && !isValidEmail(value)) {
                    errors[field.id] = 'Invalid email address';
                }
                break;

            case 'phone':
                if (typeof value === 'string' && !isValidPhone(value)) {
                    errors[field.id] = 'Invalid phone number';
                }
                break;

            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    errors[field.id] = 'Must be a number';
                } else {
                    if (field.validation?.min !== undefined && num < field.validation.min) {
                        errors[field.id] = `Minimum value is ${field.validation.min}`;
                    }
                    if (field.validation?.max !== undefined && num > field.validation.max) {
                        errors[field.id] = `Maximum value is ${field.validation.max}`;
                    }
                }
                break;

            case 'text':
            case 'textarea':
                if (typeof value === 'string') {
                    if (field.validation?.minLength && value.length < field.validation.minLength) {
                        errors[field.id] = `Minimum ${field.validation.minLength} characters`;
                    }
                    if (field.validation?.maxLength && value.length > field.validation.maxLength) {
                        errors[field.id] = `Maximum ${field.validation.maxLength} characters`;
                    }
                    if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
                        errors[field.id] = 'Invalid format';
                    }
                }
                break;
        }
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Process and store form submission
 */
export async function processFormSubmission(params: {
    workspaceId: string;
    campaignId: string;
    sessionId: string;
    formData: Record<string, unknown>;
    consent: boolean;
    consentText?: string;
    ipAddress?: string;
    userAgent?: string;
}) {
    const { workspaceId, campaignId, sessionId, formData, consent, consentText, ipAddress, userAgent } = params;

    // Extract standard fields
    const email = typeof formData.email === 'string' ? formData.email : null;
    const phone = typeof formData.phone === 'string' ? formData.phone : null;

    // Create submission
    const submission = await prisma.submission.create({
        data: {
            workspaceId,
            campaignId,
            sessionId,
            email,
            phone,
            data: formData,
            consent,
            consentText,
            ipAddress: ipAddress?.substring(0, 45),
            userAgent: userAgent?.substring(0, 255),
        },
    });

    // Track event
    await prisma.eventRaw.create({
        data: {
            workspaceId,
            campaignId,
            sessionId,
            eventType: 'FORM_SUBMIT',
            payload: {
                submissionId: submission.id,
                hasEmail: !!email,
                hasPhone: !!phone,
                fieldCount: Object.keys(formData).length,
            },
        },
    });

    return submission;
}

/**
 * Get submissions for a campaign with pagination
 */
export async function getCampaignSubmissions(params: {
    campaignId: string;
    limit?: number;
    offset?: number;
    email?: string;
}) {
    const { campaignId, limit = 50, offset = 0, email } = params;

    const submissions = await prisma.submission.findMany({
        where: {
            campaignId,
            ...(email && { email: { contains: email, mode: 'insensitive' } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
            id: true,
            email: true,
            phone: true,
            data: true,
            consent: true,
            prizeWon: true,
            createdAt: true,
        },
    });

    const total = await prisma.submission.count({
        where: {
            campaignId,
            ...(email && { email: { contains: email, mode: 'insensitive' } }),
        },
    });

    return { submissions, total, limit, offset };
}

/**
 * Export submissions as CSV
 */
export async function exportSubmissionsCSV(campaignId: string): Promise<string> {
    const submissions = await prisma.submission.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
    });

    if (submissions.length === 0) {
        return 'No submissions';
    }

    // Collect all unique field keys
    const allKeys = new Set<string>();
    submissions.forEach(s => {
        if (s.data && typeof s.data === 'object') {
            Object.keys(s.data as Record<string, unknown>).forEach(k => allKeys.add(k));
        }
    });

    const headers = ['id', 'email', 'phone', 'prizeWon', 'consent', 'createdAt', ...allKeys];

    const rows = submissions.map(s => {
        const data = (s.data || {}) as Record<string, unknown>;
        return headers.map(h => {
            if (h === 'createdAt') return s.createdAt.toISOString();
            if (h in s) return String((s as Record<string, unknown>)[h] ?? '');
            return String(data[h] ?? '');
        }).map(v => `"${v.replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

// Helpers
function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
    return /^\+?[\d\s-()]{7,}$/.test(phone);
}
