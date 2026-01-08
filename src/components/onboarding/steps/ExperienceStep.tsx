import { Experience, Visibility } from "@/types";
import { FormInput, FormTextarea, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

interface ExperienceStepProps {
  experience: Experience[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Experience>) => void;
  onRemove: (index: number) => void;
}

/**
 * Step 1: Work Experience
 * Handles adding, editing, and removing work experience entries
 */
export function ExperienceStep({
  experience,
  onAdd,
  onUpdate,
  onRemove,
}: ExperienceStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Work Experience</h3>
        <button
          onClick={onAdd}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          + Add Experience
        </button>
      </div>

      {experience.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No experience added yet. Click "Add Experience" to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {experience.map((exp, index) => (
            <ExperienceCard
              key={exp.id || `exp-${index}`}
              index={index}
              experience={exp}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ExperienceCardProps {
  index: number;
  experience: Experience;
  onUpdate: (updates: Partial<Experience>) => void;
  onRemove: () => void;
}

function ExperienceCard({
  index,
  experience,
  onUpdate,
  onRemove,
}: ExperienceCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-gray-900">Experience #{index + 1}</h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Company Name"
          type="text"
          value={experience.company}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ company: e.target.value })
          }
          placeholder="e.g., Acme Corp"
        />
        <FormInput
          label="Job Title"
          type="text"
          value={experience.role}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ role: e.target.value })
          }
          placeholder="e.g., Senior Software Engineer"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Start Date"
          type="text"
          value={experience.startDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ startDate: e.target.value })
          }
          placeholder="e.g., Jan 2020"
        />
        <FormInput
          label="End Date (optional)"
          type="text"
          value={experience.endDate || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ endDate: e.target.value })
          }
          placeholder="e.g., Present"
        />
      </div>

      <div className="mb-4">
        <FormTextarea
          label="Description & Achievements"
          value={experience.description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onUpdate({ description: e.target.value })
          }
          rows={3}
          placeholder="Describe your key responsibilities and achievements..."
        />
      </div>

      <VisibilityControl
        value={experience.visibility}
        onChange={(v: Visibility) => onUpdate({ visibility: v })}
      />
    </div>
  );
}
