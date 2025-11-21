import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeProgress } from "@/components/create-resume/ResumeProgress";

describe("ResumeProgress", () => {
  it("renders nothing when progress is 0", () => {
    const { container } = render(<ResumeProgress progress={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders progress bar and percentage", () => {
    render(<ResumeProgress progress={50} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Resume Progress")).toBeInTheDocument();
  });

  it("renders collected fields", () => {
    render(
      <ResumeProgress
        progress={30}
        collectedFields={["Name", "Email"]}
        missingFields={[]}
      />
    );
    expect(screen.getByText("✓ Collected:")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders missing fields (limited to 5)", () => {
    const missingFields = ["Field1", "Field2", "Field3", "Field4", "Field5"];
    render(
      <ResumeProgress
        progress={30}
        collectedFields={[]}
        missingFields={missingFields}
      />
    );
    expect(screen.getByText("⏳ Still need:")).toBeInTheDocument();
    expect(screen.getByText("Field1")).toBeInTheDocument();
    expect(screen.getByText("Field5")).toBeInTheDocument();
  });

  it("does not render missing fields if more than 5", () => {
    const missingFields = [
      "Field1",
      "Field2",
      "Field3",
      "Field4",
      "Field5",
      "Field6",
    ];
    render(
      <ResumeProgress
        progress={30}
        collectedFields={[]}
        missingFields={missingFields}
      />
    );
    expect(screen.queryByText("⏳ Still need:")).not.toBeInTheDocument();
  });

  it("renders completion message when progress is 100", () => {
    render(<ResumeProgress progress={100} />);
    expect(
      screen.getByText("✨ All information collected! Creating your resume...")
    ).toBeInTheDocument();
  });

  it("does not render missing fields if empty", () => {
    render(
      <ResumeProgress
        progress={50}
        collectedFields={["Name"]}
        missingFields={[]}
      />
    );
    expect(screen.queryByText("⏳ Still need:")).not.toBeInTheDocument();
  });

  it("does not render collected fields if empty", () => {
    render(
      <ResumeProgress
        progress={50}
        collectedFields={[]}
        missingFields={["Email"]}
      />
    );
    expect(screen.queryByText("✓ Collected:")).not.toBeInTheDocument();
  });
});
