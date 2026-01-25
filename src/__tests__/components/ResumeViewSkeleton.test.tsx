import React from "react";
import { render } from "../__support__/testUtils";
import { ResumeViewSkeleton } from "@/components/resume/ResumeViewSkeleton";

describe("ResumeViewSkeleton", () => {
  it("renders correctly with pulse animation", () => {
    const { container } = render(<ResumeViewSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
