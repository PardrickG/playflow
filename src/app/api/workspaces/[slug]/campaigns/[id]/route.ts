import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireWorkspaceAccess } from '@/lib/workspace-context';
import { prisma } from '@/lib/db';
import { validateCampaign } from '@/lib/campaign-validation';
import type { CampaignConfig } from '@/lib/schemas/campaign';

type RouteParams = { params: Promise<{ slug: string; id: string }> };

// GET /api/workspaces/[slug]/campaigns/[id] - Get single campaign
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await requireAuth();
        const { slug, id } = await params;

        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        await requireWorkspaceAccess(workspace.id, userId, 'campaigns:read');

        const campaign = await prisma.campaign.findFirst({
            where: { id, workspaceId: workspace.id },
            include: {
                activeVersion: true,
                versions: {
                    orderBy: { version: 'desc' },
                    take: 5,
                },
                prizes: true,
                _count: { select: { submissions: true } },
            },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
    }
}

// PATCH /api/workspaces/[slug]/campaigns/[id] - Update campaign
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await requireAuth();
        const { slug, id } = await params;
        const body = await request.json();

        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        await requireWorkspaceAccess(workspace.id, userId, 'campaigns:update');

        const { name, description, status } = body;

        const campaign = await prisma.campaign.update({
            where: { id, workspaceId: workspace.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(status && { status }),
            },
        });

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Error updating campaign:', error);
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }
}

// POST /api/workspaces/[slug]/campaigns/[id]/versions - Create new version
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await requireAuth();
        const { slug, id } = await params;
        const body = await request.json();

        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        await requireWorkspaceAccess(workspace.id, userId, 'campaigns:update');

        // Validate the campaign config
        const validationResult = validateCampaign(body.config);
        if (!validationResult.valid) {
            return NextResponse.json({
                error: 'Invalid campaign configuration',
                errors: validationResult.errors,
                warnings: validationResult.warnings,
            }, { status: 400 });
        }

        // Get latest version number
        const latestVersion = await prisma.campaignVersion.findFirst({
            where: { campaignId: id },
            orderBy: { version: 'desc' },
            select: { version: true },
        });

        const newVersionNumber = (latestVersion?.version ?? 0) + 1;

        // Create new version
        const version = await prisma.campaignVersion.create({
            data: {
                campaignId: id,
                version: newVersionNumber,
                config: body.config as object,
                triggerConfig: body.triggerConfig ?? null,
                gameConfig: body.gameConfig ?? null,
            },
        });

        return NextResponse.json({ version }, { status: 201 });
    } catch (error) {
        console.error('Error creating version:', error);
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
    }
}

// DELETE /api/workspaces/[slug]/campaigns/[id] - Delete campaign
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await requireAuth();
        const { slug, id } = await params;

        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        await requireWorkspaceAccess(workspace.id, userId, 'campaigns:delete');

        await prisma.campaign.delete({
            where: { id, workspaceId: workspace.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }
}
