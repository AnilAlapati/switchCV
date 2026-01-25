import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeContactSection } from "../ResumeContactSection";
import { renderContactField } from "@/lib/utils/resumeVisibility";

jest.mock("@/lib/utils/resumeVisibility", () => ({
  renderContactField: jest.fn((val) => val),
}));

describe("ResumeContactSection", () => {
  const mockResume = {
    contact: {
      email: { value: "test@example.com", visibility: "public" },
      phone: { value: "123-456-7890", visibility: "public" },
    },
    summary: "Mock summary",
  };

  it("renders email, phone and summary", () => {
    render(<ResumeContactSection resume={mockResume as any} />);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("123-456-7890")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Mock summary")).toBeInTheDocument();
  });

  it("handles missing phone and summary", () => {
    const minimalResume = {
      contact: {
        email: { value: "test@example.com", visibility: "public" },
        phone: { value: "", visibility: "public" },
      },
    };
    render(<ResumeContactSection resume={minimalResume as any} />);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
    expect(screen.queryByText("About")).not.toBeInTheDocument();
  });
});
