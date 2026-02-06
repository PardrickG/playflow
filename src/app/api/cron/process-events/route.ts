import { NextRequest, NextResponse } from 'next/server';
import { processEventBatch } from '@/lib/event-processor';

/**
 * Cron endpoint for processing raw events into aggregations
 * 
 * In production, this would be called by:
 * - Vercel Cron
 * - Cloudflare Cron Triggers
 * - External scheduler (e.g., AWS EventBridge)
 * 
 * Security: Validate CRON_SECRET in production
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

        // Process multiple batches until queue is empty or limit reached
        let totalProcessed = 0;
        let totalErrors = 0;
        let batchCount = 0;
        const maxBatches = 10;

        while (batchCount < maxBatches) {
            const { processed, errors } = await processEventBatch();

            totalProcessed += processed;
            totalErrors += errors;
            batchCount++;

            // Stop if no more events to process
            if (processed === 0) break;
        }

        return NextResponse.json({
            success: true,
            processed: totalProcessed,
            errors: totalErrors,
            batches: batchCount,
        });

    } catch (error) {
        console.error('[Cron Process Events] Error:', error);
        return NextResponse.json(
            { error: 'Processing failed' },
            { status: 500 }
        );
    }
}

/**
 * GET for health check
 */
export async function GET() {
    return NextResponse.json({ status: 'ok', job: 'process-events' });
}
