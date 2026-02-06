'use client';

import { X } from 'lucide-react';
import type { BuilderBlock } from './campaign-builder';

interface PropertiesPanelProps {
    block: BuilderBlock | null;
    onUpdate: (blockId: string, config: Record<string, unknown>) => void;
}

export function PropertiesPanel({ block, onUpdate }: PropertiesPanelProps) {
    if (!block) {
        return (
            <aside className="w-80 bg-gray-900 border-l border-gray-800 flex items-center justify-center">
                <div className="text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                        <X className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-400">Select a block to edit</p>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white capitalize">{block.type.replace('_', ' ')} Settings</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {block.type === 'trigger' && <TriggerSettings block={block} onUpdate={onUpdate} />}
                {block.type === 'container' && <ContainerSettings block={block} onUpdate={onUpdate} />}
                {block.type === 'game' && <GameSettings block={block} onUpdate={onUpdate} />}
                {block.type === 'form' && <FormSettings block={block} onUpdate={onUpdate} />}
                {block.type === 'outcome' && <OutcomeSettings block={block} onUpdate={onUpdate} />}
                {block.type === 'cta_action' && <CTASettings block={block} onUpdate={onUpdate} />}
                {block.type === 'integration_action' && <IntegrationSettings block={block} onUpdate={onUpdate} />}
            </div>
        </aside>
    );
}

// Shared input styles
const inputStyles = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500";
const labelStyles = "block text-sm font-medium text-gray-300 mb-1";
const selectStyles = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500";

interface SettingsProps {
    block: BuilderBlock;
    onUpdate: (blockId: string, config: Record<string, unknown>) => void;
}

function TriggerSettings({ block, onUpdate }: SettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelStyles}>Trigger Type</label>
                <select
                    className={selectStyles}
                    value={block.config.triggerType as string || 'time_delay'}
                    onChange={(e) => onUpdate(block.id, { triggerType: e.target.value })}
                >
                    <option value="time_delay">Time Delay</option>
                    <option value="scroll_percentage">Scroll Percentage</option>
                    <option value="exit_intent">Exit Intent</option>
                    <option value="click">Click</option>
                    <option value="page_view">Page View</option>
                </select>
            </div>

            {block.config.triggerType === 'time_delay' && (
                <div>
                    <label className={labelStyles}>Delay (seconds)</label>
                    <input
                        type="number"
                        className={inputStyles}
                        value={(block.config.delayMs as number || 3000) / 1000}
                        onChange={(e) => onUpdate(block.id, { delayMs: Number(e.target.value) * 1000 })}
                        min={0}
                    />
                </div>
            )}

            {block.config.triggerType === 'scroll_percentage' && (
                <div>
                    <label className={labelStyles}>Scroll Percentage (%)</label>
                    <input
                        type="number"
                        className={inputStyles}
                        value={block.config.scrollPercentage as number || 50}
                        onChange={(e) => onUpdate(block.id, { scrollPercentage: Number(e.target.value) })}
                        min={0}
                        max={100}
                    />
                </div>
            )}
        </div>
    );
}

function ContainerSettings({ block, onUpdate }: SettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelStyles}>Container Style</label>
                <select
                    className={selectStyles}
                    value={block.config.style as string || 'popup'}
                    onChange={(e) => onUpdate(block.id, { style: e.target.value })}
                >
                    <option value="popup">Popup</option>
                    <option value="slide_in">Slide In</option>
                    <option value="full_screen">Full Screen</option>
                    <option value="embedded">Embedded</option>
                </select>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="closeButton"
                    checked={block.config.closeButton as boolean ?? true}
                    onChange={(e) => onUpdate(block.id, { closeButton: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-pink-500 focus:ring-pink-500"
                />
                <label htmlFor="closeButton" className="text-sm text-gray-300">Show close button</label>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="overlay"
                    checked={block.config.overlay as boolean ?? true}
                    onChange={(e) => onUpdate(block.id, { overlay: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-pink-500 focus:ring-pink-500"
                />
                <label htmlFor="overlay" className="text-sm text-gray-300">Show overlay</label>
            </div>
        </div>
    );
}

function GameSettings({ block, onUpdate }: SettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelStyles}>Game Type</label>
                <select
                    className={selectStyles}
                    value={block.config.gameType as string || 'spin_to_win'}
                    onChange={(e) => onUpdate(block.id, { gameType: e.target.value })}
                >
                    <option value="spin_to_win">Spin to Win</option>
                    <option value="scratchcard">Scratchcard</option>
                    <option value="quiz">Quiz</option>
                    <option value="poll_survey">Poll / Survey</option>
                </select>
            </div>

            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <p className="text-sm text-gray-400">
                    Game-specific settings will appear here based on the selected type.
                </p>
            </div>
        </div>
    );
}

function FormSettings({ block, onUpdate }: SettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelStyles}>Submit Button Text</label>
                <input
                    type="text"
                    className={inputStyles}
                    value={block.config.submitButtonText as string || 'Submit'}
                    onChange={(e) => onUpdate(block.id, { submitButtonText: e.target.value })}
                />
            </div>

            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Form Fields</p>
                <button className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
                    + Add Field
                </button>
            </div>
        </div>
    );
}

function OutcomeSettings({ block, onUpdate }: SettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelStyles}>Variant</label>
                <select
                    className={selectStyles}
                    value={block.config.variant as string || 'winner'}
                    onChange={(e) => onUpdate(block.id, { variant: e.target.value })}
                >
                    <option value="winner">Winner</option>
                    <option value="loser">Loser</option>
                    <option value="completion">Completion</option>
                </select>
            </div>

            <div>
                <label className={labelStyles}>Title</label>
                <input
                    type="text"
                    className={inputStyles}
                    value={block.config.title as string || ''}
                    onChange={(e) => onUpdate(block.id, { title: e.target.value })}
                    placeholder="Congratulations!"
                />
            </div>

            <div>
                <label className={labelStyles}>Message</label>
                <textarea
                    className={`${inputStyles} min-h-[80px]`}
                    value={block.config.message as string || ''}
                    onChange={(e) => onUpdate(block.id, { message: e.target.value })}
                    placeholder="You've won a special prize!"
                />
            </div>
        </div>
    );
}

function CTASettings({ block, onUpdate }: SettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelStyles}>Button Text</label>
                <input
                    type="text"
                    className={inputStyles}
                    value={block.config.buttonText as string || 'Click Here'}
                    onChange={(e) => onUpdate(block.id, { buttonText: e.target.value })}
                />
            </div>

            <div>
                <label className={labelStyles}>Action</label>
                <select
                    className={selectStyles}
                    value={block.config.action as string || 'url'}
                    onChange={(e) => onUpdate(block.id, { action: e.target.value })}
                >
                    <option value="url">Open URL</option>
                    <option value="close">Close Campaign</option>
                    <option value="next_block">Go to Next Block</option>
                </select>
            </div>

            {block.config.action === 'url' && (
                <div>
                    <label className={labelStyles}>URL</label>
                    <input
                        type="url"
                        className={inputStyles}
                        value={block.config.url as string || ''}
                        onChange={(e) => onUpdate(block.id, { url: e.target.value })}
                        placeholder="https://example.com"
                    />
                </div>
            )}
        </div>
    );
}

function IntegrationSettings({ block, onUpdate }: SettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelStyles}>Action</label>
                <select
                    className={selectStyles}
                    value={block.config.action as string || 'sync_contact'}
                    onChange={(e) => onUpdate(block.id, { action: e.target.value })}
                >
                    <option value="sync_contact">Sync Contact</option>
                    <option value="add_tag">Add Tag</option>
                    <option value="send_event">Send Event</option>
                </select>
            </div>

            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <p className="text-sm text-gray-400">
                    Connect an integration to configure this action.
                </p>
            </div>
        </div>
    );
}
