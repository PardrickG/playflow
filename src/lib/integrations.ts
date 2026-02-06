import { prisma } from '@/lib/db';
import type { IntegrationProvider } from '@prisma/client';
import crypto from 'crypto';

/**
 * Integration & Webhook System
 * 
 * Handles outbound webhooks and native integrations (Klaviyo, HubSpot)
 */

interface WebhookPayload {
    event: string;
    campaignId: string;
    timestamp: string;
    data: Record<string, unknown>;
}

/**
 * Send webhook to an integration endpoint
 */
export async function sendWebhook(
    integrationId: string,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        select: {
            id: true,
            provider: true,
            credentials: true,
            settings: true,
            isActive: true,
        },
    });

    if (!integration || !integration.isActive) {
        return { success: false, error: 'Integration not found or inactive' };
    }

    const credentials = integration.credentials as { url?: string; secret?: string };
    const url = credentials.url;

    if (!url) {
        return { success: false, error: 'Webhook URL not configured' };
    }

    // Generate signature for verification
    const payloadString = JSON.stringify(payload);
    const signature = credentials.secret
        ? crypto.createHmac('sha256', credentials.secret).update(payloadString).digest('hex')
        : undefined;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-PlayFlow-Signature': signature || '',
                'X-PlayFlow-Event': payload.event,
            },
            body: payloadString,
        });

        // Update last sync time
        await prisma.integration.update({
            where: { id: integrationId },
            data: { lastSyncAt: new Date() },
        });

        return {
            success: response.ok,
            statusCode: response.status,
            error: response.ok ? undefined : `HTTP ${response.status}`,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

/**
 * Queue a job for async processing
 */
export async function queueIntegrationJob(
    integrationId: string,
    type: 'SYNC_CONTACT' | 'ADD_TAG' | 'SEND_EVENT' | 'WEBHOOK_DELIVERY',
    payload: Record<string, unknown>,
    options?: { scheduledFor?: Date }
): Promise<string> {
    const job = await prisma.integrationJob.create({
        data: {
            integrationId,
            type,
            payload,
            scheduledFor: options?.scheduledFor || new Date(),
        },
    });

    return job.id;
}

/**
 * Process pending integration jobs
 */
export async function processIntegrationJobs(limit: number = 50): Promise<{
    processed: number;
    failed: number;
}> {
    let processed = 0;
    let failed = 0;

    // Get jobs ready for processing
    const jobs = await prisma.integrationJob.findMany({
        where: {
            status: { in: ['PENDING', 'RETRYING'] },
            scheduledFor: { lte: new Date() },
            attempts: { lt: prisma.integrationJob.fields.maxAttempts },
        },
        include: {
            integration: {
                select: {
                    id: true,
                    provider: true,
                    credentials: true,
                    settings: true,
                    isActive: true,
                },
            },
        },
        take: limit,
        orderBy: { scheduledFor: 'asc' },
    });

    for (const job of jobs) {
        // Mark as running
        await prisma.integrationJob.update({
            where: { id: job.id },
            data: {
                status: 'RUNNING',
                startedAt: new Date(),
                attempts: { increment: 1 },
            },
        });

        try {
            let success = false;

            switch (job.type) {
                case 'WEBHOOK_DELIVERY':
                    const webhookResult = await sendWebhook(job.integrationId, job.payload as WebhookPayload);
                    success = webhookResult.success;
                    if (!success) {
                        throw new Error(webhookResult.error);
                    }
                    break;

                case 'SYNC_CONTACT':
                    success = await syncContactToProvider(job.integration, job.payload);
                    break;

                case 'ADD_TAG':
                    success = await addTagToContact(job.integration, job.payload);
                    break;

                case 'SEND_EVENT':
                    success = await sendEventToProvider(job.integration, job.payload);
                    break;
            }

            if (success) {
                await prisma.integrationJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                    },
                });
                processed++;
            } else {
                throw new Error('Job handler returned false');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if should retry
            const shouldRetry = job.attempts < job.maxAttempts;

            await prisma.integrationJob.update({
                where: { id: job.id },
                data: {
                    status: shouldRetry ? 'RETRYING' : 'FAILED',
                    lastError: errorMessage,
                    // Exponential backoff for retries
                    scheduledFor: shouldRetry
                        ? new Date(Date.now() + Math.pow(2, job.attempts) * 60000)
                        : undefined,
                },
            });

            failed++;
        }
    }

    return { processed, failed };
}

/**
 * Sync contact to integration provider (Klaviyo/HubSpot)
 */
async function syncContactToProvider(
    integration: { provider: IntegrationProvider; credentials: unknown; settings: unknown },
    payload: Record<string, unknown>
): Promise<boolean> {
    const { email, properties } = payload as { email: string; properties: Record<string, unknown> };

    switch (integration.provider) {
        case 'KLAVIYO':
            return syncToKlaviyo(integration.credentials, email, properties);
        case 'HUBSPOT':
            return syncToHubSpot(integration.credentials, email, properties);
        default:
            return false;
    }
}

/**
 * Add tag to contact in provider
 */
async function addTagToContact(
    integration: { provider: IntegrationProvider; credentials: unknown },
    payload: Record<string, unknown>
): Promise<boolean> {
    const { email, tag } = payload as { email: string; tag: string };

    switch (integration.provider) {
        case 'KLAVIYO':
            return addKlaviyoTag(integration.credentials, email, tag);
        case 'HUBSPOT':
            return addHubSpotTag(integration.credentials, email, tag);
        default:
            return false;
    }
}

/**
 * Send custom event to provider
 */
async function sendEventToProvider(
    integration: { provider: IntegrationProvider; credentials: unknown },
    payload: Record<string, unknown>
): Promise<boolean> {
    const { email, eventName, eventData } = payload as {
        email: string;
        eventName: string;
        eventData: Record<string, unknown>;
    };

    switch (integration.provider) {
        case 'KLAVIYO':
            return sendKlaviyoEvent(integration.credentials, email, eventName, eventData);
        case 'HUBSPOT':
            return sendHubSpotEvent(integration.credentials, email, eventName, eventData);
        default:
            return false;
    }
}

// ============================================================================
// Klaviyo Integration
// ============================================================================

async function syncToKlaviyo(
    credentials: unknown,
    email: string,
    properties: Record<string, unknown>
): Promise<boolean> {
    const { apiKey } = credentials as { apiKey: string };

    const response = await fetch('https://a.klaviyo.com/api/profiles/', {
        method: 'POST',
        headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-02-15',
        },
        body: JSON.stringify({
            data: {
                type: 'profile',
                attributes: {
                    email,
                    properties,
                },
            },
        }),
    });

    return response.ok || response.status === 409; // 409 = already exists
}

async function addKlaviyoTag(
    credentials: unknown,
    email: string,
    tag: string
): Promise<boolean> {
    const { apiKey, listId } = credentials as { apiKey: string; listId?: string };

    if (!listId) return false;

    const response = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
        method: 'POST',
        headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-02-15',
        },
        body: JSON.stringify({
            data: [{
                type: 'profile',
                id: email, // Klaviyo uses email as identifier
            }],
        }),
    });

    return response.ok;
}

async function sendKlaviyoEvent(
    credentials: unknown,
    email: string,
    eventName: string,
    eventData: Record<string, unknown>
): Promise<boolean> {
    const { apiKey } = credentials as { apiKey: string };

    const response = await fetch('https://a.klaviyo.com/api/events/', {
        method: 'POST',
        headers: {
            'Authorization': `Klaviyo-API-Key ${apiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-02-15',
        },
        body: JSON.stringify({
            data: {
                type: 'event',
                attributes: {
                    profile: { email },
                    metric: { name: eventName },
                    properties: eventData,
                    time: new Date().toISOString(),
                },
            },
        }),
    });

    return response.ok;
}

// ============================================================================
// HubSpot Integration
// ============================================================================

async function syncToHubSpot(
    credentials: unknown,
    email: string,
    properties: Record<string, unknown>
): Promise<boolean> {
    const { accessToken } = credentials as { accessToken: string };

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: {
                email,
                ...properties,
            },
        }),
    });

    return response.ok || response.status === 409;
}

async function addHubSpotTag(
    credentials: unknown,
    email: string,
    tag: string
): Promise<boolean> {
    // HubSpot doesn't have tags per se, but we can add to a list or update a property
    // For now, update a custom property
    const { accessToken } = credentials as { accessToken: string };

    // First find the contact
    const searchResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/search`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{
                        propertyName: 'email',
                        operator: 'EQ',
                        value: email,
                    }],
                }],
            }),
        }
    );

    if (!searchResponse.ok) return false;

    const searchData = await searchResponse.json();
    if (searchData.results.length === 0) return false;

    const contactId = searchData.results[0].id;

    // Update with tag
    const updateResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                properties: {
                    playflow_tag: tag,
                },
            }),
        }
    );

    return updateResponse.ok;
}

async function sendHubSpotEvent(
    credentials: unknown,
    email: string,
    eventName: string,
    eventData: Record<string, unknown>
): Promise<boolean> {
    const { accessToken } = credentials as { accessToken: string };

    // HubSpot uses timeline events
    const response = await fetch(
        'https://api.hubapi.com/crm/v3/timeline/events',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventTemplateId: 'playflow_event',
                email,
                tokens: {
                    event_name: eventName,
                    ...eventData,
                },
            }),
        }
    );

    return response.ok;
}
