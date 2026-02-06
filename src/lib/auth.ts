import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './db';
import type { User } from '@prisma/client';

/**
 * Get the current authenticated user from Clerk
 * Returns null if not authenticated
 */
export async function getAuthUser() {
    const { userId } = await auth();
    return userId;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<string> {
    const userId = await getAuthUser();
    if (!userId) {
        throw new Error('Unauthorized: Authentication required');
    }
    return userId;
}

/**
 * Sync Clerk user to database
 * Called on sign-up/sign-in to ensure user exists in our database
 */
export async function syncUserToDatabase(clerkUserId: string): Promise<User> {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        throw new Error('Could not fetch Clerk user');
    }

    const userData = {
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        avatarUrl: clerkUser.imageUrl,
    };

    // Upsert user - create if doesn't exist, update if exists
    const user = await prisma.user.upsert({
        where: { id: clerkUserId },
        update: userData,
        create: {
            id: clerkUserId,
            ...userData,
        },
    });

    return user;
}

/**
 * Get user from database by Clerk ID
 */
export async function getUserFromDatabase(clerkUserId: string): Promise<User | null> {
    return prisma.user.findUnique({
        where: { id: clerkUserId },
    });
}

/**
 * Get user's workspaces
 */
export async function getUserWorkspaces(userId: string) {
    return prisma.workspaceMember.findMany({
        where: {
            userId,
            acceptedAt: { not: null },
        },
        include: {
            workspace: true,
        },
        orderBy: {
            invitedAt: 'desc',
        },
    });
}

/**
 * Create a new workspace for a user (as Owner)
 */
export async function createWorkspaceForUser(
    userId: string,
    name: string,
    slug: string
) {
    // Create workspace with user as owner
    const workspace = await prisma.workspace.create({
        data: {
            name,
            slug,
            members: {
                create: {
                    userId,
                    role: 'OWNER',
                    acceptedAt: new Date(),
                },
            },
        },
        include: {
            members: true,
        },
    });

    return workspace;
}

/**
 * Generate a unique slug from workspace name
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) + '-' + Date.now().toString(36);
}
