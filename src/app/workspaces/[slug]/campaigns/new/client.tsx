'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateGallery } from '@/components/builder/template-gallery';
import type { GameTemplate } from '@/lib/schemas/game-templates';

interface NewCampaignClientProps {
    workspaceSlug: string;
}

export function NewCampaignClient({ workspaceSlug }: NewCampaignClientProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelectTemplate = async (template: GameTemplate) => {
        setIsCreating(true);
        setError(null);

        try {
            // Create campaign via API
            const response = await fetch(`/api/workspaces/${workspaceSlug}/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: template.id === 'blank' ? 'Untitled Campaign' : `${template.name} Campaign`,
                    description: template.description,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create campaign');
            }

            const data = await response.json();

            // Redirect to builder
            router.push(`/workspaces/${workspaceSlug}/campaigns/${data.campaign.id}/builder`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsCreating(false);
        }
    };

    if (isCreating) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Creating your campaign...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="fixed top-4 right-4 bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg">
                    {error}
                </div>
            )}
            <TemplateGallery onSelectTemplate={handleSelectTemplate} />
        </>
    );
}
