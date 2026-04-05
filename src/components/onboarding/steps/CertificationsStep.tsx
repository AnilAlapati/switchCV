import { Certification } from "@/types";
import { FormInput, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

interface CertificationsStepProps {
  certifications: Certification[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Certification>) => void;
  onRemove: (index: number) => void;
}

export function CertificationsStep({
  certifications,
  onAdd,
  onUpdate,
  onRemove,
}: CertificationsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Certifications</h3>
        <button
          onClick={onAdd}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          + Add Certification
        </button>
      </div>

      {certifications.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No certifications added yet. Click &quot;Add Certification&quot; to
          get started.
        </p>
      ) : (
        <div className="space-y-4">
          {certifications.map((cert, index) => (
            <CertificationCard
              key={cert.id || `cert-${index}`}
              index={index}
              certification={cert}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CertificationCardProps {
  index: number;
  certification: Certification;
  onUpdate: (updates: Partial<Certification>) => void;
  onRemove: () => void;
}

function CertificationCard({
  index,
  certification,
  onUpdate,
  onRemove,
}: CertificationCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-gray-900">
          Certification #{index + 1}
        </h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Certification Name"
          type="text"
          value={certification.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ name: e.target.value })
          }
          placeholder="e.g., AWS Solutions Architect"
        />
        <FormInput
          label="Issuing Organization"
          type="text"
          value={certification.issuer}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ issuer: e.target.value })
          }
          placeholder="e.g., Amazon Web Services"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Issue Date"
          type="text"
          value={certification.issueDate ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ issueDate: e.target.value })
          }
          placeholder="e.g., Jan 2023"
        />
        <FormInput
          label="Expiry Date (optional)"
          type="text"
          value={certification.expiryDate ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ expiryDate: e.target.value })
          }
          placeholder="e.g., Jan 2026 or No Expiry"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Credential ID (optional)"
          type="text"
          value={certification.credentialId ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ credentialId: e.target.value })
          }
          placeholder="e.g., ABC-1234567"
        />
        <FormInput
          label="Credential URL (optional)"
          type="url"
          value={certification.credentialUrl ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ credentialUrl: e.target.value })
          }
          placeholder="e.g., https://credly.com/..."
        />
      </div>

      <VisibilityControl
        value={certification.visibility}
        onChange={(v) => onUpdate({ visibility: v })}
      />
    </div>
  );
}
