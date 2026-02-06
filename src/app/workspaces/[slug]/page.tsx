import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Plus, Settings, BarChart3 } from 'lucide-react';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function WorkspaceDashboardPage({ params }: PageProps) {
    const { userId } = await auth();
    const { slug } = await params;

    if (!userId) {
        redirect('/sign-in');
    }

    // Get workspace and verify access
    const workspace = await prisma.workspace.findUnique({
        where: { slug },
        include: {
            members: {
                where: { userId, acceptedAt: { not: null } },
            },
            campaigns: {
                orderBy: { updatedAt: 'desc' },
                take: 10,
                include: {
                    _count: { select: { submissions: true } },
                },
            },
        },
    });

    if (!workspace || workspace.members.length === 0) {
        redirect('/dashboard');
    }

    const member = workspace.members[0];

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-bold">
                            {workspace.name[0]}
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-white">{workspace.name}</h1>
                            <p className="text-sm text-gray-400">{member.role}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href={`/workspaces/${slug}/settings`}
                            className="p-2 text-gray-400 hover:text-white transition"
                        >
                            <Settings className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                        <p className="text-sm text-gray-400 mb-1">Total Campaigns</p>
                        <p className="text-3xl font-bold text-white">{workspace.campaigns.length}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                        <p className="text-sm text-gray-400 mb-1">Total Submissions</p>
                        <p className="text-3xl font-bold text-white">
                            {workspace.campaigns.reduce((sum, c) => sum + c._count.submissions, 0)}
                        </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                        <p className="text-sm text-gray-400 mb-1">Active Campaigns</p>
                        <p className="text-3xl font-bold text-white">
                            {workspace.campaigns.filter(c => c.status === 'ACTIVE').length}
                        </p>
                    </div>
                </div>

                {/* Campaigns Section */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Campaigns</h2>
                        <Link
                            href={`/workspaces/${slug}/campaigns/new`}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition"
                        >
                            <Plus className="w-4 h-4" />
                            New Campaign
                        </Link>
                    </div>

                    {workspace.campaigns.length === 0 ? (
                        <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-400 mb-4">No campaigns yet</p>
                            <Link
                                href={`/workspaces/${slug}/campaigns/new`}
                                className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Create your first campaign
                            </Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {workspace.campaigns.map((campaign) => (
                                <Link
                                    key={campaign.id}
                                    href={`/workspaces/${slug}/campaigns/${campaign.id}/builder`}
                                    className="group bg-gray-800/50 rounded-xl border border-gray-700 hover:border-pink-500/50 transition-all overflow-hidden"
                                >
                                    {/* Preview placeholder */}
                                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                        <span className="text-4xl opacity-50">🎮</span>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-white group-hover:text-pink-400 transition">
                                                {campaign.name}
                                            </h3>
                                            <span className={`px-2 py-0.5 text-xs rounded ${campaign.status === 'ACTIVE'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : campaign.status === 'DRAFT'
                                                        ? 'bg-gray-500/20 text-gray-400'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {campaign.status}
                                            </span>
                                        </div>

                                        {campaign.description && (
                                            <p className="text-sm text-gray-400 line-clamp-2 mb-3">{campaign.description}</p>
                                        )}

                                        <p className="text-xs text-gray-500">
                                            {campaign._count.submissions} submissions
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
