import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="text-6xl mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">This page could not be found.</h1>
        <p className="text-gray-600">
          The link may be broken, the page may have moved, or the route may not be implemented yet.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition"
          >
            Go home
          </Link>
          <Link
            href="/messages"
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            Open messages
          </Link>
          <Link
            href="/verification"
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            Verify account
          </Link>
        </div>
      </div>
    </main>
  );
}