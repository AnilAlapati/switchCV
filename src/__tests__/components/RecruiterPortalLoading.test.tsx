import React from "react";
import { render, screen } from "../__support__/testUtils";
import { RecruiterPortalLoading } from "@/components/recruiter/RecruiterPortalLoading";

describe("RecruiterPortalLoading", () => {
  it("renders loading spinner and text", () => {
    render(<RecruiterPortalLoading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
