"use client";

import type { ResumeProfile } from "@/types";
import { hasRequestItems } from "@/lib/utils/resumeVisibility";

interface ResumeCertificationsSectionProps {
  certifications: NonNullable<ResumeProfile["certifications"]>;
}

export function ResumeCertificationsSection({
  certifications,
}: ResumeCertificationsSectionProps) {
  const publicCerts = certifications.filter((c) => c.visibility === "public");
  const hasRequests = hasRequestItems(certifications);

  if (publicCerts.length === 0 && !hasRequests) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-8 font-semibold">
        Certifications
      </h2>
      <div className="space-y-8">
        {publicCerts.length > 0 ? (
          publicCerts.map((cert, index) => (
            <div key={cert.id || `cert-${index}`} className="group">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                    {cert.name}
                  </h3>
                  <p className="text-yellow-400 font-semibold text-base mt-1">
                    {cert.issuer}
                  </p>
                </div>
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    Verify →
                  </a>
                )}
              </div>
              <p className="text-slate-400 text-xs mb-1">
                {cert.issueDate && `Issued ${cert.issueDate}`}
                {cert.issueDate && cert.expiryDate && " · "}
                {cert.expiryDate && `Expires ${cert.expiryDate}`}
              </p>
              {cert.credentialId && (
                <p className="text-slate-500 text-xs">
                  Credential ID: {cert.credentialId}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-sm italic">
            Certifications are kept private.
          </p>
        )}
      </div>

      {hasRequests && (
        <div className="mt-8 px-4 py-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30 backdrop-blur">
          <p className="text-yellow-300 text-sm font-medium">
            Some certifications are available upon request.
          </p>
        </div>
      )}
    </section>
  );
}
