'use client';

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getCurrentAdminInfo } from '../../../lib/adminUtils';

type MetricCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
};

function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle ? <p className="mt-2 text-xs text-gray-500">{subtitle}</p> : null}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers7d: 0,
    totalListings: 0,
    activeConversations: 0,
    totalMessages: 0,
    messages7d: 0,
    pendingReports: 0,
    pendingDocuments: 0,
    completedTransactions: 0,
  });
  const [dailyMessages, setDailyMessages] = useState<Array<{ day: string; count: number }>>([]);

  useEffect(() => {
    (async () => {
      const admin = await getCurrentAdminInfo();
      if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
        router.push('/');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
          totalUsers,
          newUsers7d,
          totalListings,
          activeConversations,
          totalMessages,
          messages7d,
          pendingReports,
          pendingDocuments,
          completedTransactions,
          recentMessages,
        ] = await Promise.all([
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('listings').select('*', { count: 'exact', head: true }),
          supabase.from('conversations').select('*', { count: 'exact', head: true }),
          supabase.from('messages').select('*', { count: 'exact', head: true }),
          supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('verification_documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase
            .from('messages')
            .select('created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true }),
        ]);

        if (totalUsers.error) throw totalUsers.error;
        if (newUsers7d.error) throw newUsers7d.error;
        if (totalListings.error) throw totalListings.error;
        if (activeConversations.error) throw activeConversations.error;
        if (totalMessages.error) throw totalMessages.error;
        if (messages7d.error) throw messages7d.error;
        if (pendingReports.error) throw pendingReports.error;
        if (pendingDocuments.error) throw pendingDocuments.error;
        if (completedTransactions.error) throw completedTransactions.error;
        if (recentMessages.error) throw recentMessages.error;

        const bucket = new Map<string, number>();
        const rawMessages = recentMessages.data || [];
        for (const row of rawMessages) {
          const day = new Date(row.created_at).toLocaleDateString();
          bucket.set(day, (bucket.get(day) || 0) + 1);
        }

        setDailyMessages(Array.from(bucket.entries()).map(([day, count]) => ({ day, count })));

        setStats({
          totalUsers: totalUsers.count || 0,
          newUsers7d: newUsers7d.count || 0,
          totalListings: totalListings.count || 0,
          activeConversations: activeConversations.count || 0,
          totalMessages: totalMessages.count || 0,
          messages7d: messages7d.count || 0,
          pendingReports: pendingReports.count || 0,
          pendingDocuments: pendingDocuments.count || 0,
          completedTransactions: completedTransactions.count || 0,
        });
      } catch (err) {
        console.error('Analytics load failed:', err);
        setError('Could not load analytics data. Check the table names, row-level security policies, and column names.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const peakDay = useMemo(() => {
    return dailyMessages.reduce<{ day: string; count: number } | null>((best, item) => {
      if (!best || item.count > best.count) return item;
      return best;
    }, null);
  }, [dailyMessages]);

  if (loading) {
    return <main className="p-6">Loading analytics…</main>;
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-600 mt-1">
          Engagement overview for users, conversations, messages, moderation and transactions.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total users" value={stats.totalUsers} subtitle={`+${stats.newUsers7d} in last 7 days`} />
        <MetricCard title="Listings" value={stats.totalListings} subtitle="Marketplace inventory" />
        <MetricCard title="Conversations" value={stats.activeConversations} subtitle="Active chat threads" />
        <MetricCard title="Messages" value={stats.totalMessages} subtitle={`+${stats.messages7d} in last 7 days`} />
        <MetricCard title="Pending reports" value={stats.pendingReports} subtitle="Needs moderation" />
        <MetricCard title="Pending documents" value={stats.pendingDocuments} subtitle="Needs review" />
        <MetricCard title="Completed transactions" value={stats.completedTransactions} subtitle="Successful exchanges" />
        <MetricCard
          title="Peak day"
          value={peakDay ? peakDay.day : '—'}
          subtitle={peakDay ? `${peakDay.count} messages` : 'No message data yet'}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Message activity by day</h2>
        <p className="text-sm text-gray-500 mt-1">
          This shows a simple engagement view based on message volume over the last 30 days.
        </p>

        <div className="mt-6 space-y-3">
          {dailyMessages.length === 0 ? (
            <p className="text-sm text-gray-500">No message activity found in the selected period.</p>
          ) : (
            dailyMessages.slice(-14).map((item) => {
              const max = Math.max(...dailyMessages.map((d) => d.count), 1);
              const width = Math.max(8, Math.round((item.count / max) * 100));
              return (
                <div key={item.day} className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                  <div className="text-sm text-gray-600">{item.day}</div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
                  </div>
                  <div className="text-right text-sm font-medium text-gray-800">{item.count}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
