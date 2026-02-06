import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/auth';
import { getCampaignSubmissions, exportSubmissionsCSV } from '@/lib/form-capture';

interface RouteParams {
    params: Promise<{ slug: string; id: string }>;
}

/**
 * Get submissions for a campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug, id } = await params;

        await requireWorkspaceAccess(user.id, slug);

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const email = searchParams.get('email') || undefined;
        const format = searchParams.get('format');

        // CSV export
        if (format === 'csv') {
            const csv = await exportSubmissionsCSV(id);
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="submissions-${id}.csv"`,
                },
            });
        }

        const result = await getCampaignSubmissions({
            campaignId: id,
            limit: Math.min(limit, 100),
            offset,
            email,
        });

        return NextResponse.json(result);

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Submissions] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }
}
