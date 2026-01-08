import { Education, Visibility } from "@/types";
import { FormInput, FormTextarea, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

interface EducationStepProps {
  education: Education[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Education>) => void;
  onRemove: (index: number) => void;
}

/**
 * Step 2: Education
 * Handles adding, editing, and removing education entries
 */
export function EducationStep({
  education,
  onAdd,
  onUpdate,
  onRemove,
}: EducationStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Education</h3>
        <button
          onClick={onAdd}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          + Add Education
        </button>
      </div>

      {education.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No education added yet. Click "Add Education" to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {education.map((edu, index) => (
            <EducationCard
              key={edu.id || `edu-${index}`}
              index={index}
              education={edu}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface EducationCardProps {
  index: number;
  education: Education;
  onUpdate: (updates: Partial<Education>) => void;
  onRemove: () => void;
}

function EducationCard({
  index,
  education,
  onUpdate,
  onRemove,
}: EducationCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-gray-900">Education #{index + 1}</h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Institution"
          type="text"
          value={education.institution}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ institution: e.target.value })
          }
          placeholder="e.g., MIT"
        />
        <FormInput
          label="Degree"
          type="text"
          value={education.degree}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ degree: e.target.value })
          }
          placeholder="e.g., Bachelor's in Computer Science"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Start Date"
          type="text"
          value={education.startDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ startDate: e.target.value })
          }
          placeholder="e.g., 2016"
        />
        <FormInput
          label="End Date (optional)"
          type="text"
          value={education.endDate || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ endDate: e.target.value })
          }
          placeholder="e.g., 2020"
        />
      </div>

      <div className="mb-4">
        <FormTextarea
          label="Description (optional)"
          value={education.description || ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onUpdate({ description: e.target.value })
          }
          rows={2}
          placeholder="e.g., GPA, honors, relevant coursework..."
        />
      </div>

      <VisibilityControl
        value={education.visibility}
        onChange={(v: Visibility) => onUpdate({ visibility: v })}
      />
    </div>
  );
}
