import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import type { EventType } from '@prisma/client';

/**
 * Event schema for validation
 */
const EventSchema = z.object({
    type: z.string(),
    campaignId: z.string(),
    timestamp: z.number(),
    data: z.record(z.unknown()).optional(),
});

const EventBatchSchema = z.object({
    events: z.array(EventSchema).max(100),
});

// Map widget event types to Prisma EventType enum
const EVENT_TYPE_MAP: Record<string, EventType> = {
    campaign_view: 'IMPRESSION',
    campaign_triggered: 'OPEN',
    campaign_closed: 'CLOSE',
    game_start: 'START_GAME',
    game_complete: 'FINISH_GAME',
    form_submit: 'FORM_SUBMIT',
    prize_won: 'PRIZE_AWARDED',
    cta_click: 'CTA_CLICK',
    campaign_completed: 'FINISH_GAME',
};

/**
 * Public endpoint for widget event ingestion
 * No auth required - events are tracked by campaign ID
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate payload
        const result = EventBatchSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid event payload' },
                { status: 400 }
            );
        }

        const { events } = result.data;

        // Get client info
        const forwardedFor = request.headers.get('x-forwarded-for');
        const userAgent = request.headers.get('user-agent') || '';
        const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
        const sessionId = request.cookies.get('pf_session')?.value || `anon_${Date.now()}`;

        // Get workspace IDs for campaigns
        const campaignIds = [...new Set(events.map(e => e.campaignId))];
        const campaigns = await prisma.campaign.findMany({
            where: { id: { in: campaignIds } },
            select: { id: true, workspaceId: true },
        });
        const campaignWorkspaceMap = new Map(campaigns.map(c => [c.id, c.workspaceId]));

        // Store events using EventRaw model
        const eventRecords = events
            .filter(event => campaignWorkspaceMap.has(event.campaignId))
            .map((event) => ({
                workspaceId: campaignWorkspaceMap.get(event.campaignId)!,
                campaignId: event.campaignId,
                sessionId,
                eventType: EVENT_TYPE_MAP[event.type] || ('IMPRESSION' as EventType),
                payload: event.data || {},
                timestamp: new Date(event.timestamp),
            }));

        if (eventRecords.length > 0) {
            await prisma.eventRaw.createMany({
                data: eventRecords,
            });
        }

        // Process form submissions separately
        for (const event of events) {
            if (event.type === 'form_submit' && event.data) {
                const workspaceId = campaignWorkspaceMap.get(event.campaignId);
                if (!workspaceId) continue;

                await prisma.submission.create({
                    data: {
                        workspaceId,
                        campaignId: event.campaignId,
                        sessionId,
                        email: (event.data.email as string) || null,
                        phone: (event.data.phone as string) || null,
                        data: event.data,
                        consent: !!(event.data.consent),
                        ipAddress: ip.substring(0, 45),
                        userAgent: userAgent.substring(0, 255),
                    },
                });
            }
        }

        return NextResponse.json({ success: true, count: events.length });

    } catch (error) {
        console.error('[Event Ingestion] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}
