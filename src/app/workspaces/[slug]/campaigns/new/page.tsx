import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { NewCampaignClient } from './client';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function NewCampaignPage({ params }: PageProps) {
    const { userId } = await auth();
    const { slug } = await params;

    if (!userId) {
        redirect('/sign-in');
    }

    // Verify workspace access
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

    return <NewCampaignClient workspaceSlug={slug} />;
}
