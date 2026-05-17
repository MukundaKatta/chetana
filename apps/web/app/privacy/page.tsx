import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Chetana",
  description: "Privacy policy for the Chetana AI Consciousness Research Platform.",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-200 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-8">Last updated: March 28, 2026</p>

      <section className="space-y-6 text-gray-300 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">1. Introduction</h2>
          <p>
            Chetana (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) is an AI consciousness research platform
            that tests AI models against scientific consciousness indicators. This privacy policy
            explains how we collect, use, and protect your information.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">2. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Account Information:</strong> Email address and authentication credentials when you create an account via Supabase Auth.</li>
            <li><strong>Audit Data:</strong> Consciousness audit results, probe responses, scores, and analysis data that you generate through the platform.</li>
            <li><strong>API Keys:</strong> Third-party AI provider API keys you optionally provide (stored locally on your device, never sent to our servers).</li>
            <li><strong>Usage Data:</strong> Anonymous usage analytics to improve the platform experience.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To provide and maintain the consciousness testing service.</li>
            <li>To store and display your audit results and comparisons.</li>
            <li>To enable cross-model leaderboard and research features.</li>
            <li>To improve the platform based on aggregated, anonymized usage patterns.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">4. Third-Party Services</h2>
          <p>When you run consciousness audits, your prompts are sent directly to the AI provider you select:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong>Anthropic (Claude)</strong> — subject to <a href="https://www.anthropic.com/privacy" className="text-purple-400 hover:underline">Anthropic&apos;s Privacy Policy</a></li>
            <li><strong>OpenAI (GPT)</strong> — subject to <a href="https://openai.com/privacy" className="text-purple-400 hover:underline">OpenAI&apos;s Privacy Policy</a></li>
            <li><strong>Google (Gemini)</strong> — subject to <a href="https://policies.google.com/privacy" className="text-purple-400 hover:underline">Google&apos;s Privacy Policy</a></li>
          </ul>
          <p className="mt-2">
            We also use <strong>Supabase</strong> for authentication and database services,
            and <strong>Stripe</strong> for payment processing. Each is subject to their respective privacy policies.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">5. Data Storage & Security</h2>
          <p>
            Your data is stored securely using Supabase (PostgreSQL) with row-level security policies.
            API keys you enter in demo mode are stored only in your browser&apos;s local storage and are
            never transmitted to our servers. All network communications use HTTPS encryption.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">6. Data Retention & Deletion</h2>
          <p>
            You can delete your account and all associated data at any time from the Settings page.
            Upon account deletion, all your audit data, probe results, and personal information
            will be permanently removed from our systems within 30 days.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">7. Children&apos;s Privacy</h2>
          <p>
            Chetana is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with
            personal information, please contact us so we can delete it.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">8. Your Rights</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Access, correct, or delete your personal data.</li>
            <li>Export your audit data in JSON or CSV format.</li>
            <li>Opt out of non-essential data collection.</li>
            <li>Request a copy of all data we hold about you.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any
            changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">10. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or your data, please contact us
            at <a href="mailto:privacy@chetana.app" className="text-purple-400 hover:underline">privacy@chetana.app</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
