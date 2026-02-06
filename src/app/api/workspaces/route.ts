import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserWorkspaces, createWorkspaceForUser, generateSlug, syncUserToDatabase } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/workspaces - List user's workspaces
export async function GET() {
    try {
        const userId = await requireAuth();

        // Sync user to database on first request
        await syncUserToDatabase(userId);

        const memberships = await getUserWorkspaces(userId);

        return NextResponse.json({
            workspaces: memberships.map((m) => ({
                id: m.workspace.id,
                name: m.workspace.name,
                slug: m.workspace.slug,
                role: m.role,
                logoUrl: m.workspace.logoUrl,
            })),
        });
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        return NextResponse.json(
            { error: 'Failed to fetch workspaces' },
            { status: 500 }
        );
    }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: NextRequest) {
    try {
        const userId = await requireAuth();
        const body = await request.json();

        const { name } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: 'Workspace name is required' },
                { status: 400 }
            );
        }

        // Generate unique slug
        const slug = generateSlug(name);

        // Check if slug already exists
        const existing = await prisma.workspace.findUnique({
            where: { slug },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Workspace slug already exists' },
                { status: 409 }
            );
        }

        // Create workspace with user as owner
        const workspace = await createWorkspaceForUser(userId, name, slug);

        return NextResponse.json({
            workspace: {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating workspace:', error);
        return NextResponse.json(
            { error: 'Failed to create workspace' },
            { status: 500 }
        );
    }
}
