// File: src/app/admin/[...slug]/page.tsx
import { notFound } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";

interface AdminPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function AdminCatchAll({
  params,
}: AdminPageProps) {
  const { slug } = await params;

  // Valid admin sub-pages
  const validRoutes = [
    "document-review",
    "verification",
    "users",
    "listings",
    "admins",
    "create-admin",
    "analytics",
    "audit-log",
    "reports",
  ];

  const firstSegment = slug?.[0];

  // Log for debugging
  console.log("🔍 Admin catch-all accessed with slug:", slug);

  // If route is not recognized, return 404
  if (!firstSegment || !validRoutes.includes(firstSegment)) {
    console.warn(
      `⚠️ Invalid admin route: /${slug.join("/")}. Valid routes: ${validRoutes.join(", ")}`
    );
    notFound();
  }

  // This should not be reached for legitimate routes
  // (they have their own dedicated page.tsx files)
  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Page Not Fully Implemented
          </h2>
          <p className="text-yellow-700 mb-4">
            Admin page: <code className="bg-yellow-100 px-2 py-1 rounded">/{slug.join("/")}</code>
          </p>
          <p className="text-sm text-yellow-600">
            Valid admin routes:
            <ul className="list-disc list-inside mt-2 ml-2">
              {validRoutes.map((route) => (
                <li key={route}>
                  <code className="bg-yellow-100 px-1 rounded">/admin/{route}</code>
                </li>
              ))}
            </ul>
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
