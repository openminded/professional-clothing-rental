import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export type UserRole = 'cashier' | 'manager' | 'admin';

export interface AuthenticatedRequest extends NextRequest {
    user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        employeeId?: string;
    };
}

export async function withAuth(
    request: NextRequest,
    requiredRole?: UserRole
): Promise<{ user: any; response?: NextResponse }> {
    try {
        // Get the session from Better Auth
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session || !session.user) {
            return {
                user: null,
                response: NextResponse.json(
                    { error: 'Unauthorized - Please log in' },
                    { status: 401 }
                ),
            };
        }

        // Check if user is active
        if (!session.user.isActive) {
            return {
                user: null,
                response: NextResponse.json(
                    { error: 'Account is inactive' },
                    { status: 403 }
                ),
            };
        }

        // Check role requirements
        if (requiredRole) {
            const userRole = session.user.role as UserRole;
            const roleHierarchy = ['cashier', 'manager', 'admin'];
            const userLevel = roleHierarchy.indexOf(userRole);
            const requiredLevel = roleHierarchy.indexOf(requiredRole);

            if (userLevel < requiredLevel) {
                return {
                    user: null,
                    response: NextResponse.json(
                        { error: 'Insufficient permissions' },
                        { status: 403 }
                    ),
                };
            }
        }

        return { user: session.user };
    } catch (error) {
        console.error('Auth middleware error:', error);
        return {
            user: null,
            response: NextResponse.json(
                { error: 'Authentication error' },
                { status: 500 }
            ),
        };
    }
}

export async function requireAuth(
    handler: (req: AuthenticatedRequest, user: any) => Promise<NextResponse>,
    requiredRole?: UserRole
) {
    return async (request: NextRequest, ...args: any[]) => {
        const { user, response } = await withAuth(request, requiredRole);

        if (response) {
            return response;
        }

        // Add user to request object
        (request as AuthenticatedRequest).user = user;

        return handler(request as AuthenticatedRequest, user);
    };
}

// Helper functions for role-based permissions
export const canManageInventory = (role: UserRole): boolean => {
    return ['manager', 'admin'].includes(role);
};

export const canViewReports = (role: UserRole): boolean => {
    return ['manager', 'admin'].includes(role);
};

export const canProcessRentals = (role: UserRole): boolean => {
    return ['cashier', 'manager', 'admin'].includes(role);
};

export const canManageUsers = (role: UserRole): boolean => {
    return role === 'admin';
};

export const canDeleteData = (role: UserRole): boolean => {
    return ['manager', 'admin'].includes(role);
};

// Activity logging with authentication context
export async function logAuthenticatedActivity(
    user: any,
    data: {
        entityType: string;
        entityId: string;
        action: string;
        description: string;
        oldValues?: string;
        newValues?: string;
        ipAddress?: string;
    },
    request?: NextRequest
) {
    const { logActivity } = await import('@/lib/db-utils');

    await logActivity({
        ...data,
        userId: user.id,
        ipAddress: request?.ip || 'unknown',
        userAgent: request?.headers.get('user-agent') || 'unknown',
    });
}