import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Serve the widget JavaScript file
 * In production, this would be served from CDN
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const version = searchParams.get('v') || 'latest';

        // In development, serve from public folder
        const widgetPath = join(process.cwd(), 'public', 'widget', 'playflow.min.js');

        if (!existsSync(widgetPath)) {
            // Fallback to source for development
            const srcPath = join(process.cwd(), 'src', 'widget', 'playflow.ts');
            if (existsSync(srcPath)) {
                const content = readFileSync(srcPath, 'utf-8');
                return new NextResponse(content, {
                    headers: {
                        'Content-Type': 'application/javascript; charset=utf-8',
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
            return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
        }

        const content = readFileSync(widgetPath, 'utf-8');

        return new NextResponse(content, {
            headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
                'X-PlayFlow-Version': version,
            },
        });
    } catch (error) {
        console.error('[Widget] Error serving script:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Max-Age': '86400',
        },
    });
}
