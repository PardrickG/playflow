'use client';

import { useState, useCallback } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { BlockSidebar } from './block-sidebar';
import { BuilderCanvas } from './builder-canvas';
import { BlockPreview } from './block-preview';
import { PropertiesPanel } from './properties-panel';
import type { Block, BlockType } from '@/lib/schemas/campaign';

export interface BuilderBlock {
    id: string;
    type: BlockType;
    config: Record<string, unknown>;
}

interface CampaignBuilderProps {
    campaignId: string;
    workspaceSlug: string;
    initialBlocks?: BuilderBlock[];
}

export function CampaignBuilder({
    campaignId,
    workspaceSlug,
    initialBlocks = []
}: CampaignBuilderProps) {
    const [blocks, setBlocks] = useState<BuilderBlock[]>(initialBlocks);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        // Check if dragging from sidebar (new block)
        if (active.id.toString().startsWith('sidebar-')) {
            const blockType = active.id.toString().replace('sidebar-', '') as BlockType;
            const newBlock: BuilderBlock = {
                id: `block-${Date.now()}`,
                type: blockType,
                config: getDefaultConfig(blockType),
            };

            // Find insertion index
            const overIndex = blocks.findIndex(b => b.id === over.id);
            if (overIndex === -1) {
                setBlocks([...blocks, newBlock]);
            } else {
                const newBlocks = [...blocks];
                newBlocks.splice(overIndex, 0, newBlock);
                setBlocks(newBlocks);
            }
            setSelectedBlockId(newBlock.id);
        } else {
            // Reordering existing blocks
            const activeIndex = blocks.findIndex(b => b.id === active.id);
            const overIndex = blocks.findIndex(b => b.id === over.id);

            if (activeIndex !== overIndex) {
                const newBlocks = [...blocks];
                const [removed] = newBlocks.splice(activeIndex, 1);
                newBlocks.splice(overIndex, 0, removed);
                setBlocks(newBlocks);
            }
        }
    }, [blocks]);

    const handleBlockSelect = useCallback((blockId: string) => {
        setSelectedBlockId(blockId);
    }, []);

    const handleBlockDelete = useCallback((blockId: string) => {
        setBlocks(blocks.filter(b => b.id !== blockId));
        if (selectedBlockId === blockId) {
            setSelectedBlockId(null);
        }
    }, [blocks, selectedBlockId]);

    const handleBlockUpdate = useCallback((blockId: string, config: Record<string, unknown>) => {
        setBlocks(blocks.map(b =>
            b.id === blockId ? { ...b, config: { ...b.config, ...config } } : b
        ));
    }, [blocks]);

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    return (
        <div className="flex h-screen bg-gray-950">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {/* Block Sidebar */}
                <BlockSidebar />

                {/* Main Canvas */}
                <div className="flex-1 flex flex-col">
                    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
                        <h1 className="text-white font-semibold">Campaign Builder</h1>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
                                Preview
                            </button>
                            <button className="px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition">
                                Publish
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-auto p-8">
                        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            <BuilderCanvas
                                blocks={blocks}
                                selectedBlockId={selectedBlockId}
                                onBlockSelect={handleBlockSelect}
                                onBlockDelete={handleBlockDelete}
                            />
                        </SortableContext>
                    </div>
                </div>

                {/* Properties Panel */}
                <PropertiesPanel
                    block={selectedBlock ?? null}
                    onUpdate={handleBlockUpdate}
                />

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeId ? <BlockPreview type={activeId.toString().replace('sidebar-', '') as BlockType} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

function getDefaultConfig(type: BlockType): Record<string, unknown> {
    switch (type) {
        case 'trigger':
            return { triggerType: 'time_delay', delayMs: 3000 };
        case 'container':
            return { style: 'popup', closeButton: true, overlay: true };
        case 'game':
            return { gameType: 'spin_to_win', segments: [] };
        case 'form':
            return { fields: [], submitButtonText: 'Submit' };
        case 'outcome':
            return { variant: 'winner', title: '', message: '' };
        case 'cta_action':
            return { buttonText: 'Click Here', action: 'url' };
        case 'integration_action':
            return { action: 'sync_contact' };
        default:
            return {};
    }
}
