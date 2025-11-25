import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import RequestItem from "@/components/recruiter/RequestItem";

describe("RequestItem", () => {
  const baseItem = {
    id: "req-1",
    request: {
      fromRecruiter: { name: "Jane Recruiter", companyName: "Acme Co" },
      requestedFields: ["email", "phone"],
    },
  } as any;

  it("renders basic info and requested fields count", async () => {
    const handle = jest.fn();
    render(<RequestItem item={baseItem} onClick={handle} />);

    expect(screen.getByText("Jane Recruiter")).toBeInTheDocument();
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
    expect(screen.getByText(/2 fields requested/)).toBeInTheDocument();
  });

  it("applies selected styles when selected and calls onClick", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();
    render(<RequestItem item={baseItem} selected onClick={handle} />);

    const button = screen.getByRole("button");
    // selected should render border and background classes
    expect(button.className).toMatch(/border-blue-600/);
    expect(button.className).toMatch(/bg-blue-50/);

    await user.click(button);
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
