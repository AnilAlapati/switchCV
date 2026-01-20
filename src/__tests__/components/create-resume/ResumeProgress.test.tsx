import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResumeProgress } from "@/components/create-resume/ResumeProgress";

describe("ResumeProgress", () => {
  it("renders nothing when progress is 0", () => {
    const { container } = render(<ResumeProgress progress={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders progress bar and percentage", () => {
    render(<ResumeProgress progress={50} />);
    // Component starts minimized, showing only percentage
    const percentageElements = screen.getAllByText(
      (content, node) => node?.textContent?.replace(/\s/g, "") === "50%"
    );
    expect(percentageElements.length).toBeGreaterThan(0);
    // "Resume Progress" text only shows when expanded
    expect(screen.queryByText("Resume Progress")).not.toBeInTheDocument();
  });

  it("renders collected fields when expanded", async () => {
    const { container } = render(
      <ResumeProgress
        progress={30}
        collectedFields={["Name", "Email"]}
        missingFields={[]}
      />
    );
    // Click to expand
    const expandButton = screen.getByRole("button", {
      name: /expand resume progress/i,
    });
    await fireEvent.click(expandButton);

    // Now the fields should be visible
    await waitFor(() => {
      expect(screen.getByText("Collected")).toBeInTheDocument();
    });
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders missing fields (limited to 5) when expanded", async () => {
    const missingFields = ["Field1", "Field2", "Field3", "Field4", "Field5"];
    render(
      <ResumeProgress
        progress={30}
        collectedFields={[]}
        missingFields={missingFields}
      />
    );
    // Click to expand
    const expandButton = screen.getByRole("button", {
      name: /expand resume progress/i,
    });
    await fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText("Still Need")).toBeInTheDocument();
    });
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
    expect(screen.queryByText("Still Need")).not.toBeInTheDocument();
  });

  it("renders completion message when progress is 100 and expanded", async () => {
    render(<ResumeProgress progress={100} />);
    // Click to expand
    const expandButton = screen.getByRole("button", {
      name: /expand resume progress/i,
    });
    await fireEvent.click(expandButton);

    await waitFor(() => {
      expect(
        screen.getByText("✨ Creating your resume...")
      ).toBeInTheDocument();
    });
  });

  it("does not render missing fields if empty", () => {
    render(
      <ResumeProgress
        progress={50}
        collectedFields={["Name"]}
        missingFields={[]}
      />
    );
    expect(screen.queryByText("Still Need")).not.toBeInTheDocument();
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
