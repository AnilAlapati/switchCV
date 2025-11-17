import React from "react";
import { render, screen } from "../__support__/testUtils";
import { RequestStats } from "@/components/recruiter/RequestStats";

describe("RequestStats", () => {
  it("renders all stat cards with correct values", () => {
    render(
      <RequestStats
        total={10}
        pending={3}
        approved={5}
        denied={2}
        expired={1}
      />
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Total Requests")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("displays zero values correctly", () => {
    render(
      <RequestStats total={0} pending={0} approved={0} denied={0} expired={0} />
    );

    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });
});
