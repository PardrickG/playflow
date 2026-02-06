import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, syncUserToDatabase } from '@/lib/auth';
import { requireWorkspaceAccess } from '@/lib/workspace-context';
import { prisma } from '@/lib/db';

// GET /api/workspaces/[slug]/campaigns - List campaigns
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const userId = await requireAuth();
        const { slug } = await params;

        // Get workspace by slug
        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            );
        }

        // Verify access
        await requireWorkspaceAccess(workspace.id, userId, 'campaigns:read');

        // Get campaigns
        const campaigns = await prisma.campaign.findMany({
            where: { workspaceId: workspace.id },
            include: {
                activeVersion: {
                    select: { version: true, createdAt: true },
                },
                _count: {
                    select: { submissions: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({
            campaigns: campaigns.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                status: c.status,
                activeVersion: c.activeVersion?.version ?? null,
                submissionCount: c._count.submissions,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: 'Failed to fetch campaigns' },
            { status: 500 }
        );
    }
}

// POST /api/workspaces/[slug]/campaigns - Create campaign
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const userId = await requireAuth();
        const { slug } = await params;
        const body = await request.json();

        const { name, description } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: 'Campaign name is required' },
                { status: 400 }
            );
        }

        // Get workspace by slug
        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            );
        }

        // Verify access
        await requireWorkspaceAccess(workspace.id, userId, 'campaigns:create');

        // Create campaign
        const campaign = await prisma.campaign.create({
            data: {
                workspaceId: workspace.id,
                name,
                description: description ?? null,
                status: 'DRAFT',
            },
        });

        return NextResponse.json({
            campaign: {
                id: campaign.id,
                name: campaign.name,
                description: campaign.description,
                status: campaign.status,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating campaign:', error);
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: 'Failed to create campaign' },
            { status: 500 }
        );
    }
}
