import Link from "next/link";
import BetaDisclaimer from "@/components/legal/BetaDisclaimer";

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

export default function TermsOfServiceContent() {
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
        Terms of Service
      </h1>
      <p className="text-sm font-mono text-gray-500 mb-12">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed">
        <section>
          <SectionHeading>1. Acceptance of Terms</SectionHeading>
          <p>
            By accessing or using SwitchCV (&quot;the Service&quot;), operated
            at <strong>switchcv.com</strong>, you agree to be bound by these
            Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <SectionHeading>2. Description of Service</SectionHeading>
          <p>
            SwitchCV is an AI-powered career platform that enables users to
            create, optimize, and share professional resumes. The platform
            connects job seekers with recruiters through privacy-controlled
            resume sharing with view tracking and engagement analytics.
          </p>
        </section>

        <section>
          <SectionHeading>3. Account Registration</SectionHeading>
          <ul className={listClass}>
            <li>You must be at least 16 years old to create an account.</li>
            <li>
              You must provide accurate and complete registration information.
            </li>
            <li>
              You are responsible for maintaining the security of your account
              credentials.
            </li>
            <li>
              You must not share your account or allow unauthorized access.
            </li>
            <li>
              You will promptly notify us of any unauthorized use of your
              account.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>4. User Roles</SectionHeading>
          <p>SwitchCV supports two primary user roles:</p>
          <ul className={listClass}>
            <li>
              <strong>Job Seekers:</strong> Create and manage resumes, use
              AI-powered content generation, share resumes with recruiters, and
              track engagement.
            </li>
            <li>
              <strong>Recruiters:</strong> Search for candidates, request
              contact information, and use AI-assisted candidate evaluation
              tools.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>
            5. Subscription Tiers and Usage Limits
          </SectionHeading>
          <p>
            The Service offers multiple subscription tiers with different
            features and usage limits:
          </p>
          <ul className={listClass}>
            <li>
              <strong>Basic (Free):</strong> 1 resume, limited AI usage, 7-day
              data retention, 2 lifetime recruiter contact requests.
            </li>
            <li>
              <strong>Premium:</strong> Up to 50 resumes, 50 AI requests per
              month, 50 recruiter contact requests per month, unlimited data
              retention.
            </li>
            <li>
              <strong>Enterprise:</strong> Unlimited resumes, unlimited AI
              usage, unlimited recruiter features, priority support.
            </li>
          </ul>
          <p>
            We reserve the right to modify tier features and pricing with
            reasonable notice to existing subscribers.
          </p>
        </section>

        <section>
          <SectionHeading>6. AI-Generated Content</SectionHeading>
          <ul className={listClass}>
            <li>
              SwitchCV uses third-party AI services (Google Gemini, OpenAI,
              Groq) to assist with resume content generation.
            </li>
            <li>
              AI-generated content is provided as suggestions. You are
              responsible for reviewing, editing, and ensuring the accuracy of
              all content in your resume.
            </li>
            <li>
              We do not guarantee the quality, accuracy, or suitability of
              AI-generated content for any specific purpose.
            </li>
            <li>
              You retain ownership of the content you create, including
              AI-assisted content.
            </li>
            <li>
              You must not use AI features to generate misleading, fraudulent,
              or harmful content.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>7. Acceptable Use</SectionHeading>
          <p>You agree NOT to:</p>
          <ul className={listClass}>
            <li>
              Use the Service for any unlawful purpose or in violation of
              applicable laws.
            </li>
            <li>
              Upload false, misleading, or fraudulent information in resumes or
              profiles.
            </li>
            <li>
              Attempt to circumvent usage limits, rate limiting, or budget
              controls.
            </li>
            <li>
              Use automated tools (bots, scrapers) to access the Service without
              authorization.
            </li>
            <li>
              Attempt to gain unauthorized access to other users&apos; accounts
              or data.
            </li>
            <li>
              Interfere with or disrupt the Service or its infrastructure.
            </li>
            <li>
              Use prompt injection or manipulation techniques to abuse AI
              features.
            </li>
            <li>
              Harass, threaten, or discriminate against other users through the
              platform.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>8. Privacy and Data Protection</SectionHeading>
          <p>
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy" className="text-blue-700 underline">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your personal
            information. By using the Service, you consent to the practices
            described in the Privacy Policy.
          </p>
        </section>

        <section>
          <SectionHeading>9. Recruiter-Jobseeker Interactions</SectionHeading>
          <ul className={listClass}>
            <li>
              Job seekers control what contact information is visible to
              recruiters through privacy settings on shared resume links.
            </li>
            <li>
              Recruiters must use contact information solely for legitimate
              recruitment purposes.
            </li>
            <li>
              SwitchCV is not responsible for communications or agreements made
              between recruiters and job seekers outside the platform.
            </li>
            <li>
              Recruiter contact requests are subject to tier-based limits and
              require job seeker approval.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>10. Intellectual Property</SectionHeading>
          <ul className={listClass}>
            <li>
              You retain ownership of all content you create on the platform.
            </li>
            <li>
              You grant SwitchCV a limited license to store, process, and
              display your content as necessary to provide the Service.
            </li>
            <li>
              The SwitchCV platform, its design, logos, and original content are
              our intellectual property and may not be copied or reproduced
              without permission.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>11. Service Availability</SectionHeading>
          <ul className={listClass}>
            <li>
              We strive to maintain high availability but do not guarantee
              uninterrupted access. The Service may be temporarily unavailable
              for maintenance or updates.
            </li>
            <li>
              AI features depend on third-party providers and may be temporarily
              unavailable. The platform includes fallback mechanisms but cannot
              guarantee AI availability.
            </li>
            <li>
              We reserve the right to modify, suspend, or discontinue features
              with reasonable notice.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>12. Account Termination</SectionHeading>
          <ul className={listClass}>
            <li>
              You may delete your account at any time. Account deletion is
              permanent and removes all associated data.
            </li>
            <li>
              We may suspend or terminate accounts that violate these Terms,
              engage in abuse, or pose a security risk.
            </li>
            <li>
              Upon termination, your right to use the Service ceases
              immediately.
            </li>
          </ul>
        </section>

        <section>
          <SectionHeading>13. Limitation of Liability</SectionHeading>
          <p>
            To the maximum extent permitted by law, SwitchCV and its operators
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the
            Service. This includes but is not limited to loss of employment
            opportunities, data loss, or AI-generated content inaccuracies.
          </p>
          <p>
            Our total aggregate liability shall not exceed the amount you have
            paid us in the 12 months preceding the claim, or $100 USD, whichever
            is greater.
          </p>
        </section>

        <section>
          <SectionHeading>14. Disclaimer of Warranties</SectionHeading>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, whether express or
            implied, including but not limited to implied warranties of
            merchantability, fitness for a particular purpose, and
            non-infringement.
          </p>
        </section>

        <section>
          <SectionHeading>15. Governing Law</SectionHeading>
          <p>
            These Terms shall be governed by and construed in accordance with
            applicable laws. Any disputes arising from these Terms or the
            Service shall be resolved through good-faith negotiation before
            pursuing formal legal remedies.
          </p>
        </section>

        <section>
          <SectionHeading>16. Changes to Terms</SectionHeading>
          <p>
            We may update these Terms from time to time. Material changes will
            be communicated via email or in-app notification. Continued use of
            the Service after changes take effect constitutes acceptance of the
            updated Terms.
          </p>
        </section>

        <section>
          <SectionHeading>17. Contact</SectionHeading>
          <p>For questions about these Terms, contact us at:</p>
          <ul className="list-none space-y-1 mt-2">
            <li>
              Email:{" "}
              <a
                href="mailto:legal@switchcv.com"
                className="text-blue-700 underline"
              >
                legal@switchcv.com
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
          href="/privacy"
          className="text-sm font-mono text-gray-500 hover:text-black underline"
        >
          ← Privacy Policy
        </Link>
      </div>
    </>
  );
}
