import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { queueIntegrationJob } from '@/lib/integrations';
import { assignPrizeToSubmission } from '@/lib/prize-engine';

/**
 * Event Pipeline Consumer
 * 
 * Processes events and triggers downstream actions:
 * - Integration webhooks
 * - Prize distribution
 * - Email notifications
 */

interface EventPayload {
    eventType: string;
    campaignId: string;
    workspaceId: string;
    sessionId: string;
    data?: Record<string, unknown>;
}

/**
 * Process a single event through the pipeline
 */
export async function processEventPipeline(event: EventPayload): Promise<void> {
    const { eventType, campaignId, workspaceId, sessionId, data } = event;

    // Get campaign with integrations
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            workspace: {
                include: {
                    integrations: {
                        where: { isActive: true },
                    },
                },
            },
        },
    });

    if (!campaign) return;

    const integrations = campaign.workspace.integrations;

    // Process based on event type
    switch (eventType) {
        case 'FORM_SUBMIT':
            await handleFormSubmit(event, integrations);
            break;

        case 'FINISH_GAME':
            await handleGameComplete(event, integrations);
            break;

        case 'PRIZE_AWARDED':
            await handlePrizeAwarded(event, integrations);
            break;

        case 'CTA_CLICK':
            await handleCtaClick(event, integrations);
            break;
    }

    // Always send to webhooks if configured
    for (const integration of integrations) {
        if (integration.provider === 'WEBHOOK') {
            await queueIntegrationJob(integration.id, 'WEBHOOK_DELIVERY', {
                event: eventType,
                campaignId,
                timestamp: new Date().toISOString(),
                data,
            });
        }
    }
}

/**
 * Handle form submission events
 */
async function handleFormSubmit(
    event: EventPayload,
    integrations: Array<{ id: string; provider: string }>
) {
    const { data, campaignId, sessionId } = event;
    const email = data?.email as string | undefined;

    if (!email) return;

    // Sync to marketing integrations
    for (const integration of integrations) {
        if (integration.provider === 'KLAVIYO' || integration.provider === 'HUBSPOT') {
            await queueIntegrationJob(integration.id, 'SYNC_CONTACT', {
                email,
                properties: {
                    campaignId,
                    source: 'playflow',
                    signupDate: new Date().toISOString(),
                    ...data,
                },
            });

            // Add campaign tag
            await queueIntegrationJob(integration.id, 'ADD_TAG', {
                email,
                tag: `playflow_${campaignId}`,
            });
        }
    }
}

/**
 * Handle game completion events
 */
async function handleGameComplete(
    event: EventPayload,
    integrations: Array<{ id: string; provider: string }>
) {
    const { campaignId, sessionId, data } = event;

    // Check if player is eligible for prize
    const submission = await prisma.submission.findFirst({
        where: {
            campaignId,
            sessionId,
            prizeWon: null, // Not already won
        },
        orderBy: { createdAt: 'desc' },
    });

    if (submission) {
        // Award prize
        const prize = await assignPrizeToSubmission(submission.id, campaignId);

        if (prize && submission.email) {
            // Notify integrations
            for (const integration of integrations) {
                if (integration.provider === 'KLAVIYO' || integration.provider === 'HUBSPOT') {
                    await queueIntegrationJob(integration.id, 'SEND_EVENT', {
                        email: submission.email,
                        eventName: 'Prize Won',
                        eventData: {
                            campaignId,
                            prizeName: prize.prizeName,
                            couponCode: prize.couponCode,
                            isConsolation: prize.isConsolation,
                        },
                    });
                }
            }
        }
    }
}

/**
 * Handle prize awarded events
 */
async function handlePrizeAwarded(
    event: EventPayload,
    integrations: Array<{ id: string; provider: string }>
) {
    const { data, campaignId, sessionId } = event;

    // Find submission to get email
    const submission = await prisma.submission.findFirst({
        where: { campaignId, sessionId },
        orderBy: { createdAt: 'desc' },
    });

    if (submission?.email) {
        for (const integration of integrations) {
            if (integration.provider === 'KLAVIYO' || integration.provider === 'HUBSPOT') {
                await queueIntegrationJob(integration.id, 'SEND_EVENT', {
                    email: submission.email,
                    eventName: 'PlayFlow Prize Awarded',
                    eventData: {
                        campaignId,
                        ...data,
                    },
                });
            }
        }
    }
}

/**
 * Handle CTA click events
 */
async function handleCtaClick(
    event: EventPayload,
    integrations: Array<{ id: string; provider: string }>
) {
    const { data, campaignId, sessionId } = event;

    const submission = await prisma.submission.findFirst({
        where: { campaignId, sessionId },
        orderBy: { createdAt: 'desc' },
    });

    if (submission?.email) {
        for (const integration of integrations) {
            if (integration.provider === 'KLAVIYO' || integration.provider === 'HUBSPOT') {
                await queueIntegrationJob(integration.id, 'SEND_EVENT', {
                    email: submission.email,
                    eventName: 'PlayFlow CTA Click',
                    eventData: {
                        campaignId,
                        ctaUrl: data?.url,
                        ctaText: data?.text,
                    },
                });
            }
        }
    }
}

/**
 * Batch process unprocessed events
 */
export async function processPendingEvents(batchSize: number = 100): Promise<number> {
    const events = await prisma.eventRaw.findMany({
        where: { processed: false },
        take: batchSize,
        orderBy: { timestamp: 'asc' },
    });

    let processed = 0;

    for (const event of events) {
        try {
            await processEventPipeline({
                eventType: event.eventType,
                campaignId: event.campaignId,
                workspaceId: event.workspaceId,
                sessionId: event.sessionId,
                data: event.payload as Record<string, unknown> | undefined,
            });

            await prisma.eventRaw.update({
                where: { id: event.id },
                data: { processed: true },
            });

            processed++;
        } catch (error) {
            console.error(`[Pipeline] Failed to process event ${event.id}:`, error);
        }
    }

    return processed;
}
