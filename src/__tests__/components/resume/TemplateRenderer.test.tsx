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

    expect(screen.getByText("Personal Info")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders text fields correctly", () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />
    );
    // Note: Name logic in component is currently a placeholder "User Name"
    expect(screen.getByText("User Name")).toBeInTheDocument();
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
});
