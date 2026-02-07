import React from "react";
import { render, screen } from "@testing-library/react";
import { PreviewHeader } from "../PreviewHeader";
import { PreviewContact } from "../PreviewContact";
import { PreviewEducation } from "../PreviewEducation";
import { PreviewExperience } from "../PreviewExperience";
import { PreviewProjects } from "../PreviewProjects";
import { PreviewSkills } from "../PreviewSkills";
import { PreviewSummary } from "../PreviewSummary";

// Mock VisibilityBadge to simplify tests
jest.mock("../../VisibilityControls", () => ({
  VisibilityBadge: ({ value }: { value: string }) => (
    <span data-testid="visibility-badge">{value}</span>
  ),
}));

describe("Preview Components", () => {
  describe("PreviewHeader", () => {
    it("renders title and summary", () => {
      render(
        <PreviewHeader
          profile={{ title: "Software Engineer", summary: "Experienced dev" }}
        />,
      );
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("Experienced dev")).toBeInTheDocument();
    });

    it("renders default title when missing", () => {
      render(<PreviewHeader profile={{}} />);
      expect(screen.getByText("Resume Title")).toBeInTheDocument();
    });
  });

  describe("PreviewContact", () => {
    const mockProfile = {
      contact: {
        email: { value: "test@example.com", visibility: "public" as const },
        phone: { value: "123456789", visibility: "request" as const },
      },
    };

    it("renders email and phone when available", () => {
      render(<PreviewContact profile={mockProfile} />);
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("123456789")).toBeInTheDocument();
      expect(screen.getAllByTestId("visibility-badge")).toHaveLength(2);
    });

    it("renders nothing when no contact info provided", () => {
      const { container } = render(<PreviewContact profile={{}} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PreviewEducation", () => {
    it("renders education list with full details", () => {
      const profile = {
        education: [
          {
            degree: "Degree",
            institution: "Uni",
            startDate: "2020",
            endDate: "2021",
            description: "Some description",
            visibility: "public" as const,
          },
        ],
      };
      render(<PreviewEducation profile={profile} />);
      expect(screen.getByText("Degree")).toBeInTheDocument();
      expect(screen.getByText("Some description")).toBeInTheDocument();
    });

    it("handles missing details", () => {
      const profile = {
        education: [
          {
            degree: "Degree",
            institution: "Uni",
            startDate: "2020",
            visibility: "public" as const,
          },
        ],
      };
      render(<PreviewEducation profile={profile} />);
      expect(screen.getByText("Degree")).toBeInTheDocument();
      expect(screen.queryByText(" - ")).not.toBeInTheDocument();
    });

    it("renders nothing when education is missing", () => {
      const { container } = render(<PreviewEducation profile={{}} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PreviewExperience", () => {
    it("renders experience list with full details", () => {
      const profile = {
        experience: [
          {
            role: "Role",
            company: "Co",
            startDate: "2020",
            endDate: "2021",
            description: "Job desc",
            visibility: "public" as const,
          },
        ],
      };
      render(<PreviewExperience profile={profile} />);
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Job desc")).toBeInTheDocument();
      expect(screen.getByText("2020 - 2021")).toBeInTheDocument();
    });

    it("handles missing description", () => {
      const profile = {
        experience: [
          {
            role: "Role",
            company: "Co",
            startDate: "2020",
            description: "",
            visibility: "public" as const,
          },
        ],
      };
      render(<PreviewExperience profile={profile} />);
      expect(screen.getByText("Role")).toBeInTheDocument();
    });

    it("renders nothing when experience is missing", () => {
      const { container } = render(<PreviewExperience profile={{}} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PreviewProjects", () => {
    it("renders projects list and handles missing id", () => {
      const profile = {
        projects: [
          {
            name: "Project",
            url: "https://foo.com",
            description: "Desc",
            visibility: "public" as const,
          },
        ],
      };
      render(<PreviewProjects profile={profile} />);
      expect(screen.getByText("Project")).toBeInTheDocument();
      expect(screen.getByText("https://foo.com")).toBeInTheDocument();
    });

    it("renders nothing when projects are missing", () => {
      const { container } = render(<PreviewProjects profile={{}} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PreviewSkills", () => {
    it("renders skills list and handles missing id/level", () => {
      const profile = {
        skills: [
          {
            name: "Basic Skill",
            level: "expert",
            visibility: "public" as const,
          },
        ],
      };
      render(<PreviewSkills profile={profile} />);
      expect(screen.getByText("Basic Skill")).toBeInTheDocument();
      expect(screen.getByText("(expert)")).toBeInTheDocument();
    });

    it("renders nothing when skills are missing", () => {
      const { container } = render(<PreviewSkills profile={{}} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PreviewSummary", () => {
    it("renders summary", () => {
      render(<PreviewSummary profile={{ summary: "My bio" }} />);
      expect(screen.getByText("My bio")).toBeInTheDocument();
    });

    it("renders nothing when missing", () => {
      const { container } = render(<PreviewSummary profile={{}} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
