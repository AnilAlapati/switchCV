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
        {
          id: "title",
          label: "Title",
          type: "text",
          required: true,
          description: "",
        },
        {
          id: "summary",
          label: "Summary",
          type: "markdown",
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
    {
      id: "skills",
      title: "Skills",
      order: 3,
      fields: [
        {
          id: "skills",
          label: "Skills",
          type: "list",
          required: true,
          description: "",
        },
      ],
    },
    {
      id: "education",
      title: "Education",
      order: 4,
      fields: [
        {
          id: "education",
          label: "Education",
          type: "complex_list",
          required: true,
          description: "",
        },
      ],
    },
    {
      id: "projects",
      title: "Projects",
      order: 5,
      fields: [
        {
          id: "projects",
          label: "Projects",
          type: "complex_list",
          required: true,
          description: "",
        },
      ],
    },
    {
      id: "extra",
      title: "Extra info",
      order: 6,
      fields: [
        {
          id: "email",
          label: "Email",
          type: "text",
          required: false,
          description: "",
        },
        {
          id: "phone",
          label: "Phone",
          type: "text",
          required: false,
          description: "",
        },
        {
          id: "location",
          label: "Location",
          type: "text",
          required: false,
          description: "",
        },
        {
          id: "name",
          label: "Name",
          type: "text",
          required: false,
          description: "",
        },
        {
          id: "title",
          label: "Title",
          type: "text",
          required: false,
          description: "",
        },
        {
          id: "summary",
          label: "Summary",
          type: "text",
          required: false,
          description: "",
        },
      ],
    },
    {
      id: "hobbies_section",
      title: "Hobbies",
      order: 7,
      fields: [
        {
          id: "hobbies",
          label: "Hobbies",
          type: "list",
          required: false,
          description: "",
        },
      ],
    },
  ],
};

const mockData: Partial<ResumeProfile> = {
  title: "Software Engineer",
  summary: "A great engineer.",
  personalInfo: {
    name: "John Test",
    title: "Lead Dev",
    location: "Remote",
    linkedin: "li/johntest",
    github: "gh/johntest",
  },
  contact: {
    email: { value: "test@example.com", visibility: "public" },
    phone: { value: "123-456-7890", visibility: "public" },
  },
  skills: ["React", "Jest"],
  hobbies: ["Reading", "Coffee"],
  experience: [
    {
      company: "Tech Corp",
      role: "Developer",
      startDate: "2020",
      description: "Wrote code",
      visibility: "public",
      highlights: ["Built something", "Fixed something"],
    },
  ],
  education: [
    {
      school: "University",
      degree: "BS CS",
      startDate: "2016",
    },
  ],
  projects: [
    {
      name: "Project Alpha",
      role: "Lead Developer",
      subline: "Main Project",
      description: "Cool app",
      technologies: ["React", "Firebase"],
      url: "https://project.com",
    },
  ],
  extra_info: "Extra stuff",
};

describe("TemplateRenderer", () => {
  test("handles 'public' visibility for contact info", () => {
    const publicAccess: ViewerAccessMeta = {
      scope: "public-view",
      contactVisibility: "public",
    };

    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
        viewerAccess={publicAccess}
      />,
    );

    expect(screen.getAllByText("test@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("123-456-7890").length).toBeGreaterThan(0);
  });

  test("handles phone numbers with no digits", () => {
    const dataWithEmptyPhone = {
      ...mockData,
      contact: {
        ...mockData.contact,
        phone: { value: "None", visibility: "public" },
      },
    };

    render(
      <TemplateRenderer
        template={mockTemplate}
        data={dataWithEmptyPhone as ResumeProfile}
        viewerAccess={{ scope: "full", contactVisibility: "full" }}
      />,
    );

    const phoneElement = screen.getAllByText("None")[0];
    expect(phoneElement).toBeInTheDocument();
  });

  it("renders the template sections correctly", () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />,
    );

    // personal_info section is filtered out in the new renderer
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders hero section with title", () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />,
    );
    // Hero section displays the personalInfo.name if present
    expect(screen.getAllByText("John Test")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Lead Dev")[0]).toBeInTheDocument();
  });

  it("renders complex list fields correctly", () => {
    render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />,
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
      />,
    );

    // Header should be present
    expect(screen.getByText("John Test")).toBeInTheDocument();

    // Experience section should NOT be present
    expect(screen.queryByText("Experience")).not.toBeInTheDocument();

    // CTA should be present
    expect(
      screen.getByText("Sign in to View Full Profile"),
    ).toBeInTheDocument();
  });

  it("shows unmasked contact info for approved recruiters", () => {
    const recruiterData = {
      ...mockData,
      contact: {
        email: { value: "private@example.com", visibility: "masked" },
        phone: { value: "987-654-3210", visibility: "masked" },
      },
      personalInfo: {
        email: "private@example.com",
        phone: "987-654-3210",
      },
      viewerAccess: { scope: "full", isMasked: false },
    };

    render(
      <TemplateRenderer
        template={mockTemplate}
        data={recruiterData as ResumeProfile}
      />,
    );

    expect(screen.getAllByText("private@example.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("987-654-3210")[0]).toBeInTheDocument();
  });

  it("keeps contact masked for public preview viewers", () => {
    const maskedData = {
      ...mockData,
      contact: {
        email: { value: "h***@example.com", visibility: "masked" },
        phone: { value: "***-***-9876", visibility: "masked" },
      },
      personalInfo: {
        email: "hidden@example.com",
        phone: "5551239876",
      },
      viewerAccess: {
        scope: "public-preview",
        isMasked: true,
        isSnapshot: true,
      },
    };

    render(
      <TemplateRenderer
        template={mockTemplate}
        data={maskedData as ResumeProfile}
      />,
    );

    expect(screen.getAllByText("h***@example.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("***-***-9876")[0]).toBeInTheDocument();
  });

  it("handles 'request' visibility for contact info", () => {
    const requestData = {
      ...mockData,
      contact: {
        email: { value: "private@example.com", visibility: "request" },
      },
      viewerAccess: { scope: "public", isMasked: true },
    };

    render(
      <TemplateRenderer template={mockTemplate} data={requestData as any} />,
    );

    expect(
      screen.getAllByText("Available upon request")[0],
    ).toBeInTheDocument();
  });

  it("renders all sections when data is provided", () => {
    render(<TemplateRenderer template={mockTemplate} data={mockData as any} />);

    expect(screen.getAllByText("Skills")[0]).toBeInTheDocument();
    expect(screen.getAllByText("React")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Education")[0]).toBeInTheDocument();
    expect(screen.getAllByText("University")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Projects")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Project Alpha")[0]).toBeInTheDocument();

    // Check personal info in hero
    expect(screen.getAllByText("John Test")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Remote")[0]).toBeInTheDocument();
    expect(screen.getAllByText("li/johntest")[0]).toBeInTheDocument();
  });

  it("handles missing sections or empty data gracefully", () => {
    const emptyTemplate = { ...mockTemplate, sections: [] };
    render(
      <TemplateRenderer template={emptyTemplate} data={mockData as any} />,
    );
    expect(screen.queryByText("Skills")).not.toBeInTheDocument();
  });

  it("handles unauthenticated state and CTA in snapshot mode", () => {
    const snapshotData = {
      ...mockData,
      viewerAccess: { isSnapshot: true },
    };

    render(
      <TemplateRenderer
        template={mockTemplate}
        data={snapshotData as any}
        isAuthenticated={false}
      />,
    );

    expect(
      screen.getByText("Sign in to View Full Profile"),
    ).toBeInTheDocument();
  });

  it("handles authenticated state but need request access", () => {
    const snapshotData = {
      ...mockData,
      viewerAccess: { isSnapshot: true },
    };

    render(
      <TemplateRenderer
        template={mockTemplate}
        data={snapshotData as any}
        isAuthenticated={true}
      />,
    );

    expect(screen.getByText("Request Access")).toBeInTheDocument();
  });

  it("renders premium templates like Noir and Editorial", () => {
    const { unmount } = render(
      <TemplateRenderer
        template={{ ...mockTemplate, id: "noir-v1" }}
        data={mockData as ResumeProfile}
      />,
    );
    // Noir splits name
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
    unmount();

    render(
      <TemplateRenderer
        template={{ ...mockTemplate, id: "editorial-v1" }}
        data={mockData as ResumeProfile}
      />,
    );
    expect(screen.getByText("John Test")).toBeInTheDocument();
  });

  it("renders other premium templates like Bento and Masonry", () => {
    const { unmount } = render(
      <TemplateRenderer
        template={{ ...mockTemplate, id: "bento-v1" }}
        data={mockData as ResumeProfile}
      />,
    );
    expect(screen.getByText("John Test")).toBeInTheDocument();
    unmount();

    const { unmount: unmount2 } = render(
      <TemplateRenderer
        template={{ ...mockTemplate, id: "masonry-v1" }}
        data={mockData as ResumeProfile}
      />,
    );
    expect(screen.getByText("John Test")).toBeInTheDocument();
    unmount2();

    render(
      <TemplateRenderer
        template={{ ...mockTemplate, id: "terminal-v1" }}
        data={mockData as ResumeProfile}
      />,
    );
    expect(screen.getByText("John Test")).toBeInTheDocument();
  });

  it("includes github and linkedin when provided", () => {
    const { container } = render(
      <TemplateRenderer
        template={mockTemplate}
        data={mockData as ResumeProfile}
      />,
    );
    expect(screen.getByText("gh/johntest")).toBeInTheDocument();
    expect(screen.getByText("li/johntest")).toBeInTheDocument();
  });

  it("allows full contact for admin-view scope", () => {
    const adminData = {
      ...mockData,
      viewerAccess: { scope: "admin-view" },
      contact: {
        email: { value: "private@test.com", visibility: "request" },
      },
    };

    render(
      <TemplateRenderer template={mockTemplate} data={adminData as any} />,
    );

    expect(screen.getAllByText("private@test.com")[0]).toBeInTheDocument();
  });

  it("handles masked visibility in contact info", () => {
    const maskedData = {
      ...mockData,
      contact: {
        email: { value: "secret@test.com", visibility: "masked" },
      },
    };
    render(
      <TemplateRenderer template={mockTemplate} data={maskedData as any} />,
    );
    // Masked email should show part of it
    expect(screen.getAllByText(/@/)[0]).toBeInTheDocument();
    expect(screen.queryByText("secret@test.com")).not.toBeInTheDocument();
  });

  it("handles invalid phone number in buildContactHref", () => {
    const badPhoneData = {
      ...mockData,
      contact: {
        phone: { value: "no-digits", visibility: "public" },
      },
    };
    render(
      <TemplateRenderer template={mockTemplate} data={badPhoneData as any} />,
    );
    // Just ensure it renders the text at least
    expect(screen.getAllByText("no-digits")[0]).toBeInTheDocument();
  });

  it("covers masked visibility NULL check and other branches", () => {
    const dataMaskedNull = {
      ...mockData,
      personalInfo: { email: "", phone: "" },
      viewerAccess: { isMasked: true },
    };
    render(
      <TemplateRenderer template={mockTemplate} data={dataMaskedNull as any} />,
    );
    // Line 189 should be hit (returns null for each)
    expect(
      screen.queryByText("Available upon request"),
    ).not.toBeInTheDocument();
  });

  it("covers default template routing and general logic", () => {
    const standardTemplate = { ...mockTemplate, id: "standard-v1" };
    render(
      <TemplateRenderer template={standardTemplate} data={mockData as any} />,
    );
    // This should fall through to the general logic and Noir renderer
    expect(screen.getAllByText(/John/).length).toBeGreaterThan(0);
  });

  it("covers contact visibility branches in general logic", () => {
    const standardTemplate = { ...mockTemplate, id: "standard-v1" };

    // Test public with no value
    const dataNoContact = {
      ...mockData,
      contact: {
        email: { value: "", visibility: "public" as const },
        phone: { value: "", visibility: "public" as const },
      },
      personalInfo: { email: "", phone: "" },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataNoContact as any}
      />,
    );

    // Test masked visibility with no value
    const dataMaskedNoValue = {
      ...mockData,
      contact: {
        email: { value: "", visibility: "masked" as const },
      },
      personalInfo: { email: "" },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataMaskedNoValue as any}
      />,
    );

    // Test request visibility (Hits Line 198)
    const dataRequest = {
      ...mockData,
      contact: {
        email: { value: "test@example.com", visibility: "request" as const },
      },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataRequest as any}
      />,
    );
    expect(
      screen.getAllByText("Available upon request").length,
    ).toBeGreaterThan(0);

    // Test phone with no digits in buildContactHref
    const dataNoDigits = {
      ...mockData,
      contact: {
        phone: { value: "...", visibility: "public" as const },
      },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataNoDigits as any}
      />,
    );
  });

  it("handles missing personalInfo and viewerAccess", () => {
    const { getByText } = render(
      <TemplateRenderer
        template={mockTemplate}
        data={{}}
        isAuthenticated={false}
      />,
    );
    expect(getByText("Untitled")).toBeInTheDocument();
  });

  it("covers remaining logic branches", () => {
    const standardTemplate = { ...mockTemplate, id: "standard-v1" };

    // Line 124/127: data.viewerAccess missing or no scope
    const { viewerAccess: _, ...dataNoAccess } = mockData as any;
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={{ ...dataNoAccess, viewerAccess: undefined } as any}
      />,
    );
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={{ ...dataNoAccess, viewerAccess: { isOwner: false } } as any}
      />,
    );

    // Line 126-129: scope branches
    const dataUnauthorized = {
      ...mockData,
      viewerAccess: { scope: "guest" },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataUnauthorized as any}
      />,
    );

    const dataNoScope = {
      ...mockData,
      viewerAccess: { scope: undefined },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataNoScope as any}
      />,
    );

    // Line 162-168: isMaskedView branches (Fixed logic)
    const dataMaskedWithVal = {
      ...mockData,
      personalInfo: { email: "test@example.com" },
      viewerAccess: { isMasked: true },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataMaskedWithVal as any}
      />,
    );
    expect(
      screen.getAllByText(/Available upon request|@/).length,
    ).toBeGreaterThan(0);

    const dataMaskedNoVal = {
      ...mockData,
      personalInfo: { email: "" },
      contact: { email: { value: "", visibility: "masked" } },
      viewerAccess: { isMasked: true },
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataMaskedNoVal as any}
      />,
    );

    // Line 268: getFieldValue default branch (Missing value)
    const templateWithMissingField = {
      ...mockTemplate,
      id: "standard-v1",
      sections: [
        {
          id: "custom",
          title: "Custom",
          order: 10,
          fields: [{ id: "nonexistent", label: "Missing", type: "text" }],
        },
      ],
    };
    render(
      <TemplateRenderer
        template={templateWithMissingField}
        data={mockData as any}
      />,
    );

    // Line 276-277: Hero name/title fallbacks
    const dataNoName = {
      ...mockData,
      personalInfo: { name: "", title: "" },
      title: "Title From Data",
      summary: "Summary line 1. Summary line 2.",
    };
    render(
      <TemplateRenderer template={standardTemplate} data={dataNoName as any} />,
    );
    expect(screen.getAllByText("Title From Data").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Summary line 1").length).toBeGreaterThan(0);

    const dataNothing = {
      ...mockData,
      personalInfo: { name: "", title: "" },
      title: "",
      summary: "",
    };
    render(
      <TemplateRenderer
        template={standardTemplate}
        data={dataNothing as any}
      />,
    );
    expect(screen.getAllByText("Untitled").length).toBeGreaterThan(0);
  });
});
