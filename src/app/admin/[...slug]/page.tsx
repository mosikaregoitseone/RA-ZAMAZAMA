'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getCurrentAdminInfo } from '../../../lib/adminUtils';

type CardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
};

function StatCard({ title, value, subtitle }: CardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle ? <p className="mt-2 text-xs text-gray-500">{subtitle}</p> : null}
    </div>
  );
}

export default function AdminFallbackPage() {
  const router = useRouter();
  const params = useParams<{ slug?: string[] }>();
  const slug = useMemo(() => (params?.slug || []).join('/'), [params]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'superadmin' | null>(null);
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    reports: 0,
    documents: 0,
    messages: 0,
  });

  useEffect(() => {
    (async () => {
      const admin = await getCurrentAdminInfo();
      if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
        router.push('/');
        return;
      }

      setRole(admin.role);

      const [
        users,
        listings,
        reports,
        documents,
        messages,
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('verification_documents').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        users: users.count || 0,
        listings: listings.count || 0,
        reports: reports.count || 0,
        documents: documents.count || 0,
        messages: messages.count || 0,
      });

      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <main className="p-6">Loading admin page…</main>;
  }

  const title = slug
    .split('/')
    .map((part) => part.replace(/-/g, ' '))
    .join(' / ');

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin: {title || 'Page'}</h1>
        <p className="text-gray-600 mt-1">
          This route is not built yet, so it now opens a safe fallback page instead of a 404.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Users" value={stats.users} />
        <StatCard title="Listings" value={stats.listings} />
        <StatCard title="Reports" value={stats.reports} />
        <StatCard title="Documents" value={stats.documents} />
        <StatCard title="Messages" value={stats.messages} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">What this page is for</h2>
        <p className="text-sm text-gray-600 leading-6">
          {role === 'superadmin'
            ? 'You are seeing the superadmin fallback. Use this space to add the full feature later, or keep it as a dashboard placeholder.'
            : 'You are seeing the admin fallback. Use this as a temporary hub while the feature is still under development.'}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition"
          >
            Back to admin dashboard
          </Link>
          <Link
            href="/admin/analytics"
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            View analytics
          </Link>
        </div>
      </div>
    </main>
  );
}