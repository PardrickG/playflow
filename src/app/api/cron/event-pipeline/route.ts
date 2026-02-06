import { NextRequest, NextResponse } from 'next/server';
import { processPendingEvents } from '@/lib/event-pipeline';
import { processEventBatch } from '@/lib/event-processor';

/**
 * Enhanced cron endpoint for full event pipeline processing
 * 
 * 1. First aggregates raw events to daily stats
 * 2. Then processes events through pipeline (integrations, prizes, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Step 1: Aggregate to daily stats
        let totalAggregated = 0;
        let aggBatches = 0;
        const maxAggBatches = 10;

        while (aggBatches < maxAggBatches) {
            const { processed } = await processEventBatch();
            totalAggregated += processed;
            aggBatches++;
            if (processed === 0) break;
        }

        // Step 2: Process through pipeline (integrations, etc.)
        let totalPipelined = 0;
        let pipeBatches = 0;
        const maxPipeBatches = 10;

        while (pipeBatches < maxPipeBatches) {
            const processed = await processPendingEvents(100);
            totalPipelined += processed;
            pipeBatches++;
            if (processed === 0) break;
        }

        return NextResponse.json({
            success: true,
            aggregated: totalAggregated,
            pipelined: totalPipelined,
            batches: { aggregation: aggBatches, pipeline: pipeBatches },
        });

    } catch (error) {
        console.error('[Cron Pipeline] Error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'ok', job: 'event-pipeline' });
}
