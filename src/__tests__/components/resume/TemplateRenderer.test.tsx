import React from "react";
import { render, screen } from "@testing-library/react";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { ResumeTemplate, ResumeProfile } from "@/types";

const mockTemplate: ResumeTemplate = {
  id: "test-template",
  name: "Test Template",
  description: "A test template",
  sections: [
    {
      id: "personal_info",
      title: "Personal Info",
      order: 1,
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          required: true,
          description: "",
        },
      ],
    },
    {
      id: "experience",
      title: "Experience",
      order: 2,
      fields: [
        {
          id: "experience",
          label: "Experience",
          type: "complex_list",
          required: true,
          description: "",
        },
      ],
    },
  ],
};

const mockData: Partial<ResumeProfile> = {
  title: "Software Engineer",
  contact: {
    email: { value: "test@example.com", visibility: "public" },
    phone: { value: "123-456-7890", visibility: "public" },
  },
  experience: [
    {
      company: "Tech Corp",
      role: "Developer",
      startDate: "2020",
      description: "Wrote code",
      visibility: "public",
    },
  ],
};

describe("TemplateRenderer", () => {
  it("renders the template sections correctly", () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />
    );

    // personal_info section is filtered out in the new renderer
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders hero section with title", () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />
    );
    // New hero section displays the data.title
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("renders complex list fields correctly", () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />
    );
    expect(screen.getByText("Tech Corp")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
  });

  it("renders only header in snapshot mode", () => {
    const snapshotData = {
      ...mockData,
      viewerAccess: { isSnapshot: true },
    };

    render(
      <TemplateRenderer
        template={mockTemplate}
        data={snapshotData as ResumeProfile}
      />
    );

    // Header should be present
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();

    // Experience section should NOT be present
    expect(screen.queryByText("Experience")).not.toBeInTheDocument();

    // CTA should be present
    expect(
      screen.getByText("Sign in to View Full Profile")
    ).toBeInTheDocument();
  });
});
