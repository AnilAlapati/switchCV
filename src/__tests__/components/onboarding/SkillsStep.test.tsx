import { render, screen, fireEvent } from "@testing-library/react";
import { SkillsStep } from "@/components/onboarding/steps/SkillsStep";
import { Skill, Visibility } from "@/types";

jest.mock("@/components/onboarding/FormComponents", () => ({
  FormInput: ({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <input aria-label={label} value={value} onChange={onChange} />
  ),
  FormSelect: ({ label, value, onChange, options }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: Array<{ value: string; label: string }> }) => (
    <select aria-label={label} value={value} onChange={onChange}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
  VisibilityControl: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <button onClick={() => onChange("public")}>Visibility: {value}</button>
  ),
}));

describe("SkillsStep", () => {
  const mockOnAdd = jest.fn();
  const mockOnUpdate = jest.fn();
  const mockOnRemove = jest.fn();
  const mockSkills: Skill[] = [
    {
      name: "React",
      level: "advanced",
      visibility: "public" as Visibility,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    render(
      <SkillsStep
        skills={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText(/No skills added yet/)).toBeInTheDocument();
    expect(screen.getByText("+ Add Skill")).toBeInTheDocument();
  });

  it("calls onAdd when add button is clicked", () => {
    render(
      <SkillsStep
        skills={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("+ Add Skill"));
    expect(mockOnAdd).toHaveBeenCalled();
  });

  it("renders skill items correctly", () => {
    render(
      <SkillsStep
        skills={mockSkills}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText("Skill Name")).toHaveValue("React");
    expect(screen.getByLabelText("Proficiency Level")).toHaveValue("advanced");
    expect(screen.getByText("Visibility: public")).toBeInTheDocument();
  });

  it("calls onUpdate when fields are changed", () => {
    render(
      <SkillsStep
        skills={mockSkills}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.change(screen.getByLabelText("Skill Name"), {
      target: { value: "TypeScript" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { name: "TypeScript" });

    fireEvent.change(screen.getByLabelText("Proficiency Level"), {
      target: { value: "expert" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { level: "expert" });

    fireEvent.click(screen.getByText("Visibility: public"));
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { visibility: "public" });
  });

  it("calls onRemove when remove button is clicked", () => {
    render(
      <SkillsStep
        skills={mockSkills}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("Remove"));
    expect(mockOnRemove).toHaveBeenCalledWith(0);
  });
});
