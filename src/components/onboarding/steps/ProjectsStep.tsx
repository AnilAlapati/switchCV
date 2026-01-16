import { Project, Visibility } from "@/types";
import { FormInput, FormTextarea, VisibilityControl } from "../FormComponents";
import { ChangeEvent } from "react";

interface ProjectsStepProps {
  projects: Project[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<Project>) => void;
  onRemove: (index: number) => void;
}

/**
 * Step 4: Projects
 * Handles adding, editing, and removing project entries
 */
export function ProjectsStep({
  projects,
  onAdd,
  onUpdate,
  onRemove,
}: ProjectsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Projects</h3>
        <button
          onClick={onAdd}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          + Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No projects added yet. Click "Add Project" to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id || `proj-${index}`}
              index={index}
              project={project}
              onUpdate={(updates) => onUpdate(index, updates)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectCardProps {
  index: number;
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  onRemove: () => void;
}

function ProjectCard({ index, project, onUpdate, onRemove }: ProjectCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-gray-900">Project #{index + 1}</h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Project Name"
          type="text"
          value={project.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ name: e.target.value })
          }
          placeholder="e.g., E-commerce Platform"
        />
        <FormInput
          label="Project URL (optional)"
          type="url"
          value={project.url || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onUpdate({ url: e.target.value })
          }
          placeholder="e.g., https://github.com/..."
        />
      </div>

      <div className="mb-4">
        <FormTextarea
          label="Description"
          value={project.description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onUpdate({ description: e.target.value })
          }
          rows={3}
          placeholder="Describe the project, technologies used, and your role..."
        />
      </div>

      <VisibilityControl
        value={project.visibility}
        onChange={(v: Visibility) => onUpdate({ visibility: v })}
      />
    </div>
  );
}
