import { prisma } from '@/lib/db';

/**
 * Prize Engine
 * 
 * Handles weighted random prize selection and coupon code claiming
 */

interface PrizeSelection {
    prizeId: string;
    prizeName: string;
    couponCode: string | null;
    isConsolation: boolean;
}

/**
 * Select a prize based on weighted probability
 * Returns null if no prize available (all claimed)
 */
export async function selectPrize(campaignId: string): Promise<PrizeSelection | null> {
    // Get all active prizes for this campaign with available quantity
    const prizes = await prisma.prize.findMany({
        where: {
            campaignId,
            isActive: true,
            OR: [
                { quantity: null }, // Unlimited
                { quantity: { gt: prisma.prize.fields.claimed } }, // Has remaining
            ],
        },
        orderBy: { isConsolation: 'asc' }, // Try non-consolation first
    });

    if (prizes.length === 0) {
        return null;
    }

    // Calculate total probability weight (only non-consolation prizes)
    const regularPrizes = prizes.filter(p => !p.isConsolation);
    const consolationPrize = prizes.find(p => p.isConsolation);

    if (regularPrizes.length === 0 && consolationPrize) {
        // Only consolation prize available
        return selectFromPrize(consolationPrize);
    }

    // Weighted random selection
    const totalWeight = regularPrizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalWeight;

    for (const prize of regularPrizes) {
        random -= prize.probability;
        if (random <= 0) {
            const result = await selectFromPrize(prize);
            if (result) return result;
        }
    }

    // Fallback to consolation prize if selection failed (e.g., no codes left)
    if (consolationPrize) {
        return selectFromPrize(consolationPrize);
    }

    return null;
}

/**
 * Internal: Attempt to claim a code from a prize
 */
async function selectFromPrize(prize: {
    id: string;
    name: string;
    isConsolation: boolean;
    quantity: number | null;
    claimed: number;
}): Promise<PrizeSelection | null> {
    // Check if prize has remaining quantity
    if (prize.quantity !== null && prize.claimed >= prize.quantity) {
        return null;
    }

    // Try to claim an available code
    const code = await prisma.prizeCode.findFirst({
        where: {
            prizeId: prize.id,
            status: 'AVAILABLE',
        },
    });

    if (!code) {
        // No codes available - still return prize but without code
        return {
            prizeId: prize.id,
            prizeName: prize.name,
            couponCode: null,
            isConsolation: prize.isConsolation,
        };
    }

    // Atomically claim the code using a transaction
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Double-check the code is still available
            const codeCheck = await tx.prizeCode.findUnique({
                where: { id: code.id },
            });

            if (!codeCheck || codeCheck.status !== 'AVAILABLE') {
                return null; // Code was claimed by another request
            }

            // Claim the code
            await tx.prizeCode.update({
                where: { id: code.id },
                data: {
                    status: 'CLAIMED',
                    claimedAt: new Date(),
                },
            });

            // Increment claimed count
            await tx.prize.update({
                where: { id: prize.id },
                data: { claimed: { increment: 1 } },
            });

            return code.code;
        });

        if (!result) return null;

        return {
            prizeId: prize.id,
            prizeName: prize.name,
            couponCode: result,
            isConsolation: prize.isConsolation,
        };
    } catch (error) {
        console.error('[PrizeEngine] Code claim failed:', error);
        return null;
    }
}

/**
 * Assign a prize to a submission
 */
export async function assignPrizeToSubmission(
    submissionId: string,
    campaignId: string
): Promise<PrizeSelection | null> {
    const prize = await selectPrize(campaignId);

    if (!prize) return null;

    // Update submission with prize info
    await prisma.submission.update({
        where: { id: submissionId },
        data: {
            prizeWon: prize.prizeName,
            prizeCodeId: prize.couponCode || undefined,
        },
    });

    // Track prize awarded event
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { workspaceId: true, sessionId: true },
    });

    if (submission) {
        await prisma.eventRaw.create({
            data: {
                workspaceId: submission.workspaceId,
                campaignId,
                sessionId: submission.sessionId,
                eventType: 'PRIZE_AWARDED',
                payload: {
                    prizeId: prize.prizeId,
                    prizeName: prize.prizeName,
                    hasCoupon: !!prize.couponCode,
                },
            },
        });
    }

    return prize;
}

/**
 * Get remaining prize quantities for a campaign
 */
export async function getPrizeInventory(campaignId: string) {
    const prizes = await prisma.prize.findMany({
        where: { campaignId, isActive: true },
        select: {
            id: true,
            name: true,
            quantity: true,
            claimed: true,
            isConsolation: true,
            probability: true,
            _count: {
                select: {
                    codes: { where: { status: 'AVAILABLE' } },
                },
            },
        },
    });

    return prizes.map(p => ({
        id: p.id,
        name: p.name,
        totalQuantity: p.quantity,
        claimed: p.claimed,
        remaining: p.quantity ? p.quantity - p.claimed : null,
        availableCodes: p._count.codes,
        probability: p.probability,
        isConsolation: p.isConsolation,
    }));
}

/**
 * Generate random coupon codes
 */
export function generateCouponCodes(
    count: number,
    options?: {
        prefix?: string;
        length?: number;
        chars?: string;
    }
): string[] {
    const prefix = options?.prefix || '';
    const length = options?.length || 8;
    const chars = options?.chars || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars

    const codes: string[] = [];
    const usedCodes = new Set<string>();

    while (codes.length < count) {
        let code = prefix;
        for (let i = 0; i < length; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }

        if (!usedCodes.has(code)) {
            usedCodes.add(code);
            codes.push(code);
        }
    }

    return codes;
}

/**
 * Bulk import coupon codes for a prize
 */
export async function importCouponCodes(
    prizeId: string,
    codes: string[]
): Promise<{ imported: number; duplicates: number }> {
    let imported = 0;
    let duplicates = 0;

    for (const code of codes) {
        try {
            await prisma.prizeCode.create({
                data: {
                    prizeId,
                    code: code.trim().toUpperCase(),
                    status: 'AVAILABLE',
                },
            });
            imported++;
        } catch (error) {
            // Unique constraint violation = duplicate
            duplicates++;
        }
    }

    return { imported, duplicates };
}
