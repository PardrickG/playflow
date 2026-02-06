import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireWorkspaceAccess } from '@/lib/auth';
import { z } from 'zod';

interface RouteParams {
    params: Promise<{ slug: string }>;
}

/**
 * List integrations for a workspace
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug } = await params;

        const membership = await requireWorkspaceAccess(user.id, slug);

        const integrations = await prisma.integration.findMany({
            where: { workspaceId: membership.workspaceId },
            select: {
                id: true,
                provider: true,
                name: true,
                isActive: true,
                lastSyncAt: true,
                createdAt: true,
                _count: {
                    select: {
                        jobs: { where: { status: 'FAILED' } },
                    },
                },
            },
        });

        return NextResponse.json({
            integrations: integrations.map(i => ({
                ...i,
                failedJobs: i._count.jobs,
                _count: undefined,
            })),
        });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Integrations] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }
}

const CreateIntegrationSchema = z.object({
    provider: z.enum(['WEBHOOK', 'KLAVIYO', 'HUBSPOT']),
    name: z.string().min(1).max(100),
    credentials: z.record(z.unknown()),
    settings: z.record(z.unknown()).optional(),
});

/**
 * Create a new integration
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug } = await params;

        const membership = await requireWorkspaceAccess(user.id, slug);

        if (!['OWNER', 'ADMIN'].includes(membership.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const result = CreateIntegrationSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid integration data', details: result.error.format() },
                { status: 400 }
            );
        }

        const { provider, name, credentials, settings } = result.data;

        // Create integration
        const integration = await prisma.integration.create({
            data: {
                workspaceId: membership.workspaceId,
                provider,
                name,
                credentials,
                settings: settings || {},
            },
        });

        return NextResponse.json({
            integration: {
                id: integration.id,
                provider: integration.provider,
                name: integration.name,
                isActive: integration.isActive,
            },
        }, { status: 201 });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Integrations] Error:', error);
        return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 });
    }
}
