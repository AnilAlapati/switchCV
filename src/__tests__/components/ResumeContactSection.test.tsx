import React from "react";
import { render } from "../__support__/testUtils";
import { ResumeContactSection } from "../../components/resume/ResumeContactSection";

const createResume = (overrides = {}) => ({
  contact: {
    email: { value: "test@example.com", visibility: "public" },
    phone: { value: "123-456-7890", visibility: "public" },
  },
  summary: "This is a summary",
  ...overrides,
});

describe("ResumeContactSection", () => {
  it("renders email, phone and summary when present", () => {
    const resume = createResume();
    const { getByText } = render(
      <ResumeContactSection resume={resume as any} />
    );

    expect(getByText("test@example.com")).toBeInTheDocument();
    expect(getByText("123-456-7890")).toBeInTheDocument();
    expect(getByText("This is a summary")).toBeInTheDocument();
  });

  it("hides phone block when phone is empty", () => {
    const resume = createResume({
      contact: {
        email: { value: "a@b.com", visibility: "public" },
        phone: { value: "", visibility: "public" },
      },
    });
    const { queryByText } = render(
      <ResumeContactSection resume={resume as any} />
    );

    expect(queryByText("Phone")).toBeNull();
  });
});
