import React from "react";
import { render, screen } from "../__support__/testUtils";
import { RecruiterPortalHeader } from "@/components/recruiter/RecruiterPortalHeader";

describe("RecruiterPortalHeader", () => {
  it("renders default title and subtitle", () => {
    render(<RecruiterPortalHeader />);
    expect(screen.getByText("Recruiter Portal")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Search candidates and request access to their contact information/
      )
    ).toBeInTheDocument();
  });

  it("renders custom subtitle when provided", () => {
    const subtitle = "Custom subtitle here";
    render(<RecruiterPortalHeader subtitle={subtitle} />);
    expect(screen.getByText(subtitle)).toBeInTheDocument();
  });
});
