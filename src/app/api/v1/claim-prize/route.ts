import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { selectPrize } from '@/lib/prize-engine';
import { z } from 'zod';

const ClaimPrizeSchema = z.object({
    sessionId: z.string(),
    email: z.string().email().optional(),
    formData: z.record(z.unknown()).optional(),
});

/**
 * Public endpoint for widget to claim a prize
 * Called after game completion
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const result = ClaimPrizeSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid claim data' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaignId');

        if (!campaignId) {
            return NextResponse.json(
                { error: 'Campaign ID required' },
                { status: 400 }
            );
        }

        // Verify campaign exists and is active
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { id: true, status: true, workspaceId: true },
        });

        if (!campaign || campaign.status !== 'PUBLISHED') {
            return NextResponse.json(
                { error: 'Campaign not found or not active' },
                { status: 404 }
            );
        }

        const { sessionId, email, formData } = result.data;

        // Check if this session already claimed a prize
        const existingSubmission = await prisma.submission.findFirst({
            where: {
                campaignId,
                sessionId,
                prizeWon: { not: null },
            },
        });

        if (existingSubmission) {
            return NextResponse.json({
                success: true,
                alreadyClaimed: true,
                prize: {
                    name: existingSubmission.prizeWon,
                    couponCode: existingSubmission.prizeCodeId,
                },
            });
        }

        // Select prize
        const prize = await selectPrize(campaignId);

        if (!prize) {
            return NextResponse.json({
                success: true,
                noPrizeAvailable: true,
            });
        }

        // Create submission record
        const submission = await prisma.submission.create({
            data: {
                workspaceId: campaign.workspaceId,
                campaignId,
                sessionId,
                email: email || null,
                data: formData || {},
                prizeWon: prize.prizeName,
                prizeCodeId: prize.couponCode,
            },
        });

        // Track prize awarded event
        await prisma.eventRaw.create({
            data: {
                workspaceId: campaign.workspaceId,
                campaignId,
                sessionId,
                eventType: 'PRIZE_AWARDED',
                payload: {
                    prizeId: prize.prizeId,
                    prizeName: prize.prizeName,
                    hasCoupon: !!prize.couponCode,
                    isConsolation: prize.isConsolation,
                },
            },
        });

        return NextResponse.json({
            success: true,
            prize: {
                name: prize.prizeName,
                couponCode: prize.couponCode,
                isConsolation: prize.isConsolation,
            },
            submissionId: submission.id,
        });

    } catch (error) {
        console.error('[Claim Prize] Error:', error);
        return NextResponse.json(
            { error: 'Failed to claim prize' },
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
