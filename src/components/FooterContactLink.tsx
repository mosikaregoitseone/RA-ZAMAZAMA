"use client";

import Link from "next/link";

export default function FooterContactLink() {
  return (
    <div className="mt-10 pt-6 border-t border-gray-200 text-center">
      <p className="text-sm text-gray-600">
        Need help?{" "}
        <Link
          href="/contact-us"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Contact Support
        </Link>
      </p>
    </div>
  );
}
