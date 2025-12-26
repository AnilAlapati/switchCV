import { render, screen, fireEvent } from "@testing-library/react";
import { EducationStep } from "@/components/onboarding/steps/EducationStep";
import { Education, Visibility } from "@/types";

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

describe("EducationStep", () => {
  const mockOnAdd = jest.fn();
  const mockOnUpdate = jest.fn();
  const mockOnRemove = jest.fn();
  const mockEducation: Education[] = [
    {
      institution: "MIT",
      degree: "BS CS",
      startDate: "2016",
      endDate: "2020",
      description: "GPA 4.0",
      visibility: "public" as Visibility,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    render(
      <EducationStep
        education={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText(/No education added yet/)).toBeInTheDocument();
    expect(screen.getByText("+ Add Education")).toBeInTheDocument();
  });

  it("calls onAdd when add button is clicked", () => {
    render(
      <EducationStep
        education={[]}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("+ Add Education"));
    expect(mockOnAdd).toHaveBeenCalled();
  });

  it("renders education items correctly", () => {
    render(
      <EducationStep
        education={mockEducation}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText("Institution")).toHaveValue("MIT");
    expect(screen.getByLabelText("Degree")).toHaveValue("BS CS");
    expect(screen.getByLabelText("Start Date")).toHaveValue("2016");
    expect(screen.getByLabelText("End Date (optional)")).toHaveValue("2020");
    expect(screen.getByLabelText("Description (optional)")).toHaveValue(
      "GPA 4.0"
    );
    expect(screen.getByText("Visibility: public")).toBeInTheDocument();
  });

  it("renders education items with missing optional fields correctly", () => {
    const partialEducation: Education[] = [
      {
        institution: "MIT",
        degree: "BS CS",
        startDate: "2016",
        visibility: "public" as Visibility,
      },
    ];
    render(
      <EducationStep
        education={partialEducation}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText("End Date (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Description (optional)")).toHaveValue("");
  });

  it("calls onUpdate when fields are changed", () => {
    render(
      <EducationStep
        education={mockEducation}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.change(screen.getByLabelText("Institution"), {
      target: { value: "Stanford" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { institution: "Stanford" });

    fireEvent.change(screen.getByLabelText("Degree"), {
      target: { value: "MS CS" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { degree: "MS CS" });

    fireEvent.change(screen.getByLabelText("Start Date"), {
      target: { value: "2021" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { startDate: "2021" });

    fireEvent.change(screen.getByLabelText("End Date (optional)"), {
      target: { value: "2023" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { endDate: "2023" });

    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "New desc" },
    });
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { description: "New desc" });

    fireEvent.click(screen.getByText("Visibility: public"));
    expect(mockOnUpdate).toHaveBeenCalledWith(0, { visibility: "public" });
  });

  it("calls onRemove when remove button is clicked", () => {
    render(
      <EducationStep
        education={mockEducation}
        onAdd={mockOnAdd}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.click(screen.getByText("Remove"));
    expect(mockOnRemove).toHaveBeenCalledWith(0);
  });
});
