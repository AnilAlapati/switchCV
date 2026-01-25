import React from "react";
import { render, screen } from "@testing-library/react";
import { LegacyResumeRenderer } from "../LegacyResumeRenderer";

describe("LegacyResumeRenderer", () => {
  const mockResume = {
    title: "Old Style Resume",
    numericId: "12345",
    personalInfo: {
      name: "Old Joe",
      email: "joe@old.com",
      phone: "555-5555",
      location: "Vintage City",
    },
    summary: "Experienced in legacy systems.",
    experience: [
      {
        title: "Mainframe Dev",
        company: "Big Blue",
        duration: "1980 - 1990",
        description: "COBOL programming",
        achievements: ["Maintained 1M lines of code"],
      },
    ],
    education: [
      {
        institution: "Legacy University",
        degree: "BS Mathematics",
        year: "1978",
      },
    ],
    skills: ["COBOL", { name: "Fortran" }, "JCL"],
  };

  it("renders personal information", () => {
    render(<LegacyResumeRenderer resume={mockResume} />);
    expect(screen.getByText("Old Joe")).toBeInTheDocument();
    expect(screen.getByText(/joe@old.com/)).toBeInTheDocument();
    expect(screen.getByText(/555-5555/)).toBeInTheDocument();
    expect(screen.getByText(/Vintage City/)).toBeInTheDocument();
  });

  it("renders summary section", () => {
    render(<LegacyResumeRenderer resume={mockResume} />);
    expect(screen.getByText("Professional Summary")).toBeInTheDocument();
    expect(
      screen.getByText("Experienced in legacy systems."),
    ).toBeInTheDocument();
  });

  it("renders experience items", () => {
    render(<LegacyResumeRenderer resume={mockResume} />);
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Mainframe Dev")).toBeInTheDocument();
    expect(screen.getByText("Big Blue")).toBeInTheDocument();
    expect(screen.getByText("Maintained 1M lines of code")).toBeInTheDocument();
  });

  it("renders education items and major", () => {
    const resumeWithMajor = {
      ...mockResume,
      education: [
        {
          institution: "Tech High",
          degree: "Diploma",
          year: "1974",
          major: "Science",
        },
      ],
    };
    render(<LegacyResumeRenderer resume={resumeWithMajor} />);
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("Science", { exact: false })).toBeInTheDocument();
  });

  it("renders skills list", () => {
    render(<LegacyResumeRenderer resume={mockResume} />);
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("COBOL")).toBeInTheDocument();
    expect(screen.getByText("Fortran")).toBeInTheDocument();
    expect(screen.getByText("JCL")).toBeInTheDocument();
  });

  it("handles missing optional sections and title fallback", () => {
    const minimalResume = {
      title: "Title Fallback",
      personalInfo: {},
    };
    render(<LegacyResumeRenderer resume={minimalResume as any} />);
    expect(screen.getByText("Title Fallback")).toBeInTheDocument();
    expect(screen.queryByText("Professional Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Experience")).not.toBeInTheDocument();
  });
});
