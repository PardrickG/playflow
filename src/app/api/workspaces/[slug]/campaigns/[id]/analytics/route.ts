import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess } from '@/lib/auth';
import { getCampaignMetrics, getCampaignDailyMetrics } from '@/lib/event-processor';

interface RouteParams {
    params: Promise<{ slug: string; id: string }>;
}

/**
 * Get analytics for a specific campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug, id } = await params;

        // Verify workspace access
        await requireWorkspaceAccess(user.id, slug);

        // Parse query params
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : undefined;
        const endDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : undefined;
        const includeDaily = searchParams.get('daily') === 'true';

        // Verify campaign exists and belongs to workspace
        const campaign = await prisma.campaign.findFirst({
            where: {
                id,
                workspace: { slug },
            },
            select: { id: true, name: true, status: true, createdAt: true },
        });

        if (!campaign) {
            return NextResponse.json(
                { error: 'Campaign not found' },
                { status: 404 }
            );
        }

        // Get metrics
        const metrics = await getCampaignMetrics(id, { startDate, endDate });

        // Get daily breakdown if requested
        const daily = includeDaily
            ? await getCampaignDailyMetrics(id, { startDate, endDate })
            : undefined;

        // Get recent submissions count
        const submissionCount = await prisma.submission.count({
            where: { campaignId: id },
        });

        return NextResponse.json({
            campaign: {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                createdAt: campaign.createdAt,
            },
            metrics: {
                impressions: metrics.impressions,
                opens: metrics.opens,
                closes: metrics.closes,
                gameStarts: metrics.gameStarts,
                gameFinishes: metrics.gameFinishes,
                formSubmits: metrics.formSubmits,
                prizesAwarded: metrics.prizesAwarded,
                ctaClicks: metrics.ctaClicks,
                submissions: submissionCount,
                // Rates
                openRate: metrics.openRate,
                completionRate: metrics.completionRate,
                conversionRate: metrics.conversionRate,
            },
            daily,
        });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }
        console.error('[Campaign Analytics] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
