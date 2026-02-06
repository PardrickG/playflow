import { prisma } from '@/lib/db';
import type { EventType } from '@prisma/client';

/**
 * Event Processing Queue
 * 
 * In production, this would be replaced with a proper queue system like:
 * - Cloudflare Queues
 * - AWS SQS
 * - Redis Bull/BullMQ
 * 
 * For now, we use a simple in-memory approach with database polling
 */

const BATCH_SIZE = 100;
const PROCESSING_INTERVAL_MS = 60000; // 1 minute

/**
 * Process unprocessed raw events and update aggregations
 */
export async function processEventBatch(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
        // Get unprocessed events
        const events = await prisma.eventRaw.findMany({
            where: { processed: false },
            take: BATCH_SIZE,
            orderBy: { timestamp: 'asc' },
        });

        if (events.length === 0) {
            return { processed: 0, errors: 0 };
        }

        // Group events by campaign and date for aggregation
        const aggregations = new Map<string, Map<EventType, number>>();

        for (const event of events) {
            const dateKey = event.timestamp.toISOString().split('T')[0];
            const aggKey = `${event.workspaceId}:${event.campaignId}:${dateKey}`;

            if (!aggregations.has(aggKey)) {
                aggregations.set(aggKey, new Map());
            }

            const eventCounts = aggregations.get(aggKey)!;
            eventCounts.set(event.eventType, (eventCounts.get(event.eventType) || 0) + 1);
        }

        // Update aggregations in database
        for (const [aggKey, eventCounts] of aggregations) {
            const [workspaceId, campaignId, dateStr] = aggKey.split(':');
            const date = new Date(dateStr);

            try {
                await prisma.eventAggDaily.upsert({
                    where: {
                        workspaceId_campaignId_date: { workspaceId, campaignId, date },
                    },
                    create: {
                        workspaceId,
                        campaignId,
                        date,
                        impressions: eventCounts.get('IMPRESSION') || 0,
                        opens: eventCounts.get('OPEN') || 0,
                        closes: eventCounts.get('CLOSE') || 0,
                        gameStarts: eventCounts.get('START_GAME') || 0,
                        gameFinishes: eventCounts.get('FINISH_GAME') || 0,
                        formSubmits: eventCounts.get('FORM_SUBMIT') || 0,
                        prizesAwarded: eventCounts.get('PRIZE_AWARDED') || 0,
                        ctaClicks: eventCounts.get('CTA_CLICK') || 0,
                    },
                    update: {
                        impressions: { increment: eventCounts.get('IMPRESSION') || 0 },
                        opens: { increment: eventCounts.get('OPEN') || 0 },
                        closes: { increment: eventCounts.get('CLOSE') || 0 },
                        gameStarts: { increment: eventCounts.get('START_GAME') || 0 },
                        gameFinishes: { increment: eventCounts.get('FINISH_GAME') || 0 },
                        formSubmits: { increment: eventCounts.get('FORM_SUBMIT') || 0 },
                        prizesAwarded: { increment: eventCounts.get('PRIZE_AWARDED') || 0 },
                        ctaClicks: { increment: eventCounts.get('CTA_CLICK') || 0 },
                    },
                });
            } catch (error) {
                console.error(`[EventProcessor] Failed to update aggregation for ${aggKey}:`, error);
                errors++;
                continue;
            }
        }

        // Mark events as processed
        const eventIds = events.map(e => e.id);
        await prisma.eventRaw.updateMany({
            where: { id: { in: eventIds } },
            data: { processed: true },
        });

        processed = events.length;

    } catch (error) {
        console.error('[EventProcessor] Batch processing error:', error);
        errors++;
    }

    return { processed, errors };
}

/**
 * Get real-time metrics for a campaign (combines aggregated + recent raw events)
 */
export async function getCampaignMetrics(campaignId: string, options?: {
    startDate?: Date;
    endDate?: Date;
}) {
    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options?.endDate || new Date();

    // Get aggregated data
    const aggregated = await prisma.eventAggDaily.aggregate({
        where: {
            campaignId,
            date: { gte: startDate, lte: endDate },
        },
        _sum: {
            impressions: true,
            opens: true,
            closes: true,
            gameStarts: true,
            gameFinishes: true,
            formSubmits: true,
            prizesAwarded: true,
            ctaClicks: true,
        },
    });

    // Get recent unprocessed events for real-time accuracy
    const recentRaw = await prisma.eventRaw.groupBy({
        by: ['eventType'],
        where: {
            campaignId,
            processed: false,
            timestamp: { gte: startDate, lte: endDate },
        },
        _count: { eventType: true },
    });

    const rawCounts = new Map(recentRaw.map(r => [r.eventType, r._count.eventType]));

    return {
        impressions: (aggregated._sum.impressions || 0) + (rawCounts.get('IMPRESSION') || 0),
        opens: (aggregated._sum.opens || 0) + (rawCounts.get('OPEN') || 0),
        closes: (aggregated._sum.closes || 0) + (rawCounts.get('CLOSE') || 0),
        gameStarts: (aggregated._sum.gameStarts || 0) + (rawCounts.get('START_GAME') || 0),
        gameFinishes: (aggregated._sum.gameFinishes || 0) + (rawCounts.get('FINISH_GAME') || 0),
        formSubmits: (aggregated._sum.formSubmits || 0) + (rawCounts.get('FORM_SUBMIT') || 0),
        prizesAwarded: (aggregated._sum.prizesAwarded || 0) + (rawCounts.get('PRIZE_AWARDED') || 0),
        ctaClicks: (aggregated._sum.ctaClicks || 0) + (rawCounts.get('CTA_CLICK') || 0),
        // Calculated metrics
        get openRate() {
            return this.impressions > 0 ? (this.opens / this.impressions) * 100 : 0;
        },
        get completionRate() {
            return this.gameStarts > 0 ? (this.gameFinishes / this.gameStarts) * 100 : 0;
        },
        get conversionRate() {
            return this.opens > 0 ? (this.formSubmits / this.opens) * 100 : 0;
        },
    };
}

/**
 * Get daily metrics for charting
 */
export async function getCampaignDailyMetrics(campaignId: string, options?: {
    startDate?: Date;
    endDate?: Date;
}) {
    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options?.endDate || new Date();

    const dailyData = await prisma.eventAggDaily.findMany({
        where: {
            campaignId,
            date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
        select: {
            date: true,
            impressions: true,
            opens: true,
            gameStarts: true,
            gameFinishes: true,
            formSubmits: true,
            prizesAwarded: true,
        },
    });

    return dailyData.map(d => ({
        date: d.date.toISOString().split('T')[0],
        impressions: d.impressions,
        opens: d.opens,
        gameStarts: d.gameStarts,
        gameFinishes: d.gameFinishes,
        formSubmits: d.formSubmits,
        prizesAwarded: d.prizesAwarded,
    }));
}

/**
 * Cleanup old raw events (after aggregation)
 * Call this periodically to keep the raw events table manageable
 */
export async function cleanupProcessedEvents(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.eventRaw.deleteMany({
        where: {
            processed: true,
            timestamp: { lt: cutoffDate },
        },
    });

    return result.count;
}
