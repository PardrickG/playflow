'use client';

import { useState } from 'react';
import { Gift, Sparkles, HelpCircle, Target, Copy, Check } from 'lucide-react';

interface GameTemplate {
    id: string;
    name: string;
    description: string;
    type: 'SPIN_TO_WIN' | 'SCRATCH_CARD' | 'QUIZ' | 'POLL';
    icon: React.ReactNode;
    preview: string;
    defaultConfig: Record<string, unknown>;
}

const templates: GameTemplate[] = [
    {
        id: 'spin-to-win',
        name: 'Spin to Win',
        description: 'Classic wheel of fortune with customizable segments and prizes',
        type: 'SPIN_TO_WIN',
        icon: <Target className="w-6 h-6" />,
        preview: '🎡',
        defaultConfig: {
            segments: [
                { label: '10% OFF', color: '#ec4899', probability: 0.3 },
                { label: '20% OFF', color: '#8b5cf6', probability: 0.2 },
                { label: 'FREE SHIPPING', color: '#06b6d4', probability: 0.2 },
                { label: 'TRY AGAIN', color: '#64748b', probability: 0.3 },
            ],
        },
    },
    {
        id: 'scratch-card',
        name: 'Scratch Card',
        description: 'Interactive scratch-to-reveal experience with hidden rewards',
        type: 'SCRATCH_CARD',
        icon: <Sparkles className="w-6 h-6" />,
        preview: '🎟️',
        defaultConfig: {
            coverColor: '#2d3748',
            revealThreshold: 50,
        },
    },
    {
        id: 'trivia-quiz',
        name: 'Trivia Quiz',
        description: 'Engaging multi-question quiz with instant feedback and scoring',
        type: 'QUIZ',
        icon: <HelpCircle className="w-6 h-6" />,
        preview: '❓',
        defaultConfig: {
            showFeedback: true,
            questions: [
                {
                    id: '1',
                    question: 'What is your favorite product category?',
                    answers: [
                        { id: 'a', text: 'Electronics', isCorrect: true },
                        { id: 'b', text: 'Fashion', isCorrect: false },
                        { id: 'c', text: 'Home & Garden', isCorrect: false },
                        { id: 'd', text: 'Sports', isCorrect: false },
                    ],
                },
            ],
        },
    },
    {
        id: 'product-poll',
        name: 'Product Poll',
        description: 'Simple poll format to gather preferences and insights',
        type: 'POLL',
        icon: <Gift className="w-6 h-6" />,
        preview: '📊',
        defaultConfig: {
            question: 'Which new feature would you like to see?',
            options: ['Option A', 'Option B', 'Option C'],
        },
    },
];

interface TemplateLibraryProps {
    onSelect?: (template: GameTemplate) => void;
}

export function TemplateLibrary({ onSelect }: TemplateLibraryProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSelect = (template: GameTemplate) => {
        setSelectedId(template.id);
        onSelect?.(template);
    };

    const copyConfig = (template: GameTemplate) => {
        navigator.clipboard.writeText(JSON.stringify(template.defaultConfig, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Game Templates</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => handleSelect(template)}
                        className={`relative p-6 rounded-2xl cursor-pointer transition-all
              ${selectedId === template.id
                                ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-pink-500'
                                : 'bg-white/5 border-2 border-transparent hover:border-slate-600'
                            }
            `}
                    >
                        {/* Preview */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl">
                                {template.preview}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                                <span className="text-xs text-pink-400 uppercase tracking-wide">
                                    {template.type.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        <p className="text-slate-400 text-sm mb-4">{template.description}</p>

                        {/* Copy config button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                copyConfig(template);
                            }}
                            className="flex items-center gap-2 text-xs text-slate-400 hover:text-pink-400 transition-colors"
                        >
                            {copied && selectedId === template.id ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy default config
                                </>
                            )}
                        </button>

                        {/* Selected indicator */}
                        {selectedId === template.id && (
                            <div className="absolute top-4 right-4">
                                <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
