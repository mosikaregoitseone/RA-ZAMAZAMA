'use client';

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RestrictedAccessProps {
  title?: string;
  message?: string;
  reason?: 'not_logged_in' | 'not_verified' | 'pending_review';
}

export default function RestrictedAccess({
  title = 'Restricted Access',
  message = 'You need to be verified first for full access.',
  reason = 'not_verified',
}: RestrictedAccessProps) {
  const router = useRouter();

  const primaryCopy =
    reason === 'not_logged_in'
      ? 'Log in to continue'
      : 'Go to verification';

  return (
    <div className="max-w-xl mx-auto my-12 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-md transition"
          >
            Continue browsing
          </button>

          {reason === 'not_logged_in' ? (
            <Link
              href="/login"
              className="border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold px-5 py-2.5 rounded-md transition"
            >
              {primaryCopy}
            </Link>
          ) : (
            <Link
              href="/verification"
              className="border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold px-5 py-2.5 rounded-md transition"
            >
              {primaryCopy}
            </Link>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-6">
          You can still browse listings - messaging, posting and buying unlock after verification.
        </p>
      </div>
    </div>
  );
}