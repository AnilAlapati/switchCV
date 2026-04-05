import { Award } from "@/types";
import { FormInput, FormTextarea, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

interface AwardsStepProps {
  awards: Award[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Award>) => void;
  onRemove: (index: number) => void;
}

export function AwardsStep({
  awards,
  onAdd,
  onUpdate,
  onRemove,
}: AwardsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Awards &amp; Honors</h3>
        <button
          onClick={onAdd}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          + Add Award
        </button>
      </div>

      {awards.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No awards added yet. Click &quot;Add Award&quot; to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {awards.map((award, index) => (
            <AwardCard
              key={award.id || `award-${index}`}
              index={index}
              award={award}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AwardCardProps {
  index: number;
  award: Award;
  onUpdate: (updates: Partial<Award>) => void;
  onRemove: () => void;
}

function AwardCard({ index, award, onUpdate, onRemove }: AwardCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-gray-900">Award #{index + 1}</h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Award Title"
          type="text"
          value={award.title}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ title: e.target.value })
          }
          placeholder="e.g., Employee of the Year"
        />
        <FormInput
          label="Issuing Organization"
          type="text"
          value={award.issuer}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ issuer: e.target.value })
          }
          placeholder="e.g., Acme Corp"
        />
      </div>

      <div className="mb-4">
        <FormInput
          label="Date (optional)"
          type="text"
          value={award.date ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ date: e.target.value })
          }
          placeholder="e.g., Nov 2023"
        />
      </div>

      <div className="mb-4">
        <FormTextarea
          label="Description (optional)"
          value={award.description ?? ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onUpdate({ description: e.target.value })
          }
          placeholder="Briefly describe the award or recognition..."
          rows={2}
        />
      </div>

      <VisibilityControl
        value={award.visibility}
        onChange={(v) => onUpdate({ visibility: v })}
      />
    </div>
  );
}
