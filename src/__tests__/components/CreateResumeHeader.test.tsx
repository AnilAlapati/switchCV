import React from "react";
import { render } from "../__support__/testUtils";
import { CreateResumeHeader } from "../../components/create-resume/CreateResumeHeader";

describe("CreateResumeHeader", () => {
  it("renders heading and subtitle", () => {
    const { getByText } = render(<CreateResumeHeader />);
    expect(getByText("AI Resume Builder")).toBeInTheDocument();
    expect(
      getByText("Create your professional resume with AI assistance")
    ).toBeInTheDocument();
  });

  it("shows connected status when provided", () => {
    const { getByText } = render(
      <CreateResumeHeader
        aiConnectionStatus={{ connected: true, model: "gpt-test" }}
      />
    );

    expect(getByText(/Connected/)).toBeInTheDocument();
    expect(getByText(/gpt-test/)).toBeInTheDocument();
  });

  it("shows unavailable when not connected", () => {
    const { getByText } = render(
      <CreateResumeHeader aiConnectionStatus={{ connected: false }} />
    );

    expect(getByText(/AI Unavailable/)).toBeInTheDocument();
  });
});
