'use client';

import { useState } from 'react';
import { GAME_TEMPLATES, getTemplatesByCategory, type GameTemplate, type GameCategory } from '@/lib/schemas/game-templates';
import { Sparkles, Brain, MessageSquare, ChevronRight } from 'lucide-react';

interface TemplateGalleryProps {
    onSelectTemplate: (template: GameTemplate) => void;
}

const CATEGORY_INFO: Record<GameCategory, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
    luck: { label: 'Luck Games', icon: Sparkles, description: 'Spin wheels, scratchcards & more' },
    knowledge: { label: 'Knowledge Games', icon: Brain, description: 'Quizzes & trivia challenges' },
    feedback: { label: 'Feedback', icon: MessageSquare, description: 'Polls, surveys & NPS' },
};

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
    const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');

    const templates = selectedCategory === 'all'
        ? GAME_TEMPLATES
        : getTemplatesByCategory(selectedCategory);

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-3xl font-bold mb-2">Choose a Template</h1>
                    <p className="text-gray-400">Start with a pre-built game template or create from scratch</p>
                </header>

                {/* Category Filters */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${selectedCategory === 'all'
                                ? 'bg-pink-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        All Templates
                    </button>
                    {(Object.keys(CATEGORY_INFO) as GameCategory[]).map((cat) => {
                        const info = CATEGORY_INFO[cat];
                        const Icon = info.icon;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                  ${selectedCategory === cat
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {info.label}
                            </button>
                        );
                    })}
                </div>

                {/* Templates Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Blank Template */}
                    <button
                        onClick={() => onSelectTemplate({
                            id: 'blank',
                            name: 'Start from Scratch',
                            description: 'Build your campaign with a blank canvas',
                            category: 'luck',
                            gameType: 'spin_to_win',
                            defaultConfig: {},
                        })}
                        className="group p-6 rounded-2xl border-2 border-dashed border-gray-700 hover:border-pink-500/50 transition-all text-left"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition">
                            <span className="text-2xl text-gray-500 group-hover:text-pink-400">+</span>
                        </div>
                        <h3 className="text-lg font-semibold mb-1 group-hover:text-pink-400 transition">Blank Canvas</h3>
                        <p className="text-sm text-gray-400">Start fresh with an empty campaign</p>
                    </button>

                    {/* Template Cards */}
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onSelect={() => onSelectTemplate(template)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

interface TemplateCardProps {
    template: GameTemplate;
    onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
    const categoryInfo = CATEGORY_INFO[template.category];
    const CategoryIcon = categoryInfo.icon;

    return (
        <button
            onClick={onSelect}
            className="group p-6 rounded-2xl bg-gray-800/50 border border-gray-700 hover:border-pink-500/50 hover:bg-gray-800 transition-all text-left"
        >
            {/* Preview placeholder */}
            <div className="aspect-video rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 mb-4 flex items-center justify-center overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/30 to-orange-500/30 flex items-center justify-center">
                    <CategoryIcon className="w-8 h-8 text-pink-400" />
                </div>
            </div>

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold mb-1 group-hover:text-pink-400 transition">{template.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{template.description}</p>

                    {template.tags && (
                        <div className="flex gap-2 mt-3">
                            {template.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="px-2 py-0.5 text-xs bg-gray-700 rounded text-gray-300">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-pink-400 transition flex-shrink-0 mt-1" />
            </div>
        </button>
    );
}
