import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CampaignBuilder } from '@/components/builder';

interface PageProps {
    params: Promise<{ slug: string; id: string }>;
}

export default async function CampaignBuilderPage({ params }: PageProps) {
    const { userId } = await auth();
    const { slug, id } = await params;

    if (!userId) {
        redirect('/sign-in');
    }

    // Get workspace and verify access
    const workspace = await prisma.workspace.findUnique({
        where: { slug },
        include: {
            members: {
                where: { userId, acceptedAt: { not: null } },
            },
        },
    });

    if (!workspace || workspace.members.length === 0) {
        redirect('/dashboard');
    }

    // Get campaign
    const campaign = await prisma.campaign.findFirst({
        where: {
            id,
            workspaceId: workspace.id,
        },
        include: {
            activeVersion: true,
        },
    });

    if (!campaign) {
        redirect(`/workspaces/${slug}`);
    }

    // Extract blocks from active version config
    const initialBlocks = campaign.activeVersion?.config
        ? extractBlocksFromConfig(campaign.activeVersion.config)
        : [];

    return (
        <CampaignBuilder
            campaignId={campaign.id}
            workspaceSlug={slug}
            initialBlocks={initialBlocks}
        />
    );
}

function extractBlocksFromConfig(config: unknown): Array<{
    id: string;
    type: 'trigger' | 'container' | 'game' | 'form' | 'outcome' | 'cta_action' | 'integration_action';
    config: Record<string, unknown>;
}> {
    try {
        const parsed = config as { flow?: { blocks?: Record<string, unknown> } };
        if (!parsed?.flow?.blocks) return [];

        return Object.entries(parsed.flow.blocks).map(([id, block]) => ({
            id,
            type: (block as { type: string }).type as any,
            config: block as Record<string, unknown>,
        }));
    } catch {
        return [];
    }
}
