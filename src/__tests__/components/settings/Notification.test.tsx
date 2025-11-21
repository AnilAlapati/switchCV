import React from "react";
import { render, screen } from "@testing-library/react";
import { Notification } from "@/components/settings/Notification";

describe("Notification", () => {
  it("renders success notification correctly", () => {
    render(<Notification type="success" text="Operation successful" />);
    const notification = screen.getByText("Operation successful");
    expect(notification).toBeInTheDocument();
    expect(notification).toHaveClass("bg-green-500/20");
    expect(notification).toHaveClass("text-green-300");
  });

  it("renders error notification correctly", () => {
    render(<Notification type="error" text="Operation failed" />);
    const notification = screen.getByText("Operation failed");
    expect(notification).toBeInTheDocument();
    expect(notification).toHaveClass("bg-red-500/20");
    expect(notification).toHaveClass("text-red-300");
  });
});
