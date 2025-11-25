import React from "react";
import { render, screen } from "@testing-library/react";
import { ProfileSummaryCard } from "@/components/ProfileSummaryCard";
import { ProfileSearchResult } from "@/types/profileSearch";

describe("ProfileSummaryCard", () => {
  const mockProfile: ProfileSearchResult = {
    userId: "user-123",
    username: "johndoe",
    displayName: "John Doe",
    bio: "Software Engineer",
    location: "New York, NY",
    skills: ["React", "TypeScript", "Node.js", "GraphQL"],
    hasApproval: false,
  };

  it("renders profile information correctly", () => {
    render(<ProfileSummaryCard profile={mockProfile} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("New York, NY")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("renders username if display name is missing", () => {
    const profileWithoutDisplayName = {
      ...mockProfile,
      displayName: "",
    };
    render(<ProfileSummaryCard profile={profileWithoutDisplayName} />);
    expect(screen.getByText("johndoe")).toBeInTheDocument();
  });

  it("renders skills correctly", () => {
    render(<ProfileSummaryCard profile={mockProfile} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("does not render skills if empty", () => {
    const profileNoSkills = { ...mockProfile, skills: [] };
    render(<ProfileSummaryCard profile={profileNoSkills} />);
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });

  it("does not render location if missing", () => {
    const profileNoLocation = { ...mockProfile, location: undefined };
    render(<ProfileSummaryCard profile={profileNoLocation} />);
    expect(screen.queryByText("New York, NY")).not.toBeInTheDocument();
  });

  it("does not render bio if missing", () => {
    const profileNoBio = { ...mockProfile, bio: "" };
    render(<ProfileSummaryCard profile={profileNoBio} />);
    expect(screen.queryByText("Software Engineer")).not.toBeInTheDocument();
  });

  it("renders Request Access button when not approved", () => {
    render(<ProfileSummaryCard profile={mockProfile} />);
    expect(screen.getByText("Request Access")).toBeInTheDocument();
  });

  it("does not render Request Access button when approved", () => {
    const approvedProfile = { ...mockProfile, hasApproval: true };
    render(<ProfileSummaryCard profile={approvedProfile} />);
    expect(screen.queryByText("Request Access")).not.toBeInTheDocument();
  });

  it("always renders View Profile button", () => {
    render(<ProfileSummaryCard profile={mockProfile} />);
    expect(screen.getByText("View Profile")).toBeInTheDocument();
  });
});
