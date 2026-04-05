import { ResumeProfile } from "@/types";

interface ReviewStepProps {
  profile: Partial<ResumeProfile>;
}

/**
 * Step 6: Review
 * Displays a summary of all information before submission
 */
export function ReviewStep({ profile }: ReviewStepProps) {
  const experience = profile.experience || [];
  const education = profile.education || [];
  const skills = profile.skills || [];
  const projects = profile.projects || [];
  const certifications = profile.certifications || [];
  const languages = profile.languages || [];
  const awards = profile.awards || [];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Review Your Information</h3>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-96 overflow-y-auto">
        <div className="space-y-4">
          <ReviewSection
            title="Title & Summary"
            content={
              <>
                <p className="text-gray-700">
                  <strong>Title:</strong> {profile.title || "Not provided"}
                </p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  <strong>Summary:</strong> {profile.summary || "Not provided"}
                </p>
              </>
            }
          />

          <ReviewSection
            title={`Experience (${experience.length})`}
            content={
              experience.length > 0 ? (
                experience.map((exp, i) => (
                  <div
                    key={exp.id || `exp-${i}`}
                    className="ml-4 mb-2 text-sm text-gray-700"
                  >
                    <p>
                      <strong>{exp.role}</strong> at {exp.company} (
                      {exp.startDate} - {exp.endDate || "Present"})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No experience added</p>
              )
            }
          />

          <ReviewSection
            title={`Education (${education.length})`}
            content={
              education.length > 0 ? (
                education.map((edu, i) => (
                  <div
                    key={edu.id || `edu-${i}`}
                    className="ml-4 mb-2 text-sm text-gray-700"
                  >
                    <p>
                      <strong>{edu.degree}</strong> from {edu.institution} (
                      {edu.startDate})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No education added</p>
              )
            }
          />

          <ReviewSection
            title={`Skills (${skills.length})`}
            content={
              skills.length > 0 ? (
                <p className="text-gray-700 text-sm">
                  {skills.map((s) => s.name).join(", ")}
                </p>
              ) : (
                <p className="text-gray-500 text-sm">No skills added</p>
              )
            }
          />

          <ReviewSection
            title={`Projects (${projects.length})`}
            content={
              projects.length > 0 ? (
                projects.map((proj, i) => (
                  <div
                    key={proj.id || `proj-${i}`}
                    className="ml-4 mb-2 text-sm text-gray-700"
                  >
                    <p>
                      <strong>{proj.name}</strong>
                      {proj.url && ` - ${proj.url}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No projects added</p>
              )
            }
          />

          <ReviewSection
            title={`Certifications (${certifications.length})`}
            content={
              certifications.length > 0 ? (
                certifications.map((cert, i) => (
                  <div
                    key={cert.id || `cert-${i}`}
                    className="ml-4 mb-2 text-sm text-gray-700"
                  >
                    <p>
                      <strong>{cert.name}</strong> — {cert.issuer}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No certifications added</p>
              )
            }
          />

          <ReviewSection
            title={`Languages (${languages.length})`}
            content={
              languages.length > 0 ? (
                <p className="text-gray-700 text-sm">
                  {languages
                    .map((l) => `${l.language} (${l.proficiency})`)
                    .join(", ")}
                </p>
              ) : (
                <p className="text-gray-500 text-sm">No languages added</p>
              )
            }
          />

          <ReviewSection
            title={`Awards (${awards.length})`}
            content={
              awards.length > 0 ? (
                awards.map((award, i) => (
                  <div
                    key={award.id || `award-${i}`}
                    className="ml-4 mb-2 text-sm text-gray-700"
                  >
                    <p>
                      <strong>{award.title}</strong> — {award.issuer}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No awards added</p>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

interface ReviewSectionProps {
  title: string;
  content: React.ReactNode;
}

function ReviewSection({ title, content }: ReviewSectionProps) {
  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      {content}
    </div>
  );
}
