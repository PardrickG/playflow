import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess } from '@/lib/auth';
import { z } from 'zod';

interface RouteParams {
    params: Promise<{ slug: string }>;
}

/**
 * List assets for a workspace
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug } = await params;

        const membership = await requireWorkspaceAccess(user.id, slug);

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const assets = await prisma.asset.findMany({
            where: {
                workspaceId: membership.workspaceId,
                ...(type && { type: type as any }),
            },
            select: {
                id: true,
                name: true,
                type: true,
                url: true,
                size: true,
                mimeType: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        const total = await prisma.asset.count({
            where: {
                workspaceId: membership.workspaceId,
                ...(type && { type: type as any }),
            },
        });

        return NextResponse.json({ assets, total, limit, offset });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Assets] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }
}

const CreateAssetSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FONT', 'OTHER']),
    url: z.string().url(),
    size: z.number().int().positive().optional(),
    mimeType: z.string().optional(),
});

/**
 * Register an uploaded asset
 * (Actual upload happens to external storage like S3/R2)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug } = await params;

        const membership = await requireWorkspaceAccess(user.id, slug);

        if (!['OWNER', 'ADMIN', 'EDITOR'].includes(membership.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const result = CreateAssetSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid asset data', details: result.error.format() },
                { status: 400 }
            );
        }

        const { name, type, url, size, mimeType } = result.data;

        const asset = await prisma.asset.create({
            data: {
                workspaceId: membership.workspaceId,
                name,
                type,
                url,
                size,
                mimeType,
            },
        });

        return NextResponse.json({ asset }, { status: 201 });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Assets] Error:', error);
        return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
    }
}
