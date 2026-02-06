'use client';

import { Zap, Square, Gamepad2, FileText, Trophy, MousePointer, Plug } from 'lucide-react';
import type { BlockType } from '@/lib/schemas/campaign';

const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
    trigger: Zap,
    container: Square,
    game: Gamepad2,
    form: FileText,
    outcome: Trophy,
    cta_action: MousePointer,
    integration_action: Plug,
};

const BLOCK_LABELS: Record<BlockType, string> = {
    trigger: 'Trigger',
    container: 'Container',
    game: 'Game',
    form: 'Form',
    outcome: 'Outcome',
    cta_action: 'CTA Button',
    integration_action: 'Integration',
};

interface BlockPreviewProps {
    type: BlockType;
}

export function BlockPreview({ type }: BlockPreviewProps) {
    const Icon = BLOCK_ICONS[type] ?? Square;
    const label = BLOCK_LABELS[type] ?? 'Block';

    return (
        <div className="w-64 bg-gray-800 rounded-xl border-2 border-pink-500 shadow-2xl shadow-pink-500/20 p-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/30 to-orange-500/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-pink-400" />
                </div>
                <span className="text-white font-medium">{label}</span>
            </div>
        </div>
    );
}
