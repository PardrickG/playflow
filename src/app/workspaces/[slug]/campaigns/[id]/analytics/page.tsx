'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, TrendingUp, Users, Gift, MousePointerClick, Gamepad2 } from 'lucide-react';

interface CampaignMetrics {
    impressions: number;
    opens: number;
    closes: number;
    gameStarts: number;
    gameFinishes: number;
    formSubmits: number;
    prizesAwarded: number;
    ctaClicks: number;
    submissions: number;
    openRate: number;
    completionRate: number;
    conversionRate: number;
}

interface DailyMetric {
    date: string;
    impressions: number;
    opens: number;
    gameStarts: number;
    gameFinishes: number;
    formSubmits: number;
    prizesAwarded: number;
}

interface AnalyticsData {
    campaign: {
        id: string;
        name: string;
        status: string;
        createdAt: string;
    };
    metrics: CampaignMetrics;
    daily?: DailyMetric[];
}

export default function CampaignAnalytics() {
    const params = useParams();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const response = await fetch(
                    `/api/workspaces/${params.slug}/campaigns/${params.id}/analytics?daily=true`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch analytics');
                }

                const analyticsData = await response.json();
                setData(analyticsData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [params.slug, params.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500">{error || 'No data available'}</div>
            </div>
        );
    }

    const { campaign, metrics, daily } = data;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{campaign.name}</h1>
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${campaign.status === 'PUBLISHED'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                            {campaign.status}
                        </span>
                        <span className="text-slate-400 text-sm">
                            Created {new Date(campaign.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                    <MetricCard
                        title="Impressions"
                        value={metrics.impressions}
                        icon={<BarChart3 className="w-5 h-5" />}
                        color="blue"
                    />
                    <MetricCard
                        title="Opens"
                        value={metrics.opens}
                        icon={<MousePointerClick className="w-5 h-5" />}
                        color="green"
                        subValue={`${metrics.openRate.toFixed(1)}% rate`}
                    />
                    <MetricCard
                        title="Games Played"
                        value={metrics.gameFinishes}
                        icon={<Gamepad2 className="w-5 h-5" />}
                        color="purple"
                        subValue={`${metrics.completionRate.toFixed(1)}% completed`}
                    />
                    <MetricCard
                        title="Form Submits"
                        value={metrics.formSubmits}
                        icon={<Users className="w-5 h-5" />}
                        color="pink"
                        subValue={`${metrics.conversionRate.toFixed(1)}% conversion`}
                    />
                    <MetricCard
                        title="Prizes Won"
                        value={metrics.prizesAwarded}
                        icon={<Gift className="w-5 h-5" />}
                        color="yellow"
                    />
                    <MetricCard
                        title="CTA Clicks"
                        value={metrics.ctaClicks}
                        icon={<TrendingUp className="w-5 h-5" />}
                        color="cyan"
                    />
                </div>

                {/* Funnel Visualization */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8">
                    <h2 className="text-xl font-semibold text-white mb-6">Conversion Funnel</h2>
                    <div className="flex items-end justify-between gap-2 h-48">
                        <FunnelBar label="Impressions" value={metrics.impressions} maxValue={metrics.impressions} />
                        <FunnelBar label="Opens" value={metrics.opens} maxValue={metrics.impressions} />
                        <FunnelBar label="Games Started" value={metrics.gameStarts} maxValue={metrics.impressions} />
                        <FunnelBar label="Games Finished" value={metrics.gameFinishes} maxValue={metrics.impressions} />
                        <FunnelBar label="Forms Submitted" value={metrics.formSubmits} maxValue={metrics.impressions} />
                        <FunnelBar label="Prizes Won" value={metrics.prizesAwarded} maxValue={metrics.impressions} />
                    </div>
                </div>

                {/* Daily Chart */}
                {daily && daily.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Daily Performance</h2>
                        <div className="overflow-x-auto">
                            <div className="flex items-end gap-2 h-48 min-w-[600px]">
                                {daily.map((d) => (
                                    <div key={d.date} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-gradient-to-t from-pink-500 to-purple-500 rounded-t"
                                            style={{ height: `${Math.max((d.opens / (daily[0]?.opens || 1)) * 100, 4)}%` }}
                                        />
                                        <span className="text-xs text-slate-400 mt-2 rotate-45 origin-left">
                                            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    icon,
    color,
    subValue
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'pink' | 'yellow' | 'cyan';
    subValue?: string;
}) {
    const colorClasses = {
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
        green: 'from-green-500/20 to-green-600/10 border-green-500/30',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
        pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
        yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
        cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 text-slate-400 mb-2">
                {icon}
                <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
            </div>
            <div className="text-2xl font-bold text-white">
                {value.toLocaleString()}
            </div>
            {subValue && (
                <div className="text-xs text-slate-400 mt-1">{subValue}</div>
            )}
        </div>
    );
}

function FunnelBar({
    label,
    value,
    maxValue
}: {
    label: string;
    value: number;
    maxValue: number;
}) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

    return (
        <div className="flex-1 flex flex-col items-center">
            <div className="text-xs text-slate-400 mb-2">{value.toLocaleString()}</div>
            <div
                className="w-full bg-gradient-to-t from-pink-500 to-purple-500 rounded-t min-h-[4px]"
                style={{ height: `${Math.max(percentage, 2)}%` }}
            />
            <div className="text-xs text-slate-400 mt-2 text-center">{label}</div>
        </div>
    );
}
