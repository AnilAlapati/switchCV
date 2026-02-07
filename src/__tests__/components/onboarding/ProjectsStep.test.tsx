import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectsStep } from "@/components/onboarding/steps/ProjectsStep";
import { Project, Visibility } from "@/types";
import type { ChangeEventHandler } from "react";

jest.mock("@/components/onboarding/FormComponents", () => ({
  FormInput: ({ label, value, onChange }: { label: string; value: string; onChange: ChangeEventHandler<HTMLInputElement> }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input id={label} value={value} onChange={onChange} />
    </div>
  ),
  FormTextarea: ({ label, value, onChange }: { label: string; value: string; onChange: ChangeEventHandler<HTMLTextAreaElement> }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <textarea id={label} value={value} onChange={onChange} />
    </div>
  ),
  VisibilityControl: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <button onClick={() => onChange("public")}>Visibility: {value}</button>
  ),
}));

describe("ProjectsStep", () => {
  const mockOnAdd = jest.fn();
  const mockOnUpdate = jest.fn();
  const mockOnRemove = jest.fn();
  const mockProjects: Project[] = [
    {
      name: "Project A",
      url: "https://example.com",
      description: "Cool project",
      visibility: "public" as Visibility,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    render(
      <ProjectsStep
        projects={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText(/No projects added yet/)).toBeInTheDocument();
    expect(screen.getByText("+ Add Project")).toBeInTheDocument();
  });

  it("calls onAdd when add button is clicked", () => {
    render(
      <ProjectsStep
        projects={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("+ Add Project"));
    expect(mockOnAdd).toHaveBeenCalled();
  });

  it("renders project items correctly", () => {
    render(
      <ProjectsStep
        projects={mockProjects}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText("Project Name")).toHaveValue("Project A");
    expect(screen.getByLabelText("Project URL (optional)")).toHaveValue(
      "https://example.com"
    );
    expect(screen.getByLabelText("Description")).toHaveValue("Cool project");
    expect(screen.getByText("Visibility: public")).toBeInTheDocument();
  });

  it("renders project items with missing optional fields correctly", () => {
    const partialProject: Project[] = [
      {
        name: "Project A",
        description: "Cool project",
        visibility: "public" as Visibility,
      },
    ];
    render(
      <ProjectsStep
        projects={partialProject}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText("Project URL (optional)")).toHaveValue("");
  });

  it("calls onUpdate when fields are changed", () => {
    render(
      <ProjectsStep
        projects={mockProjects}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.change(screen.getByLabelText("Project Name"), {
      target: { value: "New Project" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { name: "New Project" });

    fireEvent.change(screen.getByLabelText("Project URL (optional)"), {
      target: { value: "https://new.com" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { url: "https://new.com" });

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "New desc" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { description: "New desc" });

    fireEvent.click(screen.getByText("Visibility: public"));
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { visibility: "public" });
  });

  it("calls onRemove when remove button is clicked", () => {
    render(
      <ProjectsStep
        projects={mockProjects}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("Remove"));
    expect(mockOnRemove).toHaveBeenCalledWith(0);
  });
});
