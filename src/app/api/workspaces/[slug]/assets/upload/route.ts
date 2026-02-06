import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ slug: string }>;
}

/**
 * Generate a presigned URL for direct upload to cloud storage
 * 
 * In production, this would generate a presigned URL for:
 * - Cloudflare R2
 * - AWS S3
 * - Or other object storage
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { slug } = await params;

        const membership = await requireWorkspaceAccess(user.id, slug);

        if (!['OWNER', 'ADMIN', 'EDITOR'].includes(membership.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { filename, contentType, size } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: 'Filename and content type required' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB for images, 50MB for video)
        const maxSize = contentType.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (size && size > maxSize) {
            return NextResponse.json(
                { error: 'File too large' },
                { status: 400 }
            );
        }

        // Generate unique key
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `workspaces/${membership.workspaceId}/assets/${timestamp}-${sanitizedFilename}`;

        // In production, generate presigned URL using your storage provider SDK
        // Example with R2/S3:
        // const command = new PutObjectCommand({
        //   Bucket: process.env.R2_BUCKET,
        //   Key: key,
        //   ContentType: contentType,
        // });
        // const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        // For development, return a mock response
        const cdnUrl = process.env.CDN_URL || 'https://cdn.playflow.io';
        const uploadUrl = `${cdnUrl}/upload/${key}`;
        const publicUrl = `${cdnUrl}/${key}`;

        return NextResponse.json({
            uploadUrl,
            publicUrl,
            key,
            expiresIn: 3600,
            // Instructions for client:
            // 1. PUT file to uploadUrl with Content-Type header
            // 2. After success, register asset via POST /api/workspaces/{slug}/assets
        });

    } catch (error) {
        if (error instanceof Error && error.message.includes('Access denied')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        console.error('[Upload] Error:', error);
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }
}
