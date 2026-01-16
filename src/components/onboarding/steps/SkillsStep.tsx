import { Skill, Visibility } from "@/types";
import { FormInput, FormSelect, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

interface SkillsStepProps {
  skills: Skill[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Skill>) => void;
  onRemove: (index: number) => void;
}

/**
 * Step 3: Skills
 * Handles adding, editing, and removing skill entries
 */
export function SkillsStep({
  skills,
  onAdd,
  onUpdate,
  onRemove,
}: SkillsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Skills</h3>
        <button
          onClick={onAdd}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          + Add Skill
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No skills added yet. Click "Add Skill" to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill, index) => (
            <SkillCard
              key={skill.id || `skill-${index}`}
              index={index}
              skill={skill}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SkillCardProps {
  index: number;
  skill: Skill;
  onUpdate: (updates: Partial<Skill>) => void;
  onRemove: () => void;
}

function SkillCard({ index, skill, onUpdate, onRemove }: SkillCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium text-gray-900">Skill #{index + 1}</h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="mb-3">
        <FormInput
          label="Skill Name"
          type="text"
          value={skill.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ name: e.target.value })
          }
          placeholder="e.g., React, Python, Leadership"
        />
      </div>

      <div className="mb-3">
        <FormSelect
          label="Proficiency Level"
          value={skill.level}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onUpdate({ level: e.target.value })
          }
          options={[
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
            { value: "expert", label: "Expert" },
          ]}
        />
      </div>

      <VisibilityControl
        value={skill.visibility}
        onChange={(v: Visibility) => onUpdate({ visibility: v })}
      />
    </div>
  );
}
