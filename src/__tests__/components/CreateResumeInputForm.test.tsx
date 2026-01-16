import React from "react";
import { render, userEvent } from "../__support__/testUtils";
import { CreateResumeInputForm } from "../../components/create-resume/CreateResumeInputForm";

describe("CreateResumeInputForm", () => {
  it("renders input and button and respects stage states", async () => {
    const onInputChange = jest.fn();
    const onSubmit = jest.fn((e) => e.preventDefault());

    const { getByPlaceholderText, getByRole, rerender } = render(
      <CreateResumeInputForm
        currentInput=""
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        stage="idle"
      />
    );

    const input = getByPlaceholderText(
      "Describe your dream role or paste your experience..."
    ) as HTMLInputElement;
    const button = getByRole("button");

    expect(input).toBeInTheDocument();
    expect(button).toBeDisabled();

    // type into input
    await userEvent.type(input, "hello");
    expect(onInputChange).toHaveBeenCalled();

    // enable send when has text
    rerender(
      <CreateResumeInputForm
        currentInput="hello"
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        stage="idle"
      />
    );

    const enabledButton = getByRole("button");
    expect(enabledButton).not.toBeDisabled();
  });

  it("shows generating state and disables elements", () => {
    const { getByPlaceholderText, getByRole } = render(
      <CreateResumeInputForm
        currentInput=""
        onInputChange={jest.fn()}
        onSubmit={jest.fn()}
        stage="generating"
      />
    );

    expect(
      getByPlaceholderText("✨ Strategizing your career path...")
    ).toBeInTheDocument();
    expect(getByRole("button")).toBeDisabled();
  });
});
