import { render, screen, fireEvent } from "@testing-library/react";
import { ExperienceStep } from "@/components/onboarding/steps/ExperienceStep";
import { Experience, Visibility } from "@/types";

jest.mock("@/components/onboarding/FormComponents", () => ({
  FormInput: ({ label, value, onChange }: any) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input id={label} value={value} onChange={onChange} />
    </div>
  ),
  FormTextarea: ({ label, value, onChange }: any) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <textarea id={label} value={value} onChange={onChange} />
    </div>
  ),
  VisibilityControl: ({ value, onChange }: any) => (
    <button onClick={() => onChange("public")}>Visibility: {value}</button>
  ),
}));

describe("ExperienceStep", () => {
  const mockOnAdd = jest.fn();
  const mockOnUpdate = jest.fn();
  const mockOnRemove = jest.fn();
  const mockExperience: Experience[] = [
    {
      company: "Acme Corp",
      role: "Engineer",
      startDate: "2020",
      endDate: "Present",
      description: "Did stuff",
      visibility: "public" as Visibility,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    render(
      <ExperienceStep
        experience={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText(/No experience added yet/)).toBeInTheDocument();
    expect(screen.getByText("+ Add Experience")).toBeInTheDocument();
  });

  it("calls onAdd when add button is clicked", () => {
    render(
      <ExperienceStep
        experience={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("+ Add Experience"));
    expect(mockOnAdd).toHaveBeenCalled();
  });

  it("renders experience items correctly", () => {
    render(
      <ExperienceStep
        experience={mockExperience}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText("Company Name")).toHaveValue("Acme Corp");
    expect(screen.getByLabelText("Job Title")).toHaveValue("Engineer");
    expect(screen.getByLabelText("Start Date")).toHaveValue("2020");
    expect(screen.getByLabelText("End Date (optional)")).toHaveValue("Present");
    expect(screen.getByLabelText("Description & Achievements")).toHaveValue(
      "Did stuff"
    );
    expect(screen.getByText("Visibility: public")).toBeInTheDocument();
  });

  it("renders experience items with missing optional fields correctly", () => {
    const partialExperience: Experience[] = [
      {
        company: "Acme Corp",
        role: "Engineer",
        startDate: "2020",
        description: "Did stuff",
        visibility: "public" as Visibility,
      },
    ];
    render(
      <ExperienceStep
        experience={partialExperience}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText("End Date (optional)")).toHaveValue("");
  });

  it("calls onUpdate when fields are changed", () => {
    render(
      <ExperienceStep
        experience={mockExperience}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.change(screen.getByLabelText("Company Name"), {
      target: { value: "New Corp" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { company: "New Corp" });

    fireEvent.change(screen.getByLabelText("Job Title"), {
      target: { value: "Senior Engineer" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { role: "Senior Engineer" });

    fireEvent.change(screen.getByLabelText("Start Date"), {
      target: { value: "2021" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { startDate: "2021" });

    fireEvent.change(screen.getByLabelText("End Date (optional)"), {
      target: { value: "2022" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { endDate: "2022" });

    fireEvent.change(screen.getByLabelText("Description & Achievements"), {
      target: { value: "New desc" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { description: "New desc" });

    fireEvent.click(screen.getByText("Visibility: public"));
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { visibility: "public" });
  });

  it("calls onRemove when remove button is clicked", () => {
    render(
      <ExperienceStep
        experience={mockExperience}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("Remove"));
    expect(mockOnRemove).toHaveBeenCalledWith(0);
  });
});
