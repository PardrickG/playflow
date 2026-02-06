import { prisma } from './db';
import type { Role } from '@prisma/client';

/**
 * Workspace context for request scoping
 */
export interface WorkspaceContext {
    workspaceId: string;
    userId: string;
    role: Role;
}

/**
 * RBAC permission definitions
 */
const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
    OWNER: new Set([
        'workspace:read',
        'workspace:update',
        'workspace:delete',
        'workspace:invite',
        'members:manage',
        'campaigns:read',
        'campaigns:create',
        'campaigns:update',
        'campaigns:delete',
        'campaigns:publish',
        'analytics:read',
        'integrations:manage',
        'settings:manage',
    ]),
    ADMIN: new Set([
        'workspace:read',
        'workspace:update',
        'workspace:invite',
        'members:manage',
        'campaigns:read',
        'campaigns:create',
        'campaigns:update',
        'campaigns:delete',
        'campaigns:publish',
        'analytics:read',
        'integrations:manage',
        'settings:manage',
    ]),
    EDITOR: new Set([
        'workspace:read',
        'campaigns:read',
        'campaigns:create',
        'campaigns:update',
        'campaigns:publish',
        'analytics:read',
    ]),
    ANALYST: new Set([
        'workspace:read',
        'campaigns:read',
        'analytics:read',
    ]),
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: string): boolean {
    return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Validate workspace membership and return context
 */
export async function getWorkspaceContext(
    workspaceId: string,
    userId: string
): Promise<WorkspaceContext | null> {
    const member = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId,
            },
        },
        select: {
            role: true,
            acceptedAt: true,
        },
    });

    if (!member || !member.acceptedAt) {
        return null;
    }

    return {
        workspaceId,
        userId,
        role: member.role,
    };
}

/**
 * Ensure user has access to a workspace with required permission
 * Throws if access denied
 */
export async function requireWorkspaceAccess(
    workspaceId: string,
    userId: string,
    requiredPermission: string
): Promise<WorkspaceContext> {
    const context = await getWorkspaceContext(workspaceId, userId);

    if (!context) {
        throw new Error('Access denied: Not a member of this workspace');
    }

    if (!hasPermission(context.role, requiredPermission)) {
        throw new Error(`Access denied: Insufficient permissions (requires ${requiredPermission})`);
    }

    return context;
}

/**
 * Workspace-scoped query helpers
 * These ensure all queries are properly scoped to a workspace
 */
export const workspaceScoped = {
    campaigns: (workspaceId: string) => ({
        where: { workspaceId },
    }),

    prizes: (workspaceId: string) => ({
        where: { workspaceId },
    }),

    submissions: (workspaceId: string) => ({
        where: { workspaceId },
    }),

    events: (workspaceId: string) => ({
        where: { workspaceId },
    }),

    integrations: (workspaceId: string) => ({
        where: { workspaceId },
    }),

    assets: (workspaceId: string) => ({
        where: { workspaceId },
    }),
};
