import { NextRequest, NextResponse } from 'next/server';
import { processIntegrationJobs } from '@/lib/integrations';

/**
 * Cron endpoint for processing integration jobs
 * Process webhooks, sync contacts, etc.
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret in production
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { processed, failed } = await processIntegrationJobs(100);

        return NextResponse.json({
            success: true,
            processed,
            failed,
        });

    } catch (error) {
        console.error('[Cron Process Integrations] Error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'ok', job: 'process-integrations' });
}
