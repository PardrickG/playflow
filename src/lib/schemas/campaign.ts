/**
 * Campaign Configuration Schemas
 * 
 * Defines Zod schemas for the Flow and Block architecture
 * as specified in the PRD for campaign configuration.
 */

import { z } from 'zod';

// ============================================================================
// BASE TYPES
// ============================================================================

export const BlockTypeSchema = z.enum([
    'trigger',
    'container',
    'game',
    'form',
    'outcome',
    'cta_action',
    'integration_action',
]);

export type BlockType = z.infer<typeof BlockTypeSchema>;

// ============================================================================
// TRIGGER BLOCKS
// ============================================================================

export const TriggerTypeSchema = z.enum([
    'time_delay',
    'scroll_percentage',
    'exit_intent',
    'click',
    'page_view',
]);

export const TriggerBlockSchema = z.object({
    id: z.string(),
    type: z.literal('trigger'),
    triggerType: TriggerTypeSchema,
    config: z.object({
        // Time delay trigger
        delayMs: z.number().min(0).optional(),
        // Scroll percentage trigger
        scrollPercentage: z.number().min(0).max(100).optional(),
        // Click trigger
        cssSelector: z.string().optional(),
        // Page view trigger
        urlPattern: z.string().optional(),
    }),
    // Frequency capping
    frequencyCap: z.object({
        maxShows: z.number().min(1).default(1),
        periodDays: z.number().min(1).default(30),
    }).optional(),
});

export type TriggerBlock = z.infer<typeof TriggerBlockSchema>;

// ============================================================================
// CONTAINER BLOCKS
// ============================================================================

export const ContainerStyleSchema = z.enum([
    'popup',
    'slide_in',
    'full_screen',
    'embedded',
]);

export const ContainerBlockSchema = z.object({
    id: z.string(),
    type: z.literal('container'),
    style: ContainerStyleSchema,
    config: z.object({
        width: z.string().optional(), // e.g., '400px', '100%'
        height: z.string().optional(),
        position: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
        closeButton: z.boolean().default(true),
        overlay: z.boolean().default(true),
        overlayOpacity: z.number().min(0).max(1).default(0.5),
    }),
    // Branding
    branding: z.object({
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
        fontFamily: z.string().optional(),
        logoUrl: z.string().url().optional(),
        borderRadius: z.string().optional(),
    }).optional(),
    children: z.array(z.string()), // Block IDs
});

export type ContainerBlock = z.infer<typeof ContainerBlockSchema>;

// ============================================================================
// GAME BLOCKS
// ============================================================================

export const GameTypeSchema = z.enum([
    'spin_to_win',
    'scratchcard',
    'quiz',
    'poll_survey',
]);

// Spin to Win configuration
export const SpinToWinConfigSchema = z.object({
    segments: z.array(z.object({
        label: z.string(),
        color: z.string(),
        prizeId: z.string().optional(),
        probability: z.number().min(0).max(1),
    })).min(2).max(12),
    spinDurationMs: z.number().min(1000).default(5000),
    wheelColor: z.string().optional(),
    pointerColor: z.string().optional(),
});

// Scratchcard configuration
export const ScratchcardConfigSchema = z.object({
    coverImage: z.string().url().optional(),
    coverColor: z.string().optional(),
    revealThreshold: z.number().min(0.1).max(1).default(0.5),
    prizeId: z.string().optional(),
});

// Quiz configuration
export const QuizQuestionSchema = z.object({
    id: z.string(),
    question: z.string(),
    options: z.array(z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean().optional(),
    })).min(2).max(6),
    imageUrl: z.string().url().optional(),
});

export const QuizConfigSchema = z.object({
    questions: z.array(QuizQuestionSchema).min(1),
    passingScore: z.number().min(0).max(100).optional(),
    showCorrectAnswers: z.boolean().default(true),
    timePerQuestionMs: z.number().min(5000).optional(),
});

// Poll/Survey configuration
export const PollQuestionSchema = z.object({
    id: z.string(),
    question: z.string(),
    type: z.enum(['single_choice', 'multi_choice', 'rating', 'text']),
    options: z.array(z.object({
        id: z.string(),
        text: z.string(),
    })).optional(),
    required: z.boolean().default(false),
    maxRating: z.number().min(3).max(10).optional(), // For rating type
});

export const PollConfigSchema = z.object({
    questions: z.array(PollQuestionSchema).min(1),
    showResults: z.boolean().default(false),
});

export const GameBlockSchema = z.object({
    id: z.string(),
    type: z.literal('game'),
    gameType: GameTypeSchema,
    config: z.union([
        SpinToWinConfigSchema,
        ScratchcardConfigSchema,
        QuizConfigSchema,
        PollConfigSchema,
    ]),
    nextBlockId: z.string().optional(),
});

export type GameBlock = z.infer<typeof GameBlockSchema>;

// ============================================================================
// FORM BLOCKS
// ============================================================================

export const FormFieldTypeSchema = z.enum([
    'email',
    'phone',
    'text',
    'textarea',
    'select',
    'multi_select',
    'checkbox',
    'date',
]);

export const FormFieldSchema = z.object({
    id: z.string(),
    type: FormFieldTypeSchema,
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    options: z.array(z.object({
        value: z.string(),
        label: z.string(),
    })).optional(), // For select/multi_select
    validation: z.object({
        pattern: z.string().optional(),
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        errorMessage: z.string().optional(),
    }).optional(),
});

export const ConsentFieldSchema = z.object({
    id: z.string(),
    text: z.string(), // GDPR consent text
    required: z.boolean().default(true),
    linkUrl: z.string().url().optional(), // Privacy policy link
});

export const FormBlockSchema = z.object({
    id: z.string(),
    type: z.literal('form'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    fields: z.array(FormFieldSchema).min(1),
    consentFields: z.array(ConsentFieldSchema).optional(),
    submitButtonText: z.string().default('Submit'),
    nextBlockId: z.string().optional(),
});

export type FormBlock = z.infer<typeof FormBlockSchema>;

// ============================================================================
// OUTCOME BLOCKS
// ============================================================================

export const OutcomeBlockSchema = z.object({
    id: z.string(),
    type: z.literal('outcome'),
    variant: z.enum(['winner', 'loser', 'completion']),
    title: z.string(),
    message: z.string(),
    imageUrl: z.string().url().optional(),
    prizeDisplay: z.object({
        showPrize: z.boolean().default(true),
        showCode: z.boolean().default(true),
    }).optional(),
    nextBlockId: z.string().optional(),
});

export type OutcomeBlock = z.infer<typeof OutcomeBlockSchema>;

// ============================================================================
// ACTION BLOCKS
// ============================================================================

export const CTAActionBlockSchema = z.object({
    id: z.string(),
    type: z.literal('cta_action'),
    buttonText: z.string(),
    action: z.enum(['url', 'close', 'next_block']),
    url: z.string().url().optional(),
    openInNewTab: z.boolean().default(true),
    nextBlockId: z.string().optional(),
});

export type CTAActionBlock = z.infer<typeof CTAActionBlockSchema>;

export const IntegrationActionBlockSchema = z.object({
    id: z.string(),
    type: z.literal('integration_action'),
    integrationId: z.string(),
    action: z.enum(['sync_contact', 'add_tag', 'send_event']),
    payload: z.record(z.string(), z.unknown()).optional(),
    nextBlockId: z.string().optional(),
});

export type IntegrationActionBlock = z.infer<typeof IntegrationActionBlockSchema>;

// ============================================================================
// UNIFIED BLOCK TYPE
// ============================================================================

export const BlockSchema = z.discriminatedUnion('type', [
    TriggerBlockSchema,
    ContainerBlockSchema,
    GameBlockSchema,
    FormBlockSchema,
    OutcomeBlockSchema,
    CTAActionBlockSchema,
    IntegrationActionBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

// ============================================================================
// FLOW (Campaign Configuration)
// ============================================================================

export const FlowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    entryBlockId: z.string(),
    blocks: z.record(z.string(), BlockSchema),
});

export type Flow = z.infer<typeof FlowSchema>;

// ============================================================================
// CAMPAIGN VERSION CONFIG
// ============================================================================

export const CampaignConfigSchema = z.object({
    version: z.number().int().min(1),
    flow: FlowSchema,
    settings: z.object({
        timezone: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        targetUrls: z.array(z.string()).optional(),
        excludeUrls: z.array(z.string()).optional(),
    }).optional(),
});

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateCampaignConfig(config: unknown): CampaignConfig {
    return CampaignConfigSchema.parse(config);
}

export function safeParseCampaignConfig(config: unknown) {
    return CampaignConfigSchema.safeParse(config);
}

export function validateBlock(block: unknown): Block {
    return BlockSchema.parse(block);
}

export function safeParseBlock(block: unknown) {
    return BlockSchema.safeParse(block);
}
