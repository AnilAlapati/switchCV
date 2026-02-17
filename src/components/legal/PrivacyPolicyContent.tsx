/* eslint-disable max-lines */
import Link from "next/link";
import BetaDisclaimer from "./BetaDisclaimer";

const LAST_UPDATED = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const sectionHeadingClass = "text-xl font-serif font-bold text-black mt-8 mb-3";
const listClass = "list-disc pl-6 space-y-1";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className={sectionHeadingClass}>{children}</h2>;
}

export default function PrivacyPolicyContent() {
  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-8 font-mono"
      >
        ← Back to Home
      </Link>

      <BetaDisclaimer />

      <h1 className="text-4xl font-serif font-bold text-black mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm font-mono text-gray-500 mb-12">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed">
        <section>
          <SectionHeading>1. Introduction</SectionHeading>
          <p>
            SwitchCV (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
            operates the SwitchCV platform at <strong>switchcv.com</strong>.
            This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our service.
          </p>
        </section>

        <section>
          <SectionHeading>2. Information We Collect</SectionHeading>
          <h3 className="text-base font-semibold mt-4 mb-2">
            2.1 Information You Provide
          </h3>
          <ul className={listClass}>
            <li>
              <strong>Account data:</strong> Name, email address, and
              authentication credentials when you create an account.
            </li>
            <li>
              <strong>Resume data:</strong> Professional information you provide
              to create and manage resumes, including work history, education,
              skills, and contact details.
            </li>
            <li>
              <strong>Profile information:</strong> Role preferences (job seeker
              or recruiter), subscription tier, and settings.
            </li>
            <li>
              <strong>Communications:</strong> Messages sent through our contact
              forms or support channels.
            </li>
          </ul>
          <h3 className="text-base font-semibold mt-4 mb-2">
            2.2 Information Collected Automatically
          </h3>
          <ul className={listClass}>
            <li>
              <strong>Usage data:</strong> Pages visited, features used, and
              interactions with the platform.
            </li>
            <li>
              <strong>Device data:</strong> Browser type, operating system, and
              device identifiers.
            </li>
            <li>
              <strong>Analytics:</strong> We use PostHog for product analytics
              and Google Analytics for web traffic analysis.
            </li>
            <li>
              <strong>Error tracking:</strong> We use Sentry to capture
              application errors to improve reliability. Personal data is
              redacted from error reports.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>3. How We Use Your Information</SectionHeading>
          <ul className={listClass}>
            <li>To provide, maintain, and improve the SwitchCV platform.</li>
            <li>
              To generate AI-powered resume content using third-party AI
              services (Google Gemini, OpenAI, Groq).
            </li>
            <li>To manage your account, subscriptions, and usage limits.</li>
            <li>To enable recruiter-jobseeker matching features.</li>
            <li>
              To communicate service updates, respond to inquiries, and provide
              support.
            </li>
            <li>To detect and prevent fraud, abuse, and security threats.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <SectionHeading>4. AI-Powered Features</SectionHeading>
          <p>
            SwitchCV uses third-party AI services to generate and improve resume
            content. When you use AI features:
          </p>
          <ul className={listClass}>
            <li>
              Your resume data and job descriptions are sent to AI providers
              (Google Gemini, OpenAI, or Groq) for processing.
            </li>
            <li>
              AI providers process your data according to their own privacy
              policies and data processing agreements.
            </li>
            <li>
              We do not use your data to train AI models. We use these services
              via their API, not training pipelines.
            </li>
            <li>
              AI-generated content is stored in your account and subject to the
              same protections as other user data.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>5. Data Sharing and Disclosure</SectionHeading>
          <p>We do not sell your personal data. We may share data with:</p>
          <ul className={listClass}>
            <li>
              <strong>Service providers:</strong> Firebase (Google Cloud) for
              authentication, database, and hosting; AI providers for content
              generation; analytics providers for usage insights.
            </li>
            <li>
              <strong>Recruiters:</strong> Only if you explicitly share a resume
              link or opt in to recruiter visibility. You control the level of
              contact information shared.
            </li>
            <li>
              <strong>Legal requirements:</strong> When required by law, court
              order, or governmental authority.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>6. Data Security</SectionHeading>
          <p>
            We implement multiple layers of security to protect your data,
            including:
          </p>
          <ul className={listClass}>
            <li>
              Encrypted data transmission (HTTPS/TLS) and Firebase security
              rules.
            </li>
            <li>
              Authentication via Firebase Auth with JWT verification on every
              API request.
            </li>
            <li>CSRF protection, HMAC request signing, and rate limiting.</li>
            <li>
              PII redaction in server logs to prevent accidental data exposure.
            </li>
            <li>
              Role-based access controls ensuring users can only access their
              own data.
            </li>
          </ul>
          <p>
            While we strive to protect your information, no method of electronic
            storage or transmission is 100% secure.
          </p>
        </section>

        <section>
          <SectionHeading>
            7. Your Rights (GDPR and Global Privacy)
          </SectionHeading>
          <p>Depending on your location, you may have the following rights:</p>
          <ul className={listClass}>
            <li>
              <strong>Access:</strong> Request a copy of your personal data.
            </li>
            <li>
              <strong>Rectification:</strong> Correct inaccurate data in your
              profile.
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your account and
              associated data.
            </li>
            <li>
              <strong>Data portability:</strong> Export your data in a
              machine-readable format.
            </li>
            <li>
              <strong>Objection:</strong> Opt out of analytics tracking via our
              cookie consent preferences.
            </li>
          </ul>
          <p>
            To exercise these rights, contact us at{" "}
            <a
              href="mailto:support@switchcv.com"
              className="text-blue-700 underline"
            >
              support@switchcv.com
            </a>{" "}
            or use the account settings in the platform.
          </p>
        </section>

        <section>
          <SectionHeading>8. Data Retention</SectionHeading>
          <ul className={listClass}>
            <li>
              <strong>Basic/Free tier:</strong> Resume data is retained for 7
              days after expiration, then automatically deleted.
            </li>
            <li>
              <strong>Premium/Enterprise:</strong> Data is retained indefinitely
              while your account is active.
            </li>
            <li>
              Account deletion removes all associated data, including resumes,
              profiles, and billing records.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>9. Cookies and Tracking</SectionHeading>
          <p>We use cookies and similar technologies for:</p>
          <ul className={listClass}>
            <li>
              <strong>Essential cookies:</strong> Authentication session
              management (required for the service to function).
            </li>
            <li>
              <strong>Analytics cookies:</strong> PostHog and Google Analytics
              for understanding usage patterns (can be declined).
            </li>
            <li>
              <strong>Error tracking:</strong> Sentry for monitoring application
              health (can be declined).
            </li>
          </ul>
          <p>
            You can manage your cookie preferences at any time through the
            cookie consent banner on our site.
          </p>
        </section>

        <section>
          <SectionHeading>10. Children&apos;s Privacy</SectionHeading>
          <p>
            SwitchCV is not directed at children under the age of 16. We do not
            knowingly collect personal data from children. If you believe a
            child has provided us with personal information, please contact us
            to have it removed.
          </p>
        </section>

        <section>
          <SectionHeading>11. Changes to This Policy</SectionHeading>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            users of material changes via email or an in-app notice. Continued
            use of the platform after changes constitutes acceptance of the
            updated policy.
          </p>
        </section>

        <section>
          <SectionHeading>12. Contact Us</SectionHeading>
          <p>
            If you have questions about this Privacy Policy or your data,
            contact us at:
          </p>
          <ul className="list-none space-y-1 mt-2">
            <li>
              Email:{" "}
              <a
                href="mailto:support@switchcv.com"
                className="text-blue-700 underline"
              >
                support@switchcv.com
              </a>
            </li>
            <li>
              Contact form:{" "}
              <Link href="/contact" className="text-blue-700 underline">
                switchcv.com/contact
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-gray-200 text-center">
        <Link
          href="/terms"
          className="text-sm font-mono text-gray-500 hover:text-black underline"
        >
          Terms of Service →
        </Link>
      </div>
    </>
  );
}
