// src/components/resume/PreviewContact.tsx
import { ResumeProfile } from "@/types";
import { VisibilityBadge } from "../VisibilityControls";

interface PreviewContactProps {
  profile: Partial<ResumeProfile>;
}

export const PreviewContact = ({ profile }: PreviewContactProps) => {
  if (!profile.contact?.email?.value && !profile.contact?.phone?.value) {
    return null;
  }

  return (
    <section className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        📧 Contact
      </h3>
      <div className="space-y-2 text-sm sm:text-base">
        {profile.contact?.email?.value && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">📧</span>
            <span className="text-gray-900 flex-1">
              {profile.contact.email.value}
            </span>
            <VisibilityBadge value={profile.contact.email.visibility} />
          </div>
        )}
        {profile.contact?.phone?.value && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">📱</span>
            <span className="text-gray-900 flex-1">
              {profile.contact.phone.value}
            </span>
            <VisibilityBadge value={profile.contact.phone.visibility} />
          </div>
        )}
      </div>
    </section>
  );
};
