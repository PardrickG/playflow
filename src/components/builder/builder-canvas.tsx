'use client';

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Zap, Square, Gamepad2, FileText, Trophy, MousePointer, Plug } from 'lucide-react';
import type { BuilderBlock } from './campaign-builder';
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

interface SortableBlockProps {
    block: BuilderBlock;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

function SortableBlock({ block, isSelected, onSelect, onDelete }: SortableBlockProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = BLOCK_ICONS[block.type];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
        relative bg-gray-800 rounded-xl border-2 transition-all
        ${isSelected ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-700 hover:border-gray-600'}
        ${isDragging ? 'opacity-50 z-50' : ''}
      `}
            onClick={onSelect}
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300"
                >
                    <GripVertical className="w-5 h-5" />
                </button>

                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-pink-400" />
                </div>

                <span className="text-white font-medium flex-1">{BLOCK_LABELS[block.type]}</span>

                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-gray-500 hover:text-red-400 transition"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Preview Content */}
            <div className="p-4 text-sm text-gray-400">
                {getBlockPreviewText(block)}
            </div>
        </div>
    );
}

function getBlockPreviewText(block: BuilderBlock): string {
    switch (block.type) {
        case 'trigger':
            return `Trigger: ${block.config.triggerType || 'Not configured'}`;
        case 'container':
            return `Style: ${block.config.style || 'popup'}`;
        case 'game':
            return `Game: ${block.config.gameType || 'Not selected'}`;
        case 'form':
            const fields = block.config.fields as unknown[] || [];
            return `${fields.length} field(s)`;
        case 'outcome':
            return `${block.config.variant || 'winner'}: ${block.config.title || 'Untitled'}`;
        case 'cta_action':
            return block.config.buttonText as string || 'Click Here';
        case 'integration_action':
            return `Action: ${block.config.action || 'sync_contact'}`;
        default:
            return 'Configure this block';
    }
}

interface BuilderCanvasProps {
    blocks: BuilderBlock[];
    selectedBlockId: string | null;
    onBlockSelect: (id: string) => void;
    onBlockDelete: (id: string) => void;
}

export function BuilderCanvas({ blocks, selectedBlockId, onBlockSelect, onBlockDelete }: BuilderCanvasProps) {
    const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

    return (
        <div
            ref={setNodeRef}
            className={`
        min-h-[600px] max-w-2xl mx-auto rounded-2xl border-2 border-dashed p-6 transition-colors
        ${isOver ? 'border-pink-500 bg-pink-500/5' : 'border-gray-700'}
        ${blocks.length === 0 ? 'flex items-center justify-center' : ''}
      `}
        >
            {blocks.length === 0 ? (
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <Square className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400 mb-2">Drag blocks here to start building</p>
                    <p className="text-sm text-gray-500">Start with a Trigger block to define when your campaign appears</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {blocks.map((block) => (
                        <SortableBlock
                            key={block.id}
                            block={block}
                            isSelected={selectedBlockId === block.id}
                            onSelect={() => onBlockSelect(block.id)}
                            onDelete={() => onBlockDelete(block.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
