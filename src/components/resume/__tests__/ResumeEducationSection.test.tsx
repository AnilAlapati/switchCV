import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeEducationSection } from "../ResumeEducationSection";
import * as visibilityUtils from "@/lib/utils/resumeVisibility";

jest.mock("@/lib/utils/resumeVisibility", () => ({
  hasRequestItems: jest.fn(),
}));

describe("ResumeEducationSection", () => {
  const mockEducation = [
    {
      id: "1",
      institution: "Tech University",
      degree: "Bachelor of Science",
      startDate: "2015",
      endDate: "2019",
      visibility: "public",
    },
    {
      institution: "NoID Univ",
      degree: "Short",
      startDate: "2020",
      visibility: "public",
    },
  ];

  it("renders public education and handles missing endDate", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(false);
    render(<ResumeEducationSection education={mockEducation as any} />);
    expect(screen.getByText("Bachelor of Science")).toBeInTheDocument();
    expect(screen.getByText("Tech University")).toBeInTheDocument();
  });

  it("handles description field and endDate", () => {
    const mockEduWithDesc = [
      {
        id: "1",
        institution: "U",
        degree: "D",
        description: "Desc",
        startDate: "2010",
        endDate: "2012",
        visibility: "public",
      },
    ];
    render(<ResumeEducationSection education={mockEduWithDesc as any} />);
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("2010 – 2012")).toBeInTheDocument();
  });

  it("handles long degree text as description", () => {
    const longDegree =
      "A very long degree name that exceeds one hundred characters to test the conditional logic in the education section component properly. It should be treated as description.";
    const mockLongEdu = [
      {
        id: "2",
        institution: "Inst",
        degree: longDegree,
        visibility: "public",
      },
    ];
    render(<ResumeEducationSection education={mockLongEdu as any} />);
    expect(screen.getByText("Education & Background")).toBeInTheDocument();
    expect(screen.getByText(longDegree)).toBeInTheDocument();
  });

  it("shows request access message", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(true);
    render(<ResumeEducationSection education={[]} />);
    expect(
      screen.getByText(/Some education details require access approval/),
    ).toBeInTheDocument();
  });

  it("returns null if no public or request education", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(false);
    const { container } = render(<ResumeEducationSection education={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
