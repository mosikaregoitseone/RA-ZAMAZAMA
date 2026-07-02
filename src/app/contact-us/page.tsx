"use client";
 
import Link from "next/link";
 
export default function ContactUsPage() {
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-6 inline-block">
          ← Back to Home
        </Link>
      </div>
 
      <div className="rounded-lg border border-gray-200 p-8 shadow-sm">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Contact Us</h1>
        <p className="text-gray-600 mb-8">
          Need help? Get in touch with our support team
        </p>
 
        <div className="space-y-8">
          {/* Phone Support */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">📞</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Phone Support</h2>
                <a
                  href="tel:+27604927514"
                  className="text-blue-600 hover:text-blue-700 font-medium text-lg"
                >
                  060 492 7514
                </a>
                <p className="text-sm text-gray-600 mt-2">
                  Call us for immediate assistance
                </p>
              </div>
            </div>
          </div>
 
          {/* Email Support */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">📧</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Email Support</h2>
                <a
                  href="mailto:razamazamamarketplace@gmail.com"
                  className="text-green-600 hover:text-green-700 font-medium break-all"
                >
                  razamazamamarketplace@gmail.com
                </a>
                <p className="text-sm text-gray-600 mt-2">
                  Send us your questions and concerns
                </p>
              </div>
            </div>
          </div>
 
          {/* Support Hours */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">🕐</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Support Hours</h2>
                <p className="text-gray-700 font-medium">Monday - Friday</p>
                <p className="text-gray-600">08:00 - 17:00 (SAST)</p>
                <p className="text-sm text-gray-600 mt-3">
                  We aim to respond to all inquiries within 24 hours during business hours.
                </p>
              </div>
            </div>
          </div>
 
          {/* FAQ Section */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">❓</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Common Issues</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">Account Verification</p>
                    <p className="text-gray-600">Visit the Verification section to complete your account setup</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Buying & Selling</p>
                    <p className="text-gray-600">Check the marketplace guidelines and safety tips on listings</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Payment & Transactions</p>
                    <p className="text-gray-600">View transaction details and payment methods in your profile</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Report a Problem</p>
                    <p className="text-gray-600">Use the report button on listings to flag suspicious activity</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
 
        {/* Action Button */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center px-6 py-3 rounded-lg font-medium transition"
          >
            Back to Marketplace
          </Link>
          <a
            href="mailto:razamazamamarketplace@gmail.com"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center px-6 py-3 rounded-lg font-medium transition"
          >
            Send Email
          </a>
        </div>
 
        {/* Trust & Safety Notice */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Safety Reminder:</strong> Never share your personal information, password, or payment details 
            via email or phone. Ra Zamazama support staff will never ask for sensitive information. 
            All official communications will come from our verified channels.
          </p>
        </div>
      </div>
    </main>
  );
}