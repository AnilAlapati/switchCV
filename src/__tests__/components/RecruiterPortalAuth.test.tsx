import React from "react";
import { render, screen } from "../__support__/testUtils";
import { RecruiterPortalAuth } from "@/components/recruiter/RecruiterPortalAuth";

describe("RecruiterPortalAuth", () => {
  it("renders auth message and sign in link", () => {
    render(<RecruiterPortalAuth />);
    expect(screen.getByText("Recruiter Portal")).toBeInTheDocument();
    expect(screen.getByText(/You need to be logged in/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Sign In/ });
    expect(link).toHaveAttribute("href", "/auth");
  });
});
