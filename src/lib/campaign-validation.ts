/**
 * Campaign Validation Middleware
 * 
 * Validates campaign configurations before save/publish operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    CampaignConfigSchema,
    FlowSchema,
    BlockSchema,
    safeParseCampaignConfig,
    type CampaignConfig,
    type Flow,
    type Block,
} from './schemas/campaign';

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    path: string;
    message: string;
    code: string;
}

export interface ValidationWarning {
    path: string;
    message: string;
    code: string;
}

/**
 * Validate a complete campaign configuration
 */
export function validateCampaign(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Parse with Zod
    const parseResult = safeParseCampaignConfig(config);

    if (!parseResult.success) {
        // Convert Zod errors to our format
        for (const issue of parseResult.error.issues) {
            errors.push({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code,
            });
        }
        return { valid: false, errors, warnings };
    }

    const campaignConfig = parseResult.data;

    // Additional semantic validations
    validateFlowIntegrity(campaignConfig.flow, errors, warnings);
    validateBlockReferences(campaignConfig.flow, errors, warnings);
    validateFormFields(campaignConfig.flow, errors, warnings);
    validateGameConfigs(campaignConfig.flow, errors, warnings);

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate flow integrity - ensure entry block exists and is reachable
 */
function validateFlowIntegrity(
    flow: Flow,
    errors: ValidationError[],
    warnings: ValidationWarning[]
) {
    // Check entry block exists
    if (!flow.blocks[flow.entryBlockId]) {
        errors.push({
            path: 'flow.entryBlockId',
            message: `Entry block "${flow.entryBlockId}" not found in blocks`,
            code: 'MISSING_ENTRY_BLOCK',
        });
    }

    // Check for orphan blocks (not reachable from entry)
    const reachableBlocks = new Set<string>();
    const visited = new Set<string>();

    function traverse(blockId: string) {
        if (visited.has(blockId)) return;
        visited.add(blockId);
        reachableBlocks.add(blockId);

        const block = flow.blocks[blockId];
        if (!block) return;

        // Get next block references
        if ('nextBlockId' in block && block.nextBlockId) {
            traverse(block.nextBlockId);
        }
        if ('children' in block && block.children) {
            for (const childId of block.children) {
                traverse(childId);
            }
        }
    }

    traverse(flow.entryBlockId);

    // Check for orphan blocks
    for (const blockId of Object.keys(flow.blocks)) {
        if (!reachableBlocks.has(blockId)) {
            warnings.push({
                path: `flow.blocks.${blockId}`,
                message: `Block "${blockId}" is not reachable from entry point`,
                code: 'ORPHAN_BLOCK',
            });
        }
    }
}

/**
 * Validate block references - ensure all referenced blocks exist
 */
function validateBlockReferences(
    flow: Flow,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
) {
    for (const [blockId, block] of Object.entries(flow.blocks)) {
        // Check nextBlockId references
        if ('nextBlockId' in block && block.nextBlockId) {
            if (!flow.blocks[block.nextBlockId]) {
                errors.push({
                    path: `flow.blocks.${blockId}.nextBlockId`,
                    message: `Referenced block "${block.nextBlockId}" does not exist`,
                    code: 'INVALID_BLOCK_REFERENCE',
                });
            }
        }

        // Check children references
        if ('children' in block && block.children) {
            for (const childId of block.children) {
                if (!flow.blocks[childId]) {
                    errors.push({
                        path: `flow.blocks.${blockId}.children`,
                        message: `Child block "${childId}" does not exist`,
                        code: 'INVALID_CHILD_REFERENCE',
                    });
                }
            }
        }
    }
}

/**
 * Validate form fields for required email or phone
 */
function validateFormFields(
    flow: Flow,
    _errors: ValidationError[],
    warnings: ValidationWarning[]
) {
    for (const [blockId, block] of Object.entries(flow.blocks)) {
        if (block.type === 'form') {
            const hasEmail = block.fields.some(f => f.type === 'email');
            const hasPhone = block.fields.some(f => f.type === 'phone');

            if (!hasEmail && !hasPhone) {
                warnings.push({
                    path: `flow.blocks.${blockId}.fields`,
                    message: 'Form has no email or phone field for lead capture',
                    code: 'NO_CONTACT_FIELD',
                });
            }
        }
    }
}

/**
 * Validate game configurations
 */
function validateGameConfigs(
    flow: Flow,
    errors: ValidationError[],
    warnings: ValidationWarning[]
) {
    for (const [blockId, block] of Object.entries(flow.blocks)) {
        if (block.type === 'game') {
            // Validate spin-to-win probability sum
            if (block.gameType === 'spin_to_win') {
                const config = block.config as { segments?: { probability: number }[] };
                if (config.segments) {
                    const totalProbability = config.segments.reduce(
                        (sum, seg) => sum + seg.probability,
                        0
                    );
                    if (Math.abs(totalProbability - 1) > 0.001) {
                        warnings.push({
                            path: `flow.blocks.${blockId}.config.segments`,
                            message: `Segment probabilities sum to ${totalProbability}, should equal 1.0`,
                            code: 'INVALID_PROBABILITY_SUM',
                        });
                    }
                }
            }

            // Validate quiz has questions
            if (block.gameType === 'quiz') {
                const config = block.config as { questions?: unknown[] };
                if (!config.questions || config.questions.length === 0) {
                    errors.push({
                        path: `flow.blocks.${blockId}.config.questions`,
                        message: 'Quiz must have at least one question',
                        code: 'EMPTY_QUIZ',
                    });
                }
            }
        }
    }
}

/**
 * Middleware wrapper for API routes
 */
export function withCampaignValidation(
    handler: (req: NextRequest, validatedConfig: CampaignConfig) => Promise<NextResponse>
) {
    return async function (req: NextRequest): Promise<NextResponse> {
        try {
            const body = await req.json();
            const result = validateCampaign(body.config);

            if (!result.valid) {
                return NextResponse.json({
                    error: 'Invalid campaign configuration',
                    errors: result.errors,
                    warnings: result.warnings,
                }, { status: 400 });
            }

            const config = CampaignConfigSchema.parse(body.config);
            return handler(req, config);
        } catch (error) {
            return NextResponse.json({
                error: 'Failed to parse request body',
            }, { status: 400 });
        }
    };
}
