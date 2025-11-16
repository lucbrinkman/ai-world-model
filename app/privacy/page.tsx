import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-purple-500 hover:text-purple-400">
            ← Back to Map
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">1. Information We Collect</h2>
            <p>
              When you create an account on Map of AI Futures, we collect the following
              information:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>Email address (for authentication)</li>
              <li>
                Saved scenarios (probability slider values and scenario names you choose to save)
              </li>
              <li>Account creation and update timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>Provide authentication services</li>
              <li>Save and retrieve your custom probability scenarios</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">3. Data Storage</h2>
            <p>
              Your data is securely stored using Supabase, a PostgreSQL database service. We
              implement row-level security to ensure that users can only access their own data
              through the application interface.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">4. Administrator Access</h2>
            <p>
              Site administrators have access to user data (email addresses and saved scenarios)
              for the following purposes:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>Debugging technical issues</li>
              <li>Providing customer support</li>
              <li>Improving the service</li>
              <li>Ensuring compliance with terms of service</li>
            </ul>
            <p className="mt-4">
              We do not sell, rent, or share your data with third parties. Administrators will
              only access individual user data when necessary for the purposes listed above.
              Passwords are cryptographically hashed and cannot be accessed by anyone, including
              administrators.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">5. Your Rights (GDPR)</h2>
            <p>Under GDPR, you have the right to:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>
                <strong>Access your data:</strong> You can download all your data from your
                profile page
              </li>
              <li>
                <strong>Delete your data:</strong> You can delete your account and all associated
                data from your profile page
              </li>
              <li>
                <strong>Rectify your data:</strong> You can update your saved scenarios at any
                time
              </li>
              <li>
                <strong>Data portability:</strong> You can export your data in JSON format
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">6. Anonymous Usage</h2>
            <p>
              You can use Map of AI Futures without creating an account. When used anonymously, we
              do not collect or store any personal information. Your probability configurations
              are stored only in your browser&apos;s URL.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">7. Cookies and Analytics</h2>
            <p className="mb-4">We use cookies for the following purposes:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>
                <strong>Essential Cookies (Supabase):</strong> Required for authentication and user
                account functionality. These cookies are necessary for the site to work properly.
              </li>
              <li>
                <strong>Analytics Cookies (PostHog):</strong> We use PostHog to collect anonymous
                usage data to help us understand how users interact with the application and improve
                the user experience. These cookies track actions like slider adjustments, node
                clicks, and navigation patterns.
              </li>
            </ul>
            <p className="mt-4">
              You can opt out of analytics cookies by clicking &quot;Decline&quot; in the cookie banner. This
              will not affect your ability to use the site, but essential cookies for authentication
              will still be used if you create an account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">8. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>
                <strong>Supabase:</strong> For authentication and database services
              </li>
              <li>
                <strong>PostHog (EU):</strong> For privacy-focused analytics. Data is stored on EU
                servers and is not shared with third parties. You can opt out via the cookie banner.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">9. Data Retention</h2>
            <p>
              We retain your data until you delete your account. You can delete your account at
              any time from your profile page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">10. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify users of any
              material changes by updating the policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">11. Contact</h2>
            <p>
              If you have any questions about this privacy policy or your data, please contact us
              through our GitHub repository.
            </p>
          </section>

          <div className="mt-8 pt-8 border-t border-gray-700 text-sm text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}
