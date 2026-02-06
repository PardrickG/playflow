import { NextRequest, NextResponse } from 'next/server';
import { cleanupProcessedEvents } from '@/lib/event-processor';

/**
 * Cron endpoint for cleaning up old processed events
 * Run daily to keep the raw events table manageable
 * 
 * Retains raw events for 7 days after processing for debugging
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret in production
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Cleanup events older than 7 days
        const deletedCount = await cleanupProcessedEvents(7);

        return NextResponse.json({
            success: true,
            deleted: deletedCount,
        });

    } catch (error) {
        console.error('[Cron Cleanup] Error:', error);
        return NextResponse.json(
            { error: 'Cleanup failed' },
            { status: 500 }
        );
    }
}

/**
 * GET for health check
 */
export async function GET() {
    return NextResponse.json({ status: 'ok', job: 'cleanup-events' });
}
