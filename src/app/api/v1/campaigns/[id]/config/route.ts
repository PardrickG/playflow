import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Public endpoint for widget to fetch campaign config
 * No auth required - campaigns are public once published
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Get campaign with active version
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                activeVersion: true,
                workspace: {
                    select: {
                        primaryColor: true,
                        secondaryColor: true,
                        fontFamily: true,
                    },
                },
            },
        });

        if (!campaign) {
            return NextResponse.json(
                { error: 'Campaign not found' },
                { status: 404 }
            );
        }

        // Only serve published campaigns
        if (campaign.status !== 'PUBLISHED') {
            return NextResponse.json(
                { error: 'Campaign not published' },
                { status: 404 }
            );
        }

        if (!campaign.activeVersion) {
            return NextResponse.json(
                { error: 'No active version' },
                { status: 404 }
            );
        }

        // Build response config
        const config = {
            id: campaign.id,
            version: campaign.activeVersion.version,
            flow: campaign.activeVersion.config,
            branding: campaign.workspace.primaryColor ? {
                primaryColor: campaign.workspace.primaryColor,
                secondaryColor: campaign.workspace.secondaryColor,
                fontFamily: campaign.workspace.fontFamily,
            } : undefined,
        };

        // Set cache headers for CDN
        const response = NextResponse.json(config);
        response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET');

        return response;

    } catch (error) {
        console.error('[Widget Config] Error:', error);
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
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}
