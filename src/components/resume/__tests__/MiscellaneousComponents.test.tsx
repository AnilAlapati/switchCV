import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeSnapshotCard } from "../ResumeSnapshotCard";
import { ResumeViewSkeleton } from "../ResumeViewSkeleton";
import { useUserProfile } from "@/hooks/useUserProfile";

// Mock useUserProfile
jest.mock("@/hooks/useUserProfile");
const mockUseUserProfile = useUserProfile as jest.Mock;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock RestrictedFeature
jest.mock("@/components/ui/RestrictedFeature", () => ({
  RestrictedFeature: ({
    children,
    fallback,
  }: {
    children: React.ReactNode;
    fallback: React.ReactNode;
  }) => (
    <div data-testid="restricted-feature">
      {children}
      {fallback && <div data-testid="restricted-fallback">{fallback}</div>}
    </div>
  ),
}));

describe("Miscellaneous Resume Components", () => {
  describe("ResumeSnapshotCard", () => {
    it("renders resume info correctly", () => {
      mockUseUserProfile.mockReturnValue({ tier: "premium" });
      render(
        <ResumeSnapshotCard
          resumeId="resume-123"
          title="Software Engineer"
          updatedAt="Jan 1, 2023"
        />,
      );

      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText(/1\/1\/2023/)).toBeInTheDocument();
    });

    it("renders as basic user", () => {
      mockUseUserProfile.mockReturnValue({ tier: "basic" });
      render(
        <ResumeSnapshotCard
          resumeId="resume-123"
          title="Basic Resume"
          updatedAt="Jan 1, 2023"
        />,
      );
      expect(screen.getByText("Open manual editor")).toBeDisabled();
    });

    it("renders fallback title when missing", () => {
      mockUseUserProfile.mockReturnValue({ tier: "premium" });
      render(<ResumeSnapshotCard resumeId="resume-123" title="" />);

      expect(screen.getByText("Untitled resume")).toBeInTheDocument();
    });

    it("shows summary if provided", () => {
      mockUseUserProfile.mockReturnValue({ tier: "premium" });
      render(
        <ResumeSnapshotCard resumeId="resume-123" summary="Great summary" />,
      );
      expect(screen.getByText("Great summary")).toBeInTheDocument();
    });

    it("shows restricted feature wrapper", () => {
      mockUseUserProfile.mockReturnValue({ tier: "premium" });
      render(<ResumeSnapshotCard resumeId="resume-123" />);

      expect(screen.getByTestId("restricted-feature")).toBeInTheDocument();
    });
  });

  describe("ResumeViewSkeleton", () => {
    it("renders skeleton animation", () => {
      const { container } = render(<ResumeViewSkeleton />);
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });
});
