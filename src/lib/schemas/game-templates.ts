/**
 * Game Template Schemas
 * 
 * Pre-built templates for common game types that can be
 * used as starting points for campaign creation.
 */

import { z } from 'zod';
import type { GameBlock, SpinToWinConfigSchema, ScratchcardConfigSchema, QuizConfigSchema, PollConfigSchema } from './campaign';

// ============================================================================
// TEMPLATE CATEGORY
// ============================================================================

export const GameCategorySchema = z.enum([
    'luck',      // Spin-to-win, Scratchcard
    'knowledge', // Quiz
    'feedback',  // Poll/Survey
]);

export type GameCategory = z.infer<typeof GameCategorySchema>;

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================

export const GameTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: GameCategorySchema,
    gameType: z.enum(['spin_to_win', 'scratchcard', 'quiz', 'poll_survey']),
    thumbnail: z.string().url().optional(),
    defaultConfig: z.record(z.unknown()),
    tags: z.array(z.string()).optional(),
});

export type GameTemplate = z.infer<typeof GameTemplateSchema>;

// ============================================================================
// PRE-BUILT TEMPLATES
// ============================================================================

export const GAME_TEMPLATES: GameTemplate[] = [
    // Luck Category
    {
        id: 'spin-basic',
        name: 'Basic Spin to Win',
        description: 'A classic wheel spin with customizable prizes and segments.',
        category: 'luck',
        gameType: 'spin_to_win',
        tags: ['popular', 'engagement', 'prizes'],
        defaultConfig: {
            segments: [
                { label: '10% OFF', color: '#FF6B6B', probability: 0.3 },
                { label: '20% OFF', color: '#4ECDC4', probability: 0.2 },
                { label: 'Free Shipping', color: '#45B7D1', probability: 0.25 },
                { label: 'Try Again', color: '#96CEB4', probability: 0.25 },
            ],
            spinDurationMs: 5000,
        },
    },
    {
        id: 'spin-premium',
        name: 'Premium Spin to Win',
        description: 'A premium wheel with more segments and better odds.',
        category: 'luck',
        gameType: 'spin_to_win',
        tags: ['premium', 'high-value'],
        defaultConfig: {
            segments: [
                { label: '5% OFF', color: '#FFE66D', probability: 0.25 },
                { label: '10% OFF', color: '#FF6B6B', probability: 0.2 },
                { label: '15% OFF', color: '#4ECDC4', probability: 0.15 },
                { label: '20% OFF', color: '#45B7D1', probability: 0.1 },
                { label: 'Free Gift', color: '#96CEB4', probability: 0.1 },
                { label: 'Free Shipping', color: '#9B59B6', probability: 0.1 },
                { label: 'Try Again', color: '#BDC3C7', probability: 0.1 },
            ],
            spinDurationMs: 6000,
        },
    },
    {
        id: 'scratch-basic',
        name: 'Basic Scratchcard',
        description: 'Simple scratch-to-reveal game with hidden prizes.',
        category: 'luck',
        gameType: 'scratchcard',
        tags: ['simple', 'mystery'],
        defaultConfig: {
            coverColor: '#2C3E50',
            revealThreshold: 0.5,
        },
    },

    // Knowledge Category
    {
        id: 'quiz-trivia',
        name: 'Trivia Quiz',
        description: 'Test customer knowledge with fun trivia questions.',
        category: 'knowledge',
        gameType: 'quiz',
        tags: ['education', 'brand-awareness'],
        defaultConfig: {
            questions: [
                {
                    id: 'q1',
                    question: 'What is your favorite product category?',
                    options: [
                        { id: 'o1', text: 'Electronics' },
                        { id: 'o2', text: 'Fashion' },
                        { id: 'o3', text: 'Home & Garden' },
                        { id: 'o4', text: 'Other' },
                    ],
                },
            ],
            showCorrectAnswers: true,
        },
    },
    {
        id: 'quiz-product',
        name: 'Product Knowledge Quiz',
        description: 'Quiz about your products with prizes for correct answers.',
        category: 'knowledge',
        gameType: 'quiz',
        tags: ['product', 'education', 'prizes'],
        defaultConfig: {
            questions: [],
            passingScore: 70,
            showCorrectAnswers: true,
        },
    },

    // Feedback Category
    {
        id: 'poll-simple',
        name: 'Quick Poll',
        description: 'Single question poll for quick customer feedback.',
        category: 'feedback',
        gameType: 'poll_survey',
        tags: ['quick', 'feedback'],
        defaultConfig: {
            questions: [
                {
                    id: 'q1',
                    question: 'How did you hear about us?',
                    type: 'single_choice',
                    options: [
                        { id: 'o1', text: 'Social Media' },
                        { id: 'o2', text: 'Search Engine' },
                        { id: 'o3', text: 'Friend Referral' },
                        { id: 'o4', text: 'Other' },
                    ],
                },
            ],
            showResults: true,
        },
    },
    {
        id: 'survey-nps',
        name: 'NPS Survey',
        description: 'Net Promoter Score survey to measure customer loyalty.',
        category: 'feedback',
        gameType: 'poll_survey',
        tags: ['nps', 'loyalty', 'metrics'],
        defaultConfig: {
            questions: [
                {
                    id: 'q1',
                    question: 'How likely are you to recommend us to a friend?',
                    type: 'rating',
                    maxRating: 10,
                    required: true,
                },
                {
                    id: 'q2',
                    question: 'What could we do to improve?',
                    type: 'text',
                    required: false,
                },
            ],
            showResults: false,
        },
    },
    {
        id: 'survey-feedback',
        name: 'Customer Feedback Survey',
        description: 'Comprehensive feedback form with multiple question types.',
        category: 'feedback',
        gameType: 'poll_survey',
        tags: ['comprehensive', 'feedback', 'insights'],
        defaultConfig: {
            questions: [
                {
                    id: 'q1',
                    question: 'How satisfied are you with your experience?',
                    type: 'rating',
                    maxRating: 5,
                    required: true,
                },
                {
                    id: 'q2',
                    question: 'What aspects did you like most?',
                    type: 'multi_choice',
                    options: [
                        { id: 'o1', text: 'Product Quality' },
                        { id: 'o2', text: 'Customer Service' },
                        { id: 'o3', text: 'Pricing' },
                        { id: 'o4', text: 'Delivery Speed' },
                    ],
                },
                {
                    id: 'q3',
                    question: 'Any additional comments?',
                    type: 'text',
                    required: false,
                },
            ],
            showResults: false,
        },
    },
];

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

export function getTemplatesByCategory(category: GameCategory): GameTemplate[] {
    return GAME_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): GameTemplate | undefined {
    return GAME_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByGameType(gameType: string): GameTemplate[] {
    return GAME_TEMPLATES.filter(t => t.gameType === gameType);
}
