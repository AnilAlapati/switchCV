import { Language } from "@/types";
import { FormInput, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

const PROFICIENCY_OPTIONS: Language["proficiency"][] = [
  "native",
  "fluent",
  "professional",
  "conversational",
  "basic",
];

interface LanguagesStepProps {
  languages: Language[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Language>) => void;
  onRemove: (index: number) => void;
}

export function LanguagesStep({
  languages,
  onAdd,
  onUpdate,
  onRemove,
}: LanguagesStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Languages</h3>
        <button
          onClick={onAdd}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          + Add Language
        </button>
      </div>

      {languages.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No languages added yet. Click &quot;Add Language&quot; to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {languages.map((lang, index) => (
            <LanguageCard
              key={lang.id || `lang-${index}`}
              index={index}
              language={lang}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LanguageCardProps {
  index: number;
  language: Language;
  onUpdate: (updates: Partial<Language>) => void;
  onRemove: () => void;
}

function LanguageCard({
  index,
  language,
  onUpdate,
  onRemove,
}: LanguageCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-gray-900">Language #{index + 1}</h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Language"
          type="text"
          value={language.language}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ language: e.target.value })
          }
          placeholder="e.g., Spanish"
        />
        <div>
          <label
            htmlFor={`proficiency-${index}`}
            className="block text-sm font-medium text-gray-700"
          >
            Proficiency
          </label>
          <select
            id={`proficiency-${index}`}
            value={language.proficiency}
            onChange={(e) =>
              onUpdate({
                proficiency: e.target.value as Language["proficiency"],
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {PROFICIENCY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <VisibilityControl
        value={language.visibility}
        onChange={(v) => onUpdate({ visibility: v })}
      />
    </div>
  );
}
