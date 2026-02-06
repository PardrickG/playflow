'use client';

import { useDraggable } from '@dnd-kit/core';
import {
    Zap,
    Square,
    Gamepad2,
    FileText,
    Trophy,
    MousePointer,
    Plug
} from 'lucide-react';
import type { BlockType } from '@/lib/schemas/campaign';

interface BlockItem {
    type: BlockType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    category: 'triggers' | 'content' | 'actions';
}

const BLOCK_ITEMS: BlockItem[] = [
    // Triggers
    { type: 'trigger', label: 'Trigger', icon: Zap, description: 'When to show campaign', category: 'triggers' },

    // Content
    { type: 'container', label: 'Container', icon: Square, description: 'Popup or modal wrapper', category: 'content' },
    { type: 'game', label: 'Game', icon: Gamepad2, description: 'Spin wheel, scratch card, quiz', category: 'content' },
    { type: 'form', label: 'Form', icon: FileText, description: 'Collect lead information', category: 'content' },
    { type: 'outcome', label: 'Outcome', icon: Trophy, description: 'Winner/loser screen', category: 'content' },

    // Actions
    { type: 'cta_action', label: 'CTA Button', icon: MousePointer, description: 'Call-to-action button', category: 'actions' },
    { type: 'integration_action', label: 'Integration', icon: Plug, description: 'Sync with Klaviyo, HubSpot', category: 'actions' },
];

function DraggableBlock({ item }: { item: BlockItem }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `sidebar-${item.type}`,
    });

    const Icon = item.icon;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
        flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing
        bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-pink-500/50
        transition-all group
        ${isDragging ? 'opacity-50' : ''}
      `}
        >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center group-hover:from-pink-500/30 group-hover:to-orange-500/30 transition">
                <Icon className="w-5 h-5 text-pink-400" />
            </div>
            <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
            </div>
        </div>
    );
}

export function BlockSidebar() {
    const triggers = BLOCK_ITEMS.filter(b => b.category === 'triggers');
    const content = BLOCK_ITEMS.filter(b => b.category === 'content');
    const actions = BLOCK_ITEMS.filter(b => b.category === 'actions');

    return (
        <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">Blocks</h2>
                <p className="text-sm text-gray-400">Drag blocks to canvas</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Triggers */}
                <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Triggers
                    </h3>
                    <div className="space-y-2">
                        {triggers.map(item => (
                            <DraggableBlock key={item.type} item={item} />
                        ))}
                    </div>
                </section>

                {/* Content */}
                <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Content
                    </h3>
                    <div className="space-y-2">
                        {content.map(item => (
                            <DraggableBlock key={item.type} item={item} />
                        ))}
                    </div>
                </section>

                {/* Actions */}
                <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Actions
                    </h3>
                    <div className="space-y-2">
                        {actions.map(item => (
                            <DraggableBlock key={item.type} item={item} />
                        ))}
                    </div>
                </section>
            </div>
        </aside>
    );
}
