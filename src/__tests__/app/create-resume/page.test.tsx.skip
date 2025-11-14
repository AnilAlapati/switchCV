import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateResume from "@/app/create-resume/page";

// Mock the hooks
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "test-user-id" },
    loading: false,
  }),
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock resume questions
jest.mock("@/config/resumeQuestions", () => ({
  resumeQuestions: [
    {
      id: "personal_name",
      question: "What's your full name?",
      type: "text",
      required: true,
      placeholder: "e.g., John Doe",
      category: "personal"
    }
  ],
  getQuestionById: (id: string) => ({
    id: "personal_name",
    question: "What's your full name?",
    type: "text",
    required: true,
    placeholder: "e.g., John Doe",
    category: "personal"
  })
}));

describe("CreateResume", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the create resume page", () => {
    render(<CreateResume />);

    expect(screen.getByText("Resume Assistant")).toBeInTheDocument();
    expect(screen.getByText("What's your full name?")).toBeInTheDocument();
  });

  it("should allow input and submission", () => {
    render(<CreateResume />);

    const input = screen.getByPlaceholderText("e.g., John Doe");
    const button = screen.getByText("Next");

    fireEvent.change(input, { target: { value: "John Doe" } });
    fireEvent.click(button);

    // Should still show the same question since we haven't implemented navigation yet
    expect(screen.getByText("What's your full name?")).toBeInTheDocument();
  });
});
