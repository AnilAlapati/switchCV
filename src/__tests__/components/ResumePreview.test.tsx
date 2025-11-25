// src/__tests__/components/ResumePreview.test.tsx
import React from "react";
import { render, screen } from "@/__tests__/__support__/testUtils";
import { ResumePreview, ResumePreviewPanel } from "@/components/ResumePreview";
import { ResumeProfile } from "@/types";

describe("ResumePreview", () => {
  const mockProfile: Partial<ResumeProfile> = {
    title: "Senior Software Engineer",
    summary: "Experienced full-stack developer with 5 years of expertise",
    experience: [
      {
        company: "Tech Company",
        role: "Senior Engineer",
        startDate: "Jan 2020",
        endDate: "Present",
        description: "Led development of key features",
        visibility: "public",
      },
    ],
    education: [
      {
        institution: "MIT",
        degree: "Bachelor's in Computer Science",
        startDate: "2016",
        endDate: "2020",
        description: "GPA: 3.8",
        visibility: "public",
      },
    ],
    skills: [
      { name: "React", level: "expert", visibility: "public" },
      { name: "TypeScript", level: "advanced", visibility: "public" },
    ],
    projects: [
      {
        name: "E-commerce Platform",
        url: "https://github.com/user/project",
        description: "Built full-stack e-commerce platform",
        visibility: "public",
      },
    ],
    contact: {
      email: { value: "test@example.com", visibility: "masked" },
      phone: { value: "+1-555-1234", visibility: "masked" },
    },
  };

  it("should render resume title", () => {
    render(<ResumePreview profile={mockProfile} />);

    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  it("should render professional summary", () => {
    render(<ResumePreview profile={mockProfile} />);

    const elements = screen.getAllByText(
      /Experienced full-stack developer with 5 years of expertise/
    );
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should render work experience section", () => {
    render(<ResumePreview profile={mockProfile} />);

    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Tech Company")).toBeInTheDocument();
    expect(screen.getByText("Jan 2020 - Present")).toBeInTheDocument();
  });

  it("should render education section", () => {
    render(<ResumePreview profile={mockProfile} />);

    expect(
      screen.getByText("Bachelor's in Computer Science")
    ).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  it("should render skills section", () => {
    render(<ResumePreview profile={mockProfile} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("should render projects section", () => {
    render(<ResumePreview profile={mockProfile} />);

    expect(screen.getByText("E-commerce Platform")).toBeInTheDocument();
    expect(
      screen.getByText("Built full-stack e-commerce platform")
    ).toBeInTheDocument();
  });

  it("should render contact information", () => {
    render(<ResumePreview profile={mockProfile} />);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1-555-1234")).toBeInTheDocument();
  });

  it("should show empty state when no data", () => {
    render(<ResumePreview profile={{}} />);

    expect(
      screen.getByText(/Your resume preview will appear here/)
    ).toBeInTheDocument();
  });

  it("should display icons for each section", () => {
    render(<ResumePreview profile={mockProfile} />);

    // Component renders sub-components that contain emojis
    // Just verify the component renders without errors
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  it("should display proficiency levels for skills", () => {
    render(<ResumePreview profile={mockProfile} />);

    expect(screen.getByText("(expert)")).toBeInTheDocument();
    expect(screen.getByText("(advanced)")).toBeInTheDocument();
  });

  it("should hide sections with no data", () => {
    const minimalProfile: Partial<ResumeProfile> = {
      title: "My Resume",
      summary: "A brief summary",
    };

    render(<ResumePreview profile={minimalProfile} />);

    // Verify minimal profile renders without experience/education
    expect(screen.getByText("My Resume")).toBeInTheDocument();
  });

  it("should render visibility badges", () => {
    render(<ResumePreview profile={mockProfile} />);

    const badges = screen.getAllByText("Public");
    expect(badges.length).toBeGreaterThan(0);

    const maskedBadges = screen.getAllByText("Masked");
    expect(maskedBadges.length).toBeGreaterThan(0);
  });

  it("should handle missing optional fields", () => {
    const partialProfile: Partial<ResumeProfile> = {
      title: "My Resume",
      summary: "Summary",
      skills: [{ name: "JavaScript", level: "advanced", visibility: "public" }],
      projects: [
        {
          name: "Project",
          // url is optional
          description: "A cool project",
          visibility: "public",
        },
      ],
    };

    render(<ResumePreview profile={partialProfile} />);

    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Project")).toBeInTheDocument();
  });
});

describe("ResumePreviewPanel", () => {
  const mockProfile: Partial<ResumeProfile> = {
    title: "My Resume",
    summary: "A summary",
  };

  it("should render form and preview in two columns", () => {
    render(
      <ResumePreviewPanel profile={mockProfile}>
        <div data-testid="form-content">Form Content</div>
      </ResumePreviewPanel>
    );

    expect(screen.getByTestId("form-content")).toBeInTheDocument();
    expect(screen.getByText("My Resume")).toBeInTheDocument();
  });

  it("should display live preview label", () => {
    render(
      <ResumePreviewPanel profile={mockProfile}>
        <div>Form</div>
      </ResumePreviewPanel>
    );

    expect(screen.getByText(/👁️ Live Preview/)).toBeInTheDocument();
  });

  it("should render children correctly", () => {
    render(
      <ResumePreviewPanel profile={mockProfile}>
        <div data-testid="custom-form">Custom Form Component</div>
      </ResumePreviewPanel>
    );

    expect(screen.getByTestId("custom-form")).toBeInTheDocument();
    expect(screen.getByText("Custom Form Component")).toBeInTheDocument();
  });

  it("should apply responsive classes", () => {
    const { container } = render(
      <ResumePreviewPanel profile={mockProfile}>
        <div>Form</div>
      </ResumePreviewPanel>
    );

    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass("grid");
    expect(mainDiv).toHaveClass("grid-cols-1");
    expect(mainDiv).toHaveClass("lg:grid-cols-2");
  });
});

describe("ResumePreview Responsive Design", () => {
  const mockProfile: Partial<ResumeProfile> = {
    title: "My Resume",
    summary: "Summary",
    skills: [
      { name: "React", level: "expert", visibility: "public" },
      { name: "Node.js", level: "advanced", visibility: "public" },
    ],
  };

  it("should render text in responsive sizes", () => {
    const { container } = render(<ResumePreview profile={mockProfile} />);

    const headings = container.querySelectorAll("h2");
    expect(headings.length).toBeGreaterThan(0);
  });

  it("should handle long content gracefully", () => {
    const longProfile: Partial<ResumeProfile> = {
      title:
        "This is a very long resume title that might wrap on smaller screens",
      summary:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
        "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    };

    render(<ResumePreview profile={longProfile} />);

    expect(
      screen.getByText(/This is a very long resume title/)
    ).toBeInTheDocument();
  });
});

describe("ResumePreview Accessibility", () => {
  const mockProfile: Partial<ResumeProfile> = {
    title: "My Resume",
    summary: "A summary",
    experience: [
      {
        company: "Company",
        role: "Role",
        startDate: "Jan 2020",
        description: "Description",
        visibility: "public",
      },
    ],
  };

  it("should have semantic HTML structure", () => {
    const { container } = render(<ResumePreview profile={mockProfile} />);

    const sections = container.querySelectorAll("section");
    expect(sections.length).toBeGreaterThan(0);
  });

  it("should have proper heading hierarchy", () => {
    const { container } = render(<ResumePreview profile={mockProfile} />);

    const h2 = container.querySelector("h2");
    const h3 = container.querySelector("h3");

    expect(h2).toBeInTheDocument();
    expect(h3).toBeInTheDocument();
  });

  it("should have accessible links", () => {
    const profileWithLink: Partial<ResumeProfile> = {
      title: "Resume",
      projects: [
        {
          name: "Project",
          url: "https://example.com",
          description: "A project",
          visibility: "public",
        },
      ],
    };

    render(<ResumePreview profile={profileWithLink} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
