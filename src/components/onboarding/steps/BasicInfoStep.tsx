import { ResumeProfile } from "@/types";
import { FormInput, FormTextarea } from "../FormComponents";
import { ChangeEvent } from "react";

interface BasicInfoStepProps {
  profile: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
}

/**
 * Step 0: Basic Information
 * Handles resume title and professional summary
 */
export function BasicInfoStep({ profile, onChange }: BasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Basic Information</h3>
      <FormInput
        label="Resume Title"
        type="text"
        value={profile.title || ""}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange({ title: e.target.value })
        }
        placeholder="e.g., Software Engineer Resume"
      />
      <FormTextarea
        label="Professional Summary"
        value={profile.summary || ""}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          onChange({ summary: e.target.value })
        }
        rows={4}
        placeholder="Brief summary of your professional background..."
      />
    </div>
  );
}
