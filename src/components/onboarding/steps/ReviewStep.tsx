import { ResumeProfile } from "@/types";

interface ReviewStepProps {
  profile: Partial<ResumeProfile>;
}

/**
 * Step 6: Review
 * Displays a summary of all information before submission
 */
export function ReviewStep({ profile }: ReviewStepProps) {
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
            title={`Experience (${(profile.experience || []).length})`}
            content={
              (profile.experience || []).length > 0 ? (
                (profile.experience || []).map((exp, i) => (
                  <div key={i} className="ml-4 mb-2 text-sm text-gray-700">
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
            title={`Education (${(profile.education || []).length})`}
            content={
              (profile.education || []).length > 0 ? (
                (profile.education || []).map((edu, i) => (
                  <div key={i} className="ml-4 mb-2 text-sm text-gray-700">
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
            title={`Skills (${(profile.skills || []).length})`}
            content={
              (profile.skills || []).length > 0 ? (
                <p className="text-gray-700 text-sm">
                  {(profile.skills || []).map((s) => s.name).join(", ")}
                </p>
              ) : (
                <p className="text-gray-500 text-sm">No skills added</p>
              )
            }
          />

          <ReviewSection
            title={`Projects (${(profile.projects || []).length})`}
            content={
              (profile.projects || []).length > 0 ? (
                (profile.projects || []).map((proj, i) => (
                  <div key={i} className="ml-4 mb-2 text-sm text-gray-700">
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
