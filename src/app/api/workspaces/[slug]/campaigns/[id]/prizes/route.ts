import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess } from '@/lib/auth';
import { getPrizeInventory, importCouponCodes, generateCouponCodes } from '@/lib/prize-engine';
import { z } from 'zod';

interface RouteParams {
    params: Promise<{ slug: string; id: string }>;
}

/**
 * List prizes for a campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug, id } = await params;

        await requireWorkspaceAccess(user.id, slug);

        const inventory = await getPrizeInventory(id);

        return NextResponse.json({ prizes: inventory });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Prizes] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch prizes' }, { status: 500 });
    }
}

const CreatePrizeSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    probability: z.number().min(0).max(1),
    quantity: z.number().int().positive().optional(),
    isConsolation: z.boolean().optional(),
    codes: z.array(z.string()).optional(),
    generateCodes: z.object({
        count: z.number().int().positive().max(10000),
        prefix: z.string().optional(),
        length: z.number().int().min(4).max(20).optional(),
    }).optional(),
});

/**
 * Create a new prize for a campaign
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug, id } = await params;

        const membership = await requireWorkspaceAccess(user.id, slug);

        // Only OWNER, ADMIN, EDITOR can create prizes
        if (!['OWNER', 'ADMIN', 'EDITOR'].includes(membership.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const result = CreatePrizeSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid prize data', details: result.error.format() },
                { status: 400 }
            );
        }

        const { name, description, imageUrl, probability, quantity, isConsolation, codes, generateCodes: genCodes } = result.data;

        // Create prize
        const prize = await prisma.prize.create({
            data: {
                workspaceId: membership.workspaceId,
                campaignId: id,
                name,
                description,
                imageUrl,
                probability,
                quantity,
                isConsolation: isConsolation || false,
            },
        });

        // Add codes if provided
        let importResult = { imported: 0, duplicates: 0 };

        if (codes && codes.length > 0) {
            importResult = await importCouponCodes(prize.id, codes);
        } else if (genCodes) {
            const generatedCodes = generateCouponCodes(genCodes.count, {
                prefix: genCodes.prefix,
                length: genCodes.length,
            });
            importResult = await importCouponCodes(prize.id, generatedCodes);
        }

        return NextResponse.json({
            prize: {
                id: prize.id,
                name: prize.name,
                probability: prize.probability,
                quantity: prize.quantity,
                isConsolation: prize.isConsolation,
            },
            codes: importResult,
        }, { status: 201 });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Prizes] Error:', error);
        return NextResponse.json({ error: 'Failed to create prize' }, { status: 500 });
    }
}
